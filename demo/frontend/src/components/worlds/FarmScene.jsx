import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';

// ── Crop field ground ─────────────────────────────────────────
export function FarmGround() {
  const SIZE = 28;
  const ROWS = 14;
  const rowW = SIZE / ROWS;

  return (
    <group>
      {/* Base soil */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial color="#6b4226" roughness={1} />
      </mesh>

      {/* Alternating crop / soil strips */}
      {Array.from({ length: ROWS }).map((_, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[-(SIZE / 2) + i * rowW + rowW / 2, -0.055, 0]}
          receiveShadow
        >
          <planeGeometry args={[rowW * 0.68, SIZE]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#2e7d32' : '#388e3c'} roughness={0.9} />
        </mesh>
      ))}

      {/* Central path (dirt) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.054, 0]}>
        <planeGeometry args={[1.4, SIZE]} />
        <meshStandardMaterial color="#8d6e63" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.054, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[1.4, SIZE]} />
        <meshStandardMaterial color="#8d6e63" roughness={1} />
      </mesh>
    </group>
  );
}

// ── Crop instances ────────────────────────────────────────────
export function CropField() {
  const ref = useRef();
  const COUNT = 320;

  const data = useMemo(() => {
    const items = [];
    for (let x = -11; x <= 11; x += 1.0) {
      for (let z = -11; z <= 11; z += 0.85) {
        if (Math.abs(x) < 1.5 && Math.abs(z) < 1.5) continue; // leave centre clear for drones
        if (Math.sqrt(x * x + z * z) < 3.5) continue;         // no crops in drone formation area
        items.push({ x, z, h: 0.18 + Math.random() * 0.22, s: 0.9 + Math.random() * 0.2 });
        if (items.length >= COUNT) break;
      }
      if (items.length >= COUNT) break;
    }
    return items;
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    const m = new THREE.Matrix4();
    data.forEach(({ x, z, h, s }, i) => {
      m.makeScale(s, h / 0.2, s);
      m.setPosition(x, h / 2 - 0.05, z);
      ref.current.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  }, [data]);

  return (
    <instancedMesh ref={ref} args={[null, null, COUNT]} castShadow receiveShadow>
      <cylinderGeometry args={[0.045, 0.065, 0.2, 5]} />
      <meshStandardMaterial color="#43a047" roughness={0.8} />
    </instancedMesh>
  );
}

// ── Barn ──────────────────────────────────────────────────────
export function Barn() {
  return (
    <group position={[-10, 0, -10]}>
      {/* Walls */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <boxGeometry args={[3.0, 2.0, 2.2]} />
        <meshStandardMaterial color="#8d1c1c" roughness={0.9} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 2.2, 0]} castShadow>
        <coneGeometry args={[2.1, 1.2, 4]} />
        <meshStandardMaterial color="#4a0e0e" roughness={0.95} />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.5, 1.12]}>
        <boxGeometry args={[0.7, 1.0, 0.05]} />
        <meshStandardMaterial color="#4e342e" />
      </mesh>
      {/* Windows */}
      {[-0.9, 0.9].map((dx, i) => (
        <mesh key={i} position={[dx, 1.2, 1.12]}>
          <boxGeometry args={[0.45, 0.45, 0.05]} />
          <meshStandardMaterial color="#fff9c4" emissive="#fff9c4" emissiveIntensity={0.4} />
        </mesh>
      ))}
      <Billboard position={[0, 3.6, 0]}>
        <Text fontSize={0.28} color="#a5d6a7" outlineWidth={0.02} outlineColor="#000" anchorX="center">🌾 FARM A</Text>
      </Billboard>
    </group>
  );
}

// ── Trees ─────────────────────────────────────────────────────
export function Trees() {
  const POSITIONS = [
    [10, 0, -10], [-10, 0, 10], [11, 0, 5], [-11, 0, -5],
    [9, 0, 9], [-9, 0, -9], [6, 0, -11], [-6, 0, 11],
  ];
  return (
    <>
      {POSITIONS.map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh position={[0, 0.6, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.18, 1.2, 7]} />
            <meshStandardMaterial color="#5d4037" roughness={1} />
          </mesh>
          <mesh position={[0, 1.8, 0]} castShadow>
            <coneGeometry args={[0.7, 1.6, 7]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#2e7d32' : '#1b5e20'} roughness={0.9} />
          </mesh>
        </group>
      ))}
    </>
  );
}

// ── Water spray (Sparkles on each active drone) ───────────────
export function WaterSpray({ position }) {
  return (
    <group position={[position.x, 0.6, position.z]}>
      <Sparkles
        count={22}
        scale={[1.8, 0.5, 1.8]}
        size={1.8}
        speed={0.55}
        opacity={0.55}
        color="#7ecef4"
        noise={0.6}
      />
    </group>
  );
}

// ── Farm sky lights ───────────────────────────────────────────
export function FarmLights() {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) {
      // Gentle sun movement
      const t = clock.getElapsedTime() * 0.05;
      ref.current.position.set(Math.cos(t) * 20, 18, Math.sin(t) * 10);
    }
  });
  return (
    <>
      <directionalLight ref={ref} position={[15, 18, 5]} intensity={1.4} castShadow color="#fff8e1" />
      <ambientLight intensity={0.55} color="#e8f5e9" />
      <hemisphereLight skyColor="#87ceeb" groundColor="#6b4226" intensity={0.6} />
    </>
  );
}
