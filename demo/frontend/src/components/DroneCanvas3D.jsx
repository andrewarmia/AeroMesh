import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Grid, Text, Billboard, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useSimStore } from '../store/simStore';

// World components
import { FarmGround, CropField, Barn, Trees, FarmLights } from './worlds/FarmScene';
import {
  CityGround, CityBuildings, DeliveryZones, DroppedPackage, HangingPackage, CityLights,
} from './worlds/DeliveryScene';

// ── Shared delivery state (module-level, read by every Drone3D each frame) ────
const deliveryState = { phase: 'idle', droneId: null, offsetY: 0, pauseT: 0, idleT: 3.0 };
const ZONE_COLORS   = ['#00e676', '#00d4ff', '#ffab40', '#ff1744', '#b06fe8', '#ff9100', '#f06292'];

// ── Colour helpers ─────────────────────────────────────────────
function droneColor(drone, leaderId) {
  if (drone.id === leaderId && drone.state === 'HONEST') return '#00d4ff';
  switch (drone.state) {
    case 'HONEST':      return drone.role === 'GUARD' ? '#b06fe8' : '#00e676';
    case 'BYZANTINE':   return '#ff1744';
    case 'CRASHED':     return '#37474f';
    case 'QUARANTINED': return '#ff6d00';
    case 'SAFE_HOVER':  return '#ffab40';
    default:            return '#78909c';
  }
}

