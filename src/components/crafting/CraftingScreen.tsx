import type { PlayerState } from "@/lib/playerState";
import WorkshopHall from "@/components/halls/WorkshopHall";

export default function CraftingScreen(props: {
  playerState: PlayerState;
  onStateChange: (s: PlayerState) => void;
  isOnline: boolean;
  craftFuse: (inputRarity: string, selectedCardIds: string[]) => Promise<{ resultCardId: string } | null>;
  craftSacrifice: (cardIds: string[]) => Promise<{ totalStardust: number } | null>;
  applyDub: (cardId: string) => Promise<{ stardustEarned: number; newGoldStar: boolean; newRedStar: boolean } | null>;
}) {
  const { playerState, onStateChange, isOnline, craftFuse, craftSacrifice, applyDub } = props;
  return (
    <div className="relative min-h-[calc(100vh-72px)] px-5 md:px-10 py-8" data-testid="crafting-screen">
      <div className="section-heading mb-2">The Forge</div>
      <p className="text-center font-lore text-[#d6c293] mb-6">Fuse fragments into legends. Sacrifice dust to bind them.</p>
      <WorkshopHall
        playerState={playerState}
        onStateChange={onStateChange}
        isOnline={isOnline}
        craftFuse={craftFuse}
        craftSacrifice={craftSacrifice}
        applyDub={applyDub}
      />
    </div>
  );
}

