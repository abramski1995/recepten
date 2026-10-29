import { useEffect, useRef, useState } from "react";

export interface CookTimer {
  id: number;
  label: string;
  total: number; // seconds
  endAt: number; // epoch ms
}

// Cooking timers that keep running while you move between steps. Vibrates and beeps when one ends.
export function useCookTimers() {
  const [timers, setTimers] = useState<CookTimer[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const audio = useRef<AudioContext | null>(null);
  const alerted = useRef(new Set<number>());
  const nextId = useRef(1);

  useEffect(() => {
    if (timers.length === 0) return;
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(tick);
  }, [timers.length]);

  useEffect(() => {
    for (const t of timers) {
      if (now >= t.endAt && !alerted.current.has(t.id)) {
        alerted.current.add(t.id);
        alarm(audio.current);
      }
    }
  }, [now, timers]);

  function start(label: string, seconds: number) {
    // The audio context must be created from a tap, otherwise browsers keep it silent.
    try {
      audio.current ??= new AudioContext();
      void audio.current.resume();
    } catch {
      // no audio available: vibration and the on-screen alert still work
    }
    const t = Date.now();
    setNow(t);
    setTimers((ts) =>
      ts.some((x) => x.total === seconds && x.endAt > t) ? ts : [...ts, { id: nextId.current++, label, total: seconds, endAt: t + seconds * 1000 }],
    );
  }

  const dismiss = (id: number) => setTimers((ts) => ts.filter((t) => t.id !== id));

  return { timers, now, start, dismiss };
}

function alarm(ctx: AudioContext | null) {
  navigator.vibrate?.([300, 150, 300, 150, 600]);
  if (!ctx) return;
  try {
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.2;
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.4);
      osc.stop(ctx.currentTime + i * 0.4 + 0.25);
    }
  } catch {
    // ignore: the visual alert remains
  }
}
