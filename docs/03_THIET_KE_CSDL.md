# 03 — Thiết kế cơ sở dữ liệu FlowPocket

Đây là mô hình logic ban đầu. Agent cần chuyển thành SQLAlchemy models, constraints và Alembic migrations, đồng thời kiểm tra tính nhất quán với repository. Không xem tài liệu này là lý do để tạo mọi tính năng ngoài MVP.

## 1. Quy ước chung

- Primary key ưu tiên UUID.
- Có `created_at` và `updated_at` ở các bảng cần chỉnh sửa; dùng timezone-aware timestamps.
- Dùng foreign key có chủ đích, unique constraints, `CHECK` constraints và index phục vụ truy vấn thường xuyên.
- Dữ liệu tiền lưu bằng số nguyên (ví dụ `BIGINT`), `amount > 0` và loại giao dịch quyết định chiều.
- Không dùng cascade delete mù quáng với dữ liệu đã phát sinh giao dịch; ưu tiên archive/status và giữ audit trail.
- Tên cột và enum thống nhất, nhất quán giữa model, migration, schema và API.
- Mọi bảng có chứa dữ liệu nhóm phải có đường xác minh quan hệ group/membership dễ kiểm tra.

## 2. Bảng tài khoản và phiên đăng nhập

### `app_users`

Trường đề xuất:

- `id` UUID PK
- `email` đã chuẩn hóa, unique
- `display_name`
- `password_hash`
- `status` (ví dụ `ACTIVE`, `LOCKED`, `DISABLED`)
- `email_verified_at` nullable nếu có xác minh email
- `created_at`, `updated_at`

Không lưu mật khẩu dạng plain text, không trả `password_hash` qua API.

### `auth_sessions`

- `id` UUID PK
- `user_id` FK → `app_users.id`
- `token_hash` unique — chỉ hash/digest của cookie token, không token thô
- `created_at`, `expires_at`, `last_seen_at`
- `revoked_at` nullable
- metadata tối thiểu như `user_agent_summary` hoặc `ip_prefix` nếu thực sự cần; không thu thập quá mức

Index tối thiểu theo `user_id`, `expires_at` và `token_hash`. Session hết hạn/đã revoke không được xác thực.

## 3. Tài chính cá nhân

### `wallets`

- `id` UUID PK
- `owner_user_id` FK → `app_users.id`
- `name`
- `wallet_type` (cash, bank, e-wallet, other hoặc enum tương đương)
- `currency` mặc định `VND`
- `opening_balance` BIGINT, theo quy ước có thể cho phép âm/dương nhưng phải thống nhất
- `is_archived`
- timestamps

Cân nhắc unique `(id, owner_user_id)` để có thể tạo composite FK từ giao dịch, bảo vệ nhất quán chủ ví ở tầng DB.

### `categories`

- `id` UUID PK
- `owner_user_id` nullable: `NULL` cho danh mục hệ thống, có giá trị cho danh mục riêng
- `name`
- `kind` (`INCOME`, `EXPENSE` hoặc loại phù hợp)
- `icon_key` nullable
- `is_archived`
- timestamps

Cần quy tắc phân biệt danh mục hệ thống và danh mục cá nhân; không cho user sửa/xóa danh mục hệ thống.

### `wallet_transactions`

Ledger dòng tiền của ví. Thiết kế loại giao dịch tối thiểu có thể gồm:

- `id` UUID PK
- `owner_user_id` FK → `app_users.id`
- `wallet_id` FK → `wallets.id`
- `transaction_type`: `INCOME`, `EXPENSE`, `TRANSFER_IN`, `TRANSFER_OUT`, `GROUP_EXPENSE_PAYMENT`, `GROUP_SETTLEMENT`, `FUND_CONTRIBUTION`, `ADJUSTMENT` (có thể tách enum phù hợp)
- `amount` BIGINT `CHECK (amount > 0)`
- `category_id` nullable FK → `categories.id`
- `description` nullable
- `transaction_date`
- `transfer_group_id` nullable để liên kết hai dòng chuyển tiền
- `source_type` và `source_id` nullable để liên kết với sự kiện nhóm
- `include_in_personal_income_report` / `include_in_personal_expense_report`, hoặc một quy tắc tính từ `transaction_type` đủ rõ và dễ test
- timestamps

