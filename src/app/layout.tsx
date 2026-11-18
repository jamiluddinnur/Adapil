import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Adapil.ai — Setiap Aspirasi Warga Terjawab.", description: "Adapil.ai — Constituent Intelligence Dashboard untuk politisi Indonesia: inbox aspirasi, Isu & Sentimen dapil, dan Asisten Legislasi anti-buta-data." };
export const dynamic = "force-dynamic";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
