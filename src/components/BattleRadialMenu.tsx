import { motion, AnimatePresence } from "framer-motion";
import { Sword, Zap, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FieldCard } from "@/lib/battleEngine";

interface BattleRadialMenuProps {
  fieldCard: FieldCard;
  visible: boolean;
  canAttack: boolean;
  canAbility: boolean;
  canDirectAttack: boolean;
  ap: number;
  onAttack: () => void;
  onAbility: () => void;
  onDirectAttack: () => void;
  onDismiss: () => void;
}

export default function BattleRadialMenu({
  fieldCard: _fc,
  visible,
  canAttack,
  canAbility,
  canDirectAttack,
  ap,
  onAttack,
  onAbility,
  onDirectAttack,
  onDismiss,
}: BattleRadialMenuProps) {
  const noAp = ap < 1;

  const actions = [
    {
      key: "attack",
      icon: Sword,
      label: "Attack",
      color: "bg-destructive hover:bg-destructive/80 text-destructive-foreground",
      disabled: !canAttack || noAp,
      onClick: onAttack,
      show: true,
    },
    {
      key: "ability",
      icon: Zap,
      label: "Ability",
      color: "bg-legendary hover:brightness-110 text-primary-foreground",
      disabled: !canAbility,
      onClick: onAbility,
      show: canAbility,
    },
    {
      key: "direct",
      icon: Target,
      label: "Direct",
      color: "bg-destructive hover:bg-destructive/80 text-destructive-foreground",
      disabled: !canDirectAttack || noAp,
      onClick: onDirectAttack,
      show: canDirectAttack,
    },
  ].filter(a => a.show);

  // Position actions in an arc above the card
  const getOffset = (index: number, total: number) => {
    const spacing = 40;
    const startX = -((total - 1) * spacing) / 2;
    return { x: startX + index * spacing, y: -48 };
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Invisible backdrop to dismiss */}
          <div className="fixed inset-0 z-40" onClick={onDismiss} />

          <div className="absolute inset-0 z-50 pointer-events-none">
            <div className="relative w-full h-full">
              {actions.map((action, i) => {
                const offset = getOffset(i, actions.length);
                return (
                  <motion.button
                    key={action.key}
                    initial={{ opacity: 0, y: 0, scale: 0.5 }}
                    animate={{ opacity: 1, y: offset.y, x: offset.x, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.2, delay: i * 0.05 }}
                    disabled={action.disabled}
                    onClick={(e) => { e.stopPropagation(); action.onClick(); }}
                    className={cn(
                      "pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
                      "w-9 h-9 rounded-full flex items-center justify-center shadow-lg",
                      "transition-all",
                      action.color,
                      action.disabled && "opacity-40 cursor-not-allowed",
                    )}
                    title={action.label}
                  >
                    <action.icon className="w-4 h-4" />
                  </motion.button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
