# FlowPocket — Frontend Application

Giao diện người dùng Web & PWA cho ứng dụng **FlowPocket**, được xây dựng bằng **Next.js 14 (App Router)**, **TypeScript** và **Tailwind CSS**.

---

## 1. Cấu trúc thư mục chuẩn 4 Lớp (S-H-C-T)

Frontend được tổ chức theo chuẩn Feature-Sliced Architecture phân tầng nghiêm ngặt:

```text
frontend/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── globals.css           # Tailwind styling & CSS theme
│   │   ├── layout.tsx            # Root layout, AuthProvider & ToastContainer
│   │   ├── not-found.tsx         # Trang 404 thân thiện người dùng
│   │   └── page.tsx              # Main dashboard điều phối (Personal / Groups)
│   ├── components/               # Reusable UI components
│   │   ├── navbar.tsx            # Header navigation & User session popover
│   │   ├── toast.tsx             # Notification toast container & context
│   │   └── ui/                   # Shared UI primitives (MoneyInput, QR preview...)
│   ├── features/                 # Các module nghiệp vụ độc lập
│   │   ├── auth/                 # Quản thực thể người dùng & phiên đăng nhập
│   │   │   ├── auth-service.ts   # Pure API client (getMe, login, register, logout...)
│   │   │   ├── auth-context.tsx  # React Context & useAuth() hook
│   │   │   └── auth-modal.tsx    # Modal đăng nhập / đăng ký
│   │   ├── groups/               # Tài chính & chi tiêu nhóm
│   │   │   ├── group-service.ts  # Pure API client (expenses, funds, settlements, members...)
│   │   │   ├── hooks/            # useGroupManagement hook (toàn bộ state & effect)
│   │   │   ├── components/       # HeroCard, ExpenseList, DebtSection, MemberList...
│   │   │   ├── group-dashboard.tsx # Orchestrator điều phối giao diện nhóm
│   │   │   └── ... (các modals: expense, fund, settlement, invite, join...)
│   │   ├── personal-finance/     # Quản lý tài chính cá nhân
│   │   │   ├── personal-finance-service.ts # Pure API client (wallets, transactions, summaries...)
│   │   │   ├── hooks/            # usePersonalFinance hook (state ví, lọc, báo cáo)
│   │   │   ├── components/       # FilterPanel, BreakdownReports, CashFlowChart...
│   │   │   ├── personal-dashboard.tsx # Orchestrator điều phối giao diện cá nhân
│   │   │   └── ... (các modals: wallet, transaction, transfer...)
│   │   └── qr-payments/          # Tích hợp VietQR Napas
│   │       ├── qr-service.ts     # Generate & check VietQR API
│   │       └── components/       # VietQRModal & QR display
│   ├── lib/                      # Utilities
│   │   ├── api-client.ts         # Axios/Fetch wrapper chuẩn hóa cookie & credentials
│   │   ├── date-utils.ts         # Format ngày giờ tiếng Việt
│   │   └── number-to-words.ts    # Đọc số tiền VND thành chữ tiếng Việt
│   └── types/                    # TypeScript interfaces & domain types
├── public/                       # Static assets & manifest.webmanifest
├── package.json
└── README.md
```

---

## 2. Quy ước Lập trình & Kiến trúc (Coding Conventions)

1. **Không gọi trực tiếp `apiRequest` trong component giao diện (.tsx)**:
   - Mọi tương tác mạng với Backend **bắt buộc** phải đi qua file Service chuyên biệt (`auth-service.ts`, `group-service.ts`, `personal-finance-service.ts`, `qr-service.ts`).
   - Các hàm Service là hàm thuần túy (pure async functions), nhận tham số rõ ràng và trả về kiểu dữ liệu Promise được typed đầy đủ.

2. **Tách biệt State & Business Logic vào Custom Hooks**:
   - Giao diện `.tsx` (như `PersonalDashboard`, `GroupDashboard`) chỉ đóng vai trò Trình diễn (Presentation Orchestrator).
   - Toàn bộ State (bộ lọc, danh sách dữ liệu, loading state, hàm refresh) được gói gọn trong Custom Hooks (`usePersonalFinance`, `useGroupManagement`).

3. **Bảo toàn Số nguyên Tiền tệ**:
   - Tiền VND luôn xử lý bằng số nguyên (`number` nguyên), không làm tròn thập phân.
   - Nhập tiền tệ sử dụng component `MoneyInput` hỗ trợ định dạng hàng nghìn tự động và phím tắt thông minh (`+000`, `+00`, `+50k`).

---

## 3. Hướng dẫn chạy cục bộ (Local Development)

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

## 4. Biến môi trường (Environment Variables)

Tạo file `.env.local` trong thư mục `frontend/` (hoặc cấu hình tại nền tảng deploy):

```env
# URL trỏ tới API Backend FastAPI
NEXT_PUBLIC_API_BASE_URL=http://localhost:8001
```

> **Lưu ý bảo mật:** Các biến `NEXT_PUBLIC_*` được nhúng vào mã nguồn client-side tải về trình duyệt. Tuyệt đối không lưu mật khẩu DB, khóa bí mật backend (`APP_SECRET_KEY`) vào các biến này.

---

## 5. Kiểm thử và Build Production

```bash
# Typecheck & Build Next.js
npm run build

# Chạy bản build production
npm start
```

---

## 6. Hướng dẫn Deploy độc lập lên Vercel

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

