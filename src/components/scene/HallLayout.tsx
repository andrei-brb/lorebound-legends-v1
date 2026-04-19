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
  banner,
  bannerHeight = 72,
}: {
  title?: string;
  hint?: string;
  hue?: string;
  glow?: number;
  children: ReactNode;
  action?: ReactNode;
  padding?: "sm" | "md" | "lg" | "none";
  /** Optional textured banner image rendered at the top of the panel */
  banner?: string;
  bannerHeight?: number;
}) {
  return (
    <GlassPanel hue={hue} glow={glow} padding="none">
      {banner && (
        <div
          className="relative w-full overflow-hidden rounded-t-2xl"
          style={{ height: bannerHeight }}
          aria-hidden
        >
          <img
            src={banner}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Edge fades + bottom fade into panel */}
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--card)/0.7)] via-transparent to-[hsl(var(--card)/0.7)]" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-[hsl(var(--card)/0.85)]" />
          {/* Title overlay */}
          {title && (
            <div className="absolute inset-0 flex items-end justify-between px-4 pb-2 gap-3">
              <div className="min-w-0">
                <h3 className="font-heading text-xs uppercase tracking-wider text-foreground drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{title}</h3>
                {hint && <p className="text-[10px] text-foreground/70 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{hint}</p>}
              </div>
              {action}
            </div>
          )}
        </div>
      )}
      <div className={padMap[padding]}>
        {!banner && (title || action) && (
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="min-w-0">
              {title && <h3 className="font-heading text-xs uppercase tracking-wider text-foreground/90">{title}</h3>}
              {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
            </div>
            {action}
          </div>
        )}
        {children}
      </div>
    </GlassPanel>
  );
}

/** Stat row: small label + bold value */
export function HallStat({
  label,
  value,
  hue = "var(--primary)",
}: {
  label: string;
  value: ReactNode;
  hue?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-heading text-sm" style={{ color: `hsl(${hue})` }}>{value}</span>
    </div>
  );
}
