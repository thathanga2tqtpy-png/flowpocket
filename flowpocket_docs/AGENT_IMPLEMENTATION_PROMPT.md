# Prompt triển khai FlowPocket cho Antigravity / Coding Agent

> Dùng prompt này tại thư mục gốc repository FlowPocket. Đính kèm hoặc giữ nguyên các file tài liệu trong `docs/` để agent có thể đọc chúng trước khi sửa code.

---

## VAI TRÒ

Bạn là Senior Full-stack Engineer kiêm Software Architect. Nhiệm vụ của bạn là kiểm tra codebase hiện tại và triển khai FlowPocket theo tài liệu sản phẩm, kiến trúc, nghiệp vụ, schema và bảo mật trong repository.

Đừng chỉ viết kế hoạch, mockup hoặc ví dụ code. Hãy sửa/tạo file thực tế, chạy lệnh phù hợp, kiểm tra kết quả và báo cáo chính xác những gì đã hoàn thành.

## TÀI LIỆU PHẢI ĐỌC TRƯỚC

Đọc toàn bộ các tài liệu sau, theo thứ tự:

1. `README.md`
2. `docs/00_TONG_QUAN_FLOWPOCKET.md`
3. `docs/01_KIEN_TRUC_HE_THONG.md`
4. `docs/02_QUY_TAC_NGHIEP_VU.md`
5. `docs/03_THIET_KE_CSDL.md`
6. `docs/04_BAO_MAT_PHAN_QUYEN.md`
7. `docs/05_KE_HOACH_TRIEN_KHAI.md`

Nếu file đang nằm ở thư mục gốc thay vì `docs/`, hãy tìm đúng đường dẫn trước khi kết luận là thiếu. `AGENT_IMPLEMENTATION_PROMPT.md` là chỉ thị thực hiện, không thay thế các quy tắc nghiệp vụ/bảo mật.

## QUYẾT ĐỊNH KHÔNG ĐƯỢC TỰ Ý THAY ĐỔI

### Stack mục tiêu

- Frontend: Next.js + TypeScript, responsive, PWA.
- Backend: Python + FastAPI, REST API.
- Database: PostgreSQL do dự án tự quản lý, chạy bằng Docker Compose.
- ORM: SQLAlchemy 2.x.
- Migration: Alembic.
- Test backend: pytest; thêm kiểm thử frontend phù hợp với repo.
- Authentication: bảng `app_users` và session riêng của ứng dụng.

### Tuyệt đối không dùng Supabase

Không thêm hoặc giữ phụ thuộc runtime vào:

- Supabase Auth / `auth.users`
- Supabase Data API hoặc truy vấn trực tiếp từ browser
- Supabase Storage, Edge Functions hoặc Supabase client
- Supabase project URL, anon key, service role key hoặc biến môi trường Supabase

Không thay Supabase bằng một BaaS khác nếu chưa có chỉ thị. Frontend chỉ gọi REST API của FastAPI. Chỉ backend được kết nối PostgreSQL. `app_users` là nguồn tài khoản chuẩn; không giả định có bảng `auth.users`.

Nếu repository hiện hữu đang phụ thuộc Supabase, trước tiên liệt kê tất cả điểm phụ thuộc, sau đó thay bằng backend/API tương ứng. Không xóa code trước khi xác định chức năng mà code đó đang đảm nhiệm.

### Triết lý kiến trúc

- Dùng modular monolith; chưa tạo microservices.
- Ưu tiên tính đúng đắn của số dư, công nợ, tính nguyên tử và phân quyền hơn số lượng tính năng.
- Dữ liệu cá nhân là riêng tư mặc định.
- Tiền VND dùng số nguyên, không dùng `float`/`double`.
- PWA online-first; không tạo giao dịch offline trong MVP.
- Không dùng dữ liệu giả để làm như chức năng backend đã hoạt động.

## PHASE 0 — KIỂM TRA CODEBASE

Trước khi sửa file:

1. Kiểm tra thư mục hiện tại, `git status`, branch và thay đổi chưa commit. Không revert hoặc ghi đè các thay đổi của người dùng.
2. Đọc cấu trúc frontend/backend, dependencies, Docker, migration, tests và README.
3. Chạy các lệnh kiểm tra hiện có nếu khả thi.
4. Lập bảng ngắn: phần đã có, phần thiếu, phần đang dùng Supabase, rủi ro tương thích.
5. Đề xuất thứ tự sửa dựa trên code thật; sau đó bắt tay làm, không dừng ở bảng phân tích trừ khi gặp blocker thực sự.

Không được giả định repository trống. Không xóa hoặc tái khởi tạo database hiện có. Không chạy lệnh destructive như `docker compose down -v`, `dropdb`, `alembic downgrade base`, xóa volume hoặc reset dữ liệu trừ khi người dùng chỉ thị rõ ràng.

