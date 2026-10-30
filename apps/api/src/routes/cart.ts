import { Hono } from "hono";
import type { Env, Cart } from "../types";

export const cart = new Hono<{ Bindings: Env }>();

const KEY_PREFIX = "cart:";
// Giỏ hàng lưu tối đa 30 ngày kể từ lần ghi cuối.
const TTL_SECONDS = 60 * 60 * 24 * 30;

/** GET /api/cart/:customerId — đọc giỏ hàng của khách */
cart.get("/:customerId", async (c) => {
  const customerId = c.req.param("customerId");
  const raw = await c.env.CART.get(KEY_PREFIX + customerId);

  if (!raw) {
    return c.json({ customer_id: customerId, items: [] });
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Cart>;
    return c.json({ customer_id: customerId, items: parsed.items ?? [] });
  } catch {
    return c.json({ customer_id: customerId, items: [] });
  }
});

/** PUT /api/cart/:customerId — ghi đè giỏ hàng */
cart.put("/:customerId", async (c) => {
  const customerId = c.req.param("customerId");
  const body = await c.req.json<Partial<Cart>>();

  const items = Array.isArray(body.items) ? body.items : [];
  const value = JSON.stringify({ items });

  await c.env.CART.put(KEY_PREFIX + customerId, value, { expirationTtl: TTL_SECONDS });
  return c.json({ customer_id: customerId, items, saved: true });
});

/** DELETE /api/cart/:customerId — xóa giỏ hàng (sau khi đặt món) */
cart.delete("/:customerId", async (c) => {
  const customerId = c.req.param("customerId");
  await c.env.CART.delete(KEY_PREFIX + customerId);
  return c.json({ customer_id: customerId, cleared: true });
});