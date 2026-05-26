import { motion, AnimatePresence } from 'framer-motion';
import { useSimStore } from '../store/simStore';

const COLORS = {
  blue:   { bg: 'rgba(0,50,110,0.88)',  border: '#00d4ff', text: '#caf0f8' },
  green:  { bg: 'rgba(0,60,30,0.88)',   border: '#00e676', text: '#b7f5d0' },
  orange: { bg: 'rgba(110,45,0,0.88)',  border: '#ff9100', text: '#ffe5c0' },
  red:    { bg: 'rgba(120,8,16,0.88)',  border: '#ff1744', text: '#ffd0d3' },
  purple: { bg: 'rgba(55,8,95,0.88)',   border: '#b06fe8', text: '#e0c3fc' },
  amber:  { bg: 'rgba(100,58,0,0.88)',  border: '#ffab40', text: '#fff0cc' },
  gray:   { bg: 'rgba(28,36,54,0.88)',  border: '#64748b', text: '#c0d0e0' },
};

export default function PhaseBanner() {
  const { banner } = useSimStore();
  const c = COLORS[banner.color] || COLORS.blue;

  return (
    <div style={{
      position: 'absolute',
      top: 14,
      left: 0, right: 0,
      display: 'flex',
      justifyContent: 'center',
      pointerEvents: 'none',
      zIndex: 22,
    }}>
      <AnimatePresence mode="wait">
        {banner.text && (
          <motion.div
            key={banner.text}
            initial={{ opacity: 0, y: -16, scale: 0.9 }}
            animate={{ opacity: 1,  y: 0,   scale: 1   }}
            exit={{   opacity: 0,  y: -8,  scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 24px',
              background: c.bg,
              border: `1px solid ${c.border}66`,
              borderRadius: 24,
              backdropFilter: 'blur(16px)',
              boxShadow: `0 0 28px ${c.border}33, 0 2px 20px rgba(0,0,0,0.5)`,
            }}
          >
            {/* Pulsing indicator */}
            <motion.div
              animate={{ scale: [1, 1.6, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              style={{
                width: 7, height: 7, borderRadius: '50%',
                background: c.border,
                boxShadow: `0 0 8px ${c.border}`,
                flexShrink: 0,
              }}
            />
            <span style={{
              fontFamily: '"Orbitron", monospace',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: c.text,
              textTransform: 'uppercase',
              textShadow: `0 0 20px ${c.border}66`,
              whiteSpace: 'nowrap',
            }}>
              {banner.text}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
