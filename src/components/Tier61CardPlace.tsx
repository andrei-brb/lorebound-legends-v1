import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

import vyraka from "@/assets/cards/mythic/hero-fire-vyraka.png";
import marenthil from "@/assets/cards/mythic/hero-water-marenthil.png";
import thalwen from "@/assets/cards/mythic/hero-nature-thalwen.png";
import vexar from "@/assets/cards/mythic/hero-shadow-vexar.png";
import seraphine from "@/assets/cards/mythic/hero-light-seraphine.png";

const HAND = [
  { id: "vyraka", img: vyraka, name: "Vyraka", color: "#dc2626", accent: "#fbbf24" },
  { id: "marenthil", img: marenthil, name: "Marenthil", color: "#0ea5e9", accent: "#67e8f9" },
  { id: "thalwen", img: thalwen, name: "Thalwen", color: "#16a34a", accent: "#bef264" },
  { id: "vexar", img: vexar, name: "Vexar", color: "#6d28d9", accent: "#c084fc" },
  { id: "seraphine", img: seraphine, name: "Seraphine", color: "#f59e0b", accent: "#fef3c7" },
];

type Placed = { slot: number; card: (typeof HAND)[number]; key: number };
type Flying = {
  id: number;
  card: (typeof HAND)[number];
  from: { x: number; y: number; w: number; h: number };
  to: { x: number; y: number; w: number; h: number };
  slot: number;
};

