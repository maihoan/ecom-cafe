// Shared types for the ecom backend.

export interface Env {
  /** D1 database — danh sách sản phẩm + đơn hàng */
  DB: D1Database;
  /** KV — giỏ hàng của khách hàng (key: cart:<customerId>) */
  CART: KVNamespace;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  image_url: string;
  available: number; // 1 = đang bán, 0 = tạm ẩn
  created_at?: string;
}

export type NewProduct = Omit<Product, "id" | "available" | "created_at"> &
  Partial<Pick<Product, "available">>;

export interface CartItem {
  id: number;
  name?: string;
  price?: number;
  qty: number;
}

export interface Cart {
  customer_id: string;
  items: CartItem[];
  updated_at?: string;
}

export interface Order {
  id: number;
  customer_id: string;
  type: "instore" | "ship";
  address?: string;
  items: string; // JSON
  total: number;
  status: string;
  created_at?: string;
}

export interface NewOrder {
  customer_id: string;
  type: "instore" | "ship";
  address?: string;
  items: CartItem[];
  total: number;
}