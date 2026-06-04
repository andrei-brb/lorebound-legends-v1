import { Zap } from "lucide-react";
import type { PlayerState } from "@/lib/playerState";
import HallLayout, { HallSection, HallStat } from "@/components/scene/HallLayout";
import GlassPanel from "@/components/scene/GlassPanel";
import { texRunes, texVelvet } from "@/components/scene/panelTextures";
import BoostRewards from "@/components/BoostRewards";

interface Props { playerState: PlayerState }

export default function BoostHall({ playerState }: Props) {
  // TODO: Discord Embedded App entitlement when API is available
  const isBoosting = false;

  return (
    <HallLayout
      sidebar={
        <>
          <HallSection title="Boost Altar" hue="var(--rare)" glow={0.5} bg={texRunes} bgTint={0.7}>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-[hsl(var(--rare))]" />
              <span className="text-xs text-foreground/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Server boost rewards</span>
            </div>
            <HallStat label="Status" value={isBoosting ? "Boosting" : "Not boosting"} hue={isBoosting ? "var(--legendary)" : "var(--muted-foreground)"} />
            <HallStat label="Gold" value={playerState.gold.toLocaleString()} hue="var(--legendary)" />
            <HallStat label="Stardust" value={playerState.stardust.toLocaleString()} hue="var(--rare)" />
          </HallSection>

          <HallSection title="Tip" hue="var(--rare)" glow={0.25} bg={texVelvet}>
            <p className="text-xs text-foreground/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-relaxed">
              Boost the Discord server to unlock exclusive cosmetics and bonuses listed here.
            </p>
          </HallSection>
        </>
      }
    >
      <GlassPanel hue="var(--rare)" glow={0.35} padding="md" bg={texVelvet} bgTint={0.72}>
        <BoostRewards isBoosting={isBoosting} />
      </GlassPanel>
    </HallLayout>
  );
}
