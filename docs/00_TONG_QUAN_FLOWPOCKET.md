# 00 — Tổng quan sản phẩm FlowPocket

## 1. Ý tưởng

**FlowPocket** là ứng dụng quản lý tiền cá nhân kết hợp quản lý chi tiêu nhóm. Người dùng có thể theo dõi ví và giao dịch riêng, đồng thời tham gia các nhóm để ghi nhận chi phí chung, chia tiền, quản lý quỹ và đối soát công nợ.

Mục tiêu là giúp người dùng trả lời nhanh ba câu hỏi:

1. Tiền cá nhân đang ở đâu và đã thu/chi thế nào?
2. Trong một nhóm, ai đã trả, mỗi người chịu phần bao nhiêu?
3. Sau khi tính các khoản chi và các lần hoàn tiền đã xác nhận, ai còn phải trả cho ai bao nhiêu?

## 2. Nguyên tắc sản phẩm

### Riêng tư trước tiên

Ví và giao dịch cá nhân mặc định chỉ chủ sở hữu xem được. Thành viên nhóm chỉ được xem dữ liệu được tạo trong nhóm đó và được phép chia sẻ cho nhóm. Tham gia một nhóm **không** đồng nghĩa với việc các thành viên khác được xem toàn bộ tài chính cá nhân.

### Nguồn dữ liệu minh bạch

Số dư, tổng chi, công nợ và số dư quỹ phải được tính từ các bản ghi tài chính có liên quan. Không để frontend tự tính rồi ghi đè số dư tổng hợp vào database như dữ liệu gốc.

### Không tính tiền hai lần

Một khoản chi nhóm có thể làm giảm tiền trong ví của người trả, nhưng không được tự động tính toàn bộ khoản đó thành chi tiêu cá nhân của người trả. Phần tiêu dùng được phân bổ của từng thành viên, dòng tiền thực tế và công nợ là các khái niệm khác nhau; giao diện/báo cáo phải phân biệt chúng.

### MVP rõ ràng, không triển khai quá tay

Ưu tiên một backend FastAPI dạng modular monolith. Không cần microservices, event broker, Kubernetes hoặc đồng bộ offline phức tạp ở giai đoạn đầu.

## 3. Nhóm tính năng

### Tài chính cá nhân

- Tài khoản người dùng.
- Ví/tài khoản tiền mặt hoặc tài khoản tự đặt tên.
- Ghi nhận thu nhập, chi tiêu và chuyển tiền giữa các ví.
- Danh mục thu/chi; người dùng có thể có danh mục riêng.
- Lọc theo thời gian, ví, danh mục và loại giao dịch.
- Báo cáo tổng hợp theo ngày/tháng và theo danh mục.
- Phân biệt giao dịch cá nhân với dòng tiền phát sinh từ chi tiêu nhóm hoặc quyết toán nhóm.

### Nhóm tài chính

- Tạo nhóm, đổi tên và cấu hình cơ bản.
- Mời thành viên linh hoạt:
  - Mời trực tiếp qua địa chỉ Gmail của tài khoản đã đăng ký.
  - Tạo liên kết mời công khai đa dụng (`?join_token=...`) chia sẻ cho nhiều người tham gia cùng lúc.
- Role: `OWNER`, `ADMIN`, `MEMBER`.
- Quản trị thành viên: chuyển giao quyền chủ nhóm (Ownership Transfer), thăng/hạ cấp Admin/Member, xóa thành viên an toàn (giữ nguyên sổ cái tài chính lịch sử).
- Ghi nhận chi phí nhóm, người thanh toán và cách chia.
- Chia đều hoặc nhập số tiền từng người chịu.
- Xem tổng chi, phần mỗi thành viên chịu và số tiền đang nợ/được nhận.
- Tạo yêu cầu quyết toán và để người nhận xác nhận; tích hợp tạo mã VietQR Napas chuyển khoản nhanh.

### Quỹ chung

- Tạo quỹ của nhóm.
- Ghi nhận đóng góp, khoản chi từ quỹ và điều chỉnh có lý do.
- Hiển thị số dư quỹ và lịch sử giao dịch.
- Khoản chi từ quỹ được phân loại riêng, không tạo khoản nợ giữa các thành viên chỉ vì bản thân quỹ đã thanh toán.

### PWA & Trải nghiệm Thông minh

- Giao diện responsive trên điện thoại và desktop.
- Có manifest và biểu tượng để cài đặt khi trình duyệt hỗ trợ.
- Ô nhập tiền tệ thông minh (`MoneyInput`) tự động định dạng hàng nghìn, phím tắt `+000`, `+50k` và đọc tiền thành chữ tiếng Việt.
- Tích hợp sinh mã VietQR Napas chuẩn ngân hàng kèm số tiền và nội dung chuyển khoản tự động.
- Có trạng thái tải, lỗi, rỗng và xác nhận cho các thao tác tài chính.
- MVP online-first: có thể cache các tài nguyên tĩnh phù hợp, nhưng không cache response API chứa dữ liệu tài chính nhạy cảm và không cho phép tạo giao dịch offline.

## 4. Không thuộc phạm vi MVP

Trừ khi repository đã có nền tảng tốt và việc bổ sung không làm ảnh hưởng MVP, chưa triển khai:

- Kết nối Open Banking đọc tự động biến động số dư SMS từ ngân hàng (hiện tại hỗ trợ sinh mã VietQR để người dùng quét và chuyển tiền thủ công an toàn).
- Cổng thanh toán tự động khấu trừ thẻ tín dụng quốc tế / Payment Gateway trung gian.
- Đầu tư, chứng khoán, tiền mã hóa, khoản vay có lãi hoặc nghiệp vụ kế toán doanh nghiệp.
- Đồng bộ giao dịch offline có xử lý xung đột.
- Microservices, hệ thống phân tán hoặc nhiều database.
- Chia sẻ công khai tài chính cá nhân.

## 5. Vai trò người dùng

- **Chủ tài khoản:** quản lý thông tin đăng nhập, ví và giao dịch cá nhân của chính mình.
- **Owner của nhóm:** quản lý nhóm, role và các thiết lập quan trọng.
- **Admin:** quản lý thành viên và dữ liệu nhóm trong phạm vi được cấp.
- **Member:** xem nội dung nhóm, tạo khoản chi theo quyền, xem công nợ và thực hiện các thao tác quyết toán hợp lệ.

Một người có thể là Owner ở một nhóm và Member ở nhóm khác. Quyền phải được đánh giá theo từng nhóm, không phải quyền toàn cục.

## 6. Ngôn ngữ tiền tệ và thời gian

- MVP ưu tiên VND.
- Lưu số tiền bằng số nguyên (`BIGINT` hoặc kiểu số nguyên phù hợp), luôn dương cho trường `amount`; ý nghĩa tăng/giảm thể hiện qua loại giao dịch.
- Thời điểm hệ thống lưu bằng timestamp có timezone; ngày nghiệp vụ như ngày chi tiêu được lưu theo kiểu ngày hoặc chuẩn nhất quán và hiển thị theo múi giờ của người dùng/nhóm.
- Không dùng `float`/`double` để lưu hoặc tính tiền.

## 7. Điều kiện thành công

Một người dùng có thể hoàn thành luồng chính mà không cần thao tác database thủ công: đăng nhập → tạo ví → ghi nhận giao dịch; tạo nhóm → mời thành viên → thêm chi phí → chia chi phí → xem công nợ → tạo/yêu cầu xác nhận quyết toán. Dữ liệu cá nhân không được lộ qua API của nhóm khác và các số tổng hợp phải nhất quán với bản ghi gốc.
