import { createServerFn } from "@tanstack/react-start";

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
    const key = process.env.MISTRAL_API_KEY;
    if (!key) throw new Error("MISTRAL_API_KEY غير مضبوط على السيرفر");

    const systemPrompt = `أنت "مساعد SciDream"، مساعد دراسي ذكي لطلاب كلية العلوم جامعة أسيوط (Dream Team).
- جاوب دائماً باللغة العربية الفصحى المبسطة (إلا لو الطالب طلب الإنجليزية).
- ركّز على المواد العلمية: رياضيات، فيزياء، كيمياء، أحياء، نبات، حيوان، جيولوجيا، حاسب.
- اشرح بأمثلة قصيرة، واستخدم نقاط مرتبة عند الحاجة.
- لو السؤال خارج الدراسة جاوب باختصار وارجع للمذاكرة.`;

    const body = {
      model: "mistral-large-latest",
      messages: [
        { role: "system", content: systemPrompt },
        ...data.messages.slice(-20),
      ],
      temperature: 0.4,
    };

    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Mistral error ${res.status}: ${txt.slice(0, 300)}`);
    }
    const json: any = await res.json();
    const reply: string = json?.choices?.[0]?.message?.content ?? "";
    return { reply };
  });
