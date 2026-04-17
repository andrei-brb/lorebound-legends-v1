import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import GlassPanel from "./GlassPanel";

interface HallLayoutProps {
  /** Sticky sidebar content (left on desktop, top on mobile) */
  sidebar: ReactNode;
  /** Optional header that sits above the main panel */
  header?: ReactNode;
  /** Main content */
  children: ReactNode;
  /** Width preset for sidebar */
  sidebarWidth?: "sm" | "md" | "lg";
  className?: string;
}

const widthMap = {
  sm: "lg:grid-cols-[260px_1fr]",
  md: "lg:grid-cols-[300px_1fr]",
  lg: "lg:grid-cols-[340px_1fr]",
};

/**
 * Two-column layout used by every "Hall" tab.
 * Sticky sidebar on desktop, stacked on mobile.
 */
export default function HallLayout({
  sidebar,
  header,
  children,
  sidebarWidth = "sm",
  className,
}: HallLayoutProps) {
  return (
    <div className={cn("px-4 sm:px-6 py-6 max-w-7xl mx-auto", className)}>
      <div className={cn("grid grid-cols-1 gap-5", widthMap[sidebarWidth])}>
        <aside className="lg:sticky lg:top-24 lg:self-start space-y-4">{sidebar}</aside>
        <main className="space-y-4 min-w-0">
          {header}
          {children}
        </main>
      </div>
    </div>
  );
}

/** Compact section header inside the main column */
export function HallSection({
  title,
  hint,
  hue = "var(--primary)",
  glow = 0.4,
  children,
  action,
  padding = "md",
}: {
  title?: string;
  hint?: string;
  hue?: string;
  glow?: number;
  children: ReactNode;
  action?: ReactNode;
  padding?: "sm" | "md" | "lg" | "none";
}) {
  return (
    <GlassPanel hue={hue} glow={glow} padding={padding}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="min-w-0">
            {title && <h3 className="font-heading text-xs uppercase tracking-wider text-foreground/90">{title}</h3>}
            {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </GlassPanel>
  );
}

/** Stat row: small label + bold value */
export function HallStat({
  label,
  value,
  hue = "var(--primary)",
}: {
  label: ReactNode;
  value: ReactNode;
  hue?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">{label}</span>
      <span className="font-heading text-sm" style={{ color: `hsl(${hue})` }}>{value}</span>
    </div>
  );
}
