# FlowPocket — Frontend Application

Giao diện người dùng Web & PWA cho ứng dụng **FlowPocket**, được xây dựng bằng **Next.js 14 (App Router)**, **TypeScript** và **Tailwind CSS**.

---

## 1. Cấu trúc thư mục

```text
frontend/
├── src/
│   ├── app/                 # Next.js App Router (pages, layout, styles)
│   │   ├── globals.css      # Tailwind styling
│   │   ├── layout.tsx       # Root layout & PWA viewport
│   │   └── page.tsx         # Trang chủ kiểm tra hệ thống & trạng thái kết nối
│   ├── components/          # Reusable UI components
│   ├── features/            # Feature modules (auth, personal-finance, groups...)
│   ├── lib/                 # Tiện ích chung, api-client.ts
│   └── types/               # TypeScript interfaces & types
├── public/                  # Static assets & manifest.webmanifest
├── Dockerfile               # Multi-stage production container
├── package.json             # NPM dependencies & scripts
├── tailwind.config.ts       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
└── README.md
```

---

## 2. Hướng dẫn chạy cục bộ (Local Development)

### Yêu cầu
- Node.js 18+ (khuyên dùng Node 20+)
- Backend FastAPI đang chạy (mặc định tại `http://localhost:8001`)

### Cài đặt và khởi chạy:
```bash
# Tại thư mục frontend/
npm install
npm run dev
```

Mở trình duyệt tại: `http://localhost:3000`

---

## 3. Biến môi trường (Environment Variables)

Tạo file `.env.local` trong thư mục `frontend/` (hoặc cấu hình tại nền tảng deploy):

```env
# URL trỏ tới API Backend FastAPI
NEXT_PUBLIC_API_BASE_URL=http://localhost:8001
```

> **Lưu ý bảo mật:** Các biến `NEXT_PUBLIC_*` được nhúng vào mã nguồn client-side tải về trình duyệt. Tuyệt đối không lưu mật khẩu DB, khóa bí mật backend (`APP_SECRET_KEY`) vào các biến này.

---

## 4. Kiểm thử và Build Production

```bash
# Typecheck & Build Next.js
npm run build

# Chạy bản build production
npm start
```

---

## 5. Hướng dẫn Deploy độc lập lên Vercel

Frontend được thiết kế để có thể deploy riêng biệt trên **Vercel** mà không cần build hay deploy lại backend:

1. Kết nối Git repository FlowPocket với Vercel Dashboard.
2. Tại mục **Project Settings**:
   - **Root Directory:** Chọn `frontend` (Bắt buộc).
   - **Framework Preset:** `Next.js`.
   - **Build Command:** `npm run build` (mặc định).
   - **Output Directory:** `.next` (mặc định).
   - **Install Command:** `npm install` (mặc định).
3. Tại mục **Environment Variables**:
   - Thêm biến: `NEXT_PUBLIC_API_BASE_URL` = `<URL-backend-production-của-bạn>` (Ví dụ: `https://api.flowpocket.example.com`).
4. Nhấn **Deploy**. Vercel sẽ tự động build frontend độc lập mà không cần môi trường Python hay Docker.

