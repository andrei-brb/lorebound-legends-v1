import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import BattlefieldGround from "./BattlefieldGround";
import BattleZone from "./BattleZone";

export interface ZoneState {
  cardImage: string | null;
  characterColor?: string;
  characterAccent?: string;
}

export interface SideState {
  monsters: ZoneState[]; // length 5
  spells: ZoneState[]; // length 5
}

export type ZoneRef = {
  side: "player" | "opponent";
  row: "monsters" | "spells";
  index: number;
};

interface Props {
  player: SideState;
  opponent: SideState;
  highlightZones?: ZoneRef[];
  attackingZone?: ZoneRef | null;
  targetableZones?: ZoneRef[];
  hoveredZone?: ZoneRef | null;
  onZoneClick?: (side: "player" | "opponent", row: "monsters" | "spells", index: number) => void;
  onZoneHover?: (zone: ZoneRef | null) => void;
}

const ZONE_SPACING_X = 1.25;
const ROW_Z = {
  opponentSpell: -2.6,
  opponentMonster: -1.2,
  playerMonster: 1.2,
  playerSpell: 2.6,
};

function eq(a: ZoneRef | null | undefined, side: ZoneRef["side"], row: ZoneRef["row"], i: number) {
  return !!a && a.side === side && a.row === row && a.index === i;
}

export default function BattlefieldSceneV2({
  player,
  opponent,
  highlightZones = [],
  attackingZone = null,
  targetableZones = [],
  hoveredZone = null,
  onZoneClick,
  onZoneHover,
}: Props) {
  const isHighlighted = (side: ZoneRef["side"], row: ZoneRef["row"], i: number) =>
    highlightZones.some((h) => h.side === side && h.row === row && h.index === i);
  const isTargetable = (side: ZoneRef["side"], row: ZoneRef["row"], i: number) =>
    targetableZones.some((h) => h.side === side && h.row === row && h.index === i);

  const handleOver = (z: ZoneRef) => (e: any) => {
    e.stopPropagation();
    onZoneHover?.(z);
  };
  const handleOut = () => onZoneHover?.(null);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 10, 7.5], fov: 38 }}
      gl={{ antialias: true }}
      onCreated={({ camera }) => {
        camera.lookAt(new THREE.Vector3(0, 0, 0.4));
      }}
    >
      <color attach="background" args={["#04020c"]} />
      <fog attach="fog" args={["#04020c", 12, 32]} />

      <ambientLight intensity={0.42} color="#cdb8ff" />
      <directionalLight
        position={[4, 14, 6]}
        intensity={1.15}
        color="#fff1cf"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-7, 5, -5]} intensity={1.0} color="#a855f7" />
      <pointLight position={[7, 5, 5]} intensity={0.9} color="#f6c66b" />
      <pointLight position={[0, 4, 0]} intensity={0.5} color="#e9d5ff" distance={10} />

      <Suspense fallback={null}>
        <BattlefieldGround />

        {opponent.spells.map((z, i) => {
          const ref: ZoneRef = { side: "opponent", row: "spells", index: i };
          return (
            <BattleZone
              key={`o-s-${i}`}
              position={[(i - 2) * ZONE_SPACING_X, 0, ROW_Z.opponentSpell]}
              kind="spell"
              cardImage={z.cardImage}
              side="opponent"
              highlight={isHighlighted("opponent", "spells", i)}
              targetable={isTargetable("opponent", "spells", i)}
              hovered={eq(hoveredZone, "opponent", "spells", i)}
              onClick={() => onZoneClick?.("opponent", "spells", i)}
              onPointerOver={handleOver(ref)}
              onPointerOut={handleOut}
            />
          );
        })}

        {opponent.monsters.map((z, i) => {
          const ref: ZoneRef = { side: "opponent", row: "monsters", index: i };
          return (
            <BattleZone
              key={`o-m-${i}`}
              position={[(i - 2) * ZONE_SPACING_X, 0, ROW_Z.opponentMonster]}
              kind="monster"
              cardImage={z.cardImage}
              side="opponent"
              highlight={isHighlighted("opponent", "monsters", i)}
              targetable={isTargetable("opponent", "monsters", i)}
              hovered={eq(hoveredZone, "opponent", "monsters", i)}
              onClick={() => onZoneClick?.("opponent", "monsters", i)}
              onPointerOver={handleOver(ref)}
              onPointerOut={handleOut}
            />
          );
        })}

        {player.monsters.map((z, i) => {
          const ref: ZoneRef = { side: "player", row: "monsters", index: i };
          return (
            <BattleZone
              key={`p-m-${i}`}
              position={[(i - 2) * ZONE_SPACING_X, 0, ROW_Z.playerMonster]}
              kind="monster"
              cardImage={z.cardImage}
              side="player"
              highlight={isHighlighted("player", "monsters", i)}
              attacking={eq(attackingZone, "player", "monsters", i)}
              hovered={eq(hoveredZone, "player", "monsters", i)}
              onClick={() => onZoneClick?.("player", "monsters", i)}
              onPointerOver={handleOver(ref)}
              onPointerOut={handleOut}
            />
          );
        })}

        {player.spells.map((z, i) => {
          const ref: ZoneRef = { side: "player", row: "spells", index: i };
          return (
            <BattleZone
              key={`p-s-${i}`}
              position={[(i - 2) * ZONE_SPACING_X, 0, ROW_Z.playerSpell]}
              kind="spell"
              cardImage={z.cardImage}
              side="player"
              highlight={isHighlighted("player", "spells", i)}
              hovered={eq(hoveredZone, "player", "spells", i)}
              onClick={() => onZoneClick?.("player", "spells", i)}
              onPointerOver={handleOver(ref)}
              onPointerOut={handleOut}
            />
          );
        })}
      </Suspense>
    </Canvas>
  );
}

