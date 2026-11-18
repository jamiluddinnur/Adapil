"use client";
import { useEffect, useRef, useState } from "react";

type User = { id: string; name: string; email: string };
type Profile = { name: string; role: string; party: string; level: string; dapilId: string; dapilName: string; regions: string; phone: string };
type Aspiration = { id: string; title: string; text: string; source: string; category: string; region: string; status: string; priority: string; followUp: string; draftReply: string; assignedTo: string; dueDate: string | null; draftStatus: string; createdAt: string };
type TeamMember = { id: string; name: string; role: string; phone: string };
type FollowUp = { id: string; aspirationId: string; agency: string; note: string; ref: string; status: string; date: string; createdAt: string };
type DocEvidence = { id: string; title: string; kind: string; createdAt: string };
type Evaluation = { totalToolCalls: number; byTool: Record<string, number>; actions: number; acceptedActions: number; acceptanceRate: number | null; approvedDrafts: number; docsCreated: number; correctionsLearned: number };
type Issue = { id: string; title: string; platform: string; mentions: number; trend: string; posPct: number; neuPct: number; negPct: number; severity: string; themes: string; samplePosts: string; recommendation: string; clarification: string; isHoax: boolean; sourceUrl: string; status: string; analysisNote: string; createdAt: string };
type LegDoc = { id: string; type: string; title: string; summary: string; findings: string; talkingPoints: string; questions: string; actions: string; content: string; dataGaps: string };
type ChatMsg = { id: string; role: string; content: string; createdAt: string };
type Evidence = { totalAspirations: number; resolved: number; unresolved: number; regionsTotal: number; regionsCovered: number; coveragePct: number; blindSpots: string[]; matrix: Array<{ category: string; total: number; unresolved: number; lever: string }>; dapilName: string; profileName: string };

const CATEGORIES = ["Infrastruktur", "Air Bersih", "Pendidikan", "Kesehatan/BPJS", "Bantuan Sosial", "Ekonomi", "Pertanian", "Lingkungan", "Lainnya"];
const SOURCES = ["WhatsApp", "Reses", "DM", "Telepon", "Surat", "Tatap muka"];
const PLATFORMS = ["TikTok", "Instagram", "X", "Facebook", "YouTube", "WhatsApp", "Media Online"];
const DOC_TYPES = [["briefing", "Briefing Rapat Kerja"], ["pokir", "Pokok Pikiran (Pokir)"], ["reses", "Bahan Reses"], ["pendapat", "Naskah Pendapat"], ["raperda", "Usulan Raperda"], ["pengawasan", "Bahan Pengawasan"]] as const;