export default function Tier61CardPlace() {
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [flying, setFlying] = useState<Flying[]>([]);
  const [usedHand, setUsedHand] = useState<Record<string, boolean>>({});
  const keyRef = useRef(0);
  const flyIdRef = useRef(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const handRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const summon = (card: (typeof HAND)[number]) => {
    if (usedHand[card.id]) return;
    const emptySlots = [0, 1, 2, 3, 4].filter((s) => !placed.find((p) => p.slot === s));
    if (emptySlots.length === 0) return;
    const slot = emptySlots[Math.floor(Math.random() * emptySlots.length)];

    const handEl = handRefs.current[card.id];
    const slotEl = slotRefs.current[slot];
    const containerEl = containerRef.current;
    if (!handEl || !slotEl || !containerEl) return;

    const cRect = containerEl.getBoundingClientRect();
    const hRect = handEl.getBoundingClientRect();
    const sRect = slotEl.getBoundingClientRect();

    const fly: Flying = {
      id: flyIdRef.current++,
      card,
      from: {
        x: hRect.left - cRect.left,
        y: hRect.top - cRect.top,
        w: hRect.width,
        h: hRect.height,
      },
      to: {
        x: sRect.left - cRect.left,
        y: sRect.top - cRect.top,
        w: sRect.width,
        h: sRect.height,
      },
      slot,
    };

    setUsedHand((u) => ({ ...u, [card.id]: true }));
    setFlying((arr) => [...arr, fly]);
  };

  const onFlyComplete = (f: Flying) => {
    setPlaced((prev) => [...prev, { slot: f.slot, card: f.card, key: keyRef.current++ }]);
    setFlying((arr) => arr.filter((x) => x.id !== f.id));
  };

  const reset = () => {
    setPlaced([]);
    setFlying([]);
    setUsedHand({});
  };

  const summonRandom = () => {
    const available = HAND.filter((c) => !usedHand[c.id]);
    if (!available.length) return;
    summon(available[Math.floor(Math.random() * available.length)]);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">T61 · Card → Battlefield Placement</h2>
        <p className="text-xs text-muted-foreground">
          Click a card in your hand. It physically flies from the hand to an empty battlefield slot (no spinning),
          then locks in with a glow + shockwave.
        </p>
      </div>

      <div className="flex gap-2">
        <Button onClick={summonRandom} disabled={placed.length + flying.length >= 5}>
          Summon Random
        </Button>
        <Button variant="outline" onClick={reset}>
          Reset Field
        </Button>
      </div>

      <div ref={containerRef} className="relative">
        <div className="relative w-full h-[420px] rounded-xl overflow-hidden border border-border bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800">
          <div
            className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(transparent 0%, hsl(var(--primary) / 0.08) 100%), repeating-linear-gradient(90deg, transparent 0 60px, hsl(var(--primary) / 0.15) 60px 61px), repeating-linear-gradient(0deg, transparent 0 60px, hsl(var(--primary) / 0.15) 60px 61px)",
              transform: "perspective(600px) rotateX(60deg)",
              transformOrigin: "bottom",
            }}
          />

          <div className="absolute inset-x-0 bottom-12 flex justify-center gap-4 px-6">
            {[0, 1, 2, 3, 4].map((slot) => {
              const card = placed.find((p) => p.slot === slot);
              return (
                <div
                  key={slot}
                  ref={(el) => {
                    slotRefs.current[slot] = el;
                  }}
                  className="relative w-24 h-32 rounded-md border-2 border-dashed border-primary/30 flex items-center justify-center"
                >
                  {!card && <span className="text-[10px] text-muted-foreground">Slot {slot + 1}</span>}

                  {card && (
                    <motion.div
                      key={card.key}
                      className="absolute inset-0"
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.06, 1] }}
                      transition={{ duration: 0.5 }}
                    >
                      <motion.div
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 pointer-events-none"
                        style={{ borderColor: card.card.accent }}
                        initial={{ width: 20, height: 20, opacity: 0.9 }}
                        animate={{ width: 240, height: 240, opacity: 0 }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                      />
                      <motion.div
                        className="absolute inset-0 rounded-md pointer-events-none"
                        style={{ boxShadow: `0 0 40px 8px ${card.card.accent}` }}
                        initial={{ opacity: 0.9 }}
                        animate={{ opacity: 0.4 }}
                        transition={{ duration: 0.6 }}
                      />
                      <img
                        src={card.card.img}
                        alt={card.card.name}
                        className="w-full h-full object-cover rounded-md border-2 shadow-2xl"
                        style={{ borderColor: card.card.accent }}
                      />
                      <div
                        className="absolute -bottom-5 left-0 right-0 text-center text-[10px] font-bold"
                        style={{ color: card.card.accent }}
                      >
                        {card.card.name}
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-4 mt-4">
          <div className="text-xs text-muted-foreground mb-3">Your hand — click to summon</div>
          <div className="flex gap-3 justify-center flex-wrap">
            {HAND.map((card) => {
              const used = usedHand[card.id];
              return (
                <motion.button
                  key={card.id}
                  ref={(el) => {
                    handRefs.current[card.id] = el;
                  }}
                  onClick={() => summon(card)}
                  disabled={used || placed.length + flying.length >= 5}
                  whileHover={{ y: -8, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative w-20 h-28 rounded-md overflow-hidden border-2 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ borderColor: card.accent }}
                >
                  <img src={card.img} alt={card.name} className="w-full h-full object-cover" />
                  <div
                    className="absolute bottom-0 inset-x-0 text-[9px] font-bold text-center py-0.5"
                    style={{ background: `${card.color}cc`, color: "white" }}
                  >
                    {card.name}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        <AnimatePresence>
          {flying.map((f) => (
            <motion.div
              key={f.id}
              className="absolute pointer-events-none rounded-md overflow-hidden border-2 shadow-2xl z-50"
              style={{
                borderColor: f.card.accent,
                top: 0,
                left: 0,
                width: f.from.w,
                height: f.from.h,
              }}
              initial={{
                x: f.from.x,
                y: f.from.y,
                width: f.from.w,
                height: f.from.h,
                opacity: 1,
              }}
              animate={{
                x: f.to.x,
                y: f.to.y,
                width: f.to.w,
                height: f.to.h,
                opacity: 1,
              }}
              transition={{
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1],
              }}
              onAnimationComplete={() => onFlyComplete(f)}
            >
              <img src={f.card.img} alt={f.card.name} className="w-full h-full object-cover" />
              <motion.div
                className="absolute inset-0 rounded-md"
                style={{ boxShadow: `0 0 30px 6px ${f.card.accent}` }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.8, 0.4] }}
                transition={{ duration: 0.7 }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

