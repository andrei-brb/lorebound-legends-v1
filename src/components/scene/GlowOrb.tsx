import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlowOrbProps {
  children?: ReactNode;
  size?: number;
  hue?: string; // any HSL token expression, e.g. "var(--primary)"
  intensity?: number; // 0-1
  className?: string;
  style?: CSSProperties;
  pulse?: boolean;
  onClick?: () => void;
  title?: string;
}

/**
 * A glowing circular surface — used for avatars, statuses, currency, runes.
 * No rectangle anywhere. Pure radial.
 */
export default function GlowOrb({
  children,
  size = 48,
  hue = "var(--primary)",
  intensity = 0.6,
  className,
  style,
  pulse = false,
  onClick,
  title,
}: GlowOrbProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={!onClick}
      className={cn(
        "relative inline-flex items-center justify-center rounded-full transition-transform",
        onClick && "hover:scale-110 cursor-pointer",
        pulse && "animate-pulse-glow",
        className
      )}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 30%, hsl(${hue} / 0.9), hsl(${hue} / 0.45) 60%, hsl(${hue} / 0.1) 100%)`,
        boxShadow: `0 0 ${size * 0.6}px hsl(${hue} / ${intensity}), inset 0 0 ${size * 0.3}px hsl(${hue} / 0.4)`,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
