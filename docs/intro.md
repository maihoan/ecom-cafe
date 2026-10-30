# Ecommerce Cafe — Giới Thiệu Công Nghệ

> Dự án ecommerce tinh gọn cho quán cafe, triển khai trên hệ sinh thái **Cloudflare**.
> Tài liệu này giới thiệu chi tiết từng thành phần công nghệ: Cloudflare Workers, D1, KV, R2, Next.js, TailwindCSS.

---

## Mục lục

1. [Sơ đồ tổng quan](#1-sơ-đồ-tổng-quan)
2. [Cloudflare Workers](#2-cloudflare-workers)
3. [Cloudflare D1 (Cơ sở dữ liệu)](#3-cloudflare-d1)
4. [Cloudflare KV (Lưu giỏ hàng)](#4-cloudflare-kv)
5. [Cloudflare R2 (Lưu file/hình ảnh)](#5-cloudflare-r2)
6. [Next.js (Frontend)](#6-nextjs-frontend)
7. [TailwindCSS (Giao diện)](#7-tailwindcss-giao-diện)
8. [HonoJS (Backend)](#8-honojs-backend)
9. [Mô hình ÁP DỤNG cho dự án](#9-mô-hình-áp-dụng-cho-dự-án)
10. [So sánh nhanh & lưu ý](#10-so-sánh-nhanh--lưu-ý)

---

## 1. Sơ đồ tổng quan

```
                         ┌─────────────────────────┐
                         │      Người dùng         │
                         │  (Browser / Mobile)     │
                         └───────────┬─────────────┘
                                     │ HTTPS
                                     ▼
                    ┌──────────────────────────────────┐
                    │      Cloudflare Workers          │
                    │  ┌──────────────┐ ┌────────────┐ │
                    │  │  Frontend    │ │  Backend   │ │
                    │  │  Next.js     │ │  HonoJS    │ │
                    │  └──────┬───────┘ └─────┬──────┘ │
                    └─────────┼───────────────┼────────┘
                              │               │
                 ┌────────────▼────┐   ┌──────▼────────┐
                 │   D1 (SQL)      │   │  KV (giỏ hàng)│
                 │  danh sách món  │   │  khách hàng   │
                 └─────────────────┘   └───────────────┘
                              │
                 ┌────────────▼────────────┐
                 │   R2 (hình món, ảnh)     │
                 └─────────────────────────┘
```

**Luồng hoạt động:**

1. **Frontend (Next.js)** chạy trên Cloudflare Workers phục vụ giao diện khách hàng (trang chủ, giỏ hàng).
2. Mỗi hành động của khách → gọi **Backend (HonoJS)** qua API.
3. Backend đọc/ghi **D1** (danh sách sản phẩm), truy xuất/đọc **KV** (giỏ hàng theo khách), load hình ảnh từ **R2**.
4. Admin dùng trang quản trị để cập nhật sản phẩm, theo dõi đơn.

> ⚠️ **Lưu ý kiến trúc thực tế:** Trong readme ban đầu, Backend = HonoJS, Frontend = Next.js. Một trong hai kiểu triển khai phổ biến:
> - **Tách riêng:** HonoJS là một Worker backend độc lập (một worker), Next.js là worker frontend khác.
> - **Gộp chung:** HonoJS chạy như API route trong worker chính.
> Cả hai đều hợp lệ; tùy vào quy mô dự án.

---

## 2. Cloudflare Workers

### 2.1 Là gì?

**Cloudflare Workers** là một **runtime biên (edge runtime)** chạy mã JavaScript/TypeScript **trên toàn mạng lưới cạnh (edge network)** của Cloudflare — hơn 300 thành phố trên toàn cầu.

- Bạn viết code như một hàm xử lý request, Cloudflare tự động chạy nó **gần người dùng nhất**.
- Khởi động trong **miligiây** (thay vì vài giây như server truyền thống).
- Không cần quản lý server, không cần bảo trì hạ tầng.

### 2.2 Mô hình "Worker" (Model)

Một Worker cơ bản là một hàm nhận `request` và trả về `response`:

```ts
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/hello") {
      return new Response("Xin chào từ Cloudflare Workers!", {
        headers: { "content-type": "text/plain" },
      });
    }
    return new Response("Không tìm thấy", { status: 404 });
  },
};
```

### 2.3 Ưu điểm chính

- **Chi phí thấp:** Gói free 100.000 request/ngày — rất phù hợp dự án khởi nghiệp/quán cafe.
- **Không máy chủ (Serverless):** Không phải trả tiền khi idle.
- **Đa vùng (Global edge):** Người dùng ở Hà Nội, Sài Gòn, Mỹ... đều được phục vụ từ trạm gần nhất.
- **Môi trường Web API:** Có sẵn `fetch`, `crypto`, `Cache API`... quen thuộc với lập trình viên web.

### 2.4 Giới hạn cần biết

- **Cold start có tồn tại** nhưng rất nhỏ (vài ms) so với serverless truyền thống.
- **Tài nguyên giới hạn:** CPU time (thường 10–30s cho free), memory (128MB–512MB).
- Không phù hợp workload nặng, chạy lâu, hoặc phụ thuộc quá nhiều vào Node API có giới hạn (chỉ hỗ trợ một phần).

---

## 3. Cloudflare D1

### 3.1 Là gì?

**Cloudflare D1** là cơ sở dữ liệu **SQLite dạng serverless**, triển khai trên một trong các data center của Cloudflare. Đây là phần dự án dùng để **lưu danh sách sản phẩm** (món quán).

### 3.2 Đặc điểm

- **SQL thực thụ:** Dùng đúng cú pháp SQL (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `JOIN`...).
- **Serverless & tự scale:** Không phải cấu hình replica, tự mở rộng.
- **Tương thích Worker:** Kết nối trực tiếp từ Cloudflare Workers qua binding.
- **Có thể dùng qua CLI (Drizzle ORM / raw SQL):** Hỗ trợ Drizzle ORM, hoặc truy vấn trực tiếp.

### 3.3 Cách dùng trong Worker

```ts
// wrangler.toml
// [[d1_databases]]
// binding = "DB"
// database_name = "cafe-products"
// database_id = "..."

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // env.DB là object truy cập D1
    const { results } = await env.DB.prepare("SELECT * FROM products WHERE available = ?")
      .bind(1)
      .all();
    return Response.json(results);
  },
};
```

### 3.4 Ví dụ bảng sản phẩm cho dự án

```sql
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,          -- Tên món (vd: "Cà phê sữa đá")
  category TEXT,               -- Danh mục (Cà phê, Trà, Nước ép...)
  price INTEGER NOT NULL,      -- Giá (đơn vị: đồng/đ)
  image_url TEXT,              -- Đường dẫn ảnh (lưu trên R2)
  available INTEGER DEFAULT 1, -- 1 = còn bán, 0 = hết món
  created_at TEXT DEFAULT (datetime('now'))
);
```

### 3.5 Giới hạn / cân nhắc

- **Không tốt cho tải ghi (write) cực cao** hoặc cần giao dịch phân tán.
- **Mỗi D1 instance đặt tại 1 vùng** — cần cân nhắc `primary_location` cho dữ liệu gần người dùng mục tiêu.
- Dữ liệu quan hệ phức tạp vẫn làm được nhưng đơn giản nhất cho các app vừa nhỏ như quán cafe.

---

## 4. Cloudflare KV

### 4.1 Là gì?

**Cloudflare Workers KV (Key-Value store)** là kho lưu trữ **khóa-giá trị (key/value)** kiểu cặp đôi, cực nhanh để đọc. Dự án dùng KV để **lưu giỏ hàng của khách hàng**.

### 4.2 Đặc điểm

- **Cấu trúc đơn giản:** `key` → `value` (value được serialize, thường là chuỗi/JSON).
- **Đọc nhanh từ edge:** Rất phù hợp dữ liệu đọc nhiều, đọc ở biên.
- **Ghi có độ trễ (eventual consistency):** Dữ liệu mới ghi có thể **mất đến ~60 giây** để lan sang các vùng khác.
- **Chi phí thấp, hạn mức free hào phóng.**

### 4.3 Cách dùng trong Worker

```ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Đọc giỏ hàng theo mã khách
    const cartKey = `cart:${url.searchParams.get("customer") ?? "guest"}`;
    const cart = await env.CART.get(cartKey);

    if (request.method === "POST") {
      const body = await request.json();
      // Ghi giỏ hàng
      await env.CART.put(cartKey, JSON.stringify(body.items), { expirationTtl: 86400 });
      return new Response("Đã lưu giỏ hàng");
    }

    return new Response(cart ?? "[]");
  },
};
```

> 💡 **Nên dùng KV khi:**
> - Giỏ hàng của khách cần đọc/ghi nhanh theo `customer_id`.
> - Không yêu cầu truy vấn phức tạp (vì KV không lọc theo field trong value).
> - Dữ liệu có thể chấp nhận "eventual consistency" (vd: sửa chữa giỏ hàng trong vài chục giây).

### 4.4 So sánh KV với D1

| Tiêu chí | D1 | KV |
|---|---|---|
| Kiểu dữ liệu | Quan hệ (bảng, có schema) | Key → Value phẳng |
| Truy vấn | SQL, lọc, join | Chỉ đọc theo key |
| Consistency | Đọc-ghi nhất quán | Ghi lan truyền từ từ (eventual) |
| Dùng cho | Danh sách sản phẩm (đúng) | Giỏ hàng / cache / session (đúng) |

---

## 5. Cloudflare R2

### 5.1 Là gì?

**Cloudflare R2** là **object storage** (lưu trữ file dạng object) tương thích **S3 API**. Dự án dùng để lưu **hình ảnh món ăn, logo, file tĩnh** (theme của dự án cafe).

### 5.2 Đặc điểm nổi bật

- **Zero egress fee (miễn phí tải ra):** Khác với S3, bạn **không trả phí khi khách xem ảnh**. Rất có lợi cho app hiển thị nhiều hình ảnh.
- **Tương thích S3 HTTP API:** Có thể dùng SDK/CLI quen thuộc (aws-sdk, boto3).
- **Tích hợp chặt với Workers/D1/KV** trong cùng hệ sinh thái.

### 5.3 Cách dùng trong Worker

```ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Upload ảnh
    if (url.pathname === "/upload" && request.method === "PUT") {
      const key = `menu/${Date.now()}.jpg`;
      await env.IMAGES.put(key, request.body);
      return new Response(`Đã upload: ${key}`);
    }

    // Tải ảnh xuống
    const object = await env.IMAGES.get(url.pathname.replace("/images/", ""));
    if (object === null) return new Response("Không tìm thấy ảnh", { status: 404 });
    return new Response(object.body);
  },
};
```

### 5.4 Kết hợp với Worker hiển thị ảnh

R2 **không phục vụ file trực tiếp** cho công chúng (trừ khi bật public bucket). Thông thường:

- Hoặc **bật public access** cho bucket ảnh (cache qua CDN Cloudflare).
- Hoặc **ủy quyền qua Worker/Hono** để kiểm soát quyền, cache, watermark.

> 💡 **Gợi ý cho dự án cafe:** Bật public access cho bucket ảnh menu, dùng CDN cache — ảnh món tải nhanh, miễn phí egress.

---

## 6. Next.js (Frontend)

### 6.1 Là gì?

**Next.js** là framework React phổ biến, cung cấp:
- **SSR/SSG** (Server-Side Rendering / Static Generation).
- **Routing** theo thư mục (App Router mới) hoặc Pages Router.
- **API routes** tích hợp.
- **Chạy trên Cloudflare Workers** thông qua adapter `@cloudflare/next-on-pages` (nay là `@opennextjs/cloudflare`).

### 6.2 Vai trò trong dự án

| Vai trò | Thành phần |
|---|---|
| Trang chủ | Hiện danh sách món (đọc từ backend) |
| Giỏ hàng | Tương tác, gửi yêu cầu đặt món |
| Thanh toán/đặt món | Form: đặt tại quán hoặc ship tới địa chỉ |

### 6.3 Ví dụ trang chủ (App Router)

```
app/
  layout.tsx
  page.tsx          ← Trang chủ, hiện menu
  cart/
    page.tsx        ← Trang giỏ hàng
```

```tsx
// app/page.tsx
export default async function HomePage() {
  const res = await fetch(`${process.env.API_URL}/products`);
  const products = await res.json();

  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold">Menu quán cafe</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {products.map((p) => (
          <div key={p.id} className="card shadow p-4">
            <img src={p.image_url} alt={p.name} className="rounded" />
            <h2>{p.name}</h2>
            <p className="text-green-600 font-semibold">
              {Number(p.price).toLocaleString("vi-VN")} đ
            </p>
            <button className="btn-primary">Thêm vào giỏ</button>
          </div>
        ))}
      </div>
    </main>
  );
}
```

### 6.4 Chạy Next.js trên Cloudflare Workers

```bash
# Chuẩn bị môi trường
npm install
npx wrangler login

# Build theo adapter Cloudflare
npm run build        # tạo worker bundle

# Deploy lên Cloudflare Edge
npx wrangler deploy
```

> ⚠️ **Lưu ý:** Next.js không phải tất cả tính năng đều tương thích 100% với Workers (vd: Node runtime của Server Components không được hỗ trợ đầy đủ trong các bản đầu). Nên bật `nodejs_compat` trong `wrangler.toml` nếu dùng dependency cần Node API.

---

## 7. TailwindCSS (Giao diện)

### 7.1 Là gì?

**TailwindCSS** là framework CSS **utility-first**: thay vì viết class tùy ý trong `style.css`, bạn dùng hàng trăm class tiện ích (`flex`, `text-center`, `p-4`, `bg-red-500`...) trực tiếp trong HTML/JSX.

### 7.2 Lợi ích

- **Viết giao diện nhanh** mà không cần đặt tên class.
- **Tự dọn code CSS không dùng** (tree-shaking) → file CSS nhỏ.
- Nhất quán: dùng cùng một bảng màu/spacing trong toàn dự án.
- Tích hợp tốt với React/Next.js.

### 7.3 Ví dụ

```tsx
<button className="bg-green-600 hover:bg-green-700 text-white font-medium
                   px-4 py-2 rounded-lg transition">
  Thêm vào giỏ 🛒
</button>
```

Tương đương CSS:
```css
button.menu-add { background: #16a34a; color: white; padding: 0.5rem 1rem; border-radius: 0.5rem; }
button.menu-add:hover { background: #15803d; }
```

### 7.4 Cài đặt với Next.js

```bash
npm install tailwindcss @tailwindcss/postcss postcss
# hoặc với Tailwind v4 (mới)
npx @tailwindcss/cli@next init
```

Cấu hình `globals.css`:
```css
@import "tailwindcss";
```
Và trong `layout.tsx`:
```tsx
import "./globals.css";
```

---

## 8. HonoJS (Backend)

### 8.1 Là gì?

**Hono** (HonoJS) là framework web **siêu nhẹ, siêu nhanh** cho Workers:

```ts
import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => c.text("Xin chào"));
app.get("/products", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM products").all();
  return c.json(results);
});

app.post("/cart", async (c) => {
  const body = await c.req.json();
  await c.env.CART.put(`cart:${body.customer}`, JSON.stringify(body.items));
  return c.json({ ok: true });
});

export default app;
```

### 8.2 Vì sao chọn Hono cho Workers?

- **Bundle size cực nhỏ** (~14KB), khởi động nhanh trên edge.
- **Hỗ trợ TypeScript tốt**, type-safe bindings cho D1/KV/R2.
- Có **middleware, logger, validator**... như framework lớn.
- Được thiết kế **dành riêng cho Workers** (cùng tác giả/ecosystem với Cloudflare).

---

## 9. Mô hình ÁP DỤNG cho dự án

Kết hợp lại, dự án quán cafe có thể tổ chức như sau:

```
d:\ecom\
├─ readme.md
├─ wrangler.toml            ← cấu hình project Cloudflare (bindings)
├─ src/
│  ├─ index.ts              ← entry worker (hoặc route Hono backend)
│  └─ ...
├─ app/                     ← nếu dùng Next.js App Router
│  ├─ layout.tsx
│  ├─ page.tsx              ← trang chủ (menu)
│  ├─ cart/page.tsx         ← giỏ hàng
│  └─ globals.css           ← Tailwind entry
├─ data/
│  └─ seed.sql / seed.json  ← bộ dữ liệu mẫu để test local
└─ docs/
   └─ intro.md              ← tài liệu này
```

### Workflow chuẩn (local → deploy)

```bash
# 1. Cài dependencies, cấu hình D1 local
npx wrangler d1 create cafe-products
npx wrangler d1 execute cafe-products --file=./data/seed.sql

# 2. Chạy local (mô phỏng ổ Workflow serverless có cả D1, KV, R2)
npm run dev

# 3. Deploy toàn bộ lên Edge
npx wrangler deploy
```

---

## 10. So sánh nhanh & lưu ý

### Tổng kết vai trò từng công nghệ

| Công nghệ | Vai trò | Ghi chú cho dự án |
|---|---|---|
| **Workers** | Nền tảng runtime | Chạy HonoJS backend + Next.js frontend |
| **D1** | Database | Danh sách món, đơn hàng |
| **KV** | Key-Value | Giỏ hàng khách, cache |
| **R2** | Object storage | Ảnh món ăn, file tĩnh |
| **Next.js** | Frontend React | Giao diện khách hàng, SSR |
| **TailwindCSS** | CSS utility | Giao diện nhanh, đẹp |

### Lưu ý triển khai thực tế

1. **Consistency của KV:** Giỏ hàng ghi bằng KV có thể mất ~60s mới chốt ở mọi vùng. Với use-case cafe tại một chi nhánh thì không vấn đề.
2. **Node.js compat:** Nếu dùng Next.js/hono có dependency Node, bật `nodejs_compat = true` trong `wrangler.toml`.
3. **Ảnh R2:** Cân nhắc public bucket kết hợp CDN cache để khách xem ảnh món nhanh, miễn phí egress.
4. **Seed data:** Dự án đã có sẵn bộ dữ liệu mẫu để test local — nên đặt trong `data/seed.sql` và chạy bằng `wrangler d1 execute`.

---

*Tài liệu mô tả stack như trong readme.md của dự án. Chi tiết triển khai thực tế có thể tinh chỉnh thêm.*