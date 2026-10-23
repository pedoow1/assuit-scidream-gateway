// Types only. The assistant now talks to the Supabase Edge Function "assistant-chat"
// directly from src/routes/assistant.tsx (no server function / Vercel env key needed).
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}