// ── 3-D hex layout ─────────────────────────────────────────────
function hexPositions3D(n = 7, radius = 4.5) {
  const positions = [new THREE.Vector3(0, 0, 0)];
  for (let i = 0; i < n - 1; i++) {
    const angle = (i * Math.PI * 2) / (n - 1) - Math.PI / 2;
    positions.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  return positions;
}

// ── Spinning rotor ─────────────────────────────────────────────
function Rotor({ position, color, speed = 1, crashed }) {
  const ref = useRef();
  useFrame((_, dt) => { if (ref.current && !crashed) ref.current.rotation.y += dt * 25 * speed; });
  return (
    <group position={position} ref={ref}>
      <mesh>
        <torusGeometry args={[0.25, 0.018, 6, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} transparent opacity={crashed ? 0.1 : 0.65} />
      </mesh>
      {[0, Math.PI / 2].map((rot, i) => (
        <mesh key={i} rotation={[0, rot, 0]}>
          <boxGeometry args={[0.5, 0.015, 0.06]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} transparent opacity={crashed ? 0.08 : 0.7} />
        </mesh>
      ))}
    </group>
  );
}

// ── Byzantine warning ring (extracted to obey rules-of-hooks) ─
function ByzRing() {
  const r = useRef();
  useFrame((_, dt) => { if (r.current) r.current.rotation.y += dt * 1.5; });
  return (
    <mesh ref={r}>
      <torusGeometry args={[1.1, 0.03, 8, 48]} />
      <meshStandardMaterial color="#ff1744" emissive="#ff1744" emissiveIntensity={1.5} />
    </mesh>
  );
}

// ── Drone quadcopter 3D ────────────────────────────────────────
function Drone3D({ drone, leaderId, targetPos, joining, worldView }) {
  const groupRef    = useRef();
  const glowRef     = useRef();
  const timeRef     = useRef(Math.random() * Math.PI * 2);
  const curPos      = useRef(new THREE.Vector3());
  const initialized = useRef(false);
  const droppedDroneIds = useSimStore((s) => s.droppedDroneIds);

  const color    = droneColor(drone, leaderId);
  const isLeader = drone.id === leaderId && drone.state === 'HONEST';
  const isByz    = drone.state === 'BYZANTINE';
  const isCrashed= drone.state === 'CRASHED';
  const zoneColor= ZONE_COLORS[drone.id % ZONE_COLORS.length];

  useEffect(() => {
    if (joining && groupRef.current) {
      const outside = new THREE.Vector3(targetPos.x * 3.8, 4.5, targetPos.z * 3.8);
      curPos.current.copy(outside);
      groupRef.current.position.copy(outside);
    }
  }, [joining]);

  useEffect(() => {
    if (!initialized.current) {
      curPos.current.set(targetPos.x, 0, targetPos.z);
      initialized.current = true;
    }
  }, []);

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    timeRef.current += dt;
    const t = timeRef.current;

    // Farm / delivery patrol drift (each drone has unique phase)
    const patrolActive = worldView !== 'bft' && !isCrashed;
    const isDelivering = worldView === 'delivery' && deliveryState.droneId === drone.id;
    const patrolX = (patrolActive && !isDelivering) ? Math.sin(t * 0.28 + drone.id * 0.85) * 1.6 : 0;
    const patrolZ = (patrolActive && !isDelivering) ? Math.cos(t * 0.20 + drone.id * 1.10) * 1.0 : 0;

    const hoverY  = isCrashed ? -0.15 : 0.85 + Math.sin(t * 1.2 + drone.id * 0.9) * 0.18;
    const deliveryOffsetY = isDelivering ? deliveryState.offsetY : 0;

    if (joining) {
      curPos.current.x = THREE.MathUtils.lerp(curPos.current.x, targetPos.x + patrolX, dt * 1.3);
      curPos.current.z = THREE.MathUtils.lerp(curPos.current.z, targetPos.z + patrolZ, dt * 1.3);
      curPos.current.y = THREE.MathUtils.lerp(curPos.current.y, hoverY + deliveryOffsetY, dt * 0.9);
    } else {
      curPos.current.x = THREE.MathUtils.lerp(curPos.current.x, targetPos.x + patrolX, dt * (isDelivering ? 8 : 4.5));
      curPos.current.z = THREE.MathUtils.lerp(curPos.current.z, targetPos.z + patrolZ, dt * (isDelivering ? 8 : 4.5));
      curPos.current.y = hoverY + deliveryOffsetY;
    }

    groupRef.current.position.copy(curPos.current);

    if (isByz) {
      groupRef.current.rotation.z = Math.sin(t * 8) * 0.12;
      groupRef.current.rotation.x = Math.cos(t * 9) * 0.08;
    } else {
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, dt * 5);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, dt * 5);
    }

    if (glowRef.current) {
      glowRef.current.intensity = isLeader
        ? 0.9 + Math.sin(t * 2) * 0.4
        : isByz ? 1.0 + Math.sin(t * 6) * 0.5 : 0;
    }
  });

  const armDirs = [[-0.55, 0, -0.55], [0.55, 0, -0.55], [0.55, 0, 0.55], [-0.55, 0, 0.55]];

  // Package visibility: hide only while drone is hovering at ground (just dropped)
  const showPackage = worldView === 'delivery' && !isCrashed && !droppedDroneIds.has(drone.id);

  return (
    <group ref={groupRef}>
      {isLeader && <pointLight ref={glowRef} color="#00d4ff" intensity={1.0} distance={6} />}
      {isByz    && <pointLight ref={glowRef} color="#ff1744" intensity={0.8} distance={5} />}

      {isLeader && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.95, 1.05, 48]} />
          <meshBasicMaterial color="#00d4ff" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      )}

      {isByz && <ByzRing />}

      {/* Body */}
      <mesh castShadow>
        <boxGeometry args={[0.35, 0.12, 0.35]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isCrashed ? 0 : 0.35}
          metalness={0.7} roughness={0.3} transparent opacity={isCrashed ? 0.25 : 1} />
      </mesh>

      {!isCrashed && (
        <mesh position={[0, -0.08, 0]}>
          <sphereGeometry args={[0.08, 10, 10]} />
          <meshStandardMaterial color="#111" emissive="#002244" emissiveIntensity={0.5} metalness={1} roughness={0} />
        </mesh>
      )}

      {armDirs.map(([ax, ay, az], i) => (
        <group key={i}>
          <mesh position={[ax * 0.5, 0, az * 0.5]} rotation={[0, Math.PI / 4 + (i % 2) * Math.PI / 2, 0]}>
            <boxGeometry args={[0.85, 0.05, 0.06]} />
            <meshStandardMaterial color="#1a2a3a" metalness={0.8} roughness={0.4} transparent opacity={isCrashed ? 0.2 : 1} />
          </mesh>
          <Rotor position={[ax, ay, az]} color={color} speed={isLeader ? 1.3 : 1} crashed={isCrashed} />
        </group>
      ))}

      {!isCrashed && (
        <mesh position={[0, 0.1, 0]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.5} />
        </mesh>
      )}

      {isCrashed && (
        <>
          <mesh rotation={[0, 0,  Math.PI / 4]}><boxGeometry args={[0.7, 0.06, 0.06]} /><meshStandardMaterial color="#ef5350" emissive="#ef5350" emissiveIntensity={0.8} /></mesh>
          <mesh rotation={[0, 0, -Math.PI / 4]}><boxGeometry args={[0.7, 0.06, 0.06]} /><meshStandardMaterial color="#ef5350" emissive="#ef5350" emissiveIntensity={0.8} /></mesh>
        </>
      )}

      {joining && (
        <mesh position={[0, 0, -0.6]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} transparent opacity={0.6} />
        </mesh>
      )}

      {/* Agriculture: water spray sparkles */}
      {worldView === 'agriculture' && !isCrashed && (
        <group position={[0, -0.3, 0]}>
          <Sparkles count={22} scale={[2.0, 0.55, 2.0]} size={2.4} speed={0.55} opacity={0.5} color="#7dd8f8" noise={0.5} />
        </group>
      )}

      {/* Delivery: hanging package */}
      {showPackage && <HangingPackage color={zoneColor} />}

      <Billboard follow position={[0, 0.85, 0]}>
        <Text fontSize={0.22} color={color} outlineWidth={0.02} outlineColor="#000" anchorX="center" anchorY="middle">
          {drone.label}
        </Text>
        <Text fontSize={0.12} color={isLeader ? '#00d4ff' : '#334455'} anchorX="center" anchorY="middle" position={[0, -0.28, 0]}>
          {drone.role}
        </Text>
      </Billboard>
    </group>
  );
}

