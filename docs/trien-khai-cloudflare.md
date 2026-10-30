# Hướng dẫn triển khai lên Cloudflare — Ecommerce Cafe

Tài liệu này hướng dẫn đưa dự án **Ecommerce Cafe** lên Cloudflare bằng chính tài khoản của bạn. Sau khi làm xong, bạn sẽ có hai Worker đang chạy trên Internet:

| Worker | Địa chỉ mẫu | Vai trò |
|---|---|---|
| `ecom-api` | `https://ecom-api.<subdomain>.workers.dev` | Backend Hono, đọc/ghi D1 và KV |
| `ecom-web` | `https://ecom-web.<subdomain>.workers.dev` | Frontend Next.js (trang menu, giỏ hàng, admin) |

Tài liệu được viết để sinh viên **làm lại từ đầu** được. Bạn nên làm xong [chạy local](chay-local.md) trước.

> ⚠️ **Đọc trước khi bắt đầu:**
> - Repo đang chứa **id tài nguyên của giảng viên** trong `apps/api/wrangler.toml` và `apps/web/wrangler.jsonc`. Bạn **phải thay bằng id của chính bạn** ở bước 4 và bước 7. Nếu không, bạn sẽ ghi dữ liệu vào database của người khác (hoặc lỗi quyền truy cập).
> - Không deploy lên tài nguyên của người khác và không chạy seed `--remote` lên database không phải của bạn.
> - Admin hiện **chưa có đăng nhập**: ai biết URL `/admin` đều sửa được món. Chỉ dùng cho bài thực hành.

---

## Mục lục

