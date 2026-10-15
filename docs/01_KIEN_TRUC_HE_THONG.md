# 01 — Kiến trúc hệ thống FlowPocket

## 1. Quyết định nền tảng

| Lớp | Công nghệ/định hướng | Trách nhiệm |
|---|---|---|
| Frontend | Next.js + TypeScript | Giao diện, routing, form, biểu đồ, PWA |
| Backend | Python + FastAPI | REST API, nghiệp vụ, xác thực, phân quyền, validation |
| ORM | SQLAlchemy 2.x | Truy vấn và quản lý model database |
| Migration | Alembic | Quản lý thay đổi schema có thể tái lập |
| Database | PostgreSQL | Lưu dữ liệu nghiệp vụ và ràng buộc toàn vẹn |
| Local runtime | Docker Compose | Chạy PostgreSQL và tùy chọn toàn bộ stack |
| Test | pytest + test frontend phù hợp | Kiểm thử nghiệp vụ, API, quyền và giao diện |

**Không dùng Supabase.** Không dùng Supabase Auth, Supabase Data API, Supabase Storage, Edge Functions hoặc phụ thuộc Supabase để ứng dụng hoạt động. Backend tự giao tiếp với PostgreSQL thông qua driver/ORM.

## 2. Sơ đồ tổng quan

```text
┌──────────────────────────────┐
│ Browser / Installed PWA      │
│ Next.js + TypeScript         │
└──────────────┬───────────────┘
               │ HTTPS / REST API
               │ Auth cookie + CSRF protections
┌──────────────▼───────────────┐
│ FastAPI                      │
│ API → Services → Repositories│
│ Auth / Authorization         │
│ Validation / Transactions    │
└──────────────┬───────────────┘
               │ SQLAlchemy / async or sync driver
┌──────────────▼───────────────┐
│ PostgreSQL                   │
│ Users / Wallets / Ledger     │
│ Groups / Expenses / Funds    │
└──────────────────────────────┘
```

Frontend không kết nối trực tiếp đến PostgreSQL. Không đặt thông tin database trong biến môi trường `NEXT_PUBLIC_*`. Mọi quyết định quyền hạn và tính toán tiền phải được backend kiểm tra lại.

## 3. Tổ chức backend

Dùng **modular monolith**: một ứng dụng FastAPI, chia package theo miền nghiệp vụ. Không tách microservices ở MVP.

Cấu trúc gợi ý:

```text
backend/
├── app/
│   ├── main.py
│   ├── api/
│   │   ├── deps.py
│   │   └── v1/
│   │       ├── router.py
│   │       ├── auth.py
│   │       ├── users.py
│   │       ├── wallets.py
│   │       ├── transactions.py
│   │       ├── categories.py
│   │       └── groups.py            # Quản trị nhóm, thành viên, chi tiêu, quỹ, quyết toán, VietQR
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   ├── vietqr.py                # Sinh mã VietQR Napas chuẩn EMVCo & danh sách ngân hàng
│   │   ├── errors.py
│   │   └── logging.py
│   ├── db/
│   │   ├── base.py
│   │   ├── session.py
│   │   └── health.py
│   ├── models/                      # SQLAlchemy models (User, Wallet, Group, Member, Fund...)
│   ├── schemas/                     # Pydantic schemas (Validation & Serialization)
│   ├── repositories/
│   ├── services/
│   │   ├── auth_service.py          # Session auth, Argon2id, cookie HttpOnly
│   │   ├── wallet_service.py        # Ví cá nhân & tự động cấp ví mặc định
│   │   ├── transaction_service.py   # Thu/chi cá nhân, chuyển tiền giữa các ví
│   │   ├── group_service.py         # Vòng đời nhóm, mời Gmail, link công khai, phân quyền
│   │   └── group_finance/           # Modular package xử lý tài chính nhóm
│   │       ├── expense_service.py   # Khoản chi & thuật toán phân chia Equal/Custom
│   │       ├── fund_service.py      # Quản lý số dư và giao dịch quỹ nhóm
│   │       ├── debt_calculator.py   # Ma trận nợ & thuật toán rút gọn nợ tham lam
│   │       └── settlement_service.py # Vòng đời quyết toán nợ & hạch toán hoàn tiền
│   └── tests/                       # Pytest test suite (33 tests pass)
├── alembic/                         # Database migrations
└── Dockerfile
```

Có thể điều chỉnh tên thư mục theo chuẩn thư viện hoặc repository đã có, nhưng phải giữ ranh giới tương đương:

