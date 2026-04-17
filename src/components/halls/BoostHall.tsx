import { Zap, Clock, Coins, Sparkles, TrendingUp } from "lucide-react";
import type { PlayerState } from "@/lib/playerState";
import HallLayout, { HallSection, HallStat } from "@/components/scene/HallLayout";
import GlassPanel from "@/components/scene/GlassPanel";

interface Boost {
  id: string;
  name: string;
  description: string;
  multiplier: string;
  duration: string;
  cost: { gold?: number; stardust?: number };
  active?: boolean;
}

const MOCK_BOOSTS: Boost[] = [
  { id: "b1", name: "Gold Surge", description: "+50% gold from battles", multiplier: "1.5×", duration: "2h", cost: { gold: 200 } },
  { id: "b2", name: "XP Tide", description: "+100% battle pass XP", multiplier: "2×", duration: "1h", cost: { stardust: 30 }, active: true },
  { id: "b3", name: "Stardust Bloom", description: "+25% stardust gain", multiplier: "1.25×", duration: "4h", cost: { gold: 500 } },
  { id: "b4", name: "Card Drop Boon", description: "Higher rare drop chance", multiplier: "+15%", duration: "1h", cost: { stardust: 50 } },
];

interface Props { playerState: PlayerState }

export default function BoostHall({ playerState }: Props) {
  const activeCount = MOCK_BOOSTS.filter((b) => b.active).length;
  return (
    <HallLayout
      sidebar={
        <>
          <HallSection title="Boost Altar" hue="var(--rare)" glow={0.5}>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-[hsl(var(--rare))]" />
              <span className="text-xs text-muted-foreground">Temporary multipliers</span>
            </div>
            <HallStat label="Active" value={`${activeCount}/${MOCK_BOOSTS.length}`} hue="var(--rare)" />
            <HallStat label="Gold" value={playerState.gold.toLocaleString()} hue="var(--legendary)" />
            <HallStat label="Stardust" value={playerState.stardust.toLocaleString()} hue="var(--rare)" />
          </HallSection>

          <HallSection title="Tip" hue="var(--rare)" glow={0.25}>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Stack boosts before grinding daily quests for maximum gain.
            </p>
          </HallSection>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MOCK_BOOSTS.map((b) => <BoostCard key={b.id} boost={b} />)}
      </div>
    </HallLayout>
  );
}

function BoostCard({ boost }: { boost: Boost }) {
  return (
    <GlassPanel hue={boost.active ? "var(--legendary)" : "var(--rare)"} glow={boost.active ? 0.6 : 0.35} padding="md">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-[hsl(var(--rare)/0.15)] ring-1 ring-[hsl(var(--rare)/0.3)] flex items-center justify-center shrink-0">
          <TrendingUp className="w-5 h-5 text-[hsl(var(--rare))]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-heading text-sm text-foreground truncate">{boost.name}</h4>
            <span className="font-heading text-base text-[hsl(var(--legendary))]">{boost.multiplier}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{boost.description}</p>
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/30">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="w-3 h-3" /> {boost.duration}</span>
            {boost.cost.gold && <span className="flex items-center gap-1 text-[11px] text-[hsl(var(--legendary))]"><Coins className="w-3 h-3" /> {boost.cost.gold}</span>}
            {boost.cost.stardust && <span className="flex items-center gap-1 text-[11px] text-[hsl(var(--rare))]"><Sparkles className="w-3 h-3" /> {boost.cost.stardust}</span>}
            <button
              disabled={boost.active}
              className="ml-auto px-3 py-1 rounded-md bg-[hsl(var(--rare)/0.2)] hover:bg-[hsl(var(--rare)/0.3)] text-[hsl(var(--rare))] text-[11px] uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {boost.active ? "Active" : "Activate"}
            </button>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}
