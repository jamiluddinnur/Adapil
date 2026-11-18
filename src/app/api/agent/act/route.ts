import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { runAgentTool, logToolCall, AGENT_TOOL_DEFS } from "@/lib/agent";

// Eksekusi satu tool agen secara eksplisit — dipakai tombol "Lakukan" pada
// rencana Agen Pagi dan (di masa depan) UI lain yang memicu tindakan agen.
// Tool yang mengubah data (buat_draf_balasan, buat_dokumen,
// ubah_status_aspirasi) hanya jalan karena pengguna menekan tombolnya.
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const b = await req.json().catch(() => ({}));
    const name = String(b.tool || "");
    const args = (b.args && typeof b.args === "object" ? b.args : {}) as Record<string, any>;
    if (!AGENT_TOOL_DEFS.some((d) => d.name === name)) {
      return NextResponse.json({ error: `Tool "${name}" tidak dikenal.` }, { status: 400 });
    }
    const r = await runAgentTool(user.id, name, args);
    // Tombol "Lakukan" = pengguna menyetujui tindakan agen → dicatat sebagai
    // accepted, supaya angka evaluasi (tingkat persetujuan) punya dasar.
    void logToolCall(user.id, name, args, r.summary, "aksi", true);
    return NextResponse.json({ ok: true, tool: name, summary: r.summary, data: r.data ?? null });
  } catch {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  }
}
