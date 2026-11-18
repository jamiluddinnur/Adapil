import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const existing = await prisma.teamMember.findFirst({ where: { id: params.id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });
    await prisma.teamMember.delete({ where: { id: params.id } });
    // Aspirasi yang ditugaskan ke anggota ini kembali tanpa penanggung jawab.
    await prisma.aspiration.updateMany({ where: { userId: user.id, assignedTo: params.id }, data: { assignedTo: "" } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  }
}
