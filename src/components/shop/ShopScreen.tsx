import PackShop from "@/components/PackShop";
import type { PlayerState } from "@/lib/playerState";

export default function ShopScreen(props: {
  playerState: PlayerState;
  onStateChange: (s: PlayerState) => void;
  isOnline: boolean;
  pullCardsApi?: (packId: string) => Promise<{
    pullResults: Array<{ cardId: string; isDuplicate: boolean; stardustEarned: number; newGoldStar: boolean; newRedStar: boolean; rarity: string }>;
    state: PlayerState;
  } | null>;
}) {
  const { playerState, onStateChange, isOnline, pullCardsApi } = props;
  return (
    <div className="relative min-h-[calc(100vh-72px)] px-5 md:px-10 py-8" data-testid="shop-screen">
      <div className="section-heading mb-2">The Merchant&apos;s Altar</div>
      <p className="text-center font-lore text-[#d6c293] mb-6">Packs & tomes await your tribute.</p>
      <PackShop playerState={playerState} onStateChange={onStateChange} isOnline={isOnline} pullCardsApi={pullCardsApi} />
    </div>
  );
}

