# 02 — Quy tắc nghiệp vụ FlowPocket

Tài liệu này là chuẩn cho các phép tính và hành vi nghiệp vụ. Nếu giao diện và backend khác nhau, backend là nơi quyết định tính hợp lệ; frontend phải hiển thị kết quả backend trả về.

## 1. Đơn vị tiền và quy tắc số học

- MVP dùng VND; lưu tiền bằng số nguyên, không dùng `float`/`double`.
- Các trường `amount` phải lớn hơn 0. Loại giao dịch thể hiện dòng tiền vào hay ra; không dùng số âm để ngầm diễn tả loại giao dịch.
- Dùng một quy tắc làm tròn duy nhất và ghi rõ trong code. Vì MVP dùng VND nguyên, khoản chia tự động có dư phải phân bổ phần dư một cách xác định, không được làm mất hoặc tạo thêm tiền.
- Mọi phép tính phân bổ phải bảo toàn tổng: tổng tiền các phần chia bằng tổng khoản chi.
- Các thao tác liên quan đến nhiều bảng tài chính phải thực hiện trong một database transaction.

## 2. Tài chính cá nhân

### Ví

Mỗi ví thuộc một user duy nhất. Chỉ chủ ví được đọc/sửa ví và các bản ghi cá nhân liên quan, trừ khi người dùng chủ động tạo dữ liệu nhóm riêng.

Ví có thể có tên, loại ví, số dư ban đầu, tiền tệ và trạng thái hoạt động. Với MVP VND, không cần chuyển đổi ngoại tệ.

### Giao dịch

Tối thiểu phân biệt:

- **Thu nhập:** làm tăng số dư ví và có thể được tính vào báo cáo thu nhập.
- **Chi tiêu cá nhân:** làm giảm số dư ví và được tính vào báo cáo chi tiêu cá nhân.
- **Chuyển tiền giữa ví:** làm giảm ví nguồn và tăng ví đích cùng một số tiền; không phải thu nhập hoặc chi tiêu.
- **Dòng tiền liên quan đến nhóm:** ví dụ thành viên trả tiền hộ nhóm hoặc nhận tiền quyết toán. Những khoản này có thể làm thay đổi số dư tiền mặt thật nhưng phải được phân loại riêng để không bị cộng nhầm thành chi tiêu tiêu dùng cá nhân hoặc thu nhập.
- **Điều chỉnh số dư:** nếu được hỗ trợ, phải có lý do, audit trail và quyền phù hợp; không chỉnh số dư âm thầm.

Số dư hiện tại không phải giá trị do client tùy ý gửi lên. Tùy thiết kế schema, số dư được tính từ số dư đầu kỳ cộng/trừ các dòng ledger hợp lệ hoặc được cập nhật qua một ledger transaction có ràng buộc và cùng transaction database. Không duy trì hai nguồn sự thật độc lập.

### Danh mục và báo cáo

- Giao dịch có thể có danh mục; danh mục hệ thống phân biệt với danh mục riêng của user.
- Danh mục riêng chỉ chủ sở hữu sử dụng/sửa.
- Báo cáo thu nhập và chi tiêu cá nhân loại trừ chuyển tiền giữa ví, đóng góp quỹ chung và các dòng tiền kỹ thuật/nhóm không phải tiêu dùng cá nhân.
- Báo cáo phải nói rõ phạm vi tính toán, chẳng hạn “Chi tiêu cá nhân” khác với “Tổng chi phí nhóm đã tham gia”.

## 3. Tạo nhóm và thành viên

### Vai trò và Phân cấp Quyền hạn

