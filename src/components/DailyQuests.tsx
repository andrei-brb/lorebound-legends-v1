import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { GoldCurrencyIcon, StardustCurrencyIcon } from "@/components/CurrencyIcons";
import {
  loadDailyQuests,
  claimQuestReward,
  getQuestTimeUntilReset,
  type DailyQuestState,
} from "@/lib/questEngine";
import type { PlayerState } from "@/lib/playerState";
import { toast } from "@/hooks/use-toast";
import { awardBattlePassXp } from "@/lib/battlePassEngine";

interface DailyQuestsProps {
  playerState: PlayerState;
  onStateChange: (state: PlayerState) => void;
  isOnline?: boolean;
  syncEconomyApi?: (gold: number, stardust: number) => Promise<void>;
}

export default function DailyQuests({ playerState, onStateChange, isOnline, syncEconomyApi }: DailyQuestsProps) {
  const [questState, setQuestState] = useState<DailyQuestState>(loadDailyQuests);
  const [timeLeft, setTimeLeft] = useState(getQuestTimeUntilReset());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getQuestTimeUntilReset());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Refresh quest state when playerState changes (quests may have been progressed elsewhere)
  useEffect(() => {
    setQuestState(loadDailyQuests());
  }, [playerState]);

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  const handleClaim = (questId: string) => {
    const result = claimQuestReward(questState, questId, playerState);
    if (result) {
      setQuestState(result.questState);
      // Also award Battle Pass XP on quest claim (daily-capped in engine).
      const bp = awardBattlePassXp(result.playerState, 250);
      onStateChange(bp.state);
      const def = result.questState.questDefinitions.find(d => d.id === questId);
      toast({
        title: "🎉 Quest Complete!",
        description: `Earned ${def?.goldReward} gold and ${def?.stardustReward} stardust! +${bp.awarded} Pass XP`,
      });
      // Sync gold/stardust to server so rewards persist across sessions
      if (isOnline && syncEconomyApi) {
        syncEconomyApi(bp.state.gold, bp.state.stardust ?? 0).catch(() => {});
      }
    }
  };

  const allClaimed = questState.quests.every(q => q.claimed);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Daily Quests</h2>
          <p className="text-sm text-muted-foreground mt-1">Complete quests to earn gold and stardust</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Resets in {formatTime(timeLeft)}</span>
        </div>
      </div>

      {allClaimed && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <p className="text-3xl mb-2">🎊</p>
              <p className="font-heading text-lg font-bold text-foreground">All Quests Complete!</p>
              <p className="text-sm text-muted-foreground mt-1">Come back tomorrow for new quests</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {questState.quests.map((quest) => {
          const def = questState.questDefinitions.find(d => d.id === quest.questId);
          if (!def) return null;
          const progress = Math.min((quest.current / def.target) * 100, 100);

          return (
            <Card
              key={quest.questId}
              className={`transition-all ${quest.claimed ? "opacity-60" : quest.completed ? "border-primary/50 bg-primary/5" : ""}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{def.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-heading font-bold text-foreground">{def.title}</h3>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <GoldCurrencyIcon className="w-3.5 h-3.5" />
                          {def.goldReward}
                        </span>
                        <span className="flex items-center gap-1">
                          <StardustCurrencyIcon className="w-3.5 h-3.5" />
                          {def.stardustReward}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{def.description}</p>
                    <div className="flex items-center gap-3">
                      <Progress value={progress} className="h-2 flex-1" />
                      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                        {quest.current}/{def.target}
                      </span>
                    </div>
                  </div>
                  <div className="ml-2">
                    {quest.claimed ? (
                      <span className="text-xs text-muted-foreground font-medium px-3 py-1.5 rounded-lg bg-secondary">Claimed</span>
                    ) : quest.completed ? (
                      <Button size="sm" onClick={() => handleClaim(quest.questId)} className="font-heading">
                        Claim
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
