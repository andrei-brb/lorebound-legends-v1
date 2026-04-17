import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HexAvatarProps {
  /** Single letter, image src, or any node to render inside */
  children?: ReactNode;
  src?: string | null;
  size?: number;
  hue?: string;
  online?: boolean;
  onClick?: () => void;
  className?: string;
  title?: string;
}

/**
 * Hexagonal portrait frame with thin colored ring.
 * Uses CSS clip-path for the hex shape — no SVG required.
 */
export default function HexAvatar({
  children,
  src,
  size = 48,
  hue = "var(--primary)",
  online,
  onClick,
  className,
  title,
}: HexAvatarProps) {
  const clip = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      title={title}
      className={cn(
        "relative inline-flex items-center justify-center transition-transform shrink-0",
        onClick && "hover:scale-105 cursor-pointer",
        className
      )}
      style={{ width: size, height: size }}
    >
      {/* Outer ring (the colored frame) */}
      <span
        className="absolute inset-0"
        style={{
          clipPath: clip,
          WebkitClipPath: clip,
          background: `linear-gradient(135deg, hsl(${hue} / 0.95), hsl(${hue} / 0.5))`,
          filter: `drop-shadow(0 0 6px hsl(${hue} / 0.5))`,
        }}
      />
      {/* Inner content area */}
      <span
        className="absolute flex items-center justify-center overflow-hidden"
        style={{
          inset: Math.max(2, size * 0.06),
          clipPath: clip,
          WebkitClipPath: clip,
          background: src
            ? `center / cover no-repeat url(${src})`
            : `radial-gradient(circle at 35% 30%, hsl(${hue} / 0.4), hsl(var(--card)) 80%)`,
        }}
      >
        {!src && (
          <span className="font-heading text-foreground" style={{ fontSize: size * 0.36 }}>
            {children}
          </span>
        )}
      </span>
      {/* Online status — small diamond at bottom-right */}
      {online !== undefined && (
        <span
          className="absolute -bottom-0.5 -right-0.5"
          style={{
            width: Math.max(8, size * 0.2),
            height: Math.max(8, size * 0.2),
            transform: "rotate(45deg)",
            background: online ? "hsl(var(--synergy))" : "hsl(var(--muted-foreground))",
            boxShadow: online ? "0 0 8px hsl(var(--synergy))" : "none",
            border: "1.5px solid hsl(var(--background))",
          }}
        />
      )}
    </button>
  );
}
