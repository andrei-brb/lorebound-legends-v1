import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, Gift, Palette, Sparkles, Star, Crown, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface BoostRewardsProps {
  isBoosting?: boolean;
}

interface BoostReward {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 1 | 2 | 3;
  type: "card-back" | "flair" | "bonus";
}

const BOOST_REWARDS: BoostReward[] = [
  // Tier 1 (any boost)
  { id: "back-amethyst", name: "Amethyst Card Back", description: "A shimmering purple card back with crystal patterns.", icon: "💎", tier: 1, type: "card-back" },
  { id: "flair-booster", name: "Booster Flair", description: "A special ⚡ icon next to your name on leaderboards.", icon: "⚡", tier: 1, type: "flair" },
  { id: "bonus-daily-pack", name: "Bonus Daily Pack", description: "Claim an extra free pack every day while boosting.", icon: "🎁", tier: 1, type: "bonus" },

  // Tier 2 (2+ boosts)
  { id: "back-dragon", name: "Dragon Scale Card Back", description: "Animated dragon scales shimmer across this legendary card back.", icon: "🐉", tier: 2, type: "card-back" },
  { id: "flair-crown", name: "Crown Flair", description: "A golden crown icon displayed on your profile.", icon: "👑", tier: 2, type: "flair" },
  { id: "bonus-gold", name: "+50% Gold Bonus", description: "Earn 50% more gold from battles while boosting.", icon: "💰", tier: 2, type: "bonus" },

  // Tier 3 (6+ months)
  { id: "back-mythic", name: "Mythic Arcana Card Back", description: "The ultimate animated card back with swirling mythic energy.", icon: "✨", tier: 3, type: "card-back" },
  { id: "flair-legend", name: "Legend Flair", description: "An exclusive animated border around your name.", icon: "🌟", tier: 3, type: "flair" },
  { id: "bonus-exclusive", name: "Exclusive Booster Card", description: "A unique card only available to long-term boosters.", icon: "🃏", tier: 3, type: "bonus" },
];

const tierColors = {
  1: "border-purple-500/40 bg-purple-500/10",
  2: "border-legendary/40 bg-legendary/10",
  3: "border-primary/40 bg-primary/10",
};

const tierLabels = {
  1: "Boost Tier",
  2: "Super Boost",
  3: "Legendary Boost",
};

export default function BoostRewards({ isBoosting = false }: BoostRewardsProps) {
  const [selectedTier, setSelectedTier] = useState<1 | 2 | 3>(1);

  const filteredRewards = BOOST_REWARDS.filter(r => r.tier === selectedTier);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <Zap className="w-6 h-6 text-purple-400" /> Server Boost Rewards
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Boost the Discord server to unlock exclusive cosmetics and bonuses
        </p>
      </div>

      {/* Boost Status */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "rounded-xl border p-6 text-center",
          isBoosting ? "border-purple-500/50 bg-gradient-to-b from-purple-500/20 to-transparent" : "border-border bg-card/50"
        )}
      >
        <Zap className={cn("w-10 h-10 mx-auto mb-2", isBoosting ? "text-purple-400" : "text-muted-foreground/30")} />
        <h3 className="font-heading text-lg font-bold text-foreground">
          {isBoosting ? "You're Boosting! ⚡" : "Not Currently Boosting"}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {isBoosting
            ? "Thank you for supporting the server! Your rewards are active."
            : "Boost the Discord server to unlock exclusive rewards below."}
        </p>
      </motion.div>

      {/* Tier Selector */}
      <div className="flex gap-2">
        {([1, 2, 3] as const).map(tier => (
          <button
            key={tier}
            onClick={() => setSelectedTier(tier)}
            className={cn(
              "flex-1 py-2 rounded-lg font-heading font-bold text-sm transition-all",
              selectedTier === tier
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {tierLabels[tier]}
          </button>
        ))}
      </div>

      {/* Rewards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {filteredRewards.map((reward, i) => (
          <motion.div
            key={reward.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "rounded-xl border p-5 text-center relative overflow-hidden",
              tierColors[reward.tier],
              !isBoosting && "opacity-60"
            )}
          >
            <div className="text-3xl mb-2">{reward.icon}</div>
            <h4 className="font-heading font-bold text-sm text-foreground">{reward.name}</h4>
            <p className="text-xs text-muted-foreground mt-1">{reward.description}</p>
            <div className="mt-3">
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                reward.type === "card-back" && "bg-purple-500/20 text-purple-300",
                reward.type === "flair" && "bg-legendary/20 text-legendary",
                reward.type === "bonus" && "bg-primary/20 text-primary",
              )}>
                {reward.type === "card-back" ? "Card Back" : reward.type === "flair" ? "Profile Flair" : "Gameplay Bonus"}
              </span>
            </div>
            {!isBoosting && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                <span className="text-xs font-bold text-muted-foreground">🔒 Boost to Unlock</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
