import { NextResponse } from "next/server";
import { groqChat } from "@/lib/ai/groq";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const LANGS: Record<string, string> = { hi: "Hindi", gu: "Gujarati" };

export async function POST(req: Request) {
  const { text, lang } = await req.json();
  const language = LANGS[lang as string];
  if (!text || !language) return NextResponse.json({ error: "Missing text/lang" }, { status: 400 });

  const ai = await groqChat(
    [
      {
        role: "system",
        content: `You are a professional translator. Translate the user's business/sales text into ${language}. Keep numbers, currency (₹), %, and company names unchanged. Return ONLY the translated text, no preamble or notes.`,
      },
      { role: "user", content: text },
    ],
    { temperature: 0.2, maxTokens: 700 }
  );

  return NextResponse.json({ text: ai ?? text, fallback: !ai });
}
