# FlowPocket — Personal & Group Finance Management

FlowPocket là ứng dụng quản lý tài chính cá nhân và chi tiêu nhóm được thiết kế theo kiến trúc **Modular Monolith** với cấu trúc monorepo phân tách rõ ràng giữa Frontend, Backend, Infrastructure và Documentation để hỗ trợ kiểm thử, mở rộng và phát hành độc lập.

---

## 1. Cấu trúc Repository sau Refactor

```text
flowpocket/
│
├── frontend/                     # Next.js 14 (App Router) + TypeScript + Tailwind CSS (PWA)
│   ├── src/
│   │   ├── app/                  # App Router pages, layout, styles, not-found
│   │   ├── components/           # Reusable UI components (Navbar, MoneyInput, Toast...)
│   │   ├── features/             # Feature Modules theo chuẩn 4 lớp (S-H-C-T)
│   │   │   ├── auth/             # auth-service.ts, auth-context.tsx, auth-modal.tsx
│   │   │   ├── groups/           # group-service.ts, hooks/use-group-management.ts, components/, modals
│   │   │   ├── personal-finance/ # personal-finance-service.ts, hooks/use-personal-finance.ts, components/, modals
│   │   │   └── qr-payments/      # qr-service.ts, components/ (Napas VietQR, VietQRModal...)
│   │   ├── lib/                  # Tiện ích chung, api-client.ts, date-utils, number-to-words
│   │   └── types/                # TypeScript domain models & DTOs
│   ├── public/                   # Static assets, web manifest
│   ├── package.json              # Frontend dependencies & npm scripts
│   ├── package-lock.json         # Lockfile phiên bản thư viện
│   ├── Dockerfile                # Multi-stage production container
│   └── README.md                 # Hướng dẫn chi tiết cho Frontend & Vercel Deploy
│
├── backend/                      # Python 3.11 + FastAPI + SQLAlchemy 2.x + Alembic
│   ├── app/                      # Source code ứng dụng modular monolith
│   │   ├── api/                  # API routers theo phiên bản (v1: auth, wallets, transactions, groups...)
│   │   ├── core/                 # Cấu hình môi trường (config.py), security, vietqr
│   │   ├── db/                   # Session database, readiness healthcheck
│   │   ├── models/               # SQLAlchemy ORM models
│   │   ├── schemas/              # Pydantic schemas (validation/serialization)
│   │   ├── repositories/         # Data access abstractions
│   │   └── services/             # Nghiệp vụ tài chính & transaction (auth, wallet, group_finance...)
│   ├── alembic/                  # Database migrations script & history
│   ├── tests/                    # Pytest test suite
│   ├── requirements.txt          # Python dependencies
│   ├── Dockerfile                # Production container cho FastAPI
│   └── README.md                 # Hướng dẫn chi tiết cho Backend
│
├── infra/                        # Cấu hình hạ tầng & Docker Compose
│   ├── docker-compose.dev.yml    # PostgreSQL 17 cục bộ (loopback bind 127.0.0.1:5432)
│   ├── docker-compose.prod.yml   # Stack production (PostgreSQL nội bộ + Backend + Frontend + Nginx)
│   └── nginx/                    # Reverse proxy routing
│       └── default.conf          # Nginx config chuyển tiếp /api/ và frontend
│
├── docs/                         # Toàn bộ tài liệu nghiệp vụ, kiến trúc & schema
│   ├── 00_TONG_QUAN_FLOWPOCKET.md
│   ├── 01_KIEN_TRUC_HE_THONG.md
│   ├── 02_QUY_TAC_NGHIEP_VU.md   # Quy tắc số học, quản lý thành viên, chia nợ, quỹ nhóm
│   ├── 03_THIET_KE_CSDL.md
│   ├── 04_BAO_MAT_PHAN_QUYEN.md
│   ├── 05_KE_HOACH_TRIEN_KHAI.md
│   ├── 06_CAU_TRUC_MODULAR_VA_HIEU_NANG.md # Chuẩn hóa Services & Custom Hooks, Net Expense
│   ├── 07_NHAN_TIEN_QR_VA_DOI_SOAT.md      # Tích hợp VietQR Napas
│   ├── 08_HUONG_DAN_DEPLOY_VERCEL_VPS.md   # Triển khai Vercel + Docker VPS + DuckDNS SSL
│   └── AGENT_IMPLEMENTATION_PROMPT.md
│
├── .github/                      # CI/CD Workflows độc lập theo module
│   └── workflows/
│       ├── frontend.yml          # Trigger khi thay đổi frontend/**
│       ├── backend.yml           # Trigger khi thay đổi backend/**
│       └── infra.yml             # Trigger khi thay đổi infra/**
│
├── .env.example                  # Mẫu biến môi trường (không chứa secret)
├── .gitignore                    # Bỏ qua secrets, build artifacts, venv, volumes
└── README.md                     # Tài liệu tổng quan dự án
```

