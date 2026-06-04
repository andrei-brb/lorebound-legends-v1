import { WifiOff } from "lucide-react";
import GlassPanel from "@/components/scene/GlassPanel";

export const OFFLINE_FEATURE_MESSAGE = "Sign in via Discord Activity to use this feature.";

interface Props {
  feature?: string;
  className?: string;
}

/** Standard banner when a hall needs Discord Activity auth. */
export default function OfflineBanner({ feature, className }: Props) {
  const text = feature
    ? `Sign in via Discord Activity to ${feature}.`
    : OFFLINE_FEATURE_MESSAGE;

  return (
    <GlassPanel hue="var(--primary)" glow={0.25} padding="md" className={className}>
      <div className="flex items-start gap-3 text-sm text-muted-foreground">
        <WifiOff className="w-5 h-5 shrink-0 text-primary/80 mt-0.5" />
        <p>{text}</p>
      </div>
    </GlassPanel>
  );
}
