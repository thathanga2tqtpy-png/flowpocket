# 04 — Mô hình bảo mật và phân quyền

Đây là yêu cầu bắt buộc, không phải phần tối ưu có thể bỏ qua để “làm chạy trước”. FlowPocket lưu tài chính cá nhân và công nợ nhóm; lỗi phân quyền có thể làm lộ dữ liệu riêng tư hoặc tạo ra giao dịch sai.

## 1. Nguyên tắc bảo mật

1. **Deny by default:** không có quyền rõ ràng thì từ chối.
2. **Backend là điểm cưỡng chế quyền:** không tin role, user ID, group membership, số tiền hoặc trạng thái do frontend khai báo.
3. **Quyền tối thiểu:** user chỉ có quyền cần thiết cho tác vụ.
4. **Private by default:** thông tin tài chính cá nhân không được chia sẻ tự động khi tham gia nhóm.
5. **Tính nguyên tử:** thay đổi tài chính nhiều bảng phải được commit/rollback cùng nhau.
6. **Audit được:** không xóa hoặc sửa âm thầm lịch sử đã ảnh hưởng số dư/công nợ.
7. **Không lộ chi tiết nhạy cảm trong lỗi, log hoặc cache.**

## 2. Ma trận quyền dự kiến

Ma trận dưới đây là mặc định ban đầu; các endpoint phải thực thi chính sách tương đương ở backend.

| Tài nguyên/hành động | Chủ dữ liệu/Owner | Admin | Member | Người ngoài nhóm |
|---|---|---|---|---|
| Xem/sửa ví cá nhân của mình | Có | Có | Có | Không áp dụng |
| Xem ví/giao dịch cá nhân của user khác | Không, trừ luồng chia sẻ riêng được định nghĩa rõ | Không | Không | Không |
| Xem nội dung nhóm đang tham gia | Có | Có | Có | Không |
| Quản lý tên/cấu hình nhóm | Có | Theo chính sách | Hạn chế | Không |
| Mời thành viên | Có | Có theo chính sách | Có thể được giới hạn | Không |
| Gán Admin/chuyển Owner | Có | Không | Không | Không |
| Tạo khoản chi nhóm | Có | Có | Có theo chính sách nhóm | Không |
| Void khoản chi đã post | Có quyền đặc biệt/audit | Theo chính sách/audit | Không mặc định | Không |
| Điều chỉnh/rút quỹ | Có hoặc quyền được cấp riêng | Theo chính sách | Không mặc định | Không |
| Xác nhận settlement gửi đến mình | Nếu là người nhận | Nếu là người nhận | Nếu là người nhận | Không |
| Xác nhận settlement thay user khác | Không | Không | Không | Không |

Nếu cần khác biệt, phải cập nhật cả tài liệu, service authorization và test. Không tạo ngoại lệ ngầm chỉ cho UI.

## 3. Kiểm tra quyền trên từng request

Mỗi endpoint bảo vệ cần xác minh tối thiểu:

1. Session hợp lệ, chưa hết hạn và chưa bị thu hồi.
2. Tài nguyên có tồn tại trong phạm vi người gọi được biết/xem.
3. Nếu là tài nguyên nhóm: membership đang hoạt động và role phù hợp.
4. Nếu thao tác trên đối tượng con (expense, split, fund transaction, settlement), đối tượng con thực sự thuộc nhóm mà user được truy cập.
5. Các liên kết chéo (ví thuộc user nào, fund thuộc group nào, thành viên thuộc group nào, category thuộc user nào) không bị giả mạo qua ID do client gửi.
6. Trạng thái hiện tại cho phép hành động đó.

Không chỉ bảo vệ route danh sách. Endpoint xem chi tiết, sửa, xóa/void, export, tạo liên kết, đếm tổng, tìm kiếm và các route phụ đều phải kiểm tra quyền.

## 4. Xác thực và phiên đăng nhập

### Mật khẩu

- Băm bằng Argon2id qua thư viện đáng tin cậy.
- Không lưu mật khẩu gốc, không tự thiết kế thuật toán mã hóa/hash.
- Thông báo đăng nhập không nên xác nhận email có tồn tại hay không.
- Thêm rate limit/backoff phù hợp cho đăng nhập, đăng ký, reset mật khẩu và đổi mật khẩu.
- Không log password, cookie hoặc token.

### Session cookie

Khuyến nghị dùng token phiên ngẫu nhiên từ backend và cookie `HttpOnly`:

- Cookie không đọc được bằng JavaScript.
- `Secure` bật ở production HTTPS.
- `SameSite` chọn phù hợp mô hình domain; không dùng cấu hình rộng hơn cần thiết.
- Token thô chỉ xuất hiện trong cookie một lần; database lưu `token_hash`/digest.
- Có thời hạn, logout revoke session và chức năng thu hồi tất cả phiên của user.
- Khi xoay/refresh phiên, token cũ phải mất hiệu lực theo một quy trình rõ ràng.
- Với auth bằng cookie, triển khai CSRF protection cho request thay đổi trạng thái; kiểm tra `Origin`/`Referer` theo chính sách, và dùng CSRF token khi phù hợp.
- CORS chỉ cho phép các origin được cấu hình; không kết hợp wildcard origin với credentialed requests.

