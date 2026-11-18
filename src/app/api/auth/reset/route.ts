import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

// Reset kata sandi dengan token dari email. Token: hash SHA-256, kedaluwarsa
// 1 jam, sekali pakai. Berhasil → kata sandi baru + SEMUA sesi lama dibatalkan
// (pengguna harus masuk lagi di semua perangkat).
export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}));
    const token = String(b.token || "");
    const newPassword = String(b.newPassword || "");
    if (!token || newPassword.length < 6) {
      return NextResponse.json({ error: "Tautan tidak valid atau kata sandi baru terlalu pendek (min. 6 karakter)." }, { status: 400 });
    }
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const rec = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!rec || rec.usedAt || rec.expiresAt < new Date()) {
      return NextResponse.json({ error: "Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru lewat 'Lupa kata sandi'." }, { status: 400 });
    }
    await prisma.$transaction([
      prisma.user.update({ where: { id: rec.userId }, data: { passwordHash: hashPassword(newPassword) } }),
      prisma.session.deleteMany({ where: { userId: rec.userId } }),
      prisma.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal mereset kata sandi." }, { status: 500 });
  }
}
