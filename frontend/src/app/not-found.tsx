import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">404 - Không tìm thấy trang</h2>
      <p className="text-sm text-slate-500 mb-4">Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.</p>
      <Link
        href="/"
        className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition"
      >
        Trở về trang chủ
      </Link>
    </div>
  );
}

