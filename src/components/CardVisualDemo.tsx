import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Sword, Shield, Sparkles, Heart, ArrowLeft } from "lucide-react";
import { allCards } from "@/data/cards";

const DEMO_CARD = allCards.find(c => c.id === "pyrothos")!;

const typeAccentColors: Record<string, string> = {
  god: "from-amber-500/20 via-transparent to-purple-500/10",
  hero: "from-red-500/15 via-transparent to-orange-500/10",
  weapon: "from-slate-400/15 via-transparent to-blue-400/10",
  spell: "from-purple-500/15 via-transparent to-indigo-500/10",
  trap: "from-emerald-500/15 via-transparent to-cyan-500/10",
};

export default function CardVisualDemo({ onBack }: { onBack: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [holoPos, setHoloPos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const [flipped, setFlipped] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setTilt({
      x: (y - 0.5) * -20,
      y: (x - 0.5) * 20,
    });
    setHoloPos({ x: x * 100, y: y * 100 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setHoloPos({ x: 50, y: 50 });
    setIsHovered(false);
  }, []);

  const card = DEMO_CARD;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-destructive/5" />
      
      {/* Floating embers in background */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full demo-ember pointer-events-none"
          style={{
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
            left: `${Math.random() * 100}%`,
            bottom: `-5%`,
            animationDelay: `${Math.random() * 6}s`,
            animationDuration: `${4 + Math.random() * 6}s`,
            background: `hsl(${30 + Math.random() * 20} ${80 + Math.random() * 20}% ${50 + Math.random() * 20}%)`,
          }}
        />
      ))}

      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors font-heading text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Game
      </button>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="font-heading text-2xl font-bold text-foreground mb-2 relative z-10"
      >
        Visual Upgrade Preview
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 0.3 }}
        className="text-sm text-muted-foreground mb-10 relative z-10"
      >
        Hover and move your mouse over the card · Click to flip
      </motion.p>

      {/* THE CARD — Entrance Animation (#6) */}
      <motion.div
        initial={{ scale: 0.3, rotateY: -180, opacity: 0 }}
        animate={{ scale: 1, rotateY: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 80, damping: 14, duration: 1.2 }}
        className="relative z-10"
      >
        {/* Holographic Tilt Container (#1) */}
        <div
          ref={cardRef}
          className="cursor-pointer select-none"
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
          onClick={() => setFlipped(!flipped)}
          style={{
            perspective: "800px",
          }}
        >
          <div
            className="relative w-72 h-[420px] transition-transform duration-150 ease-out"
            style={{
              transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transformStyle: "preserve-3d",
            }}
          >
            {/* Card flip inner */}
            <div
              className="w-full h-full transition-transform duration-600"
              style={{
                transformStyle: "preserve-3d",
                transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {/* ===== FRONT ===== */}
              <div
                className="absolute inset-0 rounded-xl overflow-hidden flex flex-col"
                style={{ backfaceVisibility: "hidden" }}
              >
                {/* Rarity Frame (#2) — Ornate gold border */}
                <div className="absolute inset-0 z-30 pointer-events-none rounded-xl demo-legendary-frame" />
                
                {/* Corner flourishes */}
                <div className="absolute top-2 left-2 w-6 h-6 z-30 pointer-events-none demo-corner-tl" />
                <div className="absolute top-2 right-2 w-6 h-6 z-30 pointer-events-none demo-corner-tr" />
                <div className="absolute bottom-2 left-2 w-6 h-6 z-30 pointer-events-none demo-corner-bl" />
                <div className="absolute bottom-2 right-2 w-6 h-6 z-30 pointer-events-none demo-corner-br" />

                {/* Card art area */}
                <div className="relative flex-1 overflow-hidden">
                  <img src={card.image} alt={card.name} className="w-full h-full object-cover" />

                  {/* Elemental Accent (#5) — type-based tint */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${typeAccentColors[card.type] || ""} pointer-events-none`} />

                  {/* Animated Art Overlay (#3) — light sweep */}
                  <div
                    className="absolute inset-0 pointer-events-none demo-light-sweep"
                    style={{ opacity: isHovered ? 0.6 : 0.3 }}
                  />

                  {/* Animated Art Overlay (#3) — ember particles on card */}
                  {isHovered && Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute rounded-full demo-card-ember pointer-events-none"
                      style={{
                        width: `${2 + Math.random() * 3}px`,
                        height: `${2 + Math.random() * 3}px`,
                        left: `${10 + Math.random() * 80}%`,
                        bottom: `0%`,
                        animationDelay: `${Math.random() * 2}s`,
                        animationDuration: `${2 + Math.random() * 2}s`,
                      }}
                    />
                  ))}

                  {/* Holographic rainbow sheen (#1) */}
                  <div
                    className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                    style={{
                      opacity: isHovered ? 0.35 : 0,
                      background: `radial-gradient(circle at ${holoPos.x}% ${holoPos.y}%, 
                        hsl(0 80% 65% / 0.3),
                        hsl(60 80% 65% / 0.2) 25%,
                        hsl(120 80% 65% / 0.2) 40%,
                        hsl(180 80% 65% / 0.2) 55%,
                        hsl(240 80% 65% / 0.2) 70%,
                        hsl(300 80% 65% / 0.2) 85%,
                        transparent 100%)`,
                      mixBlendMode: "overlay",
                    }}
                  />

                  {/* Rarity badge */}
                  <div className="absolute top-3 left-3 z-20">
                    <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-legendary text-primary-foreground tracking-wider shadow-lg">
                      ★ Legendary
                    </span>
                  </div>

                  {/* Type badge */}
                  <div className="absolute top-3 right-3 z-20">
                    <span className="text-[10px] font-medium uppercase px-2.5 py-1 rounded-full bg-card/80 text-foreground backdrop-blur-sm">
                      {card.type}
                    </span>
                  </div>
                </div>

                {/* Stat area with Hover Detail Panel (#7) + Stat Bar Redesign (#4) */}
                <div
                  className="bg-card/95 backdrop-blur-sm border-t-2 border-primary/30 relative z-20 transition-all duration-300 ease-out overflow-hidden"
                  style={{
                    padding: isHovered ? "12px 12px 14px" : "10px 12px",
                  }}
                >
                  {/* Top accent line */}
                  <div className="absolute -top-[1px] left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
                  
                  <h3 className="font-heading text-sm font-bold text-foreground mb-2 truncate">{card.name}</h3>

                  {/* Stat Bar Redesign (#4) — Gem-shaped badges */}
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex items-center gap-1.5 bg-destructive/15 border border-destructive/30 rounded-lg px-2.5 py-1 demo-stat-gem">
                      <Sword className="w-3.5 h-3.5 text-destructive" />
                      <span className="font-heading font-bold text-xs text-destructive">{card.attack}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-rare/15 border border-rare/30 rounded-lg px-2.5 py-1 demo-stat-gem">
                      <Shield className="w-3.5 h-3.5 text-rare" />
                      <span className="font-heading font-bold text-xs text-rare">{card.defense}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 rounded-lg px-2.5 py-1 demo-stat-gem">
                      <Heart className="w-3.5 h-3.5 text-green-400" />
                      <span className="font-heading font-bold text-xs text-green-400">{card.hp}</span>
                    </div>
                    <div className="ml-auto flex items-center gap-1 bg-primary/15 border border-primary/30 rounded-lg px-2 py-1">
                      <Sparkles className="w-3 h-3 text-primary" />
                      <span className="font-heading font-bold text-[9px] text-primary truncate max-w-[70px]">{card.specialAbility.name}</span>
                    </div>
                  </div>

                  {/* Hover Detail Panel (#7) — expanded info */}
                  <div
                    className="transition-all duration-300 ease-out overflow-hidden"
                    style={{
                      maxHeight: isHovered ? "80px" : "0px",
                      opacity: isHovered ? 1 : 0,
                      marginTop: isHovered ? "8px" : "0px",
                    }}
                  >
                    <div className="rounded-lg bg-secondary/60 p-2 border border-border/50">
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        {card.specialAbility.description}
                      </p>
                      {card.synergies.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <span className="text-[9px] font-semibold text-synergy">
                            🔗 {card.synergies.length} synerg{card.synergies.length === 1 ? "y" : "ies"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Legendary glow effect */}
                <div className="absolute inset-0 rounded-xl pointer-events-none demo-legendary-glow" />
              </div>

              {/* ===== BACK ===== */}
              <div
                className="absolute inset-0 rounded-xl overflow-hidden bg-card flex flex-col border-[3px] border-legendary"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <div className="absolute inset-0 z-10 pointer-events-none rounded-xl demo-legendary-frame" />
                <div className="p-4 flex flex-col h-full relative z-20 overflow-hidden">
                  <h3 className="font-heading text-sm font-bold text-foreground mb-2">{card.name}</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">{card.lore}</p>
                  
                  <div className="rounded-lg bg-secondary p-2.5 mb-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-legendary" />
                      <span className="text-xs font-bold text-foreground">{card.specialAbility.name}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{card.specialAbility.description}</p>
                  </div>

                  {card.synergies.length > 0 && (
                    <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-synergy">Synergies</span>
                      {card.synergies.map((syn) => {
                        const partner = allCards.find(c => c.id === syn.partnerId);
                        return (
                          <div key={syn.partnerId} className="rounded-lg bg-synergy/10 p-2 border border-synergy/20">
                            <span className="text-[10px] font-bold text-synergy">{syn.name}</span>
                            <span className="text-[10px] text-muted-foreground"> — {partner?.name}</span>
                            <p className="text-[9px] text-synergy/80 mt-0.5">{syn.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Feature labels */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="mt-10 flex flex-wrap justify-center gap-2 relative z-10 max-w-lg"
      >
        {[
          "1. Holographic Tilt",
          "2. Rarity Frame",
          "3. Art Overlay",
          "4. Stat Gems",
          "5. Elemental Accent",
          "6. Entrance Anim",
          "7. Hover Panel",
        ].map((label) => (
          <span
            key={label}
            className="text-[10px] px-2.5 py-1 rounded-full bg-secondary text-muted-foreground border border-border font-medium"
          >
            {label}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
