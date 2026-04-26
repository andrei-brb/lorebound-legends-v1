/**
 * RewardPopup — celestial altar–themed modal that announces a reward.
 * No emojis: uses lucide-react icons as real placeholders.
 */
import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Coins,
  Gem,
  Layers,
  Sparkles,
  Crown,
  Shield,
  Star,
  Award,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type RewardKind = "gold" | "gem" | "card" | "xp" | "rune" | "relic";
export type RewardRarity = "common" | "rare" | "legendary" | "mythic";

export interface RewardItem {
  kind: RewardKind;
  label: string;
  amount?: number;
  rarity?: RewardRarity;
}

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  rewards: RewardItem[];
  ctaLabel?: string;
}

const ICON_MAP: Record<RewardKind, LucideIcon> = {
  gold: Coins,
  gem: Gem,
  card: Layers,
  xp: Star,
  rune: Sparkles,
  relic: Crown,
};

const RARITY_RING: Record<RewardRarity, string> = {
  common: "ring-[hsl(230_10%_55%/0.5)]",
  rare: "ring-[hsl(220_80%_60%/0.6)]",
  legendary: "ring-[hsl(var(--altar-gold)/0.75)]",
  mythic: "ring-[hsl(320_90%_65%/0.75)]",
};

const RARITY_GLOW: Record<RewardRarity, string> = {
  common: "shadow-[0_0_18px_hsl(230_10%_55%/0.25)]",
  rare: "shadow-[0_0_22px_hsl(220_80%_60%/0.35)]",
  legendary: "shadow-[0_0_28px_hsl(var(--altar-gold)/0.55)]",
  mythic: "shadow-[0_0_32px_hsl(320_90%_65%/0.55)]",
};

export default function RewardPopup({
  open,
  onClose,
  title = "Reward Bestowed",
  subtitle = "The altar grants its favor.",
  rewards,
  ctaLabel = "Claim",
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const motes = useMemo(
    () =>
      Array.from({ length: 22 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 1.6 + Math.random() * 1.4,
        size: 2 + Math.random() * 3,
      })),
    [open],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <button
            aria-label="Close reward"
            onClick={onClose}
            className="absolute inset-0 bg-[hsl(var(--altar-ink)/0.78)] backdrop-blur-sm"
          />

          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="absolute left-1/2 top-1/2 h-[140vmax] w-[60vmax] -translate-x-1/2 -translate-y-1/2 opacity-40"
              style={{
                background:
                  "conic-gradient(from 90deg at 50% 50%, transparent 0deg, hsl(var(--altar-gold)/0.25) 12deg, transparent 24deg, transparent 60deg, hsl(var(--altar-violet)/0.18) 80deg, transparent 96deg, transparent 180deg, hsl(var(--altar-gold)/0.2) 200deg, transparent 220deg, transparent 300deg, hsl(var(--altar-violet)/0.18) 322deg, transparent 340deg)",
                filter: "blur(6px)",
                animation: "altar-godray 6s ease-in-out infinite",
              }}
            />
          </div>

          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {motes.map((m) => (
              <motion.span
                key={m.id}
                className="absolute rounded-full bg-[hsl(var(--altar-gold-bright))]"
                style={{
                  left: `${m.x}%`,
                  bottom: -10,
                  width: m.size,
                  height: m.size,
                  boxShadow: "0 0 8px hsl(var(--altar-gold-bright)/0.9)",
                }}
                initial={{ y: 0, opacity: 0 }}
                animate={{ y: -260 - Math.random() * 140, opacity: [0, 1, 0] }}
                transition={{ delay: m.delay, duration: m.dur, ease: "easeOut" }}
              />
            ))}
          </div>

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reward-title"
            initial={{ scale: 0.85, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="altar-panel relative z-10 w-[min(92vw,520px)] rounded-2xl px-7 pb-6 pt-8"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 rounded-md p-1.5 text-[hsl(46_30%_70%/0.7)] transition-colors hover:bg-[hsl(var(--altar-gold)/0.1)] hover:text-[hsl(var(--altar-gold-bright))]"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
                className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-full"
                style={{
                  background: "var(--gradient-gold)",
                  boxShadow: "var(--shadow-gold-glow)",
                }}
              >
                <Award className="h-7 w-7 text-[hsl(var(--altar-ink))]" strokeWidth={2.2} />
                <span
                  className="absolute -inset-1 rounded-full opacity-60"
                  style={{
                    background:
                      "radial-gradient(circle, hsl(var(--altar-gold-bright)/0.6) 0%, transparent 70%)",
                    filter: "blur(8px)",
                  }}
                />
              </motion.div>

              <h2 id="reward-title" className="font-heading text-xl uppercase tracking-[0.22em] altar-text-gold">
                {title}
              </h2>
              <div className="altar-hairline mt-2 w-44" />
              <p className="mt-2 text-center text-xs tracking-wide text-[hsl(46_25%_72%/0.75)]">{subtitle}</p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {rewards.map((r, i) => {
                const Icon = ICON_MAP[r.kind] ?? Shield;
                const rarity = r.rarity ?? "rare";
                return (
                  <motion.div
                    key={`${r.kind}-${i}-${r.label}`}
                    initial={{ opacity: 0, y: 14, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.15 + i * 0.07, type: "spring", stiffness: 220, damping: 20 }}
                    className={cn(
                      "relative flex flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-4 ring-1",
                      "bg-[hsl(var(--altar-glass)/0.55)]",
                      RARITY_RING[rarity],
                      RARITY_GLOW[rarity],
                    )}
                  >
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-lg"
                      style={{
                        background:
                          "linear-gradient(180deg, hsl(var(--altar-gold)/0.18), hsl(var(--altar-violet)/0.18))",
                        border: "1px solid hsl(var(--altar-gold)/0.35)",
                      }}
                    >
                      <Icon className="h-5 w-5 text-[hsl(var(--altar-gold-bright))]" strokeWidth={1.8} />
                    </div>
                    {typeof r.amount === "number" && (
                      <span className="font-heading text-base tabular-nums altar-text-gold">
                        ×{r.amount.toLocaleString()}
                      </span>
                    )}
                    <span className="text-center text-[10px] uppercase tracking-[0.16em] text-[hsl(46_25%_75%/0.85)]">
                      {r.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-6 flex justify-center">
              <Button
                onClick={onClose}
                className={cn(
                  "relative overflow-hidden border-0 px-8 font-heading uppercase tracking-[0.2em]",
                  "text-[hsl(var(--altar-ink))]",
                )}
                style={{
                  background: "var(--gradient-gold)",
                  boxShadow: "var(--shadow-gold-glow)",
                }}
              >
                <span className="relative z-10">{ctaLabel}</span>
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(120deg, transparent 30%, hsl(0 0% 100% / 0.45) 50%, transparent 70%)",
                    backgroundSize: "200% 100%",
                    animation: "card-shimmer 2.4s ease-in-out infinite",
                  }}
                />
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

