import os
import sys
import uuid
from datetime import datetime, date, time, timedelta, timezone
from decimal import Decimal

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.db.session import SessionLocal, engine
from app.core.security import hash_password
from app.models.user import User
from app.models.wallet import Wallet
from app.models.category import Category
from app.models.transaction import WalletTransaction
from app.models.group import FinanceGroup
from app.models.group_member import GroupMember
from app.models.group_expense import GroupExpense, GroupExpenseSplit
from app.models.group_fund import GroupFund, GroupFundTransaction
from app.models.group_settlement import GroupSettlement

# Fixed Category IDs matching migrations
CAT_AN_UONG = uuid.UUID("11111111-1111-1111-1111-111111111101")
CAT_DI_LAI = uuid.UUID("11111111-1111-1111-1111-111111111102")
CAT_MUA_SAM = uuid.UUID("11111111-1111-1111-1111-111111111103")
CAT_HOA_DON = uuid.UUID("11111111-1111-1111-1111-111111111104")
CAT_GIAI_TRI = uuid.UUID("11111111-1111-1111-1111-111111111105")
CAT_Y_TE = uuid.UUID("11111111-1111-1111-1111-111111111106")
CAT_CHI_TIEU_KHAC = uuid.UUID("11111111-1111-1111-1111-111111111107")
CAT_CHI_TIEU_NHOM = uuid.UUID("11111111-1111-1111-1111-111111111108")

CAT_LUONG = uuid.UUID("11111111-1111-1111-1111-111111111201")
CAT_THUONG = uuid.UUID("11111111-1111-1111-1111-111111111202")
CAT_THU_NHAP_PHU = uuid.UUID("11111111-1111-1111-1111-111111111203")
CAT_THU_NHAP_KHAC = uuid.UUID("11111111-1111-1111-1111-111111111204")

SYSTEM_CATEGORIES = [
    {"id": CAT_AN_UONG, "name": "Ăn uống", "kind": "EXPENSE", "icon_key": "utensils"},
    {"id": CAT_DI_LAI, "name": "Đi lại", "kind": "EXPENSE", "icon_key": "car"},
    {"id": CAT_MUA_SAM, "name": "Mua sắm", "kind": "EXPENSE", "icon_key": "shopping-bag"},
    {"id": CAT_HOA_DON, "name": "Hóa đơn & Tiện ích", "kind": "EXPENSE", "icon_key": "receipt"},
    {"id": CAT_GIAI_TRI, "name": "Giải trí", "kind": "EXPENSE", "icon_key": "film"},
    {"id": CAT_Y_TE, "name": "Y tế & Sức khỏe", "kind": "EXPENSE", "icon_key": "activity"},
    {"id": CAT_CHI_TIEU_KHAC, "name": "Chi tiêu khác", "kind": "EXPENSE", "icon_key": "more-horizontal"},
    {"id": CAT_CHI_TIEU_NHOM, "name": "Chi tiêu nhóm", "kind": "EXPENSE", "icon_key": "users"},
    {"id": CAT_LUONG, "name": "Tiền lương", "kind": "INCOME", "icon_key": "dollar-sign"},
    {"id": CAT_THUONG, "name": "Tiền thưởng", "kind": "INCOME", "icon_key": "award"},
    {"id": CAT_THU_NHAP_PHU, "name": "Thu nhập phụ", "kind": "INCOME", "icon_key": "briefcase"},
    {"id": CAT_THU_NHAP_KHAC, "name": "Thu nhập khác", "kind": "INCOME", "icon_key": "trending-up"},
]


def clean_database(db):
    print("--- 1. Xóa toàn bộ dữ liệu hiện tại trong DB ---")
    tables_to_truncate = [
        "wallet_transactions",
        "group_fund_transactions",
        "group_settlements",
        "group_expense_splits",
        "group_expenses",
        "group_funds",
        "group_invitations",
        "group_members",
        "finance_groups",
        "wallets",
        "auth_sessions",
    ]
    for tbl in tables_to_truncate:
        db.execute(text(f"TRUNCATE TABLE {tbl} CASCADE;"))
    
    # Remove custom categories only, keep system categories intact
    db.execute(text("DELETE FROM categories WHERE owner_user_id IS NOT NULL;"))
    db.execute(text("TRUNCATE TABLE app_users CASCADE;"))
    db.commit()
    print("✓ Đã dọn sạch database an toàn!")


def ensure_system_categories(db):
    print("--- 2. Đảm bảo 12 danh mục hệ thống có sẵn ---")
    for cat in SYSTEM_CATEGORIES:
        db.execute(
            text("""
                INSERT INTO categories (id, owner_user_id, name, kind, icon_key, is_archived, created_at, updated_at)
                VALUES (:id, NULL, :name, :kind, :icon_key, FALSE, NOW(), NOW())
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    kind = EXCLUDED.kind,
                    icon_key = EXCLUDED.icon_key;
            """),
            cat,
        )
    db.commit()
    print("✓ Đã kiểm tra & cập nhật đủ 12 danh mục hệ thống!")


