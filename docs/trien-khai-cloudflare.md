# Hướng dẫn Triển khai lên Cloudflare — Ecommerce Cafe

Tài liệu chi tiết hướng dẫn deploy toàn bộ dự án Ecommerce Cafe lên nền tảng
**Cloudflare** (Workers + D1 + KV + R2). Viết dựa trên cấu trúc dự án hiện tại
(monorepo `apps/api` + `apps/web`) và trạng thái chưa đăng nhập Cloudflare.

---

## Mục lục

1. [Tổng quan quy trình](#1-tổng-quan-quy-trình)
2. [Điều kiện tiên quyết](#2-điều-kiện-tiên-quyết)
3. [Bước 1 — Đăng nhập Cloudflare](#3-bước-1--đăng-nhập-cloudflare)
4. [Bước 2 — Tạo tài nguyên (D1 / KV / R2)](#4-bước-2--tạo-tài-nguyên-d1--kv--r2)
5. [Bước 3 — Cập nhật `wrangler.toml`](#5-bước-3--cập-nhật-wranglertoml)
6. [Bước 4 — Deploy Backend (apps/api)](#6-bước-4--deploy-backend-appsapi)
7. [Bước 5 — Nạp schema & seed lên D1 remote](#7-bước-5--nạp-schema--seed-lên-d1-remote)
8. [Bước 6 — Deploy Frontend (apps/web)](#8-bước-6--deploy-frontend-appsweb)
9. [Bước 7 — Domain & HTTPS](#9-bước-7--domain--https)
10. [Kiểm tra sau deploy & vận hành](#10-kiểm-tra-sau-deploy--vận-hành)
11. [Bảng tham chiếu lệnh](#11-bảng-tham-chiếu-lệnh)
12. [Chi phí / Free tier](#12-chi-phí--free-tier)
13. [Troubleshooting deploy](#13-troubleshooting-deploy)
14. [Lưu ý bảo mật & giới hạn](#14-lưu-ý-bảo-mật--giới-hạn)

---

## 1. Tổng quan quy trình

```
┌────────────┐   wrangler login    ┌──────────────────────┐
│  Cloudflare│ ◄━━━━━━━━━━━━━━━━━ ►│  trình duyệt / account│
│   Account   │                     └──────────────────────┘
└──────┬──────┘
       │
  ┌────┴─────────────────────────────────────────────┐
  │ 1. wrangler d1 create ecom-db        → D1 (SQL)  │
  │ 2. wrangler kv namespace create CART → KV (giỏ)  │
  │ 3. wrangler r2 bucket create ecom-images → R2    │
  │ 4. sửa apps/api/wrangler.toml với id thật        │
  └──────────────────────────────────────────────────┘
       │
  ┌────┴─────────────────────────────────────────────┐
  │ 5. npm run deploy (apps/api)         → Worker API │
  │ 6. wrangler d1 execute --remote      → seed D1    │
  │ 7. npx opennextjs-cloudflare build   → Worker Web  │
  └──────────────────────────────────────────────────┘
```

**Có 2 worker riêng biệt sau khi deploy:**

| Worker | URL mặc định | Vai trò |
|---|---|---|
| `ecom-api` | `https://ecom-api.<subdomain>.workers.dev` | Backend Hono (D1/KV/R2) |
| `ecom-web` | `https://ecom-web.<subdomain>.workers.dev` | Frontend Next.js + Admin |

---

## 2. Điều kiện tiên quyết

| Thứ | Trạng thái hiện tại | Cần cho deploy |
|---|---|---|
| Node.js ≥ 18 | ✅ v24 | — |
| wrangler | ✅ 4.x (đã cài trong `apps/api`) | — |
| **Tài khoản Cloudflare** | ❌ chưa đăng nhập | **Bắt buộc** (miễn phí) |
| Domain riêng | — | Tùy chọn (không bắt buộc, dùng `workers.dev`) |

> 💡 Tài khoản Cloudflare **free plan** đủ để chạy dự án này.

---

## 3. Bước 1 — Đăng nhập Cloudflare

Từ thư mục gốc dự án (hoặc `apps/api`):

```bash
npx wrangler login
```

Trình duyệt tự mở trang Cloudflare → chọn account → **Allow**.
Kiểm tra đã đăng nhập:

```bash
npx wrangler whoami
```

Kết quả tốt (dạng):

```
When logged in, your supported actions include:
  ✓ Creating and managing projects
  ✓ Interacting with Workers
  ...
```

> 🔁 Nếu không có trình duyệt (server headless): dùng `wrangler login` với option
> `--browser=false` + lấy `CF_API_TOKEN` tại https://dash.cloudflare.com/profile/api-tokens,
> rồi `CLOUDFLARE_API_TOKEN=<token> CLOUDFLARE_ACCOUNT_ID=<id>` (đặt trong `.env` — đã ignored).

---

## 4. Bước 2 — Tạo tài nguyên (D1 / KV / R2)

Chạy từ thư mục `apps/api` (nơi có `wrangler.toml`):

```bash
cd apps/api
```

### 4.1 Tạo database D1

```bash
npx wrangler d1 create ecom-db
```

Output dạng:

```
✅ Successfully created DB 'ecom-db' in region APAC
Created your new D1 database.
[[d1_databases]]
binding = "DB" = "DB"
database_name = "ecom-db"
database_id = "<UUID-THAT-YOU-WILL-PASTE>"
```

> Chú ý: màn hình deploy có thể gợi ý thêm `migrations_dir` — dự án dùng
> `wrangler d1 execute --file` nên ta **không cần**.

### 4.2 Tạo KV namespace

```bash
npx wrangler kv namespace create CART
```

Output dạng:

```
✅ Successfully created namespace with id "<KV-ID>".
[[kv_namespaces]]
binding = "CART"
id = "<KV-ID>"
```

### 4.3 Tạo R2 bucket

```bash
npx wrangler r2 bucket create ecom-images
```

Output:

```
✅ Created R2 bucket 'ecom-images'.
```

---

## 5. Bước 3 — Cập nhật `wrangler.toml`

Mở [apps/api/wrangler.toml](../apps/api/wrangler.toml) và thay các **giá trị placeholder**
bằng id thật vừa tạo (có thể thêm `preview_database_id`/`preview_bucket_name` nếu muốn).

```toml
name = "ecom-api"
main = "src/index.ts"
compatibility_date = "2025-09-01"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "ecom-db"
database_id = "<PASTE-DATABASE-ID>"

[[kv_namespaces]]
binding = "CART"
id = "<PASTE-KV-ID>"

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "ecom-images"
```

> ⚠️ **Đừng commit id thật vào git** nếu đây là repo public — nên dùng `.dev.vars`
> hoặc tách `wrangler.<env>.toml` cho production.

---

## 6. Bước 4 — Deploy Backend (apps/api)

```bash
cd apps/api
npx wrangler deploy
```

Thành công:

```
✔ Deployed ecom-api
  https://ecom-api.<tên>.workers.dev
```

Kiểm tra lập tức:

```bash
curl https://ecom-api.<tên>.workers.dev/api/products
```

→ Trả `{"products":[]}` là đúng (chưa seed remote). Trả 500 = cần kiểm tra bindings/log.

> 📝 Script `apps/api/package.json` đã có `"deploy": "wrangler deploy"`,
> từ gốc dự án chạy: `npm -w apps/api run deploy`.

---

## 7. Bước 5 — Nạp schema & seed lên D1 remote

Giống lệnh local nhưng thêm cờ **`--remote`**:

```bash
cd apps/api
npx wrangler d1 execute ecom-db --remote --file=./data/seed.sql
```

Output:

```
🚣 3 commands executed successfully.
```

Kiểm tra:

```bash
curl https://ecom-api.<tên>.workers.dev/api/products
# → {"products":[{"id":1,"name":"Cà phê sữa đá",...}, ...]} 10 món ✅
```

> 🔁 Chạy lại lệnh này mỗi khi sửa schema — `CREATE TABLE IF NOT EXISTS` + `INSERT OR REPLACE`
> trong seed làm việc này **idempotent** (chạy nhiều lần không lỗi).

---

## 8. Bước 6 — Deploy Frontend (apps/web)

> ⚠️ **Điểm cần lưu ý:** Next.js **không chạy trực tiếp** trên Workers như một
> Worker Hono. Cần adapter **OpenNext for Cloudflare** (`@opennextjs/cloudflare`)
> để biên dịch Next.js thành Worker.

### 8.1 Cài & init adapter

```bash
cd apps/web
npx @opennextjs/cloudflare@latest init
```

Quá trình init sẽ:
- Thêm `@opennextjs/cloudflare`, `@cloudflare/workers-types` vào devDependencies.
- Tạo `wrangler.jsonc` (hoặc cấu hình mới) cho web worker.
- Có thể tạo `open-next.config.ts`.

### 8.2 Cập nhật URL backend trong production

Ở local, [next.config.mjs](../apps/web/next.config.mjs) rewrite sang `http://localhost:8787`.
Ở production phải trỏ sang **URL worker api thật**:

```bash
# /apps/web
API_URL=https://ecom-api.<tên>.workers.dev npm run build
```

Hoặc tách cấu hình theo env trong `next.config.mjs` (khuyến nghị):

```js
const apiUrl =
  process.env.NODE_ENV === "production"
    ? process.env.API_URL ?? "https://ecom-api.<tên>.workers.dev"
    : process.env.API_URL ?? "http://localhost:8787";

async rewrites() {
  return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
}
```

> Ngoài ra bối cảnh production còn 2 cách khác:
> - **Same-era bindings (service binding):** web gọi thẳng `env.api_worker.fetch(...)`
>   thay vì fetch qua mạng — nhanh hơn, miễn phí egress. Setup trong `wrangler.jsonc`
>   của web bằng `[[services]] binding = "API" service = "ecom-api"`.
> - Hoặc đặt CORS sẵn có trên api (`cors()` đã bật trong `src/index.ts`) và để web gọi
>   URL workers.dev trực tiếp.

### 8.3 Build & deploy

```bash
cd apps/web
npx opennextjs-cloudflare build
npx wrangler deploy
```

Thành công:

```
✔ Deployed ecom-web
  https://ecom-web.<tên>.workers.dev
```

> ⚠️ Trước khi build lần đầu nhớ cập nhật `wrangler.jsonc`/`wrangler.toml` của web với
> 2 lỗng thường gặp:
> - `compatibility_flags = ["nodejs_compat"]` để Next runtime chạy đủ Node APIs.
> - Nếu dùng service binding, khai báo `[[services]]`.

---

## 9. Bước 7 — Domain & HTTPS

### Tuỳ chọn A — Worker dùng domain custom (recommended)

```bash
npx wrangler domains add app.example.com
# hoặc thêm vào wrangler.toml:
# workers_dev = false
# routes = [{ pattern = "app.example.com", zone_id = "<ZONE-ID>" }]
# Trỏ CNAME app.example.com → workers.dev tương ứng trong DNS zone nếu cần.
```

### Tuỳ chọn B — Chỉ dùng `workers.dev` (miễn phí, đủ demo)

Không cần làm gì — mỗi worker đã có URL `*.workers.dev` kèm HTTPS wildcard của Cloudflare.

> Gợi ý hướng domain product: `menu.tenquan.com` (web) — CNAME → ecom-web...workers.dev;
> `api.tenquan.com` (api) — CNAME → ecom-api...workers.dev, để tránh phụ thuộc tên nội bộ.

---

## 10. Kiểm tra sau deploy & vận hành

### 10.1 Checklist sau deploy

```bash
# API trực tiếp
curl https://ecom-api.<tên>.workers.dev/api/products                     # 10 món
curl -X POST https://ecom-api.<tên>.workers.dev/api/orders -H "content-type: application/json" \
  -d '{"customer_id":"deploy-test","type":"instore","items":[{"id":1,"price":25000,"qty":1}],"total":25000}'
curl https://ecom-api.<tên>.workers.dev/api/cart/deploy-test | head -c 120

# Frontend (gọi qua rewrite cùng origin)
curl -L -o /dev/null -w "%{http_code}\n" https://ecom-web.<tên>.workers.dev/
curl -s https://ecom-web.<tên>.workers.dev/api/products | head -c 120     # JSON từ api
```

### 10.2 Theo dõi log & KV

```bash
npx wrangler tail --format pretty            # stream request live (from apps/api)
npx wrangler kv key list --namespace-id "<KV-ID>"
```

### 10.3 Rollback / redeploy

```bash
npx wrangler deploy --dry-run                # xem diff build trước khi đẩy
npx wrangler rollback                        # quay lại version trước
```

### 10.4 Biến môi trường production (secret)

```bash
# VD: khoá admin nếu dùng sau này
cd apps/api
npx wrangler secret put ADMIN_TOKEN
```

---

## 11. Bảng tham chiếu lệnh

| Bước | Lệnh (từ gốc `d:\ecom`) | Ghi chú |
|---|---|---|
| Login | `npx wrangler login` | 1 lần / máy |
| Tạo D1 | `cd apps/api && wrangler d1 create ecom-db` | lấy database_id |
| Tạo KV | `cd apps/api && wrangler kv namespace create CART` | lấy id |
| Tạo R2 | `cd apps/api && wrangler r2 bucket create ecom-images` | — |
| Sửa config | edit `apps/api/wrangler.toml` | paste id thật |
| Deploy API | `npm -w apps/api run deploy` | worker `ecom-api` |
| Seed remote | `npm -w apps/api run seed -- --remote` *(xem lưu ý dưới)* | hoặc `wrangler d1 execute ... --remote` |
| Init OpenNext | `cd apps/web && npx @opennextjs/cloudflare@latest init` | biến Next thành worker |
| Build web | `cd apps/web && npx opennextjs-cloudflare build` | cần `API_URL` prod |
| Deploy web | `cd apps/web && npx wrangler deploy` | worker `ecom-web` |

> 📝 **Lưu ý toggle --remote:** script `seed` hiện tại không có `--remote`; chạy remote đúng cách:
> `cd apps/api && npx wrangler d1 execute ecom-db --remote --file=./data/seed.sql`
> (đã có thể thêm `"seed:prod": "wrangler d1 execute ecom-db --remote --file=./data/seed.sql"`).

---

## 12. Chi phí / Free tier

| Tài nguyên | Free plan | Dự án này cần |
|---|---|---|
| Workers | 100.000 req/ngày — miễn phí | ✅ vừa đủ |
| D1 | 5M read + 100K write/ngày, 5GB dung lượng | ✅ |
| KV | 100K read + 1K write/ngày, 1GB | ✅ |
| R2 (cấu trúc) | 10GB storage + 1M egress/tháng | ✅ |

→ **Toàn bộ chi phí = 0đ** nếu dùng free plan với traffic nhỏ như quán cafe.

---

## 13. Troubleshooting deploy

### 1. `wrangler deploy` báo "Missing entry-point"
→ chạy từ thư mục có `wrangler.toml` hoặc chỉ rõ `wrangler deploy src/index.ts`.

### 2. API trả 500 khi gọi bảng
→ bindings sai. Kiểm tra `npx wrangler deploy --dry-run`, xác nhận `database_id`, `id`,
`bucket_name` khớp object vừa tạo. Chưa seed remote cũng gây lỗi bảng thiếu → chạy Bước 5.

### 3. `/api/products` trả `[]` (rỗng) trên production
→ chưa `--remote --file=./data/seed.sql`.

### 4. Web lỗi runtime / polygon "compatibility flag"
→ thiếu `compatibility_flags = ["nodejs_compat"]` trong wrangler config của web worker.
Xem log: `npx wrangler tail` (chạy trong thư mục web).

### 5. Web báo khi gọi `/api/...` sang localhost
→ `next.config.mjs` đang ở chế độ dev. Build với `API_URL=https://ecom-api.<tên>.workers.dev`
hoặc cập nhật nhánh production trong config.

### 6. Ứng dụng CORS khi frontend ở domain A gọi api ở domain B
→ api đã có `cors()`; nếu cần chặn origin lạ, hẹp lại trong `app.use("/api/*", cors({ origin: ["https://ecom-web.<tên>.workers.dev"] }))`.

### 7. `wrangler login` mở browser nhưng bị treo màn hình trống
→ đăng nhập thủ công tại https://dash.cloudflare.com → account → API Tokens → tạo token
editable Workers, rồi chạy `export CLOUDFLARE_API_TOKEN=...` trước khi deploy.

---

## 14. Lưu ý bảo mật & giới hạn

### Bảo mật
- **Admin hiện chưa có auth** — trang `/admin` gọi trực tiếp các endpoint ghi/xoá.
  Trước khi public nên thêm **ADMIN_TOKEN** (bí mật trên workers) và kiểm tra ở
  `src/routes/products.ts`, `orders.ts` (vd middleware `Header("x-admin-token") === TOKEN`).
- Không commit `database_id`/`id` thật nếu repo public.
- `expirationTtl` giỏ hàng 30 ngày là tốt; cân nhắc ngắn hơn cho production (vd 7 ngày).

### Giới hạn cần biết
- **Next.js ↔ Workers:** không phải toàn bộ tính năng Next tương thích OpenNext 100%
  (đã xử lý phổ biến trong adapter hiện tại); tránh dùng Node-only APIs không có
  `nodejs_compat` bật.
- **KV eventual consistency:** ghi giỏ hàng có thể mất ~vài chục giây để "thấy" ở mọi
  vùng trên toàn cầu — không ảnh hưởng use-case quán cafe 1 chi nhánh.
- **R2 serving:** ảnh được phục vụ qua `/img/*` proxy từ worker (đã viết route) — nếu
  dùng nhiều ảnh, nâng cấp CDN cache hoặc public bucket qua `wrangler r2 bucket website`.

---

*Tài liệu khớp với phiên bản hiện tại của dự án: wrangler 4.x, Hono 4, Next.js 15, Tailwind v4.*