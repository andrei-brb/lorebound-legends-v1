/**
 * Server-side seasonal events + card pools.
 * Mirrors src/lib/eventEngine.ts and src/data/seasonalCards.ts (IDs only).
 */

export const SEASONAL_EVENTS = [
  {
    id: "shadow-week",
    packCost: 500,
    seasonalCardIds: ["shadow-wraith-king", "void-shade", "nightwalker", "eclipse-dagger", "shadow-eclipse-spell"],
    startDate: "2026-10-25",
    endDate: "2026-11-01",
  },
  {
    id: "infernal-festival",
    packCost: 500,
    seasonalCardIds: ["infernal-phoenix", "molten-titan", "ember-dancer", "infernal-blade", "hellfire-rain"],
    startDate: "2026-07-01",
    endDate: "2026-07-08",
  },
  {
    id: "bloom-of-ages",
    packCost: 500,
    seasonalCardIds: ["bloom-mother", "crystal-stag", "fae-sprite", "thornbloom-staff", "bloom-burst"],
    startDate: "2026-04-10",
    endDate: "2026-04-20",
  },
];

export function getSeasonalEventById(id) {
  return SEASONAL_EVENTS.find((e) => e.id === id) || null;
}

export function isEventActive(event, now = new Date()) {
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  end.setHours(23, 59, 59, 999);
  return now >= start && now <= end;
}