// ── Message particle arc ───────────────────────────────────────
const ARROW_COLORS = {
  PREPARE: '#00d4ff', VOTE: '#00e676', COMMIT: '#ff9100',
  VOTE_CONFLICT: '#ff1744', FAKE_POS_A: '#ff1744', FAKE_POS_B: '#ff6060',
  VIEW_CHANGE: '#b06fe8',
  RTB_R1: '#ffab40', RTB_R2: '#ffab40', RTB_R3: '#ffab40',
  AUTH_OK: '#00e676',
};

function MessageParticle({ arrow, srcPos, dstPos }) {
  const ref  = useRef();
  const tRef = useRef(0);
  const color= arrow.ok ? (ARROW_COLORS[arrow.kind] || '#00d4ff') : '#ff1744';
  const dur  = arrow.kind === 'VIEW_CHANGE' ? 0.7 : 0.45;

  const curve = useMemo(() => {
    const mid = new THREE.Vector3().addVectors(srcPos, dstPos).multiplyScalar(0.5);
    mid.y += arrow.kind === 'VIEW_CHANGE' ? 2.0 : 1.5;
    return new THREE.QuadraticBezierCurve3(srcPos.clone(), mid, dstPos.clone());
  }, [srcPos, dstPos]);

  useFrame((_, dt) => {
    tRef.current += dt / dur;
    if (ref.current) {
      const t = Math.min(tRef.current, 1);
      ref.current.position.copy(curve.getPoint(t));
      ref.current.material.opacity = t < 0.8 ? 1 : (1 - t) / 0.2;
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[arrow.kind === 'VIEW_CHANGE' ? 0.15 : 0.11, 10, 10]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.5} transparent />
    </mesh>
  );
}

// ── Signal ripple ──────────────────────────────────────────────
function RippleRing({ ripple, pos }) {
  const ref  = useRef();
  const tRef = useRef(0);
  const colorMap = { '#00d4ff':'#00d4ff','#e63946':'#ff1744','#2dc653':'#00e676','#f4a261':'#ffab40','#7b2d8b':'#b06fe8','#9b59b6':'#b06fe8','#f77f00':'#ff9100','#00b4d8':'#00d4ff' };
  const color = colorMap[ripple.color] || '#00d4ff';

  useFrame((_, dt) => {
    tRef.current += dt * 1.3;
    if (ref.current) {
      const s = 1 + tRef.current * 3.5;
      ref.current.scale.set(s, s, s);
      ref.current.material.opacity = Math.max(0, 0.7 - tRef.current * 0.7);
    }
  });

  return (
    <mesh ref={ref} position={[pos.x, pos.y + 0.9, pos.z]} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.9, 1.0, 48]} />
      <meshBasicMaterial color={color} transparent side={THREE.DoubleSide} />
    </mesh>
  );
}

