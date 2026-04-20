/**
 * Path-based daily login rewards — keep in sync with `src/components/halls/DailyHall.tsx`.
 */
const FACTION_REWARDS = {
  fire: [
    { day: 1, type: "card", cardId: "terragon", label: "Terragon" },
    { day: 2, type: "card", cardId: "ferros", label: "Ferros" },
    { day: 3, type: "card", cardId: "hephara", label: "Hephara (Rare)" },
    { day: 4, type: "card", cardId: "aethon", label: "Aethon" },
    { day: 5, type: "card", cardId: "inferna", label: "Inferna (Rare)" },
    { day: 6, type: "gold", amount: 500, label: "500 Gold" },
    { day: 7, type: "pack", amount: 1, label: "Bronze Pack" },
  ],
  nature: [
    { day: 1, type: "card", cardId: "vitalis", label: "Vitalis" },
    { day: 2, type: "card", cardId: "healer", label: "Healer" },
    { day: 3, type: "card", cardId: "zephyros", label: "Zephyros (Rare)" },
    { day: 4, type: "card", cardId: "eirene", label: "Eirene" },
    { day: 5, type: "card", cardId: "verdantia", label: "Verdantia (Rare)" },
    { day: 6, type: "gold", amount: 500, label: "500 Gold" },
    { day: 7, type: "pack", amount: 1, label: "Bronze Pack" },
  ],
  shadow: [
    { day: 1, type: "card", cardId: "nekros", label: "Nekros" },
    { day: 2, type: "card", cardId: "obscura", label: "Obscura" },
    { day: 3, type: "card", cardId: "glacius", label: "Glacius (Rare)" },
    { day: 4, type: "card", cardId: "luminara", label: "Luminara" },
    { day: 5, type: "card", cardId: "umbra", label: "Umbra (Rare)" },
    { day: 6, type: "gold", amount: 500, label: "500 Gold" },
    { day: 7, type: "pack", amount: 1, label: "Bronze Pack" },
  ],
};

const DEFAULT_REWARDS = [
  { day: 1, type: "gold", amount: 50, label: "50 Gold" },
  { day: 2, type: "gold", amount: 100, label: "100 Gold" },
  { day: 3, type: "stardust", amount: 10, label: "10 Stardust" },
  { day: 4, type: "gold", amount: 200, label: "200 Gold" },
  { day: 5, type: "stardust", amount: 25, label: "25 Stardust" },
  { day: 6, type: "gold", amount: 500, label: "500 Gold" },
  { day: 7, type: "pack", amount: 1, label: "Bronze Pack" },
];

export function getRewardsForPath(path) {
  if (path && FACTION_REWARDS[path]) return FACTION_REWARDS[path];
  return DEFAULT_REWARDS;
}

export function getRewardForNextDay(path, claimedDays) {
  const nextDay = (claimedDays?.length ?? 0) + 1;
  const list = getRewardsForPath(path);
  const reward = list.find((r) => r.day === nextDay);
  return { nextDay, reward: reward || null };
}
