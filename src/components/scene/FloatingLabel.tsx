import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FloatingLabelProps {
  children: ReactNode;
  className?: string;
  variant?: "carved" | "inked" | "ember";
}

/**
 * In-world text label — no chip, no badge, no background.
 * Letter-spaced + glow to feel etched into the scene.
 */
export default function FloatingLabel({ children, className, variant = "carved" }: FloatingLabelProps) {
  const styles: Record<string, string> = {
    carved: "text-foreground/80 tracking-[0.3em] uppercase text-xs drop-shadow-[0_0_8px_hsl(var(--background))]",
    inked: "text-foreground/90 italic font-heading tracking-wide",
    ember: "text-[hsl(var(--legendary))] tracking-[0.25em] uppercase text-xs font-bold drop-shadow-[0_0_12px_hsl(var(--legendary)/0.6)]",
  };
  return <span className={cn(styles[variant], className)}>{children}</span>;
}
