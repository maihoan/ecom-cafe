"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type CartItem, type Product } from "./api";

const LS_KEY = "ecom_cart";
const CUSTOMER_KEY = "ecom_customer_id";

function makeCustomerId(): string {
  return `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getCustomerId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(CUSTOMER_KEY);
  if (!id) {
    id = makeCustomerId();
    localStorage.setItem(CUSTOMER_KEY, id);
  }
  return id;
}

/** Hook quản lý giỏ hàng: lưu localStorage (offline) + đồng bộ lên KV backend. */
export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load từ localStorage khi mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {}
    setLoaded(true);
  }, []);

  // Đồng bộ lên KV khi items thay đổi (sau khi load xong)
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(LS_KEY, JSON.stringify(items));
    api.putCart(getCustomerId(), items).catch(() => {});
  }, [items, loaded]);

  const addProduct = useCallback((p: Product, qty = 1) => {
    setItems((prev) => {
      const found = prev.find((it) => it.id === p.id);
      if (found) {
        return prev.map((it) =>
          it.id === p.id ? { ...it, qty: it.qty + qty } : it
        );
      }
      return [...prev, { id: p.id, name: p.name, price: p.price, qty }];
    });
  }, []);

  const setQty = useCallback((id: number, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((it) => it.id !== id)
        : prev.map((it) => (it.id === id ? { ...it, qty } : it))
    );
  }, []);

  const removeItem = useCallback((id: number) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const clear = useCallback(async () => {
    setItems([]);
    localStorage.removeItem(LS_KEY);
    await api.clearCart(getCustomerId()).catch(() => {});
  }, []);

  const total = items.reduce((sum, it) => sum + (it.price ?? 0) * it.qty, 0);

  return { items, loaded, addProduct, setQty, removeItem, clear, total };
}