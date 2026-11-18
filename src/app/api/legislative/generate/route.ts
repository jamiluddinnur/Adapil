import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { generateLegislativeDoc } from "@/lib/legislative";

/**
 * Generator dokumen legislasi (thin wrapper — logika di src/lib/legislative.ts,
 * dipakai juga oleh tool `buat_dokumen` milik Agen Konsultan).
 * SEMUA angka berasal dari bukti server (aspirasi & profil akun ini).
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const b = await req.json().catch(() => ({}));
    const type = String(b.type || "briefing");
    const { doc, engine } = await generateLegislativeDoc(user.id, type);
    return NextResponse.json({ ok: true, engine, doc });
  } catch { return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }); }
}
