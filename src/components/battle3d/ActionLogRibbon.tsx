import { useEffect, useState } from "react";
import { Sword, Sparkles, Skull, Hourglass, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export type ActionLogEntry = {
  id: string;
  kind: "summon" | "attack" | "defeat" | "turn" | "info";
  text: string;
  ts: number;
};

interface Props {
  entries: ActionLogEntry[];
  /** how long an entry stays visible before fading out (ms) */
  ttlMs?: number;
}

const ICONS: Record<ActionLogEntry["kind"], React.ComponentType<any>> = {
  summon: Sparkles,
  attack: Sword,
  defeat: Skull,
  turn: Hourglass,
  info: Shield,
};

const ACCENT: Record<ActionLogEntry["kind"], string> = {
  summon: "text-[hsl(268_90%_78%)]",
  attack: "text-[hsl(46_95%_72%)]",
  defeat: "text-[hsl(0_75%_62%)]",
  turn: "text-[hsl(46_60%_60%)]",
  info: "text-[hsl(46_30%_60%)]",
};

/**
 * Side chronicle: each entry shows for ~ttlMs then fades out and is removed.
 * Sits along the LEFT edge, vertically centered.
 */
export default function ActionLogRibbon({ entries, ttlMs = 3000 }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(t);
  }, []);

  const fadeMs = 500;
  const visible = entries.filter((e) => now - e.ts < ttlMs + fadeMs);

  return (
    <div className="pointer-events-none absolute left-6 top-[42%] -translate-y-1/2 flex flex-col gap-1 w-[190px]">
      <div className="flex items-center justify-between px-1.5">
        <span className="font-heading text-[8px] uppercase tracking-[0.32em] altar-text-gold">
          Chronicle
        </span>
        <div className="h-px flex-1 ml-2 altar-hairline" />
      </div>

      {visible.length === 0 && (
        <div className="altar-panel rounded-md px-2.5 py-1.5 text-[9px] italic text-[hsl(46_30%_55%/0.55)]">
          The altar awaits your move…
        </div>
      )}

      {visible.map((e) => {
        const Icon = ICONS[e.kind];
        const age = now - e.ts;
        const fade = age < ttlMs ? 1 : Math.max(0, 1 - (age - ttlMs) / fadeMs);
        return (
          <div
            key={e.id}
            className={cn("altar-panel rounded-md px-2 py-1 flex items-start gap-1.5 animate-fade-in transition-opacity duration-300")}
            style={{ opacity: fade }}
          >
            <Icon className={cn("h-3 w-3 mt-0.5 shrink-0", ACCENT[e.kind])} />
            <div className="text-[10px] leading-snug text-[hsl(46_25%_85%)]">{e.text}</div>
          </div>
        );
      })}
    </div>
  );
}

