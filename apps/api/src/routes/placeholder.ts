import { Hono } from "hono";
import type { Env } from "../types";

export const placeholder = new Hono<{ Bindings: Env }>();

// Bảng màu theo danh mục — cho placeholder ảnh đỡ đơn điệu.
const CATEGORY_COLORS: Record<string, [string, string]> = {
  "Cà phê": ["#6B4226", "#F5E1C8"], // nâu cà phê
  Trà: ["#38761D", "#E4F2D8"], // xanh lá trà
  "Sinh tố": ["#E69100", "#FFF3D6"], // cam xoài
  "Đồ ăn nhanh": ["#C00000", "#FBE3E0"], // đỏ nhẹ
};

const EMOJIS: Record<string, string> = {
  "Cà phê": "☕",
  Trà: "🍵",
  "Sinh tố": "🥭",
  "Đồ ăn nhanh": "🥐",
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emojiFor(category?: string): string {
  if (!category) return "☕";
  return EMOJIS[category] ?? "☕";
}

function colorFor(category?: string): [string, string] {
  if (!category) return ["#92400E", "#FEF3C7"];
  return CATEGORY_COLORS[category] ?? ["#92400E", "#FEF3C7"];
}

/**
 * GET /img/placeholder.svg?category=...&name=...
 * Sinh ảnh SVG placeholder thay cho ảnh thật (tạm thời không dùng R2).
 */
placeholder.get("/placeholder.svg", (c) => {
  const category = c.req.query("category");
  const name = c.req.query("name") ?? "Ecom Cafe";
  const [fg, bg] = colorFor(category);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="${bg}"/>
  <text x="200" y="140" font-size="72" text-anchor="middle">${emojiFor(category)}</text>
  <text x="200" y="220" font-size="20" font-family="sans-serif" fill="${fg}" text-anchor="middle" font-weight="600">${escapeXml(name)}</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=86400",
    },
  });
});