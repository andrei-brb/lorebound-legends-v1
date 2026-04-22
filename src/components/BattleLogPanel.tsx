import { useEffect, useMemo, useRef } from "react";
import type { BattleLog } from "@/lib/battleEngine";
import { cn } from "@/lib/utils";

type Props = {
  logs: BattleLog[];
  className?: string;
};

function logTone(type: BattleLog["type"]): string {
  switch (type) {
    case "attack":
      return "text-destructive";
    case "defeat":
      return "text-destructive";
    case "spell":
      return "text-synergy";
    case "ability":
      return "text-legendary";
    case "synergy":
      return "text-primary";
    case "weapon":
      return "text-amber-200";
    case "trap":
      return "text-rose-300";
    case "token":
      return "text-amber-100";
    case "direct":
      return "text-orange-200";
    case "info":
    default:
      return "text-foreground/85";
  }
}

export default function BattleLogPanel({ logs, className }: Props) {
  const endRef = useRef<HTMLDivElement | null>(null);

  const visible = useMemo(() => {
    // Keep it readable: show the most recent ~80 messages.
    if (logs.length <= 80) return logs;
    return logs.slice(logs.length - 80);
  }, [logs]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [visible.length]);

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm overflow-hidden",
        className,
      )}
    >
      <div className="px-3 py-2 border-b border-border/40 flex items-center justify-between">
        <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-muted-foreground">
          Battle Log
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums">{logs.length}</span>
      </div>
      <div className="h-full max-h-[520px] overflow-y-auto px-3 py-2 space-y-1">
        {visible.map((l, idx) => (
          <div key={`${l.timestamp}-${idx}`} className="text-[11px] leading-snug">
            <span className={cn("font-medium", logTone(l.type))}>{l.message}</span>
            {l.source ? <span className="ml-1 text-[10px] text-muted-foreground/80">({l.source})</span> : null}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

