import { useMemo } from "react";

export default function EmberLayer(props: { count?: number }) {
  const count = props.count ?? 18;
  const embers = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const left = Math.random() * 100;
      const top = 30 + Math.random() * 70;
      const size = 2 + Math.random() * 3.5;
      const dur = 7 + Math.random() * 10;
      const delay = -Math.random() * dur;
      const hue = 35 + Math.random() * 25; // gold → ember
      const alpha = 0.15 + Math.random() * 0.25;
      return { i, left, top, size, dur, delay, hue, alpha };
    });
  }, [count]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {embers.map((e) => (
        <span
          key={e.i}
          className="absolute rounded-full animate-float"
          style={{
            left: `${e.left}%`,
            top: `${e.top}%`,
            width: e.size,
            height: e.size,
            background: `hsla(${e.hue}, 90%, 60%, ${e.alpha})`,
            boxShadow: `0 0 14px hsla(${e.hue}, 90%, 60%, ${e.alpha})`,
            animationDuration: `${e.dur}s`,
            animationDelay: `${e.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

