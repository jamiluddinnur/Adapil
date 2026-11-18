import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDailyBriefing } from "@/lib/agent";
import { deliverBriefing } from "@/lib/notify";

// Cron tidak boleh di-prerender saat build (ia membaca database).
export const dynamic = "force-dynamic";

// Cron Agen Pagi — dipanggil Vercel Cron tiap hari 07:00 WITA
// (jadwal di vercel.json: "0 23 * * *" UTC). Untuk SETIAP akun: hitung
// pemeriksaan hari ini (sekali saja), lalu KIRIM briefing-nya via WhatsApp
// (bila nomor + kunci WA terpasang) atau email (bila Resend terpasang).
// Bila tidak ada kanal pengiriman yang terpasang, briefing tetap tersimpan
// dan bisa dibaca di Beranda — deliveredVia dicatat "belum-terkirim".
//
// Pengaman: bila CRON_SECRET dipasang di env, request harus membawa
// `Authorization: Bearer <CRON_SECRET>` (Vercel mengirimnya otomatis)
// atau `?secret=<CRON_SECRET>`. Tanpa CRON_SECRET, rute tetap bisa dipanggil
// siapa saja — pasang CRON_SECRET sebelum go-live.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const url = new URL(req.url);
    const bearer = req.headers.get("authorization") || "";
    if (bearer !== `Bearer ${secret}` && url.searchParams.get("secret") !== secret) {
      return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
    }
  }
  const users = await prisma.user.findMany({ include: { profile: true } });
  const results: Array<{ email: string; isNew: boolean; deliveredVia: string }> = [];
  for (const u of users) {
    try {
      const { run, isNew } = await ensureDailyBriefing(u.id);
      let via = run.deliveredVia || "";
      if (!via) {
        const actions = JSON.parse(run.actions || "[]") as Array<{ title: string; detail: string }>;
        via = (await deliverBriefing({
          email: u.email,
          phone: u.profile?.phone || "",
          summary: run.summary,
          actions,
          dapilName: u.profile?.dapilName || "",
        })) || "belum-terkirim";
        await prisma.agentRun.update({ where: { id: run.id }, data: { deliveredVia: via } });
      }
      results.push({ email: u.email, isNew, deliveredVia: via });
    } catch {
      results.push({ email: u.email, isNew: false, deliveredVia: "gagal" });
    }
  }
  return NextResponse.json({ ok: true, users: results.length, results });
}
