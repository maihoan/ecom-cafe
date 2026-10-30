// Cấu hình OpenNext Cloudflare cho Next.js trên Workers.
// Dùng KV làm incremental cache (tránh R2 — dự án đang dùng KV sẵn có).
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
});
