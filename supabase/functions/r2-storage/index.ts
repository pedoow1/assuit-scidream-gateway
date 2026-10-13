// Supabase Edge Function: r2-storage
// Secrets required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
//                   R2_BUCKET_PRIVATE, R2_BUCKET_PUBLIC, R2_PUBLIC_BASE_URL
// (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected automatically)
//
// Actions: upload | sign | delete | delete-group | list-courses
import { createClient } from "npm:@supabase/supabase-js@2";
import { AwsClient } from "npm:aws4fetch@1.0.20";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const env = (k: string) => {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`Missing secret ${k}`);
  return v;
};

type Kind =
  | "avatar" | "group-avatar" | "announcement"            // public bucket
  | "id-card" | "receipt" | "subject-file" | "course-file" // private bucket
  | "group-media" | "dm-media";                            // private bucket (chat)

const PUBLIC_KINDS: Kind[] = ["avatar", "group-avatar", "announcement"];
const MB = 1024 * 1024;
const MAX_SIZE: Record<Kind, number> = {
  "avatar": 8 * MB, "group-avatar": 8 * MB, "announcement": 15 * MB,
  "id-card": 10 * MB, "receipt": 15 * MB,
  "subject-file": 100 * MB, "course-file": 200 * MB,
  "group-media": 200 * MB, "dm-media": 200 * MB,
};
const KINDS = Object.keys(MAX_SIZE) as Kind[];
const TTL = 3600;

const ACCOUNT = () => env("R2_ACCOUNT_ID");
const PRIVATE = () => env("R2_BUCKET_PRIVATE");
const PUBLIC = () => env("R2_BUCKET_PUBLIC");
const PUBLIC_BASE = () => env("R2_PUBLIC_BASE_URL").replace(/\/+$/, "");

const enc = (key: string) => key.split("/").map(encodeURIComponent).join("/");
const url = (bucket: string, key: string) => `https://${ACCOUNT()}.r2.cloudflarestorage.com/${bucket}/${enc(key)}`;

