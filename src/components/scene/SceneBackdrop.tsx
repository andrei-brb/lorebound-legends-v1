import { useMemo, type ReactNode } from "react";

type Mood = "hearth" | "moonlit" | "forge" | "vault";

interface SceneBackdropProps {
  mood: Mood;
  reduceMotion?: boolean;
  children: ReactNode;
}

/**
 * Full-bleed atmospheric backdrop with radial gradients + animated particle layer.
 * No borders, no boxes — pure scene. Uses semantic HSL tokens only.
 */
export default function SceneBackdrop({ mood, reduceMotion, children }: SceneBackdropProps) {
  const particles = useMemo(
    () => Array.from({ length: 28 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      bottom: Math.random() * 100,
      size: 1 + Math.random() * 2.5,
      delay: Math.random() * 8,
      duration: 8 + Math.random() * 10,
      drift: (Math.random() - 0.5) * 40,
    })),
    []
  );

  // Mood-driven radial gradient layers — all using HSL tokens
  const layers: Record<Mood, { base: string; glow: string; particleHue: string }> = {
    hearth: {
      base: "radial-gradient(ellipse at 50% 110%, hsl(var(--legendary) / 0.35) 0%, hsl(var(--background)) 55%, hsl(var(--background)) 100%)",
      glow: "radial-gradient(circle at 50% 100%, hsl(var(--legendary) / 0.5) 0%, transparent 40%)",
      particleHue: "hsl(var(--legendary) / 0.6)",
    },
    moonlit: {
      base: "radial-gradient(ellipse at 50% -10%, hsl(var(--primary) / 0.25) 0%, hsl(var(--background)) 50%, hsl(var(--background)) 100%)",
      glow: "linear-gradient(180deg, hsl(var(--primary) / 0.18) 0%, transparent 60%)",
      particleHue: "hsl(var(--primary) / 0.5)",
    },
    forge: {
      base: "radial-gradient(ellipse at 50% 100%, hsl(var(--rare) / 0.3) 0%, hsl(var(--background)) 60%)",
      glow: "radial-gradient(circle at 50% 95%, hsl(var(--rare) / 0.45) 0%, transparent 35%)",
      particleHue: "hsl(var(--rare) / 0.5)",
    },
    vault: {
      base: "radial-gradient(ellipse at 50% 50%, hsl(var(--epic) / 0.18) 0%, hsl(var(--background)) 70%)",
      glow: "radial-gradient(circle at 50% 50%, hsl(var(--epic) / 0.25) 0%, transparent 50%)",
      particleHue: "hsl(var(--epic) / 0.45)",
    },
  };
  const L = layers[mood];

  return (
    <div className="relative w-full overflow-hidden" style={{ minHeight: "calc(100vh - 12rem)" }}>
      {/* Base gradient */}
      <div className="absolute inset-0 -z-10" style={{ background: L.base }} />
      {/* Glow layer */}
      <div className="absolute inset-0 -z-10" style={{ background: L.glow, mixBlendMode: "screen" }} />
      {/* Vignette */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, transparent 40%, hsl(var(--background) / 0.85) 100%)" }}
      />

      {/* Floating embers / motes */}
      {!reduceMotion && (
        <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
          {particles.map((p) => (
            <span
              key={p.id}
              className="absolute rounded-full animate-ember"
              style={{
                left: `${p.left}%`,
                bottom: `-${p.bottom}px`,
                width: p.size,
                height: p.size,
                background: L.particleHue,
                boxShadow: `0 0 ${p.size * 4}px ${L.particleHue}`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                ["--drift" as any]: `${p.drift}px`,
              }}
            />
          ))}
        </div>
      )}

      {children}
    </div>
  );
}
