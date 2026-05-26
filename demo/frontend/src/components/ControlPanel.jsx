import { motion, AnimatePresence } from 'framer-motion';
import { useSimStore } from '../store/simStore';

const BUTTONS = [
  { action: 'bft_round',        label: 'BFT Round',    sub: 'PREPARE → VOTE → COMMIT', key: '1', color: '#0077b6', glow: '#00b4d8', icon: '▶' },
  { action: 'inject_byzantine', label: 'Byzantine',    sub: 'GPS Spoofing Attack',      key: '2', color: '#9b0000', glow: '#ff1744', icon: '⚡' },
  { action: 'kill_leader',      label: 'Kill Leader',  sub: 'View-Change Protocol',     key: '3', color: '#4a0080', glow: '#b06fe8', icon: '💥' },
  { action: 'rf_jam',           label: 'RF Jam',       sub: 'FHSS / SAFE_HOVER',        key: '4', color: '#2a2a3a', glow: '#64748b', icon: '📡' },
  { action: 'gcs_emergency',    label: 'GCS Emrg',     sub: 'Dolev-Strong RTB',         key: '5', color: '#7b4400', glow: '#f4a261', icon: '🛸' },
  { action: 'below_quorum',     label: 'Merge',        sub: 'Below-Quorum Protocol',    key: '6', color: '#5a3000', glow: '#f77f00', icon: '🔄' },
];

export default function ControlPanel({ send }) {
  const { jammed } = useSimStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Protocol buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {BUTTONS.map((btn) => (
          <motion.button
            key={btn.action}
            onClick={() => send(btn.action)}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.96 }}
            style={{
              background: `linear-gradient(135deg, ${btn.color}cc, ${btn.color}88)`,
              border: `1px solid ${btn.glow}44`,
              borderRadius: 10,
              padding: '10px 8px',
              color: '#e8f4ff',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              backdropFilter: 'blur(8px)',
              boxShadow: `0 2px 16px ${btn.glow}22`,
              transition: 'box-shadow 0.2s',
            }}
          >
            <span style={{ fontSize: 15 }}>{btn.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.03em' }}>{btn.label}</span>
            <span style={{ fontSize: 9.5, opacity: 0.6, textAlign: 'center', lineHeight: 1.2 }}>{btn.sub}</span>
            <span style={{
              fontSize: 8.5, background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 3, padding: '1px 5px',
              fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)',
            }}>[{btn.key}]</span>
          </motion.button>
        ))}
      </div>

      {/* Auto demo */}
      <motion.button
        onClick={() => send('auto_demo')}
        whileHover={{ scale: 1.02, boxShadow: '0 0 30px #00b4d866' }}
        whileTap={{ scale: 0.98 }}
        style={{
          width: '100%', padding: '12px 0',
          background: 'linear-gradient(90deg, #004e64, #00b4d8, #004e64)',
          backgroundSize: '200% 100%',
          border: '1px solid #00b4d866',
          borderRadius: 10,
          color: '#e0f7ff',
          fontSize: 13, fontWeight: 700,
          letterSpacing: '0.07em',
          cursor: 'pointer',
          animation: 'shimmer 3s linear infinite',
          boxShadow: '0 2px 20px #00b4d833',
        }}
      >
        ▶▶ AUTO DEMO — All 6 Scenarios [7]
      </motion.button>

      {/* Reset + Speed */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <motion.button
          onClick={() => send('reset')}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          style={{
            flex: '0 0 80px', padding: '8px 0',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, color: '#94a3b8',
            fontSize: 11, fontWeight: 600,
            cursor: 'pointer', letterSpacing: '0.04em',
          }}
        >
          ⟳ Reset [R]
        </motion.button>
        <SpeedControl send={send} />
      </div>

      {/* Banner + Narration both live on the 3D canvas as overlays */}
    </div>
  );
}

// ── Speed slider ──────────────────────────────────────────────
function SpeedControl({ send }) {
  function onChange(e) {
    const speed = e.target.value / 100;
    send('set_speed', { speed });
    document.getElementById('speedLabel').textContent = `${speed}×`;
    const pct = ((e.target.value - 25) / (400 - 25)) * 100;
    e.target.style.background = `linear-gradient(90deg,#00b4d8 ${pct}%,#1a3050 ${pct}%)`;
  }

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap' }}>Speed</span>
      <input
        type="range" min="25" max="400" defaultValue="25" step="25"
        onChange={onChange}
        style={{
          flex: 1, height: 4, borderRadius: 2, outline: 'none', cursor: 'pointer',
          background: 'linear-gradient(90deg,#00b4d8 0%,#1a3050 0%)',
          WebkitAppearance: 'none', appearance: 'none',
        }}
      />
      <span id="speedLabel" style={{ fontSize: 10, color: '#00b4d8', fontWeight: 700, minWidth: 32 }}>0.25×</span>
    </div>
  );
}

