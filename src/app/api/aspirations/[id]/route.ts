import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const b = await req.json().catch(() => ({}));
    const existing = await prisma.aspiration.findFirst({ where: { id: params.id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });
    const item = await prisma.aspiration.update({
      where: { id: params.id },
      data: {
        title: b.title !== undefined ? String(b.title) : undefined,
        text: b.text !== undefined ? String(b.text) : undefined,
        source: b.source !== undefined ? String(b.source) : undefined,
        category: b.category !== undefined ? String(b.category) : undefined,
        region: b.region !== undefined ? String(b.region) : undefined,
        status: b.status !== undefined ? String(b.status) : undefined,
        priority: b.priority !== undefined ? String(b.priority) : undefined,
        followUp: b.followUp !== undefined ? String(b.followUp) : undefined,
        draftReply: b.draftReply !== undefined ? String(b.draftReply) : undefined,
      },
    });
    return NextResponse.json({ ok: true, item });
  } catch { return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }); }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const existing = await prisma.aspiration.findFirst({ where: { id: params.id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });
    await prisma.aspiration.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }); }
}
