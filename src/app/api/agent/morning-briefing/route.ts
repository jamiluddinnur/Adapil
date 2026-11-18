import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ensureDailyBriefing } from "@/lib/agent";

// Agen Pagi — loop otonom harian (sekali sehari, hasilnya disimpan).
// GET: pemeriksaan terakhir. POST: jalankan pemeriksaan (bila hari ini belum
// ada, hitung yang baru; bila sudah ada, kembalikan yang tersimpan).
// Pengiriman briefing (WA/email) dilakukan cron /api/cron/morning-briefing
// — rute ini hanya menghitung dan menampilkan.
function present(run: { id: string; summary: string; actions: string; deliveredVia: string; createdAt: Date }) {
  return { id: run.id, summary: run.summary, actions: JSON.parse(run.actions || "[]"), deliveredVia: run.deliveredVia || "", createdAt: run.createdAt };
}

export async function GET() {
  try {
    const user = await requireUser();
    const run = await prisma.agentRun.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    if (!run) return NextResponse.json({ run: null });
    return NextResponse.json({ run: present(run) });
  } catch {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  }
}

export async function POST() {
  try {
    const user = await requireUser();
    const { run, isNew } = await ensureDailyBriefing(user.id);
    return NextResponse.json({ ok: true, isNew, run: present(run) });
  } catch {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  }
}
