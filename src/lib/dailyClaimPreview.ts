import type { RewardItem } from "@/components/battle3d/RewardPopup";

export type DailyClaimPreview = {
  kind: string;
  label: string;
  amount?: number;
  cardId?: string | null;
  pullResults?: Array<{
    cardId: string;
    isDuplicate: boolean;
    stardustEarned: number;
    newGoldStar: boolean;
    newRedStar: boolean;
    rarity: string;
  }>;
};

export function mapDailyPreviewToRewards(p: DailyClaimPreview): RewardItem[] {
  if (p.kind === "gold") {
    return [{ kind: "gold", amount: p.amount ?? 0, label: p.label, rarity: "legendary" }].filter(
      (x) => (x.amount ?? 0) > 0,
    );
  }
  if (p.kind === "stardust") {
    return [{ kind: "gem", amount: p.amount ?? 0, label: p.label, rarity: "rare" }].filter(
      (x) => (x.amount ?? 0) > 0,
    );
  }
  if (p.kind === "card") {
    return [{ kind: "card", label: p.label, rarity: "mythic" }];
  }
  if (p.kind === "pack") {
    return [{ kind: "relic", label: p.label, rarity: "legendary" }];
  }
  return [{ kind: "relic", label: p.label, rarity: "rare" }];
}
