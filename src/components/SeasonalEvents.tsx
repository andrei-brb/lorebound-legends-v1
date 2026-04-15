import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, Sparkles, Gift, ChevronRight, Star } from "lucide-react";
import { SEASONAL_EVENTS, getActiveEvents, getUpcomingEvents, getPastEvents, daysUntilEvent, daysRemainingInEvent, type SeasonalEvent } from "@/lib/eventEngine";
import { allSeasonalCards } from "@/data/seasonalCards";
import { allCards } from "@/data/cards";
import { addCardToCollection, savePlayerState, type PlayerState } from "@/lib/playerState";
import GameCard from "./GameCard";
import PackOpening from "./PackOpening";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { elementEmoji } from "@/lib/elementSystem";

interface SeasonalEventsProps {
  playerState: PlayerState;
  onStateChange: (state: PlayerState) => void;
}

export default function SeasonalEvents({ playerState, onStateChange }: SeasonalEventsProps) {
  const [selectedEvent, setSelectedEvent] = useState<SeasonalEvent | null>(null);
  const [packCardIds, setPackCardIds] = useState<string[] | null>(null);
  const [pendingState, setPendingState] = useState<PlayerState | null>(null);
  const activeEvents = getActiveEvents();
  const upcomingEvents = getUpcomingEvents();
  const pastEvents = getPastEvents();

  const buySeasonalPack = (event: SeasonalEvent) => {
    if (playerState.gold < event.packCost) {
      toast({ title: "Not enough gold!", description: `You need ${event.packCost} gold.`, variant: "destructive" });
      return;
    }

    let newState = { ...playerState, gold: playerState.gold - event.packCost };
    const pool = allSeasonalCards.filter(c => event.seasonalCardIds.includes(c.id));
    const pulledIds: string[] = [];

    for (let i = 0; i < 3; i++) {
      const card = pool[Math.floor(Math.random() * pool.length)];
      const result = addCardToCollection(newState, card.id);
      newState = result.state;
      pulledIds.push(card.id);
    }

    setPendingState(newState);
    setPackCardIds(pulledIds);
  };

  const handlePackComplete = (cardIds: string[]) => {
    if (pendingState) {
      savePlayerState(pendingState);
      onStateChange(pendingState);
    }
    setPackCardIds(null);
    setPendingState(null);
  };

  const renderEventCard = (event: SeasonalEvent, status: "active" | "upcoming" | "past") => {
    const eventCards = allSeasonalCards.filter(c => event.seasonalCardIds.includes(c.id));

    return (
      <motion.div
        key={event.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "rounded-2xl border overflow-hidden cursor-pointer transition-all hover:scale-[1.02]",
          status === "active" ? "border-primary/50 shadow-lg shadow-primary/20" : "border-border",
          status === "past" && "opacity-60"
        )}
        onClick={() => setSelectedEvent(event)}
      >
        <div className={cn("p-6 bg-gradient-to-r", event.bannerGradient)}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{event.icon}</span>
                <h3 className="font-heading text-xl font-bold text-foreground">{event.name}</h3>
                {status === "active" && (
                  <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold animate-pulse">
                    LIVE NOW
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground max-w-md">{event.description}</p>
            </div>
            <div className="text-right">
              {status === "active" && (
                <div className="flex items-center gap-1 text-primary">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-bold">{daysRemainingInEvent(event)}d left</span>
                </div>
              )}
              {status === "upcoming" && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">In {daysUntilEvent(event)} days</span>
                </div>
              )}
              {status === "past" && (
                <span className="text-xs text-muted-foreground">Ended</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-muted-foreground">
              {elementEmoji[event.element]} {event.element.charAt(0).toUpperCase() + event.element.slice(1)} +{event.statModifier * 100}% stats
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{eventCards.length} exclusive cards</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">Seasonal Events</h2>
        <p className="text-sm text-muted-foreground mt-1">Limited-time events with exclusive cards and battle modifiers</p>
      </div>

      {/* Active Events */}
      {activeEvents.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-heading text-lg font-bold text-primary flex items-center gap-2">
            <Sparkles className="w-5 h-5" /> Active Events
          </h3>
          {activeEvents.map(e => renderEventCard(e, "active"))}
        </div>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5" /> Upcoming Events
          </h3>
          {upcomingEvents.map(e => renderEventCard(e, "upcoming"))}
        </div>
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-heading text-lg font-bold text-muted-foreground">Past Events</h3>
          {pastEvents.map(e => renderEventCard(e, "past"))}
        </div>
      )}

      {activeEvents.length === 0 && upcomingEvents.length === 0 && pastEvents.length === 0 && (
        <div className="text-center py-20">
          <Calendar className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No seasonal events configured yet.</p>
        </div>
      )}

      {/* Event Detail Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={() => setSelectedEvent(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl border border-border max-w-4xl w-full max-h-[80vh] overflow-y-auto p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className={cn("rounded-xl p-6 mb-6 bg-gradient-to-r", selectedEvent.bannerGradient)}>
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{selectedEvent.icon}</span>
                  <div>
                    <h2 className="font-heading text-2xl font-bold text-foreground">{selectedEvent.name}</h2>
                    <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{elementEmoji[selectedEvent.element]} {selectedEvent.element} cards +{selectedEvent.statModifier * 100}%</span>
                  <span>📅 {selectedEvent.startDate} → {selectedEvent.endDate}</span>
                </div>
              </div>

              {/* Seasonal Pack */}
              {getActiveEvents().some(e => e.id === selectedEvent.id) && (
                <div className="mb-6">
                  <button
                    onClick={() => buySeasonalPack(selectedEvent)}
                    disabled={playerState.gold < selectedEvent.packCost}
                    className={cn(
                      "w-full rounded-xl p-4 font-heading font-bold text-lg flex items-center justify-center gap-3 transition-all",
                      "bg-gradient-to-r text-primary-foreground hover:scale-[1.02] disabled:opacity-50 disabled:scale-100",
                      selectedEvent.packColor
                    )}
                  >
                    <Gift className="w-5 h-5" />
                    Open {selectedEvent.packName} — {selectedEvent.packCost} Gold (3 Cards)
                  </button>
                </div>
              )}

              {/* Exclusive Cards */}
              <h3 className="font-heading text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-legendary" /> Exclusive Cards
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {allSeasonalCards
                  .filter(c => selectedEvent.seasonalCardIds.includes(c.id))
                  .map(card => (
                    <GameCard key={card.id} card={card} size="sm" />
                  ))}
              </div>

              <button
                onClick={() => setSelectedEvent(null)}
                className="mt-6 w-full py-2 rounded-lg bg-secondary text-secondary-foreground font-heading font-bold text-sm"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pack Opening Overlay */}
      <AnimatePresence>
        {packCardIds && (
          <PackOpening
            cardIds={packCardIds}
            onComplete={handlePackComplete}
            playerState={playerState}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