## PHASE 1 — NỀN TẢNG CHẠY ĐƯỢC

1. Chuẩn hóa cấu trúc thư mục theo tài liệu; điều chỉnh nhẹ nếu codebase có cấu trúc tốt hơn.
2. Tạo `docker-compose.yml` để chạy PostgreSQL; bind loopback ở môi trường local nếu publish port.
3. Tạo `.env.example` với placeholder và hướng dẫn tạo `.env` local. Đảm bảo `.env` được Git ignore.
4. Thiết lập `DATABASE_URL` chỉ được backend dùng.
5. Tạo FastAPI app với `/health` và readiness check database.
6. Thiết lập Next.js + TypeScript và một trang kiểm tra kết nối backend qua REST API.
7. Thiết lập SQLAlchemy, Alembic và pytest.
8. Cập nhật README với lệnh khởi động, migration và test.
9. Chạy app/database/test thực tế nếu môi trường cho phép; ghi rõ lệnh nào đã chạy.

## PHASE 2 — AUTHENTICATION VÀ PHÂN QUYỀN

Triển khai tài khoản riêng:

- Bảng `app_users`, bảng phiên như `auth_sessions` và migration.
- Đăng ký, đăng nhập, lấy user hiện tại, logout và thu hồi session.
- Hash mật khẩu bằng Argon2id qua thư viện uy tín.
- Ưu tiên cookie session `HttpOnly`, `Secure` ở production, `SameSite` phù hợp; lưu hash token session ở database, không lưu token thô.
- Có expiration, revoke và cơ chế CSRF phù hợp auth bằng cookie.
- CORS allowlist, rate limit endpoint xác thực hoặc biện pháp tương đương có tài liệu.
- Không lưu token phiên dài hạn trong `localStorage`.
- Không trả `password_hash`, session token/hash hay secret từ API.

Hãy kiểm tra và ghi lại cách frontend/backend dùng cookie/CORS theo môi trường local và production. Không dùng wildcard CORS với credentialed requests.

## PHASE 3 — TÀI CHÍNH CÁ NHÂN

Triển khai ví, danh mục, ledger/giao dịch, chuyển tiền giữa ví, bộ lọc và báo cáo theo tài liệu.

- Giao dịch phải kiểm tra chủ sở hữu ví và danh mục.
- Chuyển tiền hai chiều phải được tạo nguyên tử; không tính là thu nhập/chi tiêu.
- Không để frontend quyết định số dư chính thức.
- Các dòng tiền liên quan nhóm phải được phân loại riêng, tránh biến khoản trả hộ thành toàn bộ chi tiêu tiêu dùng hoặc khoản nhận quyết toán thành thu nhập.
- Nếu chọn chiến lược số dư dựa trên ledger hoặc balance projection, ghi quyết định và test đối soát.

## PHASE 4 — NHÓM, MEMBER VÀ INVITATION

Triển khai `finance_groups`, `group_members`, `group_invitations`.

- Role `OWNER`, `ADMIN`, `MEMBER` được xác minh ở backend cho từng nhóm.
- Mỗi nhóm có Owner hiện hành.
- Invitation token phải khó đoán, chỉ lưu token hash, có expiration/revoke/single-use.
- Không cho user ngoài nhóm truy cập tài nguyên nhóm qua cách đổi ID.
- Không cho thành viên nhóm xem ví/giao dịch cá nhân của thành viên khác.

## PHASE 5 — CHI PHÍ, PHẦN CHIA VÀ CÔNG NỢ

Triển khai group expenses với nguồn trả `MEMBER` hoặc `FUND`, split `EQUAL`/`CUSTOM`, trạng thái hợp lệ và tính net balance.

Bắt buộc:

- Kiểm tra thành viên được chia thuộc đúng nhóm.
- Tổng split phải bằng tổng expense trước khi `POSTED`.
- Các thao tác expense + splits + fund transaction liên quan phải cùng database transaction.
- `DRAFT`/`VOID` không ảnh hưởng công nợ hoặc báo cáo chính thức.
- Không xóa cứng bản ghi tài chính đã post.
- Chi phí do thành viên trả tham gia tính công nợ; chi phí từ quỹ không tạo nợ giữa các thành viên theo quy tắc nghiệp vụ.
- Viết test số học cụ thể cho chia đều, chia tùy chỉnh và phần dư VND.

## PHASE 6 — QUỸ VÀ SETTLEMENT

Triển khai quỹ chung, lịch sử thu/chi quỹ và yêu cầu quyết toán.

- Không cho quỹ âm trong MVP.
- Fund balance và debt balance phải được tính từ bản ghi gốc hoặc projection có tính nguyên tử và đối soát được.
- Chỉ người nhận settlement được xác nhận/reject.
- Pending/rejected/cancelled không được áp dụng như khoản đã xác nhận.
- Dùng state transition có điều kiện, transaction database và idempotency/chống double-submit.
- Nếu settlement hoặc group expense sinh ledger event ở ví cá nhân, tạo liên kết source unique để tránh ghi trùng.

