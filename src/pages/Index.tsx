import { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from "react";
import { BookOpen, Layers, Swords, Coins, Sparkles as SparklesIcon, Grid3X3, Loader2, ScrollText, Hammer, Trophy, ArrowLeftRight, BarChart3, Calendar, Zap, Crown, Shield, Mail, User, Gift, Users, MessageCircle, Eye, Flag, Flame } from "lucide-react";
import TabTransition from "@/components/TabTransition";
import TutorialOverlay from "@/components/TutorialOverlay";
import CollectionView from "@/components/CollectionView";
import CosmeticsHall from "@/components/halls/CosmeticsHall";
const BattleArena = lazy(() => import("@/components/BattleArena"));
import PackShop from "@/components/PackShop";
import CardCatalog from "@/components/CardCatalog";
import Tournament from "@/components/Tournament";
import Onboarding from "@/components/Onboarding";
import PvPPanel from "@/components/PvPPanel";
import SettingsPanel from "@/components/SettingsPanel";
// New glass+hex hall tabs
import TradeHall from "@/components/TradeHall";
import QuestsHall from "@/components/halls/QuestsHall";
import WorkshopHall from "@/components/halls/WorkshopHall";
import BadgesHall from "@/components/halls/BadgesHall";
import PassHall from "@/components/halls/PassHall";
import BoostHall from "@/components/halls/BoostHall";
import EventsHall from "@/components/halls/EventsHall";
import MailHall from "@/components/halls/MailHall";
import RanksHall from "@/components/halls/RanksHall";
import FriendsHall from "@/components/halls/FriendsHall";
import ChatHall from "@/components/halls/ChatHall";
import GuildHall from "@/components/halls/GuildHall";
import SpectateHall from "@/components/halls/SpectateHall";
import ProfileHall from "@/components/halls/ProfileHall";
import DailyHall from "@/components/halls/DailyHall";
import GrowHub from "@/components/grow/GrowHub";
import CardsHall from "@/components/halls/CardsHall";
import CombatHall from "@/components/halls/CombatHall";
const LivePvPBattleground = lazy(() => import("@/components/LivePvPBattleground"));
const RaidCoopArena = lazy(() => import("@/components/RaidCoopArena"));
const RaidLiveBattleground = lazy(() => import("@/components/RaidLiveBattleground"));
import { initRaidCoopBattle, type RaidCoopState } from "@/lib/raid/raidCoopEngine";
import { getRaidBoss } from "@/lib/raid/bosses";
import { cn } from "@/lib/utils";
import { usePlayerApi } from "@/lib/usePlayerApi";
import { loadAchievementState, checkNewAchievements, saveAchievementState } from "@/lib/achievementEngine";
import { getBattlePassLevelFromXp, getBattlePassSeasonProgress } from "@/lib/battlePassEngine";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/apiClient";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { setSfxVolume } from "@/lib/sfx";
import { GoldCurrencyIcon, StardustCurrencyIcon } from "@/components/CurrencyIcons";
import { TopNavTabs } from "@/components/TopNavTabs";
import SummonAltar from "@/components/summon/SummonAltar";
import ChroniclersHall from "@/components/social/ChroniclersHall";
import DeckGrimoire from "@/components/deck/DeckGrimoire";
import ShopScreen from "@/components/shop/ShopScreen";
import CraftingScreen from "@/components/crafting/CraftingScreen";
import { allGameCards, type CardType, type Rarity } from "@/data/cardIndex";

type Tab = "collection" | "catalog" | "cosmetics" | "deck" | "battle" | "pvp" | "summon" | "shop" | "quests" | "crafting" | "workshop" | "achievements" | "leaderboard" | "trade" | "mail" | "events" | "tournament" | "boost" | "pass" | "profile" | "daily" | "friends" | "chat" | "guild" | "spectate" | "cards-hall" | "combat-hall" | "raid";
export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>("collection");
  const [battleDeckIds, setBattleDeckIds] = useState<string[]>([]);
  const [soloRaidBossId, setSoloRaidBossId] = useState<string | null>(null);
  const [deckSelectOpen, setDeckSelectOpen] = useState(false);
  const [deckSelectTitle, setDeckSelectTitle] = useState<string>("Select your deck");
  const [deckSelectSubtitle, setDeckSelectSubtitle] = useState<string>("Choose a saved deck to enter the arena.");
  const deckSelectOnPickRef = useRef<((deckIds: string[]) => void) | null>(null);
  const [raidHotseat, setRaidHotseat] = useState<{ bossId: string; deckIds: string[] } | null>(null);
  const [raidState, setRaidState] = useState<RaidCoopState | null>(null);
  const [pendingCombat, setPendingCombat] = useState<{
    kind: "raid-solo" | "raid-hotseat";
    bossId: string;
  } | null>(null);
  const [rankedBattle, setRankedBattle] = useState<{
    matchId: number;
    opponentName: string;
    opponentDeckIds: string[];
    seed: number | null;
  } | null>(null);
  const [unreadMail, setUnreadMail] = useState(0);
  const lastUnreadMailRef = useRef<number | null>(null);
  const shownInviteIdsRef = useRef<Set<number>>(new Set());
  const [pvpInvitePopup, setPvpInvitePopup] = useState<{
    notifId: number; matchId: number; title: string; body?: string | null;
  } | null>(null);
  const [guildInvitePopup, setGuildInvitePopup] = useState<{
    inviteId: number;
    guildName: string;
    guildTag: string;
    fromUsername: string;
  } | null>(null);
  const [tabDots, setTabDots] = useState<Partial<Record<Tab, boolean>>>({});

  // Cards/Collection UI filters (visual redesign only; CollectionView remains source of truth)
  const [collectionQuery, setCollectionQuery] = useState("");
  const [collectionType, setCollectionType] = useState<"all" | CardType>("all");
  const [collectionRarity, setCollectionRarity] = useState<"all" | Rarity>("all");
  const { playerState, setPlayerState, status, isOnline, pullCards, submitBattleResult, completeOnboarding, syncEconomy, craftFuse, craftSacrifice, applyDub, pullSeasonalPack, claimDailyLogin, startPveBattle } = usePlayerApi();
  const isDiscordActivityHost = typeof window !== "undefined" && window.location.hostname.endsWith("discordsays.com");
  const discordOverlayInset = "calc(64px + env(safe-area-inset-top))";
  const ambientParticles = useMemo(
    () => Array.from({ length: 20 }).map(() => ({
      left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 8}s`, animationDuration: `${6 + Math.random() * 8}s`,
    })), []
  );

  // Sync sfx volume from settings on every change
  useEffect(() => {
    const v = playerState.settings?.sfxVol;
    if (typeof v === "number") setSfxVolume(v);
  }, [playerState.settings?.sfxVol]);

  useEffect(() => {
    if (!playerState.hasCompletedOnboarding) return;
    const achieveState = loadAchievementState();
    const { achieveState: newState, newlyUnlocked } = checkNewAchievements(achieveState, playerState);
    if (newlyUnlocked.length > 0) {
      saveAchievementState(newState);
      for (const ach of newlyUnlocked) { toast({ title: `${ach.icon} Achievement Unlocked!`, description: ach.title }); }
    }
  }, [playerState]);

  useEffect(() => {
    if (!isOnline) return;
    let alive = true;
    const tick = async () => {
      try {
        const data = await api.getNotificationUnreadCount();
        const next = Number(data.unread) || 0;
        const prev = lastUnreadMailRef.current;
        lastUnreadMailRef.current = next;
        if (alive) setUnreadMail(next);

        // Best-effort nav dots: mail, friends, trade, pvp, guild, pass, grow.
        // Where we don't have backend support yet (e.g. unread chat), we keep dots off for now.
        try {
          const [friendsRes, guildInvRes, notifRes] = await Promise.all([
            api.getFriends(),
            api.getIncomingGuildInvites(10),
            api.getNotifications(50),
          ]);
          const incomingFriends = (friendsRes.incoming || []).length;
          const guildInvites = (guildInvRes.invites || []).length;
          const notifs = notifRes.notifications || [];
          const unreadNotifs = notifs.filter((n) => !n.readAt);
          const hasTrade = unreadNotifs.some((n) => n.type.startsWith("trade_") || n.type.startsWith("market_"));
          const hasPvp = unreadNotifs.some((n) => n.type.startsWith("pvp_") || n.type === "pvp_live_invite");
          const hasGuild = guildInvites > 0 || unreadNotifs.some((n) => n.type.startsWith("guild_"));

          const today = new Date().toISOString().slice(0, 10);
          const claimedToday = playerState.dailyLogin?.lastClaimDate === today;

          let hasUnclaimedPass = false;
          if (playerState.battlePass?.activeSeasonId) {
            const sid = playerState.battlePass.activeSeasonId;
            const sp = getBattlePassSeasonProgress(playerState, sid);
            const currentLevel = getBattlePassLevelFromXp(sp.xp);
            for (let lvl = 1; lvl <= currentLevel; lvl++) {
              const freeUnclaimed = !sp.claimedFreeLevels.includes(lvl);
              const eliteUnclaimed = sp.hasElite && !sp.claimedEliteLevels.includes(lvl);
              if (freeUnclaimed || eliteUnclaimed) { hasUnclaimedPass = true; break; }
            }
          }

          if (alive) {
            setTabDots({
              mail: next > 0,
              friends: incomingFriends > 0,
              trade: hasTrade,
              pvp: hasPvp,
              guild: hasGuild,
              pass: hasUnclaimedPass,
              daily: !claimedToday,
            });
          }
        } catch { /* ignore */ }

        if (next > 0 && (prev === null || next > prev)) {
          try {
            const latest = await api.getNotifications(5);
            const notifs = latest.notifications || [];
            const liveInvite = notifs.find(
              (n) => n.type === "pvp_live_invite" && !n.readAt && !shownInviteIdsRef.current.has(n.id)
            );
            if (liveInvite) {
              const matchId = Number(
                typeof liveInvite.data === "object" && liveInvite.data !== null && "matchId" in liveInvite.data
                  ? (liveInvite.data as Record<string, unknown>).matchId
                  : NaN
              );
              if (Number.isFinite(matchId) && matchId > 0) {
                shownInviteIdsRef.current.add(liveInvite.id);
                if (alive) setPvpInvitePopup({ notifId: liveInvite.id, matchId, title: liveInvite.title, body: liveInvite.body });
                return;
              }
            }
            if (prev !== null && next > prev) {
              const n = notifs[0];
              toast({ title: n?.title || "New mail", description: n?.body || `You have ${next} unread message${next === 1 ? "" : "s"}.` });
            }
          } catch {
            if (prev !== null && next > prev) toast({ title: "New mail", description: `You have ${next} unread message${next === 1 ? "" : "s"}.` });
          }
        }
      } catch { /* ignore */ }
    };
    tick();
    const id = window.setInterval(tick, 8000);
    return () => { alive = false; window.clearInterval(id); };
  }, [isOnline, playerState]);

  // Presence heartbeat — keeps friends/guild members "online"
  useEffect(() => {
    if (!isOnline) return;
    let alive = true;
    const beat = () => { api.presenceHeartbeat().catch(() => {}); };
    beat();
    const id = window.setInterval(() => { if (alive) beat(); }, 60000);
    return () => { alive = false; window.clearInterval(id); };
  }, [isOnline]);

  const patchRaid = useCallback((fn: (r: RaidCoopState) => void) => {
    setRaidState((prev) => {
      if (!prev) return prev;
      fn(prev);
      return { ...prev };
    });
  }, []);

  useEffect(() => {
    if (!raidHotseat) {
      setRaidState(null);
      return;
    }
    const boss = getRaidBoss(raidHotseat.bossId);
    if (!boss) return;
    setRaidState(initRaidCoopBattle(raidHotseat.deckIds, raidHotseat.deckIds, boss));
  }, [raidHotseat]);

  const openDeckSelect = useCallback(
    (opts: { title: string; subtitle: string; onPick: (deckIds: string[]) => void }) => {
      const presets = Array.isArray(playerState.deckPresets) ? playerState.deckPresets : [];
      if (presets.length === 0) {
        // No saved decks yet → send them to the deck builder.
        setActiveTab("deck");
        return;
      }
      setDeckSelectTitle(opts.title);
      setDeckSelectSubtitle(opts.subtitle);
      deckSelectOnPickRef.current = opts.onPick;
      setDeckSelectOpen(true);
    },
    [playerState.deckPresets],
  );

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground text-sm">Loading your adventure...</p>
        </div>
      </div>
    );
  }

  if (!playerState.hasCompletedOnboarding) {
    return <Onboarding playerState={playerState} onComplete={(newState) => setPlayerState(newState)} isOnline={isOnline} completeOnboardingApi={completeOnboarding} />;
  }

  const handleTabClick = (tabId: Tab) => setActiveTab(tabId);

  const startBattle = (deckIds: string[]) => {
    setRankedBattle(null);
    setSoloRaidBossId(null);
    setRaidHotseat(null);
    setRaidState(null);
    setBattleDeckIds(deckIds);
    setActiveTab("battle");
  };

  const acceptInvitePopup = async () => {
    if (!pvpInvitePopup) return;
    const { notifId, matchId } = pvpInvitePopup;
    try {
      await api.pvpLiveJoin(matchId);
      await api.markNotificationsRead([notifId]);
      sessionStorage.setItem("pvp.live.matchId", String(matchId));
      setPvpInvitePopup(null);
      setRankedBattle(null);
      setBattleDeckIds([]);
      setActiveTab("battle");
      toast({ title: "⚔ Match accepted!", description: `Joining match #${matchId}` });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Could not accept invite";
      toast({ title: "Accept failed", description: message });
    }
  };

  const declineInvitePopup = async () => {
    if (!pvpInvitePopup) return;
    const { notifId, matchId } = pvpInvitePopup;
    try {
      await api.pvpLiveDecline(matchId);
      await api.markNotificationsRead([notifId]);
      setPvpInvitePopup(null);
      toast({ title: "Invite declined" });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Could not decline invite";
      toast({ title: "Decline failed", description: message });
    }
  };

  const acceptGuildInvitePopup = async () => {
    if (!guildInvitePopup) return;
    const { inviteId, guildName, guildTag, fromUsername } = guildInvitePopup;
    try {
      await api.respondGuildInvite(inviteId, true);
      setGuildInvitePopup(null);
      toast({ title: "Joined guild", description: `Welcome to ${guildName} [${guildTag}] — invited by ${fromUsername}.` });
      setActiveTab("guild");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Could not accept invite";
      toast({ title: "Accept failed", description: message, variant: "destructive" });
    }
  };

  const declineGuildInvitePopup = async () => {
    if (!guildInvitePopup) return;
    const { inviteId } = guildInvitePopup;
    try {
      await api.respondGuildInvite(inviteId, false);
      setGuildInvitePopup(null);
      toast({ title: "Invite declined" });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Could not decline invite";
      toast({ title: "Decline failed", description: message, variant: "destructive" });
    }
  };

  const liveMatchIdFromInbox = typeof window !== "undefined" ? Number(sessionStorage.getItem("pvp.live.matchId") || "") : NaN;
  const hasLiveMatchFromInbox = Number.isFinite(liveMatchIdFromInbox) && liveMatchIdFromInbox > 0;

  const raidLiveMatchIdFromInbox =
    typeof window !== "undefined" ? Number(sessionStorage.getItem("raid.live.matchId") || "") : NaN;
  const hasRaidLiveMatchFromInbox = Number.isFinite(raidLiveMatchIdFromInbox) && raidLiveMatchIdFromInbox > 0;

  /** Hide top nav (logo, currency, category + sub-tabs) while an active battle UI is shown */
  const hideAppChromeDuringBattle =
    activeTab === "battle" &&
    (battleDeckIds.length > 0 ||
      hasLiveMatchFromInbox ||
      hasRaidLiveMatchFromInbox ||
      (raidHotseat != null && raidState != null));

  return (
    <TooltipProvider>
      {deckSelectOpen && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/70 px-4 animate-fade-in">
          <div
            className="relative w-full max-w-2xl panel-gold p-5 md:p-6 overflow-hidden"
            style={{ boxShadow: "0 30px 90px rgba(0,0,0,0.85), 0 0 40px rgba(245,200,66,0.18)" }}
            data-testid="deck-select-modal"
          >
            <div className="corner-deco absolute inset-0" />
            <div className="relative z-10">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="section-heading mb-1">{deckSelectTitle}</div>
                  <div className="font-lore text-[#d6c293] text-sm">{deckSelectSubtitle}</div>
                </div>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setDeckSelectOpen(false);
                    deckSelectOnPickRef.current = null;
                  }}
                  data-testid="deck-select-close"
                >
                  Close
                </button>
              </div>

              <div
                className="rounded-xl p-3 md:p-4"
                style={{ background: "rgba(10,6,3,0.55)", border: "1px solid rgba(212,175,55,0.18)" }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(Array.isArray(playerState.deckPresets) ? playerState.deckPresets : [])
                    .slice()
                    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
                    .map((p) => {
                      const underMin = (p.cardIds?.length ?? 0) < 4;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          disabled={underMin}
                          onClick={() => {
                            if (underMin) return;
                            const cb = deckSelectOnPickRef.current;
                            setDeckSelectOpen(false);
                            deckSelectOnPickRef.current = null;
                            cb?.(p.cardIds || []);
                          }}
                          className={cn(
                            "text-left rounded-xl p-4 transition relative overflow-hidden",
                            underMin ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.01]",
                          )}
                          style={{
                            background:
                              "linear-gradient(180deg, rgba(22,15,8,0.85), rgba(10,6,3,0.85))",
                            border: "1px solid rgba(212,175,55,0.22)",
                            boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
                          }}
                          data-testid={`deck-preset-${p.id}`}
                        >
                          <div className="corner-deco absolute inset-0 pointer-events-none" />
                          <div className="relative z-10">
                            <div className="flex items-baseline justify-between gap-3">
                              <div className="font-heading text-[#f8e4a1]">{p.name || "Untitled Deck"}</div>
                              <div className="text-[10px] font-stat tracking-[0.2em] text-[#c9a74a]">
                                {(p.cardIds?.length ?? 0)} CARDS
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                              Updated {new Date(p.updatedAt || Date.now()).toLocaleDateString()}
                            </div>
                            {underMin && (
                              <div className="mt-3 text-[10px] font-stat tracking-[0.2em] text-red-400">
                                NEED 4+ CARDS
                              </div>
                            )}
                            {!underMin && (
                              <div className="mt-4">
                                <span className="btn-gold inline-flex">Use this deck</span>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setDeckSelectOpen(false);
                      deckSelectOnPickRef.current = null;
                      setActiveTab("deck");
                    }}
                    data-testid="deck-select-manage"
                  >
                    Manage decks
                  </button>
                  <div className="text-[10px] font-stat tracking-[0.2em] text-[#7e6a2e]">
                    TIP: Save decks in the Deck tab to quickly battle.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {guildInvitePopup && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/70 animate-fade-in">
          <div className="bg-card border border-border rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl space-y-5 animate-slide-in-up">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/15 p-3">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-foreground text-lg">Guild invite</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {guildInvitePopup.fromUsername} invited you to{" "}
                  <span className="text-foreground font-medium">{guildInvitePopup.guildName}</span>{" "}
                  <span className="font-mono text-xs text-muted-foreground">[{guildInvitePopup.guildTag}]</span>
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={acceptGuildInvitePopup}
                className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white font-heading font-bold hover:bg-emerald-700 transition-colors text-sm"
              >
                Accept
              </button>
              <button
                onClick={declineGuildInvitePopup}
                className="flex-1 px-4 py-3 rounded-xl bg-secondary text-secondary-foreground font-heading font-bold hover:bg-secondary/80 transition-colors text-sm"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
      {pvpInvitePopup && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 animate-fade-in">
          <div className="bg-card border border-border rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl space-y-5 animate-slide-in-up">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-destructive/20 p-3">
                <Swords className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-foreground text-lg">{pvpInvitePopup.title}</h3>
                {pvpInvitePopup.body && <p className="text-sm text-muted-foreground mt-0.5">{pvpInvitePopup.body}</p>}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={acceptInvitePopup}
                className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white font-heading font-bold hover:bg-emerald-700 transition-colors text-sm"
              >
                ⚔ Accept
              </button>
              <button
                onClick={declineInvitePopup}
                className="flex-1 px-4 py-3 rounded-xl bg-secondary text-secondary-foreground font-heading font-bold hover:bg-secondary/80 transition-colors text-sm"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="min-h-screen bg-background" style={{ paddingTop: isDiscordActivityHost ? discordOverlayInset : "env(safe-area-inset-top)" }}>
        {/* Ambient particles — disabled when reduceMotion or animationsOn = false */}
        {playerState.settings?.animationsOn !== false && !playerState.settings?.reduceMotion && (
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {ambientParticles.map((p, i) => (
              <div key={i} className="absolute w-1 h-1 rounded-full bg-primary/20 animate-float" style={{ left: p.left, top: p.top, animationDelay: p.animationDelay, animationDuration: p.animationDuration }} />
            ))}
          </div>
        )}

        {!hideAppChromeDuringBattle && (
          <div>
            <TopNavTabs
              playerState={playerState}
              unreadMail={unreadMail}
              tabDots={tabDots}
              activeTab={activeTab}
              onTab={(tab) => handleTabClick(tab)}
              settingsNode={<SettingsPanel playerState={playerState} onStateChange={setPlayerState} />}
            />
          </div>
        )}

        {/* Content */}
        <main
          className={cn(
            "relative z-10",
            hideAppChromeDuringBattle ? "w-full max-w-none px-0 py-0" : "container py-8 max-w-7xl"
          )}
        >
          <TutorialOverlay tabId={activeTab} playerState={playerState} onStateChange={setPlayerState} />
          <TabTransition tabKey={activeTab} reduceMotion={!!playerState.settings?.reduceMotion}>
            {activeTab === "collection" && (
              <div
                data-testid="cards-screen"
                className="relative rounded-2xl p-5 md:p-8 overflow-hidden"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(7,5,10,0.78), rgba(7,5,10,0.92))",
                  border: "1px solid rgba(212,175,55,0.18)",
                  boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
                }}
              >
                <div className="corner-deco absolute inset-0" />
                <div className="relative z-10">
                  <div className="section-heading mb-2">Collection</div>
                  <p className="text-center font-lore mb-6">
                    {playerState.ownedCardIds.length} owned cards — {allGameCards.length} in the realm.
                  </p>

                  <div className="flex justify-center mb-3">
                    <input
                      placeholder="Search by name…"
                      value={collectionQuery}
                      onChange={(e) => setCollectionQuery(e.target.value)}
                      data-testid="card-search"
                      className="px-4 py-2 rounded-full font-body text-sm text-[#f8e4a1] outline-none w-[340px] max-w-[90%]"
                      style={{ background: "rgba(10,6,3,0.8)", border: "1px solid rgba(212,175,55,0.4)" }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                    {(["all", "hero", "god", "weapon", "spell", "trap"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setCollectionType(t)}
                        className={`btn-ghost ${collectionType === t ? "active" : ""}`}
                        data-testid={`filter-type-${t}`}
                        type="button"
                      >
                        {t === "all" ? "All Types" : t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
                    {(["all", "common", "rare", "legendary", "mythic"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setCollectionRarity(r)}
                        className={`btn-ghost ${collectionRarity === r ? "active" : ""}`}
                        data-testid={`filter-rarity-${r}`}
                        type="button"
                      >
                        {r === "all" ? "All Rarities" : r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    ))}
                  </div>

                  <CollectionView
                    playerState={playerState}
                    onStateChange={setPlayerState}
                    searchQuery={collectionQuery}
                    typeFilter={collectionType}
                    rarityFilter={collectionRarity}
                  />
                </div>
              </div>
            )}
            {activeTab === "cosmetics" && (
              <div
                data-testid="cosmetics-screen"
                className="relative rounded-2xl p-5 md:p-8 overflow-hidden"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(7,5,10,0.78), rgba(7,5,10,0.92))",
                  border: "1px solid rgba(212,175,55,0.18)",
                  boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
                }}
              >
                <div className="corner-deco absolute inset-0" />
                <div className="relative z-10">
                  <div className="section-heading mb-2">Cosmetics</div>
                  <p className="text-center font-lore mb-6">
                    Equip boards, card backs, frames, borders, titles, and emotes you’ve unlocked.
                  </p>
                  <CosmeticsHall playerState={playerState} onStateChange={setPlayerState} />
                </div>
              </div>
            )}
            {activeTab === "catalog" && <CardCatalog playerState={playerState} />}
            {activeTab === "summon" && (
              <SummonAltar
                playerState={playerState}
                onStateChange={setPlayerState}
                isOnline={isOnline}
                pullCardsApi={pullCards}
              />
            )}
            {activeTab === "shop" && (
              <ShopScreen
                playerState={playerState}
                onStateChange={setPlayerState}
                isOnline={isOnline}
                pullCardsApi={pullCards}
              />
            )}
            {activeTab === "deck" && (
              <DeckGrimoire
                playerState={playerState}
                onStateChange={setPlayerState}
                onStartBattle={(deckIds) => {
                  if (pendingCombat?.kind === "raid-solo") {
                    setSoloRaidBossId(pendingCombat.bossId);
                    setRaidHotseat(null);
                    setRaidState(null);
                    setBattleDeckIds(deckIds);
                    setPendingCombat(null);
                    setActiveTab("battle");
                    return;
                  }
                  if (pendingCombat?.kind === "raid-hotseat") {
                    setRaidHotseat({ bossId: pendingCombat.bossId, deckIds });
                    setSoloRaidBossId(null);
                    setBattleDeckIds([]);
                    setPendingCombat(null);
                    setActiveTab("battle");
                    return;
                  }
                  startBattle(deckIds);
                }}
              />
            )}
            {activeTab === "quests" && (
              <div
                data-testid="quests-screen"
                className="relative rounded-2xl p-5 md:p-8 overflow-hidden"
                style={{
                  background: "linear-gradient(180deg, rgba(7,5,10,0.78), rgba(7,5,10,0.92))",
                  border: "1px solid rgba(212,175,55,0.18)",
                  boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
                }}
              >
                <div className="corner-deco absolute inset-0" />
                <div className="relative z-10">
                  <div className="section-heading mb-2">Quests</div>
                  <p className="text-center font-lore mb-6">
                    Complete objectives and earn rewards.
                  </p>
                  <QuestsHall playerState={playerState} onStateChange={setPlayerState} />
                </div>
              </div>
            )}
            {activeTab === "workshop" && (
              <div
                data-testid="workshop-screen"
                className="relative rounded-2xl p-5 md:p-8 overflow-hidden"
                style={{
                  background: "linear-gradient(180deg, rgba(7,5,10,0.78), rgba(7,5,10,0.92))",
                  border: "1px solid rgba(212,175,55,0.18)",
                  boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
                }}
              >
                <div className="corner-deco absolute inset-0" />
                <div className="relative z-10">
                  <div className="section-heading mb-2">Workshop</div>
                  <p className="text-center font-lore mb-6">
                    Fuse, sacrifice, and refine your collection.
                  </p>
                  <WorkshopHall
                    playerState={playerState}
                    onStateChange={setPlayerState}
                    isOnline={isOnline}
                    craftFuse={craftFuse}
                    craftSacrifice={craftSacrifice}
                    applyDub={applyDub}
                  />
                </div>
              </div>
            )}
            {activeTab === "crafting" && (
              <CraftingScreen
                playerState={playerState}
                onStateChange={setPlayerState}
                isOnline={isOnline}
                craftFuse={craftFuse}
                craftSacrifice={craftSacrifice}
                applyDub={applyDub}
              />
            )}
            {activeTab === "achievements" && (
              <div data-testid="achievements-screen" className="relative rounded-2xl p-5 md:p-8 overflow-hidden"
                style={{ background: "linear-gradient(180deg, rgba(7,5,10,0.78), rgba(7,5,10,0.92))", border: "1px solid rgba(212,175,55,0.18)", boxShadow: "0 18px 60px rgba(0,0,0,0.55)" }}>
                <div className="corner-deco absolute inset-0" />
                <div className="relative z-10">
                  <div className="section-heading mb-2">Achievements</div>
                  <p className="text-center font-lore mb-6">Mark your milestones across the realms.</p>
                  <BadgesHall playerState={playerState} />
                </div>
              </div>
            )}
            {activeTab === "leaderboard" && (
              <div data-testid="leaderboard-screen" className="relative rounded-2xl p-5 md:p-8 overflow-hidden"
                style={{ background: "linear-gradient(180deg, rgba(7,5,10,0.78), rgba(7,5,10,0.92))", border: "1px solid rgba(212,175,55,0.18)", boxShadow: "0 18px 60px rgba(0,0,0,0.55)" }}>
                <div className="corner-deco absolute inset-0" />
                <div className="relative z-10">
                  <div className="section-heading mb-2">Leaderboard</div>
                  <p className="text-center font-lore mb-6">Climb the ranks and claim your place.</p>
                  <RanksHall playerState={playerState} isOnline={isOnline} />
                </div>
              </div>
            )}
            {activeTab === "trade" && (
              <div data-testid="trade-screen" className="relative rounded-2xl p-5 md:p-8 overflow-hidden"
                style={{ background: "linear-gradient(180deg, rgba(7,5,10,0.78), rgba(7,5,10,0.92))", border: "1px solid rgba(212,175,55,0.18)", boxShadow: "0 18px 60px rgba(0,0,0,0.55)" }}>
                <div className="corner-deco absolute inset-0" />
                <div className="relative z-10">
                  <div className="section-heading mb-2">Trade</div>
                  <p className="text-center font-lore mb-6">Negotiate and exchange across the covenant.</p>
                  <TradeHall playerState={playerState} onStateChange={setPlayerState} />
                </div>
              </div>
            )}
            {activeTab === "mail" && <MailHall onNavigate={(tab) => { setActiveTab(tab); }} />}
            {activeTab === "pvp" && (
              <PvPPanel
                playerState={playerState}
                isOnline={isOnline}
                onNavigateBattle={(matchId) => {
                  sessionStorage.setItem("pvp.live.matchId", String(matchId));
                  setRankedBattle(null);
                  setBattleDeckIds([]);
                  setSoloRaidBossId(null);
                  setRaidHotseat(null);
                  setRaidState(null);
                  setActiveTab("battle");
                }}
                onStartRankedBattle={async (matchId) => {
                  try {
                    const data = await api.pvpAsyncGetPlay(matchId);
                    setRankedBattle({
                      matchId: data.matchId,
                      opponentName: data.opponent.username,
                      opponentDeckIds: data.opponentDeckCardIds,
                      seed: data.seed ?? null,
                    });
                    setBattleDeckIds(data.myDeckCardIds);
                    setActiveTab("battle");
                  } catch (e) {
                    toast({
                      title: "Could not load ranked match",
                      description: e instanceof Error ? e.message : String(e),
                      variant: "destructive",
                    });
                  }
                }}
              />
            )}
            {activeTab === "events" && (
              <div data-testid="events-screen" className="relative rounded-2xl p-5 md:p-8 overflow-hidden"
                style={{ background: "linear-gradient(180deg, rgba(7,5,10,0.78), rgba(7,5,10,0.92))", border: "1px solid rgba(212,175,55,0.18)", boxShadow: "0 18px 60px rgba(0,0,0,0.55)" }}>
                <div className="corner-deco absolute inset-0" />
                <div className="relative z-10">
                  <div className="section-heading mb-2">Events</div>
                  <p className="text-center font-lore mb-6">Seasonal stories, modifiers, and limited rewards.</p>
                  <EventsHall playerState={playerState} onStateChange={setPlayerState} />
                </div>
              </div>
            )}
            {activeTab === "tournament" && (
              <div data-testid="tournament-screen" className="relative rounded-2xl p-5 md:p-8 overflow-hidden"
                style={{ background: "linear-gradient(180deg, rgba(7,5,10,0.78), rgba(7,5,10,0.92))", border: "1px solid rgba(212,175,55,0.18)", boxShadow: "0 18px 60px rgba(0,0,0,0.55)" }}>
                <div className="corner-deco absolute inset-0" />
                <div className="relative z-10">
                  <div className="section-heading mb-2">Tournament</div>
                  <p className="text-center font-lore mb-6">Enter brackets and fight for glory.</p>
                  <Tournament playerState={playerState} onStateChange={setPlayerState} isOnline={isOnline} syncEconomyApi={syncEconomy} />
                </div>
              </div>
            )}
            {activeTab === "boost" && (
              <div data-testid="boost-screen" className="relative rounded-2xl p-5 md:p-8 overflow-hidden"
                style={{ background: "linear-gradient(180deg, rgba(7,5,10,0.78), rgba(7,5,10,0.92))", border: "1px solid rgba(212,175,55,0.18)", boxShadow: "0 18px 60px rgba(0,0,0,0.55)" }}>
                <div className="corner-deco absolute inset-0" />
                <div className="relative z-10">
                  <div className="section-heading mb-2">Boost</div>
                  <p className="text-center font-lore mb-6">Claim boosts and power-ups.</p>
                  <BoostHall playerState={playerState} />
                </div>
              </div>
            )}
            {activeTab === "pass" && (
              <div data-testid="pass-screen" className="relative rounded-2xl p-5 md:p-8 overflow-hidden"
                style={{ background: "linear-gradient(180deg, rgba(7,5,10,0.78), rgba(7,5,10,0.92))", border: "1px solid rgba(212,175,55,0.18)", boxShadow: "0 18px 60px rgba(0,0,0,0.55)" }}>
                <div className="corner-deco absolute inset-0" />
                <div className="relative z-10">
                  <div className="section-heading mb-2">Battle Pass</div>
                  <p className="text-center font-lore mb-6">Progress through seasons and claim rewards.</p>
                  <PassHall playerState={playerState} onStateChange={setPlayerState} />
                </div>
              </div>
            )}
            {activeTab === "profile" && (
              <div data-testid="profile-screen" className="relative rounded-2xl p-5 md:p-8 overflow-hidden"
                style={{ background: "linear-gradient(180deg, rgba(7,5,10,0.78), rgba(7,5,10,0.92))", border: "1px solid rgba(212,175,55,0.18)", boxShadow: "0 18px 60px rgba(0,0,0,0.55)" }}>
                <div className="corner-deco absolute inset-0" />
                <div className="relative z-10">
                  <div className="section-heading mb-2">Profile</div>
                  <p className="text-center font-lore mb-6">Customize your identity across the realms.</p>
                  <ProfileHall playerState={playerState} onStateChange={setPlayerState} />
                </div>
              </div>
            )}
            {activeTab === "daily" && (
              <GrowHub
                playerState={playerState}
                onStateChange={setPlayerState}
                isOnline={isOnline}
                claimDailyLogin={claimDailyLogin}
                onNavigate={(t) => setActiveTab(t as Tab)}
              />
            )}
            {activeTab === "friends" && (
              <ChroniclersHall
                isOnline={isOnline}
              />
            )}
            {activeTab === "chat" && (
              <div data-testid="chat-screen" className="relative rounded-2xl p-5 md:p-8 overflow-hidden"
                style={{ background: "linear-gradient(180deg, rgba(7,5,10,0.78), rgba(7,5,10,0.92))", border: "1px solid rgba(212,175,55,0.18)", boxShadow: "0 18px 60px rgba(0,0,0,0.55)" }}>
                <div className="corner-deco absolute inset-0" />
                <div className="relative z-10">
                  <div className="section-heading mb-2">Chat</div>
                  <p className="text-center font-lore mb-6">Speak with your covenant.</p>
                  <ChatHall isOnline={isOnline} playerState={playerState} />
                </div>
              </div>
            )}
            {activeTab === "guild" && (
              <div data-testid="guild-screen" className="relative rounded-2xl p-5 md:p-8 overflow-hidden"
                style={{ background: "linear-gradient(180deg, rgba(7,5,10,0.78), rgba(7,5,10,0.92))", border: "1px solid rgba(212,175,55,0.18)", boxShadow: "0 18px 60px rgba(0,0,0,0.55)" }}>
                <div className="corner-deco absolute inset-0" />
                <div className="relative z-10">
                  <div className="section-heading mb-2">Guild</div>
                  <p className="text-center font-lore mb-6">Join, manage, and coordinate raids.</p>
                  <GuildHall isOnline={isOnline} playerState={playerState} />
                </div>
              </div>
            )}
            {activeTab === "spectate" && (
              <div data-testid="spectate-screen" className="relative rounded-2xl p-5 md:p-8 overflow-hidden"
                style={{ background: "linear-gradient(180deg, rgba(7,5,10,0.78), rgba(7,5,10,0.92))", border: "1px solid rgba(212,175,55,0.18)", boxShadow: "0 18px 60px rgba(0,0,0,0.55)" }}>
                <div className="corner-deco absolute inset-0" />
                <div className="relative z-10">
                  <div className="section-heading mb-2">Spectate</div>
                  <p className="text-center font-lore mb-6">Watch live matches.</p>
                  <SpectateHall isOnline={isOnline} />
                </div>
              </div>
            )}
            {activeTab === "cards-hall" && <CardsHall playerState={playerState} />}
            {activeTab === "combat-hall" && (
              <CombatHall
                playerState={playerState}
                onLaunchMode={(mode) => {
                  if (mode === "ranked") setActiveTab("pvp");
                  else if (mode === "tourney") setActiveTab("tournament");
                  else if (mode === "skirmish") {
                    openDeckSelect({
                      title: "Select your deck",
                      subtitle: "Skirmish • Quick PvE battle vs the realm",
                      onPick: (deckIds) => startBattle(deckIds),
                    });
                  } else {
                    // Raid: start a solo raid against the default boss for now.
                    openDeckSelect({
                      title: "Select your deck",
                      subtitle: "Raid • Co-op halls coming next, enter solo for now",
                      onPick: (deckIds) => {
                        setSoloRaidBossId("ember-tyrant");
                        setRaidHotseat(null);
                        setRaidState(null);
                        setBattleDeckIds(deckIds);
                        setActiveTab("battle");
                      },
                    });
                  }
                }}
              />
            )}
            {activeTab === "raid" && (
              <CombatHall
                playerState={playerState}
                defaultMode="raid"
                onLaunchMode={() => {
                  openDeckSelect({
                    title: "Select your deck",
                    subtitle: "Raid • Enter solo against the Ember Tyrant",
                    onPick: (deckIds) => {
                      setSoloRaidBossId("ember-tyrant");
                      setRaidHotseat(null);
                      setRaidState(null);
                      setBattleDeckIds(deckIds);
                      setActiveTab("battle");
                    },
                  });
                }}
              />
            )}
            {activeTab === "battle" && battleDeckIds.length > 0 && !raidHotseat && (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-20 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Loading battle…
                  </div>
                }
              >
                <BattleArena
                  playerDeckIds={battleDeckIds}
                  opponentDeckIds={rankedBattle?.opponentDeckIds ?? null}
                  rankedSubtitle={
                    rankedBattle ? `Ranked vs ${rankedBattle.opponentName} — AI plays their deck` : null
                  }
                  battleSeed={rankedBattle?.seed ?? null}
                  onRankedSubmit={
                    rankedBattle
                      ? async (data) => {
                          await api.pvpAsyncSubmit(rankedBattle.matchId, data);
                        }
                      : undefined
                  }
                  soloRaidBossId={soloRaidBossId}
                  onExit={() => {
                    setBattleDeckIds([]);
                    setSoloRaidBossId(null);
                    const wasRanked = rankedBattle != null;
                    setRankedBattle(null);
                    setActiveTab(wasRanked ? "pvp" : "combat-hall");
                  }}
                  playerState={playerState}
                  onStateChange={setPlayerState}
                  isOnline={isOnline}
                  submitBattleResultApi={submitBattleResult}
                  startPveBattleApi={startPveBattle}
                  syncEconomyApi={syncEconomy}
                />
              </Suspense>
            )}
            {activeTab === "battle" && raidHotseat && raidState && (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-20 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Loading raid…
                  </div>
                }
              >
                <RaidCoopArena
                  raid={raidState}
                  onRaidPatch={patchRaid}
                  onExit={() => {
                    setRaidHotseat(null);
                    setRaidState(null);
                    setActiveTab("combat-hall");
                  }}
                  playerDeckIds={raidHotseat.deckIds}
                  playerState={playerState}
                  onStateChange={setPlayerState}
                  isOnline={isOnline}
                  submitBattleResultApi={submitBattleResult}
                  startPveBattleApi={startPveBattle}
                  syncEconomyApi={syncEconomy}
                />
              </Suspense>
            )}
            {activeTab === "battle" && battleDeckIds.length === 0 && hasLiveMatchFromInbox && (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-20 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Loading live match…
                  </div>
                }
              >
                <LivePvPBattleground
                  matchId={liveMatchIdFromInbox}
                  playerState={playerState}
                  onStateChange={setPlayerState}
                  syncEconomyApi={syncEconomy}
                  onExit={() => {
                    sessionStorage.removeItem("pvp.live.matchId");
                    setActiveTab("combat-hall");
                  }}
                />
              </Suspense>
            )}
            {activeTab === "battle" &&
              battleDeckIds.length === 0 &&
              !hasLiveMatchFromInbox &&
              hasRaidLiveMatchFromInbox &&
              !raidHotseat && null}
            {activeTab === "battle" &&
              battleDeckIds.length === 0 &&
              !hasLiveMatchFromInbox &&
              !hasRaidLiveMatchFromInbox &&
              !(raidHotseat && raidState) && (
              <div className="text-center py-20">
                <Swords className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h2 className="font-heading text-xl font-bold text-foreground mb-2">No Deck Selected</h2>
                <p className="text-sm text-muted-foreground mb-4">Build a deck first, then start a battle!</p>
                <button onClick={() => setActiveTab("deck")} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-heading font-bold text-sm">Go to Deck Builder</button>
              </div>
            )}
            {activeTab === "battle" &&
              battleDeckIds.length === 0 &&
              !hasLiveMatchFromInbox &&
              hasRaidLiveMatchFromInbox &&
              !raidHotseat && (
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-20 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Loading raid match…
                    </div>
                  }
                >
                  <RaidLiveBattleground
                    matchId={raidLiveMatchIdFromInbox}
                    playerState={playerState}
                    onStateChange={setPlayerState}
                    submitBattleResult={submitBattleResult}
                    startPveBattle={startPveBattle}
                    syncEconomyApi={syncEconomy}
                    onExit={() => {
                      sessionStorage.removeItem("raid.live.matchId");
                      setActiveTab("combat-hall");
                    }}
                  />
                </Suspense>
              )}
          </TabTransition>
        </main>
      </div>
    </TooltipProvider>
  );
}
