export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  image_url: string;
  available: number;
}

export interface CartItem {
  id: number;
  name?: string;
  price?: number;
  qty: number;
}

export interface Order {
  id: number;
  customer_id: string;
  type: "instore" | "ship";
  address?: string;
  items: string;
  total: number;
  status: string;
  created_at?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getProducts: () =>
    request<{ products: Product[] }>("/api/products").then((d) => d.products),

  getAllProducts: () =>
    request<{ products: Product[] }>("/api/products/all").then((d) => d.products),

  addProduct: (p: Partial<Product>) =>
    request<{ id: number }>("/api/products", { method: "POST", body: JSON.stringify(p) }),

  updateProduct: (id: number, p: Partial<Product>) =>
    request<{ ok: boolean }>(`/api/products/${id}`, { method: "PATCH", body: JSON.stringify(p) }),

  deleteProduct: (id: number) =>
    request<{ ok: boolean }>(`/api/products/${id}`, { method: "DELETE" }),

  getCart: (customerId: string) =>
    request<{ customer_id: string; items: CartItem[] }>(`/api/cart/${customerId}`),

  putCart: (customerId: string, items: CartItem[]) =>
    request<{ saved: boolean }>(`/api/cart/${customerId}`, {
      method: "PUT",
      body: JSON.stringify({ items }),
    }),

  clearCart: (customerId: string) =>
    request<{ cleared: boolean }>(`/api/cart/${customerId}`, { method: "DELETE" }),

  createOrder: (o: {
    customer_id: string;
    type: "instore" | "ship";
    address?: string;
    items: CartItem[];
    total: number;
  }) => request<{ order_id: number; total: number }>("/api/orders", {
    method: "POST",
    body: JSON.stringify(o),
  }),

  getOrders: () => request<{ orders: Order[] }>("/api/orders").then((d) => d.orders),

  updateOrderStatus: (id: number, status: string) =>
    request<{ ok: boolean }>(`/api/orders/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
};