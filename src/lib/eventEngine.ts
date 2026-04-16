import type { Element } from "./elementSystem";

export interface SeasonalEvent {
  id: string;
  name: string;
  description: string;
  element: Element;
  startDate: string; // ISO date
  endDate: string;   // ISO date
  statModifier: number; // e.g. 0.2 = +20% to element stats
  seasonalCardIds: string[];
  packName: string;
  packCost: number;
  packColor: string;
  bannerGradient: string;
  icon: string;
}

export const SEASONAL_EVENTS: SeasonalEvent[] = [
  {
    id: "shadow-week",
    name: "Shadow Week",
    description: "The shadow moon rises. All shadow cards gain +20% stats in battle. Exclusive shadow cards available!",
    element: "shadow",
    startDate: "2026-10-25",
    endDate: "2026-11-01",
    statModifier: 0.2,
    seasonalCardIds: ["shadow-wraith-king", "void-shade", "nightwalker", "eclipse-dagger", "shadow-eclipse-spell"],
    packName: "Shadow Eclipse Pack",
    packCost: 500,
    packColor: "from-purple-900 to-violet-600",
    bannerGradient: "from-purple-900/80 via-violet-800/60 to-background",
    icon: "🌑",
  },
  {
    id: "infernal-festival",
    name: "Infernal Festival",
    description: "The volcanoes erupt in celebration! Fire cards gain +20% stats. Exclusive infernal cards available!",
    element: "fire",
    startDate: "2026-07-01",
    endDate: "2026-07-08",
    statModifier: 0.2,
    seasonalCardIds: ["infernal-phoenix", "molten-titan", "ember-dancer", "infernal-blade", "hellfire-rain"],
    packName: "Infernal Pack",
    packCost: 500,
    packColor: "from-red-900 to-orange-500",
    bannerGradient: "from-red-900/80 via-orange-800/60 to-background",
    icon: "🔥",
  },
  {
    id: "bloom-of-ages",
    name: "Bloom of Ages",
    description: "Ancient forests awaken! Nature cards gain +20% stats. Exclusive bloom cards available!",
    element: "nature",
    startDate: "2026-04-10",
    endDate: "2026-04-20",
    statModifier: 0.2,
    seasonalCardIds: ["bloom-mother", "crystal-stag", "fae-sprite", "thornbloom-staff", "bloom-burst"],
    packName: "Bloom Pack",
    packCost: 500,
    packColor: "from-green-900 to-emerald-500",
    bannerGradient: "from-green-900/80 via-emerald-800/60 to-background",
    icon: "🌸",
  },
];

export function getActiveEvents(now: Date = new Date()): SeasonalEvent[] {
  return SEASONAL_EVENTS.filter(event => {
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    end.setHours(23, 59, 59, 999);
    return now >= start && now <= end;
  });
}

export function getUpcomingEvents(now: Date = new Date()): SeasonalEvent[] {
  return SEASONAL_EVENTS.filter(event => {
    const start = new Date(event.startDate);
    return now < start;
  }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}

export function getPastEvents(now: Date = new Date()): SeasonalEvent[] {
  return SEASONAL_EVENTS.filter(event => {
    const end = new Date(event.endDate);
    end.setHours(23, 59, 59, 999);
    return now > end;
  });
}

export function getSeasonalStatMultiplier(element: Element, activeEvents: SeasonalEvent[]): number {
  let mult = 1.0;
  for (const event of activeEvents) {
    if (event.element === element) {
      mult += event.statModifier;
    }
  }
  return mult;
}

export function daysUntilEvent(event: SeasonalEvent): number {
  const now = new Date();
  const start = new Date(event.startDate);
  const diff = start.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function daysRemainingInEvent(event: SeasonalEvent): number {
  const now = new Date();
  const end = new Date(event.endDate);
  end.setHours(23, 59, 59, 999);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
