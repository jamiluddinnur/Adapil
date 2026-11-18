import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { runAgent } from "@/lib/agent";

/**
 * Agen Konsultan — BUKAN lagi chatbot template.
 * Setiap pertanyaan dijawab lewat runAgent (src/lib/agent.ts): agen menyusun
 * rencana tool, memanggil tool sungguhan atas data dapil akun ini (baca
 * aspirasi/isu, buat draf, buat dokumen, ubah status), lalu menjawab dari
 * hasil tool itu. Jejak tool dikembalikan sebagai `tools` supaya pengguna
 * bisa memeriksa apa yang agen lakukan — itulah syarat tool use sebuah agent.
 * Tanpa OPENAI_API_KEY, perencana rule-based yang memutuskan tool apa yang
 * dipakai; dengan kunci, model yang memutuskan lewat function calling.
 * Tindakan yang mengubah data hanya jalan bila pengguna memintanya eksplisit.
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

    const { answer, engine, tools } = await runAgent(user.id, question);

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
    return NextResponse.json({ ok: true, answer, engine, tools, messages });
  } catch { return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }); }
}

export async function DELETE() {
  try {
    const user = await requireUser();
    await prisma.consultantMessage.deleteMany({ where: { userId: user.id } });
    return NextResponse.json({ ok: true, messages: [] });
  } catch { return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }); }
}
