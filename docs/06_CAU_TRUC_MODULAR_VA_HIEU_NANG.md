# FlowPocket — Cấu trúc Module hóa và Chuẩn hóa Hiệu năng (Modular Architecture)

Tài liệu này ghi nhận chi tiết kiến trúc sau khi tái cấu trúc (refactoring), nhằm giải quyết triệt để vấn đề các file quá dài ("God Component" và "Monolithic Service"), đảm bảo dự án dễ bảo trì, mở rộng và có hiệu năng cao.

---

## 1. Mục tiêu & Nguyên tắc tái cấu trúc

1. **Tuân thủ Single Responsibility Principle (SRP)**: Mỗi file/component chỉ chịu trách nhiệm cho một miền nghiệp vụ duy nhất.
2. **Kích thước file an toàn**: Giới hạn độ dài lý tưởng dưới 200 - 350 dòng/file.
3. **Tương thích ngược 100% (Zero Breaking Changes)**: Tách module không làm hỏng router API hiện tại hoặc bộ kiểm thử tự động (pytest pass 33/33).
4. **Tách rời Presentation và Business Logic**: Tối ưu re-render ở React/Next.js.

---

## 2. Tái cấu trúc Backend: Package `app.services.group_finance`

Trước khi refactor, file `backend/app/services/group_finance_service.py` dài gần 900 dòng, gộp toàn bộ nghiệp vụ con của tài chính nhóm.

Hệ thống đã được chuyển đổi thành một Python Package chuyên biệt:

```text
backend/app/services/
├── group_finance/
│   ├── __init__.py             # Facade Class GroupFinanceService & Re-exports
│   ├── constants.py            # Hằng số DEFAULT_GROUP_CATEGORY_ID & helper quyền hạn
│   ├── expense_service.py      # Thêm/hủy khoản chi, thuật toán chia tiền Equal/Custom
│   ├── fund_service.py         # Quản lý số dư quỹ, đóng góp quỹ, rút quỹ
│   ├── debt_calculator.py      # Ma trận tính nợ & thuật toán rút gọn nợ tham lam
│   └── settlement_service.py   # Vòng đời quyết toán nợ (tạo, xác nhận, từ chối, hủy)
└── group_finance_service.py    # Proxy module tương thích ngược cho các router cũ
```

### Chi tiết các module:

| Module | Trách nhiệm chính | Điểm mấu chốt |
| :--- | :--- | :--- |
| **`constants.py`** | Định nghĩa ID danh mục `Chi tiêu nhóm` (`...1108`) và hàm `get_user_member_record` | Kiểm tra tư cách thành viên nhóm bắt buộc trước mọi thao tác tài chính |
| **`expense_service.py`** | Tính toán phần chia `calculate_splits`, `create_expense`, `void_expense`, `list_expenses` | Bảo toàn số nguyên VND tuyệt đối (chia dư deterministic), đồng bộ trừ/hoàn ví cá nhân nguyên tử |
| **`fund_service.py`** | `get_or_create_default_fund`, `get_fund_balance`, `contribute_to_fund`, `withdraw_from_fund` | Tính số dư quỹ theo công thức: `(Contribution + Adjust_In) - (Expense + Withdrawal + Adjust_Out)` |
| **`debt_calculator.py`** | `calculate_group_debts` | Tính `net_balance = (paid - share) + settlement_paid - settlement_received` và thuật toán Greedy Debt Simplification |
| **`settlement_service.py`** | Vòng đời thanh toán nợ giữa 2 thành viên | Chỉ người nhận (`to_user_id`) mới được bấm Xác nhận / Từ chối. Tự động cộng tiền ví cá nhân người nhận |

---

## 3. Tái cấu trúc Frontend: Component Decomposition

Trước khi refactor, `frontend/src/features/groups/group-dashboard.tsx` dài hơn 1.700 dòng, là một "God Component" gánh toàn bộ state bộ lọc, modal, thẻ số dư, bảng nợ và danh sách giao dịch.

