import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronRight,
  Eye,
  Flag,
  Flame,
  Gift,
  Hammer,
  Home,
  Layers,
  Mail,
  Menu,
  MessageCircle,
  ScrollText,
  Shield,
  Sparkles,
  Star,
  Swords,
  Trophy,
  User,
  Users,
  Volume2,
  VolumeX,
  Zap,
  ArrowLeftRight,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GoldCurrencyIcon, StardustCurrencyIcon } from "@/components/CurrencyIcons";
import { setSfxVolume } from "@/lib/sfx";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ACTIVE_BATTLE_PASS_SEASON_ID, BATTLE_PASS_SEASONS } from "@/data/battlePassSeasons";

export type AppTab =
  | "collection"
  | "catalog"
  | "cosmetics"
  | "deck"
  | "battle"
  | "pvp"
  | "summon"
  | "shop"
  | "quests"
  | "crafting"
  | "workshop"
  | "achievements"
  | "leaderboard"
  | "trade"
  | "mail"
  | "events"
  | "tournament"
  | "boost"
  | "pass"
  | "profile"
  | "daily"
  | "friends"
  | "chat"
  | "guild"
  | "spectate"
  | "cards-hall"
  | "combat-hall"
  | "raid";

type PlayerLike = {
  gold?: number;
  stardust?: number;
  settings?: { sfxVol?: number | undefined } | undefined;
  battlePass?: { activeSeasonId?: string };
};

type NavItem = {
  tab: AppTab;
  label: string;
  icon: LucideIcon;
  match: AppTab[];
  testId: string;
};

const primaryNav: NavItem[] = [
  { tab: "daily", label: "Home", icon: Home, match: ["daily"], testId: "nav-home" },
  { tab: "collection", label: "Collection", icon: BookOpen, match: ["collection", "cards-hall"], testId: "nav-collection" },
  { tab: "deck", label: "Deck Builder", icon: Layers, match: ["deck"], testId: "nav-deck" },
  { tab: "summon", label: "Summon", icon: Sparkles, match: ["summon"], testId: "nav-summon" },
  { tab: "combat-hall", label: "Battle", icon: Swords, match: ["combat-hall", "battle", "pvp", "tournament", "raid"], testId: "nav-battle" },
  { tab: "shop", label: "Shop", icon: Gift, match: ["shop"], testId: "nav-shop" },
  { tab: "quests", label: "Quests", icon: ScrollText, match: ["quests"], testId: "nav-quests" },
  { tab: "pass", label: "Battle Pass", icon: Award, match: ["pass"], testId: "nav-battle-pass" },
  { tab: "events", label: "Events", icon: Calendar, match: ["events"], testId: "nav-events" },
  { tab: "guild", label: "Guild", icon: Shield, match: ["guild"], testId: "nav-guild" },
  { tab: "friends", label: "Friends", icon: Users, match: ["friends", "chat"], testId: "nav-friends" },
  { tab: "mail", label: "Mail", icon: Mail, match: ["mail"], testId: "nav-mail" },
];

const moreNav: NavItem[] = [
  { tab: "pvp", label: "Ranked PvP", icon: Trophy, match: ["pvp"], testId: "nav-ranked-pvp" },
  { tab: "raid", label: "Raid", icon: Flame, match: ["raid"], testId: "nav-raid" },
  { tab: "crafting", label: "Crafting", icon: Hammer, match: ["crafting", "workshop"], testId: "nav-crafting" },
  { tab: "tournament", label: "Tournament", icon: Flag, match: ["tournament"], testId: "nav-tournament" },
  { tab: "leaderboard", label: "Leaderboard", icon: BarChart3, match: ["leaderboard"], testId: "nav-leaderboard" },
  { tab: "trade", label: "Trade", icon: ArrowLeftRight, match: ["trade"], testId: "nav-trade" },
  { tab: "achievements", label: "Achievements", icon: Star, match: ["achievements"], testId: "nav-achievements" },
  { tab: "cosmetics", label: "Cosmetics", icon: Sparkles, match: ["cosmetics"], testId: "nav-cosmetics" },
  { tab: "boost", label: "Boosts", icon: Zap, match: ["boost"], testId: "nav-boosts" },
  { tab: "chat", label: "Chat", icon: MessageCircle, match: ["chat"], testId: "nav-chat" },
  { tab: "spectate", label: "Spectate", icon: Eye, match: ["spectate"], testId: "nav-spectate" },
  { tab: "catalog", label: "Card Catalog", icon: BookOpen, match: ["catalog"], testId: "nav-card-catalog" },
  { tab: "profile", label: "Profile", icon: User, match: ["profile"], testId: "nav-profile" },
];

function isNavActive(activeTab: AppTab, match: AppTab[]): boolean {
  return match.includes(activeTab);
}

