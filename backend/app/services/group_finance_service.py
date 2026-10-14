import uuid
from datetime import datetime, date
from typing import List, Optional, Tuple, Dict
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_, or_, case

from app.models.group import FinanceGroup
from app.models.group_member import GroupMember
from app.models.group_expense import GroupExpense, GroupExpenseSplit
from app.models.group_fund import GroupFund, GroupFundTransaction
from app.models.group_settlement import GroupSettlement
from app.models.user import User
from app.schemas.group_finance import (
    CreateGroupExpenseRequest,
    VoidExpenseRequest,
    GroupExpenseResponse,
    GroupExpenseSplitResponse,
    GroupFundResponse,
    FundContributionRequest,
    FundWithdrawalRequest,
    GroupFundTransactionResponse,
    CreateSettlementRequest,
    GroupSettlementResponse,
    MemberBalanceSummary,
    DebtSimplificationItem,
    GroupDebtOverview,
)


class GroupFinanceService:

    # =========================================================================
    # PERMISSION HELPERS
    # =========================================================================

    @staticmethod
    def get_user_member_record(db: Session, group_id: uuid.UUID, user_id: uuid.UUID) -> GroupMember:
        member = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id,
            GroupMember.status == "ACTIVE",
        ).first()
        if not member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không phải là thành viên hoạt động của nhóm này.",
            )
        return member

    # =========================================================================
    # GROUP EXPENSE & SPLIT MANAGEMENT
    # =========================================================================

    @staticmethod
    def calculate_splits(
        total_amount: int,
        split_method: str,
        splits_input: list,
        active_member_ids: set,
    ) -> List[Tuple[uuid.UUID, int]]:
        """
        Calculates and validates split distribution.
        Guarantees exact integer sum preservation without creating or losing a single VND.
        """
        # Validate member uniqueness and membership
        member_ids = [s.member_user_id for s in splits_input]
        if len(member_ids) != len(set(member_ids)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Một thành viên không được xuất hiện nhiều lần trong cùng khoản chi.",
            )

        for mid in member_ids:
            if mid not in active_member_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Thành viên {mid} không thuộc nhóm chi tiêu này.",
                )

        count = len(splits_input)
        if count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phải có ít nhất một thành viên chịu phần chia chi phí.",
            )

        result_splits: List[Tuple[uuid.UUID, int]] = []

        if split_method == "EQUAL":
            base = total_amount // count
            remainder = total_amount % count
            for i, split in enumerate(splits_input):
                # Distribute remainder deterministically to first `remainder` members
                amount = base + 1 if i < remainder else base
                result_splits.append((split.member_user_id, amount))
        elif split_method == "CUSTOM":
            calculated_sum = 0
            for split in splits_input:
                if split.amount is None or split.amount <= 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Với chia tùy chỉnh, số tiền mỗi thành viên chịu phải lớn hơn 0.",
                    )
                calculated_sum += split.amount
                result_splits.append((split.member_user_id, split.amount))

            if calculated_sum != total_amount:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Tổng các phần chia ({calculated_sum:,} đ) không khớp với tổng khoản chi ({total_amount:,} đ).",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Phương thức chia {split_method} không được hỗ trợ.",
            )

        return result_splits

    @staticmethod
    def create_expense(
        db: Session,
        group_id: uuid.UUID,
        user_id: uuid.UUID,
        payload: CreateGroupExpenseRequest,
    ) -> GroupExpense:
        # 1. Verify user membership
        GroupFinanceService.get_user_member_record(db, group_id, user_id)

        # 2. Fetch all active members of the group
        active_members = db.query(GroupMember.user_id).filter(
            GroupMember.group_id == group_id,
            GroupMember.status == "ACTIVE",
        ).all()
        active_member_ids = {m[0] for m in active_members}

        # 3. Validate payment source and related entities
        paid_by_user_id = None
        fund_id = None

        if payload.payment_source == "MEMBER":
            if not payload.paid_by_user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Khi thành viên trả tiền, cần chỉ định paid_by_user_id.",
                )
            if payload.paid_by_user_id not in active_member_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Người trả tiền không phải là thành viên hoạt động của nhóm.",
                )
            paid_by_user_id = payload.paid_by_user_id
        elif payload.payment_source == "FUND":
            # If fund_id not provided, use default fund
            target_fund = None
            if payload.fund_id:
                target_fund = db.query(GroupFund).filter(
                    GroupFund.id == payload.fund_id,
                    GroupFund.group_id == group_id,
                    GroupFund.status == "ACTIVE",
                ).first()
            else:
                target_fund = GroupFinanceService.get_or_create_default_fund(db, group_id)

            if not target_fund:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Không tìm thấy quỹ hợp lệ của nhóm.",
                )

            # Check fund balance
            current_balance = GroupFinanceService.get_fund_balance(db, target_fund.id)
            if current_balance < payload.total_amount:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Số dư quỹ không đủ (Hiện có: {current_balance:,} đ, Cần chi: {payload.total_amount:,} đ).",
                )

            fund_id = target_fund.id
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nguồn thanh toán chỉ có thể là MEMBER hoặc FUND.",
            )

        # 4. Calculate and validate splits
        validated_splits = GroupFinanceService.calculate_splits(
            total_amount=payload.total_amount,
            split_method=payload.split_method,
            splits_input=payload.splits,
            active_member_ids=active_member_ids,
        )

        expense_date = payload.expense_date or date.today()

        # 5. Create GroupExpense record
        expense = GroupExpense(
            group_id=group_id,
            title=payload.title,
            total_amount=payload.total_amount,
            expense_date=expense_date,
            payment_source=payload.payment_source,
            paid_by_user_id=paid_by_user_id,
            fund_id=fund_id,
            split_method=payload.split_method,
            status="POSTED",
            created_by_user_id=user_id,
        )
        db.add(expense)
        db.flush()

        # 6. Create GroupExpenseSplit records
        for member_id, amount_owed in validated_splits:
            split_record = GroupExpenseSplit(
                expense_id=expense.id,
                member_user_id=member_id,
                amount_owed=amount_owed,
            )
            db.add(split_record)

        # 7. If paid by FUND, record GroupFundTransaction atomically
        if payload.payment_source == "FUND" and fund_id:
            fund_tx = GroupFundTransaction(
                fund_id=fund_id,
                transaction_type="EXPENSE",
                amount=payload.total_amount,
                created_by_user_id=user_id,
                group_expense_id=expense.id,
                description=f"Chi phí nhóm: {payload.title}",
                transaction_date=expense_date,
            )
            db.add(fund_tx)

        db.commit()
        db.refresh(expense)
        return expense

    @staticmethod
    def void_expense(
        db: Session,
        group_id: uuid.UUID,
        expense_id: uuid.UUID,
        user_id: uuid.UUID,
        payload: VoidExpenseRequest,
    ) -> GroupExpense:
        membership = GroupFinanceService.get_user_member_record(db, group_id, user_id)

        expense = db.query(GroupExpense).filter(
            GroupExpense.id == expense_id,
            GroupExpense.group_id == group_id,
        ).first()

        if not expense:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Khoản chi không tồn tại trong nhóm này.",
            )

        if expense.status == "VOID":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Khoản chi này đã bị vô hiệu hóa trước đó.",
            )

        # Permission: creator, OWNER, or ADMIN
        is_creator = expense.created_by_user_id == user_id
        is_manager = membership.role in ["OWNER", "ADMIN"]
        if not (is_creator or is_manager):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền vô hiệu hóa khoản chi này.",
            )

        expense.status = "VOID"
        expense.void_reason = payload.reason
        expense.voided_at = datetime.utcnow()

        # If it was paid from FUND, refund atomically
        if expense.payment_source == "FUND" and expense.fund_id:
            refund_tx = GroupFundTransaction(
                fund_id=expense.fund_id,
                transaction_type="ADJUSTMENT_IN",
                amount=expense.total_amount,
                created_by_user_id=user_id,
                description=f"Hoàn tiền do hủy khoản chi: {expense.title} (Lý do: {payload.reason})",
                transaction_date=date.today(),
            )
            db.add(refund_tx)

        db.commit()
        db.refresh(expense)
        return expense

    @staticmethod
    def list_expenses(
        db: Session,
        group_id: uuid.UUID,
        user_id: uuid.UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> List[GroupExpense]:
        GroupFinanceService.get_user_member_record(db, group_id, user_id)

        return (
            db.query(GroupExpense)
            .filter(GroupExpense.group_id == group_id)
            .order_by(GroupExpense.expense_date.desc(), GroupExpense.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    # =========================================================================
    # GROUP FUND SERVICES
    # =========================================================================

    @staticmethod
    def get_or_create_default_fund(db: Session, group_id: uuid.UUID) -> GroupFund:
        fund = db.query(GroupFund).filter(
            GroupFund.group_id == group_id,
            GroupFund.status == "ACTIVE",
        ).first()

        if not fund:
            fund = GroupFund(
                group_id=group_id,
                name="Quỹ chung",
                description="Quỹ chi tiêu chung mặc định của nhóm",
                status="ACTIVE",
            )
            db.add(fund)
            db.commit()
            db.refresh(fund)
        return fund

    @staticmethod
    def get_fund_balance(db: Session, fund_id: uuid.UUID) -> int:
        txs = db.query(
            GroupFundTransaction.transaction_type,
            func.coalesce(func.sum(GroupFundTransaction.amount), 0).label("total"),
        ).filter(
            GroupFundTransaction.fund_id == fund_id,
        ).group_by(GroupFundTransaction.transaction_type).all()

        type_sums = {t: amount for t, amount in txs}
        inflow = type_sums.get("CONTRIBUTION", 0) + type_sums.get("ADJUSTMENT_IN", 0)
        outflow = type_sums.get("EXPENSE", 0) + type_sums.get("WITHDRAWAL", 0) + type_sums.get("ADJUSTMENT_OUT", 0)
        return int(inflow - outflow)

    @staticmethod
    def contribute_to_fund(
        db: Session,
        group_id: uuid.UUID,
        user_id: uuid.UUID,
        payload: FundContributionRequest,
    ) -> GroupFundTransaction:
        GroupFinanceService.get_user_member_record(db, group_id, user_id)
        fund = GroupFinanceService.get_or_create_default_fund(db, group_id)

        tx = GroupFundTransaction(
            fund_id=fund.id,
            transaction_type="CONTRIBUTION",
            amount=payload.amount,
            contributed_by_user_id=user_id,
            created_by_user_id=user_id,
            description=payload.description or "Đóng góp quỹ nhóm",
            transaction_date=payload.transaction_date or date.today(),
        )
        db.add(tx)
        db.commit()
        db.refresh(tx)
        return tx

    @staticmethod
    def withdraw_from_fund(
        db: Session,
        group_id: uuid.UUID,
        user_id: uuid.UUID,
        payload: FundWithdrawalRequest,
    ) -> GroupFundTransaction:
        membership = GroupFinanceService.get_user_member_record(db, group_id, user_id)
        if membership.role not in ["OWNER", "ADMIN"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ Trưởng nhóm hoặc Quản trị viên mới có quyền rút tiền từ quỹ.",
            )

        fund = GroupFinanceService.get_or_create_default_fund(db, group_id)
        balance = GroupFinanceService.get_fund_balance(db, fund.id)
        if balance < payload.amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Số dư quỹ không đủ để rút (Hiện có: {balance:,} đ, Yêu cầu: {payload.amount:,} đ).",
            )

        tx = GroupFundTransaction(
            fund_id=fund.id,
            transaction_type="WITHDRAWAL",
            amount=payload.amount,
            created_by_user_id=user_id,
            description=f"Rút quỹ: {payload.reason}",
            transaction_date=payload.transaction_date or date.today(),
        )
        db.add(tx)
        db.commit()
        db.refresh(tx)
        return tx

    @staticmethod
    def list_fund_transactions(
        db: Session,
        group_id: uuid.UUID,
        user_id: uuid.UUID,
        limit: int = 50,
    ) -> List[GroupFundTransaction]:
        GroupFinanceService.get_user_member_record(db, group_id, user_id)
        fund = GroupFinanceService.get_or_create_default_fund(db, group_id)

        return (
            db.query(GroupFundTransaction)
            .filter(GroupFundTransaction.fund_id == fund.id)
            .order_by(GroupFundTransaction.transaction_date.desc(), GroupFundTransaction.created_at.desc())
            .limit(limit)
            .all()
        )

    # =========================================================================
    # SETTLEMENTS & DEBT MATRIX
    # =========================================================================

    @staticmethod
    def calculate_group_debts(db: Session, group_id: uuid.UUID, current_user_id: uuid.UUID) -> GroupDebtOverview:
        GroupFinanceService.get_user_member_record(db, group_id, current_user_id)
        group = db.query(FinanceGroup).filter(FinanceGroup.id == group_id).first()

        # 1. Active members
        members = (
            db.query(GroupMember, User)
            .join(User, GroupMember.user_id == User.id)
            .filter(
                GroupMember.group_id == group_id,
                GroupMember.status == "ACTIVE",
            )
            .all()
        )

        member_dict = {
            m.GroupMember.user_id: {
                "name": m.User.display_name or m.User.email,
                "email": m.User.email,
            }
            for m in members
        }
        all_member_ids = list(member_dict.keys())

        # 2. Total paid per member on POSTED expenses where payment_source = 'MEMBER'
        paid_query = (
            db.query(
                GroupExpense.paid_by_user_id,
                func.coalesce(func.sum(GroupExpense.total_amount), 0).label("total_paid"),
            )
            .filter(
                GroupExpense.group_id == group_id,
                GroupExpense.status == "POSTED",
                GroupExpense.payment_source == "MEMBER",
            )
            .group_by(GroupExpense.paid_by_user_id)
            .all()
        )
        paid_map = {row[0]: int(row[1]) for row in paid_query if row[0]}

        # 3. Total share per member on POSTED expenses where payment_source = 'MEMBER'
        share_query = (
            db.query(
                GroupExpenseSplit.member_user_id,
                func.coalesce(func.sum(GroupExpenseSplit.amount_owed), 0).label("total_share"),
            )
            .join(GroupExpense, GroupExpenseSplit.expense_id == GroupExpense.id)
            .filter(
                GroupExpense.group_id == group_id,
                GroupExpense.status == "POSTED",
                GroupExpense.payment_source == "MEMBER",
            )
            .group_by(GroupExpenseSplit.member_user_id)
            .all()
        )
        share_map = {row[0]: int(row[1]) for row in share_query}

        # 4. Confirmed settlements
        settlement_paid_query = (
            db.query(
                GroupSettlement.from_user_id,
                func.coalesce(func.sum(GroupSettlement.amount), 0).label("total_sent"),
            )
            .filter(
                GroupSettlement.group_id == group_id,
                GroupSettlement.status == "CONFIRMED",
            )
            .group_by(GroupSettlement.from_user_id)
            .all()
        )
        settlement_paid_map = {row[0]: int(row[1]) for row in settlement_paid_query}

        settlement_recv_query = (
            db.query(
                GroupSettlement.to_user_id,
                func.coalesce(func.sum(GroupSettlement.amount), 0).label("total_received"),
            )
            .filter(
                GroupSettlement.group_id == group_id,
                GroupSettlement.status == "CONFIRMED",
            )
            .group_by(GroupSettlement.to_user_id)
            .all()
        )
        settlement_recv_map = {row[0]: int(row[1]) for row in settlement_recv_query}

        # 5. Compute net balance for each member
        # Formula: net = (paid - share) + settlement_paid - settlement_received
        balances_list: List[MemberBalanceSummary] = []
        debtors: List[dict] = []   # net < 0 (needs to pay)
        creditors: List[dict] = [] # net > 0 (needs to receive)

        current_user_net = 0

        for mid in all_member_ids:
            p = paid_map.get(mid, 0)
            s = share_map.get(mid, 0)
            sp = settlement_paid_map.get(mid, 0)
            sr = settlement_recv_map.get(mid, 0)
            net = (p - s) + sp - sr

            if mid == current_user_id:
                current_user_net = net

            info = member_dict[mid]
            balances_list.append(
                MemberBalanceSummary(
                    user_id=mid,
                    full_name=info["name"],
                    email=info["email"],
                    total_paid=p,
                    total_share=s,
                    settlement_paid=sp,
                    settlement_received=sr,
                    net_balance=net,
                )
            )

            if net < 0:
                debtors.append({"user_id": mid, "name": info["name"], "amount": -net})
            elif net > 0:
                creditors.append({"user_id": mid, "name": info["name"], "amount": net})

        # 6. Greedy Debt Simplification
        debtors.sort(key=lambda x: x["amount"], reverse=True)
        creditors.sort(key=lambda x: x["amount"], reverse=True)

        suggested: List[DebtSimplificationItem] = []
        d_idx = 0
        c_idx = 0

        while d_idx < len(debtors) and c_idx < len(creditors):
            d = debtors[d_idx]
            c = creditors[c_idx]

            transfer_amount = min(d["amount"], c["amount"])
            if transfer_amount > 0:
                suggested.append(
                    DebtSimplificationItem(
                        from_user_id=d["user_id"],
                        from_user_name=d["name"],
                        to_user_id=c["user_id"],
                        to_user_name=c["name"],
                        amount=transfer_amount,
                    )
                )
                d["amount"] -= transfer_amount
                c["amount"] -= transfer_amount

            if d["amount"] == 0:
                d_idx += 1
            if c["amount"] == 0:
                c_idx += 1

        return GroupDebtOverview(
            group_id=group_id,
            currency="VND",
            members_balances=balances_list,
            suggested_settlements=suggested,
            current_user_net=current_user_net,
        )

    @staticmethod
    def create_settlement(
        db: Session,
        group_id: uuid.UUID,
        from_user_id: uuid.UUID,
        payload: CreateSettlementRequest,
    ) -> GroupSettlement:
        GroupFinanceService.get_user_member_record(db, group_id, from_user_id)

        if from_user_id == payload.to_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể tạo quyết toán cho chính bản thân mình.",
            )

        GroupFinanceService.get_user_member_record(db, group_id, payload.to_user_id)

        settlement = GroupSettlement(
            group_id=group_id,
            from_user_id=from_user_id,
            to_user_id=payload.to_user_id,
            amount=payload.amount,
            status="PENDING",
            note=payload.note,
        )
        db.add(settlement)
        db.commit()
        db.refresh(settlement)
        return settlement

    @staticmethod
    def confirm_settlement(
        db: Session,
        group_id: uuid.UUID,
        settlement_id: uuid.UUID,
        current_user_id: uuid.UUID,
    ) -> GroupSettlement:
        settlement = db.query(GroupSettlement).filter(
            GroupSettlement.id == settlement_id,
            GroupSettlement.group_id == group_id,
        ).first()

        if not settlement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Khoản quyết toán không tồn tại.",
            )

        if settlement.status != "PENDING":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Khoản quyết toán đang ở trạng thái {settlement.status}, không thể xác nhận.",
            )

        # STRICT INVARIANT: Only the recipient (to_user_id) can confirm!
        if settlement.to_user_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ người nhận tiền (to_user_id) mới có quyền xác nhận quyết toán.",
            )

        settlement.status = "CONFIRMED"
        settlement.confirmed_at = datetime.utcnow()
        db.commit()
        db.refresh(settlement)
        return settlement

    @staticmethod
    def reject_settlement(
        db: Session,
        group_id: uuid.UUID,
        settlement_id: uuid.UUID,
        current_user_id: uuid.UUID,
    ) -> GroupSettlement:
        settlement = db.query(GroupSettlement).filter(
            GroupSettlement.id == settlement_id,
            GroupSettlement.group_id == group_id,
        ).first()

        if not settlement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Khoản quyết toán không tồn tại.",
            )

        if settlement.status != "PENDING":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Khoản quyết toán đang ở trạng thái {settlement.status}, không thể từ chối.",
            )

        # STRICT INVARIANT: Only recipient can reject
        if settlement.to_user_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ người nhận tiền mới có quyền từ chối quyết toán.",
            )

        settlement.status = "REJECTED"
        settlement.rejected_at = datetime.utcnow()
        db.commit()
        db.refresh(settlement)
        return settlement

    @staticmethod
    def cancel_settlement(
        db: Session,
        group_id: uuid.UUID,
        settlement_id: uuid.UUID,
        current_user_id: uuid.UUID,
    ) -> GroupSettlement:
        settlement = db.query(GroupSettlement).filter(
            GroupSettlement.id == settlement_id,
            GroupSettlement.group_id == group_id,
        ).first()

        if not settlement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Khoản quyết toán không tồn tại.",
            )

        if settlement.status != "PENDING":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Khoản quyết toán đang ở trạng thái {settlement.status}, không thể hủy.",
            )

        # Only sender (from_user_id) can cancel
        if settlement.from_user_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ người tạo quyết toán mới có thể hủy bỏ.",
            )

        settlement.status = "CANCELLED"
        settlement.cancelled_at = datetime.utcnow()
        db.commit()
        db.refresh(settlement)
        return settlement

    @staticmethod
    def list_settlements(
        db: Session,
        group_id: uuid.UUID,
        user_id: uuid.UUID,
        limit: int = 50,
    ) -> List[GroupSettlement]:
        GroupFinanceService.get_user_member_record(db, group_id, user_id)

        return (
            db.query(GroupSettlement)
            .filter(GroupSettlement.group_id == group_id)
            .order_by(GroupSettlement.created_at.desc())
            .limit(limit)
            .all()
        )

