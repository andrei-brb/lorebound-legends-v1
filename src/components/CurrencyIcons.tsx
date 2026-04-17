import goldIcon from "@/assets/icons/icon-gold.png";
import stardustIcon from "@/assets/icons/icon-stardust.png";
import { cn } from "@/lib/utils";

type IconProps = {
  className?: string;
  title?: string;
};

export function GoldCurrencyIcon({ className, title = "Gold" }: IconProps) {
  return (
    <img
      src={goldIcon}
      alt=""
      title={title}
      className={cn("h-4 w-4 shrink-0 object-contain drop-shadow-[0_0_6px_hsl(var(--legendary)/0.35)]", className)}
    />
  );
}

export function StardustCurrencyIcon({ className, title = "Stardust" }: IconProps) {
  return (
    <img
      src={stardustIcon}
      alt=""
      title={title}
      className={cn("h-4 w-4 shrink-0 object-contain drop-shadow-[0_0_8px_hsl(var(--rare)/0.45)]", className)}
    />
  );
}
