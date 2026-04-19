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
  /** Optional textured background image src — fills the entire panel with vignette + tint for legibility */
  bg?: string;
  /** Tint strength on top of the bg image, 0..1 (default 0.55). Higher = more legible, less texture visible. */
  bgTint?: number;
}

const padMap = { none: "", sm: "p-3", md: "p-5", lg: "p-7" };

/**
 * Frosted/translucent panel with a 1px luminous edge.
 * Supports an optional full-panel textured background via the `bg` prop.
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
  bg,
  bgTint = 0.55,
}: GlassPanelProps) {
  return (
    <Tag
      className={cn("relative rounded-2xl", bg && "overflow-hidden", padMap[padding], className)}
      style={{
        background: bg
          ? "transparent"
          : "linear-gradient(180deg, hsl(var(--card) / 0.55) 0%, hsl(var(--card) / 0.35) 100%)",
        backdropFilter: bg ? undefined : "blur(14px)",
        WebkitBackdropFilter: bg ? undefined : "blur(14px)",
        border: `1px solid hsl(${hue} / ${0.25 + glow * 0.4})`,
        boxShadow: `0 0 0 1px hsl(${hue} / ${glow * 0.15}) inset, 0 8px 32px hsl(var(--background) / 0.6), 0 0 24px hsl(${hue} / ${glow * 0.25})`,
        ...style,
      }}
    >
      {bg && (
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <img
            src={bg}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Tint for legibility */}
          <div className="absolute inset-0" style={{ background: `hsl(var(--card) / ${bgTint})` }} />
          {/* Center-clear vignette so corners darken into the panel chrome */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at center, transparent 0%, hsl(var(--card) / 0.35) 70%, hsl(var(--card) / 0.7) 100%)`,
            }}
          />
        </div>
      )}
      {children}
    </Tag>
  );
}
