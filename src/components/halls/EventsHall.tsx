import { Calendar, Clock, Sparkles, Gift } from "lucide-react";
import type { PlayerState } from "@/lib/playerState";
import HallLayout, { HallSection, HallStat } from "@/components/scene/HallLayout";
import GlassPanel from "@/components/scene/GlassPanel";
import HexAvatar from "@/components/scene/HexAvatar";

interface Event {
  id: string;
  name: string;
  theme: string;
  endsIn: string;
  icon: string;
  hue: string;
  status: "live" | "upcoming" | "ended";
  description: string;
}

const MOCK_EVENTS: Event[] = [
  { id: "e1", name: "Solstice Flame", theme: "Fire affinity bonus", endsIn: "3d 12h", icon: "🔥", hue: "var(--destructive)", status: "live", description: "Fire cards gain +10 ATK during this event. Special pack available." },
  { id: "e2", name: "Verdant Awakening", theme: "Nature pack drop boost", endsIn: "5d 4h", icon: "🌿", hue: "var(--synergy)", status: "live", description: "Higher chance for rare nature heroes from any pack." },
  { id: "e3", name: "Eclipse of Shadows", theme: "Shadow tournament", endsIn: "in 2d", icon: "🌑", hue: "var(--secondary)", status: "upcoming", description: "Shadow-only PvP bracket with exclusive rewards." },
];

interface Props { playerState: PlayerState; onStateChange: (s: PlayerState) => void }

export default function EventsHall(_: Props) {
  return (
    <HallLayout
      sidebar={
        <>
          <HallSection title="Seasonal Events" hue="var(--rare)" glow={0.5}>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-[hsl(var(--rare))]" />
              <span className="text-xs text-muted-foreground">Limited-time content</span>
            </div>
            <HallStat label="Live" value={MOCK_EVENTS.filter((e) => e.status === "live").length} hue="var(--legendary)" />
            <HallStat label="Upcoming" value={MOCK_EVENTS.filter((e) => e.status === "upcoming").length} hue="var(--rare)" />
          </HallSection>
        </>
      }
    >
      <div className="space-y-3">
        {MOCK_EVENTS.map((e) => <EventCard key={e.id} event={e} />)}
      </div>
    </HallLayout>
  );
}

function EventCard({ event }: { event: Event }) {
  return (
    <GlassPanel hue={event.hue} glow={event.status === "live" ? 0.6 : 0.3} padding="md">
      <div className="flex items-start gap-4">
        <HexAvatar size={64} hue={event.hue}>
          <span className="text-2xl">{event.icon}</span>
        </HexAvatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="font-heading text-base text-foreground">{event.name}</h3>
            <span
              className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: `hsl(${event.hue}/0.15)`, color: `hsl(${event.hue})` }}
            >
              {event.status}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{event.theme}</p>
          <p className="text-xs text-foreground/70 mt-2 leading-relaxed">{event.description}</p>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/30">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="w-3 h-3" /> {event.endsIn}</span>
            <button className="ml-auto px-3 py-1.5 rounded-md text-[11px] uppercase tracking-wider font-heading transition-colors flex items-center gap-1.5"
              style={{ background: `hsl(${event.hue}/0.2)`, color: `hsl(${event.hue})` }}>
              {event.status === "live" ? <><Sparkles className="w-3 h-3" /> Enter</> : <><Gift className="w-3 h-3" /> Remind me</>}
            </button>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}
