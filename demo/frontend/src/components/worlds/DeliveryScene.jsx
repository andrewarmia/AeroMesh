import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';

// ── City ground + roads ───────────────────────────────────────
export function CityGround() {
  return (
    <group>
      {/* Road base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
        <planeGeometry args={[32, 32]} />
        <meshStandardMaterial color="#1c1c1e" roughness={0.95} />
      </mesh>

      {/* Road lines */}
      {[-4, 0, 4].map((x, i) => (
        <mesh key={`lx${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.055, 0]}>
          <planeGeometry args={[0.08, 30]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.15} />
        </mesh>
      ))}
      {[-4, 0, 4].map((z, i) => (
        <mesh key={`lz${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.055, z]}>
          <planeGeometry args={[30, 0.08]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.15} />
        </mesh>
      ))}

      {/* Dashed centre lines */}
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh key={`d${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.054, -11 + i * 2]}>
          <planeGeometry args={[0.05, 0.9]} />
          <meshStandardMaterial color="#ffeb3b" transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

// ── City buildings ────────────────────────────────────────────
const BUILDINGS = [
  { p: [8, 0, 8],   s: [3.5, 5, 3.0], c: '#1e2a3a', w: '#ffd54f' },
  { p: [-8, 0, 8],  s: [2.8, 7, 2.8], c: '#162030', w: '#b3e5fc' },
  { p: [8, 0, -8],  s: [3.0, 4, 2.5], c: '#1a1f2e', w: '#ffe082' },
  { p: [-8, 0, -8], s: [3.2, 6, 3.2], c: '#0f1820', w: '#c8e6c9' },
  { p: [11, 0, 0],  s: [2.0, 8, 2.0], c: '#141c28', w: '#f8bbd0' },
  { p: [-11, 0, 0], s: [2.2, 5, 2.2], c: '#1a2232', w: '#d1c4e9' },
  { p: [0, 0, 11],  s: [4.0, 3, 2.0], c: '#1e2030', w: '#fff9c4' },
  { p: [0, 0, -11], s: [3.5, 9, 3.0], c: '#10181f', w: '#e1f5fe' },
  { p: [6, 0, -10], s: [1.8, 4, 1.8], c: '#1a2030', w: '#fce4ec' },
  { p: [-6, 0, 10], s: [2.0, 6, 2.0], c: '#161c28', w: '#e8f5e9' },
];

export function CityBuildings() {
  return (
    <>
      {BUILDINGS.map(({ p, s, c, w }, i) => (
        <group key={i} position={p}>
          {/* Main body */}
          <mesh position={[0, s[1] / 2, 0]} castShadow>
            <boxGeometry args={s} />
            <meshStandardMaterial color={c} metalness={0.4} roughness={0.6} />
          </mesh>
          {/* Window glow */}
          {Array.from({ length: Math.floor(s[1] / 1.2) }).map((_, j) => (
            <mesh key={j} position={[s[0] / 2 + 0.01, 0.8 + j * 1.1, 0]}>
              <boxGeometry args={[0.02, 0.35, s[2] * 0.6]} />
              <meshStandardMaterial color={w} emissive={w} emissiveIntensity={0.6} transparent opacity={0.8} />
            </mesh>
          ))}
          {/* Rooftop light */}
          <pointLight position={[0, s[1] + 0.5, 0]} color={w} intensity={0.4} distance={4} />
        </group>
      ))}
    </>
  );
}

// ── Delivery zone rings on ground ─────────────────────────────
const ZONE_COLORS = ['#00e676', '#00d4ff', '#ffab40', '#ff1744', '#b06fe8', '#ff9100', '#f06292'];

export function DeliveryZones({ positions }) {
  const refs = useRef([]);

  useFrame(({ clock }) => {
    refs.current.forEach((r, i) => {
      if (r) r.material.opacity = 0.35 + Math.sin(clock.getElapsedTime() * 1.5 + i * 1.1) * 0.25;
    });
  });

  return (
    <>
      {positions.map((pos, i) => {
        const color = ZONE_COLORS[i % ZONE_COLORS.length];
        return (
          <group key={i} position={[pos.x, -0.04, pos.z]}>
            {/* Outer ring */}
            <mesh ref={(el) => { refs.current[i] = el; }} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.7, 0.95, 48]} />
              <meshBasicMaterial color={color} transparent side={THREE.DoubleSide} />
            </mesh>
            {/* Centre dot */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.22, 16]} />
              <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
            </mesh>
            {/* Zone number */}
            <Billboard position={[0, 0.15, 0]}>
              <Text fontSize={0.18} color={color} anchorX="center" outlineWidth={0.015} outlineColor="#000">
                Z{i + 1}
              </Text>
            </Billboard>
            <pointLight color={color} intensity={0.3} distance={2.5} position={[0, 0.1, 0]} />
          </group>
        );
      })}
    </>
  );
}

// ── Dropped package on ground ─────────────────────────────────
export function DroppedPackage({ position, color }) {
  return (
    <group position={[position.x, 0.1, position.z]}>
      <mesh castShadow>
        <boxGeometry args={[0.28, 0.2, 0.28]} />
        <meshStandardMaterial color="#8d6e63" roughness={0.9} />
      </mesh>
      {/* Tape cross */}
      <mesh><boxGeometry args={[0.3, 0.04, 0.04]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} /></mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}><boxGeometry args={[0.3, 0.04, 0.04]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} /></mesh>
      <pointLight color={color} intensity={0.5} distance={1.5} />
    </group>
  );
}

// ── Package hanging under drone ───────────────────────────────
export function HangingPackage({ color }) {
  return (
    <group position={[0, -0.52, 0]}>
      {/* String */}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.36, 4]} />
        <meshStandardMaterial color="#9e9e9e" />
      </mesh>
      {/* Box */}
      <mesh castShadow>
        <boxGeometry args={[0.28, 0.2, 0.28]} />
        <meshStandardMaterial color="#8d6e63" roughness={0.9} metalness={0.1} />
      </mesh>
      {/* Tape */}
      <mesh><boxGeometry args={[0.3, 0.04, 0.04]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} /></mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}><boxGeometry args={[0.3, 0.04, 0.04]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} /></mesh>
    </group>
  );
}

// ── Delivery animation loop controller ────────────────────────
// Returns a ref that other components read from each frame
export function useDeliveryLoop(drones, leaderId) {
  const state = useRef({
    phase: 'idle',   // idle | descending | hovering | ascending
    droneId: null,
    offsetY: 0,
    pauseT: 0,
    idleT: 3,        // start first delivery quickly
  });

  const [dropped, setDropped] = useState([]);  // [{pos, color}]
  const prevDropped = useRef([]);

  useFrame((_, dt) => {
    const s = state.current;
    s.idleT += dt;

    if (s.phase === 'idle' && s.idleT > 5.5) {
      const eligible = drones.filter(
        (d) => d.state === 'HONEST' && d.id !== leaderId,
      );
      if (eligible.length > 0) {
        const pick = eligible[Math.floor(Math.random() * eligible.length)];
        s.droneId  = pick.id;
        s.offsetY  = 0;
        s.pauseT   = 0;
        s.idleT    = 0;
        s.phase    = 'descending';
      }
    }

    if (s.phase === 'descending') {
      s.offsetY = Math.max(-3.6, s.offsetY - dt * 1.8);
      if (s.offsetY <= -3.6) { s.phase = 'hovering'; s.pauseT = 0; }
    } else if (s.phase === 'hovering') {
      s.pauseT += dt;
      if (s.pauseT > 1.4) {
        // "Drop" package — find drone position
        const drone = drones.find((d) => d.id === s.droneId);
        if (drone) {
          const color = ZONE_COLORS[s.droneId % ZONE_COLORS.length];
          const newPkg = { id: Date.now(), pos: { x: drone.x * 0.031, z: drone.y * 0.031 }, color };
          // Convert 2D svg coords to 3D hex positions
          prevDropped.current = [...prevDropped.current.slice(-5), newPkg];
          setDropped([...prevDropped.current]);
        }
        s.phase = 'ascending';
      }
    } else if (s.phase === 'ascending') {
      s.offsetY = Math.min(0, s.offsetY + dt * 2.0);
      if (s.offsetY >= 0) { s.phase = 'idle'; s.droneId = null; s.idleT = 0; }
    }
  });

  return { deliveryStateRef: state, dropped };
}

// ── City lights ───────────────────────────────────────────────
export function CityLights() {
  return (
    <>
      <ambientLight intensity={0.08} color="#1a237e" />
      <pointLight position={[0, 15, 0]} intensity={0.3} color="#283593" distance={30} />
      <directionalLight position={[5, 10, 5]} intensity={0.25} color="#7986cb" />
    </>
  );
}
