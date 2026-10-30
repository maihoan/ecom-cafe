"use client";

import { useEffect, useState } from "react";
import { api, type Order, type Product } from "@/lib/api";

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<"products" | "orders">("products");
  const [newProduct, setNewProduct] = useState({ name: "", category: "", price: "" });
  const [msg, setMsg] = useState("");

  const refresh = () => {
    api.getAllProducts().then(setProducts).catch(() => {});
    api.getOrders().then(setOrders).catch(() => {});
  };

  useEffect(refresh, []);

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(newProduct.price);
    if (!newProduct.name || !newProduct.category || Number.isNaN(price) || price <= 0) {
      setMsg("Vui lòng nhập đầy đủ tên, danh mục và giá hợp lệ.");
      return;
    }
    await api.addProduct({ ...newProduct, price });
    setNewProduct({ name: "", category: "", price: "" });
    setMsg("Đã thêm món mới ✓");
    refresh();
  };

  const toggleAvailable = async (p: Product) => {
    await api.updateProduct(p.id, { ...p, available: p.available ? 0 : 1 });
    refresh();
  };

  const removeProduct = async (p: Product) => {
    if (!confirm(`Xóa món "${p.name}"?`)) return;
    await api.deleteProduct(p.id);
    refresh();
  };

  const updateStatus = async (o: Order, status: string) => {
    await api.updateOrderStatus(o.id, status);
    refresh();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Trang quản trị</h1>

      <div className="flex gap-2 mb-6">
        {(
          [
            { v: "products", label: `Món (${products.length})` },
            { v: "orders", label: `Đơn hàng (${orders.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.v}
            onClick={() => setTab(t.v)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.v ? "bg-black text-white" : "bg-white border border-stone-300 hover:bg-stone-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {msg && <p className="mb-4 text-sm text-emerald-700">{msg}</p>}

      {tab === "products" && (
        <div className="grid md:grid-cols-[1fr_360px] gap-6">
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-stone-100 text-stone-600">
                <tr>
                  <th className="text-left p-3">ID</th>
                  <th className="text-left p-3">Tên</th>
                  <th className="text-left p-3">Danh mục</th>
                  <th className="text-right p-3">Giá</th>
                  <th className="text-center p-3">Trạng thái</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-t border-stone-100">
                    <td className="p-3 text-stone-500">{p.id}</td>
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3 text-stone-500">{p.category}</td>
                    <td className="p-3 text-right">{p.price.toLocaleString("vi-VN")}đ</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => toggleAvailable(p)}
                        className={`text-xs px-2 py-1 rounded-full ${
                          p.available
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-stone-200 text-stone-500"
                        }`}
                      >
                        {p.available ? "Đang bán" : "Đã ẩn"}
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => removeProduct(p)} className="text-red-500 hover:text-red-700">
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form onSubmit={addProduct} className="rounded-xl border border-stone-200 bg-white p-4 h-fit">
            <h2 className="font-semibold mb-3">➕ Thêm món</h2>
            <label className="block text-sm font-medium mb-1">Tên món</label>
            <input
              value={newProduct.name}
              onChange={(e) => setNewProduct((s) => ({ ...s, name: e.target.value }))}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-3"
            />
            <label className="block text-sm font-medium mb-1">Danh mục</label>
            <input
              value={newProduct.category}
              onChange={(e) => setNewProduct((s) => ({ ...s, category: e.target.value }))}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-3"
              placeholder="Cà phê / Trà / Sinh tố..."
            />
            <label className="block text-sm font-medium mb-1">Giá (đ)</label>
            <input
              type="number"
              value={newProduct.price}
              onChange={(e) => setNewProduct((s) => ({ ...s, price: e.target.value }))}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm mb-4"
              placeholder="25000"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-black py-2 text-white hover:bg-stone-800"
            >
              Thêm món
            </button>
          </form>
        </div>
      )}

      {tab === "orders" && (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-100 text-stone-600">
              <tr>
                <th className="text-left p-3">ID</th>
                <th className="text-left p-3">Khách</th>
                <th className="text-left p-3">Loại</th>
                <th className="text-left p-3">Địa chỉ</th>
                <th className="text-right p-3">Tổng</th>
                <th className="text-center p-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-stone-500">
                    Chưa có đơn hàng.
                  </td>
                </tr>
              )}
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-stone-100">
                  <td className="p-3 text-stone-500">#{o.id}</td>
                  <td className="p-3">{o.customer_id}</td>
                  <td className="p-3">{o.type === "ship" ? "🛵 Ship" : "🏪 Tại quán"}</td>
                  <td className="p-3 text-stone-500">{o.address || "—"}</td>
                  <td className="p-3 text-right font-medium">
                    {Number(o.total).toLocaleString("vi-VN")}đ
                  </td>
                  <td className="p-3 text-center">
                    <select
                      value={o.status}
                      onChange={(e) => updateStatus(o, e.target.value)}
                      className="text-xs border border-stone-300 rounded px-2 py-1"
                    >
                      <option value="new">Mới</option>
                      <option value="preparing">Đang làm</option>
                      <option value="done">Hoàn tất</option>
                      <option value="cancelled">Hủy</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}