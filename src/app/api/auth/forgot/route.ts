import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail, emailConfigured } from "@/lib/notify";

// Lupa kata sandi — kirim tautan reset lewat email (Resend).
// Respons SELALU { ok: true } supaya tidak ketahuan email mana yang terdaftar.
// Bila layanan email belum terpasang (tanpa RESEND_API_KEY), tautan tidak
// bisa dikirim — pengguna diberitahu jujur lewat flag emailSent:false.
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}));
    const email = String(b.email || "").trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "Isi dulu alamat email akun Anda." }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && emailConfigured()) {
      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
      });
      const base = (process.env.NEXT_PUBLIC_APP_URL || "https://adapil.vercel.app").replace(/\/$/, "");
      await sendEmail(
        user.email,
        "Reset kata sandi Adapil.ai",
        `Anda meminta reset kata sandi Adapil.ai.\n\nBuka tautan ini dalam 1 jam untuk membuat kata sandi baru:\n${base}/?reset=${token}\n\nBila Anda tidak meminta reset ini, abaikan email ini — kata sandi Anda tidak berubah.`,
      );
      return NextResponse.json({ ok: true, emailSent: true });
    }
    return NextResponse.json({ ok: true, emailSent: false });
  } catch {
    return NextResponse.json({ error: "Gagal memproses permintaan." }, { status: 500 });
  }
}
