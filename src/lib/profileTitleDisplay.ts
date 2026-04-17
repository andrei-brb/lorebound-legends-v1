import type { PlayerState } from "@/lib/playerState";
import { getTitle } from "@/data/titles";
import { getCosmeticById } from "@/data/cosmetics";

/** What to show as the player's visible title (cosmetic BP title overrides achievement title). */
export function getDisplayedProfileTitle(playerState: PlayerState): {
  kind: "cosmetic" | "achievement" | "none";
  label: string;
  /** Tailwind color class for achievement titles */
  colorClass?: string;
} {
  const eq = playerState.cosmeticsEquipped?.titleId;
  if (eq && (playerState.cosmeticsOwned || []).includes(eq)) {
    const c = getCosmeticById(eq);
    if (c?.type === "title") {
      return { kind: "cosmetic", label: c.name };
    }
  }
  const t = getTitle(playerState.profile?.titleId);
  if (t) return { kind: "achievement", label: t.label, colorClass: t.color };
  return { kind: "none", label: "" };
}

export function isCosmeticTitleActive(playerState: PlayerState): boolean {
  return getDisplayedProfileTitle(playerState).kind === "cosmetic";
}
