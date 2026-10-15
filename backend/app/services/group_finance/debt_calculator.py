import uuid
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.group import FinanceGroup
from app.models.group_member import GroupMember
from app.models.group_expense import GroupExpense, GroupExpenseSplit
from app.models.group_settlement import GroupSettlement
from app.models.user import User
from app.schemas.group_finance import (
    MemberBalanceSummary,
    DebtSimplificationItem,
    GroupDebtOverview,
)
from app.services.group_finance.constants import get_user_member_record


def calculate_group_debts(db: Session, group_id: uuid.UUID, current_user_id: uuid.UUID) -> GroupDebtOverview:
    get_user_member_record(db, group_id, current_user_id)
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

