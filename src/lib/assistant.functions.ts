import { createServerFn } from "@tanstack/react-start";
import { buildSystemPrompt } from "./college-knowledge";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export const chatWithAssistant = createServerFn({ method: "POST" })
  .inputValidator((input: { messages: ChatMessage[] }) => {
    if (!input?.messages || !Array.isArray(input.messages)) {
      throw new Error("messages is required");
    }
    return input;
  })
  .handler(async ({ data }) => {
    // Any OpenAI-compatible provider works: set AI_API_KEY (+ optionally AI_BASE_URL / AI_MODEL).
    // Falls back to MISTRAL_API_KEY so the old setup keeps working.
    const key = process.env.AI_API_KEY || process.env.MISTRAL_API_KEY;
    if (!key) throw new Error("AI_API_KEY غير مضبوط على السيرفر");
    const baseUrl = (process.env.AI_BASE_URL || "https://api.mistral.ai/v1").replace(/\/$/, "");

    const systemPrompt = buildSystemPrompt(
      data.messages.filter((m) => m.role === "user").map((m) => m.content),
    );

    const body = {
      model: process.env.AI_MODEL || "ministral-14b-2512",
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
      throw new Error(`AI provider error ${res.status}: ${txt.slice(0, 300)}`);
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
