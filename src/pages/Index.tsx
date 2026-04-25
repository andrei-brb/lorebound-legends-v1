import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { BookOpen, Layers, Swords, Coins, Sparkles as SparklesIcon, Grid3X3, Loader2, ScrollText, Hammer, Trophy, ArrowLeftRight, BarChart3, Calendar, Zap, Crown, Shield, Mail, User, Gift, Users, MessageCircle, Eye, Flag, Flame } from "lucide-react";
import TabTransition from "@/components/TabTransition";
import TutorialOverlay from "@/components/TutorialOverlay";
import CollectionView from "@/components/CollectionView";
import CosmeticsView from "@/components/CosmeticsView";
import DeckBuilder from "@/components/DeckBuilder";
import BattleArena from "@/components/BattleArena";
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
import CardsHall from "@/components/halls/CardsHall";
import CombatHall from "@/components/halls/CombatHall";
import LivePvPBattleground from "@/components/LivePvPBattleground";
import RaidCoopArena from "@/components/RaidCoopArena";
import RaidLiveBattleground from "@/components/RaidLiveBattleground";
import { initRaidCoopBattle, type RaidCoopState } from "@/lib/raid/raidCoopEngine";
import { getRaidBoss } from "@/lib/raid/bosses";
import { cn } from "@/lib/utils";
import { usePlayerApi } from "@/lib/usePlayerApi";
import { loadAchievementState, checkNewAchievements, saveAchievementState } from "@/lib/achievementEngine";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/apiClient";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { setSfxVolume } from "@/lib/sfx";
import { GoldCurrencyIcon, StardustCurrencyIcon } from "@/components/CurrencyIcons";
import { TopNavTabs } from "@/components/TopNavTabs";
import { allGameCards, type CardType, type Rarity } from "@/data/cardIndex";

type Tab = "collection" | "catalog" | "cosmetics" | "deck" | "battle" | "pvp" | "summon" | "quests" | "workshop" | "achievements" | "leaderboard" | "trade" | "mail" | "events" | "tournament" | "boost" | "pass" | "profile" | "daily" | "friends" | "chat" | "guild" | "spectate" | "cards-hall" | "combat-hall" | "raid";
export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>("collection");
  const [battleDeckIds, setBattleDeckIds] = useState<string[]>([]);
  const [soloRaidBossId, setSoloRaidBossId] = useState<string | null>(null);
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
  }, [isOnline]);

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
                  <CosmeticsView playerState={playerState} onStateChange={setPlayerState} />
                </div>
              </div>
            )}
            {activeTab === "catalog" && <CardCatalog playerState={playerState} />}
            {activeTab === "summon" && (
              <div
                data-testid="summon-screen"
                className="relative rounded-2xl p-5 md:p-8 overflow-hidden"
                style={{
                  background: "linear-gradient(180deg, rgba(7,5,10,0.78), rgba(7,5,10,0.92))",
                  border: "1px solid rgba(212,175,55,0.18)",
                  boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
                }}
              >
                <div className="corner-deco absolute inset-0" />
                <div className="relative z-10">
                  <div className="section-heading mb-2">Summon</div>
                  <p className="text-center font-lore mb-6">
                    Open packs, chase mythics, and grow your arsenal.
                  </p>
                  <PackShop playerState={playerState} onStateChange={setPlayerState} isOnline={isOnline} pullCardsApi={pullCards} />
                </div>
              </div>
            )}
            {activeTab === "deck" && (
              <div
                data-testid="deck-screen"
                className="relative rounded-2xl p-5 md:p-8 overflow-hidden"
                style={{
                  background: "linear-gradient(180deg, rgba(7,5,10,0.78), rgba(7,5,10,0.92))",
                  border: "1px solid rgba(212,175,55,0.18)",
                  boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
                }}
              >
                <div className="corner-deco absolute inset-0" />
                <div className="relative z-10">
                  <div className="section-heading mb-2">Deck</div>
                  <p className="text-center font-lore mb-6">
                    Assemble your deck and prepare for battle.
                  </p>
                  <DeckBuilder
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
                    pendingCombatHint={
                      pendingCombat
                        ? pendingCombat.kind === "raid-solo"
                          ? `Raid (solo): you're preparing to face ${getRaidBoss(pendingCombat.bossId)?.name ?? "the boss"}. Build a 10-card deck, then Start Battle.`
                          : `Raid (local co-op): the same deck is used for both allies on one device. Build your deck, then Start Battle.`
                        : null
                    }
                    playerState={playerState}
                    onStateChange={setPlayerState}
                  />
                </div>
              </div>
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
            {activeTab === "mail" && <MailHall onNavigate={(tab) => { setActiveTab(tab as Tab); }} />}
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
              <div data-testid="daily-screen" className="relative rounded-2xl p-5 md:p-8 overflow-hidden"
                style={{ background: "linear-gradient(180deg, rgba(7,5,10,0.78), rgba(7,5,10,0.92))", border: "1px solid rgba(212,175,55,0.18)", boxShadow: "0 18px 60px rgba(0,0,0,0.55)" }}>
                <div className="corner-deco absolute inset-0" />
                <div className="relative z-10">
                  <div className="section-heading mb-2">Daily</div>
                  <p className="text-center font-lore mb-6">Claim daily rewards and keep your streak alive.</p>
                  <DailyHall
                    playerState={playerState}
                    onStateChange={setPlayerState}
                    isOnline={isOnline}
                    claimDailyLogin={claimDailyLogin}
                  />
                </div>
              </div>
            )}
            {activeTab === "friends" && (
              <div data-testid="friends-screen" className="relative rounded-2xl p-5 md:p-8 overflow-hidden"
                style={{ background: "linear-gradient(180deg, rgba(7,5,10,0.78), rgba(7,5,10,0.92))", border: "1px solid rgba(212,175,55,0.18)", boxShadow: "0 18px 60px rgba(0,0,0,0.55)" }}>
                <div className="corner-deco absolute inset-0" />
                <div className="relative z-10">
                  <div className="section-heading mb-2">Friends</div>
                  <p className="text-center font-lore mb-6">Find allies and manage your list.</p>
                  <FriendsHall isOnline={isOnline} />
                </div>
              </div>
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
                  else setActiveTab("deck"); // skirmish/raid → pick a deck first
                }}
              />
            )}
            {activeTab === "raid" && (
              <CombatHall
                playerState={playerState}
                defaultMode="raid"
                onLaunchMode={() => setActiveTab("deck")}
              />
            )}
            {activeTab === "battle" && battleDeckIds.length > 0 && !raidHotseat && (
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
            )}
            {activeTab === "battle" && raidHotseat && raidState && (
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
            )}
            {activeTab === "battle" && battleDeckIds.length === 0 && hasLiveMatchFromInbox && (
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
            )}
            {activeTab === "battle" &&
              battleDeckIds.length === 0 &&
              !hasLiveMatchFromInbox &&
              hasRaidLiveMatchFromInbox &&
              !raidHotseat && (
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
              )}
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
          </TabTransition>
        </main>
      </div>
    </TooltipProvider>
  );
}
