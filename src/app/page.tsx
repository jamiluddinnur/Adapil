"use client";
import { useEffect, useState } from "react";

type User = { id: string; name: string; email: string };
type Profile = { name: string; role: string; party: string; level: string; dapilId: string; dapilName: string; regions: string };
type Aspiration = { id: string; title: string; text: string; source: string; category: string; region: string; status: string; priority: string; followUp: string; draftReply: string; createdAt: string };
type Issue = { id: string; title: string; platform: string; mentions: number; trend: string; posPct: number; neuPct: number; negPct: number; severity: string; themes: string; samplePosts: string; recommendation: string; clarification: string; isHoax: boolean; status: string; analysisNote: string };
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
  const [pf, setPf] = useState<Profile>({ name: "", role: "Anggota DPRD", party: "", level: "DPRD Provinsi", dapilId: "", dapilName: "", regions: "" });
  // aspiration form
  const [af, setAf] = useState({ title: "", text: "", source: "WhatsApp", category: "Lainnya", region: "", priority: "Sedang" });
  // issue form
  const [iff, setIff] = useState({ title: "", platform: "TikTok", mentions: 0, samplePosts: "", isHoax: false });
  // legislative
  const [docType, setDocType] = useState("briefing");
  // konsultan AI
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatQ, setChatQ] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatEngine, setChatEngine] = useState("");
  const SUGGESTED_Q = [
    "Apa yang paling mendesak minggu ini?",
    "Isu apa yang sedang naik di dapil saya?",
    "Apa yang harus saya siapkan untuk reses?",
    "Wilayah mana yang belum terdata?",
    "Buatkan ringkasan minggu ini",
  ];
  async function askConsultant(q: string) {
    const question = q.trim();
    if (!question || chatBusy) return;
    setChatBusy(true); setMsg("");
    try {
      const r = await api("/api/consultant/chat", "POST", { question });
      setChatMsgs(r.messages || []); setChatEngine(r.engine || ""); setChatQ("");
    } catch (err: any) { setMsg(err.message); }
    setChatBusy(false);
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
    } catch { setUser(null); }
  }
  useEffect(() => { loadAll(); }, []);

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
  const rising = issues.filter((i) => i.trend === "naik");
  const byCat: Record<string, number> = {};
  aspirations.forEach((a) => { byCat[a.category] = (byCat[a.category] || 0) + 1; });
  const maxCat = Math.max(1, ...Object.values(byCat));

  if (!user) {
    return (
      <div>
        <header className="top">
          <img src="/adapil-logo.webp" alt="Logo Adapil.ai" width={48} height={48} style={{ borderRadius: 12 }} />
          <div><div style={{ fontSize: 22, fontWeight: 800 }}>Adapil.ai</div><div className="tagline">Setiap Aspirasi Warga Terjawab.</div></div>
        </header>
        <div className="wrap">
          <IndonesiaMap />
          <div className="grid g2" style={{ marginTop: 16 }}>
            <div className="card">
              <h1 style={{ marginTop: 0 }}>Dashboard Intelijen Konstituen untuk Politisi Indonesia</h1>
              <p>Inbox aspirasi warga, Isu &amp; Sentimen media sosial dapil, dan Asisten Legislasi anti-buta-data — semua dari data dapil Anda sendiri.</p>
              <ul>
                <li><b>Inbox Aspirasi:</b> WhatsApp, reses, DM — tercatat dan berstatus Baru–Diproses–Selesai.</li>
                <li><b>Isu &amp; Sentimen:</b> analisis sentimen dari contoh unggahan tim + 3 rekomendasi pesan.</li>
                <li><b>Legislasi:</b> Pusat Bukti Dapil, Matriks Prioritas, dan 6 jenis dokumen kerja.</li>
                <li><b>Konsultan AI:</b> tanya-jawab soal dapil Anda — prioritas, isu naik, bahan reses — dijawab dari data dapil Anda sendiri.</li>
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
              <p className="small">Sesi server 30 hari (cookie httpOnly). Data tiap akun terpisah.</p>
            </div>
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Paket (draf — belum ada pembayaran aktif)</h3>
            <div className="grid g4">
              <div><b>Starter</b><div className="stat">Rp1 jt</div><p className="small">/bulan · 1 politisi, 1 dapil</p></div>
              <div><b>Pro</b><div className="stat">Rp1,7 jt</div><p className="small">/bulan · + Isu & Sentimen, Legislasi, Konsultan AI, laporan otomatis</p></div>
              <div><b>Timses / Partai</b><div className="stat">Rp5 jt</div><p className="small">/bulan · multi-user, multi-dapil</p></div>
              <div><b>Paket Kampanye</b><div className="stat">Rp15–50 jt</div><p className="small">per 3–6 bulan · monitoring intensif</p></div>
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
        <div><div style={{ fontSize: 22, fontWeight: 800 }}>Adapil.ai</div><div className="tagline">Setiap Aspirasi Warga Terjawab.</div></div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div><b>{profile?.name || user.name}</b> · {profile?.role || ""} {profile?.party ? `· ${profile.party}` : ""}</div>
          <div className="tagline">{profile?.dapilName || "Profil dapil belum diatur"} · Paket {plan}</div>
          <button className="btn-ghost" style={{ marginTop: 6, padding: "6px 12px" }} onClick={logout}>Keluar</button>
        </div>
      </header>
      <div className="wrap">
        <div className="tabs">
          {[["beranda", "Beranda"], ["profil", "Profil & Dapil"], ["aspirasi", `Aspirasi · ${unresolved.length} belum selesai`], ["isu", "Isu & Sentimen"], ["legislasi", "Legislasi"], ["konsultan", "Konsultan AI"], ["laporan", "Laporan"], ["paket", "Paket"]].map(([k, label]) => (
            <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>
        {msg && <p className="small">{msg}</p>}
        {tab === "beranda" && (
          <div className="grid">
            <IndonesiaMap compact />
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
        {tab === "aspirasi" && (
          <div className="grid">
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
              <p className="small">Tips: setelah menyimpan, tekan “AI” pada aspirasi untuk saran kategori, prioritas, dan draf balasan. Draf tetap harus diperiksa manusia sebelum dikirim.</p>
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
                      <button className="btn-ghost" style={{ padding: "6px 10px", marginRight: 4 }} onClick={() => setOpenAsp(a)}>Buka</button>
                      <button className="btn-ghost" style={{ padding: "6px 10px", marginRight: 4 }} onClick={async () => { try { const r = await api(`/api/aspirations/${a.id}/classify`, "POST"); await api(`/api/aspirations/${a.id}`, "PUT", { category: r.category, priority: r.priority, draftReply: r.draftReply }); setMsg(`AI (${r.engine}): kategori ${r.category}, prioritas ${r.priority}. Draf balasan tersimpan — periksa sebelum dikirim.`); loadAll(); } catch (err: any) { setMsg(err.message); } }}>AI</button>
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
                  <label className="small">Catatan tindak lanjut</label>
                  <textarea rows={2} value={openAsp.followUp} onChange={(e) => setOpenAsp({ ...openAsp, followUp: e.target.value })} />
                  <label className="small">Draf balasan (periksa sebelum dikirim)</label>
                  <textarea rows={3} value={openAsp.draftReply} onChange={(e) => setOpenAsp({ ...openAsp, draftReply: e.target.value })} />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button className="btn" onClick={async () => { await api(`/api/aspirations/${openAsp.id}`, "PUT", { status: openAsp.status, followUp: openAsp.followUp, draftReply: openAsp.draftReply }); setOpenAsp(null); setMsg("Aspirasi diperbarui."); loadAll(); }}>Simpan perubahan</button>
                    <button className="btn-ghost" onClick={() => setOpenAsp(null)}>Tutup</button>
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
                try { await api("/api/issues", "POST", iff); setIff({ title: "", platform: "TikTok", mentions: 0, samplePosts: "", isHoax: false }); setMsg("Isu tersimpan."); loadAll(); } catch (err: any) { setMsg(err.message); }
              }}>
                <input placeholder="Judul isu (mis. Keluhan jalan rusak Gerung viral)" value={iff.title} onChange={(e) => setIff({ ...iff, title: e.target.value })} />
                <div className="grid g2">
                  <select value={iff.platform} onChange={(e) => setIff({ ...iff, platform: e.target.value })}>{PLATFORMS.map((s) => <option key={s}>{s}</option>)}</select>
                  <input type="number" placeholder="Perkiraan jumlah unggahan" value={iff.mentions || ""} onChange={(e) => setIff({ ...iff, mentions: Number(e.target.value) })} />
                </div>
                <textarea rows={3} placeholder="Tempel contoh unggahan/komentar warga (satu per baris)…" value={iff.samplePosts} onChange={(e) => setIff({ ...iff, samplePosts: e.target.value })} />
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
                  <div className="small">~{i.mentions} unggahan · tren {i.trend} · tingkat {i.severity} · status {i.status}</div>
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
              <h3 style={{ marginTop: 0 }}>Konsultan AI</h3>
              <p className="small">Tanyakan apa pun soal dapil Anda — prioritas minggu ini, isu yang sedang naik, bahan reses atau rapat kerja. Jawaban dihitung dari aspirasi, isu, dan dokumen yang <b>Anda catat sendiri</b> di aplikasi ini. Konsultan ini <b>tidak</b> membaca media sosial live dan tidak bisa menjawab soal data yang belum Anda catat (misalnya isi APBD) — kalau datanya belum ada, ia akan bilang begitu, bukan mengarang. Keputusan tetap di tangan Anda.</p>
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
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Laporan Kinerja Mingguan (dari data Anda sendiri)</h3>
            <p>Periode: 7 hari terakhir · Dapil: {profile?.dapilName || "belum diatur"}</p>
            <div className="grid g3">
              <div><div className="stat">{aspirations.length}</div><div className="small">Total aspirasi tercatat</div></div>
              <div><div className="stat">{aspirations.filter((a) => a.status === "Selesai").length}</div><div className="small">Selesai</div></div>
              <div><div className="stat">{issues.length}</div><div className="small">Isu terpantau</div></div>
            </div>
            <h4>Per Kategori</h4>
            {Object.entries(byCat).map(([c, n]) => <p key={c}>{c}: <b>{n}</b> aspirasi</p>)}
            <h4>Isu Terpantau</h4>
            {issues.map((i) => <p key={i.id}>{i.title} — {i.platform}, negatif {i.negPct}%, tren {i.trend}, status {i.status}</p>)}
            {issues.length === 0 && <p className="small">Belum ada isu.</p>}
            <h4>Titik Buta</h4>
            <p>{evidence?.blindSpots.length ? evidence.blindSpots.join(", ") : "Tidak ada."}</p>
            <p className="small">Laporan ini dihitung dari data yang Anda catat di Adapil.ai. Semakin lengkap datanya, semakin bisa dipertanggungjawabkan laporannya.</p>
          </div>
        )}
        {tab === "paket" && (
          <div className="grid">
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Paket Adapil.ai (draf — belum ada pembayaran aktif)</h3>
              <p className="small">Checkout berlabel <b>SIMULASI</b> selama MIDTRANS_SERVER_KEY belum dipasang — tidak ada tagihan nyata. Pasang kunci Midtrans untuk transaksi Snap sungguhan.</p>
              <div className="grid g4">
                {(Object.entries({ starter: ["Starter", "Rp1.000.000/bulan", "1 politisi, 1 dapil, inbox aspirasi + peta isu dasar."], pro: ["Pro", "Rp1.700.000/bulan", "Starter + Isu & Sentimen, Asisten Legislasi, Konsultan AI, laporan otomatis."], timses: ["Timses / Partai", "Rp5.000.000/bulan", "Multi-user, multi-dapil, peta kampanye, manajemen relawan."], kampanye: ["Paket Kampanye", "Rp15–50 juta / 3–6 bulan", "Setup dapil, monitoring intensif, pendampingan tim."] }) as Array<[string, [string, string, string]]>).map(([k, [name, price, desc]]) => (
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

const ISLANDS = [
  { id: "sumatra", name: "Sumatra", d: "M70,110 C110,60 170,70 185,110 C200,150 170,210 130,240 C95,265 60,220 55,170 C52,140 55,125 70,110 Z", label: [118, 165], info: "Pulau Sumatra — aspirasi warga dari Aceh sampai Lampung masuk lewat kanal yang sama: WhatsApp, reses, dan DM." },
  { id: "jawa", name: "Jawa", d: "M300,300 C360,285 470,285 540,300 C560,312 540,328 480,330 C400,332 320,328 295,315 Z", label: [400, 275], info: "Pulau Jawa — pusat rapat kerja dan pembahasan anggaran. Bahan rapat yang baik selalu berangkat dari data dapil, bukan dari ingatan." },
  { id: "kalimantan", name: "Kalimantan", d: "M400,80 C470,50 560,70 580,130 C600,190 560,250 490,255 C420,260 370,210 375,150 C378,110 385,95 400,80 Z", label: [455, 165], info: "Pulau Kalimantan — dapil yang luas: satu aspirasi soal jalan atau air bersih bisa berarti perjalanan berjam-jam bagi warga." },
  { id: "sulawesi", name: "Sulawesi", d: "M620,110 C650,80 690,90 695,130 C700,160 680,180 700,210 C715,235 700,265 670,255 C640,245 630,210 635,180 C638,150 610,140 620,110 Z", label: [645, 165], info: "Pulau Sulawesi — isu yang viral di satu kabupaten bisa cepat menyebar ke kabupaten tetangga. Radar isu membantu merespons sebelum terlambat." },
  { id: "papua", name: "Papua", d: "M740,150 C800,120 870,140 880,180 C890,220 850,250 790,245 C740,240 710,200 720,170 C725,155 730,155 740,150 Z", label: [790, 200], info: "Pulau Papua — wilayah dengan jarak dan akses yang menantang. Mencatat aspirasi per wilayah membuat titik buta data terlihat jelas." },
  { id: "ntb", name: "NTB — fokus Adapil", d: "M545,338 C565,330 600,330 615,340 C620,348 600,355 575,354 C550,353 535,346 545,338 Z", label: [560, 322], info: "NTB — fokus Adapil saat ini: 60 dapil (DPR RI 2, DPRD Provinsi 8, DPRD kabupaten/kota 50), total 461 kursi. Klik pulau lain untuk melihat gambaran umum." },
];

/** Peta Indonesia stilasi (bukan peta geografis presisi) + elemen kerja politik.
 *  Pulau bisa diklik — NTB ditandai denyut amber karena di sanalah katalog dapil Adapil lengkap. */
function IndonesiaMap({ compact = false }: { compact?: boolean }) {
  const [sel, setSel] = useState("ntb");
  const active = ISLANDS.find((i) => i.id === sel) || ISLANDS[5];
  return (
    <div className="hero-map card fade-up" style={{ border: "none" }}>
      <h2 style={{ marginTop: 0 }}>{compact ? "Dapil Anda di Indonesia" : "Satu Peta, Semua Kerja Dapil"}</h2>
      {!compact && <p style={{ opacity: .9, marginTop: 4 }}>Klik sebuah pulau untuk melihat gambaran kerjanya. Denyut amber menandai <b>NTB</b> — wilayah fokus Adapil saat ini.</p>}
      <div className="map-wrap">
        <svg viewBox="0 0 900 380" role="img" aria-label="Peta stilasi Indonesia — klik pulau untuk detail">
          <path className="dash-line" d="M580,344 C520,300 460,320 400,315" />
          <path className="dash-line" d="M580,344 C640,300 700,260 760,220" />
          <path className="dash-line" d="M580,344 C500,260 460,220 460,170" />
          {ISLANDS.map((is) => (
            <path key={is.id} className={`island${sel === is.id ? " on" : ""}`} d={is.d} onClick={() => setSel(is.id)}>
              <title>{is.name} — klik untuk detail</title>
            </path>
          ))}
          {ISLANDS.map((is) => (
            <text key={`l-${is.id}`} x={is.label[0]} y={is.label[1]} textAnchor="middle" className={is.id === "ntb" ? "island-label-amber" : "island-label"}>{is.name}</text>
          ))}
          <circle cx="580" cy="344" r="7" fill="#e8930c" />
          <circle className="pulse-ring" cx="580" cy="344" r="10" />
          <circle className="pulse-ring r2" cx="580" cy="344" r="10" />
          <circle cx="180" cy="120" r="4" fill="#ffd28a" />
          <circle cx="700" cy="130" r="4" fill="#ffd28a" />
          <circle cx="830" cy="180" r="4" fill="#ffd28a" />
        </svg>
        {!compact && (
          <>
            <div className="float-chip" style={{ top: "6%", left: "4%", animationDelay: "0s" }}>✦ Aspirasi Warga</div>
            <div className="float-chip" style={{ top: "12%", right: "5%", animationDelay: "1.2s" }}>✦ Reses</div>
            <div className="float-chip" style={{ bottom: "18%", left: "8%", animationDelay: "2s" }}>✦ Pokir</div>
            <div className="float-chip" style={{ bottom: "8%", right: "8%", animationDelay: ".6s" }}>✦ Rapat Kerja</div>
          </>
        )}
      </div>
      {!compact && (
        <>
          <div className="map-info"><b>{active.name}.</b> {active.info}</div>
          <div className="work-strip" aria-hidden="true">
            <span><b>Reses</b> · Pokir · Rapat Kerja · Pengawasan · APBD · Aspirasi Warga · Klarifikasi Hoaks · Laporan Kinerja ·&nbsp;</span>
            <span><b>Reses</b> · Pokir · Rapat Kerja · Pengawasan · APBD · Aspirasi Warga · Klarifikasi Hoaks · Laporan Kinerja ·&nbsp;</span>
          </div>
          <p className="small" style={{ color: "#cfe0ff", marginBottom: 0 }}>Peta di atas adalah stilasi (bentuk pulau disederhanakan), bukan peta geografis presisi. Data dapil lengkap tersedia untuk NTB.</p>
        </>
      )}
    </div>
  );
}

function ProfileTab({ pf, setPf, onSaved, setMsg }: { pf: Profile; setPf: (p: Profile) => void; onSaved: (p: Profile) => void; setMsg: (s: string) => void }) {
  const [dapils, setDapils] = useState<any[]>([]);
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
        <button className="btn-amber" type="submit">Simpan profil</button>
      </form>
      <p className="small">Katalog dapil: DPR RI NTB I (3 kursi) &amp; NTB II (8 kursi); DPRD Provinsi NTB 1–8 (65 kursi); DPRD 10 kabupaten/kota NTB (50 dapil, 385 kursi).</p>
    </div>
  );
}
