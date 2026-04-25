import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import PackOpening from "@/components/PackOpening";
import { GoldCurrencyIcon, StardustCurrencyIcon } from "@/components/CurrencyIcons";
import { PACK_DEFINITIONS, canAffordPack, pullCards, type PackDefinition } from "@/lib/gachaEngine";
import {
  addCardToCollection,
  savePlayerState,
  type PlayerState,
} from "@/lib/playerState";
import bronzePackImg from "@/assets/packs/bronze-pack.jpg";
import silverPackImg from "@/assets/packs/silver-pack.jpg";
import goldPackImg from "@/assets/packs/gold-pack.jpg";
import { allGameCards } from "@/data/cardIndex";
import { cn } from "@/lib/utils";

const packImages: Record<string, string> = {
  bronze: bronzePackImg,
  silver: silverPackImg,
  gold: goldPackImg,
};

type PackTile = {
  id: string;
  label: string;
  cost: number;
  currency: "gold" | "stardust";
  tint: string;
  implPackId: "bronze" | "silver" | "gold";
  disabled?: boolean;
};

export default function SummonAltar(props: {
  playerState: PlayerState;
  onStateChange: (s: PlayerState) => void;
  isOnline: boolean;
  pullCardsApi?: (packId: string) => Promise<{
    pullResults: Array<{ cardId: string; isDuplicate: boolean }>;
    state: PlayerState;
  } | null>;
}) {
  const { playerState, onStateChange, isOnline, pullCardsApi } = props;
  const [openingPack, setOpeningPack] = useState<{ cardIds: string[]; cardIsNew?: boolean[] } | null>(null);

  const defs = useMemo(() => {
    const byId = new Map(PACK_DEFINITIONS.map((p) => [p.id, p]));
    const bronze = byId.get("bronze")!;
    const silver = byId.get("silver")!;
    const gold = byId.get("gold")!;
    const tiles: PackTile[] = [
      { id: "bronze", label: "Bronze Tome", cost: bronze.cost, currency: "gold", tint: "#8D6E63", implPackId: "bronze" },
      { id: "silver", label: "Silver Tome", cost: silver.cost, currency: "gold", tint: "#BDBDBD", implPackId: "silver" },
      { id: "gold", label: "Gold Tome", cost: gold.cost, currency: "gold", tint: "#f5c842", implPackId: "gold" },
      // We don't have an Arcane pack type in the current economy yet; keep the slot for exact layout parity.
      { id: "arcane", label: "Arcane Tome", cost: 250, currency: "stardust", tint: "#9c27b0", implPackId: "gold", disabled: true },
    ];
    return { tiles, bronze, silver, gold };
  }, []);

  const openPack = async (tile: PackTile) => {
    if (tile.disabled) return;
    const pack = PACK_DEFINITIONS.find((p) => p.id === tile.implPackId) as PackDefinition | undefined;
    if (!pack) return;

    if (isOnline && pullCardsApi) {
      const result = await pullCardsApi(pack.id);
      if (!result) return;
      onStateChange(result.state);
      setOpeningPack({
        cardIds: result.pullResults.map((r) => r.cardId),
        cardIsNew: result.pullResults.map((r) => !r.isDuplicate),
      });
      return;
    }

    if (!canAffordPack(playerState.gold, pack)) return;
    const { cardIds, newPityCounter } = pullCards(pack, playerState);
    const newState: PlayerState = {
      ...playerState,
      gold: playerState.gold - pack.cost,
      pityCounter: newPityCounter,
      totalPulls: playerState.totalPulls + pack.cardCount,
    };
    onStateChange(newState);
    setOpeningPack({ cardIds });
  };

  const handlePackOpeningComplete = (cardIds: string[]) => {
    if (isOnline) {
      setOpeningPack(null);
      return;
    }
    let state: PlayerState = {
      ...playerState,
      cardProgress: { ...playerState.cardProgress },
      ownedCardIds: [...playerState.ownedCardIds],
    };
    for (const id of cardIds) {
      const result = addCardToCollection(state, id);
      state = result.state;
    }
    onStateChange(state);
    savePlayerState(state);
    setOpeningPack(null);
  };

  const affordability = (tile: PackTile) => {
    if (tile.disabled) return false;
    if (tile.currency === "stardust") return (Number(playerState.stardust) || 0) >= tile.cost;
    return (Number(playerState.gold) || 0) >= tile.cost;
  };

  return (
    <div className="relative min-h-[calc(100vh-72px)] px-5 md:px-10 py-8" data-testid="summon-screen">
      {openingPack && (
        <PackOpening
          cardIds={openingPack.cardIds}
          cardIsNew={openingPack.cardIsNew}
          onComplete={handlePackOpeningComplete}
          playerState={playerState}
        />
      )}

      <div className="section-heading mb-2">The Altar of Summoning</div>
      <p className="text-center font-lore text-[#d6c293] mb-10">Offer your treasure — the altar shall respond.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto mb-10">
        {defs.tiles.map((t) => {
          const ok = affordability(t);
          const img = packImages[t.implPackId] ?? packImages.gold;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => openPack(t)}
              disabled={!ok}
              className={cn(
                "panel-gold p-5 relative overflow-hidden group transition text-center",
                ok ? "hover:-translate-y-2" : "opacity-60 cursor-not-allowed",
              )}
              data-testid={`pack-${t.id}`}
            >
              <div className="corner-deco absolute inset-0" />
              <div
                className="relative mx-auto my-3 w-[140px] h-[200px] rounded-md"
                style={{
                  background: `linear-gradient(180deg, ${t.tint}, #0a0604), url(${img}) center/cover`,
                  backgroundBlendMode: "multiply",
                  border: "2px solid rgba(245,200,66,0.7)",
                  boxShadow: "0 0 30px rgba(245,200,66,0.4), inset 0 0 30px rgba(0,0,0,0.7)",
                }}
              >
                <div
                  className="absolute inset-0 opacity-60 mix-blend-screen"
                  style={{
                    background:
                      "linear-gradient(115deg,transparent 40%, rgba(255,255,255,0.25) 50%, transparent 60%)",
                    backgroundSize: "200% 100%",
                    animation: "holographic-pass 4s linear infinite",
                  }}
                />
              </div>

              <div className="font-heading text-[#f5c842] tracking-[0.2em] text-sm">{t.label}</div>
              <div className="font-stat text-[#c9a74a] text-sm mt-1 flex items-center justify-center gap-2">
                {t.currency === "gold" ? <GoldCurrencyIcon className="w-4 h-4" /> : <StardustCurrencyIcon className="w-4 h-4" />}
                <span>{t.cost}</span>
              </div>

              <div className="btn-gold mt-3 w-full" style={{ padding: "10px 18px" }}>
                <Sparkles size={14} /> Summon
              </div>
            </button>
          );
        })}
      </div>

      <div className="max-w-5xl mx-auto panel-gold p-4 relative">
        <div className="corner-deco absolute inset-0" />
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <GoldCurrencyIcon className="w-[18px] h-[18px]" />
            <span className="font-heading font-bold text-[#f8e4a1] text-sm">{Number(playerState.gold) || 0}</span>
            <span className="text-xs text-[#c9a74a]">Gold</span>
          </div>
          <div className="flex items-center gap-2">
            <StardustCurrencyIcon className="w-[18px] h-[18px]" />
            <span className="font-heading font-bold text-[#e1bee7] text-sm">{Number(playerState.stardust) || 0}</span>
            <span className="text-xs text-[#c9a74a]">Stardust</span>
          </div>
          <div className="text-xs text-[#c9a74a] font-stat">
            Cards: {playerState.ownedCardIds.length}/{allGameCards.length}
          </div>
        </div>
      </div>
    </div>
  );
}

