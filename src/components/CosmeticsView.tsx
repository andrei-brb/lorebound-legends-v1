import { useMemo } from "react";
import { Check, Palette } from "lucide-react";
import type { PlayerState } from "@/lib/playerState";
import { COSMETICS, type CosmeticType } from "@/data/cosmetics";
import { clearCosmeticSlot, setCosmeticEquipped } from "@/lib/battlePassEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TYPE_ORDER: CosmeticType[] = ["board_skin", "card_frame", "card_back", "border", "title", "emote"];

const TYPE_LABELS: Record<CosmeticType, string> = {
  board_skin: "Board skins",
  card_frame: "Card frames",
  card_back: "Card backs",
  border: "Borders",
  title: "Titles",
  emote: "Emotes",
};

function equippedForType(playerState: PlayerState, type: CosmeticType): string | null {
  const eq = playerState.cosmeticsEquipped;
  if (!eq) return null;
  switch (type) {
    case "board_skin":
      return eq.boardSkinId ?? null;
    case "card_frame":
      return eq.cardFrameId ?? null;
    case "card_back":
      return eq.cardBackId ?? null;
    case "border":
      return eq.borderId ?? null;
    case "title":
      return eq.titleId ?? null;
    case "emote":
      return eq.emoteId ?? null;
  }
}

interface Props {
  playerState: PlayerState;
  onStateChange: (s: PlayerState) => void;
}

export default function CosmeticsView({ playerState, onStateChange }: Props) {
  const byType = useMemo(() => {
    const owned = new Set(playerState.cosmeticsOwned || []);
    const m = new Map<CosmeticType, typeof COSMETICS>();
    for (const t of TYPE_ORDER) m.set(t, []);
    for (const c of COSMETICS) {
      if (!owned.has(c.id)) continue;
      const list = m.get(c.type);
      if (list) list.push(c);
    }
    return m;
  }, [playerState.cosmeticsOwned]);

  const totalOwned = (playerState.cosmeticsOwned || []).length;

  if (totalOwned === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <Palette className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="font-heading text-xl font-bold text-foreground mb-2">No cosmetics yet</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Earn board skins, frames, card backs, and more from the Battle Pass and seasonal rewards. Claim them there, then equip them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {TYPE_ORDER.map((type) => {
        const items = byType.get(type) || [];
        const equippedId = equippedForType(playerState, type);

        return (
          <Card key={type} className="animate-fade-in bg-card/50 border-border">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-lg font-heading flex items-center gap-2">
                  {TYPE_LABELS[type]}
                  <span className="text-sm text-muted-foreground font-body">({items.length})</span>
                </CardTitle>
                {items.length > 0 && equippedId && (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Check className="w-3 h-3" /> Equipped
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No items in this category yet — unlock from the Battle Pass or seasonal rewards.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {items.map((c) => {
                    const isEquipped = equippedId === c.id;
                    return (
                      <div
                        key={c.id}
                        className={cn(
                          "rounded-xl border bg-secondary/30 overflow-hidden flex flex-col transition-all",
                          isEquipped ? "border-[hsl(var(--legendary))]/60 ring-1 ring-[hsl(var(--legendary))]/30" : "border-border hover:border-primary/40"
                        )}
                      >
                        <div className="aspect-[4/3] bg-muted/40 flex items-center justify-center relative">
                          {c.image ? (
                            <img src={c.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <Palette className="w-10 h-10 text-muted-foreground/50" />
                          )}
                          {c.seasonId && (
                            <span className="absolute top-1 left-1 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-background/80 text-muted-foreground">
                              {c.seasonId.replace("season-", "S")}
                            </span>
                          )}
                        </div>
                        <div className="p-2 flex flex-col gap-2 flex-1">
                          <p className="text-xs font-heading font-semibold text-foreground line-clamp-2">{c.name}</p>
                          <div className="flex gap-1.5 mt-auto">
                            {!isEquipped ? (
                              <Button
                                size="sm"
                                className="flex-1 h-8 text-xs"
                                onClick={() => onStateChange(setCosmeticEquipped(playerState, c.id))}
                              >
                                Equip
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="flex-1 h-8 text-xs"
                                onClick={() => onStateChange(clearCosmeticSlot(playerState, type))}
                              >
                                Clear
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
