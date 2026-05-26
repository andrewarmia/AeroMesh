import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DroneCanvas3D    from './components/DroneCanvas3D';
import ControlPanel     from './components/ControlPanel';
import MetricsBar       from './components/MetricsBar';
import RsmLog           from './components/RsmLog';
import EventLog         from './components/EventLog';
import NarrationOverlay from './components/NarrationOverlay';
import PhaseBanner      from './components/PhaseBanner';
import ViewSelector     from './components/ViewSelector';
import { useSimulator } from './hooks/useSimulator';
import { useSimStore }  from './store/simStore';
import './App.css';

// Keyboard shortcuts
function KeyboardHandler({ send }) {
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const map = {
        '1': 'bft_round', '2': 'inject_byzantine', '3': 'kill_leader',
        '4': 'rf_jam',    '5': 'gcs_emergency',    '6': 'below_quorum',
        '7': 'auto_demo', 'r': 'reset', 'R': 'reset', ' ': 'bft_round',
      };
      if (map[e.key]) { e.preventDefault(); send(map[e.key]); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [send]);
  return null;
}

export default function App() {
  const { send } = useSimulator();
  const { busy }  = useSimStore();

  return (
    <div className="app-root">
      <KeyboardHandler send={send} />

      {/* ── HEADER ── */}
      <motion.header
        className="app-header"
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="header-brand">
          {/* Drone logo SVG */}
          <svg width="34" height="34" viewBox="0 0 60 60" fill="none">
            <line x1="20" y1="20" x2="8"  y2="8"  stroke="#00d4ff" strokeWidth="3" strokeLinecap="round"/>
            <line x1="40" y1="20" x2="52" y2="8"  stroke="#00d4ff" strokeWidth="3" strokeLinecap="round"/>
            <line x1="40" y1="40" x2="52" y2="52" stroke="#00d4ff" strokeWidth="3" strokeLinecap="round"/>
            <line x1="20" y1="40" x2="8"  y2="52" stroke="#00d4ff" strokeWidth="3" strokeLinecap="round"/>
            <circle cx="8"  cy="8"  r="7" fill="none" stroke="#00d4ff" strokeWidth="2"/>
            <circle cx="52" cy="8"  r="7" fill="none" stroke="#00d4ff" strokeWidth="2"/>
            <circle cx="52" cy="52" r="7" fill="none" stroke="#00d4ff" strokeWidth="2"/>
            <circle cx="8"  cy="52" r="7" fill="none" stroke="#00d4ff" strokeWidth="2"/>
            <rect x="22" y="22" width="16" height="16" rx="4" fill="#00d4ff"/>
            <circle cx="30" cy="30" r="4" fill="#050b14"/>
          </svg>
          <div>
            <div className="header-title">AEROMESH</div>
            <div className="header-subtitle">Byzantine-Resilient Drone Swarm · BFT Live Simulator</div>
          </div>
        </div>
        <div className="header-meta">
          <span className="header-badge">n=7 · f=2 · quorum=5</span>
          <span className="header-sep">|</span>
          <span className="header-badge">CCY3302 · AAST · Spring 2026</span>
        </div>
      </motion.header>

      {/* ── METRICS ── */}
      <MetricsBar />

      {/* ── MAIN ── */}
      <div className="app-main">

        {/* 3-D Canvas */}
        <motion.div
          className="canvas-wrap"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <DroneCanvas3D />

          {/* World view selector — top-left of canvas */}
          <ViewSelector />

          {/* Cinematic dim overlay while protocol runs */}
          <AnimatePresence>
            {busy && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.55) 100%)',
                }}
              />
            )}
          </AnimatePresence>

          {/* Cinematic phase banner — full-width letterbox strip */}
          <PhaseBanner />

          {/* Storytelling narration overlay */}
          <NarrationOverlay />

          {/* Floating STOP button */}
          <AnimatePresence>
            {busy && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{   opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => send('stop')}
                style={{
                  position: 'absolute', bottom: 32, right: 24,
                  padding: '10px 22px',
                  background: 'rgba(180,10,20,0.85)',
                  border: '1px solid #ff1744',
                  borderRadius: 8,
                  color: '#ffd0d3',
                  fontFamily: '"Orbitron", monospace',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 0 24px rgba(255,23,68,0.4)',
                  zIndex: 30,
                }}
              >
                ⏹ STOP
              </motion.button>
            )}
          </AnimatePresence>

          {/* Canvas hint */}
          <div className="canvas-hint">drag to orbit · scroll to zoom</div>
        </motion.div>

        {/* Right panel */}
        <motion.aside
          className="right-panel"
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {/* Controls */}
          <div className="panel-section">
            <div className="section-title">Protocol Controls <span className="kbd-tip">keyboard 1–7 · R</span></div>
            <ControlPanel send={send} />
          </div>

          {/* RSM log */}
          <RsmLog />

          {/* Event log */}
          <EventLog />

          {/* Legend */}
          <div className="legend">
            {[
              { color: '#00d4ff', label: 'Leader'    },
              { color: '#00e676', label: 'Honest'    },
              { color: '#ff1744', label: 'Byzantine' },
              { color: '#455a64', label: 'Crashed'   },
              { color: '#ffab40', label: 'Safe Hover'},
              { color: '#b06fe8', label: 'Guard'     },
            ].map(({ color, label }) => (
              <div key={label} className="legend-item">
                <div className="legend-dot" style={{ background: color }} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </motion.aside>
      </div>
    </div>
  );
}