def seed_large_data(db):
    print("--- 3. Khởi tạo tài khoản người dùng mẫu ---")
    now_utc = datetime.now(timezone.utc)
    today = now_utc.date()
    default_pw_hash = hash_password("Password123!")

    # 1. Main User
    main_user = User(
        id=uuid.uuid4(),
        email="demo@flowpocket.vn",
        display_name="Trương Tuấn",
        password_hash=default_pw_hash,
        status="ACTIVE",
        email_verified_at=now_utc,
    )
    # Secondary alias user for convenient login
    alt_user = User(
        id=uuid.uuid4(),
        email="user@flowpocket.vn",
        display_name="Nguyễn Văn An",
        password_hash=default_pw_hash,
        status="ACTIVE",
        email_verified_at=now_utc,
    )
    # Group members
    tuan_user = User(
        id=uuid.uuid4(),
        email="minh.tuan@flowpocket.vn",
        display_name="Trần Minh Tuấn",
        password_hash=default_pw_hash,
        status="ACTIVE",
        email_verified_at=now_utc,
    )
    dang_user = User(
        id=uuid.uuid4(),
        email="hai.dang@flowpocket.vn",
        display_name="Lê Hải Đăng",
        password_hash=default_pw_hash,
        status="ACTIVE",
        email_verified_at=now_utc,
    )
    mai_user = User(
        id=uuid.uuid4(),
        email="ngoc.mai@flowpocket.vn",
        display_name="Nguyễn Ngọc Mai",
        password_hash=default_pw_hash,
        status="ACTIVE",
        email_verified_at=now_utc,
    )

    db.add_all([main_user, alt_user, tuan_user, dang_user, mai_user])
    db.commit()
    print(f"✓ Đã tạo 5 tài khoản (Demo: demo@flowpocket.vn / Password123!)")

    # 2. Wallets for Main User
    print("--- 4. Khởi tạo ví tài chính cho người dùng chính ---")
    wallet_cash = Wallet(
        id=uuid.uuid4(),
        owner_user_id=main_user.id,
        name="Tiền mặt",
        wallet_type="CASH",
        currency="VND",
        opening_balance=3500000,
    )
    wallet_vcb = Wallet(
        id=uuid.uuid4(),
        owner_user_id=main_user.id,
        name="Ngân hàng Vietcombank",
        wallet_type="BANK",
        currency="VND",
        opening_balance=32000000,
    )
    wallet_momo = Wallet(
        id=uuid.uuid4(),
        owner_user_id=main_user.id,
        name="Ví điện tử MoMo",
        wallet_type="E_WALLET",
        currency="VND",
        opening_balance=2000000,
    )
    db.add_all([wallet_cash, wallet_vcb, wallet_momo])
    db.commit()
    print("✓ Đã tạo 3 ví: Tiền mặt, Vietcombank, MoMo")

    # 3. Groups & Members
    print("--- 5. Khởi tạo nhóm tài chính & quỹ chung ---")
    # Group 1: Phòng Trọ 308
    group_room = FinanceGroup(
        id=uuid.uuid4(),
        name="Phòng Trọ 308 - Phú Nhuận",
        description="Chi phí sinh hoạt phòng trọ, điện nước, ăn uống chung",
        created_by_user_id=main_user.id,
        status="ACTIVE",
    )
    db.add(group_room)
    db.flush()

    members_room = [
        GroupMember(group_id=group_room.id, user_id=main_user.id, role="OWNER", status="ACTIVE"),
        GroupMember(group_id=group_room.id, user_id=tuan_user.id, role="MEMBER", status="ACTIVE"),
        GroupMember(group_id=group_room.id, user_id=dang_user.id, role="MEMBER", status="ACTIVE"),
    ]
    db.add_all(members_room)

    # Fund for Room 308
    fund_room = GroupFund(
        id=uuid.uuid4(),
        group_id=group_room.id,
        name="Quỹ Sinh Hoạt Phòng 308",
        description="Quỹ chung mua sắm gia dụng, đồ ăn vặt",
        status="ACTIVE",
    )
    db.add(fund_room)
    db.flush()

    # Group 2: Du Lịch Đà Lạt
    group_trip = FinanceGroup(
        id=uuid.uuid4(),
        name="Chuyến Du Lịch Đà Lạt 3N2Đ",
        description="Chi phí homestay, ăn uống, thuê xe chuyến đi Đà Lạt",
        created_by_user_id=main_user.id,
        status="ACTIVE",
    )
    db.add(group_trip)
    db.flush()

    members_trip = [
        GroupMember(group_id=group_trip.id, user_id=main_user.id, role="OWNER", status="ACTIVE"),
        GroupMember(group_id=group_trip.id, user_id=dang_user.id, role="MEMBER", status="ACTIVE"),
        GroupMember(group_id=group_trip.id, user_id=mai_user.id, role="MEMBER", status="ACTIVE"),
    ]
    db.add_all(members_trip)
    db.commit()
    print("✓ Đã tạo 2 nhóm: 'Phòng Trọ 308' và 'Du Lịch Đà Lạt'")

    # Helper function to generate timestamps
    def make_dt(day_offset: int, hour: int = 12, minute: int = 0) -> datetime:
        target_date = today - timedelta(days=day_offset)
        return datetime.combine(target_date, time(hour, minute)).replace(tzinfo=timezone.utc)

    def make_d(day_offset: int) -> date:
        return today - timedelta(days=day_offset)

    print("--- 6. Sinh dữ liệu giao dịch 1 tháng (30 ngày gần nhất) ---")

    # --- FUND TRANSACTIONS (Phòng 308) ---
    # Day 29: Mỗi người góp 500k vào quỹ
    fund_txs = [
        GroupFundTransaction(
            fund_id=fund_room.id,
            transaction_type="CONTRIBUTION",
            amount=500000,
            contributed_by_user_id=main_user.id,
            created_by_user_id=main_user.id,
            description="Trương Tuấn đóng quỹ phòng tháng này",
            transaction_date=make_d(29),
        ),
        GroupFundTransaction(
            fund_id=fund_room.id,
            transaction_type="CONTRIBUTION",
            amount=500000,
            contributed_by_user_id=tuan_user.id,
            created_by_user_id=main_user.id,
            description="Trần Minh Tuấn đóng quỹ phòng",
            transaction_date=make_d(29),
        ),
        GroupFundTransaction(
            fund_id=fund_room.id,
            transaction_type="CONTRIBUTION",
            amount=500000,
            contributed_by_user_id=dang_user.id,
            created_by_user_id=main_user.id,
            description="Lê Hải Đăng đóng quỹ phòng",
            transaction_date=make_d(29),
        ),
    ]
    db.add_all(fund_txs)

    # Main user đóng quỹ từ Ví tiền mặt: ghi 1 giao dịch ví
    db.add(WalletTransaction(
        owner_user_id=main_user.id,
        wallet_id=wallet_cash.id,
        transaction_type="EXPENSE",
        amount=500000,
        category_id=CAT_CHI_TIEU_NHOM,
        description="[Phòng Trọ 308 - Phú Nhuận] Đóng góp quỹ sinh hoạt phòng",
        transaction_date=make_dt(29, 9, 30),
        source_type="FUND_CONTRIBUTION",
    ))

    # --- SALARY & MAJOR INCOME (Day 30, Day 15, Day 10) ---
    # Day 30: Lương tháng
    db.add(WalletTransaction(
        owner_user_id=main_user.id,
        wallet_id=wallet_vcb.id,
        transaction_type="INCOME",
        amount=28000000,
        category_id=CAT_LUONG,
        description="Nhận lương chuyển khoản công ty Tech Corp",
        transaction_date=make_dt(30, 8, 30),
    ))

    # Day 15: Thưởng dự án
    db.add(WalletTransaction(
        owner_user_id=main_user.id,
        wallet_id=wallet_vcb.id,
        transaction_type="INCOME",
        amount=6500000,
        category_id=CAT_THUONG,
        description="Thưởng hoàn thành Milestone Sprint Quý 4",
        transaction_date=make_dt(15, 14, 15),
    ))

    # Day 8: Thu nhập phụ Freelance
    db.add(WalletTransaction(
        owner_user_id=main_user.id,
        wallet_id=wallet_momo.id,
        transaction_type="INCOME",
        amount=3200000,
        category_id=CAT_THU_NHAP_PHU,
        description="Thanh toán thiết kế Landing Page freelance",
        transaction_date=make_dt(8, 20, 0),
    ))

    # --- TRANSFERS GIỮA CÁC VÍ ---
    # Day 29: Rút ATM từ VCB sang Tiền mặt (2,000,000 đ)
    transfer_group_1 = uuid.uuid4()
    db.add_all([
        WalletTransaction(
            owner_user_id=main_user.id,
            wallet_id=wallet_vcb.id,
            transaction_type="TRANSFER_OUT",
            amount=2000000,
            description="Rút tiền ATM cây Vietcombank Phan Xích Long",
            transaction_date=make_dt(29, 10, 0),
            transfer_group_id=transfer_group_1,
        ),
        WalletTransaction(
            owner_user_id=main_user.id,
            wallet_id=wallet_cash.id,
            transaction_type="TRANSFER_IN",
            amount=2000000,
            description="Nhận tiền mặt rút từ ATM Vietcombank",
            transaction_date=make_dt(29, 10, 0),
            transfer_group_id=transfer_group_1,
        ),
    ])

    # Day 28: Nạp từ VCB sang MoMo (1,500,000 đ)
    transfer_group_2 = uuid.uuid4()
    db.add_all([
        WalletTransaction(
            owner_user_id=main_user.id,
            wallet_id=wallet_vcb.id,
            transaction_type="TRANSFER_OUT",
            amount=1500000,
            description="Nạp tiền vào ví điện tử MoMo",
            transaction_date=make_dt(28, 11, 30),
            transfer_group_id=transfer_group_2,
        ),
        WalletTransaction(
            owner_user_id=main_user.id,
            wallet_id=wallet_momo.id,
            transaction_type="TRANSFER_IN",
            amount=1500000,
            description="Nạp tiền từ tài khoản Vietcombank liên kết",
            transaction_date=make_dt(28, 11, 30),
            transfer_group_id=transfer_group_2,
        ),
    ])

    # --- GROUP EXPENSES & SETTLEMENTS (Phòng Trọ 308) ---
    # 1. Day 27: Tiền Internet Viettel (330,000 đ - Main user trả qua MoMo, chia 3 = 110k/người)
    ge_internet = GroupExpense(
        id=uuid.uuid4(),
        group_id=group_room.id,
        title="Tiền Internet cáp quang Viettel tháng này",
        total_amount=330000,
        expense_date=make_d(27),
        payment_source="MEMBER",
        paid_by_user_id=main_user.id,
        category_id=CAT_CHI_TIEU_NHOM,
        split_method="EQUAL",
        status="POSTED",
        created_by_user_id=main_user.id,
    )
    db.add(ge_internet)
    db.flush()
    db.add_all([
        GroupExpenseSplit(expense_id=ge_internet.id, member_user_id=main_user.id, amount_owed=110000),
        GroupExpenseSplit(expense_id=ge_internet.id, member_user_id=tuan_user.id, amount_owed=110000),
        GroupExpenseSplit(expense_id=ge_internet.id, member_user_id=dang_user.id, amount_owed=110000),
    ])
    # Wallet tx for internet
    db.add(WalletTransaction(
        owner_user_id=main_user.id,
        wallet_id=wallet_momo.id,
        transaction_type="EXPENSE",
        amount=330000,
        category_id=CAT_CHI_TIEU_NHOM,
        description=f"[{group_room.name}] Chi tiêu: Tiền Internet cáp quang Viettel tháng này",
        transaction_date=make_dt(27, 19, 45),
        source_type="GROUP_EXPENSE",
        source_id=ge_internet.id,
    ))

    # 2. Day 20: Tiền điện nước phòng trọ (1,350,000 đ - Main user trả qua VCB, chia 3 = 450k/người)
    ge_util = GroupExpense(
        id=uuid.uuid4(),
        group_id=group_room.id,
        title="Tiền điện sinh hoạt và nước máy tháng trước",
        total_amount=1350000,
        expense_date=make_d(20),
        payment_source="MEMBER",
        paid_by_user_id=main_user.id,
        category_id=CAT_CHI_TIEU_NHOM,
        split_method="EQUAL",
        status="POSTED",
        created_by_user_id=main_user.id,
    )
    db.add(ge_util)
    db.flush()
    db.add_all([
        GroupExpenseSplit(expense_id=ge_util.id, member_user_id=main_user.id, amount_owed=450000),
        GroupExpenseSplit(expense_id=ge_util.id, member_user_id=tuan_user.id, amount_owed=450000),
        GroupExpenseSplit(expense_id=ge_util.id, member_user_id=dang_user.id, amount_owed=450000),
    ])
    db.add(WalletTransaction(
        owner_user_id=main_user.id,
        wallet_id=wallet_vcb.id,
        transaction_type="EXPENSE",
        amount=1350000,
        category_id=CAT_CHI_TIEU_NHOM,
        description=f"[{group_room.name}] Chi tiêu: Tiền điện sinh hoạt và nước máy tháng trước",
        transaction_date=make_dt(20, 10, 15),
        source_type="GROUP_EXPENSE",
        source_id=ge_util.id,
    ))

    # 3. Day 17: Chi phí trích Quỹ chung mua đồ gia dụng (240,000 đ - payment_source = 'FUND', Minh Tuấn mua)
    ge_fund_exp = GroupExpense(
        id=uuid.uuid4(),
        group_id=group_room.id,
        title="Mua nước rửa bát, xà phòng, túi rác phòng trọ",
        total_amount=240000,
        expense_date=make_d(17),
        payment_source="FUND",
        fund_id=fund_room.id,
        category_id=CAT_CHI_TIEU_NHOM,
        split_method="EQUAL",
        status="POSTED",
        created_by_user_id=tuan_user.id,
    )
    db.add(ge_fund_exp)
    db.flush()
    db.add_all([
        GroupExpenseSplit(expense_id=ge_fund_exp.id, member_user_id=main_user.id, amount_owed=80000),
        GroupExpenseSplit(expense_id=ge_fund_exp.id, member_user_id=tuan_user.id, amount_owed=80000),
        GroupExpenseSplit(expense_id=ge_fund_exp.id, member_user_id=dang_user.id, amount_owed=80000),
    ])
    db.add(GroupFundTransaction(
        fund_id=fund_room.id,
        transaction_type="EXPENSE",
        amount=240000,
        created_by_user_id=tuan_user.id,
        group_expense_id=ge_fund_exp.id,
        description=f"[{group_room.name}] Chi phí quỹ: Mua nước rửa bát, xà phòng, túi rác phòng trọ",
        transaction_date=make_d(17),
    ))

    # 4. Day 12: Liên hoan lẩu dê cuối tuần (660,000 đ - Main user trả qua MoMo, chia 3 = 220k/người)
    ge_party = GroupExpense(
        id=uuid.uuid4(),
        group_id=group_room.id,
        title="Ăn tối lẩu dê Bàu Sen liên hoan cuối tuần",
        total_amount=660000,
        expense_date=make_d(12),
        payment_source="MEMBER",
        paid_by_user_id=main_user.id,
        category_id=CAT_CHI_TIEU_NHOM,
        split_method="EQUAL",
        status="POSTED",
        created_by_user_id=main_user.id,
    )
    db.add(ge_party)
    db.flush()
    db.add_all([
        GroupExpenseSplit(expense_id=ge_party.id, member_user_id=main_user.id, amount_owed=220000),
        GroupExpenseSplit(expense_id=ge_party.id, member_user_id=tuan_user.id, amount_owed=220000),
        GroupExpenseSplit(expense_id=ge_party.id, member_user_id=dang_user.id, amount_owed=220000),
    ])
    db.add(WalletTransaction(
        owner_user_id=main_user.id,
        wallet_id=wallet_momo.id,
        transaction_type="EXPENSE",
        amount=660000,
        category_id=CAT_CHI_TIEU_NHOM,
        description=f"[{group_room.name}] Chi tiêu: Ăn tối lẩu dê Bàu Sen liên hoan cuối tuần",
        transaction_date=make_dt(12, 20, 30),
        source_type="GROUP_EXPENSE",
        source_id=ge_party.id,
    ))

    # 5. Day 8: Đổi bình gas (390,000 đ - do Hải Đăng trả, chia 3 = 130k/người)
    ge_gas = GroupExpense(
        id=uuid.uuid4(),
        group_id=group_room.id,
        title="Đổi bình gas PetroVietnam 12kg",
        total_amount=390000,
        expense_date=make_d(8),
        payment_source="MEMBER",
        paid_by_user_id=dang_user.id,
        category_id=CAT_CHI_TIEU_NHOM,
        split_method="EQUAL",
        status="POSTED",
        created_by_user_id=dang_user.id,
    )
    db.add(ge_gas)
    db.flush()
    db.add_all([
        GroupExpenseSplit(expense_id=ge_gas.id, member_user_id=main_user.id, amount_owed=130000),
        GroupExpenseSplit(expense_id=ge_gas.id, member_user_id=tuan_user.id, amount_owed=130000),
        GroupExpenseSplit(expense_id=ge_gas.id, member_user_id=dang_user.id, amount_owed=130000),
    ])

    # SETTLEMENT 1 (Phòng 308): Minh Tuấn đã thanh toán nợ cho Trương Tuấn (450,000 đ) - CONFIRMED
    # Giảm trừ chi tiêu nhóm Net Expense của Trương Tuấn và hoàn vào ví Vietcombank!
    settle_tuan = GroupSettlement(
        id=uuid.uuid4(),
        group_id=group_room.id,
        from_user_id=tuan_user.id,
        to_user_id=main_user.id,
        amount=450000,
        status="CONFIRMED",
        note="Chuyển khoản tiền điện nước tháng trước",
        created_at=make_dt(18, 9, 0),
        confirmed_at=make_dt(18, 9, 30),
    )
    db.add(settle_tuan)
    db.flush()
    db.add(WalletTransaction(
        owner_user_id=main_user.id,
        wallet_id=wallet_vcb.id,
        transaction_type="GROUP_SETTLEMENT_RECEIVED",
        amount=450000,
        category_id=CAT_CHI_TIEU_NHOM,
        description=f"[{group_room.name}] Nhận quyết toán nợ từ Trần Minh Tuấn",
        transaction_date=make_dt(18, 9, 30),
        source_type="GROUP_SETTLEMENT",
        source_id=settle_tuan.id,
    ))

    # SETTLEMENT 2 (Phòng 308): Hải Đăng gửi quyết toán 250,000 đ - PENDING
    settle_dang_pending = GroupSettlement(
        id=uuid.uuid4(),
        group_id=group_room.id,
        from_user_id=dang_user.id,
        to_user_id=main_user.id,
        amount=250000,
        status="PENDING",
        note="Gửi trước tiền ăn lẩu dê, cuối tuần chuyển nốt",
        created_at=make_dt(2, 21, 15),
    )
    db.add(settle_dang_pending)

    # --- GROUP EXPENSES & SETTLEMENTS (Du Lịch Đà Lạt) ---
    # 1. Day 6: Đặt Homestay Đà Lạt 3N2Đ (2,400,000 đ - Trương Tuấn trả qua VCB, chia 3 = 800k/người)
    ge_homestay = GroupExpense(
        id=uuid.uuid4(),
        group_id=group_trip.id,
        title="Đặt Homestay Mây Lang Thang 3 ngày 2 đêm",
        total_amount=2400000,
        expense_date=make_d(6),
        payment_source="MEMBER",
        paid_by_user_id=main_user.id,
        category_id=CAT_CHI_TIEU_NHOM,
        split_method="EQUAL",
        status="POSTED",
        created_by_user_id=main_user.id,
    )
    db.add(ge_homestay)
    db.flush()
    db.add_all([
        GroupExpenseSplit(expense_id=ge_homestay.id, member_user_id=main_user.id, amount_owed=800000),
        GroupExpenseSplit(expense_id=ge_homestay.id, member_user_id=dang_user.id, amount_owed=800000),
        GroupExpenseSplit(expense_id=ge_homestay.id, member_user_id=mai_user.id, amount_owed=800000),
    ])
    db.add(WalletTransaction(
        owner_user_id=main_user.id,
        wallet_id=wallet_vcb.id,
        transaction_type="EXPENSE",
        amount=2400000,
        category_id=CAT_CHI_TIEU_NHOM,
        description=f"[{group_trip.name}] Chi tiêu: Đặt Homestay Mây Lang Thang 3 ngày 2 đêm",
        transaction_date=make_dt(6, 14, 0),
        source_type="GROUP_EXPENSE",
        source_id=ge_homestay.id,
    ))

    # 2. Day 5: Thuê xe máy Đà Lạt (600,000 đ - Ngọc Mai thanh toán, chia 3 = 200k/người)
    ge_bikes = GroupExpense(
        id=uuid.uuid4(),
        group_id=group_trip.id,
        title="Thuê 2 xe máy Honda Vision 3 ngày",
        total_amount=600000,
        expense_date=make_d(5),
        payment_source="MEMBER",
        paid_by_user_id=mai_user.id,
        category_id=CAT_CHI_TIEU_NHOM,
        split_method="EQUAL",
        status="POSTED",
        created_by_user_id=mai_user.id,
    )
    db.add(ge_bikes)
    db.flush()
    db.add_all([
        GroupExpenseSplit(expense_id=ge_bikes.id, member_user_id=main_user.id, amount_owed=200000),
        GroupExpenseSplit(expense_id=ge_bikes.id, member_user_id=dang_user.id, amount_owed=200000),
        GroupExpenseSplit(expense_id=ge_bikes.id, member_user_id=mai_user.id, amount_owed=200000),
    ])

    # 3. Day 4: Tiệc nướng BBQ & Rượu vang đồi gió (960,000 đ - Trương Tuấn trả qua MoMo, chia 3 = 320k/người)
    ge_bbq = GroupExpense(
        id=uuid.uuid4(),
        group_id=group_trip.id,
        title="Ăn tối BBQ nướng xiên & Rượu vang đêm lạnh",
        total_amount=960000,
        expense_date=make_d(4),
        payment_source="MEMBER",
        paid_by_user_id=main_user.id,
        category_id=CAT_CHI_TIEU_NHOM,
        split_method="EQUAL",
        status="POSTED",
        created_by_user_id=main_user.id,
    )
    db.add(ge_bbq)
    db.flush()
    db.add_all([
        GroupExpenseSplit(expense_id=ge_bbq.id, member_user_id=main_user.id, amount_owed=320000),
        GroupExpenseSplit(expense_id=ge_bbq.id, member_user_id=dang_user.id, amount_owed=320000),
        GroupExpenseSplit(expense_id=ge_bbq.id, member_user_id=mai_user.id, amount_owed=320000),
    ])
    db.add(WalletTransaction(
        owner_user_id=main_user.id,
        wallet_id=wallet_momo.id,
        transaction_type="EXPENSE",
        amount=960000,
        category_id=CAT_CHI_TIEU_NHOM,
        description=f"[{group_trip.name}] Chi tiêu: Ăn tối BBQ nướng xiên & Rượu vang đêm lạnh",
        transaction_date=make_dt(4, 19, 15),
        source_type="GROUP_EXPENSE",
        source_id=ge_bbq.id,
    ))

    # SETTLEMENT (Du Lịch Đà Lạt): Ngọc Mai quyết toán hoàn trả tiền phòng cho Trương Tuấn (800,000 đ) - CONFIRMED
    settle_mai = GroupSettlement(
        id=uuid.uuid4(),
        group_id=group_trip.id,
        from_user_id=mai_user.id,
        to_user_id=main_user.id,
        amount=800000,
        status="CONFIRMED",
        note="Hoàn tiền phòng homestay Đà Lạt",
        created_at=make_dt(3, 10, 30),
        confirmed_at=make_dt(3, 11, 0),
    )
    db.add(settle_mai)
    db.flush()
    db.add(WalletTransaction(
        owner_user_id=main_user.id,
        wallet_id=wallet_vcb.id,
        transaction_type="GROUP_SETTLEMENT_RECEIVED",
        amount=800000,
        category_id=CAT_CHI_TIEU_NHOM,
        description=f"[{group_trip.name}] Nhận quyết toán nợ từ Nguyễn Ngọc Mai",
        transaction_date=make_dt(3, 11, 0),
        source_type="GROUP_SETTLEMENT",
        source_id=settle_mai.id,
    ))

    # --- DỮ LIỆU CHI TIÊU CÁ NHÂN TRẢI DÀI 30 NGÀY (DAILY LIVING EXPENSES) ---
    personal_expenses = [
        # Ăn uống hàng ngày
        (30, 7, 45, wallet_cash, CAT_AN_UONG, "Bánh mì chảo & sữa đậu nành sáng", 45000),
        (30, 12, 15, wallet_momo, CAT_AN_UONG, "Cơm tấm sườn bì chả trưa văn phòng", 55000),
        (30, 15, 30, wallet_momo, CAT_AN_UONG, "Cà phê đen đá Highlands Coffee", 35000),
        (29, 12, 30, wallet_cash, CAT_AN_UONG, "Bún bò Huế O Cúc trưa", 60000),
        (28, 8, 15, wallet_cash, CAT_AN_UONG, "Phở bò tái nạm đầu ngõ", 55000),
        (28, 18, 45, wallet_momo, CAT_MUA_SAM, "Mua áo phông trơn Uniqlo", 299000),
        (27, 7, 30, wallet_cash, CAT_AN_UONG, "Xôi mặn thập cẩm ăn sáng", 30000),
        (27, 12, 10, wallet_momo, CAT_AN_UONG, "Cơm gà xối mỡ trưa", 50000),
        (26, 8, 0, wallet_cash, CAT_DI_LAI, "Đổ xăng đầy bình Honda Air Blade", 95000),
        (26, 17, 30, wallet_momo, CAT_AN_UONG, "Trà sữa Ô long nướng Gong Cha", 58000),
        (25, 11, 45, wallet_cash, CAT_AN_UONG, "Cơm niêu Singapore trưa văn phòng", 65000),
        (25, 20, 0, wallet_vcb, CAT_GIAI_TRI, "Vé xem phim CGV cuối tuần (2 vé)", 240000),
        (24, 9, 30, wallet_cash, CAT_HOA_DON, "Nạp thẻ điện thoại Viettel 4G", 100000),
        (24, 16, 20, wallet_momo, CAT_AN_UONG, "Bánh bao xá xíu chiều", 25000),
        (23, 12, 15, wallet_cash, CAT_AN_UONG, "Cơm bình dân trưa", 40000),
        (23, 19, 0, wallet_vcb, CAT_MUA_SAM, "Đi siêu thị Emart Gò Vấp mua đồ ăn", 680000),
        (22, 8, 10, wallet_cash, CAT_AN_UONG, "Bánh cuốn nóng giò lụa", 40000),
        (22, 14, 0, wallet_momo, CAT_AN_UONG, "Cà phê muối The Coffee House", 45000),
        (21, 12, 30, wallet_cash, CAT_AN_UONG, "Bún chả Hà Nội trưa", 55000),
        (21, 17, 45, wallet_momo, CAT_DI_LAI, "GrabBike trời mưa đi làm về", 65000),
        (20, 8, 30, wallet_vcb, CAT_HOA_DON, "Thanh toán gói cước Spotify Family & iCloud", 118000),
        (19, 7, 50, wallet_cash, CAT_AN_UONG, "Hủ tiếu Nam Vang ăn sáng", 50000),
        (19, 12, 15, wallet_momo, CAT_AN_UONG, "Cơm rang dưa bò trưa", 50000),
        (18, 13, 0, wallet_cash, CAT_Y_TE, "Mua vitamin C và viên ngậm Pharmacity", 125000),
        (17, 8, 15, wallet_cash, CAT_AN_UONG, "Bánh mì que Pate cay x2", 36000),
        (17, 12, 20, wallet_cash, CAT_AN_UONG, "Bún riêu cua ốc bò", 55000),
        (16, 9, 0, wallet_cash, CAT_DI_LAI, "Đổ xăng xe máy Petrolimex", 90000),
        (16, 18, 30, wallet_vcb, CAT_GIAI_TRI, "Mua sách Tiki: Tâm Lý Học Về Tiền", 195000),
        (15, 12, 30, wallet_cash, CAT_AN_UONG, "Cơm sườn nướng mỡ hành trưa", 50000),
        (14, 8, 0, wallet_cash, CAT_AN_UONG, "Cháo sườn quẩy ruốc sáng", 35000),
        (14, 15, 30, wallet_momo, CAT_AN_UONG, "Cà phê sữa đá mang đi", 28000),
        (13, 12, 10, wallet_cash, CAT_AN_UONG, "Cơm văn phòng tự chọn", 45000),
        (13, 19, 30, wallet_momo, CAT_MUA_SAM, "Mua kệ để chân công thái học Shopee", 210000),
        (11, 8, 30, wallet_cash, CAT_AN_UONG, "Bánh giò nóng thịt nấm", 25000),
        (11, 12, 15, wallet_cash, CAT_AN_UONG, "Mì Quảng gà trứng trưa", 50000),
        (10, 17, 0, wallet_cash, CAT_DI_LAI, "Rửa xe máy bọt tuyết & bơm lốp", 40000),
        (10, 20, 30, wallet_momo, CAT_GIAI_TRI, "Game bản quyền Steam Autumn Sale", 280000),
        (9, 8, 15, wallet_cash, CAT_AN_UONG, "Bánh mì heo quay giòn da", 35000),
        (9, 12, 30, wallet_cash, CAT_AN_UONG, "Cơm tấm chả cua", 60000),
        (8, 7, 45, wallet_cash, CAT_AN_UONG, "Phở gà lá chanh sáng", 50000),
        (7, 12, 15, wallet_cash, CAT_AN_UONG, "Bún đậu mắm tôm thập cẩm", 65000),
        (7, 19, 0, wallet_vcb, CAT_MUA_SAM, "Đi siêu thị Co.opmart mua thực phẩm tuần", 520000),
        (6, 8, 0, wallet_cash, CAT_DI_LAI, "Đổ xăng xe máy", 95000),
        (5, 12, 30, wallet_cash, CAT_AN_UONG, "Cơm gà xối mỡ văn phòng", 50000),
        (4, 9, 0, wallet_cash, CAT_AN_UONG, "Bánh mì ốp la xúc xích", 35000),
        (3, 12, 15, wallet_cash, CAT_AN_UONG, "Cơm bò xào cần tỏi trưa", 55000),
        (2, 8, 30, wallet_cash, CAT_AN_UONG, "Bún chả cá Nha Trang sáng", 45000),
        (2, 15, 0, wallet_momo, CAT_AN_UONG, "Trà đào cam sả Phúc Long", 60000),
        (1, 8, 0, wallet_cash, CAT_AN_UONG, "Phở bò tái lăn sáng", 60000),
        (1, 12, 30, wallet_cash, CAT_AN_UONG, "Cơm cá kho tộ trưa", 45000),
        (1, 18, 0, wallet_cash, CAT_DI_LAI, "Gửi xe máy tháng chung cư", 120000),
        (0, 8, 15, wallet_cash, CAT_AN_UONG, "Bánh mì chả bò Đà Nẵng hôm nay", 40000),
        (0, 11, 45, wallet_momo, CAT_AN_UONG, "Cơm trưa bò sốt tiêu đen", 55000),
    ]

    for day_off, hr, mi, wal, cat, desc, amt in personal_expenses:
        db.add(WalletTransaction(
            owner_user_id=main_user.id,
            wallet_id=wal.id,
            transaction_type="EXPENSE",
            amount=amt,
            category_id=cat,
            description=desc,
            transaction_date=make_dt(day_off, hr, mi),
        ))

    db.commit()
    print("✓ Đã sinh thành công toàn bộ giao dịch 30 ngày!")


