import { useEffect, useMemo, useRef } from "react";
import type { BattleLog } from "@/lib/battleEngine";
import { cn } from "@/lib/utils";
import { ScrollText } from "lucide-react";

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
        "rounded-2xl overflow-hidden",
        "border border-amber-400/25",
        "bg-gradient-to-b from-black/55 via-black/35 to-black/55",
        "shadow-[0_10px_30px_rgba(0,0,0,0.55)]",
        "ring-1 ring-amber-200/10",
        className,
      )}
    >
      <div className="px-3 py-2 border-b border-amber-400/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScrollText className="w-3.5 h-3.5 text-amber-200/90" />
          <span className="text-[10px] font-heading font-bold uppercase tracking-[0.18em] text-amber-100/90 drop-shadow">
            Combat Log
          </span>
        </div>
        <span className="text-[10px] text-amber-100/70 tabular-nums">{logs.length}</span>
      </div>
      <div className="h-full overflow-y-auto px-3 py-2 space-y-1">
        {visible.map((l, idx) => (
          <div key={`${l.timestamp}-${idx}`} className="text-[11px] leading-[1.15] flex gap-2">
            <span className="text-amber-100/40 select-none">»</span>
            <div className="min-w-0">
              <span className={cn("font-heading font-semibold", logTone(l.type))}>{l.message}</span>
              {l.source ? <span className="ml-1 text-[10px] text-amber-100/55">({l.source})</span> : null}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

