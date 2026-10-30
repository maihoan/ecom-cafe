"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MenuCard from "@/components/MenuCard";
import { api, type Product } from "@/lib/api";
import { useCart } from "@/lib/useCart";

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { items, addProduct } = useCart();
  const itemCount = items.reduce((s, it) => s + it.qty, 0);

  useEffect(() => {
    api.getProducts().then(setProducts).catch((e) => setError(String(e)));
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))),
    [products]
  );

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-red-600">Không tải được menu: {error}</p>
        <p className="mt-2 text-sm text-stone-500">
          Nhớ chạy <code>npm run dev:api</code> trên cổng 8787 trước nhé.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Menu hôm nay</h1>
          <p className="text-stone-500">Đặt tại quán hoặc ship tận nơi.</p>
        </div>
        <Link
          href="/cart"
          className="rounded-xl bg-black text-white px-4 py-2 text-sm hover:bg-stone-800 transition"
        >
          🛒 Giỏ hàng ({itemCount})
        </Link>
      </div>

      {categories.length === 0 && (
        <p className="text-stone-500 py-10 text-center">Đang tải menu...</p>
      )}

      {categories.map((cat) => (
        <section key={cat} className="mb-8">
          <h2 className="text-xl font-semibold mb-3 text-stone-800">{cat}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products
              .filter((p) => p.category === cat)
              .map((p) => (
                <MenuCard key={p.id} product={p} onAdd={addProduct} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}