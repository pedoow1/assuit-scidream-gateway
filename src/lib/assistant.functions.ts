import { createServerFn } from "@tanstack/react-start";
import { buildSystemPrompt } from "./college-knowledge";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export const chatWithAssistant = createServerFn({ method: "POST" })
  .validator((input: { messages: ChatMessage[] }) => {
    if (!input?.messages || !Array.isArray(input.messages)) {
      throw new Error("messages is required");
    }
    return input;
  })
  .handler(async ({ data }) => {
    // Mistral only (same provider as the app). AI_BASE_URL / AI_MODEL are deliberately ignored
    // so leftover OpenRouter/Gemini values from the Edge Function setup can't hijack the website.
    // Key: MISTRAL_API_KEY first; AI_API_KEY is accepted only if it isn't an OpenRouter key.
    const legacyKey = process.env.AI_API_KEY;
    const key =
      process.env.MISTRAL_API_KEY || (legacyKey && !legacyKey.startsWith("sk-or-") ? legacyKey : undefined);
    if (!key) throw new Error("MISTRAL_API_KEY غير مضبوط على السيرفر (Vercel ← Environment Variables)");
    const baseUrl = "https://api.mistral.ai/v1";

    const systemPrompt = buildSystemPrompt(
      data.messages.filter((m) => m.role === "user").map((m) => m.content),
    );

    const body = {
      model: process.env.MISTRAL_MODEL || "mistral-small-latest",
      messages: [
        { role: "system", content: systemPrompt },
        ...data.messages.slice(-20),
      ],
      temperature: 0.4,
    };

    // Don't let a stuck/slow upstream call hang the request forever — cap it
    // at 25s so the client always gets *something* back instead of an
    // endless spinner if the AI provider is unreachable or slow.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);

    let res: Response;
    try {
      res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (e: any) {
      if (e?.name === "AbortError") {
        throw new Error("المساعد ماردش في الوقت المناسب — حاول تاني");
      }
      throw new Error(`تعذر الاتصال بالمساعد: ${e?.message ?? "network error"}`);
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 401) {
        throw new Error("مفتاح Mistral غلط أو منتهي — راجع MISTRAL_API_KEY في Vercel");
      }
      throw new Error(`Mistral error ${res.status}: ${txt.slice(0, 300)}`);
    }
    const raw = await res.text();
    let json: any;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new Error(
        `رد المزوّد مش JSON (status ${res.status}, type ${res.headers.get("content-type")}): ${raw.slice(0, 200)}`,
      );
    }
    const reply: string = json?.choices?.[0]?.message?.content ?? "";
    return { reply };
  });