// ── BFT default ground ─────────────────────────────────────────
function BftGround() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#070e1a" metalness={0.1} roughness={0.9} />
      </mesh>
      <Grid args={[40, 40]} position={[0, -0.04, 0]}
        cellSize={1} cellThickness={0.4} cellColor="#1a3050"
        sectionSize={5} sectionThickness={0.8} sectionColor="#0d2040"
        fadeDistance={28} fadeStrength={1.5} />
    </>
  );
}

// ── GCS platform ───────────────────────────────────────────────
function GCSPlatform() {
  return (
    <group position={[-7, 0, 6]}>
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[1.4, 0.12, 1.0]} />
        <meshStandardMaterial color="#0a1e33" metalness={0.6} roughness={0.4} emissive="#001a33" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.03, 0.03, 0.8, 8]} /><meshStandardMaterial color="#1a3050" metalness={0.9} /></mesh>
      <mesh position={[-0.2, 0.9, 0]} rotation={[0, 0, Math.PI / 6]}><cylinderGeometry args={[0.02, 0.02, 0.5, 8]} /><meshStandardMaterial color="#1a3050" metalness={0.9} /></mesh>
      <Billboard position={[0, 1.3, 0]}>
        <Text fontSize={0.2} color="#00d4ff" outlineWidth={0.02} outlineColor="#000" anchorX="center">GCS</Text>
        <Text fontSize={0.12} color="#334466" anchorX="center" position={[0, -0.25, 0]}>3-of-4</Text>
      </Billboard>
    </group>
  );
}

// ── Camera ─────────────────────────────────────────────────────
function CameraRig({ worldView }) {
  const { camera } = useThree();
  const done = useRef(false);
  const prev = useRef('bft');

  useEffect(() => {
    if (!done.current) { camera.position.set(0, 12, 14); done.current = true; }
  }, [camera]);

  useEffect(() => {
    if (prev.current === worldView) return;
    prev.current = worldView;
    if (worldView === 'agriculture')  camera.position.set(0, 16, 18);
    else if (worldView === 'delivery') camera.position.set(0, 14, 16);
    else                               camera.position.set(0, 12, 14);
    camera.lookAt(0, 0, 0);
  }, [worldView, camera]);

  return null;
}

// ── Delivery controller (runs inside Canvas) ───────────────────
function DeliveryController({ drones, leaderId, positions, onDrop }) {
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  useFrame((_, dt) => {
    const s = deliveryState;
    s.idleT += dt;

    if (s.phase === 'idle' && s.idleT > 5.5) {
      const eligible = drones.filter((d) => d.state === 'HONEST' && d.id !== leaderId);
      if (eligible.length > 0) {
        const pick = eligible[Math.floor((Date.now() / 100)) % eligible.length];
        s.droneId = pick.id;
        s.offsetY = 0;
        s.pauseT  = 0;
        s.idleT   = 0;
        s.phase   = 'descending';
      }
    }
    if (s.phase === 'descending') {
      s.offsetY = Math.max(-3.6, s.offsetY - dt * 1.8);
      if (s.offsetY <= -3.6) { s.phase = 'hovering'; s.pauseT = 0; }
    } else if (s.phase === 'hovering') {
      s.pauseT += dt;
      if (s.pauseT > 1.4) {
        onDropRef.current(s.droneId, positions[s.droneId]);
        s.phase = 'ascending';
      }
    } else if (s.phase === 'ascending') {
      s.offsetY = Math.min(0, s.offsetY + dt * 2.0);
      if (s.offsetY >= 0) { s.phase = 'idle'; s.droneId = null; s.idleT = 0; }
    }
  });
  return null;
}

