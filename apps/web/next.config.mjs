/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Khi chạy local: proxy mọi /api/* và /img/* sang Hono worker (apps/api on :8787).
    const apiUrl = process.env.API_URL ?? "http://localhost:8787";
    return [
      { source: "/api/:path*", destination: `${apiUrl}/api/:path*` },
      { source: "/img/:path*", destination: `${apiUrl}/img/:path*` },
    ];
  },
};

export default nextConfig;