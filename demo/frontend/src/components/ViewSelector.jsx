import { motion } from 'framer-motion';
import { useSimStore } from '../store/simStore';

const VIEWS = [
  { id: 'bft',          icon: '⬡',  label: 'BFT Lab',  color: '#00d4ff' },
  { id: 'agriculture',  icon: '🌾', label: 'Farm',      color: '#4caf50' },
  { id: 'delivery',     icon: '📦', label: 'Delivery',  color: '#ffab40' },
];

export default function ViewSelector() {
  const { worldView, setWorldView } = useSimStore();

  return (
    <div style={{
      position: 'absolute',
      top: 14, left: 14,
      display: 'flex',
      gap: 6,
      zIndex: 30,
      pointerEvents: 'all',
    }}>
      {VIEWS.map((v) => {
        const active = worldView === v.id;
        return (
          <motion.button
            key={v.id}
            onClick={() => setWorldView(v.id)}
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.94 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 13px',
              borderRadius: 20,
              border: `1px solid ${active ? v.color : 'rgba(255,255,255,0.1)'}`,
              background: active
                ? `rgba(${hexToRgb(v.color)},0.22)`
                : 'rgba(5,11,20,0.75)',
              color: active ? v.color : '#64748b',
              fontSize: 11.5,
              fontWeight: active ? 700 : 500,
              letterSpacing: '0.05em',
              cursor: 'pointer',
              backdropFilter: 'blur(12px)',
              boxShadow: active ? `0 0 18px ${v.color}44` : 'none',
              transition: 'all 0.2s',
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 13 }}>{v.icon}</span>
            {v.label}
            {active && (
              <motion.div
                layoutId="activeViewDot"
                style={{ width: 5, height: 5, borderRadius: '50%', background: v.color }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}
