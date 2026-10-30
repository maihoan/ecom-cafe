import type { Product } from "@/lib/api";

/** Card hiển thị một món trong menu. */
export default function MenuCard({ product, onAdd }: { product: Product; onAdd: (p: Product) => void }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm hover:shadow-md transition overflow-hidden">
      <div className="h-36 bg-gradient-to-br from-amber-100 to-orange-50 flex items-center justify-center text-5xl">
        ☕
      </div>
      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold leading-tight">{product.name}</h3>
            <span className="text-xs text-stone-500">{product.category}</span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-lg font-bold text-emerald-700">
            {product.price.toLocaleString("vi-VN")}đ
          </span>
          <button
            onClick={() => onAdd(product)}
            className="rounded-lg bg-black px-3 py-1.5 text-sm text-white hover:bg-stone-800 active:scale-95 transition"
          >
            + Thêm vào giỏ
          </button>
        </div>
      </div>
    </div>
  );
}