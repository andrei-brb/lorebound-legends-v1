import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { Group } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

type Props = {
  /** URL imported by Vite, e.g. `import modelUrl from "@/assets/models/foo.glb"` */
  url: string;
  /** Scales the model uniformly. */
  scale?: number;
  /** Extra className applied to the canvas wrapper. */
  className?: string;
};

function Model({ url, scale = 1 }: { url: string; scale?: number }) {
  const gltf = useGLTF(url);
  const scene = useMemo(() => clone(gltf.scene) as Group, [gltf.scene]);
  return <primitive object={scene} scale={scale} />;
}

/**
 * Lightweight transparent 3D layer intended to sit above a card token.
 * For now we keep it simple: no controls, basic lights, cached GLTF.
 */
export default function CardCharacter3D({ url, scale = 1, className }: Props) {
  return (
    <div className={className}>
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 1.15, 2.3], fov: 35 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 5, 2]} intensity={1.0} />
        <directionalLight position={[-3, 2, -2]} intensity={0.5} />
        <Suspense fallback={null}>
          <group position={[0, -0.65, 0]}>
            <Model url={url} scale={scale} />
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
}

// Preload helps avoid a hitch the first time the card is played.
export function preloadCardCharacter3D(url: string) {
  useGLTF.preload(url);
}

