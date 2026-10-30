import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ecom Cafe — Đặt món trực tuyến",
  description: "Menu quán cafe, đặt món tại quán hoặc ship tận nơi.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen flex flex-col">
        <header className="bg-black text-white">
          <nav className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold tracking-tight">
              ☕ Ecom Cafe
            </Link>
            <div className="flex items-center gap-5 text-sm">
              <Link href="/" className="hover:opacity-75">Menu</Link>
              <Link href="/cart" className="hover:opacity-75">Giỏ hàng</Link>
              <Link href="/admin" className="hover:opacity-75 text-violet-300">Admin</Link>
            </div>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-stone-200 py-6 text-center text-sm text-stone-500">
          Ecom Cafe — demo trên Cloudflare Workers · D1 · KV · R2 · Next.js
        </footer>
      </body>
    </html>
  );
}