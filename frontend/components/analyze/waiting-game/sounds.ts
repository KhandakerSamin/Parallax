/**
 * Short, soft sounds made with the Web Audio API (no audio files, no network).
 * Only called when the player has turned sound on.
 */
let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  context ??= new Ctor();
  if (context.state === "suspended") void context.resume();
  return context;
}

function tone(frequency: number, start: number, duration: number, volume = 0.05) {
  const ctx = audio();
  if (!ctx) return;
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, t);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

export const sounds = {
  flip: () => tone(520, 0, 0.08, 0.025),
  match: () => {
    tone(660, 0, 0.14);
    tone(880, 0.08, 0.18);
  },
  /** Soft, low and short: never a "fail" buzzer. */
  miss: () => tone(330, 0, 0.12, 0.02),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22, 0.045)),
  chime: () => {
    tone(784, 0, 0.35, 0.05);
    tone(1175, 0.12, 0.45, 0.04);
  },
};
