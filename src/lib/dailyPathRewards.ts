/**
 * Path login rewards — definitions live in `playerState.ts` so core hooks never
 * depend on resolving this file alone (Docker/CI safety).
 * Must match `server/lib/dailyPathRewards.mjs`.
 */
export type { DayRewardType, DayRewardDef } from "./playerState";
export {
  FACTION_REWARDS,
  DEFAULT_DAILY_REWARDS,
  getRewardsForPath,
  hasClaimedMissingDailyCardRewards,
} from "./playerState";
