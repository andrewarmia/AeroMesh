import { motion, AnimatePresence } from 'framer-motion';
import { useSimStore } from '../store/simStore';

export default function RsmLog() {
  const { rsmEntries, rsmCount } = useSimStore();

  return (
    <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid rgba(26,48,80,0.5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' }}>
          RSM Commit Log
        </span>
        <motion.span
          key={rsmCount}
          initial={{ scale: 1.5 }}
          animate={{ scale: 1 }}
          style={{
            background: '#00d4ff', color: '#000',
            borderRadius: 10, padding: '1px 8px',
            fontSize: 10, fontWeight: 700,
          }}
        >
          {rsmCount}
        </motion.span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 110, overflowY: 'auto' }}>
        <AnimatePresence initial={false}>
          {rsmEntries.map((e) => (
            <motion.div
              key={`${e.seq}-${e.cmd}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '4px 8px', borderRadius: 5,
                background: 'rgba(0,180,216,0.07)',
                borderLeft: '2px solid #00d4ff',
                fontSize: 10.5, fontFamily: 'monospace',
              }}
            >
              <span style={{ color: '#00d4ff', fontWeight: 700, minWidth: 30 }}>#{e.seq}</span>
              <span style={{ color: '#e8f4ff', flex: 1 }}>{e.cmd}</span>
              <span style={{ color: '#334466', fontSize: 9 }}>v{e.view}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {rsmEntries.length === 0 && (
          <div style={{ fontSize: 10, color: '#2a3a52', textAlign: 'center', padding: '10px 0' }}>
            — no commits yet —
          </div>
        )}
      </div>
    </div>
  );
}