- **API/router:** parse request, phụ thuộc xác thực và gọi service; không chứa quy tắc tiền phức tạp.
- **Schema:** request/response validation; không trả ORM object tùy tiện.
- **Service:** quy tắc nghiệp vụ và điều phối database transaction.
- **Repository:** truy vấn dữ liệu có tổ chức, nếu giúp codebase rõ ràng; không tạo abstraction thừa.
- **Model:** bảng và ràng buộc quan hệ.

## 4. Tổ chức frontend (Chuẩn hóa Kiến trúc 4 Lớp S-H-C-T)

```text
frontend/
├── src/
│   ├── app/                         # Next.js App Router (pages, layout, styles, not-found)
│   ├── components/                  # Reusable UI components (Navbar, Toast, MoneyInput...)
│   ├── features/                    # Feature Modules theo chuẩn 4 lớp
│   │   ├── auth/                    # auth-service.ts, auth-context.tsx, auth-modal.tsx
│   │   ├── groups/                  # Quản lý nhóm & tài chính nhóm
│   │   │   ├── group-service.ts     # Pure API client tập trung 17 endpoints
│   │   │   ├── hooks/               # useGroupManagement hook quản lý state & refresh
│   │   │   ├── components/          # HeroCard, ExpenseList, DebtSection, MemberList...
│   │   │   ├── group-dashboard.tsx  # Trình diễn trang nhóm tinh gọn
│   │   │   └── ... (ExpenseModal, FundModal, SettlementModal, InviteModal, JoinModal...)
│   │   ├── personal-finance/        # Quản lý tài chính cá nhân
│   │   │   ├── personal-finance-service.ts # Pure API client (ví, giao dịch, báo cáo)
│   │   │   ├── hooks/               # usePersonalFinance hook quản lý state & bộ lọc
│   │   │   ├── components/          # FilterPanel, BreakdownReports, CashFlowChart...
│   │   │   ├── personal-dashboard.tsx # Trình diễn trang cá nhân tinh gọn
│   │   │   └── ... (WalletModal, TransactionModal, TransferModal...)
│   │   └── qr-payments/             # Tích hợp VietQR Napas
│   │       ├── qr-service.ts        # Sinh mã VietQR & kiểm tra thông tin ngân hàng
│   │       └── components/          # VietQRModal & bộ tạo mã thanh toán
│   ├── lib/                         # Tiện ích chung
│   │   ├── api-client.ts            # Fetch wrapper chuẩn hóa credentials & lỗi
│   │   ├── date-utils.ts            # Format ngày giờ tiếng Việt
│   │   └── number-to-words.ts       # Đọc số tiền VND thành chữ tiếng Việt
│   └── types/                       # TypeScript domain types & DTO schemas
├── public/                          # Static assets & manifest.webmanifest
├── Dockerfile
└── package.json
```

**Quy tắc bất biến Frontend:**
- **Không gọi trực tiếp `apiRequest` trong các file `.tsx`**: Mọi tương tác mạng phải đi qua tầng Service (`*-service.ts`).
- **Giao diện chỉ Trình diễn (Presentation)**: Toàn bộ State, Effect và hàm điều phối xử lý dữ liệu được đóng gói trong Custom Hooks (`usePersonalFinance`, `useGroupManagement`, `useAuth`).
- **Bảo toàn số nguyên tiền tệ**: Không dùng số thực để tính toán số dư và tiền nợ. Dùng component `MoneyInput` tự động định dạng và đọc chữ tiếng Việt.

## 5. PostgreSQL và Docker

### Môi trường phát triển

Có thể chạy database riêng khi phát triển frontend/backend trực tiếp trên máy:

```yaml
services:
  postgres:
    image: postgres:17
    container_name: flowpocket-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: flowpocket
      POSTGRES_USER: flowpocket_app
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in .env}
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - flowpocket_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U flowpocket_app -d flowpocket"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  flowpocket_pgdata:
```

Lưu đoạn trên trong `docker-compose.yml`; mật khẩu thực để trong `.env` cục bộ và không commit. Dùng `.env.example` chỉ với placeholder.

### Mạng production

- PostgreSQL không publish port ra Internet.
- Backend và database giao tiếp trong Docker network riêng.
- Nếu cần quản trị database từ máy cá nhân, dùng VPN/SSH tunnel hoặc bind loopback có kiểm soát; không mở `5432` công khai.
- Dùng volume bền vững; hiểu rõ Docker volume không thay thế cho backup.
- Có quy trình backup, kiểm tra khả năng restore và lưu bản sao backup ngoài máy chạy database.

