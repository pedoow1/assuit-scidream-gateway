import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Lock, UploadCloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// New tables/RPCs are not in the generated types yet.
const db = supabase as any;

type Rank = "student" | "assistant" | "doctor" | "admin";
type Perm = { can_speak: boolean; can_upload: boolean };

// rank power: admin 2 > doctor = assistant 1 > student 0
// myPower   : big boss 4 > site admin 3 > group admin 2
const RANKS: { key: Rank; label: string; power: number }[] = [
  { key: "student", label: "الطلبة العاديين", power: 0 },
  { key: "assistant", label: "المعيدين", power: 1 },
  { key: "doctor", label: "الدكاترة / المشرفين الأكاديميين", power: 1 },
  { key: "admin", label: "أدمنز الجروب", power: 2 },
];

const ERRORS: Record<string, string> = {
  FORBIDDEN_RANK: "مينفعش تغيّر صلاحيات رتبة في مستواك أو أعلى منه",
  FORBIDDEN: "مالكش صلاحية للعملية دي",
};
function friendly(msg: string) {
  for (const [k, v] of Object.entries(ERRORS)) if (msg.includes(k)) return v;
  return msg;
}

export function GroupPermissionsPanel({
  group,
  myPower,
  onGroupUpdated,
}: {
  group: { id: string; allow_uploads?: boolean };
  myPower: number;
  onGroupUpdated: (g: any) => void;
}) {
  const [allowUploads, setAllowUploads] = useState<boolean>(group.allow_uploads !== false);
  const [perms, setPerms] = useState<Record<string, Perm>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await db
        .from("group_rank_perms")
        .select("rank, can_speak, can_upload")
        .eq("group_id", group.id);
      if (cancelled) return;
      if (error) toast.error(error.message);
      const map: Record<string, Perm> = {};
      ((data ?? []) as any[]).forEach((r) => {
        map[r.rank] = { can_speak: r.can_speak, can_upload: r.can_upload };
      });
      setPerms(map);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [group.id]);

  async function toggleGroupUploads() {
    const next = !allowUploads;
    setBusy("group");
    const { error } = await db.rpc("group_set_uploads", { p_group: group.id, p_allow: next });
    setBusy(null);
    if (error) return toast.error(friendly(error.message));
    setAllowUploads(next);
    onGroupUpdated({ ...group, allow_uploads: next });
    toast.success(next ? "رفع الملفات اتفتح للجروب" : "رفع الملفات اتقفل للجروب");
  }

  async function toggleRank(rank: Rank, field: keyof Perm) {
    const cur = perms[rank] ?? { can_speak: true, can_upload: true };
    const next = { ...cur, [field]: !cur[field] };
    setBusy(`${rank}:${field}`);
    const { error } = await db.rpc("group_set_rank_perm", {
      p_group: group.id,
      p_rank: rank,
      p_can_speak: next.can_speak,
      p_can_upload: next.can_upload,
    });
    setBusy(null);
    if (error) return toast.error(friendly(error.message));
    setPerms((p) => ({ ...p, [rank]: next }));
  }

  return (
    <div className="max-h-[70vh] space-y-4 overflow-y-auto pl-1">
      <button
        onClick={toggleGroupUploads}
        disabled={busy === "group"}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-background/40 px-4 py-3 text-sm disabled:opacity-60"
      >
        <span className="flex items-center gap-2">
          <UploadCloud className="h-4 w-4 text-accent" /> رفع الملفات في الجروب ده
        </span>
        <Chip on={allowUploads} />
      </button>
      <p className="text-[11px] text-foreground/60">
        لو اتقفل، محدش من الرتب يقدر يرفع ملفات (غير أدمنز الموقع). ولو رفع الملفات مقفول من الإدارة العامة،
        الإعداد ده مش هيفتحه.
      </p>

      <div className="border-t border-border/50 pt-3 text-xs text-foreground/70">صلاحيات كل رتبة</div>

      {loading ? (
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-accent" />
      ) : (
        <ul className="space-y-2">
          {RANKS.map((r) => {
            const p = perms[r.key] ?? { can_speak: true, can_upload: true };
            const editable = myPower > r.power;
            return (
              <li key={r.key} className="rounded-xl border border-border/60 bg-card/40 p-3">
                <div className="mb-2 flex items-center justify-between text-sm font-medium">
                  {r.label}
                  {!editable && (
                    <span className="flex items-center gap-1 text-[10px] text-foreground/50">
                      <Lock className="h-3 w-3" /> مش من صلاحيتك
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={!editable || busy === `${r.key}:can_speak`}
                    onClick={() => toggleRank(r.key, "can_speak")}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-1.5 text-xs disabled:opacity-50"
                  >
                    الكلام <Chip on={p.can_speak} />
                  </button>
                  <button
                    disabled={!editable || busy === `${r.key}:can_upload`}
                    onClick={() => toggleRank(r.key, "can_upload")}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-1.5 text-xs disabled:opacity-50"
                  >
                    رفع الملفات <Chip on={p.can_upload} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Chip({ on }: { on: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        on ? "bg-emerald-500/20 text-emerald-300" : "bg-destructive/20 text-destructive"
      }`}
    >
      {on ? "شغّال" : "مقفول"}
    </span>
  );
}
