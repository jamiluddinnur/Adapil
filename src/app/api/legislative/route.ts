import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();
    const [docs, aspirations, profile] = await Promise.all([
      prisma.legislativeDoc.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
      prisma.aspiration.findMany({ where: { userId: user.id } }),
      prisma.profile.findUnique({ where: { userId: user.id } }),
    ]);
    const regions = (profile?.regions || "").split(",").map((s) => s.trim()).filter(Boolean);
    const covered = new Set(aspirations.map((a) => a.region).filter(Boolean));
    const blindSpots = regions.filter((r) => !covered.has(r));
    const byCategory: Record<string, number> = {};
    const unresolvedByCategory: Record<string, number> = {};
    for (const a of aspirations) {
      byCategory[a.category] = (byCategory[a.category] || 0) + 1;
      if (a.status !== "Selesai") unresolvedByCategory[a.category] = (unresolvedByCategory[a.category] || 0) + 1;
    }
    const matrix = Object.entries(byCategory)
      .map(([category, total]) => ({
        category, total,
        unresolved: unresolvedByCategory[category] || 0,
        lever: total >= 5 ? "anggaran" : total >= 3 ? "legislasi" : "pengawasan",
      }))
      .sort((a, b) => b.total - a.total);
    return NextResponse.json({
      docs,
      evidence: {
        totalAspirations: aspirations.length,
        resolved: aspirations.filter((a) => a.status === "Selesai").length,
        unresolved: aspirations.filter((a) => a.status !== "Selesai").length,
        regionsTotal: regions.length,
        regionsCovered: covered.size,
        coveragePct: regions.length ? Math.round((covered.size / regions.length) * 100) : 0,
        blindSpots,
        matrix,
        dapilName: profile?.dapilName || "",
        profileName: profile?.name || "",
      },
    });
  } catch { return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }); }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const b = await req.json().catch(() => ({}));
    if (!b.title) return NextResponse.json({ error: "Judul dokumen wajib diisi." }, { status: 400 });
    const doc = await prisma.legislativeDoc.create({
      data: {
        userId: user.id, type: String(b.type || "briefing"), title: String(b.title),
        summary: String(b.summary || ""), findings: String(b.findings || ""),
        talkingPoints: String(b.talkingPoints || ""), questions: String(b.questions || ""),
        actions: String(b.actions || ""), content: String(b.content || ""),
        dataGaps: String(b.dataGaps || ""),
      },
    });
    return NextResponse.json({ ok: true, doc });
  } catch { return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }); }
}
