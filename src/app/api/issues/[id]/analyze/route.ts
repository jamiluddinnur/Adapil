import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { analyzeSentimentRule, recommendMessagesRule, clarificationDraftRule } from "@/lib/ai";
import { llmChat } from "@/lib/llm";

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
    const llm = await llmChat(
      "Kamu analis sentimen media sosial Indonesia. Dari contoh unggahan berikut, sebutkan 3 tema utama saja, dipisah koma. Jawab HANYA daftar tema.",
      item.samplePosts.slice(0, 3000),
    );
    const themes = llm ? llm.text.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4) : rule.themes;
    const recommendation = recommendMessagesRule(item.title, rule.neg, themes);
    // Guardrail hoaks: draf klarifikasi TIDAK boleh terbit tanpa sumber resmi.
    // Bila isu berlabel hoaks tapi belum ada tautan sumber, klarifikasi diganti
    // peringatan — tim harus menempel sumber dulu sebelum draf dibuat.
    const clarification = item.isHoax
      ? (item.sourceUrl ? clarificationDraftRule(item.title) : "⛔ JANGAN TERBITKAN KLARIFIKASI DULU — isu ini berlabel hoaks tapi belum ada tautan sumber resmi. Tempel tautan sumber (berita / unggahan asli / pernyataan resmi) pada isu ini, lalu jalankan Analisis AI lagi. Klarifikasi tanpa sumber bisa menjadi fitnah.")
      : item.clarification;
    const updated = await prisma.issue.update({
      where: { id: item.id },
      data: { posPct: rule.pos, neuPct: rule.neu, negPct: rule.neg, trend: rule.trend, severity: rule.severity, themes: themes.join(", "), recommendation, clarification, analysisNote: rule.note },
    });
    return NextResponse.json({ ok: true, engine: llm ? `${llm.provider} + rule-based` : "rule-based (tanpa kunci LLM — estimasi dari contoh)", item: updated });
  } catch { return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }); }
}
