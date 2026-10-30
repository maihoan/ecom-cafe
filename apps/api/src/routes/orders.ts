import { Hono } from "hono";
import type { Env, NewOrder } from "../types";

export const orders = new Hono<{ Bindings: Env }>();

/** POST /api/orders — đặt món (tại quán hoặc ship) */
orders.post("/", async (c) => {
  const body = await c.req.json<NewOrder>();

  if (!body.customer_id || (body.type !== "instore" && body.type !== "ship")) {
    return c.json({ error: "customer_id and type (instore|ship) are required" }, 400);
  }
  if (body.type === "ship" && !body.address?.trim()) {
    return c.json({ error: "address is required for ship orders" }, 400);
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return c.json({ error: "items is required" }, 400);
  }

  const total = body.total ?? items.reduce((sum, it) => sum + (it.price ?? 0) * it.qty, 0);

  const { success, meta } = await c.env.DB.prepare(
    "INSERT INTO orders (customer_id, type, address, items, total, status) VALUES (?, ?, ?, ?, ?, 'new')"
  )
    .bind(
      body.customer_id,
      body.type,
      body.address ?? "",
      JSON.stringify(items),
      total
    )
    .run();

  if (!success) return c.json({ error: "Failed to create order" }, 500);
  return c.json({ order_id: meta.last_row_id, total }, 201);
});

/** GET /api/orders — danh sách đơn hàng (admin) */
orders.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM orders ORDER BY id DESC LIMIT 200"
  ).all();
  return c.json({ orders: results });
});

/** PATCH /api/orders/:id — cập nhật trạng thái đơn (admin) */
orders.patch("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ status: string }>();
  if (!Number.isInteger(id)) return c.json({ error: "Invalid id" }, 400);
  if (!body.status) return c.json({ error: "status is required" }, 400);

  const { success } = await c.env.DB.prepare("UPDATE orders SET status = ? WHERE id = ?")
    .bind(body.status, id)
    .run();

  if (!success) return c.json({ error: "Failed to update order" }, 500);
  return c.json({ ok: true });
});