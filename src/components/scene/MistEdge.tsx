import type { CSSProperties, ReactNode } from "react";

interface MistEdgeProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Strength of edge dissolve, 0-1 */
  feather?: number;
}

/**
 * Wraps content in a soft radial mask so its edges dissolve into the backdrop.
 * Replaces rectangular borders with smoke/mist falloff.
 */
export default function MistEdge({ children, className, style, feather = 0.35 }: MistEdgeProps) {
  const mask = `radial-gradient(ellipse at center, black 55%, transparent ${100 - feather * 30}%)`;
  return (
    <div
      className={className}
      style={{
        WebkitMaskImage: mask,
        maskImage: mask,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
