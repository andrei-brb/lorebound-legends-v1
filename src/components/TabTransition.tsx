import { type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TabTransitionProps {
  tabKey: string;
  reduceMotion?: boolean;
  children: ReactNode;
}

/**
 * Wraps tab content in framer-motion fade+slide. When reduceMotion is true,
 * children render without animation.
 */
export default function TabTransition({ tabKey, reduceMotion, children }: TabTransitionProps) {
  if (reduceMotion) {
    return <div key={tabKey}>{children}</div>;
  }
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={tabKey}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
