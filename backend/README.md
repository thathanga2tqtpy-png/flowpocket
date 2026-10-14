# FlowPocket — Backend Service

Dịch vụ Backend REST API cho ứng dụng **FlowPocket**, được xây dựng bằng **FastAPI**, **SQLAlchemy 2.x**, **Alembic** và **PostgreSQL**.

---

## 1. Cấu trúc thư mục

```text
backend/
├── app/
│   ├── main.py              # Entrypoint FastAPI app, middleware CORS, health/readiness endpoints
│   ├── api/                 # API routers và endpoints theo phiên bản
│   ├── core/                # Cấu hình môi trường (config.py), security, errors
│   ├── db/                  # Session SQLAlchemy, connection pooling, healthcheck DB
│   ├── models/              # SQLAlchemy ORM models
│   ├── schemas/             # Pydantic validation schemas
│   ├── repositories/        # Data access layer
│   └── services/            # Business logic layer
├── alembic/                 # Alembic migrations history & environment
│   └── versions/            # Các file migration từng phiên bản
├── tests/                   # Pytest automated test suite
├── Dockerfile               # Production Docker container
├── requirements.txt         # Python dependencies
├── pytest.ini               # Pytest configuration
├── alembic.ini              # Alembic configuration
└── README.md
```

---

## 2. Hướng dẫn chạy cục bộ (Local Development)

### Yêu cầu
- Python 3.11+
- PostgreSQL 17 (chạy qua Docker hoặc local server)

### Cài đặt và kích hoạt môi trường ảo:
```bash
# Tại thư mục backend/
python -m venv .venv
.\.venv\Scripts\activate       # Windows
# source .venv/bin/activate    # Linux / macOS

pip install -r requirements.txt
```

### Chạy Database Migrations:
```bash
alembic upgrade head
```

Kiểm tra trạng thái migration:
```bash
alembic current
```

### Khởi chạy FastAPI Server:
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

- **Health check (Liveness):** `http://127.0.0.1:8001/health`
- **Readiness check (DB connected):** `http://127.0.0.1:8001/ready`
- **Interactive OpenAPI docs (Swagger):** `http://127.0.0.1:8001/docs`

---

## 3. Kiểm thử tự động (Automated Testing)

Chạy bộ test bằng pytest:
```bash
.\.venv\Scripts\pytest -v
```

---

## 4. Build và Chạy bằng Docker

```bash
docker build -t flowpocket-backend .
docker run -p 8001:8001 --env-file ../.env flowpocket-backend
```

