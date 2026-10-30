# Hướng dẫn chạy Local Dev — Ecommerce Cafe

Tài liệu hướng dẫn chi tiết cách chạy dự án **Ecommerce Cafe** trên máy của bạn
(environment: Windows 11, Git Bash / Node v24).

---

## Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Yêu cầu hệ thống](#2-yêu-cầu-hệ-thống)
3. [Cài đặt dependencies](#3-cài-đặt-dependencies)
4. [Chuẩn bị database D1 (seed)](#4-chuẩn-bị-database-d1-seed)
5. [Chạy Backend (Hono worker)](#5-chạy-backend-hono-worker)
6. [Chạy Frontend (Next.js)](#6-chạy-frontend-nextjs)
7. [Kiểm tra end-to-end](#7-kiểm-tra-end-to-end)
8. [Các lệnh hữu ích khác](#8-các-lệnh-hữu-ích-khác)
9. [Xử lý sự cố (Troubleshooting)](#9-xử-lý-sự-cố-troubleshooting)

---

## 1. Tổng quan kiến trúc

```
http://localhost:3000          http://localhost:8787
   ┌─────────────┐  rewrite     ┌──────────────────────┐
   │  Next.js    │  /api/* ───► │   Hono (Worker)     │
   │  (apps/web) │◄─────────────│   (apps/api)        │
   └──────┬──────┘     JSON     └──────┬──────────────┘
          │                            │
          │                 ┌──────────┴──────────┐
          │                 │  Miniflare (local)  │
          │                 │  ├─ D1  → DB        │
          │                 │  ├─ KV  → CART       │
          │                 │  └─ R2  → IMAGES     │
          │                 └─────────────────────┘
          ▼
    localStorage (giỏ hàng tạm)
```

- **apps/api** — backend HonoJS chạy trên **Cloudflare Workers** (qua `wrangler dev`).
  Dùng **D1** lưu sản phẩm & đơn hàng, **KV** lưu giỏ hàng khách, **R2** (sẵn binding) cho ảnh.
- **apps/web** — frontend Next.js + Tailwind. Khi gọi `/api/*`, Next **rewrite** sang
  `localhost:8787/api/*` nên trình duyệt không dính CORS.

> ⚠️ **Quan trọng:** Cả hai tiến trình phải chạy **đồng thời** trong 2 terminal khác nhau.
> Frontend không đứng riêng được — rewrite cần backend :8787 đang mở.

---

## 2. Yêu cầu hệ thống

| Thứ | Yêu cầu | Kiểm tra |
|---|---|---|
| Node.js | ≥ 18 (đã test trên **v24**) | `node -v` |
| npm | ≥ 10 | `npm -v` |
| Git Bash / bash | cho các lệnh nhanh | — |

**Không cần** đăng nhập Cloudflare cho chạy local (Miniflare giả lập D1/KV/R2 trên máy).

---

## 3. Cài đặt dependencies

Mở terminal tại thư mục gốc dự án `d:\ecom`:

```bash
npm install
```

Tự động cài dependencies cho cả 2 workspace (`apps/api`, `apps/web`) và `wrangler`.

> 💡 **Lần đầu cài:** npm có thể hỏi approve install-scripts của `esbuild` và `workerd`
> (hai package bắt buộc cho wrangler). Nếu thấy cảnh báo:
> ```bash
> npm install-scripts approve esbuild workerd
> npm rebuild esbuild workerd
> ```

---

## 4. Chuẩn bị database D1 (seed)

Seed tạo 2 bảng (`products`, `orders`) và chèn sẵn **10 món mẫu** vào D1 local:

```bash
npm run seed
```

Lệnh này chạy (`apps/api/package.json`):
`wrangler d1 execute ecom-db --local --file=./data/seed.sql`

**Kết quả mong đợi** (tương tự):

```
🌀 Executing on local database ecom-db (...) from .wrangler\state\v3\d1:
🚣 3 commands executed successfully.
```

Dữ liệu D1 local lưu tại `apps/api/.wrangler/state/v3/d1/` (đã nằm trong `.gitignore`).

> 🔁 Muốn **reset dữ liệu**: xóa thư mục `apps/api/.wrangler` rồi chạy lại `npm run seed`.

---

## 5. Chạy Backend (Hono worker)

**Terminal 1** — tại gốc dự án:

```bash
npm run dev:api
```

Tương đương: `wrangler dev --port 8787 --local` trong `apps/api`.

**Kết quả mong đợi:**

```
wrangler 4.x
 ⛅️ Starting local server...
 getting ready...
✌️ Couldn't infer the runtime Bindings...
...
➜ Listening on http://localhost:8787
```

Kiểm tra nhanh bằng lệnh (mở terminal mới):

```bash
curl http://localhost:8787/api/products
```

→ Trả về JSON `{"products":[{"id":1,"name":"Cà phê sữa đá",...},...]}`.

> ⚠️ Nếu trả `[]` (rỗng) hoặc lỗi bảng không tồn tại → chưa chạy `npm run seed`.

---

## 6. Chạy Frontend (Next.js)

**Terminal 2** — cũng tại gốc dự án:

```bash
npm run dev:web
```

Tương đương: `next dev -p 3000` trong `apps/web`.

**Kết quả mong đợi:**

```
 ▲ Next.js 15.x
   - Local:   http://localhost:3000
 ✓ Ready in Xs
```

Mở trình duyệt:
| Trang | URL | Chức năng |
|---|---|---|
| 🏠 Trang chủ (menu) | `http://localhost:3000` | Xem món theo danh mục, thêm vào giỏ |
| 🛒 Giỏ hàng | `http://localhost:3000/cart` | Sửa số lượng, đặt tại quán / ship |
| 🛠 Admin | `http://localhost:3000/admin` | Thêm/ẩn/xóa món, theo dõi đơn hàng |

---

## 7. Kiểm tra end-to-end

Sau khi **cả 2 terminal đang chạy**, thực hiện luồng mua hàng hoàn chỉnh:

1. **Trang chủ** `http://localhost:3000` → thấy menu 10 món.
2. Bấm **"+ Thêm vào giỏ"** vài món → nút "Giỏ hàng (n)" tăng.
3. Vào **Giỏ hàng** → chỉnh số lượng, chọn **"🏪 Đặt tại quán"** → bấm **Đặt món**.
4. Thấy màn hình "Cảm ơn bạn! Mã đơn #1".
5. Vào **Admin → Đơn hàng** → thấy đơn mới trạng thái **Mới**, có thể đổi trạng thái.

Kiểm tra backend trực tiếp (tuỳ chọn):

```bash
# Giỏ hàng KV
curl -X PUT http://localhost:8787/api/cart/guest1 -H "content-type: application/json" \
  -d '{"items":[{"id":1,"name":"Cà phê sữa đá","price":25000,"qty":2}]}'
curl http://localhost:8787/api/cart/guest1

# Tạo đơn ship
curl -X POST http://localhost:8787/api/orders -H "content-type: application/json" \
  -d '{"customer_id":"guest2","type":"ship","address":"123 Nguyễn Trãi","items":[{"id":7,"price":35000,"qty":1}],"total":35000}'

# Danh sách đơn
curl http://localhost:8787/api/orders

# Debug endpoint
curl http://localhost:8787/
```

> 💡 **Mẹo:** Frontend gọi `localhost:3000/api/products` **không phải** `:8787`.
> Rewrite trong [next.config.mjs](../apps/web/next.config.mjs) tự chuyển — nếu muốn
> trỏ API host khác, đặt biến môi trường `API_URL` (mặc định `http://localhost:8787`).

---

## 8. Các lệnh hữu ích khác

```bash
npm run build        # build production Next.js (0 lỗi TypeScript mong đợi)
npm -w apps/web run start   # chạy bản đã build (cần build trước)
npm -w apps/api run deploy  # deploy lên Cloudflare (cần wrangler login) — KHÔNG làm ở local
```

Bảng script root:

| Script | Thực thi | Đích |
|---|---|---|
| `dev:api` | `wrangler dev --port 8787 --local` | Backend Hono |
| `dev:web` | `next dev -p 3000` | Frontend Next.js |
| `seed` | `wrangler d1 execute ecom-db --local --file=./data/seed.sql` | Nạp D1 local |
| `build` | `next build` | Build production web |

---

## 9. Xử lý sự cố (Troubleshooting)

### 1. `npm run seed` báo lỗi "Unexpected fields found: nodejs_compat"
Đã sửa bằng `compatibility_flags = ["nodejs_compat"]` trong `wrangler.toml`.
Nếu gặp lại, kiểm tra file [wrangler.toml](../apps/api/wrangler.toml).

### 2. `curl :8787/api/products` trả về code `000` (không kết nối được)
→ **Backend chưa chạy.** Mở Terminal 1 `npm run dev:api`, chờ thấy `Listening on http://localhost:8787`.

### 3. Trang chủ báo "Không tải được menu..."
→ Rewrite `/api/*` không tới được worker. Kiểm tra:
- Backend :8787 đang chạy chưa?
- Thử `curl http://localhost:3000/api/products` — phải trả JSON.

### 4. Dữ liệu menu trống (`[]`)
→ `npm run seed` chưa chạy hoặc D1 local bị xóa. Chạy lại `npm run seed`.

### 5. Lỗi install scripts `esbuild` / `workerd`
```bash
npm install-scripts approve esbuild workerd
npm rebuild esbuild workerd
```

### 6. Cổng bị chiếm (EADDRINUSE)
- Backend: sửa cổng trong `dev:api` (root package.json) hoặc chạy `npx wrangler dev --port 8788`.
- Frontend: đổi `-p 3001`, và nhớ cập nhật rewrite trong `next.config.mjs` nếu cần.

### 7. Tiếng Việt hiển thị `?` trên console
Chỉ là lỗi encoding hiển thị đầu cuối (Windows console không phải UTF-8).
Dữ liệu lưu trong D1/KV vẫn đúng UTF-8, web render đúng.

---

*Tài liệu dựa trên phiên chạy thực tế (Node v24, npm 11, wrangler 4.151.1, Next.js 15.5).*