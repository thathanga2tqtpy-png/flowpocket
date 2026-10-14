import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="h-14 w-14 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center text-2xl font-bold mb-4 shadow-sm">
        404
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Trang không tồn tại</h2>
      <p className="text-xs text-slate-500 max-w-sm mb-6">
        Đường dẫn bạn yêu cầu không tìm thấy hoặc đã được chuyển đến vị trí khác.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold transition shadow-sm"
      >
        Trở về trang chủ
      </Link>
    </div>
  );
}
