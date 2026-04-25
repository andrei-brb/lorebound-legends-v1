import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Gift,
  Layers,
  Menu,
  Swords,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GoldCurrencyIcon, StardustCurrencyIcon } from "@/components/CurrencyIcons";
import { setSfxVolume } from "@/lib/sfx";

type Tab =
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
};

const primaryTabs: { tab: Tab; label: string; icon: React.ElementType }[] = [
  { tab: "collection", label: "Cards", icon: BookOpen },
  { tab: "deck", label: "Deck", icon: Layers },
  { tab: "summon", label: "Summon", icon: Gift },
  { tab: "combat-hall", label: "Battle", icon: Swords },
  { tab: "daily", label: "Grow", icon: Trophy },
  { tab: "friends", label: "Social", icon: Users },
];

const moreTabs: { tab: Tab; label: string; icon: React.ElementType; tint: string }[] = [
  { tab: "pass", label: "Battle Pass", icon: Trophy, tint: "#f5c842" },
  { tab: "events", label: "Events", icon: Trophy, tint: "#ba68c8" },
  { tab: "shop", label: "Shop", icon: Gift, tint: "#ff9800" },
  { tab: "crafting", label: "Crafting", icon: Trophy, tint: "#bcaaa4" },
  { tab: "pvp", label: "Ranked", icon: Swords, tint: "#FFC107" },
  { tab: "pvp", label: "PvP", icon: Swords, tint: "#42a5f5" },
  { tab: "raid", label: "Raid", icon: Swords, tint: "#ff5722" },
  { tab: "profile", label: "Profile", icon: Trophy, tint: "#f5c842" },
  { tab: "achievements", label: "Achievements", icon: Trophy, tint: "#FFC107" },
  { tab: "guild", label: "Guild", icon: Users, tint: "#42a5f5" },
  { tab: "tournament", label: "Tournament", icon: Trophy, tint: "#ffb300" },
  { tab: "quests", label: "Quests", icon: Trophy, tint: "#f5c842" },
  { tab: "cosmetics", label: "Cosmetics", icon: Trophy, tint: "#ba68c8" },
  { tab: "boost", label: "Boosts", icon: Gift, tint: "#ba68c8" },
  { tab: "chat", label: "Chat", icon: Users, tint: "#42a5f5" },
  { tab: "mail", label: "Mail", icon: Trophy, tint: "#ff9800" },
  { tab: "friends", label: "Friends", icon: Users, tint: "#4CAF50" },
  { tab: "trade", label: "Trade", icon: ArrowLeftRightIcon, tint: "#bcaaa4" },
  { tab: "spectate", label: "Spectate", icon: Users, tint: "#9c27b0" },
  { tab: "catalog", label: "Card Catalog", icon: BookOpen, tint: "#f5c842" },
];

function getPrimaryLabel(activeTab: Tab): "cards" | "deck" | "summon" | "battle" | "grow" | "social" {
  if (activeTab === "deck") return "deck";
  if (activeTab === "summon") return "summon";
  if (["combat-hall", "battle", "pvp", "tournament", "raid"].includes(activeTab)) return "battle";
  if (["daily", "pass", "quests", "workshop", "achievements", "boost", "profile", "events"].includes(activeTab)) return "grow";
  if (["friends", "chat", "guild", "mail", "trade", "leaderboard", "spectate"].includes(activeTab)) return "social";
  return "cards";
}

function ArrowLeftRightIcon(props: { size?: number; className?: string; style?: React.CSSProperties }) {
  // lucide ArrowLeftRight is used in Index.tsx imports; we avoid a heavy dependency here by rendering a simple glyph.
  // If you want the real icon later, we can import it and remove this shim.
  const size = props.size ?? 18;
  return (
    <span
      aria-hidden="true"
      className={props.className}
      style={{ ...props.style, fontSize: size, lineHeight: 1 }}
    >
      ⇄
    </span>
  );
}

