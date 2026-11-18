// Pengiriman notifikasi Adapil — email (Resend) dan WhatsApp (Cloud API).
// "Tinggal dihubungkan": pasang env var di Vercel, tanpa ubah kode.
// Tanpa kunci, fungsi-fungsi ini mengembalikan null dan pemanggil
// menampilkan pesan jujur ("belum terpasang") — bukan error misterius.
//
//   RESEND_API_KEY=re_... ; EMAIL_FROM="Adapil.ai <briefing@adapil.ai>"
//   WHATSAPP_ACCESS_TOKEN=EA... ; WHATSAPP_PHONE_NUMBER_ID=123...
//   WHATSAPP_VERIFY_TOKEN=...   (untuk webhook, bukan untuk kirim)
//   WHATSAPP_OWNER_EMAIL=...    (akun pemilik nomor WA — untuk webhook masuk)

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function whatsappConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (!emailConfigured()) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendWhatsApp(to: string, text: string): Promise<boolean> {
  if (!whatsappConfigured()) return false;
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function formatBriefingText(summary: string, actions: Array<{ title: string; detail: string }>, dapilName: string): string {
  const lines = [
    `*Briefing Pagi Adapil.ai* — ${new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`,
    dapilName ? `Dapil: ${dapilName}` : "",
    "",
    summary,
    "",
    "Rencana tindakan hari ini:",
    ...actions.map((a, i) => `${i + 1}. ${a.title} — ${a.detail}`),
    "",
    "Buka Adapil.ai untuk menyetujui dan menjalankan tindakan di atas. Agen hanya mengusulkan — keputusan tetap di tangan Anda.",
  ];
  return lines.filter(Boolean).join("\n");
}

/** Kirim briefing: WhatsApp dulu (bila nomor + kunci ada), lalu email. */
export async function deliverBriefing(opts: {
  email: string;
  phone: string;
  summary: string;
  actions: Array<{ title: string; detail: string }>;
  dapilName: string;
}): Promise<"whatsapp" | "email" | ""> {
  const text = formatBriefingText(opts.summary, opts.actions, opts.dapilName);
  const phone = (opts.phone || "").replace(/[^0-9]/g, "");
  if (phone && (await sendWhatsApp(phone, text))) return "whatsapp";
  if (opts.email && (await sendEmail(opts.email, `Briefing Pagi Adapil.ai — ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`, text))) return "email";
  return "";
}
