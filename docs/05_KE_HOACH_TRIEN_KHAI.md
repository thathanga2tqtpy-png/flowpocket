# 05 — Kế hoạch triển khai theo milestone

Mục tiêu là để agent triển khai theo lát cắt nhỏ, chạy được và kiểm thử được sau mỗi milestone. Không tạo một lượng lớn mã chưa kiểm chứng rồi mới chạy lần đầu.

## Nguyên tắc thực hiện

- Bắt đầu bằng cách kiểm tra codebase, runtime và các thay đổi đang có.
- Chia công việc thành milestone; mỗi milestone phải có tiêu chí nghiệm thu.
- Chạy tests và build sau các thay đổi quan trọng; báo đúng kết quả thực chạy.
- Không đánh dấu hoàn thành cho chức năng chỉ có UI giả hoặc endpoint trả dữ liệu mẫu.
- Không xóa dữ liệu thật hoặc tự reset database đang dùng.
- Không tự tạo secret production, không commit `.env`.
- Tài liệu, migrations, code và test phải cập nhật đồng bộ.

## M0 — Khảo sát repository và nền tảng

### Việc cần làm

1. Kiểm tra repository, công nghệ, cấu trúc thư mục, lệnh chạy và test hiện có.
2. Đối chiếu code hiện tại với bộ tài liệu; ghi nhận phần đã có và phần thiếu.
3. Tạo cấu hình môi trường mẫu và Docker Compose cho PostgreSQL.
4. Tạo FastAPI app với config theo môi trường, kết nối database và `/health`/readiness.
5. Tạo/hoàn thiện Next.js + TypeScript app, API client cơ bản và trang trạng thái kết nối backend.
6. Cấu hình Alembic, pytest và các lệnh developer cơ bản.
7. Viết hướng dẫn chạy local bằng README.

### Nghiệm thu

- Có thể chạy PostgreSQL bằng Docker Compose trên máy local.
- Backend khởi động được, health endpoint trả kết quả đúng và readiness phản ánh tình trạng DB.
- Frontend khởi động và gọi endpoint health qua API client.
- Migration đầu tiên chạy được trên database rỗng.
- Không có secret thật trong Git; không có Supabase dependency.

## M1 — Tài khoản và phân quyền

### Việc cần làm

- Tạo `app_users`, `auth_sessions`, schema và migrations.
- Đăng ký, đăng nhập, lấy thông tin user hiện tại, logout và thu hồi session.
- Hash password bằng Argon2id; cookie/session và CSRF theo Security Model.
- Rate limit cho endpoint nhạy cảm hoặc triển khai biện pháp giới hạn tương đương phù hợp môi trường.
- Giao diện đăng nhập/đăng ký, trạng thái chờ và lỗi.

### Nghiệm thu

- User có thể đăng ký, đăng nhập, tải lại trang và vẫn ở đúng trạng thái session theo chính sách.
- Logout vô hiệu session; session hết hạn bị chặn.
- Không thể xem dữ liệu của user khác bằng cách đổi ID.
- Password/session token không bị lộ qua response hoặc log.
- Có test cho xác thực thành công/thất bại, expiry/revoke và truy cập trái quyền.

## M2 — Tài chính cá nhân

### Việc cần làm

- Ví và danh mục.
- Giao dịch thu, chi; chuyển giữa hai ví được thực hiện nguyên tử.
- Danh sách/lọc giao dịch; tổng hợp thu/chi theo kỳ và danh mục.
- Hiển thị số dư và quy tắc báo cáo rõ ràng.

### Nghiệm thu

- Tạo/sửa/ẩn ví đúng quyền.
- Ghi nhận thu/chi làm thay đổi số dư theo đúng quy tắc.
- Chuyển tiền làm giảm ví nguồn và tăng ví đích cùng amount; không cộng thành thu/chi.
- Bộ lọc thời gian, ví và danh mục hoạt động.
- Tổng báo cáo khớp với ledger; test cho trường hợp biên và amount lớn hợp lệ.

## M3 — Nhóm và lời mời

### Việc cần làm

- Tạo/đổi tên nhóm.
- Membership, role và vòng đời member.
- Mời qua token có hạn, chấp nhận và thu hồi.
- Danh sách nhóm, thông tin nhóm và quản lý thành viên.

### Nghiệm thu

