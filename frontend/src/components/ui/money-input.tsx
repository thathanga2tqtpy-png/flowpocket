"use client";

import React, { useState, useEffect, useRef } from "react";
import { numberToVietnameseWords } from "@/lib/number-to-words";
import { Sparkles, Delete, RotateCcw } from "lucide-react";

interface MoneyInputProps {
  id?: string;
  name?: string;
  value: number;
  onChange: (value: number) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  /** Có hiển thị dòng chữ đọc số tiền Tiếng Việt không (mặc định: true) */
  showWords?: boolean;
  /** Có hiển thị hàng nút bấm số 0 và cộng nhanh không (mặc định: true) */
  showQuickButtons?: boolean;
  /** Giá trị tối thiểu (mặc định: 0) */
  min?: number;
  /** Giá trị tối đa (mặc định: 10 tỷ) */
  max?: number;
}

export function MoneyInput({
  id,
  name,
  value,
  onChange,
  label,
  placeholder = "0",
  required = false,
  disabled = false,
  error,
  className = "",
  showWords = true,
  showQuickButtons = true,
  min = 0,
  max = 10_000_000_000,
}: MoneyInputProps) {
  // Chuỗi hiển thị bên trong input (đã format dấu chấm)
  const [displayValue, setDisplayValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Đồng bộ displayValue khi prop value bên ngoài thay đổi
  useEffect(() => {
    if (value === 0 || isNaN(value)) {
      setDisplayValue("");
    } else {
      setDisplayValue(formatNumberString(value.toString()));
    }
  }, [value]);

  // Format số với dấu chấm phân cách hàng nghìn (Việt Nam)
  function formatNumberString(rawStr: string): string {
    const cleanStr = rawStr.replace(/\D/g, "");
    if (!cleanStr) return "";
    return parseInt(cleanStr, 10).toLocaleString("vi-VN");
  }

  // Parse chuỗi có hỗ trợ ký tự tắt: k/K (nghìn), m/M/tr/TR (triệu)
  function parseAmountWithShorthand(input: string): number {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) return 0;

    // Kiểm tra hậu tố "tr" hoặc "m" (triệu)
    if (trimmed.endsWith("tr") || trimmed.endsWith("m")) {
      const numPart = trimmed.replace(/tr|m/g, "").replace(/\./g, "").replace(/,/g, ".");
      const val = parseFloat(numPart);
      return isNaN(val) ? 0 : Math.round(val * 1_000_000);
    }

    // Kiểm tra hậu tố "k" (nghìn)
    if (trimmed.endsWith("k")) {
      const numPart = trimmed.replace(/k/g, "").replace(/\./g, "").replace(/,/g, ".");
      const val = parseFloat(numPart);
      return isNaN(val) ? 0 : Math.round(val * 1_000);
    }

    // Nhập số thông thường (loại bỏ mọi ký tự không phải số)
    const rawDigits = trimmed.replace(/\D/g, "");
    return rawDigits ? parseInt(rawDigits, 10) : 0;
  }

  // Xử lý khi người dùng gõ phím
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawText = e.target.value;

    // Cho phép người dùng gõ chữ k, m, tr
    if (/[kmtr]/i.test(rawText)) {
      setDisplayValue(rawText);
      const parsed = parseAmountWithShorthand(rawText);
      const clamped = Math.min(Math.max(parsed, min), max);
      onChange(clamped);
      return;
    }

    // Chỉ giữ lại số
    const cleanDigits = rawText.replace(/\D/g, "");
    if (!cleanDigits) {
      setDisplayValue("");
      onChange(0);
      return;
    }

    const num = parseInt(cleanDigits, 10);
    const clamped = Math.min(Math.max(num, min), max);
    setDisplayValue(clamped.toLocaleString("vi-VN"));
    onChange(clamped);
  };

  // Blur thì format chuẩn lại nếu đang dùng shorthand k/m/tr
  const handleBlur = () => {
    if (value > 0) {
      setDisplayValue(value.toLocaleString("vi-VN"));
    } else {
      setDisplayValue("");
    }
  };

  // Thêm nhanh số 0 (nhân 10, nhân 100, nhân 1000)
  const handleMultiply = (multiplier: number) => {
    if (disabled) return;
    const current = value || 0;
    // Nếu hiện tại là 0 mà ấn +000 thì coi như chưa có số gốc, hoặc nếu có số thì nhân lên
    if (current === 0) {
      return;
    }
    const newVal = Math.min(current * multiplier, max);
    onChange(newVal);
    setDisplayValue(newVal.toLocaleString("vi-VN"));
    inputRef.current?.focus();
  };

  // Cộng thêm một lượng tiền cố định (+10k, +50k, +100k, +500k)
  const handleAddAmount = (amountToAdd: number) => {
    if (disabled) return;
    const current = value || 0;
    const newVal = Math.min(current + amountToAdd, max);
    onChange(newVal);
    setDisplayValue(newVal.toLocaleString("vi-VN"));
    inputRef.current?.focus();
  };

  // Xóa về 0
  const handleClear = () => {
    if (disabled) return;
    onChange(0);
    setDisplayValue("");
    inputRef.current?.focus();
  };

  const words = value > 0 ? numberToVietnameseWords(value) : "";

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-slate-700 tracking-tight"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Input container */}
      <div className="relative rounded-xl shadow-2xs">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={`w-full px-3.5 py-2.5 text-base sm:text-lg font-bold tracking-tight rounded-xl border transition-all outline-hidden pr-12 text-slate-900 bg-white placeholder:text-slate-300 placeholder:font-normal ${
            error
              ? "border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
              : "border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 hover:border-slate-400"
          } ${disabled ? "bg-slate-100 text-slate-400 cursor-not-allowed" : ""}`}
        />

        {/* Đơn vị tiền tệ VND bên phải */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-xs font-bold text-slate-400">
          ₫
        </div>
      </div>

      {/* Hiển thị lỗi nếu có */}
      {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}

      {/* Đọc thành chữ tiếng Việt (Chống sai sót số 0) */}
      {showWords && words && (
        <div className="flex items-start gap-1.5 px-2 py-1 rounded-lg bg-sky-50/70 border border-sky-100 text-sky-800 text-[11px] leading-relaxed animate-in fade-in duration-150">
          <Sparkles className="h-3.5 w-3.5 text-sky-600 shrink-0 mt-0.5" />
          <span className="font-medium italic">{words}</span>
        </div>
      )}

      {/* Các nút bấm nhanh hỗ trợ thêm số 0 và cộng tiền */}
      {showQuickButtons && !disabled && (
        <div className="pt-1 flex flex-wrap items-center gap-1.5">
          {/* Nút thêm số 0 thông minh */}
          <div className="inline-flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => handleMultiply(1000)}
              title="Thêm 3 số 0 (nhân 1.000)"
              className="px-2 py-1 text-[11px] font-bold bg-white text-indigo-700 hover:bg-indigo-50 border border-slate-200 rounded-md shadow-2xs transition active:scale-95 cursor-pointer"
            >
              +000
            </button>
            <button
              type="button"
              onClick={() => handleMultiply(100)}
              title="Thêm 2 số 0 (nhân 100)"
              className="px-1.5 py-1 text-[11px] font-semibold bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-md shadow-2xs transition active:scale-95 cursor-pointer"
            >
              +00
            </button>
          </div>

          {/* Các mức tiền nhanh thông dụng */}
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleAddAmount(10000)}
              className="px-2 py-1 text-[11px] font-medium bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-md transition active:scale-95 cursor-pointer"
            >
              +10k
            </button>
            <button
              type="button"
              onClick={() => handleAddAmount(50000)}
              className="px-2 py-1 text-[11px] font-medium bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-md transition active:scale-95 cursor-pointer"
            >
              +50k
            </button>
            <button
              type="button"
              onClick={() => handleAddAmount(100000)}
              className="px-2 py-1 text-[11px] font-medium bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-md transition active:scale-95 cursor-pointer"
            >
              +100k
            </button>
            <button
              type="button"
              onClick={() => handleAddAmount(500000)}
              className="px-2 py-1 text-[11px] font-medium bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-md transition active:scale-95 cursor-pointer"
            >
              +500k
            </button>
          </div>

          {/* Nút reset về 0 nếu có giá trị */}
          {value > 0 && (
            <button
              type="button"
              onClick={handleClear}
              title="Xóa về 0"
              className="px-1.5 py-1 text-[11px] font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition active:scale-95 ml-auto flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Xóa</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

