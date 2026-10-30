Dự án ecommerce tinh gọn cho một quán cafe

Một trang trang chủ hiện thị danh sách các món quán đang có, kèm một giỏ hàng, cho phép người dụng đặt món tại quán hoặc ship đến địa chỉ khách hàng.


Triển khai trên hệ sinh thái Cloudflare
Có Backend, Frontend và một trang admin

Backend sử dụng thư viện honojs
 - Dùng cơ sở dữ liệu D1 để lưu danh sách sản phẩm
 - Dùng KV để lưu giỏ hàng của khách hàng.

Frontend sử dụng sử dụng cloudflare worker với framework là next.js và tailwindcss

Có sinh sẵn một bộ dữ liệu mẫu để test ở local

## Hướng dẫn chạy local

```bash
npm install            # cài dependencies toàn bộ workspaces
npm run seed           # nạp schema + dữ liệu mẫu vào D1 local
npm run dev:api        # Hono worker trên :8787 (D1/KV/R2 local)
# terminal khác:
npm run dev:web        # Next.js trên :3000
```

Mở `http://localhost:3000`:
- `/` — menu món, thêm vào giỏ
- `/cart` — giỏ hàng + đặt món (tại quán / ship)
- `/admin` — quản lý món, theo dõi đơn hàng

Build production: `npm run build`

Deploy lên Cloudflare cần `npx wrangler login` trước, rồi tạo D1/KV/R2 thật và thay id trong `apps/api/wrangler.toml`.
