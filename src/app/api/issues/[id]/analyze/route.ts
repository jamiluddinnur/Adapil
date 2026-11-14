import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { analyzeSentimentRule, recommendMessagesRule, clarificationDraftRule, openaiChat } from "@/lib/ai";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const item = await prisma.issue.findFirst({ where: { id: params.id, userId: user.id } });
    if (!item) return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });
    if (!item.samplePosts.trim()) {
      return NextResponse.json({ error: "Tempel dulu contoh unggahan/komentar warga pada isu ini, baru analisis bisa dijalankan." }, { status: 400 });
    }
    const rule = analyzeSentimentRule(item.samplePosts, item.mentions);
    // Optional LLM polish for themes/recommendations — numbers always come from the rule engine.
    const llm = await openaiChat(
      "Kamu analis sentimen media sosial Indonesia. Dari contoh unggahan berikut, sebutkan 3 tema utama saja, dipisah koma. Jawab HANYA daftar tema.",
      item.samplePosts.slice(0, 3000),
    );
    const themes = llm ? llm.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4) : rule.themes;
    const recommendation = recommendMessagesRule(item.title, rule.neg, themes);
    const clarification = item.isHoax ? clarificationDraftRule(item.title) : item.clarification;
    const updated = await prisma.issue.update({
      where: { id: item.id },
      data: { posPct: rule.pos, neuPct: rule.neu, negPct: rule.neg, trend: rule.trend, severity: rule.severity, themes: themes.join(", "), recommendation, clarification, analysisNote: rule.note },
    });
    return NextResponse.json({ ok: true, engine: llm ? "openai + rule-based" : "rule-based (tanpa kunci OpenAI — estimasi dari contoh)", item: updated });
  } catch { return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }); }
}
