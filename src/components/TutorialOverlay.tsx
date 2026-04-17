import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlayerState } from "@/lib/playerState";
import { TUTORIALS, type TutorialStep } from "@/data/tutorials";

interface TutorialOverlayProps {
  tabId: string;
  playerState: PlayerState;
  onStateChange: (state: PlayerState) => void;
}

/**
 * Spotlight tutorial. Shows a centered modal with sequential steps the first
 * time a tab is opened. Persists completion to playerState.tutorialsCompleted.
 * Disabled when settings.reduceMotion is on (still shows static modal but no
 * spotlight transitions).
 */
export default function TutorialOverlay({ tabId, playerState, onStateChange }: TutorialOverlayProps) {
  const completed = useMemo(() => new Set(playerState.tutorialsCompleted ?? []), [playerState.tutorialsCompleted]);
  const steps: TutorialStep[] = TUTORIALS[tabId] ?? [];
  const [open, setOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const reduceMotion = !!playerState.settings?.reduceMotion;

  useEffect(() => {
    setStepIdx(0);
    if (steps.length === 0) { setOpen(false); return; }
    if (completed.has(tabId)) { setOpen(false); return; }
    setOpen(true);
  }, [tabId, steps.length, completed]);

  if (!open || steps.length === 0) return null;
  const step = steps[stepIdx];

  const finish = () => {
    setOpen(false);
    if (!completed.has(tabId)) {
      onStateChange({
        ...playerState,
        tutorialsCompleted: [...(playerState.tutorialsCompleted ?? []), tabId],
      });
    }
  };

  const next = () => {
    if (stepIdx + 1 >= steps.length) finish();
    else setStepIdx(stepIdx + 1);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          key={stepIdx}
          initial={reduceMotion ? false : { y: 16, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-6"
        >
          <button
            onClick={finish}
            className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
            aria-label="Skip tutorial"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="text-5xl mb-3">{step.icon}</div>
          <h3 className="font-heading text-xl font-bold text-foreground mb-2">{step.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>

          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={i === stepIdx ? "w-6 h-1.5 rounded-full bg-primary" : "w-1.5 h-1.5 rounded-full bg-muted"}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={finish}>Skip</Button>
              <Button size="sm" onClick={next}>
                {stepIdx + 1 >= steps.length ? "Got it" : (<>Next <ChevronRight className="w-3.5 h-3.5" /></>)}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