function safeName(name: string) {
  // keep Arabic/unicode, drop only characters that are unsafe in keys/URLs
  const clean = (name || "file").replace(/[\\/\u0000-\u001f?#%]+/g, "_").trim();
  return clean.slice(-120) || "file";
}

function newKey(kind: Kind, scope: string, filename: string) {
  const name = safeName(filename);
  if (kind === "course-file") return `course-file/all/${Date.now()}_${name}`; // courses page strips "<digits>_"
  return `${kind}/${scope}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${name}`;
}

function parseKey(key: string): { kind: Kind; scope: string } | null {
  if (key.includes("..")) return null;
  const [kind, scope] = key.split("/");
  if (!kind || !scope || !KINDS.includes(kind as Kind)) return null;
  return { kind: kind as Kind, scope };
}

const presign = async (r2: AwsClient, method: string, u: string) =>
  (await r2.sign(`${u}?X-Amz-Expires=${TTL}`, { method, aws: { signQuery: true } })).url;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const supa = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: u } = await supa.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return json({ error: "سجّل دخول الأول" }, 401);

    const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false },
    });
    const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", uid);
    const roles = new Set((roleRows ?? []).map((r: { role: string }) => r.role));
    const isAdmin = roles.has("admin") || roles.has("super_admin");
    const isStaff = isAdmin || roles.has("instructor") || roles.has("department_advisor");

    const r2 = new AwsClient({
      accessKeyId: env("R2_ACCESS_KEY_ID"),
      secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
      service: "s3",
      region: "auto",
    });

    /** who may write this kind into this scope */
    const canWrite = (kind: Kind, scope: string) => {
      switch (kind) {
        case "avatar": case "id-card": case "receipt": return scope === uid || isAdmin;
        case "announcement": case "course-file": return isAdmin;
        case "subject-file": return isStaff;
        default: return true; // group-avatar, group-media, dm-media: any signed-in user (DB RLS guards the row)
      }
    };
    /** who may read / delete an existing key */
    const canRead = (kind: Kind, scope: string) =>
      kind === "id-card" || kind === "receipt" ? scope === uid || isStaff : true;
    const canDelete = (kind: Kind, scope: string) => {
      if (kind === "id-card" || kind === "receipt" || kind === "avatar") return scope === uid || isAdmin;
      if (kind === "announcement" || kind === "course-file") return isAdmin;
      if (kind === "subject-file") return isStaff;
      return true;
    };

    const body = await req.json();
    const action = body?.action;

    // ---------- upload ----------
    if (action === "upload") {
      const kind = body.kind as Kind;
      const scope = String(body.scope_id ?? "");
      if (!KINDS.includes(kind)) return json({ error: "نوع ملف غير مدعوم" }, 400);
      if (!scope || scope.includes("/")) return json({ error: "scope_id غير صالح" }, 400);
      if (!canWrite(kind, scope)) return json({ error: "مش مسموح ترفع هنا" }, 403);
      const size = Number(body.size ?? 0);
      if (size > MAX_SIZE[kind]) return json({ error: `الحجم أكبر من المسموح (${MAX_SIZE[kind] / MB}MB)` }, 413);

      const key = newKey(kind, scope, String(body.filename ?? "file"));
      const isPub = PUBLIC_KINDS.includes(kind);
      const uploadUrl = await presign(r2, "PUT", url(isPub ? PUBLIC() : PRIVATE(), key));
      const ref = isPub ? `${PUBLIC_BASE()}/${enc(key)}` : `r2://${key}`;
      return json({ uploadUrl, ref });
    }

    // ---------- sign (private refs -> short-lived GET urls) ----------
    if (action === "sign") {
      const refs: string[] = Array.isArray(body.refs) ? body.refs.slice(0, 100) : [];
      const urls: Record<string, string> = {};
      for (const ref of refs) {
        if (typeof ref !== "string" || !ref.startsWith("r2://")) continue;
        const key = ref.slice(5);
        const p = parseKey(key);
        if (!p || PUBLIC_KINDS.includes(p.kind) || !canRead(p.kind, p.scope)) continue;
        urls[ref] = await presign(r2, "GET", url(PRIVATE(), key));
      }
      return json({ urls, ttl: TTL });
    }

    // ---------- delete ----------
    if (action === "delete") {
      const refs: string[] = Array.isArray(body.refs) ? body.refs.slice(0, 100) : [];
      for (const ref of refs) {
        if (typeof ref !== "string") continue;
        let bucket: string, key: string;
        if (ref.startsWith("r2://")) { bucket = PRIVATE(); key = ref.slice(5); }
        else if (ref.startsWith(PUBLIC_BASE() + "/")) { bucket = PUBLIC(); key = decodeURIComponent(ref.slice(PUBLIC_BASE().length + 1)); }
        else continue;
        const p = parseKey(key);
        if (!p || !canDelete(p.kind, p.scope)) continue;
        await r2.fetch(url(bucket, key), { method: "DELETE" });
      }
      return json({ ok: true });
    }

    // ---------- delete-group (super_admin only: wipes all chat media of a group) ----------
    if (action === "delete-group") {
      if (!roles.has("super_admin")) return json({ error: "مش مسموح" }, 403);
      const gid = String(body.group_id ?? "");
      if (!gid || gid.includes("/")) return json({ error: "group_id غير صالح" }, 400);
      for (const [bucket, prefix] of [[PRIVATE(), `group-media/${gid}/`], [PUBLIC(), `group-avatar/${gid}/`]] as const) {
        for (const key of await listKeys(r2, bucket, prefix)) await r2.fetch(url(bucket, key), { method: "DELETE" });
      }
      return json({ ok: true });
    }

    // ---------- list-courses ----------
    if (action === "list-courses") {
      const items = await listKeys(r2, PRIVATE(), "course-file/all/", true);
      return json({ files: items });
    }

    return json({ error: "action غير معروف" }, 400);
  } catch (e) {
    return json({ error: (e as Error)?.message ?? "خطأ" }, 500);
  }
});

/** ListObjectsV2 (paginated). withMeta=true returns {key,size,last_modified}. */
async function listKeys(r2: AwsClient, bucket: string, prefix: string): Promise<string[]>;
async function listKeys(r2: AwsClient, bucket: string, prefix: string, withMeta: true): Promise<{ key: string; size: number; last_modified: string }[]>;
async function listKeys(r2: AwsClient, bucket: string, prefix: string, withMeta = false): Promise<any[]> {
  const out: any[] = [];
  let token: string | undefined;
  do {
    const q = new URLSearchParams({ "list-type": "2", prefix, "max-keys": "1000" });
    if (token) q.set("continuation-token", token);
    const res = await r2.fetch(`https://${ACCOUNT()}.r2.cloudflarestorage.com/${bucket}?${q}`);
    if (!res.ok) throw new Error(`R2 list ${res.status}`);
    const xml = await res.text();
    for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      const c = m[1];
      const key = decodeXml(c.match(/<Key>([\s\S]*?)<\/Key>/)?.[1] ?? "");
      if (!key || key.endsWith("/")) continue;
      out.push(withMeta
        ? { key, size: Number(c.match(/<Size>(\d+)<\/Size>/)?.[1] ?? 0), last_modified: c.match(/<LastModified>(.*?)<\/LastModified>/)?.[1] ?? "" }
        : key);
    }
    token = xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/)?.[1];
    if (token) token = decodeXml(token);
  } while (token);
  return out;
}
const decodeXml = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
