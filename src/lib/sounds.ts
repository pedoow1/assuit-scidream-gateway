// Small Web Audio–based sound engine for the app.
//
// We deliberately avoid shipping .mp3/.wav assets: two short synthesized
// tones are generated on the fly, so there's nothing to upload/host and it
// works completely offline. Browsers require a user gesture before audio can
// play, so `unlockAudioOnFirstInteraction()` should be called once near the
// root of the app; every click/tap/keydown before that will silently unlock
// it for the rest of the session.

let ctx: AudioContext | null = null;
let unlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) ctx = new AudioCtx();
  return ctx;
}

export function unlockAudioOnFirstInteraction() {
  if (unlocked || typeof window === "undefined") return;
  const unlock = () => {
    const c = getCtx();
    if (c && c.state === "suspended") void c.resume();
    unlocked = true;
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

function playTone(freqs: { freq: number; at: number; dur: number; gain?: number }[]) {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  const now = c.currentTime;
  for (const { freq, at, dur, gain = 0.09 } of freqs) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(g);
    g.connect(c.destination);
    const start = now + at;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gain, start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }
}

const SOUND_PREF_KEY = "sd_sound_prefs_v1";
function soundsEnabled(): boolean {
  try {
    const raw = localStorage.getItem(SOUND_PREF_KEY);
    if (!raw) return true;
    return JSON.parse(raw).enabled !== false;
  } catch {
    return true;
  }
}
export function setSoundsEnabled(enabled: boolean) {
  try {
    localStorage.setItem(SOUND_PREF_KEY, JSON.stringify({ enabled }));
  } catch {
    /* ignore */
  }
}
export function getSoundsEnabled(): boolean {
  return soundsEnabled();
}

/** Short two-note "pop" — used for a new chat message. */
export function playMessageSound() {
  if (!soundsEnabled()) return;
  playTone([
    { freq: 720, at: 0, dur: 0.09, gain: 0.08 },
    { freq: 980, at: 0.06, dur: 0.12, gain: 0.07 },
  ]);
}

/** Brighter three-note chime — used for bell notifications (mentions, friend requests, announcements). */
export function playNotificationSound() {
  if (!soundsEnabled()) return;
  playTone([
    { freq: 880, at: 0, dur: 0.1, gain: 0.09 },
    { freq: 1108, at: 0.09, dur: 0.1, gain: 0.09 },
    { freq: 1318, at: 0.18, dur: 0.18, gain: 0.09 },
  ]);
}
