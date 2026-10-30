import { Hono } from "hono";
import type { Env, NewProduct } from "../types";

export const products = new Hono<{ Bindings: Env }>();

/** GET /api/products — danh sách món đang bán */
products.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM products WHERE available = 1 ORDER BY id ASC"
  ).all();
  return c.json({ products: results });
});

/** GET /api/products/all — toàn bộ món (kể cả ẩn), cho trang admin */
products.get("/all", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM products ORDER BY id ASC"
  ).all();
  return c.json({ products: results });
});

/** GET /api/products/:id — chi tiết một món */
products.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "Invalid id" }, 400);

  const result = await c.env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(id).first();
  if (!result) return c.json({ error: "Product not found" }, 404);
  return c.json({ product: result });
});

/** POST /api/products — thêm món mới (admin) */
products.post("/", async (c) => {
  const body = await c.req.json<NewProduct>();

  if (!body.name || !body.category || typeof body.price !== "number") {
    return c.json({ error: "name, category, price are required" }, 400);
  }

  const { success, meta } = await c.env.DB.prepare(
    "INSERT INTO products (name, category, price, image_url, available) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(body.name, body.category, body.price, body.image_url ?? "", body.available ?? 1)
    .run();

  if (!success) return c.json({ error: "Failed to insert" }, 500);
  return c.json({ id: meta.last_row_id }, 201);
});

/** PATCH /api/products/:id — cập nhật món (admin) */
products.patch("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<Partial<NewProduct>>();
  if (!Number.isInteger(id)) return c.json({ error: "Invalid id" }, 400);

  const { success } = await c.env.DB.prepare(
    "UPDATE products SET name = ?, category = ?, price = ?, image_url = ?, available = ? WHERE id = ?"
  )
    .bind(
      body.name ?? "",
      body.category ?? "",
      body.price ?? 0,
      body.image_url ?? "",
      body.available ?? 1,
      id
    )
    .run();

  if (!success) return c.json({ error: "Failed to update" }, 500);
  return c.json({ ok: true });
});

/** DELETE /api/products/:id — xóa món (admin) */
products.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "Invalid id" }, 400);

  const { success } = await c.env.DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
  if (!success) return c.json({ error: "Failed to delete" }, 500);
  return c.json({ ok: true });
});