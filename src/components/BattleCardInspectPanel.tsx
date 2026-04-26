import type { BattleLog, FieldCard } from "@/lib/battleEngine";
import type { GameCard } from "@/data/cards";
import { cn } from "@/lib/utils";
import { elementEmoji } from "@/lib/elementSystem";
import { Sword, Shield, Heart, Zap, Swords as SwordsIcon } from "lucide-react";
import { getOneEffectForCard } from "@/lib/cardOneEffect";

type Inspect =
  | { kind: "none" }
  | { kind: "hand"; card: GameCard }
  | { kind: "field"; fieldCard: FieldCard };

type Props = {
  inspect: Inspect;
  className?: string;
};

function badgeTone(type: BattleLog["type"] | "card"): string {
  switch (type) {
    case "attack":
    case "defeat":
      return "bg-destructive/15 text-destructive border-destructive/30";
    case "spell":
      return "bg-synergy/15 text-synergy border-synergy/30";
    case "ability":
      return "bg-legendary/15 text-legendary border-legendary/30";
    case "synergy":
      return "bg-primary/15 text-primary border-primary/30";
    case "card":
    default:
      return "bg-secondary/60 text-secondary-foreground border-border/50";
  }
}

export default function BattleCardInspectPanel({ inspect, className }: Props) {
  if (inspect.kind === "none") return null;

  const card = inspect.kind === "field" ? inspect.fieldCard.card : inspect.card;
  const atk = inspect.kind === "field" ? inspect.fieldCard.attack : card.attack ?? 0;
  const def = inspect.kind === "field" ? inspect.fieldCard.defense : card.defense ?? 0;
  const hpCur = inspect.kind === "field" ? inspect.fieldCard.currentHp : (card.hp ?? 0);
  const hpMax = inspect.kind === "field" ? inspect.fieldCard.maxHp : (card.hp ?? 0);
  const weapon = inspect.kind === "field" ? inspect.fieldCard.equippedWeapon : null;
  const abilityUsed = inspect.kind === "field" ? inspect.fieldCard.abilityUsed : false;
  const oneEff = card.type === "hero" || card.type === "god" ? getOneEffectForCard(card) : null;
  const effName = oneEff?.name ?? card.specialAbility?.name ?? null;
  const effDesc = oneEff?.description ?? card.specialAbility?.description ?? null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/40 bg-card/70 backdrop-blur-md overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.45)]",
        className,
      )}
    >
      <div className="p-3 border-b border-border/40">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-sm text-foreground truncate">{card.name}</span>
              {card.element && card.element !== "neutral" ? (
                <span className="text-xs">{elementEmoji[card.element]}</span>
              ) : null}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span className={cn("px-2 py-0.5 rounded-full text-[10px] border", badgeTone("card"))}>
                {card.rarity} · {card.type}
              </span>
              {weapon ? (
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] border", badgeTone("weapon"))}>
                  Weapon: {weapon.name}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div className="grid grid-cols-[92px_1fr] gap-3 items-start">
          <div className="w-[92px] h-[118px] rounded-xl overflow-hidden border border-border bg-black/20">
            <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
          </div>

          <div className="space-y-2">
            {(card.type === "hero" || card.type === "god") && (
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="flex items-center gap-1 text-destructive">
                  <Sword className="w-4 h-4" />
                  <span className="font-bold">{atk}</span>
                </div>
                <div className="flex items-center gap-1 text-blue-400">
                  <Shield className="w-4 h-4" />
                  <span className="font-bold">{def}</span>
                </div>
                <div className="flex items-center gap-1 text-green-400">
                  <Heart className="w-4 h-4" />
                  <span className="font-bold">{hpCur}{inspect.kind === "field" ? `/${hpMax}` : ""}</span>
                </div>
              </div>
            )}

            {card.type === "weapon" && card.weaponBonus && (
              <div className="text-[11px] text-legendary flex items-center gap-2">
                <SwordsIcon className="w-4 h-4" />
                <span className="font-bold">+{card.weaponBonus.attack}⚔</span>
                <span className="font-bold">+{card.weaponBonus.defense}🛡</span>
              </div>
            )}

            {card.type === "spell" && (
              <div className="text-[11px] text-synergy">
                <span className="font-heading font-bold">Spell:</span>{" "}
                <span className="text-foreground/85">{card.spellEffect?.type ?? "—"}</span>
              </div>
            )}

            {card.type === "trap" && (
              <div className="text-[11px] text-rose-200">
                <span className="font-heading font-bold">Trap</span>
              </div>
            )}
          </div>
        </div>

        {effName && effDesc ? (
          <div className="rounded-xl border border-border/40 bg-background/30 p-2.5">
            <div className="flex items-center gap-2">
              <Zap className={cn("w-4 h-4", abilityUsed ? "text-muted-foreground" : "text-legendary")} />
              <span className={cn("text-[12px] font-heading font-bold", abilityUsed ? "text-muted-foreground line-through" : "text-legendary")}>
                {effName}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-foreground/85 leading-snug">
              {effDesc}
            </p>
          </div>
        ) : null}

        {card.passiveAbility ? (
          <div className="text-[11px] text-muted-foreground">
            <span className="font-heading font-bold text-foreground/70">Passive:</span> {card.passiveAbility.description}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export type { Inspect };

