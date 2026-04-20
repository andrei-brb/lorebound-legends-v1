import { Shield, Crown } from "lucide-react";
import type { PlayerState, BattlePassSeasonId } from "@/lib/playerState";
import HallLayout, { HallSection, HallStat } from "@/components/scene/HallLayout";
import GlassPanel from "@/components/scene/GlassPanel";
import { texGilded, texThrone } from "@/components/scene/panelTextures";
import BattlePass from "@/components/BattlePass";
import { ACTIVE_BATTLE_PASS_SEASON_ID } from "@/data/battlePassSeasons";
import {
  getBattlePassSeasonProgress,
  getBattlePassLevelFromXp,
  getBattlePassXpToNextLevel,
  BP_MAX_LEVEL,
  BP_XP_PER_LEVEL,
} from "@/lib/battlePassEngine";

interface Props {
  playerState: PlayerState;
  onStateChange: (s: PlayerState) => void;
}

export default function PassHall({ playerState, onStateChange }: Props) {
  const seasonId = (playerState.battlePass?.activeSeasonId ?? ACTIVE_BATTLE_PASS_SEASON_ID) as BattlePassSeasonId;
  const sp = getBattlePassSeasonProgress(playerState, seasonId);
  const currentLevel = getBattlePassLevelFromXp(sp.xp);
  const xpToNext = getBattlePassXpToNextLevel(sp.xp) || 0;
  const currentXp = sp.xp - (currentLevel - 1) * BP_XP_PER_LEVEL;
  const hasElite = sp.hasElite;

  return (
    <HallLayout
      sidebarWidth="md"
      sidebar={
        <>
          <HallSection title="Battle Pass" hue="var(--legendary)" glow={0.6} bg={texGilded}>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-[hsl(var(--legendary))]" />
              <span className="text-xs text-muted-foreground">Season track</span>
            </div>
            <HallStat label="Level" value={`${currentLevel}/${BP_MAX_LEVEL}`} hue="var(--legendary)" />
            <HallStat label="XP in level" value={xpToNext > 0 ? `${currentXp} / ${xpToNext}` : "max"} />
            <HallStat label="Tier" value={hasElite ? "Elite" : "Free"} hue={hasElite ? "var(--legendary)" : "var(--primary)"} />
          </HallSection>

          {!hasElite && (
            <HallSection title="Upgrade" hue="var(--legendary)" glow={0.5} bg={texThrone} bgTint={0.7}>
              <p className="text-xs text-muted-foreground mb-3">Unlock Elite to claim premium rewards on every level.</p>
              <button
                type="button"
                className="w-full py-2 rounded-lg bg-gradient-to-r from-[hsl(var(--legendary))] to-[hsl(var(--rare))] text-background font-heading text-xs uppercase tracking-wider"
              >
                <Crown className="w-3.5 h-3.5 inline mr-1.5" />
                Go Elite
              </button>
            </HallSection>
          )}
        </>
      }
    >
      <GlassPanel hue="var(--legendary)" glow={0.35} padding="md" bg={texGilded} bgTint={0.72}>
        <BattlePass playerState={playerState} onStateChange={onStateChange} />
      </GlassPanel>
    </HallLayout>
  );
}
