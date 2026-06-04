import { Calendar } from "lucide-react";
import type { PlayerState } from "@/lib/playerState";
import HallLayout, { HallSection, HallStat } from "@/components/scene/HallLayout";
import GlassPanel from "@/components/scene/GlassPanel";
import { texCosmic } from "@/components/scene/panelTextures";
import SeasonalEvents from "@/components/SeasonalEvents";
import { getActiveEvents, getUpcomingEvents } from "@/lib/eventEngine";

interface Props {
  playerState: PlayerState;
  onStateChange: (s: PlayerState) => void;
  isOnline?: boolean;
  pullSeasonalPack?: (eventId: string) => Promise<{ cardIds: string[]; state: PlayerState } | null>;
}

export default function EventsHall({ playerState, onStateChange, isOnline, pullSeasonalPack }: Props) {
  const active = getActiveEvents();
  const upcoming = getUpcomingEvents();

  return (
    <HallLayout
      sidebar={
        <HallSection title="Seasonal Events" hue="var(--rare)" glow={0.5} bg={texCosmic}>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-[hsl(var(--rare))]" />
            <span className="text-xs text-foreground/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Limited-time content</span>
          </div>
          <HallStat label="Live" value={active.length} hue="var(--legendary)" />
          <HallStat label="Upcoming" value={upcoming.length} hue="var(--rare)" />
        </HallSection>
      }
    >
      <GlassPanel hue="var(--rare)" glow={0.35} padding="md" bg={texCosmic} bgTint={0.75}>
        <SeasonalEvents
          playerState={playerState}
          onStateChange={onStateChange}
          isOnline={isOnline}
          pullSeasonalPackApi={pullSeasonalPack}
        />
      </GlassPanel>
    </HallLayout>
  );
}
