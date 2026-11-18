# Adapil.ai — Setiap Aspirasi Warga Terjawab.

Constituent Intelligence Dashboard untuk politisi Indonesia: inbox aspirasi,
Isu & Sentimen media sosial dapil, Asisten Legislasi anti-buta-data, dan Agen
Konsultan (AI agent: menyusun rencana, memanggil tool atas data dapil sendiri,
membuat draf/dokumen, dan mencatat jejak tool-nya) plus Agen Pagi (pemeriksaan
otomatis sekali sehari dengan rencana tindakan).
Fokus wilayah: **NTB** (DPR RI, DPRD Provinsi, dan DPRD 10 kabupaten/kota).

- **Starter:** gratis (paket awal — 1 politisi, 1 dapil, inbox aspirasi)
- **Pro:** Rp499.000/bulan
- **Timses / Partai:** Rp1.000.000/bulan
- Langganan berbayar hanya Pro dan Timses / Partai. Paket Kampanye dihapus dari daftar langganan.
- **Login:** email + kata sandi (hash scrypt), sesi server 30 hari, data tiap akun terpisah
- **AI agent:** Agen Konsultan di `src/lib/agent.ts` memakai 8 tool
  (`ringkas_dapil`, `cari_aspirasi`, `aspirasi_mendesak`, `isu_naik`,
  `titik_buta`, `buat_draf_balasan`, `buat_dokumen`, `ubah_status_aspirasi`).
  Tanpa kunci LLM, perencana rule-based yang memilih tool; dengan `OPENAI_API_KEY`
  atau `GEMINI_API_KEY`, model yang memilih lewat function calling
  (`src/lib/llm.ts` — provider-agnostik). Setiap pemanggilan tool dicatat ke
  `AgentToolLog` dan ditampilkan di UI ("Alat yang dipakai"); evaluasi agen
  (30 hari: pemanggilan tool, tindakan disetujui, draf disetujui) ada di tab
  Laporan. Agen Pagi memeriksa dapil sekali sehari — via cron Vercel
  (`/api/cron/morning-briefing`, 07:00 WITA) dan briefing dikirim lewat
  WhatsApp/email bila terhubung, atau dibaca di Beranda. Koreksi pengguna
  atas saran AI (`/api/ai-corrections`) dipakai klasifikasi berikutnya.
  Sentimen selalu **estimasi dari contoh unggahan yang ditempel tim — BUKAN
  data live** platform media sosial. Tidak ada auto-posting; manusia
  menyetujui setiap draf dan setiap tindakan agen.
- **WhatsApp-first:** staf forward pesan warga → tempel di tab Aspirasi →
  agen mengekstrak jadi aspirasi (`/api/aspirations/extract`); atau hubungkan
  webhook WhatsApp Cloud API supaya pesan masuk langsung jadi aspirasi.
- **Tim & bukti kerja:** tab Tim (politisi + staf, penugasan + tenggat per
  aspirasi), jejak tindak lanjut ke dinas (`FollowUp`: dinas, nomor surat,
  status), Laporan Bulanan (bukti kerja, bisa dicetak/PDF), persetujuan draf
  (draf → disetujui/ditolak), upload PDF RUU/Perda/APBD (teks diekstrak di
  browser, hanya judul yang dikutip dokumen — angka tidak dikutip otomatis),
  reset kata sandi lewat email (bila Resend terpasang).
- **Guardrail hoaks:** isu berlabel hoaks tanpa tautan sumber resmi tidak
  bisa dibuatkan draf klarifikasi — tim harus menempel sumber dulu.
- **Midtrans:** Snap aktif otomatis saat `MIDTRANS_SERVER_KEY` dipasang;
  tanpa kunci, checkout berjalan dalam **mode simulasi yang diberi label jelas**
  dan tidak ada tagihan nyata.

## Teknologi

Next.js 14 (App Router, TypeScript) + Prisma + PostgreSQL.
Database: gunakan Postgres hosted (Neon / Supabase) lewat `DATABASE_URL`.

## Jalankan lokal

```bash
npm install
cp .env.example .env.local
# Isi DATABASE_URL dengan Postgres hosted (Neon/Supabase) dan SESSION_SECRET acak.
# Tanpa Postgres lokal: buat database gratis di Neon (neon.tech) atau Supabase,
# lalu salin connection string-nya ke DATABASE_URL.
npx prisma db push             # JANGAN pakai `prisma migrate deploy` — repo ini belum punya folder prisma/migrations/, jadi perintah itu tidak membuat tabel apa pun
npm run db:seed             # opsional: akun demo + data contoh NTB
npm run dev                 # http://localhost:3000
```

Akun demo setelah seed: `demo@adapil.ai` / `demo1234` (profil DPRD Provinsi NTB 2, data contoh).

## Push ke GitHub

Repo ini adalah **root aplikasi Next.js** — `package.json` ada di root repo,
**bukan** di dalam folder `adapil/`. Jadi di Vercel, **Root Directory dibiarkan kosong**.