async function api(path: string, method = "GET", body?: unknown) {
  const res = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Gagal (${res.status})`);
  return data;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [plan, setPlan] = useState("starter");
  const [tab, setTab] = useState("beranda");
  const [msg, setMsg] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [aspirations, setAspirations] = useState<Aspiration[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [docs, setDocs] = useState<LegDoc[]>([]);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [payments, setPayments] = useState<any[]>([]);

  // auth form
  const [mode, setMode] = useState<"login" | "register">("login");
  const [auth, setAuth] = useState({ name: "", email: "", password: "" });
  // profile form
  const [pf, setPf] = useState<Profile>({ name: "", role: "Anggota DPRD", party: "", level: "DPRD Provinsi", dapilId: "", dapilName: "", regions: "", phone: "" });
  // tim kerja
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [memberForm, setMemberForm] = useState({ name: "", role: "Staf", phone: "" });
  // tindak lanjut ke dinas (per aspirasi yang dibuka)
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [allFollowUps, setAllFollowUps] = useState<FollowUp[]>([]);
  const [fuForm, setFuForm] = useState({ agency: "", note: "", ref: "", status: "Diajukan" });
  // dokumen pendukung legislasi (PDF)
  const [docEvidence, setDocEvidence] = useState<DocEvidence[]>([]);
  const [pdfBusy, setPdfBusy] = useState(false);
  // evaluasi agen
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  // ekstraksi aspirasi dari pesan WhatsApp yang di-forward
  const [waText, setWaText] = useState("");
  const [waExtract, setWaExtract] = useState<{ title: string; text: string; category: string; priority: string; region: string; senderName: string; engine: string } | null>(null);
  const [waBusy, setWaBusy] = useState(false);
  // lupa / reset kata sandi
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetPw, setResetPw] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  // aspiration form
  const [af, setAf] = useState({ title: "", text: "", source: "WhatsApp", category: "Lainnya", region: "", priority: "Sedang" });
  // issue form
  const [iff, setIff] = useState({ title: "", platform: "TikTok", mentions: 0, samplePosts: "", isHoax: false, sourceUrl: "" });
  // impor massal aspirasi (CSV)
  const [bulkText, setBulkText] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  // legislative
  const [docType, setDocType] = useState("briefing");
  // konsultan AI
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatQ, setChatQ] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatEngine, setChatEngine] = useState("");
  const [agentTools, setAgentTools] = useState<Array<{ name: string; args: Record<string, unknown>; result: string }>>([]);
  // Saran AI terakhir per aspirasi — dipakai untuk merekam koreksi pengguna.
  const [aiSug, setAiSug] = useState<{ id: string; category: string; priority: string } | null>(null);
  // Agen Pagi — pemeriksaan otomatis sekali sehari.
  const [briefing, setBriefing] = useState<{ summary: string; actions: Array<{ id: string; kind: string; title: string; detail: string; aspirationId?: string; docType?: string }>; deliveredVia: string; createdAt: string } | null>(null);
  const [briefingBusy, setBriefingBusy] = useState(false);
  const briefingChecked = useRef(false);
  const SUGGESTED_Q = [
    "Apa yang paling mendesak minggu ini?",
    "Isu apa yang sedang naik di dapil saya?",
    "Apa yang harus saya siapkan untuk reses?",
    "Wilayah mana yang belum terdata?",
    "Buatkan ringkasan minggu ini",
    "Buatkan draf balasan untuk aspirasi yang paling mendesak",
    "Buatkan Pokir dari data dapil saya",
  ];
  async function askConsultant(q: string) {
    const question = q.trim();
    if (!question || chatBusy) return;
    setChatBusy(true); setMsg("");
    try {
      const r = await api("/api/consultant/chat", "POST", { question });
      setChatMsgs(r.messages || []); setChatEngine(r.engine || ""); setAgentTools(r.tools || []); setChatQ("");
    } catch (err: any) { setMsg(err.message); }
    setChatBusy(false);
  }
  async function runBriefing() {
    setBriefingBusy(true);
    try { const r = await api("/api/agent/morning-briefing", "POST"); setBriefing(r.run); } catch (err: any) { setMsg(err.message); }
    setBriefingBusy(false);
  }
  const memberName = (id: string) => team.find((m) => m.id === id)?.name || "";
  const isOverdue = (a: Aspiration) => a.status !== "Selesai" && a.dueDate ? new Date(a.dueDate).getTime() < Date.now() : false;
  async function loadFollowUps(aspId: string) {
    try { const r = await api(`/api/aspirations/${aspId}/followups`); setFollowUps(r.items || []); } catch { setFollowUps([]); }
  }
  // Ekstrak teks dari PDF di browser (pdfjs-dist) — berkas tidak diunggah ke server.
  async function extractPdfText(file: File): Promise<string> {
    const pdfjs: any = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
    const buf = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    let out = "";
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      out += tc.items.map((it: any) => it.str || "").join(" ") + "\n";
      if (out.length > 150000) break;
    }
    return out.trim();
  }
  async function doBriefingAction(a: { kind: string; title: string; aspirationId?: string; docType?: string }) {
    try {
      if (a.kind === "buka_aspirasi") {
        const target = aspirations.find((x) => x.id === a.aspirationId);
        if (target) { setOpenAsp(target); setTab("aspirasi"); }
        return;
      }
      const tool = a.kind === "buat_draf" ? "buat_draf_balasan" : "buat_dokumen";
      const args = a.kind === "buat_draf" ? { aspirationId: a.aspirationId } : { type: a.docType || "pokir" };
      const r = await api("/api/agent/act", "POST", { tool, args });
      setMsg(r.summary || "Tindakan agen selesai."); loadAll();
    } catch (err: any) { setMsg(err.message); }
  }
  const [openDoc, setOpenDoc] = useState<LegDoc | null>(null);
  const [openAsp, setOpenAsp] = useState<Aspiration | null>(null);
  const [openIssue, setOpenIssue] = useState<Issue | null>(null);

  async function loadAll() {
    try {
      const me = await api("/api/auth/me");
      if (!me.user) { setUser(null); return; }
      setUser(me.user); setPlan(me.plan || "starter");
      setProfile(me.profile || null);
      if (me.profile) setPf(me.profile);
      const [a, i, l, p, c] = await Promise.all([api("/api/aspirations"), api("/api/issues"), api("/api/legislative"), api("/api/payments"), api("/api/consultant/chat")]);
      setAspirations(a.items || []); setIssues(i.items || []);
      setDocs(l.docs || []); setEvidence(l.evidence || null); setPayments(p.items || []); setChatMsgs(c.messages || []);
      // Data sekunder: gagal satu tidak boleh menjatuhkan seluruh Beranda
      // (mis. tabel baru belum ada sebelum redeploy dengan db push).
      const [t, f, ev, evl] = await Promise.all([
        api("/api/team").catch(() => ({ items: [] })),
        api("/api/followups").catch(() => ({ items: [] })),
        api("/api/legislative/evidence").catch(() => ({ items: [] })),
        api("/api/agent/evaluation").catch(() => ({ ok: false })),
      ]);
      setTeam(t.items || []); setAllFollowUps(f.items || []); setDocEvidence(ev.items || []); setEvaluation(evl.ok ? evl : null);
      // Agen Pagi: sekali per kunjungan, ambil pemeriksaan hari ini; bila belum
      // ada, agen memeriksanya sendiri (tanpa menunggu perintah).
      if (!briefingChecked.current) {
        briefingChecked.current = true;
        try {
          const b = await api("/api/agent/morning-briefing");
          if (b.run) setBriefing(b.run);
          else { const r = await api("/api/agent/morning-briefing", "POST"); setBriefing(r.run); }
        } catch { /* Agen Pagi gagal — Beranda tetap jalan tanpa pemeriksaan. */ }
      }
    } catch { setUser(null); }
  }
  useEffect(() => { loadAll(); }, []);
  // Tautan reset kata sandi dari email: ?reset=<token>
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const t = q.get("reset");
    if (t) { setResetToken(t); setMode("login"); }
  }, []);

  async function doAuth(e: React.FormEvent) {
    e.preventDefault(); setMsg("");
    try {
      const d = await api(mode === "login" ? "/api/auth/login" : "/api/auth/register", "POST", auth);
      setUser(d.user); setMsg("Berhasil masuk."); loadAll();
    } catch (err: any) { setMsg(err.message); }
  }
  async function logout() { await api("/api/auth/logout", "POST"); setUser(null); setTab("beranda"); }

  const regionsList = (profile?.regions || "").split(",").map((s) => s.trim()).filter(Boolean);
  const unresolved = aspirations.filter((a) => a.status !== "Selesai");
  // Antrean kerja hari ini: belum selesai, diurutkan Mendesak dulu lalu yang paling lama.
  const PRIORITY_RANK: Record<string, number> = { Mendesak: 0, Tinggi: 1, Sedang: 2, Rendah: 3 };
  const workQueue = [...unresolved].sort((a, b) => (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2) || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const daysOld = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
  function parseBulkCsv(text: string) {
    return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
      .filter((l) => !/^judul\s*;/i.test(l))
      .map((line) => {
        const c = line.split(";").map((s) => s.trim());
        if (c.length === 1) return { title: "", text: c[0], source: "WhatsApp", category: "Lainnya", region: "", priority: "Sedang" };
        return { title: c[0] || "", text: c[1] || c[0] || "", source: c[2] || "WhatsApp", category: c[3] || "Lainnya", region: c[4] || "", priority: c[5] || "Sedang" };
      });
  }
  const rising = issues.filter((i) => i.trend === "naik");
  const byCat: Record<string, number> = {};
  aspirations.forEach((a) => { byCat[a.category] = (byCat[a.category] || 0) + 1; });
  const maxCat = Math.max(1, ...Object.values(byCat));

  if (!user) {
    return (
      <div>
        <header className="top">
          <img src="/adapil-logo.webp" alt="Logo Adapil.ai" width={48} height={48} style={{ borderRadius: 12 }} />
          <div><div className="brand">Adapil.ai</div><div className="tagline">Setiap Aspirasi Warga Terjawab.</div></div>
        </header>
        <div className="wrap">
          <div className="grid g2" style={{ marginTop: 16 }}>
            <div className="card">
              <h1 style={{ marginTop: 0 }}>Dashboard Intelijen Konstituen untuk Politisi Indonesia</h1>
              <p>Inbox aspirasi warga, Isu &amp; Sentimen media sosial dapil, dan Asisten Legislasi anti-buta-data — semua dari data dapil Anda sendiri.</p>
              <ul>
                <li><b>Inbox Aspirasi:</b> WhatsApp, reses, DM — tercatat dan berstatus Baru–Diproses–Selesai.</li>
                <li><b>Isu &amp; Sentimen:</b> analisis sentimen dari contoh unggahan tim + 3 rekomendasi pesan.</li>
                <li><b>Legislasi:</b> Pusat Bukti Dapil, Matriks Prioritas, dan 6 jenis dokumen kerja.</li>
                <li><b>Agen Konsultan (AI agent):</b> tanya-jawab soal dapil Anda — ia memanggil tool atas data dapil Anda sendiri (mencari aspirasi, membuat draf &amp; dokumen), memeriksa dapil tiap pagi, dan belajar dari koreksi Anda.</li>
                <li><b>Dapil NTB lengkap:</b> DPR RI, DPRD Provinsi, dan DPRD 10 kabupaten/kota (PKPU 6/2023).</li>
              </ul>
              <p className="small">Akun demo: demo@adapil.ai / demo1234 (data contoh, ditandai sebagai contoh).</p>
            </div>
            <div className="card">
              <div className="tabs" style={{ marginTop: 0 }}>
                <button className={mode === "login" ? "on" : ""} onClick={() => setMode("login")}>Masuk</button>
                <button className={mode === "register" ? "on" : ""} onClick={() => setMode("register")}>Daftar</button>
              </div>
              <form onSubmit={doAuth} className="grid">
                {mode === "register" && <input placeholder="Nama lengkap" value={auth.name} onChange={(e) => setAuth({ ...auth, name: e.target.value })} />}
                <input placeholder="Email" value={auth.email} onChange={(e) => setAuth({ ...auth, email: e.target.value })} />
                <input placeholder="Kata sandi (min. 6 karakter)" type="password" value={auth.password} onChange={(e) => setAuth({ ...auth, password: e.target.value })} />
                <button className="btn-amber" type="submit">{mode === "login" ? "Masuk" : "Daftar akun"}</button>
              </form>
              {msg && <p className="small">{msg}</p>}
              {resetToken ? (
                <div>
                  <h4>Buat Kata Sandi Baru</h4>
                  <p className="small">Tautan reset dari email Anda (berlaku 1 jam, sekali pakai). Setelah berhasil, Anda harus masuk lagi di semua perangkat.</p>
                  <form className="grid" onSubmit={async (e) => {
                    e.preventDefault(); setResetMsg("");
                    try { await api("/api/auth/reset", "POST", { token: resetToken, newPassword: resetPw }); setResetToken(""); setResetPw(""); setResetMsg("Kata sandi berhasil direset — silakan masuk dengan kata sandi baru."); window.history.replaceState({}, "", "/"); } catch (err: any) { setResetMsg(err.message); }
                  }}>
                    <input placeholder="Kata sandi baru (min. 6 karakter)" type="password" value={resetPw} onChange={(e) => setResetPw(e.target.value)} />
                    <button className="btn-amber" type="submit">Reset kata sandi</button>
                  </form>
                  {resetMsg && <p className="small">{resetMsg}</p>}
                </div>
              ) : mode === "login" && (
                <div>
                  <button className="btn-ghost" style={{ padding: "6px 10px", marginTop: 8 }} onClick={() => setForgotMsg(forgotMsg === "" ? "show" : "")}>Lupa kata sandi?</button>
                  {forgotMsg === "show" && (
                    <form className="grid" style={{ marginTop: 8 }} onSubmit={async (e) => {
                      e.preventDefault();
                      try { const r = await api("/api/auth/forgot", "POST", { email: forgotEmail }); setForgotMsg(r.emailSent ? "Tautan reset sudah dikirim ke email Anda (berlaku 1 jam). Periksa kotak masuk / spam." : "Layanan email belum terpasang di server — tautan reset tidak bisa dikirim. Hubungi pengelola Adapil, atau pakai 'Ganti Kata Sandi' di dalam akun bila masih bisa masuk."); } catch (err: any) { setForgotMsg(err.message); }
                    }}>
                      <input placeholder="Email akun Anda" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
                      <button className="btn" type="submit">Kirim tautan reset</button>
                    </form>
                  )}
                  {forgotMsg && forgotMsg !== "show" && <p className="small">{forgotMsg}</p>}
                </div>
              )}
              <p className="small">Sesi server 30 hari (cookie httpOnly). Data tiap akun terpisah.</p>
            </div>
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Langganan — hanya 2 paket berbayar (draf — belum ada pembayaran aktif)</h3>
            <p className="small">Mulai gratis sebagai Starter: 1 politisi, 1 dapil, inbox aspirasi.</p>
            <div className="grid g2">
              <div><b>Pro</b><div className="stat">Rp499 rb</div><p className="small">/bulan · + Isu & Sentimen, Legislasi, Konsultan AI, laporan otomatis</p></div>
              <div><b>Timses / Partai</b><div className="stat">Rp1 jt</div><p className="small">/bulan · Pro + multi-user, multi-dapil</p></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="top">
        <img src="/adapil-logo.webp" alt="Logo Adapil.ai" width={48} height={48} style={{ borderRadius: 12 }} />
        <div><div className="brand">Adapil.ai</div><div className="tagline">Setiap Aspirasi Warga Terjawab.</div></div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div><b>{profile?.name || user.name}</b> · {profile?.role || ""} {profile?.party ? `· ${profile.party}` : ""}</div>
          <div className="tagline">{profile?.dapilName || "Profil dapil belum diatur"} · Paket {plan}</div>
          <button className="btn-ghost" style={{ marginTop: 6, padding: "6px 12px" }} onClick={logout}>Keluar</button>
        </div>
      </header>
      <div className="wrap">
        <div className="tabs">
          {[["beranda", "Beranda"], ["profil", "Profil & Dapil"], ["tim", `Tim · ${team.length}`], ["aspirasi", `Aspirasi · ${unresolved.length} belum selesai`], ["isu", "Isu & Sentimen"], ["legislasi", "Legislasi"], ["konsultan", "Agen Konsultan"], ["laporan", "Laporan"], ["paket", "Paket"]].map(([k, label]) => (
            <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>
        {msg && <p className="small">{msg}</p>}
        {tab === "beranda" && (
          <div className="grid">
            <div className="card">
              <h2 style={{ marginTop: 0 }}>Briefing Pagi — {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h2>
              <p>Selamat pagi, <b>{profile?.name || user.name}</b>. {profile?.dapilName ? `Dapil Anda: ${profile.dapilName}.` : "Lengkapi profil & dapil Anda di tab Profil & Dapil."}</p>
              <div className="grid g4">
                <div><div className="stat">{aspirations.length}</div><div className="small">Aspirasi tercatat</div></div>
                <div><div className="stat">{unresolved.length}</div><div className="small">Belum selesai</div></div>
                <div><div className="stat">{rising.length}</div><div className="small">Isu sedang naik</div></div>
                <div><div className="stat">{evidence ? `${evidence.coveragePct}%` : "—"}</div><div className="small">Cakupan wilayah dapil</div></div>
              </div>
              {rising.length > 0 && <p><span className="badge bad">Perlu respons</span> {rising.map((i) => i.title).join("; ")}</p>}
              {evidence && evidence.blindSpots.length > 0 && <p className="small">Titik buta data: {evidence.blindSpots.slice(0, 6).join(", ")}{evidence.blindSpots.length > 6 ? ` (+${evidence.blindSpots.length - 6} lagi)` : ""} — wilayah tanpa aspirasi tercatat.</p>}
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Kerjakan Hari Ini — {workQueue.length} belum selesai</h3>
              <p className="small">Diurutkan: paling mendesak dulu, lalu yang paling lama menunggu. Aspirasi yang sudah ≥7 hari tanpa perubahan ditandai.</p>
              {workQueue.length === 0 && <p className="small">Semua aspirasi sudah selesai. Catat aspirasi baru di tab Aspirasi, atau impor massal dari CSV.</p>}
              {workQueue.slice(0, 5).map((a) => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                  <div><b>{a.title}</b><div className="small">{a.category}{a.region ? ` · ${a.region}` : ""} · prioritas {a.priority} · sudah {daysOld(a.createdAt)} hari{memberName(a.assignedTo) ? ` · penanggung jawab: ${memberName(a.assignedTo)}` : " · belum ditugaskan"}{a.dueDate ? ` · tenggat ${new Date(a.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}` : ""}</div></div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", whiteSpace: "nowrap" }}>
                    {isOverdue(a) && <span className="badge bad">Lewat tenggat</span>}
                    {daysOld(a.createdAt) >= 7 && <span className="badge bad">Tertunda {daysOld(a.createdAt)} hari</span>}
                    <button className="btn-ghost" style={{ padding: "6px 10px" }} onClick={() => { setOpenAsp(a); loadFollowUps(a.id); setTab("aspirasi"); }}>Buka</button>
                  </div>
                </div>
              ))}
              {workQueue.length > 5 && <p className="small">+ {workQueue.length - 5} aspirasi lain di tab Aspirasi.</p>}
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Agen Pagi — pemeriksaan otomatis hari ini</h3>
              <p className="small">Agen memeriksa sendiri tiap pagi jam 07:00 WITA (jadwal cron) dan briefing dikirim ke WhatsApp / email bila sudah dihubungkan — isi nomor WA di tab Profil &amp; Dapil. Tindakan hanya jalan kalau kamu menekan “Lakukan”.</p>
              {briefing ? (
                <div>
                  <p>{briefing.summary}</p>
                  {briefing.actions.map((a) => (
                    <div key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                      <div><b>{a.title}</b><div className="small">{a.detail}</div></div>
                      <button className="btn-amber" style={{ padding: "6px 12px", whiteSpace: "nowrap" }} onClick={() => doBriefingAction(a)}>Lakukan</button>
                    </div>
                  ))}
                  {briefing.actions.length === 0 && <p className="small">Tidak ada tindakan yang diusulkan hari ini.</p>}
                  <p className="small">Diperiksa: {new Date(briefing.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} · Terkirim via: {briefing.deliveredVia === "whatsapp" ? "WhatsApp" : briefing.deliveredVia === "email" ? "Email" : briefing.deliveredVia === "belum-terkirim" ? "belum terkirim (hubungkan WA/email di Vercel)" : "—"} · <button className="btn-ghost" style={{ padding: "4px 10px" }} onClick={runBriefing} disabled={briefingBusy}>{briefingBusy ? "Memeriksa…" : "Periksa lagi"}</button> <button className="btn-ghost" style={{ padding: "4px 10px" }} onClick={async () => { try { const text = `*Briefing Pagi Adapil.ai*\n\n${briefing.summary}\n\nRencana tindakan:\n${briefing.actions.map((a, i) => `${i + 1}. ${a.title} — ${a.detail}`).join("\n")}`; await navigator.clipboard.writeText(text); setMsg("Briefing disalin — tempel langsung di WhatsApp."); } catch { setMsg("Tidak bisa menyalin otomatis."); } }}>Salin briefing untuk WhatsApp</button></p>
                </div>
              ) : (
                <button className="btn-amber" onClick={runBriefing} disabled={briefingBusy}>{briefingBusy ? "Agen sedang memeriksa…" : "Jalankan pemeriksaan agen"}</button>
              )}
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Isu per Kategori</h3>
              {Object.keys(byCat).length === 0 && <p className="small">Belum ada aspirasi. Catat aspirasi pertama di tab Aspirasi.</p>}
              {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, n]) => (
                <div key={c} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>{c}</span><b>{n}</b></div>
                  <div className="bar"><div style={{ width: `${(n / maxCat) * 100}%`, background: "#e8930c" }} /></div>
                </div>
              ))}
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Isu &amp; Sentimen Terbaru</h3>
              {issues.length === 0 && <p className="small">Belum ada isu terpantau.</p>}
              {issues.slice(0, 3).map((i) => (
                <p key={i.id}><b>{i.title}</b> <span className="tag">{i.platform}</span> <span className="small">· {i.mentions} unggahan · tren {i.trend} · negatif {i.negPct}%</span></p>
              ))}
            </div>
          </div>
        )}

        {tab === "profil" && <ProfileTab pf={pf} setPf={setPf} onSaved={(p) => { setProfile(p); setMsg("Profil tersimpan."); loadAll(); }} setMsg={setMsg} />}
        {tab === "tim" && (
          <div className="grid">
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Tim Kerja — politisi membaca &amp; menyetujui, staf menindaklanjuti</h3>
              <p className="small">Anggota tim ditugaskan ke aspirasi (di detail aspirasi) dengan tenggat. Yang belum ditugaskan akan muncul sebagai “belum ditugaskan” di antrean Beranda.</p>
              <form className="grid g3" onSubmit={async (e) => {
                e.preventDefault();
                try { await api("/api/team", "POST", memberForm); setMemberForm({ name: "", role: "Staf", phone: "" }); setMsg("Anggota tim ditambahkan."); loadAll(); } catch (err: any) { setMsg(err.message); }
              }}>
                <input placeholder="Nama anggota tim" value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} />
                <select value={memberForm.role} onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}>{["Staf", "Politisi"].map((s) => <option key={s}>{s}</option>)}</select>
                <input placeholder="No. WhatsApp (opsional)" value={memberForm.phone} onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })} />
                <button className="btn-amber" type="submit">Tambah anggota</button>
              </form>
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Anggota Tim ({team.length})</h3>
              {team.length === 0 && <p className="small">Belum ada anggota tim. Tambahkan staf yang menerima aspirasi dari warga.</p>}
              {team.map((m) => (
                <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                  <div><b>{m.name}</b> <span className="tag">{m.role}</span>{m.phone ? <span className="small"> · {m.phone}</span> : ""}<div className="small">{aspirations.filter((a) => a.assignedTo === m.id && a.status !== "Selesai").length} aspirasi belum selesai ditugaskan ke {m.name}</div></div>
                  <button className="btn-ghost" style={{ padding: "6px 10px" }} onClick={async () => { if (confirm(`Hapus ${m.name} dari tim? Aspirasi yang ditugaskan kepadanya kembali tanpa penanggung jawab.`)) { await api(`/api/team/${m.id}`, "DELETE"); loadAll(); } }}>Hapus</button>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === "aspirasi" && (
          <div className="grid">
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Dari Pesan WhatsApp — tempel, ekstrak, simpan</h3>
              <p className="small">Cara tercepat memasukkan aspirasi: staf <b>forward pesan warga dari WhatsApp lalu tempel di sini</b> — agen mengekstrak judul, kategori, prioritas, wilayah, dan nama pengirim. Tanpa kunci LLM, ekstraksi memakai aturan kata kunci; dengan kunci OpenAI/Gemini, LLM yang mengekstrak (tetap divalidasi ke daftar resmi). Periksa hasilnya sebelum menyimpan. Untuk pesan masuk otomatis tanpa tempel, hubungkan webhook WhatsApp (lihat README).</p>
              <textarea rows={4} placeholder="Tempel pesan WhatsApp warga di sini, mis:&#10;Assalamualaikum, saya Budi dari Gerung. Jalan depan rumah saya rusak parah, sudah 2 bulan tidak diperbaiki. Mohon bantuan Bapak." value={waText} onChange={(e) => setWaText(e.target.value)} />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn-amber" disabled={waBusy || !waText.trim()} onClick={async () => {
                  setWaBusy(true); setMsg("");
                  try { const r = await api("/api/aspirations/extract", "POST", { text: waText }); setWaExtract(r); } catch (err: any) { setMsg(err.message); }
                  setWaBusy(false);
                }}>{waBusy ? "Mengekstrak…" : "Ekstrak jadi aspirasi"}</button>
                {waExtract && <button className="btn" onClick={async () => {
                  try { await api("/api/aspirations", "POST", { title: waExtract.title, text: waExtract.text, source: "WhatsApp", category: waExtract.category, region: waExtract.region, priority: waExtract.priority }); setWaText(""); setWaExtract(null); setMsg(`Aspirasi tersimpan (${waExtract.engine}).`); loadAll(); } catch (err: any) { setMsg(err.message); }
                }}>Simpan sebagai aspirasi</button>}
              </div>
              {waExtract && (
                <div style={{ marginTop: 12, background: "#f8fafc", border: "1px solid var(--line)", borderRadius: 12, padding: 12 }}>
                  <p><b>Hasil ekstraksi ({waExtract.engine}):</b></p>
                  <p><b>{waExtract.title}</b>{waExtract.senderName ? ` — dari ${waExtract.senderName}` : ""}</p>
                  <p className="small">{waExtract.text}</p>
                  <p className="small">Kategori: {waExtract.category} · Prioritas: {waExtract.priority} · Wilayah: {waExtract.region || "tidak disebut di pesan"}</p>
                  <p className="small">Periksa dulu — ubah judul/kategori di bawah bila salah, lalu tekan “Simpan sebagai aspirasi”.</p>
                </div>
              )}
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Catat Aspirasi Baru</h3>
              <form className="grid" onSubmit={async (e) => {
                e.preventDefault();
                try { await api("/api/aspirations", "POST", af); setAf({ title: "", text: "", source: "WhatsApp", category: "Lainnya", region: "", priority: "Sedang" }); setMsg("Aspirasi tersimpan."); loadAll(); } catch (err: any) { setMsg(err.message); }
              }}>
                <input placeholder="Judul singkat (mis. Jalan rusak di Gerung)" value={af.title} onChange={(e) => setAf({ ...af, title: e.target.value })} />
                <textarea rows={3} placeholder="Isi aspirasi warga…" value={af.text} onChange={(e) => setAf({ ...af, text: e.target.value })} />
                <div className="grid g3">
                  <select value={af.source} onChange={(e) => setAf({ ...af, source: e.target.value })}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select>
                  <select value={af.category} onChange={(e) => setAf({ ...af, category: e.target.value })}>{CATEGORIES.map((s) => <option key={s}>{s}</option>)}</select>
                  <select value={af.region} onChange={(e) => setAf({ ...af, region: e.target.value })}>
                    <option value="">— Kecamatan —</option>
                    {regionsList.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <select value={af.priority} onChange={(e) => setAf({ ...af, priority: e.target.value })}>{["Mendesak", "Tinggi", "Sedang", "Rendah"].map((s) => <option key={s}>{s}</option>)}</select>
                <button className="btn-amber" type="submit">Simpan aspirasi</button>
              </form>
              <p className="small">Tips: setelah menyimpan, tekan “AI” pada aspirasi untuk saran kategori, prioritas, dan draf balasan. Draf tetap harus diperiksa manusia sebelum dikirim. Tanpa kunci OpenAI/Gemini, saran AI memakai aturan kata kunci — bukan pemahaman bahasa sungguhan.</p>
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Impor Massal Aspirasi (CSV)</h3>
              <p className="small">Untuk aspirasi yang sudah menumpuk di WhatsApp: salin ke CSV lalu impor sekaligus (maksimal 200 per impor). Format tiap baris, dipisah titik koma: <span className="mono">judul; isi; sumber; kategori; wilayah; prioritas</span>. Baris dengan satu kolom saja dianggap isi aspirasi.</p>
              <p className="small">Contoh: <span className="mono">Jalan rusak di Gerung; Jalan utama Gerung berlubang dan membahayakan pengendara; WhatsApp; Infrastruktur; Gerung; Mendesak</span> · <a href={`data:text/csv;charset=utf-8,${encodeURIComponent("judul;isi;sumber;kategori;wilayah;prioritas\nJalan rusak di Gerung;Jalan utama Gerung berlubang dan membahayakan pengendara;WhatsApp;Infrastruktur;Gerung;Mendesak\n")}`} download="contoh-aspirasi.csv">Unduh contoh CSV</a></p>
              <label className="small">Pilih berkas .csv</label>
              <input type="file" accept=".csv,text/csv" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setBulkText(String(r.result || "")); r.readAsText(f); }} />
              <label className="small">Atau tempel isi CSV di sini</label>
              <textarea rows={4} placeholder="judul; isi; sumber; kategori; wilayah; prioritas" value={bulkText} onChange={(e) => setBulkText(e.target.value)} />
              <button className="btn-amber" disabled={bulkBusy || !bulkText.trim()} onClick={async () => {
                setBulkBusy(true); setMsg("");
                try { const rows = parseBulkCsv(bulkText); const r = await api("/api/aspirations/bulk", "POST", { rows }); setMsg(`Impor selesai: ${r.created} aspirasi masuk${r.skipped ? `, ${r.skipped} baris dilewati.` : "."}`); setBulkText(""); loadAll(); } catch (err: any) { setMsg(err.message); }
                setBulkBusy(false);
              }}>{bulkBusy ? "Mengimpor…" : "Impor aspirasi"}</button>
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Inbox Aspirasi ({aspirations.length})</h3>
              {aspirations.length === 0 && <p className="small">Belum ada aspirasi. Data demo memakai akun demo@adapil.ai.</p>}
              <table><thead><tr><th>Aspirasi</th><th>Kategori</th><th>Wilayah</th><th>Status</th><th></th></tr></thead><tbody>
                {aspirations.map((a) => (
                  <tr key={a.id}>
                    <td><b>{a.title}</b><div className="small">{a.text.slice(0, 120)}</div><div className="small">{a.source} · prioritas {a.priority}</div></td>
                    <td>{a.category}</td><td>{a.region}</td>
                    <td><span className={`badge ${a.status === "Selesai" ? "ok" : a.status === "Diproses" ? "warn" : "bad"}`}>{a.status}</span></td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="btn-ghost" style={{ padding: "6px 10px", marginRight: 4 }} onClick={() => { setOpenAsp(a); loadFollowUps(a.id); }}>Buka</button>
                      <button className="btn-ghost" style={{ padding: "6px 10px", marginRight: 4 }} onClick={async () => { try { const r = await api(`/api/aspirations/${a.id}/classify`, "POST"); await api(`/api/aspirations/${a.id}`, "PUT", { category: r.category, priority: r.priority, draftReply: r.draftReply }); setAiSug({ id: a.id, category: r.category, priority: r.priority }); setMsg(`AI (${r.engine}): kategori ${r.category}, prioritas ${r.priority}. Draf balasan tersimpan — periksa sebelum dikirim.`); loadAll(); } catch (err: any) { setMsg(err.message); } }}>AI</button>
                      <button className="btn-ghost" style={{ padding: "6px 10px" }} onClick={async () => { if (confirm("Hapus aspirasi ini?")) { await api(`/api/aspirations/${a.id}`, "DELETE"); loadAll(); } }}>Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody></table>
              {openAsp && (
                <div className="card" style={{ marginTop: 12, background: "#fffbeb" }}>
                  <h4 style={{ marginTop: 0 }}>{openAsp.title}</h4>
                  <p>{openAsp.text}</p>
                  <label className="small">Status</label>
                  <select value={openAsp.status} onChange={(e) => setOpenAsp({ ...openAsp, status: e.target.value })}>
                    {["Baru", "Diproses", "Selesai"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <label className="small">Kategori (boleh dikoreksi — koreksimu dipakai agen untuk belajar)</label>
                  <select value={openAsp.category} onChange={(e) => setOpenAsp({ ...openAsp, category: e.target.value })}>
                    {CATEGORIES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <label className="small">Prioritas</label>
                  <select value={openAsp.priority} onChange={(e) => setOpenAsp({ ...openAsp, priority: e.target.value })}>
                    {["Mendesak", "Tinggi", "Sedang", "Rendah"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <label className="small">Penanggung jawab (tim)</label>
                  <select value={openAsp.assignedTo || ""} onChange={(e) => setOpenAsp({ ...openAsp, assignedTo: e.target.value })}>
                    <option value="">— Belum ditugaskan —</option>
                    {team.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                  </select>
                  <label className="small">Tenggat tindak lanjut</label>
                  <input type="date" value={openAsp.dueDate ? openAsp.dueDate.slice(0, 10) : ""} onChange={(e) => setOpenAsp({ ...openAsp, dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                  <label className="small">Catatan tindak lanjut</label>
                  <textarea rows={2} value={openAsp.followUp} onChange={(e) => setOpenAsp({ ...openAsp, followUp: e.target.value })} />
                  <label className="small">Draf balasan (periksa sebelum dikirim) {openAsp.draftStatus === "disetujui" ? <span className="badge ok">Disetujui</span> : openAsp.draftStatus === "ditolak" ? <span className="badge bad">Ditolak</span> : <span className="badge warn">Menunggu persetujuan</span>}</label>
                  <textarea rows={3} value={openAsp.draftReply} onChange={(e) => setOpenAsp({ ...openAsp, draftReply: e.target.value })} />
                  <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    <button className="btn-ghost" style={{ padding: "6px 10px" }} onClick={async () => { await api(`/api/aspirations/${openAsp.id}`, "PUT", { draftStatus: "disetujui" }); setOpenAsp({ ...openAsp, draftStatus: "disetujui" }); setMsg("Draf disetujui — boleh dikirim ke warga."); loadAll(); }}>Setujui draf</button>
                    <button className="btn-ghost" style={{ padding: "6px 10px" }} onClick={async () => { await api(`/api/aspirations/${openAsp.id}`, "PUT", { draftStatus: "ditolak" }); setOpenAsp({ ...openAsp, draftStatus: "ditolak" }); setMsg("Draf ditolak — edit dulu sebelum dipakai."); loadAll(); }}>Tolak draf</button>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <button className="btn" onClick={async () => {
                      // Rekam koreksi: bila pengguna mengubah hasil saran AI,
                      // agen belajar dari perubahan itu untuk klasifikasi berikutnya.
                      if (aiSug && aiSug.id === openAsp.id) {
                        const ctx = `${openAsp.title} ${openAsp.text}`;
                        if (openAsp.category !== aiSug.category) { try { await api("/api/ai-corrections", "POST", { field: "category", fromValue: aiSug.category, toValue: openAsp.category, context: ctx }); } catch { /* koreksi gagal direkam — simpan tetap jalan */ } }
                        if (openAsp.priority !== aiSug.priority) { try { await api("/api/ai-corrections", "POST", { field: "priority", fromValue: aiSug.priority, toValue: openAsp.priority, context: ctx }); } catch { /* koreksi gagal direkam — simpan tetap jalan */ } }
                        setAiSug(null);
                      }
                      await api(`/api/aspirations/${openAsp.id}`, "PUT", { status: openAsp.status, category: openAsp.category, priority: openAsp.priority, followUp: openAsp.followUp, draftReply: openAsp.draftReply, assignedTo: openAsp.assignedTo || "", dueDate: openAsp.dueDate || null, draftStatus: openAsp.draftStatus }); setOpenAsp(null); setMsg("Aspirasi diperbarui."); loadAll();
                    }}>Simpan perubahan</button>
                    <button className="btn-amber" onClick={async () => { try { await navigator.clipboard.writeText(openAsp.draftReply || ""); setMsg("Draf disalin — tempel langsung di WhatsApp."); } catch { setMsg("Tidak bisa menyalin otomatis — salin manual dari kolom draf."); } }}>Salin draf untuk WhatsApp</button>
                    <button className="btn-ghost" onClick={() => setOpenAsp(null)}>Tutup</button>
                  </div>
                  <hr />
                  <h4 style={{ marginBottom: 4 }}>Jejak Tindak Lanjut ke Dinas — bukti kerja</h4>
                  <p className="small">Setiap langkah ke dinas/instansi dicatat di sini (nama dinas, nomor surat, status). Inilah yang nanti muncul di Laporan Bulanan sebagai bukti kerja ke warga dan partai.</p>
                  {followUps.length === 0 && <p className="small">Belum ada tindak lanjut tercatat untuk aspirasi ini.</p>}
                  {followUps.map((f) => (
                    <p key={f.id} className="small" style={{ margin: "6px 0" }}><b>{f.agency}</b> — {f.status}{f.ref ? ` · ref: ${f.ref}` : ""} · {new Date(f.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}{f.note ? <><br />{f.note}</> : ""}</p>
                  ))}
                  <div className="grid g2">
                    <input placeholder="Dinas / instansi yang dituju (mis. Dinas PUPR)" value={fuForm.agency} onChange={(e) => setFuForm({ ...fuForm, agency: e.target.value })} />
                    <input placeholder="Nomor surat / referensi (opsional)" value={fuForm.ref} onChange={(e) => setFuForm({ ...fuForm, ref: e.target.value })} />
                  </div>
                  <textarea rows={2} placeholder="Catatan tindak lanjut (mis. Sudah disampaikan ke kepala dinas, menunggu jawaban tertulis)…" value={fuForm.note} onChange={(e) => setFuForm({ ...fuForm, note: e.target.value })} />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <select value={fuForm.status} onChange={(e) => setFuForm({ ...fuForm, status: e.target.value })} style={{ maxWidth: 200 }}>{["Diajukan", "Diproses", "Selesai", "Ditolak"].map((s) => <option key={s}>{s}</option>)}</select>
                    <button className="btn" onClick={async () => {
                      try { await api(`/api/aspirations/${openAsp.id}/followups`, "POST", fuForm); setFuForm({ agency: "", note: "", ref: "", status: "Diajukan" }); setMsg("Tindak lanjut tercatat."); loadFollowUps(openAsp.id); loadAll(); } catch (err: any) { setMsg(err.message); }
                    }}>Catat tindak lanjut</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {tab === "isu" && (
          <div className="grid">
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Catat Isu Media Sosial</h3>
              <p className="small">Tidak ada koneksi live ke platform media sosial. Isu dicatat tim, lalu AI menganalisis contoh unggahan yang ditempel — angkanya adalah <b>estimasi dari contoh</b>, bukan data live.</p>
              <form className="grid" onSubmit={async (e) => {
                e.preventDefault();
                try { await api("/api/issues", "POST", iff); setIff({ title: "", platform: "TikTok", mentions: 0, samplePosts: "", isHoax: false, sourceUrl: "" }); setMsg("Isu tersimpan."); loadAll(); } catch (err: any) { setMsg(err.message); }
              }}>
                <input placeholder="Judul isu (mis. Keluhan jalan rusak Gerung viral)" value={iff.title} onChange={(e) => setIff({ ...iff, title: e.target.value })} />
                <div className="grid g2">
                  <select value={iff.platform} onChange={(e) => setIff({ ...iff, platform: e.target.value })}>{PLATFORMS.map((s) => <option key={s}>{s}</option>)}</select>
                  <input type="number" placeholder="Perkiraan jumlah unggahan" value={iff.mentions || ""} onChange={(e) => setIff({ ...iff, mentions: Number(e.target.value) })} />
                </div>
                <textarea rows={3} placeholder="Tempel contoh unggahan/komentar warga (satu per baris)…" value={iff.samplePosts} onChange={(e) => setIff({ ...iff, samplePosts: e.target.value })} />
                <input placeholder="Tautan sumber (opsional) — mis. https://… berita / unggahan asli" value={iff.sourceUrl} onChange={(e) => setIff({ ...iff, sourceUrl: e.target.value })} />
                <label><input type="checkbox" checked={iff.isHoax} onChange={(e) => setIff({ ...iff, isHoax: e.target.checked })} style={{ width: "auto" }} /> Ini hoaks / kabar yang perlu diklarifikasi</label>
                <button className="btn-amber" type="submit">Simpan isu</button>
              </form>
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Isu Terpantau ({issues.length})</h3>
              {issues.length === 0 && <p className="small">Belum ada isu.</p>}
              {issues.map((i) => (
                <div key={i.id} className="card" style={{ marginBottom: 12 }}>
                  <b>{i.title}</b> {i.isHoax && <span className="badge bad">HOAKS</span>} <span className="tag">{i.platform}</span>
                  {i.isHoax && !i.sourceUrl && <p className="small" style={{ color: "#b91c1c", fontWeight: 700 }}>⛔ Hoaks tanpa sumber resmi — jangan terbitkan klarifikasi dulu. Tempel tautan sumber (berita / unggahan asli / pernyataan resmi) pada isu ini, lalu jalankan Analisis AI lagi. Klarifikasi tanpa sumber bisa menjadi fitnah.</p>}
                  <div className="small">~{i.mentions} unggahan (perkiraan tim, bukan data live) · tren {i.trend} · tingkat {i.severity} · status {i.status} · dicatat {i.createdAt ? new Date(i.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—"}{i.sourceUrl ? <> · <a href={i.sourceUrl} target="_blank" rel="noreferrer">Lihat sumber</a></> : ""}</div>
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>Positif {i.posPct}%</span><span>Netral {i.neuPct}%</span><span>Negatif {i.negPct}%</span></div>
                    <div className="bar"><div style={{ width: `${i.posPct}%`, background: "#16a34a" }} /><div style={{ width: `${i.neuPct}%`, background: "#9ca3af" }} /><div style={{ width: `${i.negPct}%`, background: "#dc2626" }} /></div>
                  </div>
                  {i.themes && <p className="small">Tema: {i.themes}</p>}
                  {i.analysisNote && <p className="small">{i.analysisNote}</p>}
                  {i.recommendation && <div><b>Rekomendasi pesan (perlu persetujuan manusia — tidak auto-posting):</b><pre>{i.recommendation}</pre></div>}
                  {i.clarification && <div><b>Draf klarifikasi:</b><pre>{i.clarification}</pre></div>}
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <button className="btn" style={{ padding: "8px 12px" }} onClick={async () => { try { const r = await api(`/api/issues/${i.id}/analyze`, "POST"); setMsg(`Analisis selesai (${r.engine}).`); loadAll(); } catch (err: any) { setMsg(err.message); } }}>Analisis AI</button>
                    <button className="btn-ghost" style={{ padding: "8px 12px" }} onClick={() => setOpenIssue(i)}>Edit / contoh unggahan</button>
                    <button className="btn-ghost" style={{ padding: "8px 12px" }} onClick={async () => { const s = i.status === "Dipantau" ? "Direspons" : "Selesai"; await api(`/api/issues/${i.id}`, "PUT", { status: s }); loadAll(); }}>Tandai: {i.status === "Dipantau" ? "Direspons" : "Selesai"}</button>
                    <button className="btn-ghost" style={{ padding: "8px 12px" }} onClick={async () => { if (confirm("Hapus isu ini?")) { await api(`/api/issues/${i.id}`, "DELETE"); loadAll(); } }}>Hapus</button>
                  </div>
                  {openIssue?.id === i.id && (
                    <div style={{ marginTop: 8 }}>
                      <label className="small">Contoh unggahan/komentar (satu per baris)</label>
                      <textarea rows={4} value={openIssue.samplePosts} onChange={(e) => setOpenIssue({ ...openIssue, samplePosts: e.target.value })} />
                      <label className="small">Rekomendasi pesan (edit sebelum dipakai)</label>
                      <textarea rows={4} value={openIssue.recommendation} onChange={(e) => setOpenIssue({ ...openIssue, recommendation: e.target.value })} />
                      <button className="btn" style={{ marginTop: 8 }} onClick={async () => { await api(`/api/issues/${i.id}`, "PUT", { samplePosts: openIssue.samplePosts, recommendation: openIssue.recommendation }); setOpenIssue(null); loadAll(); }}>Simpan</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "legislasi" && (
          <div className="grid">
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Pusat Bukti Dapil</h3>
              {evidence ? (
                <div>
                  <div className="grid g4">
                    <div><div className="stat">{evidence.totalAspirations}</div><div className="small">Aspirasi tercatat</div></div>
                    <div><div className="stat">{evidence.resolved}</div><div className="small">Selesai</div></div>
                    <div><div className="stat">{evidence.regionsCovered}/{evidence.regionsTotal}</div><div className="small">Wilayah tercakup</div></div>
                    <div><div className="stat">{evidence.coveragePct}%</div><div className="small">Cakupan dapil</div></div>
                  </div>
                  <p><b>Titik buta data</b> (wilayah tanpa satu pun aspirasi tercatat): {evidence.blindSpots.length ? evidence.blindSpots.join(", ") : "Tidak ada — semua wilayah sudah terdata."}</p>
                  <h4>Matriks Prioritas Legislasi</h4>
                  <table><thead><tr><th>Kategori</th><th>Total</th><th>Belum selesai</th><th>Tuas legislatif</th></tr></thead><tbody>
                    {evidence.matrix.map((m) => (
                      <tr key={m.category}><td>{m.category}</td><td>{m.total}</td><td>{m.unresolved}</td><td><span className="tag">{m.lever === "anggaran" ? "Anggaran" : m.lever === "legislasi" ? "Legislasi" : "Pengawasan"}</span></td></tr>
                    ))}
                  </tbody></table>
                  {evidence.matrix.length === 0 && <p className="small">Belum ada data — isi inbox aspirasi dulu.</p>}
                </div>
              ) : <p className="small">Lengkapi profil dapil dan catat aspirasi dulu.</p>}
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Dokumen Pendukung — RUU / Perda / APBD / Surat Dinas (PDF)</h3>
              <p className="small">Unggah PDF — teksnya dibaca di browser Anda (tidak ada berkas yang dikirim ke server) lalu disimpan sebagai bukti pendukung. Generator dokumen hanya menyebut judul dan jumlah dokumen ini; angka dari isi dokumen <b>tidak dikutip otomatis</b> — periksa isinya sebelum memakai angka dari dokumen.</p>
              <div className="grid g2">
                <select id="pdf-kind" defaultValue="Perda">{["RUU", "Perda", "APBD", "Surat Dinas", "Dokumen"].map((s) => <option key={s}>{s}</option>)}</select>
                <input type="file" accept=".pdf,application/pdf" disabled={pdfBusy} onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  setPdfBusy(true); setMsg("");
                  try {
                    const text = await extractPdfText(f);
                    if (!text) throw new Error("Tidak ada teks yang bisa dibaca dari PDF ini (mungkin hasil pindaian gambar). Tempel teksnya manual lewat tombol di bawah.");
                    const kind = (document.getElementById("pdf-kind") as HTMLSelectElement)?.value || "Dokumen";
                    await api("/api/legislative/evidence", "POST", { title: f.name.replace(/\.pdf$/i, ""), kind, text });
                    setMsg(`Dokumen "${f.name}" tersimpan (${text.length.toLocaleString("id-ID")} karakter terbaca).`); loadAll();
                  } catch (err: any) { setMsg(err.message); }
                  setPdfBusy(false); e.target.value = "";
                }} />
              </div>
              {pdfBusy && <p className="small">Membaca PDF di browser…</p>}
              <h4>Dokumen Tersimpan ({docEvidence.length})</h4>
              {docEvidence.length === 0 && <p className="small">Belum ada dokumen pendukung.</p>}
              {docEvidence.map((d) => (
                <p key={d.id} className="small" style={{ margin: "6px 0" }}><b>{d.title}</b> <span className="tag">{d.kind}</span> · {new Date(d.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} <button className="btn-ghost" style={{ padding: "4px 8px" }} onClick={async () => { if (confirm("Hapus dokumen pendukung ini?")) { await api(`/api/legislative/evidence/${d.id}`, "DELETE"); loadAll(); } }}>Hapus</button></p>
              ))}
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Generator Dokumen Legislasi</h3>
              <p className="small">Dokumen disusun dari angka dapil Anda yang dihitung server. AI tidak boleh menyebut angka di luar bukti itu, dan celah data diakui secara jujur.</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select value={docType} onChange={(e) => setDocType(e.target.value)} style={{ maxWidth: 320 }}>
                  {DOC_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button className="btn-amber" onClick={async () => {
                  try {
                    const r = await api("/api/legislative/generate", "POST", { type: docType });
                    await api("/api/legislative", "POST", r.doc);
                    setMsg(`Dokumen dibuat (${r.engine}) dan tersimpan.`); loadAll();
                  } catch (err: any) { setMsg(err.message); }
                }}>Buat &amp; simpan dokumen</button>
              </div>
              <h4>Dokumen Tersimpan ({docs.length})</h4>
              {docs.length === 0 && <p className="small">Belum ada dokumen.</p>}
              {docs.map((d) => (
                <div key={d.id} className="card" style={{ marginBottom: 8 }}>
                  <b>{d.title}</b>
                  <div className="small">{d.summary}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button className="btn-ghost" style={{ padding: "6px 10px" }} onClick={() => setOpenDoc(d)}>Buka / edit</button>
                    <button className="btn-ghost" style={{ padding: "6px 10px" }} onClick={async () => { if (confirm("Hapus dokumen ini?")) { await api(`/api/legislative/${d.id}`, "DELETE"); loadAll(); } }}>Hapus</button>
                  </div>
                  {openDoc?.id === d.id && (
                    <div style={{ marginTop: 8 }}>
                      <textarea rows={14} value={openDoc.content} onChange={(e) => setOpenDoc({ ...openDoc, content: e.target.value })} />
                      {openDoc.dataGaps && <p className="small"><b>Celah data:</b> {openDoc.dataGaps}</p>}
                      <button className="btn" style={{ marginTop: 8 }} onClick={async () => { await api(`/api/legislative/${d.id}`, "PUT", { content: openDoc.content }); setOpenDoc(null); loadAll(); }}>Simpan perubahan</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === "konsultan" && (
          <div className="grid">
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Agen Konsultan AI</h3>
              <p className="small">Ini agen, bukan chatbot template: sebelum menjawab, ia menyusun rencana lalu <b>memanggil tool</b> atas data dapil Anda sendiri — mencari aspirasi mendesak, memeriksa isu naik, membuat draf balasan, bahkan membuat dokumen legislasi. Jejak tool-nya ditampilkan di bawah jawaban supaya bisa Anda periksa. Ia <b>tidak</b> membaca media sosial live dan tidak bisa menjawab soal data yang belum Anda catat (misalnya isi APBD) — kalau datanya belum ada, ia akan bilang begitu, bukan mengarang. Tindakan yang mengubah data (buat draf, buat dokumen, ubah status) hanya jalan kalau Anda yang memintanya. Keputusan tetap di tangan Anda.</p>
              {chatMsgs.length === 0 && (
                <div>
                  <p className="small">Belum ada percakapan. Coba salah satu pertanyaan ini:</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {SUGGESTED_Q.map((q) => (
                      <button key={q} className="btn-ghost" style={{ padding: "8px 12px" }} onClick={() => askConsultant(q)} disabled={chatBusy}>{q}</button>
                    ))}
                  </div>
                </div>
              )}
              {chatMsgs.length > 0 && (
                <div style={{ display: "grid", gap: 12, marginBottom: 12 }}>
                  {chatMsgs.map((m) => (
                    <div key={m.id} style={{ background: m.role === "user" ? "#eef2ff" : "#fffbeb", border: "1px solid var(--line)", borderRadius: 12, padding: 12 }}>
                      <div className="small" style={{ fontWeight: 700, marginBottom: 4 }}>{m.role === "user" ? "Anda" : "Konsultan AI"}</div>
                      <pre>{m.content}</pre>
                    </div>
                  ))}
                </div>
              )}
              {agentTools.length > 0 && (
                <div className="card" style={{ marginBottom: 12, background: "#f8fafc" }}>
                  <b>🔧 Alat yang dipakai agen pada jawaban terakhir</b>
                  <p className="small">Agen tidak menjawab dari ingatan — ia memanggil tool ini atas data dapil Anda, dan hasilnya bisa Anda periksa:</p>
                  {agentTools.map((t, idx) => (
                    <p key={idx} className="small" style={{ margin: "6px 0" }}><span className="tag">{t.name}</span> {t.result}</p>
                  ))}
                </div>
              )}
              <form className="grid" onSubmit={(e) => { e.preventDefault(); askConsultant(chatQ); }}>
                <textarea rows={3} placeholder="Tulis pertanyaan Anda, mis. Apa yang paling mendesak minggu ini?" value={chatQ} onChange={(e) => setChatQ(e.target.value)} />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn-amber" type="submit" disabled={chatBusy}>{chatBusy ? "Konsultan sedang menjawab…" : "Tanya konsultan"}</button>
                  {chatMsgs.length > 0 && <button className="btn-ghost" type="button" onClick={async () => { if (confirm("Hapus semua riwayat percakapan dengan Konsultan AI?")) { await api("/api/consultant/chat", "DELETE"); setChatMsgs([]); setChatEngine(""); } }}>Hapus riwayat</button>}
                </div>
              </form>
              {chatMsgs.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  {SUGGESTED_Q.map((q) => (
                    <button key={q} className="btn-ghost" style={{ padding: "6px 10px" }} onClick={() => askConsultant(q)} disabled={chatBusy}>{q}</button>
                  ))}
                </div>
              )}
              {chatEngine && <p className="small">Mesin jawaban: {chatEngine}.</p>}
            </div>
          </div>
        )}
        {tab === "laporan" && (
          <div className="grid">
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Laporan Bulanan — bukti kerja {new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</h3>
              <p>Dapil: {profile?.dapilName || "belum diatur"} · Dihitung dari data yang Anda catat di Adapil.ai.</p>
              {(() => {
                const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), 1);
                const mAsp = aspirations.filter((a) => new Date(a.createdAt) >= start);
                const mDone = mAsp.filter((a) => a.status === "Selesai");
                const mFu = allFollowUps.filter((f) => new Date(f.createdAt) >= start);
                const mFuDone = mFu.filter((f) => f.status === "Selesai");
                const mOver = aspirations.filter((a) => isOverdue(a));
                return (
                  <div>
                    <div className="grid g4">
                      <div><div className="stat">{mAsp.length}</div><div className="small">Aspirasi masuk bulan ini</div></div>
                      <div><div className="stat">{mDone.length}</div><div className="small">Selesai bulan ini</div></div>
                      <div><div className="stat">{mFu.length}</div><div className="small">Tindak lanjut ke dinas</div></div>
                      <div><div className="stat">{mOver.length}</div><div className="small">Lewat tenggat</div></div>
                    </div>
                    <h4>Per Kategori (bulan ini)</h4>
                    {Object.entries(mAsp.reduce((acc: Record<string, number>, a) => { acc[a.category] = (acc[a.category] || 0) + 1; return acc; }, {})).map(([c, n]) => <p key={c}>{c}: <b>{n}</b> aspirasi</p>)}
                    {mAsp.length === 0 && <p className="small">Belum ada aspirasi bulan ini.</p>}
                    <h4>Tindak Lanjut ke Dinas (bulan ini)</h4>
                    {mFu.length === 0 && <p className="small">Belum ada tindak lanjut tercatat — catat di detail aspirasi (nama dinas, nomor surat, status).</p>}
                    {mFu.slice(0, 10).map((f) => <p key={f.id} className="small">{f.agency} — {f.status}{f.ref ? ` · ref: ${f.ref}` : ""} · {new Date(f.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</p>)}
                    <p className="small">Tindak lanjut selesai: {mFuDone.length} dari {mFu.length}.</p>
                    <h4>Isu Terpantau</h4>
                    {issues.map((i) => <p key={i.id}>{i.title} — {i.platform}, negatif {i.negPct}%, tren {i.trend}, status {i.status}</p>)}
                    {issues.length === 0 && <p className="small">Belum ada isu.</p>}
                    <h4>Titik Buta</h4>
                    <p>{evidence?.blindSpots.length ? evidence.blindSpots.join(", ") : "Tidak ada."}</p>
                    <button className="btn-amber" onClick={() => window.print()}>Cetak / simpan PDF laporan ini</button>
                  </div>
                );
              })()}
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Evaluasi Agen — 30 hari terakhir</h3>
              <p className="small">Dihitung dari jejak pemanggilan tool agen (bukan dari klaim). Ini mengukur <b>pemakaian</b>, bukan kualitas — draf yang “disetujui” berarti Anda menekan Setujui; apakah draf itu bagus di mata warga, hanya warga yang bisa menilai.</p>
              {evaluation ? (
                <div>
                  <div className="grid g3">
                    <div><div className="stat">{evaluation.totalToolCalls}</div><div className="small">Pemanggilan tool</div></div>
                    <div><div className="stat">{evaluation.actions}</div><div className="small">Tindakan agen</div></div>
                    <div><div className="stat">{evaluation.acceptanceRate === null ? "—" : `${evaluation.acceptanceRate}%`}</div><div className="small">Tindakan disetujui</div></div>
                  </div>
                  <p className="small">Tindakan disetujui: {evaluation.acceptedActions} dari {evaluation.actions} · Draf disetujui: {evaluation.approvedDrafts} · Dokumen dibuat: {evaluation.docsCreated} · Koreksi yang dipelajari: {evaluation.correctionsLearned}</p>
                  <h4>Tool yang paling dipakai</h4>
                  {Object.entries(evaluation.byTool).sort((a, b) => b[1] - a[1]).map(([t, n]) => <p key={t} className="small"><span className="tag">{t}</span> {n}×</p>)}
                  {evaluation.totalToolCalls === 0 && <p className="small">Belum ada pemanggilan tool — coba tanyakan sesuatu ke Agen Konsultan.</p>}
                </div>
              ) : <p className="small">Evaluasi belum bisa dimuat.</p>}
            </div>
          </div>
        )}
        {tab === "paket" && (
          <div className="grid">
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Paket Adapil.ai (draf — belum ada pembayaran aktif)</h3>
              <p className="small">Langganan berbayar hanya 2. Akun baru mulai gratis sebagai Starter (1 politisi, 1 dapil, inbox aspirasi). Checkout berlabel <b>SIMULASI</b> selama MIDTRANS_SERVER_KEY belum dipasang — tidak ada tagihan nyata. Pasang kunci Midtrans untuk transaksi Snap sungguhan.</p>
              <div className="grid g2">
                {(Object.entries({ pro: ["Pro", "Rp499.000/bulan", "Starter + Isu & Sentimen, Asisten Legislasi, Konsultan AI, laporan otomatis."], timses: ["Timses / Partai", "Rp1.000.000/bulan", "Pro + multi-user, multi-dapil, peta kampanye, manajemen relawan."] }) as Array<[string, [string, string, string]]>).map(([k, [name, price, desc]]) => (
                  <div key={k} className="card">
                    <b>{name}</b><div className="stat" style={{ fontSize: 20 }}>{price}</div>
                    <p className="small">{desc}</p>
                    <button className={plan === k ? "btn-ghost" : "btn-amber"} onClick={async () => {
                      try {
                        const r = await api("/api/payments", "POST", { plan: k, method: "qris" });
                        setMsg(r.mode === "simulasi" ? `Pesanan ${r.payment.orderId} dibuat (SIMULASI — tidak ada tagihan).` : `Pesanan dibuat. Lanjutkan ke Snap: ${r.redirectUrl}`);
                        if (r.mode === "simulasi") { await api("/api/payments/confirm", "POST", { orderId: r.payment.orderId }); }
                        loadAll();
                      } catch (err: any) { setMsg(err.message); }
                    }}>{plan === k ? "Paket aktif" : "Pilih paket"}</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Riwayat Pembayaran</h3>
              {payments.length === 0 && <p className="small">Belum ada pembayaran.</p>}
              {payments.map((p: any) => <p key={p.id}>{p.orderId} — {p.plan} — Rp{p.amount.toLocaleString("id-ID")} — {p.status} — <span className="tag">{p.mode === "simulasi" ? "SIMULASI" : "MIDTRANS"}</span></p>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileTab({ pf, setPf, onSaved, setMsg }: { pf: Profile; setPf: (p: Profile) => void; onSaved: (p: Profile) => void; setMsg: (s: string) => void }) {
  const [dapils, setDapils] = useState<any[]>([]);
  const [cp, setCp] = useState({ current: "", next: "" });
  const [cpMsg, setCpMsg] = useState("");
  useEffect(() => {
    fetch("/api/dapil").then((r) => r.json()).then((d) => setDapils(d.items || [])).catch(() => setDapils([]));
  }, []);
  const filtered = dapils.filter((d: any) => d.level === pf.level);
  const selected = dapils.find((d: any) => d.id === pf.dapilId);
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Profil Politisi &amp; Dapil</h3>
      <form className="grid" onSubmit={async (e) => {
        e.preventDefault();
        try { const r = await api("/api/profile", "POST", pf); onSaved(r.profile); } catch (err: any) { setMsg(err.message); }
      }}>
        <input placeholder="Nama politisi" value={pf.name} onChange={(e) => setPf({ ...pf, name: e.target.value })} />
        <div className="grid g2">
          <select value={pf.role} onChange={(e) => setPf({ ...pf, role: e.target.value })}>
            {["Anggota DPR RI", "Anggota DPRD", "Calon Kepala Daerah", "Calon Legislatif", "Tim Sukses"].map((s) => <option key={s}>{s}</option>)}
          </select>
          <input placeholder="Partai" value={pf.party} onChange={(e) => setPf({ ...pf, party: e.target.value })} />
        </div>
        <label className="small">Tingkat dapil</label>
        <select value={pf.level} onChange={(e) => setPf({ ...pf, level: e.target.value, dapilId: "" })}>
          {["DPR RI", "DPRD Provinsi", "DPRD Kabupaten-Kota"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <label className="small">Dapil (katalog resmi NTB — PKPU 6/2023, Pemilu 2024)</label>
        <select value={pf.dapilId} onChange={(e) => setPf({ ...pf, dapilId: e.target.value })}>
          <option value="">— Pilih dapil —</option>
          {filtered.map((d: any) => <option key={d.id} value={d.id}>{d.name} — {d.seats} kursi{d.regency ? ` · ${d.regency}` : ""}</option>)}
        </select>
        {selected && <p className="small"><b>{selected.name}</b> — {selected.seats} kursi · Wilayah: {selected.regions.join(", ")}</p>}
        <label className="small">Daftar wilayah (otomatis dari dapil, bisa diubah)</label>
        <textarea rows={3} value={pf.regions} onChange={(e) => setPf({ ...pf, regions: e.target.value })} placeholder="Kecamatan / kabupaten-kota, dipisah koma" />
        <label className="small">Nomor WhatsApp akun ini (untuk kirim Briefing Pagi Agen — format: 6281234567890)</label>
        <input placeholder="62812..." value={pf.phone} onChange={(e) => setPf({ ...pf, phone: e.target.value })} />
        <button className="btn-amber" type="submit">Simpan profil</button>
      </form>
      <p className="small">Katalog dapil: DPR RI NTB I (3 kursi) &amp; NTB II (8 kursi); DPRD Provinsi NTB 1–8 (65 kursi); DPRD 10 kabupaten/kota NTB (50 dapil, 385 kursi).</p>
      <hr />
      <h4>Ganti Kata Sandi</h4>
      <form className="grid" onSubmit={async (e) => {
        e.preventDefault(); setCpMsg("");
        try { await api("/api/auth/change-password", "POST", { currentPassword: cp.current, newPassword: cp.next }); setCp({ current: "", next: "" }); setCpMsg("Kata sandi berhasil diganti."); } catch (err: any) { setCpMsg(err.message); }
      }}>
        <input placeholder="Kata sandi lama" type="password" value={cp.current} onChange={(e) => setCp({ ...cp, current: e.target.value })} />
        <input placeholder="Kata sandi baru (min. 6 karakter)" type="password" value={cp.next} onChange={(e) => setCp({ ...cp, next: e.target.value })} />
        <button className="btn" type="submit">Ganti kata sandi</button>
      </form>
      {cpMsg && <p className="small">{cpMsg}</p>}
      <p className="small">Reset kata sandi lewat email sudah bisa — pakai “Lupa kata sandi?” di halaman masuk (perlu layanan email Resend terpasang di Vercel; bila belum terpasang, tautan tidak bisa dikirim).</p>
    </div>
  );
}
