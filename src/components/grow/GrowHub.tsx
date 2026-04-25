import { BarChart3, Calendar, Hammer, ScrollText, Trophy, Zap } from "lucide-react";
import type { PlayerState } from "@/lib/playerState";
import { cn } from "@/lib/utils";
import HexAvatar from "@/components/scene/HexAvatar";
import DailyHall from "@/components/halls/DailyHall";

type Tab =
  | "quests"
  | "shop"
  | "crafting"
  | "pass"
  | "boost"
  | "leaderboard"
  | "events"
  | "tournament"
  | "profile";

const tiles: Array<{
  tab: Tab;
  title: string;
  subtitle: string;
  Icon: React.ElementType;
  tint: string;
}> = [
  { tab: "quests", title: "Quests", subtitle: "Daily tasks & saga progress.", Icon: ScrollText, tint: "#d4af37" },
  { tab: "shop", title: "Shop", subtitle: "Packs, tomes, and bargains.", Icon: Calendar, tint: "#ff9800" },
  { tab: "crafting", title: "Crafting", subtitle: "Fuse dubs, sacrifice for dust.", Icon: Hammer, tint: "#bcaaa4" },
  { tab: "pass", title: "Battle Pass", subtitle: "Seasons and rewards.", Icon: Trophy, tint: "#f5c842" },
  { tab: "boost", title: "Boosts", subtitle: "Temporary blessings.", Icon: Zap, tint: "#42a5f5" },
  { tab: "leaderboard", title: "Standings", subtitle: "Realm rankings.", Icon: BarChart3, tint: "#ba68c8" },
  { tab: "events", title: "Events", subtitle: "Limited-time trials.", Icon: Trophy, tint: "#ef5350" },
  { tab: "tournament", title: "Tournament", subtitle: "Bracket challenges.", Icon: Trophy, tint: "#8e24aa" },
  { tab: "profile", title: "Profile", subtitle: "Titles, cosmetics, identity.", Icon: Trophy, tint: "#90caf9" },
];

export default function GrowHub(props: {
  playerState: PlayerState;
  onStateChange: (s: PlayerState) => void;
  isOnline: boolean;
  claimDailyLogin: () => Promise<void>;
  onNavigate: (tab: Tab) => void;
}) {
  const { playerState, onStateChange, isOnline, claimDailyLogin, onNavigate } = props;
  const initial = (playerState.name || "A").trim().slice(0, 1).toUpperCase();
  const week = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="relative min-h-[calc(100vh-72px)] px-5 md:px-10 py-8" data-testid="grow-hub">
      <div className="section-heading mb-3">The Hero&apos;s Hall</div>
      <p className="text-center font-lore text-[#d6c293] mb-6">Choose your path through the realms.</p>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        <div className="panel-gold p-5">
          <div className="flex items-center gap-4">
            <HexAvatar size={64} hue="var(--legendary)" online={isOnline}>
              {initial}
            </HexAvatar>
            <div className="min-w-0">
              <div className="font-heading text-xl font-bold text-foreground truncate">{playerState.name || "Adventurer"}</div>
              <div className="text-xs text-muted-foreground">
                Collection: <span className="text-foreground/90">{playerState.ownedCardIds.length}</span> cards
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#d4af37]/20 bg-black/30 px-3 py-2">
              <div className="text-[11px] text-muted-foreground">Gold</div>
              <div className="font-heading font-bold text-foreground">{Number(playerState.gold) || 0}</div>
            </div>
            <div className="rounded-xl border border-[#d4af37]/20 bg-black/30 px-3 py-2">
              <div className="text-[11px] text-muted-foreground">Stardust</div>
              <div className="font-heading font-bold text-foreground">{Number(playerState.stardust) || 0}</div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-[#d4af37]/20 bg-black/25 p-3">
            <div className="text-[11px] text-muted-foreground mb-2">Weekly Cycle</div>
            <div className="flex items-center justify-between gap-2">
              {week.map((d) => (
                <div
                  key={d}
                  className={cn(
                    "flex-1 text-center rounded-lg py-1 text-[10px] border",
                    "border-[#d4af37]/15 bg-black/20 text-muted-foreground"
                  )}
                >
                  {d}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {tiles.map(({ tab, title, subtitle, Icon, tint }) => (
            <button
              key={tab}
              type="button"
              onClick={() => onNavigate(tab)}
              className="panel-gold p-5 text-left hover:brightness-110 transition-all"
              style={{ borderColor: "rgba(212,175,55,0.18)" }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center border"
                  style={{ background: "rgba(0,0,0,0.35)", borderColor: `${tint}55` }}
                >
                  <Icon className="w-5 h-5" style={{ color: tint }} />
                </div>
                <div className="min-w-0">
                  <div className="font-heading font-bold text-foreground">{title}</div>
                  <div className="text-xs text-muted-foreground">{subtitle}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-7 panel-gold p-5">
        <div className="font-heading font-bold text-foreground mb-1">Daily</div>
        <div className="text-xs text-muted-foreground mb-4">Claim daily rewards and keep your streak alive.</div>
        <DailyHall
          playerState={playerState}
          onStateChange={onStateChange}
          isOnline={isOnline}
          claimDailyLogin={claimDailyLogin}
        />
      </div>
    </div>
  );
}

