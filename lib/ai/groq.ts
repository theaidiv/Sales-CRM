import OpenAI from "openai";

const apiKey = process.env.GROQ_API_KEY;
const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const baseURL = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";

export const aiEnabled = Boolean(apiKey);

let client: OpenAI | null = null;
function getClient(): OpenAI | null {
  if (!apiKey) return null;
  if (!client) client = new OpenAI({ apiKey, baseURL });
  return client;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Call Groq's chat completions. Returns null on any failure so callers can fall
 * back to deterministic output — a live demo must never hard-fail on the AI.
 */
export async function groqChat(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<string | null> {
  const c = getClient();
  if (!c) return null;
  try {
    const res = await c.chat.completions.create({
      model,
      messages,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 700,
    });
    return res.choices[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error("[groq] chat failed, falling back:", (err as Error).message);
    return null;
  }
}
