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

type Category = "cards" | "summon-cat" | "battle" | "grow" | "social";
type Tab =
  | "collection"
  | "catalog"
  | "cosmetics"
  | "deck"
  | "battle"
  | "pvp"
  | "summon"
  | "quests"
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

const primaryTabs: { cat: Category; tab: Tab; label: string; icon: React.ElementType }[] = [
  { cat: "cards", tab: "collection", label: "Cards", icon: BookOpen },
  { cat: "summon-cat", tab: "deck", label: "Deck", icon: Layers },
  { cat: "summon-cat", tab: "summon", label: "Summon", icon: Gift },
  { cat: "battle", tab: "combat-hall", label: "Battle", icon: Swords },
  { cat: "grow", tab: "daily", label: "Grow", icon: Trophy },
  { cat: "social", tab: "friends", label: "Social", icon: Users },
];

const moreTabs: { cat: Category; tab: Tab; label: string; icon: React.ElementType; tint: string }[] = [
  // NOTE: icons and exact mapping will be expanded as we port each hall UI.
  { cat: "battle", tab: "tournament", label: "Tournament", icon: Trophy, tint: "#ffb300" },
  { cat: "battle", tab: "pvp", label: "PvP", icon: Swords, tint: "#42a5f5" },
  { cat: "social", tab: "mail", label: "Mail", icon: Trophy, tint: "#ff9800" },
  { cat: "social", tab: "trade", label: "Trade", icon: ArrowLeftRightIcon, tint: "#bcaaa4" },
  { cat: "social", tab: "leaderboard", label: "Leaderboard", icon: Trophy, tint: "#f5c842" },
  { cat: "cards", tab: "catalog", label: "Catalog", icon: BookOpen, tint: "#f5c842" },
];

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
  activeCategory: Category;
  onCategory: (cat: Category) => void;
  onTab: (tab: Tab) => void;
  settingsNode: React.ReactNode;
}) {
  const { playerState, unreadMail, activeCategory, onCategory, onTab, settingsNode } = props;
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
          onCategory("grow");
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
        {primaryTabs.map(({ cat, tab, label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              onCategory(cat);
              onTab(tab);
            }}
            data-testid={`nav-${label.toLowerCase()}`}
            className={cn("btn-ghost flex items-center gap-2", activeCategory === cat ? "active" : "")}
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
                {moreTabs.map(({ cat, tab, label, icon: Icon, tint }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      onCategory(cat);
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

