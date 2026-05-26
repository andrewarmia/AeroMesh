import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimStore } from '../store/simStore';

const LEVEL_COLORS = {
  info:     '#64748b',
  protocol: '#00d4ff',
  success:  '#00e676',
  warn:     '#ffab40',
  error:    '#ff5252',
};

export default function EventLog() {
  const { logEntries } = useSimStore();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logEntries.length]);

  function fmtTs(d) {
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em',
        color: '#64748b', padding: '7px 12px 4px',
        borderBottom: '1px solid rgba(26,48,80,0.4)',
        flexShrink: 0,
      }}>
        Event Log
      </div>
      <div style={{
        flex: 1, overflowY: 'auto', padding: '5px 10px',
        fontFamily: "'Consolas','Courier New',monospace", fontSize: 10.5, lineHeight: 1.55,
      }}>
        {logEntries.map((entry) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15 }}
            style={{ color: LEVEL_COLORS[entry.level] || '#64748b' }}
          >
            <span style={{ color: '#1e3048', marginRight: 5 }}>{fmtTs(entry.ts)}</span>
            {entry.text}
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