// ── Main scene ─────────────────────────────────────────────────
function Scene() {
  const { drones, leader, arrows, ripples, joiningDrones, worldView,
          addDroppedDrone, removeDroppedDrone } = useSimStore();
  const positions = useMemo(() => hexPositions3D(), []);
  const [droppedPackages, setDroppedPackages] = useState([]);

  // Reset delivery state when leaving delivery view
  useEffect(() => {
    if (worldView !== 'delivery') {
      Object.assign(deliveryState, { phase: 'idle', droneId: null, offsetY: 0, pauseT: 0, idleT: 3.0 });
    }
  }, [worldView]);

  const handleDrop = useCallback((droneId, pos) => {
    if (!pos) return;
    const color = ZONE_COLORS[droneId % ZONE_COLORS.length];
    setDroppedPackages((prev) => [...prev.slice(-6), { id: Date.now(), pos: { x: pos.x, z: pos.z }, color }]);
    addDroppedDrone(droneId);
    setTimeout(() => removeDroppedDrone(droneId), 4800);
  }, [addDroppedDrone, removeDroppedDrone]);

  const bgColor = worldView === 'agriculture' ? '#a8d5e8' : worldView === 'delivery' ? '#06080f' : '#050b14';

  return (
    <>
      <color attach="background" args={[bgColor]} />

      <CameraRig worldView={worldView} />

      {/* ── World-specific ground & lighting ── */}
      {worldView === 'bft' && (
        <>
          <ambientLight intensity={0.15} />
          <directionalLight position={[5, 10, 5]} intensity={0.5} castShadow />
          <pointLight position={[0, 8, 0]} intensity={0.2} color="#003366" />
          <BftGround />
          <GCSPlatform />
          <Stars radius={60} depth={30} count={2000} factor={3} fade speed={0.4} />
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[4.4, 4.55, 64]} />
            <meshBasicMaterial color="#1a3050" transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}

      {worldView === 'agriculture' && (
        <>
          <FarmLights />
          <FarmGround />
          <CropField />
          <Barn />
          <Trees />
        </>
      )}

      {worldView === 'delivery' && (
        <>
          <CityLights />
          <CityGround />
          <CityBuildings />
          <DeliveryZones positions={positions} />
          <DeliveryController drones={drones} leaderId={leader} positions={positions} onDrop={handleDrop} />
          {droppedPackages.map((pkg) => (
            <DroppedPackage key={pkg.id} position={pkg.pos} color={pkg.color} />
          ))}
        </>
      )}

      {/* ── Drones (all views) ── */}
      {drones.map((d) => (
        <Drone3D
          key={d.id}
          drone={d}
          leaderId={leader}
          targetPos={positions[d.id] || positions[0]}
          joining={!!joiningDrones[d.id]}
          worldView={worldView}
        />
      ))}

      {/* ── BFT protocol overlays (all views) ── */}
      {arrows.map((a) => {
        const src = drones.find((d) => d.id === a.from);
        const dst = drones.find((d) => d.id === a.to);
        if (!src || !dst) return null;
        const sp = positions[src.id], dp = positions[dst.id];
        return (
          <MessageParticle key={a.id} arrow={a}
            srcPos={new THREE.Vector3(sp.x, 0.9, sp.z)}
            dstPos={new THREE.Vector3(dp.x, 0.9, dp.z)} />
        );
      })}

      {ripples.map((r) => {
        const pos = positions[r.id];
        return pos ? <RippleRing key={r.id} ripple={r} pos={pos} /> : null;
      })}

      <OrbitControls makeDefault minPolarAngle={0.1} maxPolarAngle={Math.PI / 2.1}
        minDistance={6} maxDistance={32} enablePan={false} dampingFactor={0.08} rotateSpeed={0.5} />

      <EffectComposer>
        <Bloom luminanceThreshold={worldView === 'agriculture' ? 0.5 : 0.2}
               luminanceSmoothing={0.9} intensity={worldView === 'agriculture' ? 0.6 : 1.4} radius={0.7} />
        <Vignette offset={0.25} darkness={worldView === 'agriculture' ? 0.3 : 0.65} />
      </EffectComposer>
    </>
  );
}

// ── Canvas wrapper ─────────────────────────────────────────────
export default function DroneCanvas3D() {
  const { commitFlash } = useSimStore();
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas shadows camera={{ fov: 50 }} gl={{ antialias: true }}>
        <Scene />
      </Canvas>
      {commitFlash && (
        <div key={commitFlash.id} style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: commitFlash.color, opacity: 0,
          animation: 'commitFlash 0.7s ease forwards',
        }} />
      )}
    </div>
  );
}
