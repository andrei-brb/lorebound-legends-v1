import bronzePackImg from "@/assets/packs/bronze-pack.png";
import silverPackImg from "@/assets/packs/silver-pack.png";
import goldPackImg from "@/assets/packs/gold-pack.png";
import arcanePackImg from "@/assets/packs/arcane-pack.png";
import { cn } from "@/lib/utils";

export type BoosterPackVariant = "bronze" | "silver" | "gold" | "arcane";

const packImages: Record<BoosterPackVariant, string> = {
  bronze: bronzePackImg,
  silver: silverPackImg,
  gold: goldPackImg,
  arcane: arcanePackImg,
};

const packLabels: Record<BoosterPackVariant, string> = {
  bronze: "Bronze Pack",
  silver: "Silver Pack",
  gold: "Gold Pack",
  arcane: "Arcane Pack",
};

const sizeClasses = {
  sm: "w-[72px] h-[104px]",
  md: "w-[140px] h-[200px]",
  lg: "w-full h-full min-h-[160px]",
} as const;

export default function BoosterPackArt({
  variant,
  size = "md",
  className,
  showShine = true,
}: {
  variant: BoosterPackVariant;
  size?: keyof typeof sizeClasses;
  className?: string;
  showShine?: boolean;
}) {
  return (
    <div
      className={cn("relative", sizeClasses[size], className)}
      aria-label={packLabels[variant]}
    >
      <img
        src={packImages[variant]}
        alt={packLabels[variant]}
        className="h-full w-full object-contain"
        loading="lazy"
        draggable={false}
      />
      {showShine && (
        <div
          className="pointer-events-none absolute inset-0 opacity-60 mix-blend-screen"
          style={{
            background:
              "linear-gradient(115deg,transparent 40%, rgba(255,255,255,0.25) 50%, transparent 60%)",
            backgroundSize: "200% 100%",
            animation: "holographic-pass 4s linear infinite",
          }}
        />
      )}
    </div>
  );
}

export function packVariantFromId(packId: string): BoosterPackVariant {
  if (packId === "bronze" || packId === "silver" || packId === "gold" || packId === "arcane") {
    return packId;
  }
  return "bronze";
}