export function TopNavTabs(props: {
  playerState: PlayerLike;
  unreadMail: number;
  activeTab: Tab;
  onTab: (tab: Tab) => void;
  settingsNode: React.ReactNode;
}) {
  const { playerState, unreadMail, activeTab, onTab, settingsNode } = props;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const [muted, setMuted] = useState(false);
  const prevVolRef = useRef<number>(0.8);

  useEffect(() => {
    const v = typeof playerState.settings?.sfxVol === "number" ? playerState.settings.sfxVol : 0.8;
    // Keep visual mute state in sync with current volume.
    setMuted(v <= 0.0001);
    prevVolRef.current = v > 0.0001 ? v : prevVolRef.current;
  }, [playerState.settings?.sfxVol]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const toggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    const nextVol = nextMuted ? 0 : prevVolRef.current || 0.8;
    setSfxVolume(nextVol);
    // NOTE: actual persistence of settings.sfxVol is done by SettingsPanel.
    // We keep this as a quick-toggle for UX; we’ll wire persistence in the next pass.
  };

  return (
    <header
      data-testid="top-nav"
      className="sticky top-0 z-50 flex items-center justify-between px-5 md:px-10 py-4 backdrop-blur-md"
      style={{
        background: "linear-gradient(180deg, rgba(10,6,3,0.92), rgba(10,6,3,0.55))",
        borderBottom: "1px solid rgba(212,175,55,0.25)",
        boxShadow: "0 4px 30px rgba(0,0,0,0.7)",
      }}
    >
      <button
        type="button"
        className="flex items-center gap-3"
        data-testid="logo-link"
        onClick={() => {
          onTab("daily");
        }}
      >
        <div
          className="relative w-10 h-10 flex items-center justify-center font-heading font-black text-[#0A0A0A] text-lg"
          style={{
            background: "linear-gradient(135deg, #f5c842, #d4af37 55%, #7a5a10)",
            clipPath: "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)",
            boxShadow: "0 0 20px rgba(245,200,66,0.55)",
          }}
        >
          MA
        </div>
        <div className="leading-tight hidden sm:block">
          <div className="font-heading text-[18px] gold-text tracking-widest">MYTHIC ARCANA</div>
          <div className="font-stat text-[10px] tracking-[0.3em] text-[#c9a74a]">Lorebound Legends</div>
        </div>
      </button>

      <nav className="hidden md:flex items-center gap-2">
        {primaryTabs.map(({ tab, label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              onTab(tab);
            }}
            data-testid={`nav-${label.toLowerCase()}`}
            className={cn("btn-ghost flex items-center gap-2", getPrimaryLabel(activeTab) === label.toLowerCase() ? "active" : "")}
          >
            <Icon size={14} strokeWidth={2.2} />
            {label}
          </button>
        ))}

        <div className="relative" ref={ref}>
          <button
            type="button"
            className={cn("btn-ghost flex items-center gap-2", open ? "active" : "")}
            onClick={() => setOpen((o) => !o)}
            data-testid="nav-more"
          >
            <Menu size={14} /> More
          </button>
          {open && (
            <div
              data-testid="more-drawer"
              className="absolute right-0 mt-3 w-[420px] panel-gold p-3 z-50"
              style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.9), 0 0 30px rgba(245,200,66,0.2)" }}
            >
              <div className="corner-deco absolute inset-0" />
              <div className="relative z-10 font-heading text-[#f5c842] tracking-[0.25em] text-xs mb-3 pl-2 flex justify-between items-center">
                <span>HALLS OF THE ALTAR</span>
                <button type="button" onClick={() => setOpen(false)} className="text-[#c9a74a] hover:text-[#f5c842]">
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 relative z-10">
                {moreTabs.map(({ tab, label, icon: Icon, tint }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      onTab(tab);
                      setOpen(false);
                    }}
                    data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                    className="relative flex flex-col items-center gap-1.5 p-3 rounded transition hover:bg-[rgba(245,200,66,0.08)]"
                    style={{
                      background: "linear-gradient(180deg, rgba(22,15,8,0.7), rgba(10,6,3,0.5))",
                      border: "1px solid rgba(212,175,55,0.15)",
                    }}
                  >
                    <Icon size={18} style={{ color: tint }} />
                    <span className="font-heading text-[11px] tracking-[0.1em] text-[#f8e4a1] text-center">
                      {label}
                      {label === "Mail" && unreadMail > 0 && (
                        <span className="ml-1 text-[10px] font-bold text-[#0A0A0A] bg-[#f5c842] rounded-full px-1.5 py-0.5">
                          {unreadMail > 99 ? "99+" : unreadMail}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>

      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            background: "linear-gradient(180deg, rgba(30,18,5,0.95), rgba(10,6,3,0.95))",
            border: "1px solid rgba(212,175,55,0.45)",
          }}
          data-testid="currency-gold"
        >
          <GoldCurrencyIcon className="w-[18px] h-[18px]" />
          <span className="font-stat font-bold text-[#f8e4a1] text-sm">{Number(playerState.gold) || 0}</span>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            background: "linear-gradient(180deg, rgba(20,6,36,0.95), rgba(10,3,20,0.95))",
            border: "1px solid rgba(186,104,200,0.5)",
          }}
          data-testid="currency-stardust"
        >
          <StardustCurrencyIcon className="w-[18px] h-[18px]" />
          <span className="font-stat font-bold text-[#e1bee7] text-sm">{Number(playerState.stardust) || 0}</span>
        </div>

        {settingsNode}

        <button
          type="button"
          onClick={toggleMute}
          data-testid="mute-btn"
          title={muted ? "Unmute" : "Mute"}
          className="w-9 h-9 rounded-full flex items-center justify-center transition"
          style={{
            background: "rgba(10,6,3,0.6)",
            border: "1px solid rgba(212,175,55,0.3)",
            color: muted ? "#ff7043" : "#c9a74a",
          }}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>
    </header>
  );
}

