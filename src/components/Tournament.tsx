import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, Swords, Coins, Users, Clock, Crown, Shield } from "lucide-react";
import type { PlayerState } from "@/lib/playerState";
import { savePlayerState } from "@/lib/playerState";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import GlassPanel from "@/components/scene/GlassPanel";
import { texArena, texGilded, texThrone } from "@/components/scene/panelTextures";

interface TournamentProps {
  playerState: PlayerState;
  onStateChange: (state: PlayerState) => void;
  isOnline?: boolean;
  syncEconomyApi?: (gold: number, stardust: number) => Promise<void>;
}

interface TournamentParticipant {
  id: string;
  name: string;
  avatar: string;
  isPlayer: boolean;
  strength: number; // battle sim rating
}

interface BracketMatch {
  id: string;
  round: number;
  participant1: TournamentParticipant | null;
  participant2: TournamentParticipant | null;
  winner: TournamentParticipant | null;
  completed: boolean;
}

type TournamentStatus = "lobby" | "in-progress" | "completed";

const AI_NAMES = [
  "Shadowlord99", "PyroMaster", "NatureKing", "VoidWalker",
  "IceQueen42", "StormBringer", "DeathKnight", "LightSage",
  "DragonSlayer", "MoonWitch", "IronForge", "StarWeaver",
  "FlameHeart", "FrostBite", "ThunderGod", "SilentBlade",
];

const ENTRY_FEE = 200;
const PRIZE_POOL = [800, 400, 200]; // 1st, 2nd, 3rd/4th

