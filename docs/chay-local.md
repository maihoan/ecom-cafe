# Hướng dẫn chạy Local — Ecommerce Cafe

Tài liệu này hướng dẫn chạy toàn bộ dự án **Ecommerce Cafe** trên máy của bạn, không cần tài khoản Cloudflare. Sau khi làm xong, bạn sẽ có:

- Backend Hono chạy ở `http://localhost:8787`, đọc/ghi dữ liệu vào **D1** (SQLite) và **KV** giả lập trên máy.
- Frontend Next.js chạy ở `http://localhost:3000` với trang menu, giỏ hàng và trang admin.

Tài liệu viết cho sinh viên: mỗi bước có lệnh cụ thể, kết quả mong đợi và cách kiểm tra.

---

## Mục lục

1. [Kiến trúc và cách hai phần nói chuyện với nhau](#1-kiến-trúc-và-cách-hai-phần-nói-chuyện-với-nhau)
2. [Yêu cầu hệ thống](#2-yêu-cầu-hệ-thống)
3. [Bước 1 — Lấy mã nguồn và cài dependencies](#3-bước-1--lấy-mã-nguồn-và-cài-dependencies)
4. [Bước 2 — Tạo schema và dữ liệu mẫu cho D1 local](#4-bước-2--tạo-schema-và-dữ-liệu-mẫu-cho-d1-local)
5. [Bước 3 — Chạy backend (terminal 1)](#5-bước-3--chạy-backend-terminal-1)
6. [Bước 4 — Chạy frontend (terminal 2)](#6-bước-4--chạy-frontend-terminal-2)
7. [Bước 5 — Kiểm tra từng phần](#7-bước-5--kiểm-tra-từng-phần)
8. [Bước 6 — Thực hành: đặt một đơn hàng end-to-end](#8-bước-6--thực-hành-đặt-một-đơn-hàng-end-to-end)
9. [Reset dữ liệu và các lệnh hữu ích](#9-reset-dữ-liệu-và-các-lệnh-hữu-ích)
10. [Cấu trúc thư mục cần biết](#10-cấu-trúc-thư-mục-cần-biết)
11. [Xử lý sự cố](#11-xử-lý-sự-cố)
12. [Bài tập gợi ý](#12-bài-tập-gợi-ý)

---

## 1. Kiến trúc và cách hai phần nói chuyện với nhau

```
 Trình duyệt
     │
     ├── http://localhost:3000  ──►  Next.js (apps/web)
     │                                 trang /, /cart, /admin
     │                                 gọi API bằng fetch(NEXT_PUBLIC_API_URL + path)
     │
     └── http://localhost:8787  ──►  Hono Worker (apps/api), chạy bằng wrangler dev
                                       ├── /api/products   → D1  (binding DB)
                                       ├── /api/orders     → D1  (binding DB)
                                       ├── /api/cart/:id   → KV  (binding CART)
                                       └── /img/placeholder.svg → SVG sinh tự động
```

Điểm quan trọng để hiểu lỗi sau này:

- **Trình duyệt gọi thẳng backend ở `localhost:8787`.** Frontend không có proxy/rewrite. Backend bật CORS (`cors()` trong [apps/api/src/index.ts](../apps/api/src/index.ts)) nên việc này hoạt động.
- Địa chỉ backend do biến **`NEXT_PUBLIC_API_URL`** quyết định. Nếu không đặt, mặc định là `http://localhost:8787` ([apps/web/src/lib/api.ts](../apps/web/src/lib/api.ts)).
- **D1 và KV ở local không phải dịch vụ thật.** `wrangler dev --local` dùng Miniflare để tạo dữ liệu trong thư mục `.wrangler/` của `apps/api`. Không cần đăng nhập Cloudflare.
- Ảnh món dùng **SVG placeholder** được sinh bởi backend (`/img/placeholder.svg?category=...&name=...`), không dùng R2.

> ⚠️ Cần **hai terminal chạy song song**: một cho backend, một cho frontend. Nếu tắt backend, trang chủ sẽ không tải được menu.

---

## 2. Yêu cầu hệ thống

| Phần mềm | Phiên bản | Kiểm tra |
|---|---|---|
| Node.js | ≥ 18 (dự án đã test trên v24) | `node -v` |
| npm | ≥ 10 | `npm -v` |
| Git | bất kỳ | `git --version` |
| Terminal | Git Bash, PowerShell hoặc cmd | — |

Không cần tài khoản Cloudflare cho phần local.

---

## 3. Bước 1 — Lấy mã nguồn và cài dependencies

```bash
git clone https://github.com/maihoan/ecom-cafe.git
cd ecom-cafe
npm install
```

> Nếu bạn đã có thư mục dự án, chỉ cần `cd` vào thư mục gốc (thư mục chứa `package.json` có `"workspaces": ["apps/*"]`).

`npm install` ở gốc sẽ cài dependencies cho cả hai workspace `apps/api` và `apps/web`, kèm `wrangler`.

**Kết quả mong đợi:** lệnh kết thúc không có dòng `ERR!`.

**Nếu npm cảnh báo về install-scripts của `esbuild` hoặc `workerd`** (hai package bắt buộc cho wrangler):

```bash
npm install-scripts approve esbuild workerd
npm rebuild esbuild workerd
```

Kiểm tra wrangler đã cài được:

```bash
npx wrangler --version
```

→ In ra số phiên bản (ví dụ `4.x.x`).

---

## 4. Bước 2 — Tạo schema và dữ liệu mẫu cho D1 local

File [apps/api/data/seed.sql](../apps/api/data/seed.sql) chứa:

- `CREATE TABLE IF NOT EXISTS products` và `orders`;
- `INSERT OR REPLACE` 10 món mẫu (cà phê, trà, sinh tố, đồ ăn nhanh).

Chạy từ thư mục gốc:

```bash
npm run seed
```

Lệnh này thực thi: `wrangler d1 execute ecom-db --local --file=./data/seed.sql` (trong `apps/api`).

**Kết quả mong đợi:**

```
🌀 Executing on local database ecom-db (...)
🚣 ... commands executed successfully.
```

Kiểm tra dữ liệu đã vào D1 local:

```bash
cd apps/api
npx wrangler d1 execute ecom-db --local --command "SELECT id, name, price FROM products;"
cd ../..
```

→ Thấy 10 dòng sản phẩm.

> 💡 Seed là **idempotent**: chạy nhiều lần không lỗi và không nhân đôi dữ liệu (nhờ `IF NOT EXISTS` và `INSERT OR REPLACE`).

---

## 5. Bước 3 — Chạy backend (terminal 1)

Mở terminal thứ nhất tại thư mục gốc:

```bash
npm run dev:api
```

Tương đương `wrangler dev --port 8787 --local` trong `apps/api`.

**Kết quả mong đợi** (có dòng báo đang lắng nghe):

```
⎔ Starting local server...
[wrangler:info] Ready on http://localhost:8787
```

**Giữ terminal này mở.** Mở một terminal khác để kiểm tra:

```bash
curl http://localhost:8787/
```

→ JSON liệt kê endpoint `"name": "Ecom Cafe API"`.

```bash
curl http://localhost:8787/api/products
```

→ JSON dạng `{"products":[{"id":1,"name":"Cà phê sữa đá",...}, ...]}`.

> ⚠️ Trả về `{"products":[]}` → chưa chạy `npm run seed`. Lỗi `no such table` → cùng nguyên nhân.

---

## 6. Bước 4 — Chạy frontend (terminal 2)

Mở terminal thứ hai tại thư mục gốc:

```bash
npm run dev:web
```

Tương đương `next dev -p 3000` trong `apps/web`.

**Kết quả mong đợi:**

```
▲ Next.js 15.x
- Local: http://localhost:3000
✓ Ready
```

Mở trình duyệt:

| Trang | URL | Chức năng |
|---|---|---|
| Menu | http://localhost:3000 | Xem món, thêm vào giỏ |
| Giỏ hàng | http://localhost:3000/cart | Sửa số lượng, chọn đặt tại quán hoặc ship, đặt món |
| Admin | http://localhost:3000/admin | Quản lý món và xem đơn hàng |

---

## 7. Bước 5 — Kiểm tra từng phần

Làm theo thứ tự để khoanh vùng lỗi nếu có.

**(a) Backend trả dữ liệu** — đã kiểm tra ở Bước 3.

**(b) Backend ghi được KV (giỏ hàng):**

```bash
curl -X PUT http://localhost:8787/api/cart/sv01 \
  -H "content-type: application/json" \
  -d '{"items":[{"id":1,"name":"Cà phê sữa đá","price":25000,"qty":2}]}'

curl http://localhost:8787/api/cart/sv01
```

→ Lần đọc thứ hai trả về đúng giỏ vừa ghi.

**(c) Backend ghi được D1 (đơn hàng):**

```bash
curl -X POST http://localhost:8787/api/orders \
  -H "content-type: application/json" \
  -d '{"customer_id":"sv01","type":"ship","address":"12 Nguyễn Huệ","items":[{"id":7,"price":35000,"qty":1}],"total":35000}'
```

→ Trả về `{"order_id": ..., "total": 35000}`.

**(d) Placeholder ảnh:**

```bash
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" \
  "http://localhost:8787/img/placeholder.svg?category=Tr%C3%A0&name=Tr%C3%A0%20%C4%91%C3%A0o"
```

→ In ra `200 image/svg+xml`.

**(e) Frontend đọc được dữ liệu:** mở http://localhost:3000 — thấy danh sách món. Nếu trống, xem [mục 11](#11-xử-lý-sự-cố).

---

## 8. Bước 6 — Thực hành: đặt một đơn hàng end-to-end

1. Mở **Menu** `http://localhost:3000`, bấm **"+ Thêm vào giỏ"** ở 2–3 món.
2. Vào **Giỏ hàng**, chỉnh số lượng bằng nút `+` / `-`.
3. Chọn **"Đặt tại quán"**, bấm **Đặt món**.
4. Màn hình hiện lời cảm ơn và mã đơn (ví dụ `#2`).
5. Mở **Admin** `http://localhost:3000/admin`, tìm đơn vừa tạo và đổi trạng thái (ví dụ `new` → `preparing`).
6. Kiểm tra lại bằng API:

```bash
curl http://localhost:8787/api/orders
```

→ Thấy đơn với trạng thái đã đổi.

Lặp lại với **"Ship tới địa chỉ"**: bắt buộc nhập địa chỉ, nếu bỏ trống backend trả lỗi.

---

## 9. Reset dữ liệu và các lệnh hữu ích

**Reset toàn bộ dữ liệu local** (xóa D1 và KV giả lập):

1. Dừng cả hai terminal (`Ctrl + C`).
2. Xóa thư mục trạng thái của wrangler:
   ```bash
   rm -rf apps/api/.wrangler
   ```
   (Windows PowerShell: `Remove-Item -Recurse -Force apps/api/.wrangler`)
3. Chạy lại `npm run seed` và `npm run dev:api`.

**Các lệnh khác:**

| Lệnh (từ gốc dự án) | Tác dụng |
|---|---|
| `npm run dev:api` | Chạy backend trên :8787 |
| `npm run dev:web` | Chạy frontend trên :3000 |
| `npm run seed` | Nạp schema + 10 món mẫu vào D1 local |
| `npm run build` | Build production của Next.js (kiểm tra lỗi TypeScript/build) |
| `npm -w apps/web run start` | Chạy bản đã build (phải `npm run build` trước) |

> Lưu ý: `npm run build` ở gốc chỉ build Next.js. Không chạy lệnh deploy ở máy local.

**Đổi cổng backend** (nếu 8787 bị chiếm): chạy `npx wrangler dev --port 8788 --local` trong `apps/api`, rồi đặt `NEXT_PUBLIC_API_URL=http://localhost:8788` trước khi chạy frontend. Ví dụ Git Bash:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8788 npm run dev:web
```

---

## 10. Cấu trúc thư mục cần biết

```
ecom/
├─ package.json              # npm workspaces + script gốc
├─ docs/                     # tài liệu (file này)
├─ apps/
│  ├─ api/                   # Backend Hono (Cloudflare Worker)
│  │  ├─ wrangler.toml       # khai báo binding DB (D1), CART (KV)
│  │  ├─ data/seed.sql       # schema + dữ liệu mẫu
│  │  └─ src/
│  │     ├─ index.ts         # app Hono, mount route, bật CORS
│  │     ├─ types.ts         # kiểu Env (DB, CART)
│  │     └─ routes/          # products.ts, cart.ts, orders.ts, placeholder.ts
│  └─ web/                   # Frontend Next.js + Tailwind
│     ├─ wrangler.jsonc      # cấu hình worker frontend (dùng khi deploy)
│     ├─ open-next.config.ts # cấu hình OpenNext (dùng khi deploy)
│     └─ src/
│        ├─ lib/api.ts       # API_URL + các hàm gọi backend
│        ├─ components/      # MenuCard, Cart...
│        └─ app/             # page.tsx (/), cart/, admin/
```

---

## 11. Xử lý sự cố

### 1. `curl localhost:8787` báo "Failed to connect" hoặc mã `000`
Backend chưa chạy. Mở terminal 1 và chạy `npm run dev:api`, đợi đến khi thấy `Ready on http://localhost:8787`.

### 2. `/api/products` trả `{"products":[]}` hoặc lỗi `no such table`
Chưa seed D1 local. Chạy `npm run seed`, sau đó thử lại. Nếu vẫn lỗi, xem mục 9 để reset.

### 3. Trang chủ báo "Không tải được menu" hoặc trang trắng
- Kiểm tra backend đang chạy: `curl http://localhost:8787/api/products`.
- Mở DevTools (F12) → tab **Console/Network**. Lỗi CORS hoặc `Failed to fetch` nghĩa là frontend không gọi được `NEXT_PUBLIC_API_URL`. Kiểm tra cổng backend và biến môi trường đang dùng.

### 4. Ảnh món không hiện
Route ảnh là `http://localhost:8787/img/placeholder.svg?...`. Kiểm tra bằng lệnh ở mục 7(d). Nếu trả 404, kiểm tra `app.route("/img", placeholder)` trong [apps/api/src/index.ts](../apps/api/src/index.ts).

### 5. Lỗi `npm install` về `esbuild` / `workerd`
```bash
npm install-scripts approve esbuild workerd
npm rebuild esbuild workerd
```

### 6. `EADDRINUSE` — cổng đã bị chiếm
Một tiến trình cũ vẫn đang chạy. Tìm và tắt:
```bash
netstat -ano | findstr :8787       # hoặc :3000
taskkill /PID <số-PID> /F
```
Hoặc đổi cổng như mục 9.

### 7. Lỗi `Unexpected fields found: nodejs_compat` khi chạy wrangler
Trong [apps/api/wrangler.toml](../apps/api/wrangler.toml) phải là `compatibility_flags = ["nodejs_compat"]` (dạng mảng, không phải `nodejs_compat = true`).

### 8. Tiếng Việt hiện dấu `?` trên terminal
Chỉ là lỗi hiển thị của console Windows. Dữ liệu trong D1/KV vẫn là UTF-8 đúng, trình duyệt hiển thị bình thường.

### 9. Sửa code nhưng trang không đổi
`next dev` và `wrangler dev` tự reload khi lưu file. Nếu không đổi, tải lại trang bằng `Ctrl + Shift + R`. Nếu sửa `seed.sql`, phải chạy lại `npm run seed`.

---

## 12. Bài tập gợi ý

1. Thêm một món mới bằng `curl -X POST` vào `/api/products` (xem [products.ts](../apps/api/src/routes/products.ts) để biết các trường cần có), rồi kiểm tra món hiện trên menu.
2. Ẩn một món bằng `PATCH /api/products/:id` với `{"available":0}` và xác nhận món biến mất khỏi menu.
3. Thêm một trường `note` cho đơn hàng: sửa `seed.sql`, `orders.ts` và trang giỏ hàng. Chạy lại seed và kiểm tra.
4. Đổi thời gian hết hạn giỏ hàng (`TTL_SECONDS` trong [cart.ts](../apps/api/src/routes/cart.ts)) và giải thích vì sao cần thời gian đó.

Khi xong phần local, đọc tiếp [trien-khai-cloudflare.md](trien-khai-cloudflare.md) để đưa dự án lên Cloudflare.
