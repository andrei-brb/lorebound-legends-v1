import { useMemo, useState } from "react";
import { Check, Palette } from "lucide-react";
import type { PlayerState } from "@/lib/playerState";
import { COSMETICS, type Cosmetic, type CosmeticType } from "@/data/cosmetics";
import { clearCosmeticSlot, setCosmeticEquipped } from "@/lib/battlePassEngine";
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

function seasonChip(seasonId?: Cosmetic["seasonId"]) {
  if (!seasonId) return null;
  return seasonId.replace("season-", "S");
}

export default function CosmeticsHall(props: { playerState: PlayerState; onStateChange: (s: PlayerState) => void }) {
  const { playerState, onStateChange } = props;
  const [activeType, setActiveType] = useState<CosmeticType>("board_skin");

  const ownedIds = useMemo(() => new Set(playerState.cosmeticsOwned || []), [playerState.cosmeticsOwned]);
  const ownedByType = useMemo(() => {
    const map = new Map<CosmeticType, Cosmetic[]>();
    for (const t of TYPE_ORDER) map.set(t, []);
    for (const c of COSMETICS) {
      if (!ownedIds.has(c.id)) continue;
      map.get(c.type)?.push(c);
    }
    return map;
  }, [ownedIds]);

  const totalOwned = (playerState.cosmeticsOwned || []).length;
  const items = ownedByType.get(activeType) || [];
  const equippedId = equippedForType(playerState, activeType);

  if (totalOwned === 0) {
    return (
      <div className="panel-gold p-8 relative">
        <div className="corner-deco absolute inset-0" />
        <div className="relative z-10 flex flex-col items-center justify-center py-16 text-center">
          <Palette className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h2 className="font-heading text-xl font-bold text-foreground mb-2">No cosmetics yet</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Earn board skins, frames, card backs, and more from the Battle Pass and seasonal rewards. Claim them there, then equip them here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      <aside className="panel-gold p-5 relative">
        <div className="corner-deco absolute inset-0" />
        <div className="relative z-10">
          <div className="font-heading text-[#f5c842] tracking-[0.2em] flex items-center gap-2 mb-4">
            <Palette size={16} /> COSMETIC HALL
          </div>
          <div className="space-y-1">
            {TYPE_ORDER.map((t) => {
              const count = ownedByType.get(t)?.length || 0;
              const active = t === activeType;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActiveType(t)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg transition flex items-center justify-between",
                    active ? "bg-[rgba(245,200,66,0.14)] ring-1 ring-[rgba(245,200,66,0.35)]" : "hover:bg-[rgba(245,200,66,0.06)]"
                  )}
                  data-testid={`cosmetics-type-${t}`}
                >
                  <span className={cn("font-stat text-[11px] tracking-[0.2em]", active ? "text-[#f5c842]" : "text-[#c9a74a]")}>
                    {TYPE_LABELS[t].toUpperCase()}
                  </span>
                  <span className="text-xs text-muted-foreground">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <section className="panel-gold p-5 relative overflow-hidden">
        <div className="corner-deco absolute inset-0" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
            <div>
              <div className="font-heading text-[#f5c842] tracking-[0.2em]">{TYPE_LABELS[activeType].toUpperCase()}</div>
              <div className="font-lore text-[#d6c293] text-sm">Equip the style you’ve unlocked.</div>
            </div>
            {equippedId && (
              <div className="text-xs text-[#4CAF50] flex items-center gap-1 font-stat tracking-[0.2em]">
                <Check className="w-3.5 h-3.5" /> EQUIPPED
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <div className="text-sm text-muted-foreground py-10 text-center">
              No items in this category yet — unlock from the Battle Pass or seasonal rewards.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {items.map((c) => {
                const isEquipped = equippedId === c.id;
                return (
                  <div
                    key={c.id}
                    className={cn(
                      "group relative rounded-xl overflow-hidden border transition",
                      isEquipped ? "border-[#f5c842]/70 shadow-[0_0_20px_rgba(245,200,66,0.18)]" : "border-[rgba(212,175,55,0.18)] hover:border-[#f5c842]/50"
                    )}
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(22,15,8,0.78), rgba(10,6,3,0.70))",
                    }}
                    data-testid={`cosmetic-${c.id}`}
                  >
                    <div className="corner-deco absolute inset-0 pointer-events-none" />
                    <div className="relative">
                      <div className="aspect-[4/3] bg-black/30 flex items-center justify-center">
                        {c.image ? (
                          <img src={c.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <Palette className="w-10 h-10 text-muted-foreground/50" />
                        )}
                      </div>
                      {c.seasonId && (
                        <span className="absolute top-2 left-2 text-[10px] font-stat tracking-[0.2em] px-2 py-1 rounded bg-black/60 text-[#c9a74a] border border-[rgba(212,175,55,0.25)]">
                          {seasonChip(c.seasonId)}
                        </span>
                      )}
                      {isEquipped && (
                        <span className="absolute top-2 right-2 text-[10px] font-stat tracking-[0.2em] px-2 py-1 rounded bg-[rgba(76,175,80,0.18)] text-[#4CAF50] border border-[rgba(76,175,80,0.35)]">
                          EQUIPPED
                        </span>
                      )}
                    </div>

                    <div className="p-3">
                      <div className="font-heading text-sm text-[#f8e4a1] line-clamp-2">{c.name}</div>
                      <div className="mt-3 flex gap-2">
                        {!isEquipped ? (
                          <button
                            type="button"
                            className="btn-gold w-full"
                            onClick={() => onStateChange(setCosmeticEquipped(playerState, c.id))}
                          >
                            Equip
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-ghost w-full"
                            onClick={() => onStateChange(clearCosmeticSlot(playerState, activeType))}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

