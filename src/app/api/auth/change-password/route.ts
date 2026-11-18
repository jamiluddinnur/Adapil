import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, verifyPassword, hashPassword } from "@/lib/auth";

// Ganti kata sandi untuk pengguna yang sedang masuk.
// Ini bukan reset lewat email — kalau pengguna lupa kata sandi lama, ia tetap
// tidak bisa masuk sendiri (belum ada layanan email). Itu ditulis jujur di UI.
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const b = await req.json().catch(() => ({}));
    const current = String(b.currentPassword || "");
    const next = String(b.newPassword || "");
    if (!current || !next) return NextResponse.json({ error: "Kata sandi lama dan baru wajib diisi." }, { status: 400 });
    if (next.length < 6) return NextResponse.json({ error: "Kata sandi baru minimal 6 karakter." }, { status: 400 });
    if (!verifyPassword(current, user.passwordHash)) return NextResponse.json({ error: "Kata sandi lama salah." }, { status: 401 });
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(next) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  }
}