Không lưu token dài hạn trong `localStorage`. Không để `APP_SECRET_KEY`, password database hoặc khóa ký trong biến `NEXT_PUBLIC_*`.

## 5. Bảo mật lời mời nhóm

- Token đủ ngẫu nhiên, khó dò; DB chỉ lưu hash.
- Có expiration và revoke.
- Chấp nhận một lần, xử lý đồng thời chống dùng lại token.
- Không đưa token vào analytics, error tracking hoặc log.
- Trang preview link mời không được vô tình làm lộ token qua referrer tới bên thứ ba.
- Khi user chấp nhận lời mời, backend kiểm tra tài khoản/địa chỉ được mời (nếu lời mời giới hạn email) và không cho tự nâng role.

## 6. Bảo vệ dữ liệu tài chính

- Dùng SQLAlchemy parameterized query/ORM; không nối chuỗi từ user input thành SQL.
- Validate amount, trạng thái enum, ngày, danh mục và quan hệ trước khi ghi.
- Các trường tiền có check constraints và các tổng phải kiểm tra lại trong transaction.
- Chống race condition với row lock/transaction isolation hoặc cập nhật có điều kiện ở nơi cần thiết, nhất là xác nhận settlement và trừ số dư quỹ.
- Có idempotency cho thao tác dễ bị gửi lặp hoặc cập nhật state machine.
- Hạn chế export dữ liệu; nếu có export, áp dụng quyền giống dữ liệu nguồn.
- Không lưu thông tin ngân hàng đầy đủ nếu không cần cho MVP.

## 7. Cache, PWA và trình duyệt

- Không cache response `/api/*` có dữ liệu cá nhân hoặc dữ liệu nhóm trong service worker/cache công khai.
- Không đưa dữ liệu tài chính nhạy cảm vào `localStorage`, URL query string, analytics hoặc error logs.
- Có thể cache asset tĩnh, icon, font và app shell; không mặc định offline transaction.
- Khi logout, xóa dữ liệu UI/session trong bộ nhớ và không để một user khác dùng chung trình duyệt nhìn thấy dữ liệu user trước.
- Dùng HTTPS ở production, thiết lập security headers và Content Security Policy phù hợp với stack.

## 8. Cấu hình, secret và database

- `.env` và secret không được commit.
- `.env.example` chỉ có placeholder, không có secret thật.
- Database production không mở port công khai; giới hạn mạng truy cập.
- Tài khoản database của app có quyền tối thiểu cần thiết. Không chạy ứng dụng bằng superuser PostgreSQL.
- Dùng migrations để cập nhật schema; hạn chế chỉnh schema trực tiếp ngoài quy trình.
- Có backup định kỳ và test restore. Mã hóa backup khi lưu/truyền nếu môi trường triển khai hỗ trợ.
- Không lưu mật khẩu backup hay thông tin DB trong issue, tài liệu chia sẻ công khai hoặc prompt của agent.

## 9. Lỗi và logging

- Không trả stack trace, query SQL, nội dung session hoặc secret cho frontend ở production.
- Log request ID, route, status và thời gian xử lý; chỉ log user ID dạng nội bộ khi cần, không log token.
- Không ghi đầy đủ chi tiết giao dịch hoặc ghi chú riêng tư vào log nếu không cần debug.
- Lỗi `403`/`404` phải được chọn theo chiến lược chống lộ tài nguyên: có thể dùng `404` khi cần không tiết lộ tài nguyên có tồn tại.
- Đảm bảo log và monitoring cũng có quyền truy cập giới hạn.

## 10. Kiểm thử bảo mật tối thiểu

Bắt buộc có automated tests chứng minh:

- User A không đọc/sửa ví và giao dịch của User B chỉ bằng cách đổi UUID.
- User ngoài nhóm không xem được group, expense, splits, funds, settlement hoặc endpoint tổng hợp.
- Member không thể tự nâng role, chuyển Owner, điều chỉnh quỹ trái quyền hoặc xác nhận settlement người khác gửi.
- Chi phí không thể gắn fund của nhóm khác hoặc payer wallet của user khác.
- Invitation hết hạn/đã thu hồi/đã sử dụng không thể chấp nhận.
- Không xác nhận settlement hai lần hoặc ghi trùng fund transaction.
- Dữ liệu nhạy cảm không có trong response schema, log và service-worker cache.
- Session hết hạn/logout thì request bị chặn.

Trước khi deploy công khai, rà soát lại CORS, cookie, CSRF, secret, database network, debug mode và backup/restore.
