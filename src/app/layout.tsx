import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Adapil.ai — Setiap Aspirasi Warga Terjawab.", description: "Adapil.ai — Constituent Intelligence Dashboard untuk politisi Indonesia: inbox aspirasi, Isu & Sentimen dapil, dan Asisten Legislasi anti-buta-data." };
export const dynamic = "force-dynamic";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="id"><body>{children}</body></html>);
}
