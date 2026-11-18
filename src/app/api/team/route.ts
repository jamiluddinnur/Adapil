import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

// Tim kerja akun ini: politisi (pemilik akun) + staf. Staf ditugaskan ke
// aspirasi dengan tenggat — politisi membaca & menyetujui, staf menindaklanjuti.
export async function GET() {
  try {
    const user = await requireUser();
    const items = await prisma.teamMember.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const b = await req.json().catch(() => ({}));
    const name = String(b.name || "").trim();
    if (!name) return NextResponse.json({ error: "Nama anggota tim wajib diisi." }, { status: 400 });
    const item = await prisma.teamMember.create({
      data: { userId: user.id, name, role: b.role === "Politisi" ? "Politisi" : "Staf", phone: String(b.phone || "") },
    });
    return NextResponse.json({ ok: true, item });
  } catch {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  }
}