1. [Tổng quan quy trình](#1-tổng-quan-quy-trình)
2. [Yêu cầu](#2-yêu-cầu)
3. [Bước 1 — Đăng nhập Cloudflare](#3-bước-1--đăng-nhập-cloudflare)
4. [Bước 2 — Tạo D1 database và KV namespace](#4-bước-2--tạo-d1-database-và-kv-namespace)
5. [Bước 3 — Cập nhật cấu hình backend](#5-bước-3--cập-nhật-cấu-hình-backend)
6. [Bước 4 — Deploy backend `ecom-api`](#6-bước-4--deploy-backend-ecom-api)
7. [Bước 5 — Nạp schema và dữ liệu mẫu lên D1 remote](#7-bước-5--nạp-schema-và-dữ-liệu-mẫu-lên-d1-remote)
8. [Bước 6 — Cấu hình và build frontend](#8-bước-6--cấu-hình-và-build-frontend)
9. [Bước 7 — Deploy frontend `ecom-web`](#9-bước-7--deploy-frontend-ecom-web)
10. [Bước 8 — Kiểm tra sau deploy](#10-bước-8--kiểm-tra-sau-deploy)
11. [Cập nhật lại sau khi sửa code](#11-cập-nhật-lại-sau-khi-sửa-code)
12. [Bảng tham chiếu lệnh](#12-bảng-tham-chiếu-lệnh)
13. [Xử lý sự cố](#13-xử-lý-sự-cố)
14. [Chi phí và giới hạn](#14-chi-phí-và-giới-hạn)
15. [Bài tập gợi ý](#15-bài-tập-gợi-ý)

---

## 1. Tổng quan quy trình

```
 Máy bạn                                     Cloudflare (tài khoản của bạn)
 ───────                                     ────────────────────────────────
 (1) wrangler login  ─────────────────────►  xác thực tài khoản
 (2) d1 create / kv namespace create ─────►  D1: ecom-db
                                             KV: CART, NEXT_INC_CACHE_KV
 (3) sửa id trong wrangler.toml / .jsonc
 (4) wrangler deploy (apps/api) ──────────►  Worker ecom-api
 (5) d1 execute --remote seed.sql ────────►  nạp bảng + 10 món vào D1
 (6) build frontend với NEXT_PUBLIC_API_URL
 (7) wrangler deploy (apps/web) ──────────►  Worker ecom-web
 (8) kiểm tra bằng curl và trình duyệt
```

Có hai điểm dễ nhầm nhất, cần nhớ:

- **Frontend đọc địa chỉ backend lúc build**, không đọc lúc chạy. Đổi `NEXT_PUBLIC_API_URL` thì phải build lại.
- **Mỗi Worker có cấu hình riêng**: `apps/api/wrangler.toml` cho backend, `apps/web/wrangler.jsonc` cho frontend.

---

## 2. Yêu cầu

| Thứ | Yêu cầu | Kiểm tra |
|---|---|---|
| Node.js | ≥ 18 | `node -v` |
| npm | ≥ 10 | `npm -v` |
| Tài khoản Cloudflare | Miễn phí (free plan) | đăng ký tại dash.cloudflare.com |
| Đã cài dependencies | Đã làm `npm install` ở gốc | `ls node_modules` |
| Đã chạy local OK | Khuyến nghị | xem [chay-local.md](chay-local.md) |

> Tài khoản free đủ dùng cho dự án này. Không cần domain riêng: mỗi Worker có sẵn địa chỉ `*.workers.dev` có HTTPS.

**Lưu ý về tên:** tài khoản Cloudflare của bạn có một **subdomain** riêng (ví dụ `sv-an.workers.dev`). Mọi URL trong tài liệu này viết `<subdomain>` để bạn thay bằng subdomain của mình. Lấy subdomain ở trang Workers & Pages trên dashboard, hoặc sau khi deploy lần đầu sẽ thấy trong output.

---

## 3. Bước 1 — Đăng nhập Cloudflare

Từ thư mục gốc dự án:

```bash
npx wrangler login
```

Trình duyệt mở trang xác thực → chọn account → **Allow**. Quay lại terminal, kiểm tra:

```bash
npx wrangler whoami
```

**Kết quả mong đợi:** có tên account và danh sách quyền (Workers, D1, KV...). Nếu thấy `You are not logged in`, chạy lại `wrangler login`.

> 🔁 **Không có trình duyệt** (máy headless hoặc lỗi mở trang): tạo API token tại https://dash.cloudflare.com/profile/api-tokens với quyền Workers Scripts, D1, Workers KV Storage. Rồi đặt biến môi trường trước khi chạy lệnh:
> ```bash
> export CLOUDFLARE_API_TOKEN=<token-của-bạn>
> ```
> (PowerShell: `$env:CLOUDFLARE_API_TOKEN="<token>"`). Không commit token vào git.

---

## 4. Bước 2 — Tạo D1 database và KV namespace

Tài nguyên được tạo trong **tài khoản của bạn**, nên id sẽ khác với id trong repo.

### 4.1 Tạo D1 database

```bash
cd apps/api
npx wrangler d1 create ecom-db
```

**Kết quả mong đợi** có khối cấu hình kèm `database_id`:

```
✅ Successfully created DB 'ecom-db' in region ...
[[d1_databases]]
binding = "DB"
database_name = "ecom-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Ghi lại `database_id`.** Nếu báo lỗi tên đã tồn tại, hãy đổi tên, ví dụ `ecom-db-<tên-bạn>`, và dùng tên đó ở các bước sau (cả trong `wrangler.toml` và lệnh `d1 execute`).

### 4.2 Tạo KV namespace cho giỏ hàng

```bash
npx wrangler kv namespace create CART
```

**Ghi lại `id`** trong output.

### 4.3 Tạo KV namespace cho cache của Next.js

Frontend cần một KV riêng để OpenNext lưu cache (binding `NEXT_INC_CACHE_KV`). Dùng namespace riêng để không lẫn với giỏ hàng:

```bash
npx wrangler kv namespace create NEXT_INC_CACHE_KV
```

**Ghi lại `id`** thứ hai.

> 💡 Muốn xem lại danh sách: `npx wrangler d1 list` và `npx wrangler kv namespace list`.

Quay về thư mục gốc:

```bash
cd ../..
```

---

## 5. Bước 3 — Cập nhật cấu hình backend

Mở [apps/api/wrangler.toml](../apps/api/wrangler.toml) và thay id:

```toml
name = "ecom-api"
main = "src/index.ts"
compatibility_date = "2025-09-01"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "ecom-db"
database_id = "<DATABASE-ID-CỦA-BẠN>"

[[kv_namespaces]]
binding = "CART"
id = "<KV-CART-ID-CỦA-BẠN>"
```

Kiểm tra:

- `name = "ecom-api"` sẽ thành tên Worker và phần đầu URL `ecom-api.<subdomain>.workers.dev`. Đổi tên nếu bạn muốn URL khác.
- Khối `[[r2_buckets]]` đang được comment. **Không cần R2**: ảnh món dùng SVG placeholder do backend sinh ra.

---

## 6. Bước 4 — Deploy backend `ecom-api`

```bash
cd apps/api
npx wrangler deploy
```

**Kết quả mong đợi:**

```
Uploaded ecom-api ...
Deployed ecom-api triggers ...
  https://ecom-api.<subdomain>.workers.dev
```

Ghi lại URL này. Bạn sẽ cần nó ở bước 6.

Kiểm tra nhanh:

```bash
curl https://ecom-api.<subdomain>.workers.dev/
```

→ JSON `"name": "Ecom Cafe API"`. Chưa seed nên `/api/products` sẽ chưa có dữ liệu (bước 5 sẽ sửa).

```bash
cd ../..
```

---

## 7. Bước 5 — Nạp schema và dữ liệu mẫu lên D1 remote

Từ `apps/api`, chạy đúng database **của bạn** với cờ `--remote`:

```bash
cd apps/api
npx wrangler d1 execute ecom-db --remote --file=./data/seed.sql
cd ../..
```

> Nếu bạn đổi tên database ở bước 4.1, thay `ecom-db` bằng tên đó.

**Kết quả mong đợi:** thông báo số lệnh đã chạy thành công (ví dụ `... commands executed successfully`).

Kiểm tra:

```bash
curl https://ecom-api.<subdomain>.workers.dev/api/products
```

→ 10 món, ví dụ `"name":"Cà phê sữa đá"`.

> 🔁 Seed là **idempotent** (dùng `CREATE TABLE IF NOT EXISTS` và `INSERT OR REPLACE`), nên chạy lại nhiều lần không lỗi. Nhưng `INSERT OR REPLACE` ghi đè món cùng `id`: nếu bạn đã sửa món trên admin, chạy lại seed sẽ hoàn lại giá trị gốc.

---

## 8. Bước 6 — Cấu hình và build frontend

### 8.1 Đặt id KV cho frontend

Mở [apps/web/wrangler.jsonc](../apps/web/wrangler.jsonc), thay id ở `kv_namespaces`:

```jsonc
"kv_namespaces": [
  {
    "binding": "NEXT_INC_CACHE_KV",
    "id": "<KV-NEXT_INC_CACHE_KV-ID-CỦA-BẠN>"
  }
]
```

Các phần khác trong file này không cần sửa:

- `main: ".open-next/worker.js"` — file do OpenNext sinh ra khi build.
- `assets` — phục vụ file tĩnh (`/_next/static/...`). `not_found_handling: "single-page-application"` đảm bảo đường dẫn lạ vẫn vào được Worker.
- `services` với `WORKER_SELF_REFERENCE` — OpenNext bắt buộc khai báo.

### 8.2 Build với địa chỉ backend thật

Frontend cần biết địa chỉ backend **của bạn** tại thời điểm build. Đặt biến `NEXT_PUBLIC_API_URL` ngay trước lệnh build.

**Git Bash / macOS / Linux:**

```bash
cd apps/web
NEXT_PUBLIC_API_URL=https://ecom-api.<subdomain>.workers.dev npx opennextjs-cloudflare build
```

**PowerShell (Windows):**

```powershell
cd apps/web
$env:NEXT_PUBLIC_API_URL="https://ecom-api.<subdomain>.workers.dev"
npx opennextjs-cloudflare build
```

**Kết quả mong đợi:** cuối log có `OpenNext build complete.` và thư mục `.open-next/` được tạo.

> ⚠️ **Bỏ qua biến này là lỗi phổ biến nhất.** Nếu build mà không đặt `NEXT_PUBLIC_API_URL`, frontend sẽ gọi `http://localhost:8787` — trình duyệt của người dùng không có gì ở đó, nên menu sẽ không tải được.

**Kiểm tra địa chỉ đã được nhúng đúng:**

```bash
grep -rl "ecom-api.<subdomain>.workers.dev" .open-next/assets/_next/static | head -3
```

→ Có ít nhất một file trong `.open-next/assets/_next/static/chunks/app/`.

> Không chạy `npx opennextjs-cloudflare migrate` — lệnh này hỏi tương tác và sẽ treo trong terminal không có TTY. Bước này không cần thiết cho dự án.

---

## 9. Bước 7 — Deploy frontend `ecom-web`

Vẫn trong `apps/web`:

```bash
npx wrangler deploy
```

**Kết quả mong đợi:**

```
Uploaded ecom-web ...
Deployed ecom-web triggers ...
  https://ecom-web.<subdomain>.workers.dev
```

Mở URL này trên trình duyệt. Quay về thư mục gốc:

```bash
cd ../..
```

---

## 10. Bước 8 — Kiểm tra sau deploy

### 10.1 Kiểm tra bằng curl

```bash
API=https://ecom-api.<subdomain>.workers.dev
WEB=https://ecom-web.<subdomain>.workers.dev

# Backend
curl -s -o /dev/null -w "api root      %{http_code}\n" $API/
curl -s $API/api/products | head -c 120; echo

# Ghi đơn hàng thử (xóa sau, xem 10.3)
curl -s -X POST $API/api/orders -H "content-type: application/json" \
  -d '{"customer_id":"deploy-test","type":"instore","items":[{"id":1,"price":25000,"qty":1}],"total":25000}'; echo

# Ảnh placeholder
curl -s -o /dev/null -w "placeholder    %{http_code} %{content_type}\n" \
  "$API/img/placeholder.svg?category=C%C3%A0%20ph%C3%AA&name=Espresso"

# Frontend
curl -s -o /dev/null -w "web /          %{http_code}\n" $WEB/
curl -s -o /dev/null -w "web /cart      %{http_code}\n" $WEB/cart
curl -s -o /dev/null -w "web /admin     %{http_code}\n" $WEB/admin
```

**Kết quả mong đợi:** `api root 200`, `placeholder 200 image/svg+xml`, các trang web đều `200`, và `/api/products` trả JSON 10 món.

### 10.2 Kiểm tra bằng trình duyệt

1. Mở `https://ecom-web.<subdomain>.workers.dev` — thấy menu 10 món, ảnh SVG hiện đúng.
2. Thêm món vào giỏ, vào `/cart`, đặt một đơn "tại quán" — thấy mã đơn.
3. Mở `/admin` — thấy đơn vừa đặt.

> Nếu trang chủ trống, mở DevTools (F12) → tab Network. Các request tới `ecom-api...workers.dev` phải trả `200`. Nếu thấy request tới `localhost:8787`, bạn đã quên đặt `NEXT_PUBLIC_API_URL` ở bước 8.2 — build lại.

### 10.3 Dọn dữ liệu thử

Đơn `deploy-test` ở trên vẫn nằm trong D1. Xóa nó:

```bash
cd apps/api
npx wrangler d1 execute ecom-db --remote --command "DELETE FROM orders WHERE customer_id='deploy-test';"
cd ../..
```

### 10.4 Xem log khi có lỗi

```bash
cd apps/api
npx wrangler tail
```

Lệnh giữ kết nối và in log realtime của `ecom-api`. Mở một tab khác, thao tác lại, rồi xem log. Với frontend, chạy `npx wrangler tail` trong `apps/web`.

---

## 11. Cập nhật lại sau khi sửa code

| Bạn sửa gì | Cần làm |
|---|---|
| Code trong `apps/api/src/` | `cd apps/api && npx wrangler deploy` |
| Schema hoặc dữ liệu mẫu (`seed.sql`) | `cd apps/api && npx wrangler d1 execute ecom-db --remote --file=./data/seed.sql` (rồi deploy nếu code đổi) |
| Code trong `apps/web/src/` | build lại (bước 8.2) rồi `cd apps/web && npx wrangler deploy` |
| Đổi địa chỉ backend | build lại frontend với `NEXT_PUBLIC_API_URL` mới, rồi deploy |

**Quay lại bản trước** nếu deploy lỗi:

```bash
npx wrangler rollback
```

(chạy trong thư mục Worker tương ứng).

---

## 12. Bảng tham chiếu lệnh

Chạy từ thư mục gốc `ecom/` trừ khi có ghi khác.

| Mục đích | Lệnh |
|---|---|
| Đăng nhập | `npx wrangler login` |
| Xem tài khoản đang dùng | `npx wrangler whoami` |
| Tạo D1 | `cd apps/api && npx wrangler d1 create ecom-db` |
| Tạo KV giỏ hàng | `cd apps/api && npx wrangler kv namespace create CART` |
| Tạo KV cache web | `cd apps/api && npx wrangler kv namespace create NEXT_INC_CACHE_KV` |
| Deploy backend | `cd apps/api && npx wrangler deploy` |
| Seed D1 remote | `cd apps/api && npx wrangler d1 execute ecom-db --remote --file=./data/seed.sql` |
| Build frontend | `cd apps/web && NEXT_PUBLIC_API_URL=https://ecom-api.<sub>.workers.dev npx opennextjs-cloudflare build` |
| Deploy frontend | `cd apps/web && npx wrangler deploy` |
| Log realtime | `npx wrangler tail` (trong thư mục Worker) |
| Quay lại bản trước | `npx wrangler rollback` (trong thư mục Worker) |

---

## 13. Xử lý sự cố

### 1. `wrangler login` mở trình duyệt nhưng không xong
Đăng nhập bằng API token (xem mục 3). Đảm bảo token có quyền Workers, D1 và KV.

### 2. `wrangler d1 create` báo tên đã tồn tại
Tên D1 chỉ cần duy nhất trong account của bạn. Đổi tên, ví dụ `ecom-db-<tên-bạn>`, và dùng tên mới ở mọi lệnh sau.

### 3. Backend trả 500 khi gọi `/api/products`
Thường do `database_id` sai, hoặc chưa seed remote. Kiểm tra:
- `database_id` trong `apps/api/wrangler.toml` có khớp với output của `d1 create` không (dùng `npx wrangler d1 list` để xem).
- Đã chạy bước 5 chưa. Nếu chưa, bảng `products` không tồn tại.
- Xem log: `npx wrangler tail` trong `apps/api`.

### 4. `/api/products` trả `{"products":[]}`
Chưa seed remote, hoặc seed vào database khác. Chạy lại bước 5 với đúng tên database.

### 5. Frontend build xong nhưng menu không tải được
Build không có `NEXT_PUBLIC_API_URL` đúng. Kiểm tra bằng lệnh `grep` ở bước 8.2, nếu không thấy URL backend của bạn, build lại với biến đặt đúng. Nhớ: đây là biến lúc build, đặt xong phải chạy lại `npx opennextjs-cloudflare build`.

### 6. Frontend báo lỗi CORS khi gọi backend
Backend đã bật `cors()` cho `/api/*` và `/img/*` nên thường không gặp lỗi này. Nếu gặp, kiểm tra lại `app.use("/api/*", cors())` trong [apps/api/src/index.ts](../apps/api/src/index.ts) và đảm bảo bạn đã deploy bản mới của backend.

### 7. `wrangler deploy` của web báo lỗi `compatibility flag` hoặc thiếu `nodejs_compat`
Phải có `"compatibility_flags": ["nodejs_compat"]` trong `apps/web/wrangler.jsonc`.

### 8. Ảnh placeholder không hiện
Kiểm tra `curl "$API/img/placeholder.svg?category=Tr%C3%A0&name=T"` trả `200 image/svg+xml`. Nếu 404, backend bản bạn deploy chưa có route `/img` — deploy lại `apps/api`.

### 9. Trang admin hoặc trang con trả 404 sau khi deploy
Kiểm tra `not_found_handling` trong `apps/web/wrangler.jsonc` và đã build lại chưa. Các trang `/`, `/cart`, `/admin` phải trả `200`.

### 10. Build web báo lỗi bộ nhớ hoặc treo
Đóng các tiến trình `next dev` và `wrangler dev` đang chạy (chúng có thể giữ cổng), rồi build lại. Không chạy `migrate`.

---

## 14. Chi phí và giới hạn

### Free plan (đủ cho dự án này)

| Tài nguyên | Giới hạn free | Ghi chú |
|---|---|---|
| Workers | 100.000 request/ngày | Đủ cho quán cafe nhỏ |
| D1 | 5 triệu lượt đọc và 100.000 lượt ghi/ngày, 5 GB | Đủ |
| KV | 100.000 lượt đọc và 1.000 lượt ghi/ngày | Đủ với giỏ hàng |

Dự án không dùng R2, nên không tốn phí lưu trữ ảnh.

### Giới hạn cần biết
- **Không có đăng nhập admin.** Trước khi đưa ra ngoài thật, cần thêm xác thực cho các route ghi (`POST/PATCH/DELETE`).
- **KV có tính nhất quán cuối cùng (eventual consistency):** giỏ hàng vừa ghi có thể mất vài giây để hiện ở vùng khác. Không ảnh hưởng một chi nhánh.
- **Ảnh là placeholder SVG**, không phải ảnh thật. Muốn ảnh thật cần thêm R2 và route upload.
- **Không commit id thật lên repo public.** Các id trong `wrangler.toml` và `wrangler.jsonc` là id của tài khoản bạn; cân nhắc tách ra file riêng hoặc dùng biến môi trường trước khi chia sẻ code.

---

## 15. Bài tập gợi ý

1. Deploy xong, thêm một món mới trên `/admin`, rồi kiểm tra lại trên `/api/products`. Chạy lại seed và giải thích vì sao món đó biến mất.
2. Đổi `name` trong `wrangler.toml` thành `ecom-api-<tên-bạn>`, deploy lại, và giải thích URL thay đổi thế nào. Phải build lại frontend với URL mới không?
3. Cố tình bỏ `NEXT_PUBLIC_API_URL` khi build, deploy, rồi dùng DevTools để tìm địa chỉ mà trình duyệt đang gọi. Giải thích vì sao giá trị đó sai.
4. Dùng `npx wrangler tail` trong khi đặt một đơn hàng, và đọc log để tìm request tương ứng.
5. Dùng `npx wrangler rollback` để quay lại bản trước, rồi deploy lại bản mới.
