import { useMemo } from "react";

/**
 * CSS-overlay atmosphere for the celestial duel altar:
 *  - drifting gold/violet motes
 *  - vertical god-rays (animated gradient bands)
 *  - vignette + faint haze
 *
 * Sits as an absolutely-positioned overlay over the 3D canvas, pointer-events: none.
 */
export default function AltarAtmosphere() {
  const motes = useMemo(
    () =>
      Array.from({ length: 28 }).map((_, i) => {
        const left = Math.random() * 100;
        const size = 1 + Math.random() * 2.5;
        const dur = 14 + Math.random() * 18;
        const delay = -Math.random() * dur;
        const driftX = (Math.random() - 0.5) * 80;
        const violet = Math.random() > 0.55;
        return { i, left, size, dur, delay, driftX, violet };
      }),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 mix-blend-screen opacity-60">
        <div
          className="absolute -top-10 left-1/4 h-[140%] w-[18%] -translate-x-1/2 rotate-[8deg] blur-2xl"
          style={{
            background:
              "linear-gradient(180deg, hsl(46 95% 72% / 0.18), hsl(46 95% 72% / 0) 70%)",
            animation: "altar-godray 9s ease-in-out infinite",
          }}
        />
        <div
          className="absolute -top-10 left-2/3 h-[140%] w-[14%] -translate-x-1/2 -rotate-[6deg] blur-2xl"
          style={{
            background:
              "linear-gradient(180deg, hsl(268 70% 65% / 0.22), hsl(268 70% 65% / 0) 70%)",
            animation: "altar-godray 11s ease-in-out infinite 1.5s",
          }}
        />
        <div
          className="absolute -top-10 left-[42%] h-[140%] w-[10%] -translate-x-1/2 rotate-[2deg] blur-2xl"
          style={{
            background:
              "linear-gradient(180deg, hsl(46 95% 80% / 0.14), hsl(46 95% 72% / 0) 75%)",
            animation: "altar-godray 7s ease-in-out infinite 0.8s",
          }}
        />
      </div>

      <div className="absolute inset-0">
        {motes.map((m) => (
          <span
            key={m.i}
            className="absolute bottom-[-10%] rounded-full"
            style={{
              left: `${m.left}%`,
              width: m.size,
              height: m.size,
              background: m.violet
                ? "radial-gradient(circle, hsl(268 90% 78%) 0%, transparent 70%)"
                : "radial-gradient(circle, hsl(46 95% 78%) 0%, transparent 70%)",
              boxShadow: m.violet
                ? "0 0 6px hsl(268 90% 70% / 0.7)"
                : "0 0 6px hsl(46 95% 72% / 0.7)",
              animation: `altar-mote ${m.dur}s linear infinite`,
              animationDelay: `${m.delay}s`,
              ["--mote-x" as any]: `${m.driftX}px`,
            }}
          />
        ))}
      </div>

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 45%, hsl(250 40% 4% / 0.55) 95%)",
        }}
      />

      <div
        className="absolute inset-x-0 top-0 h-40"
        style={{
          background: "linear-gradient(180deg, hsl(268 70% 18% / 0.55), transparent)",
        }}
      />
    </div>
  );
}

