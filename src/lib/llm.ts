// Lapisan LLM Adapil — provider-agnostik: OpenAI ATAU Gemini.
// "Tinggal dihubungkan": pasang SALAH SATU kunci di Vercel (Environment Variables),
// tanpa mengubah kode apa pun. Tanpa kunci, semua fitur jalan rule-based.
//
//   OPENAI_API_KEY=sk-...          → provider "openai"  (gpt-4o-mini)
//   GEMINI_API_KEY=AIza...         → provider "gemini"  (gemini-2.0-flash)
//   LLM_PROVIDER=openai|gemini    → paksa salah satu bila kedua kunci dipasang
//                                    (default: auto — OpenAI dulu, lalu Gemini)
//
// Aturan jujur yang berlaku untuk SEMUA provider: LLM tidak pernah mengarang
// angka — ia hanya merapikan bahasa / mengekstrak dari teks yang diberi, dan
// semua angka di jawaban berasal dari bukti server. Tanpa kunci, pemanggil
// memakai mesin rule-based di src/lib/ai.ts.

export type LlmProvider = "openai" | "gemini";

export function getLlmProvider(): LlmProvider | null {
  const forced = (process.env.LLM_PROVIDER || "").toLowerCase();
  if (forced === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (forced === "gemini" && process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return null;
}

export function llmProviderName(): string {
  return getLlmProvider() || "rule-based";
}

export type LlmReply = { text: string; provider: LlmProvider };

async function callOpenAIChat(system: string, userText: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: system }, { role: "user", content: userText }],
        temperature: 0.3,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

async function callGeminiChat(system: string, userText: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: userText }] }],
          generationConfig: { temperature: 0.3 },
        }),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    return parts.map((p: any) => p.text || "").join("") || null;
  } catch {
    return null;
  }
}

/** Chat LLM satu giliran. Null bila tidak ada kunci (pemanggil pakai rule-based). */
export async function llmChat(system: string, userText: string): Promise<LlmReply | null> {
  const provider = getLlmProvider();
  if (!provider) return null;
  const text = provider === "openai" ? await callOpenAIChat(system, userText) : await callGeminiChat(system, userText);
  return text ? { text, provider } : null;
}

// ------------------------------------------------------- function calling agen
export type ToolDef = { name: string; description: string; parameters: Record<string, unknown> };
export type ToolCallTrace = { name: string; args: Record<string, unknown>; result: string };

async function openaiToolsLoop(
  system: string,
  userText: string,
  tools: ToolDef[],
  exec: (name: string, args: Record<string, any>) => Promise<{ summary: string }>,
): Promise<{ finalText: string | null; calls: ToolCallTrace[] }> {
  const key = process.env.OPENAI_API_KEY!;
  const calls: ToolCallTrace[] = [];
  let messages: any[] = [
    { role: "system", content: system },
    { role: "user", content: userText },
  ];
  for (let round = 0; round < 4; round++) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages,
        tools: tools.map((d) => ({ type: "function", function: d })),
        tool_choice: "auto",
      }),
    });
    if (!res.ok) return { finalText: null, calls };
    const data = await res.json();
    const msg = data?.choices?.[0]?.message;
    if (!msg) return { finalText: null, calls };
    if (!msg.tool_calls?.length) return { finalText: msg.content || null, calls };
    messages.push(msg);
    for (const tc of msg.tool_calls) {
      let args: Record<string, any> = {};
      try { args = JSON.parse(tc.function.arguments || "{}"); } catch { args = {}; }
      const r = await exec(tc.function.name, args);
      calls.push({ name: tc.function.name, args, result: r.summary });
      messages.push({ role: "tool", tool_call_id: tc.id, content: r.summary });
    }
  }
  return { finalText: null, calls };
}

async function geminiToolsLoop(
  system: string,
  userText: string,
  tools: ToolDef[],
  exec: (name: string, args: Record<string, any>) => Promise<{ summary: string }>,
): Promise<{ finalText: string | null; calls: ToolCallTrace[] }> {
  const key = process.env.GEMINI_API_KEY!;
  const calls: ToolCallTrace[] = [];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
  let contents: any[] = [{ role: "user", parts: [{ text: userText }] }];
  const toolPayload = [{ functionDeclarations: tools.map((d) => ({ name: d.name, description: d.description, parameters: d.parameters })) }];
  for (let round = 0; round < 4; round++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents,
        tools: toolPayload,
        generationConfig: { temperature: 0.2 },
      }),
    });
    if (!res.ok) return { finalText: null, calls };
    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const fnCalls = parts.filter((p: any) => p.functionCall);
    if (!fnCalls.length) {
      return { finalText: parts.map((p: any) => p.text || "").join("") || null, calls };
    }
    contents.push({ role: "model", parts });
    const responseParts: any[] = [];
    for (const p of fnCalls) {
      const fc = p.functionCall;
      const args = (fc.args || {}) as Record<string, any>;
      const r = await exec(fc.name, args);
      calls.push({ name: fc.name, args, result: r.summary });
      responseParts.push({ functionResponse: { name: fc.name, response: { result: r.summary } } });
    }
    contents.push({ role: "function", parts: responseParts });
  }
  return { finalText: null, calls };
}

/**
 * Loop function calling agen dengan provider yang terpasang.
 * Mengembalikan null bila tidak ada kunci — pemanggil lalu memakai
 * perencana rule-based di src/lib/agent.ts.
 */
export async function llmChatWithTools(
  system: string,
  userText: string,
  tools: ToolDef[],
  exec: (name: string, args: Record<string, any>) => Promise<{ summary: string }>,
): Promise<{ finalText: string | null; provider: LlmProvider; calls: ToolCallTrace[] } | null> {
  const provider = getLlmProvider();
  if (!provider) return null;
  try {
    const r = provider === "openai"
      ? await openaiToolsLoop(system, userText, tools, exec)
      : await geminiToolsLoop(system, userText, tools, exec);
    return { ...r, provider };
  } catch {
    return null;
  }
}