Ràng buộc cần xem xét:

- `wallet_id` phải thuộc cùng `owner_user_id` với giao dịch.
- Không cho danh mục của user khác bị gắn vào transaction.
- Với chuyển tiền, hai dòng `TRANSFER_OUT`/`TRANSFER_IN` phải được tạo cùng một DB transaction, cùng `transfer_group_id`, cùng amount, khác ví và cùng chủ ví; tổng thay đổi của nhóm ví phải bằng 0.
- `(source_type, source_id, transaction_type)` hoặc khóa liên kết tương đương cần unique phù hợp để ngăn tạo ledger hai lần cho cùng sự kiện.
- Cần quyết định rõ các sự kiện nhóm nào mirror sang wallet ledger; không vừa ghi ledger thủ công vừa ghi tự động trùng nhau.

Nếu agent chọn cấu trúc tách `wallet_transfers` khỏi ledger hoặc dùng ledger khác, phải giữ nguyên các bất biến nghiệp vụ và mô tả lại trong ADR; không tự ý đơn giản hóa theo cách làm báo cáo đếm hai lần.

## 4. Nhóm, thành viên và lời mời

### `finance_groups`

- `id` UUID PK
- `name`
- `description` nullable
- `created_by_user_id` FK → `app_users.id`
- `status` (`ACTIVE`, `ARCHIVED`)
- timestamps

### `group_members`

- `id` UUID PK
- `group_id` FK → `finance_groups.id`
- `user_id` FK → `app_users.id`
- `role` (`OWNER`, `ADMIN`, `MEMBER`)
- `status` (`ACTIVE`, `LEFT`, `REMOVED`)
- `joined_at`, `left_at` nullable
- unique/partial unique đảm bảo không có membership hoạt động trùng `(group_id, user_id)`

**Ngữ nghĩa nghiệp vụ của `status` và Bảo toàn Sổ cái (Ledger Preservation):**
- `ACTIVE`: Thành viên đang hoạt động trong nhóm, tham gia chia tiền, nạp/rút quỹ và tạo chi phí.
- `LEFT`: Thành viên chủ động rời nhóm (yêu cầu không phải là `OWNER`).
- `REMOVED`: Thành viên bị `OWNER` hoặc `ADMIN` loại khỏi nhóm.
- **Ràng buộc an toàn:** Hệ thống **tuyệt đối không xóa vật lý (hard-delete)** bản ghi `group_members` vì nó liên kết mật thiết tới các bản ghi tài chính lịch sử (`GroupExpense.paid_by_member_id`, `ExpenseSplit.member_id`, `GroupSettlement`). Khi chuyển sang `REMOVED`, người dùng bị chặn toàn bộ quyền xem/sửa dữ liệu nhóm mới nhưng các con số công nợ và chi tiêu quá khứ vẫn giữ nguyên vẹn 100%.
- **Chuyển giao quyền sở hữu:** Một nhóm chỉ có đúng một `OWNER` tại một thời điểm. Khi `OWNER` chuyển quyền cho người khác, role của chủ nhóm cũ tự động chuyển thành `ADMIN` trong cùng database transaction.

### `group_invitations`

- `id` UUID PK
- `group_id` FK → `finance_groups.id`
- `created_by_user_id` FK → `app_users.id`
- `invited_email` nullable (dùng để phân biệt 2 loại lời mời)
- `token_hash` String(64) SHA-256 unique
- `expires_at` TIMESTAMP WITH TIME ZONE
- `accepted_at`, `revoked_at` nullable
- `accepted_by_user_id` nullable FK → `app_users.id`
- timestamps