```bash
cd adapil
git init
git add .
git commit -m "Adapil.ai v1: Constituent Intelligence Dashboard (login, aspirasi, Isu & Sentimen, Legislasi, Midtrans)"
# Buat repo kosong di github.com (misal: adapil) — JANGAN centang README/.gitignore di GitHub
git remote add origin https://github.com/NAMA-USER/adapil.git
git branch -M main
git push -u origin main
```

> Jangan pernah commit `.env`, `.env.local`, atau kunci Midtrans / database.
> File-file itu sudah ada di `.gitignore`. Yang aman di-commit hanya `.env.example`.

## Deploy di Vercel

1. Buka vercel.com → **Add New → Project** → **Import** repo `adapil` dari GitHub.
2. Framework: Next.js (terdeteksi otomatis). **Root Directory: kosong** (package.json ada di root repo).
   Build Command: `npx prisma db push && npm run build` — ini yang membuat tabel
   database otomatis saat deploy, jadi tidak perlu terminal. Jangan biarkan di
   `npm run build` saja, tabel tidak akan dibuat dan login/daftar akan gagal.
3. Di **Settings → Environment Variables**, isi:

- `DATABASE_URL` — connection string Postgres (Neon/Supabase)
- `SESSION_SECRET` — string acak panjang (mis. `openssl rand -hex 32`)
- `OPENAI_API_KEY` — opsional; pasang SALAH SATU dari OpenAI/Gemini untuk menyalakan LLM. Kosong = AI rule-based.
- `GEMINI_API_KEY` — opsional; alternatif OpenAI (dari Google AI Studio, gratis ada kuotanya). Bila kedua kunci dipasang, OpenAI dipakai duluan; paksa salah satu dengan `LLM_PROVIDER=openai` atau `LLM_PROVIDER=gemini`.
- `LLM_PROVIDER` — opsional: `openai` / `gemini` / kosong (auto).
- `RESEND_API_KEY` + `EMAIL_FROM` — opsional; untuk kirim Briefing Pagi lewat email dan tautan reset kata sandi. Tanpa ini, briefing tidak terkirim (tetap bisa dibaca di Beranda) dan reset kata sandi tidak bisa dikirim.
- `WHATSAPP_ACCESS_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` — opsional; untuk kirim Briefing Pagi lewat WhatsApp dan balasan konfirmasi webhook. Dari Meta for Developers → WhatsApp.
- `WHATSAPP_VERIFY_TOKEN` + `WHATSAPP_OWNER_EMAIL` — opsional; untuk webhook pesan masuk (warga kirim pesan → jadi aspirasi otomatis). Callback URL: `https://adapil.vercel.app/api/webhooks/whatsapp`.
- `CRON_SECRET` — disarankan; mengunci rute cron Agen Pagi (`/api/cron/morning-briefing`, jadwal 07:00 WITA di `vercel.json`). Vercel mengirimkannya otomatis bila dipasang.
- `MIDTRANS_SERVER_KEY` — dari dashboard Midtrans (kosongkan = mode simulasi)
- `MIDTRANS_CLIENT_KEY` — dari dashboard Midtrans (opsional, untuk Snap.js)
- `MIDTRANS_IS_PRODUCTION` — `false` (sandbox) / `true` (produksi)
- `NEXT_PUBLIC_APP_URL` — URL Vercel kamu, mis. `https://adapil.vercel.app`