- User tạo nhóm trở thành Owner.
- User không thuộc nhóm không truy cập được endpoint nhóm.
- Role được backend thực thi.
- Invitation hết hạn, đã revoke hoặc dùng rồi bị từ chối.
- Không đọc/sửa thông tin ví hoặc giao dịch cá nhân của thành viên khác.

## M4 — Chi phí nhóm, phần chia và công nợ

### Việc cần làm

- Tạo chi phí nhóm do thành viên trả.
- Chia đều/chia tùy chỉnh; validate tổng phần chia.
- Danh sách/chi tiết/summary chi phí nhóm.
- Tính net payable/receivable và hiển thị cách tính.
- Void hoặc điều chỉnh khoản chi có audit trail.

### Nghiệm thu

- Test ví dụ chia đều, chia tùy chỉnh, phần dư VND và tổng không khớp.
- Tổng split luôn bằng total của khoản chi được post.
- Chỉ chi phí POSTED được tính; DRAFT/VOID không tác động công nợ.
- Công nợ đúng với ví dụ A trong `02_QUY_TAC_NGHIEP_VU.md`.
- User không thể sửa khoản chi của nhóm khác hoặc thêm split cho user ngoài nhóm.

## M5 — Quỹ nhóm và quyết toán

### Việc cần làm

- Tạo quỹ và ghi nhận đóng góp.
- Chi từ quỹ; đồng bộ `group_fund_transactions` nguyên tử.
- Hiển thị lịch sử và số dư quỹ.
- Tạo, xác nhận, từ chối/hủy settlement theo state machine.
- Cập nhật công nợ sau settlement đã xác nhận.
- Đồng bộ wallet ledger cho dòng tiền liên quan nhóm nếu tính năng đó được đưa vào MVP; dùng source link chống trùng.

### Nghiệm thu

- Số dư quỹ không âm; khoản chi quỹ không thể bị ghi hai lần.
- Chi từ quỹ không tạo công nợ thành viên như khoản chi thành viên trả.
- Chỉ người nhận mới xác nhận settlement.
- Pending/rejected/cancelled không ảnh hưởng công nợ như settlement đã xác nhận.
- Double submit và request cạnh tranh không làm lệch số dư.
- Test ví dụ B và D trong quy tắc nghiệp vụ.

## M6 — PWA và hoàn thiện UX

### Việc cần làm

- Responsive mobile/desktop.
- PWA manifest, icons và installability.
- Trạng thái loading, empty, error, success, confirm cho thao tác tài chính.
- Format tiền, ngày giờ, thông báo validation tiếng Việt.
- Accessibility cơ bản: label form, keyboard navigation, contrast và focus state.
- Không cache API nhạy cảm trong service worker.

### Nghiệm thu

- Giao diện hoạt động với màn hình điện thoại phổ biến và desktop.
- Có thể cài PWA trên trình duyệt hỗ trợ.
- Logout không để lộ dữ liệu user trước trong UI/cache.
- Các luồng chính có thông báo lỗi và không mất dữ liệu do lỗi form thông thường.

## M7 — Rà soát và phát hành MVP

### Việc cần làm

- Chạy full test suite, frontend lint/typecheck/build và backend checks.
- Rà soát CORS, cookie, CSRF, debug mode, secrets và access database.
- Viết hướng dẫn deploy, migration, backup và restore.
- Tạo dữ liệu demo không chứa dữ liệu thật; không reset production database.
- Tóm tắt known limitations và việc còn lại.

### Nghiệm thu

- Build và tests chạy thành công hoặc mọi lỗi còn tồn tại được ghi rõ, không giả báo pass.
- Database production không mở cổng công khai ngoài chủ đích đã ghi tài liệu.
- Có hướng dẫn backup/restore đã thử nghiệm trên môi trường an toàn.
- Người mới có thể chạy dự án từ README.
- Không còn Supabase SDK, URL, keys hoặc code path phụ thuộc Supabase.

## Definition of Done chung

Một chức năng chỉ hoàn thành khi:

1. Có implementation thật ở frontend/backend theo phạm vi của nó.
2. Có validation, phân quyền và xử lý trạng thái lỗi cần thiết.
3. Có migration nếu thay đổi schema.
4. Có automated tests cho happy path và các lỗi quan trọng.
5. Đã chạy kiểm tra liên quan và ghi lại kết quả thực.
6. Tài liệu hướng dẫn hoặc API schema được cập nhật.
