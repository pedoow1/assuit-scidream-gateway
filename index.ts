import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: u } = await supa.auth.getUser();
    if (!u?.user) return json({ error: 'سجّل دخول الأول' }, 401);

    const key = Deno.env.get('AI_API_KEY');
    if (!key) return json({ error: 'AI_API_KEY مش مضبوط في Secrets' }, 500);
    const base = (Deno.env.get('AI_BASE_URL') || 'https://openrouter.ai/api/v1').replace(/\/$/, '');
    const model = Deno.env.get('AI_MODEL') || 'google/gemini-2.0-flash-001';

    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) return json({ error: 'messages مطلوبة' }, 400);
    const clean = messages
      .filter((m: any) => m && ['system', 'user', 'assistant'].includes(m.role) && typeof m.content === 'string')
      .slice(-22)
      .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 60000) }));

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 45000);
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': 'https://assuit-scidream.app',
        'X-Title': 'Assuit SciDream',
      },
      body: JSON.stringify({ model, temperature: 0.4, messages: clean }),
      signal: ctrl.signal,
    }).finally(() => clearTimeout(t));

    const raw = await res.text();
    if (!res.ok) return json({ error: `AI ${res.status}: ${raw.slice(0, 300)}` }, 502);
    const reply = JSON.parse(raw)?.choices?.[0]?.message?.content ?? '';
    return json({ reply });
  } catch (e: any) {
    return json({ error: e?.name === 'AbortError' ? 'المساعد ماردش في الوقت المناسب' : (e?.message ?? 'خطأ') }, 500);
  }
});