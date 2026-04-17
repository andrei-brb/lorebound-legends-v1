import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Color for the glow border, defaults to primary */
  hue?: string;
  /** Border intensity 0..1 */
  glow?: number;
  /** Padding scale */
  padding?: "sm" | "md" | "lg" | "none";
  as?: "div" | "section" | "aside";
}

const padMap = { none: "", sm: "p-3", md: "p-5", lg: "p-7" };

/**
 * Frosted/translucent panel with a 1px luminous edge.
 * Solid structure, no floating — but no harsh rectangle either.
 * All colors are HSL design tokens.
 */
export default function GlassPanel({
  children,
  className,
  style,
  hue = "var(--primary)",
  glow = 0.4,
  padding = "md",
  as: Tag = "div",
}: GlassPanelProps) {
  return (
    <Tag
      className={cn("relative rounded-2xl", padMap[padding], className)}
      style={{
        background:
          "linear-gradient(180deg, hsl(var(--card) / 0.55) 0%, hsl(var(--card) / 0.35) 100%)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: `1px solid hsl(${hue} / ${0.25 + glow * 0.4})`,
        boxShadow: `0 0 0 1px hsl(${hue} / ${glow * 0.15}) inset, 0 8px 32px hsl(var(--background) / 0.6), 0 0 24px hsl(${hue} / ${glow * 0.25})`,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