4. **Database (Neon via Vercel Marketplace):** di Vercel, buka **Storage → Create → Postgres
   (Neon)**. Pilih:
   - **Environments: Production only**
   - **Create database branch for deployment: off** (jangan dicentang)
   - **Custom Prefix: `DATABASE`** — wajib diisi. Prefix `DATABASE` + `URL` menghasilkan
     `DATABASE_URL`, nama persis yang dibaca aplikasi ini. Kalau prefix dikosongkan,
     tombol Connect tidak bisa diklik.
   - **Sensitive: off** (bila ditampilkan)
   - Lalu **Connect** ke project `adapil` (Production).

   > ⚠️ **PENTING — periksa `DATABASE_URL` sebelum Deploy.** Aplikasi ini hanya
   > membaca environment variable bernama persis `DATABASE_URL`. Vercel / Neon
   > kadang hanya membuat `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, atau
   > `POSTGRES_URL_NON_POOLING`. Bila `DATABASE_URL` tidak ada di Production,
   > tambahkan manual di **Settings → Environment Variables → Production**
   > dengan nilai yang disalin dari URL **direct / non-pooling**
   > (`POSTGRES_URL_NON_POOLING` atau `DATABASE_URL_UNPOOLED`).
   > Untuk membuat tabel, pakai connection string **langsung (direct, tanpa
   > `-pooler`)**; connection string pooler bisa gagal saat membuat tabel.
   > (Jangan jalankan `prisma migrate deploy` di produksi — repo ini tidak
   > punya folder `prisma/migrations/`, jadi perintah itu tidak membuat tabel.)

5. **Deploy.** Dengan Build Command di langkah 2, tabel database dibuat otomatis
   saat deploy — tidak ada langkah terminal. (Hanya kalau kamu terlanjur deploy
   dengan Build Command `npm run build`, jalankan sekali dari terminal
   `npx prisma db push` dengan connection string **langsung/direct, tanpa `-pooler`**,
   lalu Redeploy di Vercel.)

6. Uji: daftar akun → isi profil & pilih dapil NTB → catat aspirasi → analisis isu
   → buat dokumen legislasi → tanya Konsultan AI ("Apa yang paling mendesak minggu ini?")
   → checkout paket. Tanpa `MIDTRANS_SERVER_KEY`,
   checkout berlabel **SIMULASI** dan tidak menagih.

## Webhook Midtrans

Di dashboard Midtrans, arahkan Payment Notification URL ke:

```
https://DOMAIN-KAMU/api/webhooks/midtrans
```

Webhook memverifikasi signature SHA512 (`order_id + status_code + gross_amount + ServerKey`)
sebelum mengubah status pembayaran menjadi Lunas / Gagal dan mengaktifkan paket.

## Katalog Dapil NTB (PKPU 6/2023, Pemilu 2024)

Data lengkap ada di `src/lib/dapil.ts` dan endpoint publik `/api/dapil`.

- **DPR RI (11 kursi):** NTB I Pulau Sumbawa 3 kursi (Sumbawa Barat, Sumbawa, Dompu,
  Bima, Kota Bima); NTB II Pulau Lombok 8 kursi (Lombok Barat, Lombok Utara,
  Lombok Timur, Lombok Tengah, Kota Mataram).
- **DPRD Provinsi NTB (65 kursi, 8 dapil):** NTB 1 Kota Mataram 5; NTB 2 Lombok
  Barat+Lombok Utara 12; NTB 3 Lombok Timur A 9; NTB 4 Lombok Timur B 6;
  NTB 5 Sumbawa Barat+Sumbawa 8; NTB 6 Dompu+Bima+Kota Bima 11;
  NTB 7 Lombok Tengah A 7; NTB 8 Lombok Tengah B 7.
- **DPRD Kabupaten/Kota NTB (50 dapil, 385 kursi):** Kab. Bima 45, Dompu 30,
  Lombok Barat 45, Lombok Tengah 50, Lombok Timur 50, Lombok Utara 30,
  Sumbawa 45, Sumbawa Barat 25, Kota Bima 25, Kota Mataram 40 — lengkap dengan
  komposisi kecamatan per dapil.

## Struktur

```
prisma/schema.prisma      # User, Session, Profile, Aspiration, Issue, LegislativeDoc, ConsultantMessage, Subscription, Payment
prisma/seed.ts            # Akun demo + profil & data contoh NTB
src/lib/dapil.ts          # Katalog dapil NTB (PKPU 6/2023)
src/lib/prisma.ts         # Prisma client + definisi paket
src/lib/auth.ts           # Hash scrypt, sesi 30 hari, cookie httpOnly
src/lib/ai.ts             # AI rule-based (klasifikasi/sentimen) + OpenAI opsional
src/lib/midtrans.ts       # Snap order, verifikasi signature, cek status
src/app/page.tsx          # Beranda, Profil & Dapil, Aspirasi, Isu & Sentimen, Legislasi, Konsultan AI, Laporan, Paket
src/app/api/auth/*        # register, login, logout, me
src/app/api/dapil         # Katalog dapil NTB (publik)
src/app/api/profile       # Profil politisi & dapil
src/app/api/aspirations/* # CRUD aspirasi + klasifikasi AI
src/app/api/issues/*      # CRUD isu + analisis sentimen AI
src/app/api/legislative/* # Pusat Bukti, generator 6 jenis dokumen, CRUD dokumen
src/app/api/consultant/chat # Konsultan AI (GET riwayat, POST tanya, DELETE hapus riwayat)
src/app/api/payments/*    # Buat pesanan, konfirmasi simulasi
src/app/api/webhooks/midtrans   # Webhook Midtrans
public/adapil-logo.webp  # Logo resmi Adapil.ai (dipakai di header & favicon)
```

## Yang masih simulasi / belum live

- **Midtrans tanpa kunci:** checkout membuat pesanan dengan mode `simulasi`,
  tanpa redirect Snap dan tanpa tagihan. Pasang `MIDTRANS_SERVER_KEY`
  (sandbox dulu) untuk transaksi nyata.
- **AI tanpa kunci OpenAI:** klasifikasi aspirasi, analisis sentimen, draf
  legislasi, dan jawaban Konsultan AI memakai mesin rule-based kata kunci
  (bukan LLM) — bekerja penuh secara manual, dan tidak mengarang angka:
  semua angka jawaban Konsultan AI berasal dari data dapil yang tercatat.
- **Media sosial:** tidak ada koneksi live ke TikTok / Instagram / X / Facebook.
  Sentimen dihitung dari contoh unggahan yang ditempel tim dan diberi label
  jelas sebagai estimasi dari contoh.
- **Upload dokumen RUU/Perda/APBD:** belum ada — generator legislasi bekerja
  dari data aspirasi dapil yang tercatat, bukan dari membaca file PDF.
