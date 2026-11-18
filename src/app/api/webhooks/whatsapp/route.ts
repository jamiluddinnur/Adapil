import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractAspirationFromText } from "@/lib/ai";
import { sendWhatsApp } from "@/lib/notify";

// Webhook tidak boleh di-prerender saat build (ia membaca database).
export const dynamic = "force-dynamic";

// Webhook WhatsApp Cloud API (Meta) — "tinggal dihubungkan".
// Cara pasang (sekali, di Meta for Developers → WhatsApp → Configuration):
//   1. Callback URL: https://adapil.vercel.app/api/webhooks/whatsapp
//   2. Verify token: isi WHATSAPP_VERIFY_TOKEN (samakan dengan env di Vercel)
//   3. Subscribe ke field "messages"
//   4. Di Vercel pasang: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
//      WHATSAPP_VERIFY_TOKEN, WHATSAPP_OWNER_EMAIL (akun Adapil pemilik nomor)
//
// Alur: warga mengirim pesan ke nomor WA Adapil → Meta meneruskan ke sini →
// agen mengekstrak aspirasi (tanpa LLM: aturan kata kunci; dengan kunci
// OpenAI/Gemini: LLM) → aspirasi tersimpan di akun pemilik nomor →
// pengirim mendapat balasan konfirmasi otomatis (bila pengiriman WA aktif).
// Tanpa env di atas, webhook menjawab "belum terpasang" — bukan error samar.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && process.env.WHATSAPP_VERIFY_TOKEN && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge || "", { status: 200 });
  }
  return NextResponse.json({ error: "Verifikasi webhook gagal — periksa WHATSAPP_VERIFY_TOKEN." }, { status: 403 });
}

export async function POST(req: Request) {
  try {
    const ownerEmail = process.env.WHATSAPP_OWNER_EMAIL || "";
    if (!ownerEmail) {
      return NextResponse.json({ error: "Webhook belum terpasang: isi WHATSAPP_OWNER_EMAIL di Vercel." }, { status: 503 });
    }
    const owner = await prisma.user.findUnique({ where: { email: ownerEmail }, include: { profile: true } });
    if (!owner) {
      return NextResponse.json({ error: "Akun pemilik nomor WA tidak ditemukan." }, { status: 503 });
    }
    const body = await req.json().catch(() => ({}));
    const regions = (owner.profile?.regions || "").split(",").map((s: string) => s.trim()).filter(Boolean);
    const entries = Array.isArray(body.entry) ? body.entry : [];
    let created = 0;
    for (const entry of entries) {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];
      for (const ch of changes) {
        const value = ch.value || {};
        const messages = Array.isArray(value.messages) ? value.messages : [];
        for (const m of messages) {
          if (m.type !== "text" || !m.text?.body) continue;
          const text = String(m.text.body).trim();
          if (!text) continue;
          const r = await extractAspirationFromText(text, regions);
          await prisma.aspiration.create({
            data: {
              userId: owner.id,
              title: r.title,
              text: r.senderName ? `${r.text}\n\n— ${r.senderName} (via WhatsApp)` : r.text,
              source: "WhatsApp",
              category: r.category,
              region: r.region,
              priority: r.priority,
            },
          });
          created += 1;
          // Balasan konfirmasi ke warga (bila pengiriman WA aktif).
          const from = String(m.from || "");
          if (from) {
            await sendWhatsApp(from, `Terima kasih, aspirasi Anda soal "${r.title}" sudah kami terima dan catat. Tim kami akan menindaklanjuti dan memberi kabar perkembangannya di sini. — Adapil.ai`);
          }
        }
      }
    }
    return NextResponse.json({ ok: true, created });
  } catch {
    return NextResponse.json({ error: "Webhook gagal memproses pesan." }, { status: 500 });
  }
}