---

## 2. Sơ đồ luồng hệ thống

```text
┌─────────────────────────────────┐
│ Browser / Mobile PWA (Next.js) │
└────────────────┬────────────────┘
                 │ HTTP REST (JSON)
                 │ credentials: "include" (Cookie HttpOnly)
┌────────────────▼────────────────┐
│ Backend FastAPI (Modular)       │
│ - Xác thực session tự quản lý   │
│ - Đảm bảo nguyên tử giao dịch   │
│ - Cưỡng chế phân quyền nghiệp vụ│
└────────────────┬────────────────┘
                 │ SQLAlchemy 2.x (async/sync driver)
┌────────────────▼────────────────┐
│ PostgreSQL 17 (Docker Volume)   │
│ - Dữ liệu tiền lưu số nguyên    │
│ - Check constraints & unique FK │
└─────────────────────────────────┘
```

> **Bảo mật quan trọng:** Không sử dụng Supabase hoặc bất kỳ BaaS nào. Frontend chỉ gọi REST API của FastAPI; không kết nối trực tiếp CSDL. Tiền VND lưu trữ bằng số nguyên (`BIGINT`), không dùng số thực (`float`/`double`).

---

## 3. Kiến trúc Frontend 4 Lớp (S-H-C-T)

Toàn bộ mã nguồn Frontend được chuẩn hóa theo mô hình 4 tầng tách biệt, loại bỏ hoàn toàn việc gọi trực tiếp `apiRequest` trong các file giao diện `.tsx`:

```text
┌────────────────────────────────────────────────────────┐
│  Component Layer (.tsx)                                │
│  - Trình diễn giao diện, Form, Modal, Feedback UI       │
└───────────────────────────┬────────────────────────────┘
                            │ sử dụng custom hook
┌───────────────────────────▼────────────────────────────┐
│  Hook Layer (hooks/use-<feature>.ts)                   │
│  - Quản lý React State, Filters, Memoized Computations │
│  - Điều phối làm mới dữ liệu & hiển thị Toast thông báo│
└───────────────────────────┬────────────────────────────┘
                            │ gọi pure service function
┌───────────────────────────▼────────────────────────────┐
│  Service Layer (<feature>-service.ts)                  │
│  - Giao tiếp Backend thuần túy qua apiRequest          │
│  - Chuẩn hóa payload, xử lý response typed             │
└───────────────────────────┬────────────────────────────┘
                            │ định nghĩa kiểu dữ liệu
┌───────────────────────────▼────────────────────────────┐
│  Types Layer (types.ts)                                │
│  - Domain models, Enum, Request/Response DTOs          │
└────────────────────────────────────────────────────────┘
```

- **Auth Module:** `auth-service.ts` + `useAuth()` (`auth-context.tsx`).
- **Personal Finance Module:** `personal-finance-service.ts` + `usePersonalFinance()`.
- **Group Finance Module:** `group-service.ts` + `useGroupManagement()`.
- **QR Payment Module:** `qr-service.ts` + `VietQRModal`.

---

## 4. Quản trị Nhóm & Thành viên Toàn diện

Hệ thống cung cấp trải nghiệm quản lý thành viên thông minh:
1. **Mời qua Gmail trực tiếp:** Trưởng nhóm / Quản trị viên nhập Gmail của thành viên đã đăng ký FlowPocket để thêm tức thì vào nhóm.
2. **Link mời công khai đa dụng (Multi-use Link):** Tạo liên kết mời dạng `?join_token=...` có thể chia sẻ cho nhiều thành viên tham gia cùng lúc mà không bị vô hiệu hóa sau 1 lượt bấm.
3. **Phân quyền vai trò (Role Management):**
   - **Chủ nhóm (`OWNER`):** Có toàn quyền, có thể chuyển nhượng quyền Chủ nhóm (Ownership Transfer) cho thành viên khác.
   - **Quản trị viên (`ADMIN`):** Có thể thêm/xóa thành viên thường (`MEMBER`), quản lý chi tiêu và quỹ nhóm.
   - **Thành viên (`MEMBER`):** Ghi chép chi tiêu, tham gia chia nợ, đóng góp và rút quỹ.
4. **Xóa thành viên an toàn:** Thành viên bị xóa sẽ bị thu hồi quyền truy cập, nhưng toàn bộ lịch sử chi tiêu, chia nợ và dòng tiền quá khứ vẫn được bảo toàn nguyên vẹn trên sổ cái tài chính.

---

## 5. Cách cấu hình API URL giữa các môi trường

