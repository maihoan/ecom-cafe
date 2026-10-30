-- ============================================================
-- Ecom Cafe — schema & seed data (D1 local)
-- Chạy bằng: npm run seed  (wrangler d1 execute ... --local)
-- ============================================================

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL,          -- đơn vị: đồng
  image_url TEXT DEFAULT '',
  available INTEGER DEFAULT 1,     -- 1 = đang bán
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT,
  type TEXT,                       -- instore | ship
  address TEXT,
  items TEXT,                      -- JSON
  total INTEGER,
  status TEXT DEFAULT 'new',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Bộ dữ liệu mẫu
INSERT OR REPLACE INTO products (id, name, category, price, image_url, available) VALUES
  (1, 'Cà phê sữa đá', 'Cà phê', 25000, '', 1),
  (2, 'Cà phê đen', 'Cà phê', 20000, '', 1),
  (3, 'Espresso', 'Cà phê', 22000, '', 1),
  (4, 'Cappuccino', 'Cà phê', 32000, '', 1),
  (5, 'Trà đào', 'Trà', 28000, '', 1),
  (6, 'Trà Lipton', 'Trà', 20000, '', 1),
  (7, 'Sinh tố xoài', 'Sinh tố', 35000, '', 1),
  (8, 'Sinh tố bơ', 'Sinh tố', 40000, '', 1),
  (9, 'Bánh mì pate', 'Đồ ăn nhanh', 25000, '', 1),
  (10, 'Bánh croissant', 'Đồ ăn nhanh', 30000, '', 1);