## 6. Cấu hình môi trường

Tối thiểu cần quản lý qua environment variables:

- `APP_ENV` — local/test/production.
- `DATABASE_URL` — chỉ backend sử dụng.
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` — cấu hình container DB.
- `APP_SECRET_KEY` hoặc khóa ký/secret phục vụ session/CSRF.
- `FRONTEND_ORIGIN` hoặc danh sách `CORS_ORIGINS`.
- `SESSION_COOKIE_SECURE` — bật ở production HTTPS.
- Các cấu hình email nếu triển khai xác minh địa chỉ/đặt lại mật khẩu.

Không đưa secret vào source control, log, response API hay bundle frontend.

## 7. Thiết kế xác thực khuyến nghị

- `app_users` là bảng tài khoản chuẩn do ứng dụng tự quản lý.
- Mật khẩu băm bằng Argon2id qua thư viện được duy trì tốt; không mã hóa reversible và không tự viết thuật toán hash.
- Dùng session token ngẫu nhiên đủ mạnh, chỉ lưu hash/token digest trong database; cookie phiên đặt `HttpOnly`, `SameSite` phù hợp và `Secure` ở production.
- Có expiry, revoke khi logout, và khả năng thu hồi mọi phiên của một user.
- Thao tác thay đổi dữ liệu cần chống CSRF nếu auth dựa trên cookie; kiểm tra Origin/CSRF token theo thiết kế.
- Giới hạn tốc độ cho đăng nhập, đăng ký, reset password và các endpoint nhạy cảm.

Không nhất thiết phải dùng JWT nếu session phía server đáp ứng tốt. Agent không được thêm JWT hoặc auth provider chỉ vì quen dùng; phải chọn một chiến lược nhất quán và mô tả nó.

## 8. Luồng request và transaction

Ví dụ tạo chi phí nhóm:

1. API xác định user từ session server, không nhận `created_by` làm nguồn tin cậy từ client.
2. Service xác minh user là thành viên đang hoạt động của nhóm và có quyền tạo chi phí.
3. Validate tổng tiền, các thành viên được chia và phương thức chia.
4. Mở một database transaction.
5. Tạo expense và các split; nếu trả từ quỹ, ghi fund transaction liên kết trong cùng transaction.
6. Kiểm tra tổng phần chia bằng tổng chi phí.
7. Commit. Nếu bất kỳ bước nào lỗi, rollback toàn bộ.

Tương tự, xác nhận settlement phải cập nhật trạng thái và tác động đến số dư công nợ trong cùng một transaction. Dùng idempotency hoặc kiểm soát trạng thái để ngăn double-submit.

## 9. Migration và seed dữ liệu

- Mọi thay đổi schema đi qua Alembic migration có thứ tự.
- Không dựa vào `create_all()` như cách quản lý schema production.
- Migration phải kiểm tra được trên database mới và trên bản có dữ liệu theo đường nâng cấp dự kiến.
- Seed dữ liệu danh mục mặc định phải idempotent và không tạo bản ghi trùng khi chạy lại.
- Không đặt dữ liệu người dùng thật hoặc secret trong seed.

## 10. Health check, logging và quan sát

- `GET /health` kiểm tra tiến trình backend.
- `GET /ready` hoặc health check phù hợp kiểm tra khả năng kết nối DB để điều phối container.
- Log có request/correlation ID và đủ thông tin debug nhưng không log mật khẩu, cookie, token, chuỗi kết nối hay nội dung tài chính riêng tư không cần thiết.
- Lỗi API trả cấu trúc nhất quán; không trả stack trace cho client production.

## 11. API convention

- Prefix phiên bản, ví dụ `/api/v1`.
- JSON request/response có schema rõ ràng.
- Phân biệt `400` dữ liệu nghiệp vụ không hợp lệ, `401` chưa xác thực, `403` không đủ quyền, `404` không tồn tại/không được phép biết đến, `409` xung đột trạng thái/idempotency.
- Pagination cho danh sách có khả năng tăng dài.
- Dùng Decimal/số nguyên phù hợp trong schema, nhưng serialized money theo quy tắc nhất quán; với VND nên dùng integer.
- Không trả trường nhạy cảm như `password_hash`, session token hash hoặc invitation token hash.