Mỗi nhóm có mô hình phân quyền 3 cấp độ (`GroupRole`):
- **`OWNER` (Chủ nhóm):** Người sáng lập hoặc người nhận chuyển nhượng. Mỗi nhóm luôn có duy nhất một `OWNER` hoạt động tại mọi thời điểm. Có toàn quyền quản trị: thêm/xóa bất kỳ thành viên nào (trừ chính mình), phân quyền Admin/Member, chuyển giao quyền sở hữu (Ownership Transfer), giải tán hoặc cập nhật thông tin nhóm.
- **`ADMIN` (Quản trị viên):** Có quyền mời thành viên mới, xóa thành viên thường (`MEMBER`), quản lý chi tiêu và quỹ chung. Admin không thể xóa `OWNER` hoặc `ADMIN` khác, và không thể tự thăng cấp cho người khác lên `OWNER`.
- **`MEMBER` (Thành viên thường):** Có quyền xem thông tin nhóm, ghi nhận chi tiêu, tham gia vào các khoản chia nợ, đóng góp và rút quỹ. Thành viên chỉ có thể tự rời nhóm (`leave_group`), không thể xóa hoặc sửa quyền của người khác.

### Cơ chế Mời và Tham gia Nhóm

Hỗ trợ 2 phương thức mời linh hoạt:

1. **Thêm trực tiếp bằng Gmail (`add_by_email`):**
   - Áp dụng khi người dùng đã có tài khoản trên hệ thống FlowPocket.
   - `OWNER` hoặc `ADMIN` nhập địa chỉ email của người nhận.
   - Backend xác thực email tồn tại, kiểm tra người dùng chưa phải thành viên nhóm, và tự động tạo bản ghi `GroupMember` với vai trò `MEMBER` ngay lập tức mà không cần xác nhận qua token.

2. **Liên kết mời công khai đa dụng (Multi-use Invite Link):**
   - Phục vụ việc chia sẻ link vào nhóm chat (Zalo, Messenger, Telegram) để nhiều thành viên cùng tham gia.
   - Token ngẫu nhiên cryptographically secure (`secrets.token_urlsafe(32)`), database chỉ lưu hàm băm SHA-256 (`token_hash`) để đảm bảo an toàn tuyệt đối ngay cả khi lộ database snapshot.
   - Hỗ trợ cờ `reusable = True` cho phép một liên kết được sử dụng bởi nhiều tài khoản khác nhau cho đến khi hết hạn (`expires_at`) hoặc bị Chủ nhóm/Admin chủ động thu hồi (`is_revoked = True`).
   - Trải nghiệm thông minh trên Frontend: Link mời dạng `https://app.flowpocket.vn/?join_token=XYZ` sẽ tự động mở modal tham gia nhóm và điền sẵn mã mời. Nếu người dùng chưa đăng nhập, mã mời được lưu tạm vào `sessionStorage` và tự động kích hoạt sau khi đăng nhập thành công.

### Quy tắc Xóa Thành viên và Bảo toàn Sổ cái Tài chính

1. **Ràng buộc phân quyền xóa:**
   - `OWNER` có thể xóa bất kỳ `ADMIN` hoặc `MEMBER`.
   - `ADMIN` chỉ có thể xóa `MEMBER` thường. `ADMIN` không thể xóa `OWNER` hay `ADMIN` khác.
   - Thành viên không thể tự xóa chính mình bằng API xóa thành viên; nếu muốn rút lui phải sử dụng luồng "Rời nhóm" (`leave_group`).
   - `OWNER` không thể rời nhóm nếu chưa thực hiện chuyển giao quyền chủ nhóm (`Ownership Transfer`).

2. **Nguyên tắc bảo toàn sổ cái (Ledger Preservation):**
   - Tuyệt đối **không thực hiện xóa vật lý (hard-delete)** bản ghi thành viên hoặc các giao dịch của họ trong cơ sở dữ liệu.
   - Trạng thái thành viên được cập nhật sang vô hiệu hóa (`status = 'REMOVED'`).
   - Mọi khoản chi tiêu đã chia (`expense_splits`), các khoản đã thanh toán hộ (`GroupExpense.paid_by_member_id`), các giao dịch quỹ (`GroupFundTransaction`) và các quyết toán nợ (`GroupSettlement`) trong quá khứ liên quan đến thành viên này **hoàn toàn được giữ nguyên vẹn**.
   - Thành viên bị xóa sẽ lập tức bị chặn quyền truy cập vào bảng điều khiển nhóm và không xuất hiện trong danh sách lựa chọn người chia tiền cho các khoản chi mới.

