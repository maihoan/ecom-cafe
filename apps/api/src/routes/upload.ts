import { Hono } from "hono";
import type { Env } from "../types";

export const upload = new Hono<{ Bindings: Env }>();

/** POST /api/upload — upload ảnh món lên R2, trả về URL tương đối.
 * Dùng cho trang admin. Body là multipart/form-data, field "file". */
upload.post("/", async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return c.json({ error: "Missing file (field 'file')" }, 400);
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const key = `menu/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  await c.env.IMAGES.put(key, arrayBuffer, {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });

  // URL tương đối; frontend sẽ lấy qua worker (GET /img/*) hoặc proxy R2.
  return c.json({ key, url: `/img/${key}` }, 201);
});

/** GET /img/:key — phục vụ ảnh từ R2 (proxy qua worker) */
upload.get("/:key{.+}", async (c) => {
  const key = c.req.param("key");
  const object = await c.env.IMAGES.get(key);
  if (object === null) return c.json({ error: "Not found" }, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  if (object.key.includes(".")) headers.set("cache-control", "public, max-age=31536000");

  return new Response(object.body, { headers });
});