Đã được phân rã thành các component con độc lập trong `frontend/src/features/groups/components/`:

```text
frontend/src/features/groups/
├── components/
│   ├── group-hero-card.tsx      # Thẻ Hero Balance Card phong cách Fintech
│   ├── group-expense-list.tsx   # Danh sách chi tiêu, bộ lọc đa năng & hủy khoản chi
│   ├── group-debt-section.tsx   # Ma trận nợ, gợi ý chuyển tiền tối giản & lịch sử quyết toán
│   ├── group-fund-section.tsx   # Thẻ số dư quỹ nhóm & bảng lịch sử dòng tiền
│   └── group-member-list.tsx    # Danh sách thành viên, hiển thị badge vai trò
├── group-dashboard.tsx          # Orchestrator tinh gọn (~800 dòng gồm state & modal hooks)
└── ... (các modals)
```

### Lợi ích đạt được:
- **Tốc độ render nhanh vượt bậc**: Khi người dùng thao tác bộ lọc ngày hoặc chuyển đổi người trả tiền, chỉ `GroupExpenseList` render lại thay vì toàn bộ trang.
- **Dễ đọc và bảo trì**: Mỗi phần UI có interface props rõ ràng, không phụ thuộc ngầm vào biến ngoài.

---

## 4. Chuẩn mực Kế toán Dòng tiền (Net Expense Accounting)

FlowPocket áp dụng nguyên lý kế toán chuẩn quốc tế để xử lý bài toán **ứng tiền nhóm và nhận hoàn tiền**:

$$\text{Net Expense} = \text{Personal Expense} + \text{Group Expense Paid} - \text{Group Settlement Received} + \text{Group Settlement Paid}$$

### Ý nghĩa kinh tế:
1. **Khoản tiền ứng trước cho nhóm (`Group Expense Paid`)**: Được ghi nhận là khoản tiền tạm ứng (Accounts Receivable).
2. **Khoản tiền nhận hoàn nợ (`Group Settlement Received`)**: Là khoản thu hồi công nợ tạm ứng, **tuyệt đối không được tính thành Thu nhập (Income)** để tránh phóng đại dòng tiền ảo của người dùng.
3. **Khoản tiền thanh toán trả nợ (`Group Settlement Paid`)**: Là khoản hoàn trả phần chi phí thực tế mà người dùng nợ bạn bè.

---

## 5. Dữ liệu mẫu kiểm thử 1 tháng (Large Dataset Seed Script)

Để phục vụ kiểm thử và demo toàn diện, dự án có script tự động:
- **Đường dẫn**: `backend/scripts/seed_large_month_data.py`
- **Thực thi**:
  ```bash
  cd backend
  .venv\Scripts\python scripts/seed_large_month_data.py
  ```
- **Dữ liệu sinh ra**:
  - 5 người dùng mẫu (Tài khoản chính: `demo@flowpocket.vn` / `Password123!`).
  - 3 ví cá nhân (Tiền mặt, Vietcombank, MoMo).
  - 2 nhóm thực tế: "Phòng Trọ 308 - Phú Nhuận" và "Chuyến Đi Đà Lạt 3N2Đ".
  - 68 giao dịch ví trải dài 30 ngày (có đầy đủ ngày, giờ, phút phục vụ audit log).
  - Đầy đủ các luồng: Lương, thưởng, chi tiêu sinh hoạt, trích quỹ nhóm, ứng tiền nhóm, quyết toán đã xác nhận và đang chờ.

---

## 6. Cơ chế Tự động cấp Ví mặc định (Auto-Provisioning) & Toàn vẹn Quyết toán

Nhằm khắc phục triệt để tình trạng một tài khoản nhận tiền quyết toán hoặc trả tiền mà "không có ví để chứa", hệ thống FlowPocket đã thiết lập cơ chế khép kín 2 lớp:

