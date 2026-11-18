import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

// Jejak tindak lanjut aspirasi ke dinas/instansi — bukti kerja.
// Satu aspirasi bisa punya beberapa tindak lanjut (Diajukan → Diproses → Selesai).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const items = await prisma.followUp.findMany({ where: { aspirationId: params.id, userId: user.id }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const asp = await prisma.aspiration.findFirst({ where: { id: params.id, userId: user.id } });
    if (!asp) return NextResponse.json({ error: "Aspirasi tidak ditemukan." }, { status: 404 });
    const b = await req.json().catch(() => ({}));
    const agency = String(b.agency || "").trim();
    if (!agency) return NextResponse.json({ error: "Nama dinas / instansi wajib diisi." }, { status: 400 });
    const status = ["Diajukan", "Diproses", "Selesai", "Ditolak"].includes(String(b.status)) ? String(b.status) : "Diajukan";
    const item = await prisma.followUp.create({
      data: {
        aspirationId: params.id,
        userId: user.id,
        agency,
        note: String(b.note || ""),
        ref: String(b.ref || ""),
        status,
        date: b.date ? new Date(String(b.date)) : new Date(),
      },
    });
    return NextResponse.json({ ok: true, item });
  } catch {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  }
}