**Phân loại Lời mời & Thêm Thành viên:**
1. **Link công khai đa dụng (`invited_email IS NULL`):** Cho phép chia sẻ vào nhóm chat (Zalo/Telegram). Nhiều thành viên có thể sử dụng cùng 1 link cho đến khi hết hạn (`expires_at`) hoặc bị thu hồi (`revoked_at`). Khi một người tham gia, bản ghi invitation không bị khóa (`accepted_at` không chặn người tiếp theo).
2. **Lời mời riêng biệt (`invited_email IS NOT NULL`):** Chỉ dùng được đúng 1 lần cho tài khoản có email trùng khớp (`accepted_at` được gán ngay khi tham gia thành công).
3. **Thêm trực tiếp bằng Gmail (`POST /api/v1/groups/{id}/members/add-by-email`):** Thêm thành viên trực tiếp vào `group_members` mà không cần sinh token trung gian.

Không lưu invitation token thô. Chỉ trả token cho người mời một lần khi tạo link; endpoint xác nhận kiểm tra hash bằng SHA-256, kiểm tra hạn và trạng thái thu hồi.

## 5. Chi phí và phần chia

### `group_expenses`

- `id` UUID PK
- `group_id` FK → `finance_groups.id`
- `title`, `note` nullable
- `total_amount` BIGINT `CHECK (total_amount > 0)`
- `expense_date`
- `payment_source` (`MEMBER`, `FUND`)
- `paid_by_user_id` nullable FK → `app_users.id`
- `fund_id` nullable FK → `group_funds.id`
- `payer_wallet_id` nullable FK → `wallets.id` nếu tích hợp ví cá nhân
- `split_method` (`EQUAL`, `CUSTOM`)
- `status` (`DRAFT`, `POSTED`, `VOID`)
- `created_by_user_id` FK → `app_users.id`
- `void_reason` nullable
- timestamps

Các bất biến:

- Khi `payment_source = MEMBER`, `paid_by_user_id` phải có giá trị hợp lệ là thành viên của chính nhóm và `fund_id` phải null.
- Khi `payment_source = FUND`, `fund_id` phải thuộc chính nhóm và `paid_by_user_id` phải null. Nếu có payer_wallet_id thì cần định nghĩa rõ ý nghĩa, tránh xung đột nguồn thanh toán.
- Nếu gắn `payer_wallet_id`, ví phải thuộc người trả tương ứng.
- Chi phí `POSTED` phải có split hoàn chỉnh và chỉ được tính một lần vào báo cáo/công nợ.

### `group_expense_splits`

- `id` UUID PK
- `expense_id` FK → `group_expenses.id`
- `member_user_id` FK → `app_users.id`
- `amount_owed` BIGINT (thường `CHECK (amount_owed > 0)`)
- unique `(expense_id, member_user_id)`
- timestamps nếu cần audit sửa đổi

Đảm bảo người được chia là thành viên hợp lệ của nhóm tại thời điểm post. Có thể kiểm tra ở service transaction; nếu cần ràng buộc DB sâu hơn, cân nhắc schema và composite FK. Tổng splits bằng total phải được kiểm tra trước khi `POSTED` và bao phủ bằng test.

## 6. Quỹ và lịch sử giao dịch quỹ

### `group_funds`

- `id` UUID PK
- `group_id` FK → `finance_groups.id`
- `name`
- `description` nullable
- `status` (`ACTIVE`, `ARCHIVED`)
- timestamps

### `group_fund_transactions`

