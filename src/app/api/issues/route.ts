import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();
    const items = await prisma.issue.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ items });
  } catch { return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }); }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const b = await req.json().catch(() => ({}));
    if (!b.title) return NextResponse.json({ error: "Judul isu wajib diisi." }, { status: 400 });
    const item = await prisma.issue.create({
      data: {
        userId: user.id,
        title: String(b.title),
        platform: String(b.platform || "TikTok"),
        mentions: Number(b.mentions || 0),
        trend: String(b.trend || "stabil"),
        posPct: Number(b.posPct || 0),
        neuPct: Number(b.neuPct || 0),
        negPct: Number(b.negPct || 0),
        severity: String(b.severity || "sedang"),
        themes: String(b.themes || ""),
        samplePosts: String(b.samplePosts || ""),
        recommendation: String(b.recommendation || ""),
        clarification: String(b.clarification || ""),
        isHoax: Boolean(b.isHoax || false),
        status: String(b.status || "Dipantau"),
        analysisNote: String(b.analysisNote || ""),
      },
    });
    return NextResponse.json({ ok: true, item });
  } catch { return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }); }
}