### Chuyển giao Quyền Sở hữu (Ownership Transfer)

- `OWNER` hiện tại có thể chỉ định một thành viên (`ADMIN` hoặc `MEMBER`) hoạt động trong nhóm để trở thành `OWNER` mới.
- Thao tác này được thực thi trong một database transaction duy nhất:
  - Cập nhật thành viên được chỉ định thành `OWNER`.
  - Cập nhật `OWNER` cũ trở thành `ADMIN` để tiếp tục tham gia sinh hoạt cùng nhóm.
  - Cập nhật trường `created_by_user_id` của nhóm sang chủ sở hữu mới nếu cần đồng bộ quyền quản trị cấp cao.

## 4. Chi phí nhóm

Một khoản chi nhóm tối thiểu gồm: nhóm, tiêu đề, tổng tiền, ngày chi, người tạo, nguồn thanh toán, trạng thái và danh sách phần chia.

### Nguồn thanh toán

1. **Thành viên tự trả (`MEMBER`)**: một thành viên thực tế thanh toán khoản chi. Đây là nguồn dữ liệu để tính công nợ giữa các thành viên.
2. **Quỹ nhóm trả (`FUND`)**: tiền được rút từ quỹ chung của nhóm. Ghi nhận dòng tiền ra của quỹ, nhưng không tạo nợ cá nhân giữa các thành viên chỉ vì khoản chi được phân bổ cho báo cáo tiêu dùng.

Mỗi khoản chi chỉ được có một nguồn thanh toán tại thời điểm ghi nhận: thành viên **hoặc** quỹ, không phải đồng thời cả hai.

### Phần chia (`splits`)

Hỗ trợ:

- `EQUAL`: chia đều cho các thành viên đã chọn; hệ thống xử lý phần dư có tính xác định.
- `CUSTOM`: người tạo nhập phần tiền cụ thể từng thành viên chịu.

Ràng buộc:

- Mỗi thành viên được chia phải thuộc nhóm ở thời điểm khoản chi được đăng.
- Không cho một thành viên xuất hiện lặp trong danh sách phần chia của cùng khoản chi.
- Tất cả amount phải hợp lệ và không âm; nếu schema dùng `amount > 0` thì người không chịu phần chi phải được bỏ khỏi danh sách thay vì có split 0.
- Tổng phần chia phải bằng tổng khoản chi.
- Kiểm tra lại ở backend; không tin tổng do frontend tính.

### Trạng thái chi phí

- `DRAFT`: đang soạn; có thể chỉnh sửa/hủy theo quyền.
- `POSTED`: chính thức, được dùng trong báo cáo, quỹ và công nợ.
- `VOID`: đã vô hiệu hóa; không tính trong số dư/công nợ, nhưng vẫn giữ audit trail và lý do.

MVP có thể đơn giản hóa bằng cách chỉ tạo khoản chi ở trạng thái `POSTED`, nhưng nếu hỗ trợ sửa khoản chi đã đăng thì cần quy tắc audit rõ ràng. Không xóa cứng một khoản chi đã được dùng để tính toán công nợ. Mọi thay đổi trạng thái phải được xác thực và idempotent.

## 5. Công nợ giữa thành viên

### Ý nghĩa

Với các khoản chi do thành viên tự trả, mỗi thành viên có phần tiền đã trả và phần chi phí được phân bổ cho mình. Số ròng quyết định thành viên đang là người được nhận hay người phải trả.

Đặt:

