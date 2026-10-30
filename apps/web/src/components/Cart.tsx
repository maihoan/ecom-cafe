"use client";

import { api, type CartItem } from "@/lib/api";

interface CartProps {
  items: CartItem[];
  total: number;
  onSetQty: (id: number, qty: number) => void;
  onRemove: (id: number) => void;
}

/** Danh sách món trong giỏ hàng. */
export default function Cart({ items, total, onSetQty, onRemove }: CartProps) {
  if (items.length === 0) {
    return (
      <p className="text-stone-500 text-center py-10">
        Giỏ hàng đang trống. Về trang chủ để chọn món nhé! ☕
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((it) => (
        <div
          key={it.id}
          className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3"
        >
          <div>
            <p className="font-medium">{it.name || `Món #${it.id}`}</p>
            <p className="text-sm text-stone-500">
              {(it.price ?? 0).toLocaleString("vi-VN")}đ / cái
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-stone-300 rounded-lg overflow-hidden">
              <button
                onClick={() => onSetQty(it.id, it.qty - 1)}
                className="px-2.5 py-1 hover:bg-stone-100"
              >
                −
              </button>
              <span className="w-8 text-center text-sm">{it.qty}</span>
              <button
                onClick={() => onSetQty(it.id, it.qty + 1)}
                className="px-2.5 py-1 hover:bg-stone-100"
              >
                +
              </button>
            </div>
            <span className="font-semibold w-24 text-right">
              {((it.price ?? 0) * it.qty).toLocaleString("vi-VN")}đ
            </span>
            <button
              onClick={() => onRemove(it.id)}
              className="text-red-500 hover:text-red-700 text-sm"
              aria-label="Xóa món"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between pt-2">
        <span className="font-semibold text-stone-600">Tổng cộng</span>
        <span className="text-2xl font-bold text-emerald-700">
          {total.toLocaleString("vi-VN")}đ
        </span>
      </div>
    </div>
  );
}