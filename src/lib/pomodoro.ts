export type PomoCfg = { study: number; brk: number; long: number; rounds: number };
export type PhaseKind = 'study' | 'break' | 'long';
export type Phase = { kind: PhaseKind; round: number; remainingMs: number; totalMs: number };

export const PHASE_LABEL: Record<PhaseKind, string> = { study: 'مذاكرة', break: 'راحة قصيرة', long: 'راحة طويلة' };

/** المرحلة الحالية من الوقت اللي عدّى (نفس منطق دالة pomo_boundary في قاعدة البيانات) */
export function phaseAt(cfg: PomoCfg, elapsedMs: number): Phase {
  const s = cfg.study * 60000;
  const b = cfg.brk * 60000;
  const l = cfg.long * 60000;
  const R = Math.max(1, cfg.rounds);
  const cycle = R * s + (R - 1) * b + l;
  let e = Math.max(0, elapsedMs);
  let roundBase = 0;
  if (e >= cycle) { const n = Math.floor(e / cycle); e -= n * cycle; roundBase = n * R; }
  let t = 0;
  for (let k = 1; k <= R; k++) {
    if (e < t + s) return { kind: 'study', round: roundBase + k, remainingMs: t + s - e, totalMs: s };
    t += s;
    const isLong = k === R;
    const len = isLong ? l : b;
    if (len > 0 && e < t + len) return { kind: isLong ? 'long' : 'break', round: roundBase + k, remainingMs: t + len - e, totalMs: len };
    t += len;
  }
  return { kind: 'study', round: roundBase + 1, remainingMs: s, totalMs: s };
}

export function fmtClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export const cfgText = (r: { study_min: number; break_min: number; long_break_min: number; rounds_before_long: number }) =>
  r.break_min === 0 && r.long_break_min === 0
    ? `${r.study_min} د مذاكرة من غير راحة`
    : `${r.study_min} د مذاكرة · ${r.break_min} د راحة · ${r.long_break_min} د راحة طويلة كل ${r.rounds_before_long} جولات`;
