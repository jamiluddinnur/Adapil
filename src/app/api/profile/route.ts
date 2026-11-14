import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { findDapil } from "@/lib/dapil";

export async function GET() {
  try {
    const user = await requireUser();
    const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
    return NextResponse.json({ profile });
  } catch { return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }); }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const dapil = findDapil(String(body.dapilId || ""));
    const data = {
      name: String(body.name || ""),
      role: String(body.role || "Anggota DPRD"),
      party: String(body.party || ""),
      level: String(body.level || "DPRD Kabupaten-Kota"),
      dapilId: String(body.dapilId || ""),
      dapilName: dapil ? `${dapil.name} — ${dapil.level} (${dapil.seats} kursi)` : String(body.dapilName || ""),
      regions: dapil ? dapil.regions.join(", ") : String(body.regions || ""),
    };
    const profile = await prisma.profile.upsert({
      where: { userId: user.id },
      update: data,
      create: { ...data, userId: user.id },
    });
    return NextResponse.json({ ok: true, profile });
  } catch { return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }); }
}
