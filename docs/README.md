# FlowPocket — Bộ tài liệu dự án

Bộ tài liệu này là nguồn mô tả thống nhất để người phát triển hoặc coding agent xây dựng **FlowPocket**, ứng dụng quản lý tài chính cá nhân và chi tiêu nhóm.

## Quyết định kiến trúc đã chốt

- **Frontend:** Next.js + TypeScript, giao diện responsive và PWA có thể cài lên điện thoại.
- **Backend:** FastAPI, REST API, tổ chức theo modular monolith.
- **Database:** PostgreSQL tự quản lý bằng Docker Compose; dữ liệu nằm trong Docker volume bền vững.
- **ORM và migration:** SQLAlchemy 2.x + Alembic.
- **Authentication:** hệ thống tài khoản riêng, bảng `app_users` và phiên đăng nhập do backend quản lý.
- **Không sử dụng Supabase** hoặc dịch vụ BaaS thay thế cho database/auth trong kiến trúc nền tảng.
- Frontend chỉ gọi REST API; không kết nối trực tiếp tới PostgreSQL.
- Bản đầu tiên ưu tiên online-first; không lưu hoặc đồng bộ các giao dịch tài chính nhạy cảm khi offline.

## Đọc tài liệu theo thứ tự

1. [`00_TONG_QUAN_FLOWPOCKET.md`](00_TONG_QUAN_FLOWPOCKET.md) — mục tiêu, phạm vi và các quyết định sản phẩm.
2. [`01_KIEN_TRUC_HE_THONG.md`](01_KIEN_TRUC_HE_THONG.md) — stack, thành phần, luồng dữ liệu và cấu trúc mã nguồn.
3. [`02_QUY_TAC_NGHIEP_VU.md`](02_QUY_TAC_NGHIEP_VU.md) — cách tính tiền, chi tiêu nhóm, quỹ và công nợ.
4. [`03_THIET_KE_CSDL.md`](03_THIET_KE_CSDL.md) — các bảng, quan hệ và ràng buộc dữ liệu dự kiến.
5. [`04_BAO_MAT_PHAN_QUYEN.md`](04_BAO_MAT_PHAN_QUYEN.md) — riêng tư, xác thực, quyền truy cập và các yêu cầu bảo mật.
6. [`05_KE_HOACH_TRIEN_KHAI.md`](05_KE_HOACH_TRIEN_KHAI.md) — các milestone và tiêu chí nghiệm thu.
7. [`06_CAU_TRUC_MODULAR_VA_HIEU_NANG.md`](06_CAU_TRUC_MODULAR_VA_HIEU_NANG.md) — cấu trúc module hóa backend service, phân rã component, chuẩn hóa Services & Custom Hooks Layer (S-H-C-T) và chuẩn kế toán Net Expense.
8. [`07_NHAN_TIEN_QR_VA_DOI_SOAT.md`](07_NHAN_TIEN_QR_VA_DOI_SOAT.md) — thiết kế thanh toán QR Napas VietQR và đối soát chênh lệch.
9. [`08_HUONG_DAN_DEPLOY_VERCEL_VPS.md`](08_HUONG_DAN_DEPLOY_VERCEL_VPS.md) — hướng dẫn chi tiết triển khai Frontend (Vercel) + Backend (VPS Docker) + Domain miễn phí (DuckDNS) & SSL HTTPS.
10. [`AGENT_IMPLEMENTATION_PROMPT.md`](AGENT_IMPLEMENTATION_PROMPT.md) — prompt chính để giao cho Antigravity hoặc coding agent.


## Quy ước quan trọng

- Tài liệu này mô tả **đích cần xây dựng**, không khẳng định ứng dụng đã được triển khai.
- Agent phải kiểm tra repository hiện tại trước khi sửa. Không được ghi đè/xóa mã có sẵn một cách mù quáng.
- Khi có xung đột, ưu tiên theo thứ tự: yêu cầu bảo mật và nghiệp vụ trong tài liệu → kiến trúc đã chốt → cách triển khai phù hợp trong codebase. Nếu phải đổi quyết định, ghi rõ lý do trong README hoặc ADR.
- Không dùng số thực để lưu tiền. Tiền VND lưu bằng số nguyên; không tính toán số dư bằng số thực.
- Không tin dữ liệu quyền hạn do frontend gửi lên. Backend phải tự xác minh user, tư cách thành viên nhóm và role cho mỗi thao tác.
- Không commit `.env`, mật khẩu, session secret hoặc thông tin kết nối production vào Git.

## Định nghĩa hoàn thành MVP

MVP được xem là đạt khi người dùng có thể đăng ký/đăng nhập an toàn, quản lý ví và giao dịch cá nhân, tạo nhóm và quản lý thành viên, ghi nhận khoản chi cùng phần chia, xem công nợ, gửi/xác nhận quyết toán, quản lý quỹ chung cơ bản và sử dụng giao diện PWA trên điện thoại. Các luồng này phải có kiểm thử, migration rõ ràng và hướng dẫn chạy/backup/restore.
