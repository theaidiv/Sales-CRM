"use client";

import { useEffect, useRef, useState } from "react";
import { inr } from "@/lib/utils";

export type NumKind = "inr" | "int" | "pct";

function format(n: number, kind: NumKind): string {
  if (kind === "inr") return inr(n);
  if (kind === "pct") return `${Math.round(n)}%`;
  return Math.round(n).toLocaleString("en-IN");
}

export function AnimatedNumber({ value, kind = "int", duration = 900 }: { value: number; kind?: NumKind; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setDisplay(value); return; }

    const el = ref.current;
    if (!el) { setDisplay(value); return; }

    const run = () => {
      if (started.current) return;
      started.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(value * eased);
        if (t < 1) requestAnimationFrame(tick);
        else setDisplay(value);
      };
      requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && run()), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration]);

  return <span ref={ref} className="tnum">{format(display, kind)}</span>;
}
