"use client";

import { useState } from "react";
import Link from "next/link";
import Cart from "@/components/Cart";
import { api, type CartItem } from "@/lib/api";
import { useCart, getCustomerId } from "@/lib/useCart";

export default function CartPage() {
  const { items, loaded, setQty, removeItem, clear, total } = useCart();
  const [orderType, setOrderType] = useState<"instore" | "ship">("instore");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    if (orderType === "ship" && !address.trim()) {
      setStatus("error");
      setMessage("Vui lòng nhập địa chỉ giao hàng.");
      return;
    }

    setStatus("submitting");
    setMessage("");
    try {
      const order: CartItem[] = items.map((it) => ({
        id: it.id,
        name: it.name,
        price: it.price,
        qty: it.qty,
      }));
      const res = await api.createOrder({
        customer_id: getCustomerId(),
        type: orderType,
        address: orderType === "ship" ? address.trim() : undefined,
        items: order,
        total,
      });
      await clear();
      setStatus("done");
      setMessage(`Đặt món thành công! Mã đơn #${res.order_id}.`);
    } catch (err) {
      setStatus("error");
      setMessage(String(err));
    }
  };

  if (status === "done") {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold mb-2">Cảm ơn bạn!</h1>
        <p className="text-stone-600 mb-6">{message}</p>
        {orderType === "ship" && (
          <p className="text-sm text-stone-500 mb-6">
            Đơn sẽ được giao đến: <strong>{address}</strong>
          </p>
        )}
        <Link
          href="/"
          className="inline-block rounded-xl bg-black text-white px-5 py-2.5 hover:bg-stone-800"
        >
          Về trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Giỏ hàng</h1>
        <Link href="/" className="text-sm text-violet-600 hover:underline">
          ← Thêm món
        </Link>
      </div>

      {!loaded ? (
        <p className="text-stone-500 text-center py-10">Đang tải...</p>
      ) : items.length === 0 ? (
        <Cart items={items} total={total} onSetQty={setQty} onRemove={removeItem} />
      ) : (
        <form onSubmit={placeOrder} className="space-y-6">
          <Cart items={items} total={total} onSetQty={setQty} onRemove={removeItem} />

          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <h2 className="font-semibold mb-3">Hình thức nhận món</h2>
            <div className="flex gap-3">
              {(
                [
                  { v: "instore", label: "🏪 Đặt tại quán" },
                  { v: "ship", label: "🛵 Ship tới địa chỉ" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setOrderType(opt.v)}
                  className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                    orderType === opt.v
                      ? "border-black bg-black text-white"
                      : "border-stone-300 hover:border-stone-400"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {orderType === "ship" && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1" htmlFor="address">
                  Địa chỉ giao hàng
                </label>
                <input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="VD: 123 Nguyễn Trãi, Q.1, TP.HCM"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            )}
          </div>

          {status === "error" && (
            <p className="text-sm text-red-600">⚠️ {message}</p>
          )}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            {status === "submitting"
              ? "Đang đặt..."
              : `Đặt món — ${total.toLocaleString("vi-VN")}đ`}
          </button>
        </form>
      )}
    </div>
  );
}