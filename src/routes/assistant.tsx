import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles, ArrowRight, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { StarsBackground } from "@/components/IntroSequence";
import { chatWithAssistant, type ChatMessage } from "@/lib/assistant.functions";

export const Route = createFileRoute("/assistant")({
  head: () => ({ meta: [{ title: "المساعد الذكي — Assuit SciDream" }] }),
  component: AssistantPage,
});

function AssistantPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const chat = useServerFn(chatWithAssistant);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const { reply } = await chat({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: reply || "..." }]);
    } catch (e: any) {
      setError(e?.message ?? "حصل خطأ");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="relative min-h-screen" dir="rtl">
      <StarsBackground />
      <main className="relative z-10 mx-auto flex h-screen max-w-3xl flex-col px-4 py-6">
        <header className="mb-4 flex items-center justify-between">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-accent">
            <ArrowRight className="h-4 w-4" /> الرئيسية
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <h1 className="font-display text-lg">المساعد الذكي</h1>
          </div>
          <button
            onClick={() => setMessages([])}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs hover:border-accent"
          >
            <Trash2 className="h-3 w-3" /> مسح
          </button>
        </header>

        <div ref={scrollRef} className="cosmic-card flex-1 overflow-y-auto rounded-3xl p-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <Sparkles className="mb-3 h-10 w-10 text-accent" />
              <p className="text-sm">اسألني عن أي مادة، اشرح مسألة، أو لخّص لك موضوع.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-gradient-cosmic text-primary-foreground"
                    : "border border-border bg-background/60"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-end">
              <div className="rounded-2xl border border-border bg-background/60 px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
              </div>
            </div>
          )}
          {error && <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">{error}</div>}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); void send(); }}
          className="mt-3 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اكتب سؤالك..."
            className="flex-1 rounded-full border border-border bg-background/60 px-4 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex items-center gap-1 rounded-full bg-gradient-cosmic px-5 py-2 text-sm font-semibold text-primary-foreground shadow-rose disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> إرسال
          </button>
        </form>
      </main>
    </div>
  );
}