1. **Auto-Provisioning khi Đăng ký (Sign Up)**:
   - Trong `app.services.auth_service.register_user`: Ngay khi tài khoản được tạo thành công, hệ thống tự động khởi tạo 1 ví mặc định: **"Tiền mặt"** (loại `CASH`, số dư ban đầu `0 đ`).
   - Trong `app.services.wallet_service.get_user_wallets_with_balance`: Áp dụng cơ chế *Lazy Self-Healing Provisioning*, nếu một user cũ chưa có ví nào trong DB, hệ thống tự động cấp ví Tiền mặt để đảm bảo mọi tài khoản luôn sở hữu $\ge 1$ ví.

2. **Ràng buộc Quyết toán Nợ (Settlement Integrity)**:
   - Trong `app.services.group_finance.settlement_service.confirm_settlement`: Khi người nhận bấm Xác nhận, tiền hoàn nợ **bắt buộc được hạch toán vào ví cá nhân** (nếu client không chỉ định cụ thể, backend tự động lấy ví hoạt động đầu tiên của người nhận).
   - Trên giao diện `ConfirmSettlementModal`: Bắt buộc người dùng chọn ví nhận tiền từ danh sách ví hiện có, loại bỏ hoàn toàn tình trạng tiền nhận về biến mất không dấu vết khỏi sổ cái tài chính.

---

## 7. Trải nghiệm Nhập Tiền Thông Minh (`MoneyInput` & `numberToVietnameseWords`)

Để giải quyết triệt để đặc thù tiền tệ VND có nhiều số 0 và tránh nhầm lẫn khi nhập liệu:

1. **Component `MoneyInput` (`frontend/src/components/ui/money-input.tsx`)**:
   - **Tự động định dạng (Auto-formatting)**: Tự động chèn dấu chấm phân cách hàng nghìn ngay trong khi người dùng đang gõ (ví dụ `150000` -> `150.000 ₫`).
   - **Phím tắt thêm số 0 thông minh**: Nút `+000` (nhân 1.000) và `+00` (nhân 100) hỗ trợ nhập hàng triệu, chục triệu chỉ với 1-2 lần bấm.
   - **Hỗ trợ gõ tắt (Shorthand)**: Nhận diện trực tiếp khi người dùng gõ `150k` (150.000) hoặc `1.5m` / `1.5tr` (1.500.000).
   - **Gợi ý tăng nhanh**: Các nút `+10k`, `+50k`, `+100k`, `+500k` phục vụ ghi chép chi tiêu sinh hoạt hằng ngày.

2. **Tiện ích Đọc tiền thành chữ Tiếng Việt (`frontend/src/lib/number-to-words.ts`)**:
   - Hàm `numberToVietnameseWords(amount)` đọc chính xác từng lớp nghìn, triệu, tỷ theo ngữ pháp tiếng Việt chuẩn (ví dụ: *150.000* -> *"Một trăm năm mươi nghìn đồng"*).
   - Hiển thị trực tiếp ngay dưới ô nhập liệu giúp người dùng kiểm tra đối chiếu ngay lập tức, triệt tiêu nguy cơ gõ thừa hoặc thiếu số 0.

3. **Phạm vi áp dụng toàn diện**:
   - `expense-modal.tsx`: Nhập số tiền chi tiêu nhóm.
   - `transaction-modal.tsx`: Nhập chi tiêu / thu nhập cá nhân và chi tiêu nhóm từ trang cá nhân.
   - `fund-modal.tsx`: Nhập số tiền nạp quỹ hoặc rút quỹ nhóm.
   - `settlement-modal.tsx`: Nhập số tiền thanh toán quyết toán nợ.
   - `transfer-modal.tsx`: Nhập số tiền chuyển khoản giữa các ví cá nhân.
   - `wallet-modal.tsx`: Nhập số dư ban đầu khi tạo ví mới.

---

## 8. Chuẩn hóa Nghiệp vụ Quỹ Nhóm & Đồng bộ Báo cáo Dòng Tiền