def verify_seeded_data(db):
    print("--- 7. Kiểm tra tổng kết dữ liệu đã tạo ---")
    user_count = db.execute(text("SELECT count(*) FROM app_users;")).scalar_one()
    wallet_count = db.execute(text("SELECT count(*) FROM wallets;")).scalar_one()
    tx_count = db.execute(text("SELECT count(*) FROM wallet_transactions;")).scalar_one()
    group_count = db.execute(text("SELECT count(*) FROM finance_groups;")).scalar_one()
    ge_count = db.execute(text("SELECT count(*) FROM group_expenses;")).scalar_one()
    settle_count = db.execute(text("SELECT count(*) FROM group_settlements;")).scalar_one()
    fund_tx_count = db.execute(text("SELECT count(*) FROM group_fund_transactions;")).scalar_one()

    print(f"• Số lượng người dùng: {user_count}")
    print(f"• Số lượng ví: {wallet_count}")
    print(f"• Số lượng nhóm tài chính: {group_count}")
    print(f"• Số lượng khoản chi nhóm: {ge_count}")
    print(f"• Số lượng quyết toán nợ: {settle_count}")
    print(f"• Số lượng giao dịch quỹ: {fund_tx_count}")
    print(f"• Tổng số giao dịch ví: {tx_count}")

    # Test query summary for main user
    main_user = db.query(User).filter(User.email == "demo@flowpocket.vn").first()
    if main_user:
        income = db.execute(text("""
            SELECT COALESCE(SUM(amount), 0) FROM wallet_transactions 
            WHERE owner_user_id = :uid AND transaction_type = 'INCOME';
        """), {"uid": main_user.id}).scalar_one()

        personal_exp = db.execute(text("""
            SELECT COALESCE(SUM(amount), 0) FROM wallet_transactions 
            WHERE owner_user_id = :uid AND transaction_type = 'EXPENSE' 
            AND (source_type IS NULL OR source_type != 'GROUP_EXPENSE');
        """), {"uid": main_user.id}).scalar_one()

        group_paid = db.execute(text("""
            SELECT COALESCE(SUM(amount), 0) FROM wallet_transactions 
            WHERE owner_user_id = :uid AND transaction_type = 'EXPENSE' 
            AND source_type = 'GROUP_EXPENSE';
        """), {"uid": main_user.id}).scalar_one()

        settle_rcv = db.execute(text("""
            SELECT COALESCE(SUM(amount), 0) FROM wallet_transactions 
            WHERE owner_user_id = :uid AND transaction_type = 'GROUP_SETTLEMENT_RECEIVED';
        """), {"uid": main_user.id}).scalar_one()

        net_expense = personal_exp + group_paid - settle_rcv

        print("\n--- BÁO CÁO TÀI CHÍNH CỦA USER DEMO (demo@flowpocket.vn) ---")
        print(f"Tổng thu nhập (INCOME): {income:,.0f} đ")
        print(f"Chi tiêu cá nhân thuần: {personal_exp:,.0f} đ")
        print(f"Ứng tiền chi tiêu nhóm: {group_paid:,.0f} đ")
        print(f"Đã nhận hoàn nợ quyết toán: {settle_rcv:,.0f} đ")
        print(f"==> CHI TIÊU THỰC TẾ (NET EXPENSE): {net_expense:,.0f} đ")
        print(f"==> DÒNG TIỀN RÒNG (NET CASH FLOW): {(income - net_expense):,.0f} đ")


def main():
    db = SessionLocal()
    try:
        clean_database(db)
        ensure_system_categories(db)
        seed_large_data(db)
        verify_seeded_data(db)
        print("\n🎉 HOÀN TẤT SEED DỮ LIỆU LỚN CHO 1 THÁNG THÀNH CÔNG!")
    except Exception as e:
        db.rollback()
        print(f"\n❌ LỖI TRONG QUÁ TRÌNH SEED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
