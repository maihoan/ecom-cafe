import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { Env } from "./types";
import { products } from "./routes/products";
import { cart } from "./routes/cart";
import { orders } from "./routes/orders";
import { placeholder } from "./routes/placeholder";

const app = new Hono<{ Bindings: Env }>();

app.use("*", logger());
app.use("/api/*", cors());
app.use("/img/*", cors());

app.get("/", (c) =>
  c.json({
    name: "Ecom Cafe API",
    endpoints: {
      products: "/api/products (GET, POST)",
      productById: "/api/products/:id (GET, PATCH, DELETE)",
      cart: "/api/cart/:customerId (GET, PUT, DELETE)",
      orders: "/api/orders (GET, POST) / /api/orders/:id (PATCH)",
      placeholder: "/img/placeholder.svg?category=...&name=... (SVG)",
    },
  })
);

app.route("/api/products", products);
app.route("/api/cart", cart);
app.route("/api/orders", orders);
app.route("/img", placeholder);

export default app;