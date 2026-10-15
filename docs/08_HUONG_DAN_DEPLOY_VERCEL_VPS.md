# HƯỚNG DẪN DEPLOY TOÀN DIỆN FLOWPOCKET
## Frontend trên Vercel + Backend trên VPS (Docker) + Domain miễn phí & SSL HTTPS

---

## I. KIẾN TRÚC TRIỂN KHAI (ARCHITECTURE)

```
       [ Người dùng / Trình duyệt ]
                     │
      ┌──────────────┴──────────────┐
      ▼                             ▼
[ FRONTEND ]                  [ BACKEND ]
Vercel Edge Platform          VPS Ubuntu (2GB RAM+)
URL: https://flowpocket.vercel.app   URL: https://flowpocket-api.duckdns.org
(Next.js 14 App Router)       (Nginx Reverse Proxy + SSL Let's Encrypt)
                                    │
                              ┌─────┴──────────────┐
                              ▼                    ▼
                        Docker Container     Docker Container
                         (FastAPI App)       (PostgreSQL 17)
```

* **Frontend**: Deploy lên **Vercel** (miễn phí, tự động CI/CD khi push Git, SSL HTTPS có sẵn).
* **Backend**: Chạy **Docker Compose** trên VPS (FastAPI + PostgreSQL 17).
* **Domain miễn phí**: Dùng **DuckDNS** (miễn phí 100%, vĩnh viễn, không cần thẻ tín dụng).
* **Bảo mật HTTPS**: Dùng **Certbot (Let's Encrypt)** cấp chứng chỉ SSL miễn phí tự động gia hạn.

---

## II. BƯỚC 1: ĐĂNG KÝ DOMAIN MIỄN PHÍ VỚI DUCKDNS

1. Truy cập [https://www.duckdns.org](https://www.duckdns.org) và đăng nhập bằng tài khoản GitHub hoặc Google.
2. Tại mục **Domains**, chọn một subdomain mong muốn (ví dụ: `flowpocket-api`).
3. Điền **địa chỉ IPv4 Public của VPS** vào ô **current ip**.
4. Bấm **add domain**.
5. Bạn sẽ sở hữu tên miền miễn phí: `flowpocket-api.duckdns.org` trỏ thẳng về VPS.

> **Kiểm tra**: Mở Terminal trên máy tính gõ:
> ```bash
> ping flowpocket-api.duckdns.org
> ```
> Nếu hiển thị đúng IP của VPS là cấu hình DNS đã thành công!

---

## III. BƯỚC 2: CẤU HÌNH VPS & CHẠY DOCKER BACKEND

### 1. Cài đặt Docker & Nginx trên VPS (Ubuntu 22.04 / 24.04)

Đăng nhập vào VPS qua SSH:
```bash
ssh root@YOUR_VPS_IP
```

Cập nhật hệ thống và cài đặt Docker, Git, Nginx, Certbot:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ufw nginx certbot python3-certbot-nginx

# Cài đặt Docker Engine & Docker Compose Plugin
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl enable docker
sudo systemctl start docker
```

Mở cổng Firewall cần thiết:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

### 2. Clone mã nguồn FlowPocket về VPS

```bash
cd /opt
sudo git clone https://github.com/YOUR_GITHUB_USERNAME/flowpocket.git
cd flowpocket
```

---

### 3. Cấu hình biến môi trường Production (`.env`)

Tạo file `.env` tại thư mục gốc `/opt/flowpocket`:
```bash
cp .env.example .env
nano .env
```

Điền nội dung cấu hình thực tế cho VPS:
```env
# =============================================================================
# PRODUCTION ENVIRONMENT CONFIGURATION
# =============================================================================

APP_ENV=production
APP_SECRET_KEY=FLOWPOCKET_SUPER_SECRET_KEY_RANDOM_CHANGE_ME_64_CHARS_MINIMUM_2026!

# Database PostgreSQL
POSTGRES_DB=flowpocket
POSTGRES_USER=flowpocket_admin
# Lưu ý: Mật khẩu KHÔNG chứa ký tự @ hoặc $ vì sẽ gây lỗi cú pháp connection string
POSTGRES_PASSWORD=FlowPocketDatabasePass2026SecureCode

# Port nội bộ container backend (không expose ra ngoài internet, Nginx sẽ reverse proxy)
BACKEND_PORT=8001

# CORS & Cookie bảo mật Cross-Site (Frontend Vercel <-> Backend VPS)
# (Thay bằng URL Vercel thực tế của bạn sau khi tạo project trên Vercel)
FRONTEND_ORIGIN=https://flowpocket.vercel.app
CORS_ORIGINS=["https://flowpocket.vercel.app"]

# Bắt buộc bật Secure và SameSite=None cho cross-domain cookie giữa Vercel và VPS
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=none
```

> **Lưu ý bảo mật quan trọng**:
> * `SESSION_COOKIE_SECURE=true` và `SESSION_COOKIE_SAMESITE=none`: Bắt buộc để trình duyệt gửi HttpOnly Cookie từ domain Vercel sang domain VPS qua HTTPS.
> * `APP_SECRET_KEY`: Tạo chuỗi ngẫu nhiên bằng lệnh:
>   ```bash
>   python3 -c "import secrets; print(secrets.token_urlsafe(48))"
>   ```

---

### 4. Khởi chạy Docker Containers (Postgres & FastAPI Backend)

Tạo file docker-compose chạy riêng Postgres và Backend trên VPS:
```bash
docker compose -f infra/docker-compose.prod.yml up -d --build postgres backend
```

Kiểm tra trạng thái containers:
```bash
docker compose -f infra/docker-compose.prod.yml ps
```
Cả hai container `flowpocket-postgres-prod` và `flowpocket-backend-prod` phải ở trạng thái `Up`.

---

### 5. Chạy Migration CSDL Alembic

Chạy lệnh migration để tự động tạo toàn bộ bảng và dữ liệu seed danh mục ban đầu:
```bash
docker compose -f infra/docker-compose.prod.yml exec backend alembic upgrade head
```

Kiểm tra log backend xem có khởi động thành công không:
```bash
docker compose -f infra/docker-compose.prod.yml logs -f backend
```
Thấy thông báo: `Application startup complete. Uvicorn running on http://0.0.0.0:8001` là hoàn tất!

---

### 6. Cấu hình Nginx Reverse Proxy & Chứng chỉ SSL HTTPS Miễn phí

Tạo file cấu hình Nginx cho tên miền DuckDNS:
```bash
sudo nano /etc/nginx/sites-available/flowpocket-api
```

Dán nội dung cấu hình sau (thay `flowpocket-api.duckdns.org` bằng tên miền DuckDNS của bạn):
```nginx
server {
    server_name flowpocket-api.duckdns.org;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Hỗ trợ WebSocket và timeout dài cho các tác vụ tính toán
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 90s;
    }
}
```

Kích hoạt site và kiểm tra cú pháp Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/flowpocket-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Cấp chứng chỉ SSL HTTPS miễn phí tự động bằng Certbot:
```bash
sudo certbot --nginx -d flowpocket-api.duckdns.org
```
* Nhập email của bạn khi được hỏi.
* Đồng ý điều khoản (chọn `Y`).
* Chọn chuyển hướng tự động HTTP sang HTTPS (Redirect HTTP to HTTPS).

> **Kiểm tra Backend API**:
> Mở trình duyệt truy cập: `https://flowpocket-api.duckdns.org/health`
> Kết quả hiển thị: `{"status":"ok","database":"connected"}` có biểu tượng ổ khóa xanh 🔒 là backend đã sẵn sàng 100%!

---

## IV. BƯỚC 3: DEPLOY FRONTEND LÊN VERCEL

### 1. Đưa mã nguồn lên GitHub
Đảm bảo mã nguồn dự án của bạn đã được push lên repository GitHub (Public hoặc Private đều được).

### 2. Import Project vào Vercel
1. Truy cập [https://vercel.com](https://vercel.com) và đăng nhập bằng tài khoản GitHub.
2. Bấm **Add New...** $\rightarrow$ **Project**.
3. Chọn repository chứa mã nguồn `flowpocket` và bấm **Import**.

### 3. Cấu hình Vercel Build Settings
Trên trang cấu hình dự án Vercel:
* **Project Name**: `flowpocket` (hoặc tên tùy chọn).
* **Framework Preset**: Chọn `Next.js`.
* **Root Directory**: Bấm nút **Edit** và chọn thư mục `frontend` (Rất quan trọng!).
* **Build Command**: Để mặc định (`next build`).
* **Output Directory**: Để mặc định (`.next`).

### 4. Cấu hình Environment Variables trên Vercel
Tại mục **Environment Variables**, thêm biến môi trường:

| Key | Value | Ghi chú |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_BASE_URL` | `https://flowpocket-api.duckdns.org` | Trỏ về domain backend HTTPS trên VPS |

5. Bấm nút **Deploy**.
6. Chờ khoảng 1-2 phút, Vercel sẽ build xong và cung cấp cho bạn một URL dạng:
   `https://flowpocket.vercel.app` (hoặc `https://flowpocket-xxx.vercel.app`).

---

## V. BƯỚC 4: ĐỒNG BỘ CORS GIỮA VERCEL VÀ VPS

Sau khi có URL Vercel chính thức (ví dụ: `https://flowpocket.vercel.app`), bạn cần quay lại VPS cập nhật cấu hình CORS để Backend cho phép Frontend kết nối:

Trên VPS:
```bash
cd /opt/flowpocket
nano .env
```

Cập nhật lại 2 dòng:
```env
FRONTEND_ORIGIN=https://flowpocket.vercel.app
CORS_ORIGINS=["https://flowpocket.vercel.app"]
```

Khởi động lại container backend để nhận cấu hình mới:
```bash
docker compose -f infra/docker-compose.prod.yml restart backend
```

---

## VI. BƯỚC 5: CHECKLIST KIỂM THỬ HOÀN CHỈNH (END-TO-END)

1. **Truy cập web app**: Mở trình duyệt vào URL Vercel `https://flowpocket.vercel.app`.
2. **Đăng ký tài khoản mới**:
   * Nhập Email, Mật khẩu, Tên hiển thị $\rightarrow$ Đăng ký.
   * Kiểm tra thông báo thành công và chuyển hướng vào Dashboard.
3. **Kiểm tra Cookie Session**:
   * Bấm `F12` $\rightarrow$ Tab **Application** $\rightarrow$ **Cookies** $\rightarrow$ `https://flowpocket-api.duckdns.org`.
   * Thấy cookie `flowpocket_session` có cờ `HttpOnly`, `Secure` và `SameSite=None`.
4. **Tạo Ví ngân hàng**:
   * Bấm **+ Thêm ví mới** $\rightarrow$ Chọn loại **Tài khoản ngân hàng**.
   * Chọn ngân hàng (VD: MBBank), điền STK và Tên chủ tài khoản.
5. **Kiểm tra tính năng Quét QR & Nhận tiền**:
   * Bấm **Nhận QR**: Kiểm tra mã VietQR Napas hiển thị đúng STK của ví.
   * Bấm **Quét QR**: Tải ảnh một mã QR VietQR lên kiểm tra khả năng bóc tách số tiền và mở deeplink ngân hàng.
6. **Đăng xuất & Đăng nhập lại**: Đảm bảo phiên làm việc được duy trì và thu hồi chuẩn xác.

---

## VII. XỬ LÝ SỰ CỐ THƯỜNG GẶP (TROUBLESHOOTING)

| Lỗi gặp phải | Nguyên nhân | Cách khắc phục |
| :--- | :--- | :--- |
| **Network Error / Failed to fetch** | Backend chưa bật SSL HTTPS hoặc CORS chặn | Kiểm tra backend có truy cập được qua HTTPS không. Kiểm tra `CORS_ORIGINS` trong file `.env` trên VPS đã có đúng domain Vercel chưa. |
| **403 Forbidden - Origin mismatch** | Cơ chế chống tấn công CSRF phát hiện domain chưa khai báo | Thêm domain Vercel vào `CORS_ORIGINS` và `FRONTEND_ORIGIN` trong `.env` rồi restart backend. |
| **Đăng nhập thành công nhưng F5 bị văng ra trang Login** | Trình duyệt chặn cookie cross-site | Đảm bảo trong `.env` có `SESSION_COOKIE_SECURE=true` và `SESSION_COOKIE_SAMESITE=none`, và cả FE lẫn BE đều phải chạy qua HTTPS. |
| **Không truy cập được IP VPS qua cổng 80/443** | Nhà cung cấp VPS chặn cổng firewall | Vào trang quản trị Cloud VPS (DigitalOcean, AWS, Linode, OVH, v.v.), kiểm tra mục **Security Groups / Firewall Rules** và mở inbound rule cho cổng `80` và `443`. |
| **Tự động gia hạn SSL DuckDNS** | Certbot cần tự gia hạn sau mỗi 90 ngày | Chạy thử kiểm tra gia hạn tự động: `sudo certbot renew --dry-run`. Nginx và Certbot đã tự động thiết lập cronjob gia hạn. |

---

## VIII. LỆNH VẬN HÀNH THƯỜNG DÙNG TRÊN VPS

* **Xem logs backend thời gian thực**:
  ```bash
  docker compose -f infra/docker-compose.prod.yml logs -f backend
  ```
* **Cập nhật code mới khi có commit Git**:
  ```bash
  cd /opt/flowpocket
  git pull origin main
  docker compose -f infra/docker-compose.prod.yml up -d --build backend
  docker compose -f infra/docker-compose.prod.yml exec backend alembic upgrade head
  ```
* **Khởi động lại toàn bộ dịch vụ**:
  ```bash
  docker compose -f infra/docker-compose.prod.yml restart
  ```
* **Sao lưu dữ liệu PostgreSQL**:
  ```bash
  docker compose -f infra/docker-compose.prod.yml exec postgres pg_dump -U flowpocket_admin flowpocket > backup_$(date +%Y%m%d).sql
  ```

