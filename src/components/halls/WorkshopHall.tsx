import { useMemo, useState } from "react";
import { Hammer, Flame, ArrowDown, Sparkles } from "lucide-react";
import type { PlayerState } from "@/lib/playerState";
import HallLayout, { HallSection, HallStat } from "@/components/scene/HallLayout";
import GlassPanel from "@/components/scene/GlassPanel";
import HexAvatar from "@/components/scene/HexAvatar";
import { allCards } from "@/data/cards";
import { cn } from "@/lib/utils";

interface Props { playerState: PlayerState; onStateChange: (s: PlayerState) => void }

export default function WorkshopHall({ playerState }: Props) {
  const [mode, setMode] = useState<"fuse" | "sacrifice">("fuse");
  const owned = useMemo(
    () => playerState.ownedCardIds.map((id) => allCards.find((c) => c.id === id)).filter(Boolean) as typeof allCards,
    [playerState.ownedCardIds]
  );
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : s.length < (mode === "fuse" ? 3 : 5) ? [...s, id] : s);
  };

  return (
    <HallLayout
      sidebarWidth="md"
      sidebar={
        <>
          <HallSection title="Workshop" hue="var(--rare)" glow={0.5}>
            <div className="flex items-center gap-2 mb-3">
              <Hammer className="w-4 h-4 text-[hsl(var(--rare))]" />
              <span className="text-xs text-muted-foreground">Fuse or sacrifice cards</span>
            </div>
            <HallStat label="Stardust" value={playerState.stardust.toLocaleString()} hue="var(--rare)" />
            <HallStat label="Gold" value={playerState.gold.toLocaleString()} hue="var(--legendary)" />
            <HallStat label="Cards owned" value={playerState.ownedCardIds.length} />
          </HallSection>

          <HallSection title="Mode" hue="var(--rare)" glow={0.35}>
            <div className="grid grid-cols-2 gap-2">
              {(["fuse", "sacrifice"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setSelected([]); }}
                  className={cn(
                    "p-3 rounded-lg text-xs uppercase tracking-wider transition-all flex flex-col items-center gap-1",
                    mode === m ? "bg-[hsl(var(--rare)/0.15)] ring-1 ring-[hsl(var(--rare)/0.4)] text-foreground" : "text-muted-foreground hover:bg-foreground/5"
                  )}
                >
                  {m === "fuse" ? <Sparkles className="w-4 h-4" /> : <Flame className="w-4 h-4" />}
                  {m}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
              {mode === "fuse" ? "Combine 3 cards of the same rarity to forge one of higher rarity." : "Burn up to 5 cards into stardust dust."}
            </p>
          </HallSection>
        </>
      }
      header={
        <GlassPanel hue="var(--rare)" glow={0.4} padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Selected · {selected.length}/{mode === "fuse" ? 3 : 5}</p>
              <h1 className="font-heading text-lg text-foreground capitalize">{mode === "fuse" ? "Forging Altar" : "Sacrificial Pyre"}</h1>
            </div>
            <button
              disabled={mode === "fuse" ? selected.length !== 3 : selected.length === 0}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-[hsl(var(--rare))] to-[hsl(var(--legendary))] text-background font-heading text-xs uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {mode === "fuse" ? "Forge" : "Sacrifice"}
            </button>
          </div>
        </GlassPanel>
      }
    >
      <GlassPanel hue="var(--primary)" glow={0.3} padding="md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading text-xs uppercase tracking-wider text-foreground/90">Your Cards</h3>
          <span className="text-[10px] text-muted-foreground">tap to select</span>
        </div>
        {owned.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">no cards in your collection</p>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
            {owned.slice(0, 60).map((c) => {
              const sel = selected.includes(c.id);
              const hue = c.rarity === "legendary" ? "var(--legendary)" : c.rarity === "rare" ? "var(--rare)" : "var(--primary)";
              return (
                <button key={c.id} onClick={() => toggle(c.id)} className="flex flex-col items-center gap-1.5 group">
                  <HexAvatar size={48} hue={hue} src={c.image} className={cn("transition-transform", sel && "ring-2 ring-[hsl(var(--legendary))] ring-offset-2 ring-offset-background")} />
                  <span className="text-[10px] text-foreground/80 truncate max-w-full">{c.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </GlassPanel>
    </HallLayout>
  );
}