Để giải quyết triệt để sự "lệch pha" giữa dòng tiền nạp quỹ và báo cáo tài chính cá nhân:

1. **Bản chất kế toán Quỹ nhóm**:
   - Quỹ nhóm là **Tài khoản Ký quỹ chung (Shared Escrow)**.
   - Khi thành viên nạp tiền (`FUND_CONTRIBUTION`): Dòng tiền rời khỏi ví cá nhân.
   - Khi thành viên rút tiền dư từ quỹ (`FUND_WITHDRAWAL`): Dòng tiền trở lại ví cá nhân (không tính là thu nhập mới).
   - Đóng góp quỹ ròng được tính bằng công thức:  
     $$\text{Net Fund Contribution} = \max(0, \text{Fund Contributed} - \text{Fund Withdrawn})$$

2. **Hạch toán Báo cáo Tổng thể (`get_financial_summary`)**:
   - Bổ sung `Net Fund Contribution` vào công thức Thực chi (Net Expense):  
     $$\text{Net Expense} = \text{Gross Expense} + \text{Settlement Paid} - \text{Settlement Received} + \text{Net Fund Contribution}$$
   - Tự động bổ sung mục **"Đóng góp quỹ nhóm"** vào cơ cấu danh mục chi tiêu (`expense_breakdown`), giải trình 100% dòng tiền chi ra mà không bị thất thoát số liệu.

3. **Đồng bộ Biểu đồ Cash Flow (`CashFlowChart.tsx`)**:
   - Phân loại chuẩn hóa Dòng tiền vào (Cash Inflow): `INCOME`, `GROUP_SETTLEMENT_RECEIVED`, `FUND_WITHDRAWAL`.
   - Phân loại chuẩn hóa Dòng tiền ra (Cash Outflow): `EXPENSE`, `GROUP_SETTLEMENT_PAID`, `FUND_CONTRIBUTION`.
   - Loại bỏ chuyển tiền nội bộ (`TRANSFER_IN`, `TRANSFER_OUT`) khỏi tổng thu chi để tránh đội dòng tiền ảo.

4. **Trực quan hóa Quỹ Nhóm (`GroupFundSection.tsx`)**:
   - Hiển thị bảng KPI 3 chỉ số: **Số dư quỹ hiện tại**, **Tổng đã huy động**, **Tổng đã chi từ quỹ**.
   - Phân tích chi tiết tỷ trọng đóng góp của từng thành viên trong nhóm kèm thanh tiến độ trực quan.

---

## 9. Phân định Ranh giới Nghiệp vụ rõ rệt: Cá nhân vs Nhóm

Để đảm bảo tính nhất quán (Consistency) và tối ưu hóa trải nghiệm người dùng:

1. **Tab "Cá nhân" (`TransactionModal.tsx`)**:
   - Chỉ phục vụ duy nhất 2 luồng: **Thu nhập (+)** và **Chi tiêu (-)** của chính chủ tài khoản.
   - Loại bỏ hoàn toàn khối chọn nhóm nửa vời, loại bỏ các API call thừa thãi `GET /api/v1/groups`.
   - Kích thước component giảm từ **~600 dòng xuống chỉ còn ~210 dòng**, tốc độ mở modal tức thì, thao tác ghi chép hoàn tất chỉ trong 3 giây.

2. **Tab "Chi tiêu nhóm" (`ExpenseModal.tsx`)**:
   - Là trung tâm duy nhất xử lý nghiệp vụ tài chính tập thể của nhóm.
   - Hỗ trợ đầy đủ: **Thành viên trả** (chia đều / tự chọn có công nợ) và **Quỹ chung chi** (không chia nợ, minh bạch 100%).
   - Tự động trừ ví cá nhân khi thành viên chi hộ và hiển thị lên sổ cái cá nhân mà không làm méo mó ngữ cảnh sử dụng.
