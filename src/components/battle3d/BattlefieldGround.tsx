import { useMemo } from "react";
import * as THREE from "three";

/**
 * Celestial duel altar: black marble dais with gold filigree zone frames
 * and a deep violet penumbra. Pure procedural canvas — no assets needed.
 */
export default function BattlefieldGround() {
  const texture = useMemo(() => {
    const size = 1024;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d")!;

    const base = ctx.createRadialGradient(
      size / 2,
      size / 2,
      size * 0.15,
      size / 2,
      size / 2,
      size * 0.7
    );
    base.addColorStop(0, "#1a1230");
    base.addColorStop(0.55, "#0c0820");
    base.addColorStop(1, "#04020c");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = "rgba(168, 130, 240, 0.07)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 60; i++) {
      ctx.beginPath();
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.moveTo(x, y);
      let cx = x,
        cy = y;
      for (let s = 0; s < 6; s++) {
        cx += (Math.random() - 0.5) * 140;
        cy += (Math.random() - 0.5) * 140;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    const drawGoldRect = (inset: number, lw: number, alpha: number) => {
      ctx.strokeStyle = `rgba(232, 192, 110, ${alpha})`;
      ctx.lineWidth = lw;
      ctx.strokeRect(inset, inset, size - inset * 2, size - inset * 2);
    };
    drawGoldRect(28, 3, 0.85);
    drawGoldRect(40, 1, 0.55);
    drawGoldRect(56, 1, 0.3);

    const corners = [
      [60, 60],
      [size - 60, 60],
      [60, size - 60],
      [size - 60, size - 60],
    ] as const;
    ctx.strokeStyle = "rgba(248, 214, 138, 0.9)";
    ctx.lineWidth = 1.5;
    corners.forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.stroke();
    });

    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.strokeStyle = "rgba(220, 180, 100, 0.55)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 110, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, 92, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 60, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 60, Math.sin(a) * 60);
      ctx.lineTo(Math.cos(a) * 110, Math.sin(a) * 110);
      ctx.stroke();
    }
    ctx.restore();

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 9]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.55}
          metalness={0.35}
          emissive="#2a1850"
          emissiveIntensity={0.08}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <ringGeometry args={[7.4, 7.9, 64]} />
        <meshStandardMaterial color="#1a1028" roughness={0.9} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshBasicMaterial color="#02010a" />
      </mesh>

      <mesh position={[0, 2.5, -16]}>
        <planeGeometry args={[50, 9]} />
        <meshBasicMaterial color="#5b21b6" transparent opacity={0.22} />
      </mesh>
      <mesh position={[0, 1.2, -16.1]}>
        <planeGeometry args={[50, 4]} />
        <meshBasicMaterial color="#c084fc" transparent opacity={0.12} />
      </mesh>

      <Starfield />
    </group>
  );
}

function Starfield() {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const N = 400;
    const positions = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = 18 + Math.random() * 22;
      const y = (Math.random() - 0.2) * 18;
      positions[i * 3 + 0] = Math.cos(theta) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(theta) * r - 8;
    }
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);

  return (
    <points geometry={geom}>
      <pointsMaterial
        size={0.08}
        color="#f5e6c8"
        transparent
        opacity={0.85}
        sizeAttenuation
      />
    </points>
  );
}

