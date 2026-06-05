import type { GameCard } from "@/data/cards";
import type { DayRewardDef } from "@/lib/playerState";
import { GoldCurrencyIcon, StardustCurrencyIcon } from "@/components/CurrencyIcons";
import BoosterPackArt from "@/components/summon/BoosterPackArt";

export default function RewardTileArt({ r, cardInfo }: { r: DayRewardDef; cardInfo?: GameCard | null }) {
  if (r.type === "gold") {
    return (
      <div className="flex flex-col items-center justify-center gap-1 p-2">
        <GoldCurrencyIcon className="w-10 h-10 drop-shadow-md" />
        <span className="font-heading text-sm text-[hsl(var(--legendary))]">{r.amount}</span>
      </div>
    );
  }
  if (r.type === "stardust") {
    return (
      <div className="flex flex-col items-center justify-center gap-1 p-2">
        <StardustCurrencyIcon className="w-10 h-10 drop-shadow-md" />
        <span className="font-heading text-sm text-[hsl(var(--rare))]">{r.amount}</span>
      </div>
    );
  }
  if (r.type === "pack") {
    return (
      <div className="flex h-full w-full items-center justify-center p-2">
        <BoosterPackArt variant="bronze" size="sm" />
      </div>
    );
  }
  if (cardInfo?.image) {
    return <img src={cardInfo.image} alt={cardInfo.name} className="h-full w-full rounded-xl object-cover opacity-80" />;
  }
  return null;
}
