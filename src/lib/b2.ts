import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Drop-in replacement: same exports as the old Backblaze helper, but new uploads go to
// Cloudflare R2 through the `r2-storage` edge function. Old `b2://` refs still resolve
// through the legacy `b2-storage` function until they are migrated.
export type B2Kind = "group-media" | "dm-media";
const R2 = "r2://";
const B2 = "b2://";
const fnFor = (ref: string) => (ref.startsWith(B2) ? "b2-storage" : "r2-storage");

/** Upload straight to R2 via a presigned PUT. Returns the ref to store in media_url. */
export async function uploadToB2(kind: B2Kind, scopeId: string, file: File): Promise<{ ref: string }> {
  const { data, error } = await supabase.functions.invoke("r2-storage", {
    body: { action: "upload", kind, scope_id: scopeId, filename: file.name, size: file.size },
  });
  if (error || !data?.uploadUrl) {
    let msg = error?.message ?? "تعذّر بدء الرفع";
    try {
      const j = await (error as any)?.context?.json?.();
      if (j?.error) msg = j.error;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  const put = await fetch(data.uploadUrl, {
    method: "PUT",
    body: file,
    headers: file.type ? { "Content-Type": file.type } : undefined,
  });
  if (!put.ok) throw new Error(`فشل الرفع (${put.status})`);
  return { ref: data.ref };
}

export async function deleteFromB2(refs: string[]) {
  const r2 = refs.filter((r) => r.startsWith(R2));
  const b2 = refs.filter((r) => r.startsWith(B2));
  if (r2.length) await supabase.functions.invoke("r2-storage", { body: { action: "delete", refs: r2 } });
  if (b2.length) {
    try { await supabase.functions.invoke("b2-storage", { body: { action: "delete", refs: b2 } }); } catch { /* legacy */ }
  }
}
export async function deleteGroupFromB2(groupId: string) {
  await supabase.functions.invoke("r2-storage", { body: { action: "delete-group", group_id: groupId } });
  try { await supabase.functions.invoke("b2-storage", { body: { action: "delete-group", group_id: groupId } }); } catch { /* legacy */ }
}

// ---------- display: ref -> short-lived signed URL (batched + cached) ----------
const cache = new Map<string, { url: string; exp: number }>();
const queued = new Set<string>();
const inflight = new Map<string, number>(); // ref -> time requested (retry after 30s if it failed)
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;

async function flush() {
  const refs = [...queued];
  queued.clear();
  for (let i = 0; i < refs.length; i += 100) {
    const chunk = refs.slice(i, i + 100);
    for (const fn of ["r2-storage", "b2-storage"]) {
      const part = chunk.filter((r) => fnFor(r) === fn);
      if (!part.length) continue;
      const { data, error } = await supabase.functions.invoke(fn, { body: { action: "sign", refs: part } });
      part.forEach((r) => inflight.set(r, Date.now()));
      if (!error && data?.urls) {
        for (const [r, url] of Object.entries(data.urls as Record<string, string>)) {
          cache.set(r, { url, exp: Date.now() + (Number(data.ttl ?? 3600) - 300) * 1000 });
          inflight.delete(r);
        }
        listeners.forEach((l) => l());
      }
    }
  }
}

/** Sync resolver for render code. Old Supabase URLs pass through; r2:// and b2:// refs become signed URLs. */
export function mu(url?: string | null): string {
  if (!url) return "";
  if (!url.startsWith(R2) && !url.startsWith(B2)) return url;
  const hit = cache.get(url);
  if (hit && hit.exp > Date.now()) return hit.url;
  const last = inflight.get(url);
  if (!queued.has(url) && (!last || Date.now() - last > 30_000)) {
    queued.add(url);
    inflight.set(url, Date.now());
    clearTimeout(timer);
    timer = setTimeout(flush, 30);
  }
  return hit?.url ?? "";
}

/** Call once at the top of any component that renders media so it re-renders when URLs arrive. */
export function useB2Urls() {
  const [, set] = useState(0);
  useEffect(() => {
    const l = () => set((v) => v + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
}
