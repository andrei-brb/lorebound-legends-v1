import { useRef, useEffect, useMemo } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Mesh, MathUtils, TextureLoader, type Texture } from "three";

export type ZoneKind = "monster" | "spell";

interface BattleZoneProps {
  position: [number, number, number];
  kind: ZoneKind;
  cardImage?: string | null;
  /** Owner side — flips card facing */
  side: "player" | "opponent";
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
  highlight?: boolean;
  /** Yellow attacker selection ring */
  attacking?: boolean;
  /** Red attack-target highlight */
  targetable?: boolean;
  /** Visual hover lift */
  hovered?: boolean;
}

const CARD_W = 1.05;
const CARD_H = 1.5;

const textureCache = new Map<string, Texture>();
const loader = new TextureLoader();
function getTexture(url: string): Texture {
  let t = textureCache.get(url);
  if (!t) {
    t = loader.load(url);
    textureCache.set(url, t);
  }
  return t;
}

export default function BattleZone({
  position,
  kind,
  cardImage,
  side,
  onClick,
  onPointerOver,
  onPointerOut,
  highlight = false,
  attacking = false,
  targetable = false,
  hovered = false,
}: BattleZoneProps) {
  const slotRef = useRef<Mesh>(null);
  const cardRef = useRef<Mesh>(null);
  const shockRef = useRef<Mesh>(null);
  const targetRingRef = useRef<Mesh>(null);

  const texture = useMemo(() => (cardImage ? getTexture(cardImage) : null), [cardImage]);

  const progress = useRef(cardImage ? 1 : 0);
  const shock = useRef(2);
  const prevHasCard = useRef(!!cardImage);

  useEffect(() => {
    if (cardImage && !prevHasCard.current) shock.current = 0;
    prevHasCard.current = !!cardImage;
  }, [cardImage]);

  const accent = kind === "monster" ? "#22d3ee" : "#c084fc";
  const ringColor = attacking
    ? "#fbbf24"
    : targetable
      ? "#ef4444"
      : highlight
        ? "#fde047"
        : accent;

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const target = cardImage ? 1 : 0;
    progress.current = MathUtils.damp(progress.current, target, 7, delta);
    const p = progress.current;
    const eased = 1 - Math.pow(1 - p, 3);

    if (slotRef.current) {
      const m = slotRef.current.material as any;
      const pulse = attacking || targetable ? Math.sin(t * 6) * 0.25 + 0.4 : 0;
      m.opacity = 0.18 + Math.sin(t * 2 + position[0]) * 0.05 + (highlight ? 0.4 : 0) + pulse;
      m.color.set(ringColor);
    }

    if (cardRef.current) {
      const startY = 3.5;
      const endY = 0.04;
      const hoverLift = hovered ? 0.25 : 0;
      cardRef.current.position.y = MathUtils.lerp(startY, endY, eased) + hoverLift;
      const s = MathUtils.lerp(0.6, 1, eased) * (hovered ? 1.05 : 1);
      cardRef.current.scale.setScalar(s);
      const m = cardRef.current.material as any;
      m.opacity = Math.min(1, p * 1.5);
      m.transparent = true;
    }

    if (shockRef.current) {
      shock.current += delta;
      const sp = Math.min(1, shock.current / 0.6);
      const m = shockRef.current.material as any;
      if (sp < 1) {
        const sc = 0.2 + sp * 2.0;
        shockRef.current.scale.set(sc, sc, sc);
        m.opacity = (1 - sp) * 0.7;
        m.visible = true;
      } else {
        m.opacity = 0;
        m.visible = false;
      }
    }

    if (targetRingRef.current) {
      const m = targetRingRef.current.material as any;
      const visible = attacking || targetable;
      m.opacity = visible ? 0.6 + Math.sin(t * 8) * 0.3 : 0;
      m.color.set(attacking ? "#fbbf24" : "#ef4444");
      const sc = 1 + (visible ? Math.sin(t * 4) * 0.05 : 0);
      targetRingRef.current.scale.set(sc, sc, sc);
    }
  });

  const cardRotZ = side === "opponent" ? Math.PI : 0;

  return (
    <group position={position}>
      <mesh
        ref={slotRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.011, 0]}
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <planeGeometry args={[CARD_W + 0.15, CARD_H + 0.15]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.25} />
      </mesh>

      <mesh ref={targetRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
        <ringGeometry args={[0.65, 0.78, 48]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0} />
      </mesh>

      <mesh ref={shockRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.4, 0.55, 48]} />
        <meshBasicMaterial color={accent} transparent opacity={0} />
      </mesh>

      {cardImage && texture && (
        <mesh
          ref={cardRef}
          rotation={[-Math.PI / 2, 0, cardRotZ]}
          position={[0, 0.04, 0]}
          onClick={onClick}
        >
          <planeGeometry args={[CARD_W, CARD_H]} />
          <meshStandardMaterial map={texture} roughness={0.5} transparent />
        </mesh>
      )}
    </group>
  );
}