- `id` UUID PK
- `fund_id` FK → `group_funds.id`
- `transaction_type` (`CONTRIBUTION`, `EXPENSE`, `WITHDRAWAL`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`)
- `amount` BIGINT `CHECK (amount > 0)`
- `contributed_by_user_id` nullable FK → `app_users.id`
- `created_by_user_id` FK → `app_users.id`
- `group_expense_id` nullable FK → `group_expenses.id`
- `description` / `reason`
- `transaction_date`
- timestamps

Nếu `transaction_type = EXPENSE` xuất phát từ khoản chi từ quỹ, cần một liên kết unique thích hợp để cùng khoản chi không trừ quỹ nhiều lần. Không cho số dư quỹ âm trong MVP. Balance tính từ lịch sử hoặc từ projection có cơ chế cập nhật nguyên tử và đối soát.

## 7. Quyết toán

### `group_settlements`

- `id` UUID PK
- `group_id` FK → `finance_groups.id`
- `from_user_id` FK → `app_users.id` (người trả)
- `to_user_id` FK → `app_users.id` (người nhận)
- `amount` BIGINT `CHECK (amount > 0)`
- `status` (`PENDING`, `CONFIRMED`, `REJECTED`, `CANCELLED`)
- `note` nullable
- `created_at`, `confirmed_at`, `rejected_at`, `cancelled_at` nullable
- audit actor/timestamps phù hợp

Bất biến:

- `from_user_id != to_user_id`.
- Cả hai là thành viên nhóm ở thời điểm thao tác hợp lệ.
- Chỉ người nhận xác nhận/reject settlement đang gửi đến mình.
- Chuyển trạng thái hợp lệ theo state machine; không thể `CONFIRMED` lại, xác nhận khoản đã `CANCELLED`, hoặc xác nhận khi không còn phù hợp chính sách công nợ.
- Settlement đã xác nhận không được xóa cứng; nếu xử lý nhầm cần một bản ghi đảo/điều chỉnh có audit trail thay vì sửa lịch sử âm thầm.

## 8. Audit và bảo vệ dữ liệu

MVP tối thiểu cần giữ lịch sử thời gian và người tạo/cập nhật ở các bản ghi quan trọng. Có thể dùng `audit_events` cho hành vi nhạy cảm nếu không thể suy ra từ trạng thái bản ghi:

- đổi role, chuyển Owner, loại thành viên
- post/void chi phí
- rút/điều chỉnh quỹ
- xác nhận/hủy quyết toán

Không ghi payload nhạy cảm quá mức vào audit log. Nếu có log sự kiện, lưu actor, loại sự kiện, entity, thời gian và các metadata cần thiết; tránh lưu token hoặc dữ liệu đăng nhập.

## 9. Index gợi ý

Tùy query thực tế, cân nhắc index:

- `app_users(email)` unique
- `auth_sessions(token_hash)` unique, `auth_sessions(user_id, expires_at)`
- `wallets(owner_user_id, is_archived)`
- `wallet_transactions(owner_user_id, transaction_date)`, `(wallet_id, transaction_date)`, `(source_type, source_id)` unique phù hợp
- `group_members(group_id, status)`, `(user_id, status)`
- `group_invitations(token_hash)` unique, `(group_id, expires_at)`
- `group_expenses(group_id, expense_date, status)`
- `group_expense_splits(expense_id)`, `(member_user_id, expense_id)`
- `group_fund_transactions(fund_id, transaction_date)`
- `group_settlements(group_id, status, created_at)`

Tránh thêm index đại trà mà không có lý do. Migration phải được kiểm tra trên database sạch.

## 10. Câu hỏi cần ghi thành quyết định kỹ thuật khi triển khai

Nếu agent cần chọn giữa các cách triển khai, phải ghi kết quả vào `docs/ADR/` hoặc mục quyết định trong README:

1. Số dư ví được tính trực tiếp từ ledger hay có cột projection được cập nhật trong transaction?
2. Chi phí nhóm do thành viên trả có tự động tạo wallet ledger hay MVP để người dùng nhập riêng?
3. Cơ chế session/cookie/CSRF và domain triển khai cụ thể.
4. Cách lưu audit cho chỉnh sửa/void bản ghi tài chính.
5. Chính sách khi thành viên rời nhóm nhưng còn công nợ chưa quyết toán.
