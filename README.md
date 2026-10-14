# FlowPocket

Ứng dụng quản lý tài chính cá nhân và chi tiêu nhóm theo kiến trúc **Modular Monolith**.

---

## 1. Công nghệ sử dụng

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, Lucide Icons (PWA Online-first).
- **Backend:** Python 3.11+, FastAPI (REST API), Pydantic v2.
- **Database:** PostgreSQL 17 (chạy độc lập qua Docker Compose, dữ liệu lưu bền vững trong Docker volume).
- **ORM & Migrations:** SQLAlchemy 2.x & Alembic.
- **Xác thực:** Hệ thống tài khoản riêng (bảng `app_users`, session backend mã hóa token Argon2id, cookie HttpOnly).
- **Kiểm thử:** Pytest.
- **Bảo mật:** Không sử dụng Supabase hay bất kỳ BaaS nào; backend trực tiếp quản lý dữ liệu và kiểm tra phân quyền.

---

## 2. Yêu cầu môi trường

- **Node.js:** 18+ (khuyên dùng Node 20+)
- **Python:** 3.11+
- **Docker & Docker Compose**

---

## 3. Khởi động dự án cục bộ

### Bước 1: Khởi động Cơ sở dữ liệu PostgreSQL

```bash
docker compose up -d postgres
```

Kiểm tra container đang chạy:
```bash
docker compose ps
```

### Bước 2: Cài đặt và chạy Backend (FastAPI)

1. Mở terminal tại thư mục gốc:
```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate       # Windows
# source .venv/bin/activate    # Linux/macOS
pip install -r requirements.txt
```

2. Chạy database migrations với Alembic:
```bash
alembic upgrade head
```

3. Khởi chạy máy chủ Backend (cổng 8001):
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

- Endpoint sức khỏe: `http://127.0.0.1:8001/health`
- Endpoint kiểm tra DB readiness: `http://127.0.0.1:8001/ready`
- Swagger UI / OpenAPI docs: `http://127.0.0.1:8001/docs`

### Bước 3: Cài đặt và chạy Frontend (Next.js)

1. Mở terminal mới:
```bash
cd frontend
npm install
npm run dev
```

2. Truy cập ứng dụng tại: `http://localhost:3000`

---

## 4. Chạy kiểm thử tự động (Automated Tests)

Chạy pytest cho backend:
```bash
cd backend
.\.venv\Scripts\pytest -v
```

---

## 5. Quy tắc cấu hình môi trường (.env)

Sao chép `.env.example` thành `.env` ở thư mục gốc:
```bash
cp .env.example .env
```
Các thông số chính:
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`: thông tin tài khoản DB.
- `DATABASE_URL`: chuỗi kết nối chỉ backend sử dụng.
- `APP_SECRET_KEY`: khóa bí mật ký session/CSRF (tối thiểu 32 ký tự).
- `NEXT_PUBLIC_API_URL`: đường dẫn API backend cho frontend.