- `paid(u)` = tổng các khoản chi `POSTED` do thành viên `u` tự trả trong nhóm.
- `share(u)` = tổng phần chia của `u` trên các khoản chi `POSTED` mà nguồn thanh toán là thành viên.
- Trước quyết toán: `net(u) = paid(u) - share(u)`.
- `net(u) > 0`: nhóm đang ghi nhận người đó được nhận lại tiền.
- `net(u) < 0`: người đó còn phải trả ròng.
- `net(u) = 0`: đã cân bằng trước/sau các quyết toán liên quan.

Các khoản chi từ quỹ nhóm **không** được đưa vào `paid(u)` và `share(u)` của công thức nợ thành viên. Chúng có thể xuất hiện trong báo cáo tổng chi và báo cáo phần chi phí được phân bổ, nhưng không tạo ra một khoản nợ thành viên mới.

### Áp dụng quyết toán

Một settlement đã `CONFIRMED` từ `A` sang `B` làm giảm số nợ của `A` đối với `B` và giảm số tiền `B` còn được nhận. Settlement `PENDING`, `REJECTED` hoặc `CANCELLED` không ảnh hưởng đến công nợ đã xác nhận.

Công thức net sau settlement có thể biểu diễn:

`net_after(u) = net_before(u) + confirmed_paid_by_u - confirmed_received_by_u`

Trong đó người trả settlement làm giảm phần tiền ròng của người được nhận? Quy ước triển khai phải đồng nhất: cách an toàn là lưu `from_user_id` là người trả và `to_user_id` là người nhận; khi `CONFIRMED`, giảm khoản phải trả ròng của `from_user_id` và giảm khoản được nhận ròng của `to_user_id` với cùng số tiền. Nếu biểu diễn `net = paid - share`, khi tính net tổng hợp, settlement được cộng vào phía tiền đã trả của người trả và trừ khỏi phía tiền đã nhận của người nhận theo cùng quy ước sổ cái. Phải có test cho ví dụ số cụ thể.

### Không cho quyết toán tùy tiện

- Người gửi phải là thành viên nhóm.
- Người nhận phải là thành viên nhóm khác với người gửi.
- Người nhận là người duy nhất được xác nhận/reject settlement gửi đến mình; Owner/Admin không được tự giả làm người nhận.
- Khi tạo và xác nhận, backend kiểm tra số tiền dương, trạng thái hiện tại và số nợ hợp lệ theo chính sách MVP.
- Hai request đồng thời không được xác nhận cùng settlement hai lần hoặc làm âm công nợ sai quy tắc.
- Việc đổi trạng thái và cập nhật dữ liệu phụ thuộc phải trong một transaction, có kiểm soát concurrent update.

MVP nên tránh tự động tối ưu nhiều cặp chuyển tiền nếu chưa thật cần. Trước tiên cung cấp số dư ròng và cho thành viên ghi nhận thanh toán thực tế.

## 6. Quỹ nhóm

### Giao dịch quỹ

Các loại tối thiểu:

- `CONTRIBUTION`: thành viên đóng góp tiền vào quỹ.
- `EXPENSE`: quỹ chi tiền, thường liên kết một khoản group expense có `payment_source = FUND`.
- `WITHDRAWAL`: rút tiền theo quyền và có lý do.
- `ADJUSTMENT_IN` / `ADJUSTMENT_OUT`: điều chỉnh có audit trail, cần quyền đặc biệt và ghi chú bắt buộc.

Số dư quỹ:

`fund_balance = tổng(CONTRIBUTION, ADJUSTMENT_IN) - tổng(EXPENSE, WITHDRAWAL, ADJUSTMENT_OUT)`

Tất cả dòng tiền phải được tính đúng một lần. Nếu quỹ không đủ tiền thì mặc định từ chối tạo khoản chi từ quỹ, trừ khi có một cấu hình cho phép âm và quy tắc riêng được tài liệu hóa. MVP nên không cho quỹ âm.

### Đóng góp quỹ khác chi tiêu cá nhân

