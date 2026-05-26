import { motion, AnimatePresence } from 'framer-motion';
import { useSimStore } from '../store/simStore';

function Metric({ label, value, status = 'ok' }) {
  const colors = { ok: '#00d4ff', warn: '#ffab40', error: '#ff5252' };
  return (
    <motion.div
      layout
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '4px 12px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(26,48,80,0.8)',
        borderRadius: 6,
        backdropFilter: 'blur(6px)',
      }}
    >
      <span style={{ fontSize: 9.5, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      <motion.span
        key={value}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ fontSize: 13, fontWeight: 700, color: colors[status], fontFamily: 'monospace' }}
      >
        {value}
      </motion.span>
    </motion.div>
  );
}

export default function MetricsBar() {
  const { view, round, seq, byz, bwPct, jammed, connected } = useSimStore();

  return (
    <div style={{
      display: 'flex', gap: 6, padding: '5px 16px',
      background: 'rgba(5,11,20,0.95)',
      borderBottom: '1px solid rgba(26,48,80,0.6)',
      backdropFilter: 'blur(12px)',
      flexWrap: 'wrap',
    }}>
      <Metric label="View"    value={view}   />
      <Metric label="Round"   value={round}  />
      <Metric label="RSM Seq" value={seq}    />
      <Metric label="Byzantine" value={`${byz}/2`} status={byz > 0 ? 'error' : 'ok'} />
      <Metric label="BW Load"   value={jammed ? 'JAMMED' : `${bwPct}%`} status={jammed ? 'error' : 'ok'} />
      <Metric label="Channel"   value={jammed ? 'JAMMED' : 'CLEAR'} status={jammed ? 'error' : 'ok'} />
      <div style={{ marginLeft: 'auto' }}>
        <Metric label="Status" value={connected ? 'CONNECTED' : 'OFFLINE'} status={connected ? 'ok' : 'error'} />
      </div>
    </div>
  );
}
