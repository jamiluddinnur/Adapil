import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { answerConsultantRule, openaiChat, type ConsultantEvidence } from "@/lib/ai";

/**
 * Konsultan AI — tanya-jawab berbasis bukti dapil akun ini.
 * Jawaban TIDAK pernah mengarang angka: semua angka berasal dari
 * aspirasi / isu / dokumen yang tercatat di database akun ini.
 * Tanpa OPENAI_API_KEY, mesin rule-based di src/lib/ai.ts yang menjawab.
 * Dengan kunci, OpenAI hanya merapikan bahasa dari bukti yang sama.
 */
export async function GET() {
  try {
    const user = await requireUser();
    const messages = await prisma.consultantMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    return NextResponse.json({ messages });
  } catch { return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }); }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const b = await req.json().catch(() => ({}));
    const question = String(b.question || "").trim();
    if (!question) return NextResponse.json({ error: "Tulis dulu pertanyaan Anda." }, { status: 400 });
    if (question.length > 2000) return NextResponse.json({ error: "Pertanyaan terlalu panjang (maks. 2000 karakter)." }, { status: 400 });

    const [aspirations, profile, issues, docs] = await Promise.all([
      prisma.aspiration.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
      prisma.profile.findUnique({ where: { userId: user.id } }),
      prisma.issue.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
      prisma.legislativeDoc.findMany({ where: { userId: user.id } }),
    ]);
    const regions = (profile?.regions || "").split(",").map((s) => s.trim()).filter(Boolean);
    const covered = new Set(aspirations.map((a) => a.region).filter(Boolean));
    const blindSpots = regions.filter((r) => !covered.has(r));
    const byCategory: Record<string, { total: number; unresolved: number }> = {};
    for (const a of aspirations) {
      byCategory[a.category] = byCategory[a.category] || { total: 0, unresolved: 0 };
      byCategory[a.category].total += 1;
      if (a.status !== "Selesai") byCategory[a.category].unresolved += 1;
    }
    const topCategories = Object.entries(byCategory)
      .map(([category, v]) => ({ category, total: v.total, unresolved: v.unresolved }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);

    const ev: ConsultantEvidence = {
      profileName: profile?.name || "",
      dapilName: profile?.dapilName || "",
      total: aspirations.length,
      resolved: aspirations.filter((a) => a.status === "Selesai").length,
      unresolved: aspirations.filter((a) => a.status !== "Selesai").length,
      coveragePct: regions.length ? Math.round((covered.size / regions.length) * 100) : 0,
      regionsTotal: regions.length,
      regionsCovered: covered.size,
      blindSpots,
      topCategories,
      urgent: aspirations
        .filter((a) => a.priority === "Mendesak" || a.status !== "Selesai")
        .slice(0, 5)
        .map((a) => ({ title: a.title, category: a.category, region: a.region, status: a.status })),
      risingIssues: issues
        .filter((i) => i.trend === "naik")
        .slice(0, 4)
        .map((i) => ({ title: i.title, platform: i.platform, negPct: i.negPct, trend: i.trend, severity: i.severity })),
      hoaxIssues: issues.filter((i) => i.isHoax).map((i) => ({ title: i.title, platform: i.platform })),
      docsCount: docs.length,
    };

    const evidenceText = [
      `Dapil: ${ev.dapilName || "belum diatur"}. Politisi: ${ev.profileName || "-"}.`,
      `Total aspirasi: ${ev.total} (selesai ${ev.resolved}, belum selesai ${ev.unresolved}).`,
      `Cakupan wilayah: ${ev.regionsCovered} dari ${ev.regionsTotal} wilayah (${ev.coveragePct}%). Titik buta: ${ev.blindSpots.join(", ") || "tidak ada"}.`,
      `Kategori teratas: ${ev.topCategories.map((c) => `${c.category} ${c.total} aspirasi, ${c.unresolved} belum selesai`).join("; ") || "belum ada"}.`,
      `Isu naik: ${ev.risingIssues.map((i) => `${i.title} (${i.platform}, negatif ${i.negPct}%)`).join("; ") || "tidak ada"}.`,
      `Dokumen legislasi tersimpan: ${ev.docsCount}.`,
    ].join(" ");

    let answer = answerConsultantRule(question, ev);
    let engine = "rule-based + bukti dapil (tanpa kunci OpenAI)";
    const polished = await openaiChat(
      `Kamu Konsultan AI untuk anggota dewan di Indonesia. Jawab pertanyaan politisi HANYA berdasarkan bukti dapil berikut — JANGAN mengarang angka, nama wilayah, atau fakta baru, dan akui dengan jujur bila datanya tidak ada. Jawab dalam Bahasa Indonesia, ringkas, dengan saran langkah konkret. Bila bukti tipis, katakan itu di awal.\n\nBUKTI DAPIL: ${evidenceText}`,
      question,
    );
    if (polished) { answer = polished; engine = "openai + bukti dapil"; }

    await prisma.consultantMessage.createMany({
      data: [
        { userId: user.id, role: "user", content: question },
        { userId: user.id, role: "assistant", content: answer },
      ],
    });
    const messages = await prisma.consultantMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    return NextResponse.json({ ok: true, answer, engine, messages });
  } catch { return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }); }
}

export async function DELETE() {
  try {
    const user = await requireUser();
    await prisma.consultantMessage.deleteMany({ where: { userId: user.id } });
    return NextResponse.json({ ok: true, messages: [] });
  } catch { return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }); }
}
