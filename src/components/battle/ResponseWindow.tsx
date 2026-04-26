import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ResponseWindow as EngineResponseWindow, ResponseWindowCause, PlayerSide } from "@/lib/battleEngine";
import { getOneEffectForCard } from "@/lib/cardOneEffect";

type Option =
  | { id: string; type: "trap"; label: string; desc: string; slotIndex: number }
  | { id: string; type: "spell"; label: string; desc: string; handIndex: number }
  | { id: string; type: "effect"; label: string; desc: string; fieldIndex: number }
  | { id: string; type: "pass"; label: string; desc: string };

export default function ResponseWindow(props: {
  open: boolean;
  responseWindow: EngineResponseWindow;
  responderSide: PlayerSide;
  autoPassMs?: number;
  onPass: () => void;
  onTrap: (slotIndex: number) => void;
  onQuickSpell: (handIndex: number) => void;
  onEffect: (fieldIndex: number) => void;
}) {
  const { open, responseWindow, responderSide, onPass, onTrap, onQuickSpell, onEffect, autoPassMs = 10_000 } = props;

  const cause = responseWindow.cause;
  const traps = useMemo(() => {
    return responderSide.traps
      .map((t, idx) => ({ t, idx }))
      .filter(({ t }) => t && t.faceDown && t.card.trapEffect?.trigger === cause)
      .map(({ t, idx }) => ({
        slotIndex: idx,
        label: t!.card.name,
        desc: `Trap • ${t!.card.trapEffect?.effect ?? "counter"}${t!.card.trapEffect?.value != null ? ` ${t!.card.trapEffect.value}` : ""}`,
      }));
  }, [responderSide.traps, cause]);

  const quicks = useMemo(() => {
    return responderSide.hand
      .map((c, idx) => ({ c, idx }))
      .filter(({ c }) => c.type === "spell" && c.spellSpeed === "quick")
      .map(({ c, idx }) => ({
        handIndex: idx,
        label: `${c.name} (Quick)`,
        desc: c.spellEffect ? `${c.spellEffect.type}${c.spellEffect.value != null ? ` ${c.spellEffect.value}` : ""}` : "Quick spell",
      }));
  }, [responderSide.hand]);

  const effects = useMemo(() => {
    return responderSide.field
      .map((fc, idx) => ({ fc, idx }))
      .filter(({ fc }) => {
        if (!fc) return false;
        const eff = getOneEffectForCard(fc.card);
        if (!eff || eff.timing !== "activate") return false;
        if (fc.abilityUsed || fc.stunned || fc.abilityRechargeIn !== undefined) return false;
        const hpCost = eff.hpCost ?? 6;
        return (responderSide.hp ?? 0) > hpCost;
      })
      .map(({ fc, idx }) => {
        const eff = getOneEffectForCard(fc!.card)!;
        const hpCost = eff.hpCost ?? 6;
        return {
          fieldIndex: idx,
          label: `Invoke ${fc!.card.name}`,
          desc: `Effect • Cost ${hpCost} HP${eff.requiresTarget ? " • Targets" : ""}`,
        };
      });
  }, [responderSide.field, responderSide.hp]);

  const options: Option[] = useMemo(() => {
    return [
      ...traps.map((t) => ({ id: `trap-${t.slotIndex}`, type: "trap" as const, label: t.label, desc: t.desc, slotIndex: t.slotIndex })),
      ...quicks.map((q) => ({ id: `quick-${q.handIndex}`, type: "spell" as const, label: q.label, desc: q.desc, handIndex: q.handIndex })),
      ...effects.map((e) => ({ id: `eff-${e.fieldIndex}`, type: "effect" as const, label: e.label, desc: e.desc, fieldIndex: e.fieldIndex })),
      { id: "pass", type: "pass" as const, label: "Pass", desc: "Let the action resolve" },
    ];
  }, [traps, quicks, effects]);

  const causeLabel = useMemo(() => causeToLabel(cause), [cause]);
  const triggerLine = useMemo(() => computeTriggerLine(responseWindow), [responseWindow]);

  const [remaining, setRemaining] = useState(autoPassMs);
  useEffect(() => {
    if (!open) return;
    if (responseWindow.chainLocked) return;
    setRemaining(autoPassMs);
    const start = Date.now();
    const id = window.setInterval(() => {
      const left = Math.max(0, autoPassMs - (Date.now() - start));
      setRemaining(left);
      if (left === 0) {
        window.clearInterval(id);
        onPass();
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [open, responseWindow.id, responseWindow.chainLocked, autoPassMs, onPass]);

  // Esc closes by passing.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onPass();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onPass]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button
            type="button"
            aria-label="Close response window"
            onClick={onPass}
            className="absolute inset-0 bg-[rgba(0,0,0,0.65)] backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: 20, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 16, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            className="relative w-[min(92vw,520px)] panel-gold p-5 md:p-6 overflow-hidden"
            style={{ boxShadow: "0 30px 90px rgba(0,0,0,0.85), 0 0 40px rgba(245,200,66,0.18)" }}
          >
            <div className="corner-deco absolute inset-0" />

            <div className="relative z-10">
              <div className="text-center">
                <div className="font-stat text-[11px] tracking-[0.35em] text-[#c9a74a]">◆ {causeLabel.toUpperCase()} ◆</div>
                <div className="mt-2 font-heading text-xl gold-text">Response Window</div>
                <div className="mt-1 font-lore text-[#d6c293] text-sm">{triggerLine}</div>
                <div className="mt-3 text-[11px] text-[#d6c293]/80">
                  {traps.length === 0 && quicks.length === 0 && effects.length === 0
                    ? "No counters available — pass to continue."
                    : `${traps.length} face-down trap${traps.length !== 1 ? "s" : ""} · ${quicks.length} quick spell${quicks.length !== 1 ? "s" : ""} · ${effects.length} invoke${effects.length !== 1 ? "s" : ""}`}
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {options.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    data-testid={`resp-${o.id}`}
                    onClick={() => {
                      if (o.type === "pass") onPass();
                      else if (o.type === "trap") onTrap(o.slotIndex);
                      else if (o.type === "spell") onQuickSpell(o.handIndex);
                      else onEffect(o.fieldIndex);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg text-left transition",
                      "hover:bg-[rgba(245,200,66,0.08)]",
                    )}
                    style={{ background: "rgba(10,6,3,0.62)", border: "1px solid rgba(212,175,55,0.28)" }}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: "linear-gradient(180deg, rgba(245,200,66,0.12), rgba(186,104,200,0.10))",
                        border: "1px solid rgba(212,175,55,0.35)",
                        boxShadow: "0 0 18px rgba(245,200,66,0.12)",
                      }}
                    >
                      <span className="text-lg">
                        {o.type === "trap" ? "🪤" : o.type === "spell" ? "✦" : o.type === "effect" ? "✧" : "→"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-heading text-sm text-[#f8e4a1] truncate">{o.label}</div>
                      <div className="text-xs text-[#d6c293]/80 truncate">{o.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="text-[10px] font-stat tracking-[0.25em] text-[#7e6a2e]">AUTO-PASS IN</div>
                <div className="text-[12px] font-heading text-[#f8e4a1]">{Math.ceil(remaining / 1000)}s</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function causeToLabel(cause: ResponseWindowCause): string {
  if (cause === "on_attacked") return "Attack declared";
  if (cause === "on_enemy_play") return "Enemy summon";
  if (cause === "on_spell_cast") return "Spell cast";
  return "Response Window";
}

function computeTriggerLine(rw: EngineResponseWindow): string {
  if (rw.pendingAttack) {
    return `Attack declared on ${rw.pendingAttack.targetFieldIndex === "direct" ? "you" : `slot ${rw.pendingAttack.targetFieldIndex + 1}`}`;
  }
  if (rw.pendingPlay) return "Opponent plays a card!";
  if (rw.pendingSpellCast) return "Opponent casts a spell!";
  return "Respond?";
}