## PHASE 7 — PWA VÀ UX

- Responsive trên điện thoại và desktop.
- PWA manifest/icons và cấu hình installability theo framework phù hợp.
- Xử lý loading, empty, error, success và confirm cho thao tác tài chính.
- Định dạng tiền/ngày nhất quán, tiếng Việt trong UI nếu chưa có yêu cầu ngôn ngữ khác.
- Không cache response API tài chính nhạy cảm trong service worker.
- Không tạo giao dịch offline hoặc cơ chế sync phức tạp trong MVP.
- Khi logout, UI phải xóa state cá nhân nhạy cảm.

## CHẤT LƯỢNG VÀ KIỂM THỬ

Bổ sung automated tests ít nhất cho các nhóm sau:

1. Auth: register/login/logout, session expiry/revoke, password hash.
2. Isolation: User A không truy cập ví/giao dịch User B.
3. Group authorization: user ngoài nhóm không truy cập group và resource con.
4. Role: member không thực hiện hành động chỉ dành cho Owner/Admin.
5. Ledger: thu/chi/chuyển ví và số dư khớp; chuyển ví không bị tính thành expense/income.
6. Expenses: tổng split bằng total; không gắn member/fund/wallet sai nhóm; DRAFT/VOID không tác động tổng.
7. Debt: công nợ đúng với ví dụ nghiệm thu trong `02_QUY_TAC_NGHIEP_VU.md`.
8. Fund: số dư đúng, không âm, không trừ hai lần.
9. Settlement: chỉ người nhận xác nhận, trạng thái sai bị từ chối, request lặp không làm thay đổi số dư hai lần.
10. API: schema response không lộ secret/hash; pagination/validation/error status phù hợp.

Không chỉ viết test cho có. Chạy chúng và báo số test thật sự pass/fail. Nếu không thể chạy do thiếu dịch vụ/phụ thuộc, ghi rõ trở ngại và lệnh người dùng cần chạy.

## QUY TẮC CODE

- Giữ code dễ đọc, đặt tên nhất quán và thêm type hints ở backend.
- Không nhồi quy tắc nghiệp vụ vào router hoặc React component.
- Tránh abstraction/phức tạp không cần thiết.
- Không tạo endpoint placeholder trả success nhưng không lưu dữ liệu.
- Không hardcode credentials hoặc bí mật.
- Không sử dụng `float` cho tiền.
- Không bỏ qua authorization chỉ vì frontend đã ẩn nút.
- Không âm thầm đổi quy tắc nghiệp vụ. Nếu tài liệu có điểm mơ hồ, chọn phương án ít rủi ro nhất, ghi decision và test.
- Giữ các thay đổi không liên quan ở mức tối thiểu.
- Không tuyên bố build/test thành công nếu chưa thực hiện được lệnh tương ứng.

## QUẢN LÝ TIẾN ĐỘ

Làm tuần tự từng phase, nhưng cố gắng hoàn tất nhiều nhất có thể trong phiên làm việc hiện tại. Sau mỗi phase:

1. Tóm tắt file đã thêm/sửa.
2. Chạy tests/lint/typecheck/build phù hợp.
3. Khắc phục lỗi do chính thay đổi vừa tạo.
4. Cập nhật README/tài liệu nếu hành vi triển khai khác tài liệu.
5. Nêu phần còn thiếu cụ thể trước khi đi tiếp.

Không dừng ở việc chỉ dựng giao diện nếu backend chưa có. Không dừng ở việc sinh schema nếu các luồng nghiệp vụ chính chưa được kết nối. Nếu hết thời gian/công cụ, ưu tiên một vertical slice chạy được và bảo mật hơn là nhiều module dở dang.

## BÁO CÁO CUỐI PHIÊN

Kết thúc bằng báo cáo ngắn, có các mục:

- **Đã làm:** tính năng/file/migration thực tế đã triển khai.
- **Đã kiểm tra:** lệnh cụ thể đã chạy và kết quả thực.
- **Cách chạy:** lệnh khởi động frontend, backend, database và migrations.
- **Cấu hình cần có:** chỉ liệt kê tên biến; không in giá trị secret.
- **Còn thiếu/rủi ro:** chưa hoàn thành, test chưa chạy, quyết định cần xác nhận hoặc vấn đề production.
- **Supabase audit:** xác nhận không còn phụ thuộc runtime vào Supabase; nếu còn thì liệt kê đường dẫn và lý do, không được tuyên bố sạch khi chưa kiểm tra.

Bắt đầu bằng PHASE 0 ngay bây giờ. Kiểm tra repository thật, sau đó triển khai theo các tài liệu này.