Đóng góp quỹ là tiền chuyển sang quỹ chung, không phải tiêu dùng ngay. Nếu app theo dõi dòng tiền trong ví cá nhân, có thể tạo ledger debit được liên kết với contribution, nhưng phải loại khoản này khỏi báo cáo chi tiêu tiêu dùng để không đếm hai lần khi quỹ chi tiền sau đó.

## 7. Liên kết giao dịch cá nhân với sự kiện nhóm

Khi theo dõi số dư ví thực tế, các sự kiện như thành viên trả chi phí nhóm hoặc nhận settlement có thể cần tạo một dòng ledger liên kết với sự kiện nhóm. Quy tắc:

- Dòng ledger và bản ghi nhóm phải được tạo/cập nhật trong cùng database transaction.
- Sử dụng `source_type` + `source_id` hoặc khóa liên kết có ràng buộc unique để chống tạo trùng.
- `group_expense` người dùng trả làm giảm ví nhưng không tự động biến toàn bộ khoản trả thành chi tiêu tiêu dùng cá nhân; phần chi phí phân bổ của người dùng được thể hiện riêng.
- `settlement` nhận tiền làm tăng ví nhưng không tự động biến thành thu nhập.
- Nếu MVP chưa đồng bộ tự động dòng ledger, phải ghi rõ trên giao diện là số dư ví chỉ phản ánh các giao dịch người dùng đã nhập, tránh tạo cảm giác dữ liệu đã tự đồng bộ.

## 8. Xử lý lỗi, tính nguyên tử và chống gửi trùng

- Tạo khoản chi + các split + giao dịch quỹ (nếu có) là một thao tác nguyên tử.
- Xác nhận settlement + các dòng ledger đi kèm là một thao tác nguyên tử.
- Chống double-submit bằng idempotency key hoặc cập nhật trạng thái có điều kiện; không chỉ dựa vào việc frontend disable nút.
- Các tổng quan được tính từ bản ghi có trạng thái được tính vào báo cáo; không tính draft/void.
- API trả lỗi nghiệp vụ dễ hiểu và không để lại dữ liệu nửa chừng.

## 9. Ví dụ nghiệm thu bắt buộc

### Ví dụ A — Một người trả chi phí nhóm

Nhóm A có ba người: Lan, Minh, Huy. Lan trả 300.000 VND cho một bữa ăn, chia đều ba người: mỗi người chịu 100.000 VND.

Trước quyết toán: Lan đã trả 300.000 và chịu phần 100.000 → được nhận ròng 200.000; Minh nợ 100.000; Huy nợ 100.000. Nếu Minh xác nhận đã trả Lan 100.000 và Huy xác nhận đã trả Lan 100.000, công nợ của khoản này về 0.

### Ví dụ B — Quỹ nhóm thanh toán

Quỹ có 500.000 VND. Nhóm chi 300.000 VND từ quỹ và phân bổ để báo cáo mỗi người chịu 100.000 VND. Quỹ còn 200.000 VND. Khoản chi này không làm phát sinh nợ Lan/Minh/Huy cho nhau; báo cáo nhóm có thể vẫn hiển thị chi phí phân bổ để biết ai tiêu dùng bao nhiêu.

### Ví dụ C — Chuyển tiền giữa ví cá nhân

Người dùng chuyển 200.000 VND từ ví tiền mặt sang ví ngân hàng. Ví tiền mặt giảm 200.000, ví ngân hàng tăng 200.000; tổng tài sản tiền mặt của hai ví không đổi. Báo cáo chi tiêu cá nhân không cộng 200.000 này.

### Ví dụ D — Đóng góp quỹ

Minh đóng góp 100.000 VND vào quỹ. Số dư ví của Minh giảm 100.000 và quỹ tăng 100.000 nếu app đồng bộ cả hai sổ. Khoản này không được tính là chi tiêu tiêu dùng của Minh và không làm công nợ của Minh đối với thành viên khác thay đổi.