function generateAIParticipants(count: number): TournamentParticipant[] {
  const shuffled = [...AI_NAMES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((name, i) => ({
    id: `ai-${i}`,
    name,
    avatar: "🤖",
    isPlayer: false,
    strength: 40 + Math.floor(Math.random() * 60),
  }));
}

function simulateMatch(p1: TournamentParticipant, p2: TournamentParticipant): TournamentParticipant {
  // Player gets a slight advantage based on collection size
  const p1Roll = p1.strength + Math.random() * 30;
  const p2Roll = p2.strength + Math.random() * 30;
  return p1Roll >= p2Roll ? p1 : p2;
}

function generateBracket(participants: TournamentParticipant[]): BracketMatch[] {
  const matches: BracketMatch[] = [];
  const n = participants.length;
  const rounds = Math.ceil(Math.log2(n));

  // Round 1
  for (let i = 0; i < n; i += 2) {
    matches.push({
      id: `r1-m${i / 2}`,
      round: 1,
      participant1: participants[i] || null,
      participant2: participants[i + 1] || null,
      winner: null,
      completed: false,
    });
  }

  // Later rounds (empty slots)
  let prevRoundMatches = n / 2;
  for (let r = 2; r <= rounds; r++) {
    const count = prevRoundMatches / 2;
    for (let i = 0; i < count; i++) {
      matches.push({
        id: `r${r}-m${i}`,
        round: r,
        participant1: null,
        participant2: null,
        winner: null,
        completed: false,
      });
    }
    prevRoundMatches = count;
  }

  return matches;
}

export default function Tournament({ playerState, onStateChange, isOnline, syncEconomyApi }: TournamentProps) {
  const [status, setStatus] = useState<TournamentStatus>("lobby");
  const [bracket, setBracket] = useState<BracketMatch[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [playerEliminated, setPlayerEliminated] = useState(false);
  const [finalPlacement, setFinalPlacement] = useState<number | null>(null);

  const playerParticipant: TournamentParticipant = useMemo(() => ({
    id: "player",
    name: "You",
    avatar: "⚔️",
    isPlayer: true,
    strength: 50 + Math.min(50, playerState.ownedCardIds.length),
  }), [playerState.ownedCardIds.length]);

  const enterTournament = () => {
    if (playerState.gold < ENTRY_FEE) {
      toast({ title: "Not enough gold!", description: `Entry fee is ${ENTRY_FEE} gold.`, variant: "destructive" });
      return;
    }

    const newState = { ...playerState, gold: playerState.gold - ENTRY_FEE };
    savePlayerState(newState);
    onStateChange(newState);
    if (isOnline && syncEconomyApi) {
      syncEconomyApi(newState.gold, newState.stardust ?? 0).catch(() => {});
    }

    const aiPlayers = generateAIParticipants(7);
    const participants = [playerParticipant, ...aiPlayers].sort(() => Math.random() - 0.5);
    const newBracket = generateBracket(participants);
    setBracket(newBracket);
    setStatus("in-progress");
    setCurrentRound(1);
    setPlayerEliminated(false);
    setFinalPlacement(null);

    toast({ title: "🏆 Tournament Started!", description: "8 players enter, 1 champion emerges!" });
  };

  const advanceRound = () => {
    const newBracket = [...bracket];
    const roundMatches = newBracket.filter(m => m.round === currentRound && !m.completed);
    const totalRounds = Math.ceil(Math.log2(8));

    for (const match of roundMatches) {
      if (!match.participant1 || !match.participant2) {
        match.winner = match.participant1 || match.participant2;
      } else {
        // If player is in this match, give them interactive choice (simplified: auto-sim with advantage)
        match.winner = simulateMatch(match.participant1, match.participant2);
      }
      match.completed = true;

      // Check if player was eliminated
      if (
        (match.participant1?.isPlayer || match.participant2?.isPlayer) &&
        !match.winner?.isPlayer
      ) {
        setPlayerEliminated(true);
        // Placement: round eliminated determines placement
        if (currentRound === 1) setFinalPlacement(8);
        else if (currentRound === 2) setFinalPlacement(4);
        else setFinalPlacement(2);
      }
    }

    // Populate next round
    if (currentRound < totalRounds) {
      const nextRoundMatches = newBracket.filter(m => m.round === currentRound + 1);
      const winners = roundMatches.map(m => m.winner!);

      for (let i = 0; i < nextRoundMatches.length; i++) {
        nextRoundMatches[i].participant1 = winners[i * 2] || null;
        nextRoundMatches[i].participant2 = winners[i * 2 + 1] || null;
      }
    }

    setBracket(newBracket);

    if (currentRound >= totalRounds) {
      // Tournament over
      setStatus("completed");
      const finalMatch = newBracket.find(m => m.round === totalRounds);
      if (finalMatch?.winner?.isPlayer) {
        setFinalPlacement(1);
        const prize = PRIZE_POOL[0];
        const newState = { ...playerState, gold: playerState.gold + prize };
        savePlayerState(newState);
        onStateChange(newState);
        if (isOnline && syncEconomyApi) {
          syncEconomyApi(newState.gold, newState.stardust ?? 0).catch(() => {});
        }
        toast({ title: "🏆 CHAMPION!", description: `You won the tournament! +${prize} gold!` });
      } else if (!playerEliminated) {
        // Player was in finals but lost
        setFinalPlacement(2);
        const prize = PRIZE_POOL[1];
        const newState = { ...playerState, gold: playerState.gold + prize };
        savePlayerState(newState);
        onStateChange(newState);
        if (isOnline && syncEconomyApi) {
          syncEconomyApi(newState.gold, newState.stardust ?? 0).catch(() => {});
        }
        toast({ title: "🥈 Runner-Up!", description: `Great run! +${prize} gold!` });
      }
    } else {
      setCurrentRound(currentRound + 1);
    }
  };

  const renderBracket = () => {
    const totalRounds = Math.ceil(Math.log2(8));
    const rounds = Array.from({ length: totalRounds }, (_, i) => i + 1);

    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {rounds.map(round => {
          const matches = bracket.filter(m => m.round === round);
          return (
            <div key={round} className="flex flex-col gap-4 min-w-[180px]">
              <h4 className="font-heading text-xs font-bold text-muted-foreground text-center uppercase">
                {round === totalRounds ? "Finals" : round === totalRounds - 1 ? "Semis" : `Round ${round}`}
              </h4>
              <div className="flex flex-col gap-4 justify-around flex-1">
                {matches.map(match => (
                  <div key={match.id} className="rounded-lg border border-border bg-card/50 overflow-hidden">
                    {[match.participant1, match.participant2].map((p, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "px-3 py-2 text-xs flex items-center gap-2 border-b border-border last:border-b-0",
                          p?.isPlayer && "bg-primary/10",
                          match.completed && match.winner?.id === p?.id && "bg-legendary/20 font-bold",
                          match.completed && match.winner?.id !== p?.id && p && "opacity-40 line-through"
                        )}
                      >
                        <span>{p?.avatar || "❓"}</span>
                        <span className="truncate">{p?.name || "TBD"}</span>
                        {match.completed && match.winner?.id === p?.id && (
                          <Crown className="w-3 h-3 text-legendary ml-auto" />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="px-4 sm:px-6 max-w-7xl mx-auto pb-8 space-y-6">
      <GlassPanel hue="var(--legendary)" glow={0.45} padding="md" bg={texThrone} bgTint={0.58}>
        <h2 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
          <Trophy className="w-6 h-6 text-legendary" /> Tournament Arena
        </h2>
        <p className="text-sm text-foreground/85 mt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">Compete in 8-player brackets for gold prizes</p>
      </GlassPanel>

      {status === "lobby" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <GlassPanel hue="var(--legendary)" glow={0.4} padding="md" bg={texArena} bgTint={0.65} className="max-w-md mx-auto">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-background/40 backdrop-blur-sm border border-border/40 p-3 text-center">
                <Users className="w-6 h-6 text-primary mx-auto mb-1" />
                <p className="text-xs text-foreground/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Players</p>
                <p className="font-heading font-bold text-foreground drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">8</p>
              </div>
              <div className="rounded-xl bg-background/40 backdrop-blur-sm border border-border/40 p-3 text-center">
                <Coins className="w-6 h-6 text-[hsl(var(--legendary))] mx-auto mb-1" />
                <p className="text-xs text-foreground/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Entry Fee</p>
                <p className="font-heading font-bold text-foreground drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{ENTRY_FEE}</p>
              </div>
              <div className="rounded-xl bg-background/40 backdrop-blur-sm border border-border/40 p-3 text-center">
                <Trophy className="w-6 h-6 text-[hsl(var(--legendary))] mx-auto mb-1" />
                <p className="text-xs text-foreground/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">1st Prize</p>
                <p className="font-heading font-bold text-foreground drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{PRIZE_POOL[0]}</p>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel hue="var(--legendary)" glow={0.5} padding="md" bg={texGilded} bgTint={0.65} className="max-w-md mx-auto">
            <h4 className="font-heading font-bold text-sm mb-2 text-foreground drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">Prize Pool</h4>
            <div className="space-y-1 text-sm text-foreground/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              <div className="flex justify-between"><span>🥇 1st Place</span><span className="font-bold text-[hsl(var(--legendary))]">{PRIZE_POOL[0]} gold</span></div>
              <div className="flex justify-between"><span>🥈 2nd Place</span><span className="font-bold">{PRIZE_POOL[1]} gold</span></div>
              <div className="flex justify-between"><span>🥉 3rd/4th</span><span className="font-bold">{PRIZE_POOL[2]} gold</span></div>
            </div>
          </GlassPanel>

          <button
            onClick={enterTournament}
            disabled={playerState.gold < ENTRY_FEE}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-legendary to-amber-600 text-primary-foreground font-heading font-bold text-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100"
          >
            <Swords className="w-5 h-5 inline mr-2" />
            Enter Tournament — {ENTRY_FEE} Gold
          </button>
        </motion.div>
      )}

      {(status === "in-progress" || status === "completed") && (
        <GlassPanel hue="var(--primary)" glow={0.4} padding="md" bg={texArena} bgTint={0.56} className="space-y-4">
          {renderBracket()}

          {status === "in-progress" && !playerEliminated && (
            <div className="text-center">
              <button
                onClick={advanceRound}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-heading font-bold text-sm hover:scale-105 transition-transform"
              >
                <Swords className="w-4 h-4 inline mr-2" />
                Fight Round {currentRound}
              </button>
            </div>
          )}

          {status === "in-progress" && playerEliminated && (
            <div className="text-center space-y-3">
              <p className="text-muted-foreground">You were eliminated! Simulating remaining matches...</p>
              <button
                onClick={advanceRound}
                className="px-6 py-2.5 rounded-xl bg-secondary text-secondary-foreground font-heading font-bold text-sm"
              >
                Continue Watching
              </button>
            </div>
          )}

          {status === "completed" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              {finalPlacement === 1 && (
                <div className="text-4xl">🏆</div>
              )}
              <h3 className="font-heading text-xl font-bold text-foreground">
                {finalPlacement === 1 ? "Champion!" : finalPlacement === 2 ? "Runner-Up!" : `Placed #${finalPlacement}`}
              </h3>
              {finalPlacement && finalPlacement <= 3 && (
                <p className="text-sm text-legendary font-bold">
                  +{PRIZE_POOL[Math.min(finalPlacement - 1, 2)]} gold earned!
                </p>
              )}
              <button
                onClick={() => { setStatus("lobby"); setBracket([]); }}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-heading font-bold text-sm"
              >
                Back to Lobby
              </button>
            </motion.div>
          )}
        </GlassPanel>
      )}
    </div>
  );
}