function SidebarPanel({
  item,
  activeTab,
  onTab,
  tabDots,
  unreadMail,
  onNavigate,
}: {
  item: NavItem;
  activeTab: AppTab;
  onTab: (tab: AppTab) => void;
  tabDots?: Partial<Record<AppTab, boolean>>;
  unreadMail: number;
  onNavigate: () => void;
}) {
  const active = isNavActive(activeTab, item.match);
  const Icon = item.icon;
  const showMailBadge = item.tab === "mail" && unreadMail > 0;
  const showDot = item.match.some((t) => tabDots?.[t]);

  return (
    <button
      type="button"
      data-testid={item.testId}
      onClick={() => {
        onTab(item.tab);
        onNavigate();
      }}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-2.5 font-heading text-[13px] tracking-wide transition-colors",
        "hover:bg-[rgba(245,200,66,0.08)] hover:text-[#f8e4a1]",
        active
          ? "border-l-2 border-[#f5c842] bg-[rgba(245,200,66,0.1)] text-[#f8e4a1] font-semibold"
          : "border-l-2 border-transparent text-[#c9a74a]",
      )}
    >
      <Icon size={16} strokeWidth={2} className={cn("shrink-0", active ? "text-[#f5c842]" : "text-[#9a7b3c]")} />
      <span className="flex-1 text-left">{item.label}</span>
      {showMailBadge && (
        <span className="text-[10px] font-bold text-[#0A0A0A] bg-[#f5c842] rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
          {unreadMail > 99 ? "99+" : unreadMail}
        </span>
      )}
      {showDot && !showMailBadge && (
        <span
          className="w-2 h-2 rounded-full bg-red-500 shrink-0"
          style={{ boxShadow: "0 0 8px rgba(239,68,68,0.6)" }}
        />
      )}
      {active && <ChevronRight size={14} className="text-[#f5c842] shrink-0" />}
    </button>
  );
}

function SidebarInner({
  playerState,
  unreadMail,
  activeTab,
  onTab,
  settingsNode,
  tabDots,
  onNavigate,
}: {
  playerState: PlayerLike;
  unreadMail: number;
  activeTab: AppTab;
  onTab: (tab: AppTab) => void;
  settingsNode: React.ReactNode;
  tabDots?: Partial<Record<AppTab, boolean>>;
  onNavigate: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(() => moreNav.some((m) => isNavActive(activeTab, m.match)));
  const [muted, setMuted] = useState(false);
  const prevVolRef = useRef(0.8);

  const seasonId = (playerState.battlePass?.activeSeasonId ?? ACTIVE_BATTLE_PASS_SEASON_ID) as string;
  const season = BATTLE_PASS_SEASONS.find((s) => s.id === seasonId) ?? BATTLE_PASS_SEASONS[0];

  useEffect(() => {
    const v = typeof playerState.settings?.sfxVol === "number" ? playerState.settings.sfxVol : 0.8;
    setMuted(v <= 0.0001);
    prevVolRef.current = v > 0.0001 ? v : prevVolRef.current;
  }, [playerState.settings?.sfxVol]);

  useEffect(() => {
    if (moreNav.some((m) => isNavActive(activeTab, m.match))) setMoreOpen(true);
  }, [activeTab]);

  const toggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    setSfxVolume(nextMuted ? 0 : prevVolRef.current || 0.8);
  };

  const moreHasDot = moreNav.some((m) => m.match.some((t) => tabDots?.[t]));
  const moreActive = moreNav.some((m) => isNavActive(activeTab, m.match));

  return (
    <div className="flex h-full flex-col">
      <div className="p-4 pb-3 shrink-0">
        <button
          type="button"
          className="flex items-center gap-3 w-full text-left"
          data-testid="logo-link"
          onClick={() => {
            onTab("daily");
            onNavigate();
          }}
        >
          <div
            className="relative w-10 h-10 shrink-0 flex items-center justify-center font-heading font-black text-[#0A0A0A] text-lg"
            style={{
              background: "linear-gradient(135deg, #f5c842, #d4af37 55%, #7a5a10)",
              clipPath: "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)",
              boxShadow: "0 0 20px rgba(245,200,66,0.55)",
            }}
          >
            MA
          </div>
          <div className="leading-tight min-w-0">
            <div className="font-heading text-[15px] gold-text tracking-widest truncate">MYTHIC ARCANA</div>
            <div className="font-stat text-[9px] tracking-[0.28em] text-[#c9a74a] truncate">Lorebound Legends</div>
          </div>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-1 min-h-0">
        {primaryNav.map((item) => (
          <SidebarPanel
            key={item.testId}
            item={item}
            activeTab={activeTab}
            onTab={onTab}
            tabDots={tabDots}
            unreadMail={unreadMail}
            onNavigate={onNavigate}
          />
        ))}

        <div className="px-2 pt-1">
          <button
            type="button"
            data-testid="nav-more"
            onClick={() => setMoreOpen((o) => !o)}
            className={cn(
              "flex w-full items-center gap-2 px-4 py-2.5 font-heading text-[13px] tracking-wide transition-colors",
              moreActive || moreOpen ? "text-[#f8e4a1]" : "text-[#c9a74a] hover:text-[#f8e4a1]",
            )}
          >
            <ChevronDown
              size={14}
              className={cn("transition-transform text-[#9a7b3c]", moreOpen && "rotate-180")}
            />
            <span className="flex-1 text-left">More</span>
            {moreHasDot && (
              <span
                className="w-2 h-2 rounded-full bg-red-500"
                style={{ boxShadow: "0 0 8px rgba(239,68,68,0.6)" }}
              />
            )}
          </button>
          {moreOpen &&
            moreNav.map((item) => (
              <SidebarPanel
                key={item.testId}
                item={item}
                activeTab={activeTab}
                onTab={onTab}
                tabDots={tabDots}
                unreadMail={unreadMail}
                onNavigate={onNavigate}
              />
            ))}
        </div>
      </nav>

      <div className="shrink-0 p-3 space-y-3 border-t border-[rgba(212,175,55,0.18)]">
        <div className="flex flex-col gap-2">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{
              background: "linear-gradient(180deg, rgba(30,18,5,0.95), rgba(10,6,3,0.95))",
              border: "1px solid rgba(212,175,55,0.35)",
            }}
            data-testid="currency-gold"
          >
            <GoldCurrencyIcon className="w-[16px] h-[16px] shrink-0" />
            <span className="font-stat font-bold text-[#f8e4a1] text-sm tabular-nums">
              {Number(playerState.gold) || 0}
            </span>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{
              background: "linear-gradient(180deg, rgba(20,6,36,0.95), rgba(10,3,20,0.95))",
              border: "1px solid rgba(186,104,200,0.45)",
            }}
            data-testid="currency-stardust"
          >
            <StardustCurrencyIcon className="w-[16px] h-[16px] shrink-0" />
            <span className="font-stat font-bold text-[#e1bee7] text-sm tabular-nums">
              {Number(playerState.stardust) || 0}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {settingsNode}
          <button
            type="button"
            onClick={toggleMute}
            data-testid="mute-btn"
            title={muted ? "Unmute" : "Mute"}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition shrink-0"
            style={{
              background: "rgba(10,6,3,0.6)",
              border: "1px solid rgba(212,175,55,0.3)",
              color: muted ? "#ff7043" : "#c9a74a",
            }}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>

        {season && (
          <div
            className="rounded-lg px-3 py-2 text-[10px] leading-snug"
            style={{
              background: "rgba(245,200,66,0.06)",
              border: "1px solid rgba(212,175,55,0.2)",
            }}
          >
            <div className="font-heading text-[#f5c842] tracking-wider uppercase">{season.title}</div>
            <div className="text-[#9a7b3c] mt-0.5">Active — keep battling!</div>
          </div>
        )}
      </div>
    </div>
  );
}

const sidebarSurfaceStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(12,8,4,0.98), rgba(7,5,3,0.99))",
  boxShadow: "4px 0 24px rgba(0,0,0,0.45)",
  borderRight: "1px solid rgba(212,175,55,0.22)",
};

export function AppSidebar(props: {
  playerState: PlayerLike;
  unreadMail: number;
  activeTab: AppTab;
  onTab: (tab: AppTab) => void;
  settingsNode: React.ReactNode;
  tabDots?: Partial<Record<AppTab, boolean>>;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}) {
  const { mobileOpen, onMobileOpenChange, ...inner } = props;

  return (
    <>
      <aside
        data-testid="app-sidebar"
        className="hidden md:flex fixed left-0 top-0 z-50 h-screen w-[248px] flex-col"
        style={sidebarSurfaceStyle}
      >
        <SidebarInner {...inner} onNavigate={() => {}} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          className="w-[min(280px,88vw)] p-0 border-r border-[rgba(212,175,55,0.22)] [&>button]:hidden"
          style={sidebarSurfaceStyle}
        >
          <div className="flex items-center justify-end p-2 border-b border-[rgba(212,175,55,0.15)]">
            <button
              type="button"
              onClick={() => onMobileOpenChange(false)}
              className="p-2 text-[#c9a74a] hover:text-[#f5c842]"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>
          <SidebarInner {...inner} onNavigate={() => onMobileOpenChange(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Mobile top bar with menu trigger */
export function AppMobileNavBar({
  onOpenMenu,
}: {
  onOpenMenu: () => void;
}) {
  return (
    <header
      className="md:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-3 border-b border-[rgba(212,175,55,0.2)] backdrop-blur-md"
      style={{ background: "linear-gradient(180deg, rgba(10,6,3,0.95), rgba(10,6,3,0.75))" }}
    >
      <button
        type="button"
        onClick={onOpenMenu}
        data-testid="sidebar-trigger"
        className="w-9 h-9 rounded-lg flex items-center justify-center text-[#c9a74a] hover:text-[#f5c842] hover:bg-[rgba(245,200,66,0.08)]"
        style={{ border: "1px solid rgba(212,175,55,0.25)" }}
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>
      <span className="font-heading text-sm gold-text tracking-widest">MYTHIC ARCANA</span>
    </header>
  );
}
