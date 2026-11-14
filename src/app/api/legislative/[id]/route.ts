import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const FIELDS = ["type", "title", "summary", "findings", "talkingPoints", "questions", "actions", "content", "dataGaps"] as const;

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const b = await req.json().catch(() => ({}));
    const existing = await prisma.legislativeDoc.findFirst({ where: { id: params.id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });
    const data: Record<string, unknown> = {};
    for (const f of FIELDS) if (b[f] !== undefined) data[f] = String(b[f]);
    const doc = await prisma.legislativeDoc.update({ where: { id: params.id }, data: data as never });
    return NextResponse.json({ ok: true, doc });
  } catch { return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }); }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const existing = await prisma.legislativeDoc.findFirst({ where: { id: params.id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });
    await prisma.legislativeDoc.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }); }
}