Frontend sử dụng biến `NEXT_PUBLIC_API_BASE_URL` (hỗ trợ tương thích ngược `NEXT_PUBLIC_API_URL`):

- **Local Development:** `http://localhost:8001`
- **Docker Compose Production (qua Nginx):** `/api` (Nginx tự động proxy sang backend)
- **Vercel + Cloud Backend:** `https://api.flowpocket.example.com`

---

## 6. Hướng dẫn chạy cục bộ (Local Development)

### Bước 1: Khởi động PostgreSQL 17 bằng Docker

Tại thư mục gốc dự án:
```bash
docker compose -f infra/docker-compose.dev.yml up -d
```
Container `flowpocket-postgres` sẽ chạy và bind an toàn tại `127.0.0.1:5432`, dữ liệu được lưu bền vững trong volume `flowpocket_flowpocket_pgdata`.

Để kiểm tra trạng thái container:
```bash
docker compose -f infra/docker-compose.dev.yml ps
```

Để dừng container mà **không mất dữ liệu**:
```bash
docker compose -f infra/docker-compose.dev.yml stop
```

---

### Bước 2: Chạy Backend độc lập (FastAPI)

1. Di chuyển vào thư mục `backend`:
```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate       # Trên Windows
# source .venv/bin/activate    # Trên Linux / macOS

pip install -r requirements.txt
```

2. Chạy migration CSDL với Alembic:
```bash
alembic upgrade head
```

3. Khởi chạy máy chủ Backend (cổng 8001):
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```
- Endpoint Liveness: `http://127.0.0.1:8001/health`
- Endpoint Readiness (kiểm tra DB): `http://127.0.0.1:8001/ready`
- Swagger UI / OpenAPI docs: `http://127.0.0.1:8001/docs`

---

### Bước 3: Chạy Frontend độc lập (Next.js)

1. Mở một terminal mới và di chuyển vào `frontend`:
```bash
cd frontend
npm install
npm run dev
```

2. Truy cập ứng dụng tại: `http://localhost:3000`. Trang chủ sẽ tự động gọi backend và hiển thị trạng thái kết nối xanh `Sẵn sàng` & `Đã kết nối DB`.

---

## 7. Chạy Kiểm thử tự động (Automated Tests)

### Backend (Pytest):
```bash
cd backend
.\.venv\Scripts\pytest -v
```

### Frontend (Typecheck & Build):
```bash
cd frontend
npm run build
```

### Infrastructure (Kiểm tra cú pháp Compose):
```bash
docker compose -f infra/docker-compose.dev.yml config
```

---

## 8. Hướng dẫn Triển khai Độc lập (Deployment)

### A. Triển khai Frontend lên Vercel
Frontend hoàn toàn độc lập và không yêu cầu deploy kèm backend:
1. Kết nối Git repo với Vercel.
2. Thiết lập:
   - **Root Directory:** `frontend`
   - **Framework:** `Next.js`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
3. Cấu hình Environment Variable:
   - `NEXT_PUBLIC_API_BASE_URL` = URL public của Backend FastAPI.

### B. Triển khai Backend độc lập
Backend có thể được đóng gói và deploy thành Docker container riêng biệt:
```bash
cd backend
docker build -t flowpocket-backend .
docker run -d -p 8001:8001 --env-file ../.env flowpocket-backend
```

### C. Triển khai toàn bộ Stack Production với Nginx
```bash
docker compose -f infra/docker-compose.prod.yml up -d --build
```
Trong môi trường production:
- PostgreSQL không mở cổng ra ngoài Internet (chỉ giao tiếp trong Docker bridge network nội bộ).
- Nginx đóng vai trò Reverse Proxy tiếp nhận cổng 80/443.

---

## 9. Trạng thái xác minh (Verification Status)

- **Đã xác minh thực tế trên máy:**
  - PostgreSQL 17 container chạy và giữ nguyên volume `flowpocket_flowpocket_pgdata`.
  - Kết nối SQLAlchemy và health check database: `DB Connected: True`.
  - Pytest backend: `2 passed`.
  - Alembic migration `0001_baseline_init` phát hiện và chạy thành công trên DB (`0001_baseline_init (head)`).
  - Next.js production build (`npm run build`): Thành công (Exit code 0).
  - Docker compose config validation cho cả `docker-compose.dev.yml` và `docker-compose.prod.yml`: Thành công.
  - Supabase audit: 0 runtime dependencies.
- **Cấu hình chuẩn bị (Cần biến môi trường thật khi phát hành production):**
  - Cấu hình Nginx SSL/TLS và tên miền production thực tế.
  - Secret key production (`APP_SECRET_KEY`) và mật khẩu database production.
