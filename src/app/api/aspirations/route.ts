import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();
    const items = await prisma.aspiration.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ items });
  } catch { return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }); }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const b = await req.json().catch(() => ({}));
    if (!b.text && !b.title) return NextResponse.json({ error: "Isi aspirasi wajib diisi." }, { status: 400 });
    const item = await prisma.aspiration.create({
      data: {
        userId: user.id,
        title: String(b.title || String(b.text || "").slice(0, 80)),
        text: String(b.text || ""),
        source: String(b.source || "WhatsApp"),
        category: String(b.category || "Lainnya"),
        region: String(b.region || ""),
        status: String(b.status || "Baru"),
        priority: String(b.priority || "Sedang"),
        followUp: String(b.followUp || ""),
        draftReply: String(b.draftReply || ""),
      },
    });
    return NextResponse.json({ ok: true, item });
  } catch { return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }); }
}
