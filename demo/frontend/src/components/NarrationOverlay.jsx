import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimStore } from '../store/simStore';

// ── Minimum-hold hook: text stays at least MIN_MS before swapping ──
const MIN_MS = 3800;

function useHeldText(storeValue) {
  const [shown, setShown]   = useState(storeValue);
  const lastSet = useRef(Date.now());
  const timer   = useRef(null);

  useEffect(() => {
    const delay = Math.max(0, MIN_MS - (Date.now() - lastSet.current));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setShown(storeValue);
      lastSet.current = Date.now();
    }, delay);
    return () => clearTimeout(timer.current);
  }, [storeValue]);

  return shown;
}

// ── Parse narration type ──────────────────────────────────────
function parse(text) {
  if (!text) return null;
  const step = text.match(/^AUTO-DEMO\s+Step\s+(\d+)\/(\d+)\s+[—–-]+\s+(.+)$/i);
  if (step) return { type: 'step', step: step[1], total: step[2], body: step[3] };
  const end  = text.match(/^'(.+)'\s+[—–-]+\s+(.+)$/);
  if (end)  return { type: 'quote', quote: end[1], body: end[2] };
  return { type: 'narrate', body: text };
}

const fade = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0,  transition: { duration: 0.4, ease: 'easeOut' } },
  exit:    { opacity: 0, y:  6, transition: { duration: 0.3, ease: 'easeIn'  } },
};

// ── Step card ─────────────────────────────────────────────────
function StepCard({ step, total, body }) {
  return (
    <motion.div {...fade} style={{
      display:'flex', flexDirection:'column', alignItems:'center', gap:8,
      padding:'16px 30px',
      background:'rgba(3,9,18,0.94)',
      border:'1px solid rgba(0,212,255,0.5)',
      borderRadius:14,
      backdropFilter:'blur(20px)',
      boxShadow:'0 0 60px rgba(0,212,255,0.18), 0 2px 40px rgba(0,0,0,0.7)',
      maxWidth:'70%', textAlign:'center',
    }}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:32,height:2,background:'linear-gradient(90deg,transparent,#00d4ff)'}}/>
        <span style={{fontFamily:'"Orbitron",monospace',fontSize:11,fontWeight:700,letterSpacing:'0.22em',color:'#00d4ff',textTransform:'uppercase'}}>
          Step {step} / {total}
        </span>
        <div style={{width:32,height:2,background:'linear-gradient(90deg,#00d4ff,transparent)'}}/>
      </div>
      <span style={{fontFamily:'"Space Grotesk",system-ui,sans-serif',fontSize:15.5,fontWeight:500,letterSpacing:'0.03em',color:'#caf0f8',lineHeight:1.6}}>
        {body}
      </span>
      <div style={{width:'100%',height:2,background:'rgba(26,48,80,0.5)',borderRadius:1}}>
        <motion.div
          initial={{width:0}} animate={{width:`${(parseInt(step)/parseInt(total))*100}%`}}
          transition={{duration:0.5,ease:'easeOut'}}
          style={{height:'100%',background:'linear-gradient(90deg,#00d4ff,#90e0ef)',borderRadius:1}}
        />
      </div>
    </motion.div>
  );
}

// ── Protocol narration bar ────────────────────────────────────
function NarrateBar({ body }) {
  return (
    <motion.div {...fade} style={{
      display:'flex', alignItems:'flex-start', gap:12,
      padding:'11px 22px',
      background:'rgba(3,9,18,0.9)',
      border:'1px solid rgba(0,212,255,0.2)',
      borderLeft:'3px solid #00d4ff',
      borderRadius:10,
      backdropFilter:'blur(16px)',
      boxShadow:'0 4px 30px rgba(0,0,0,0.6), 0 0 20px rgba(0,212,255,0.07)',
      maxWidth:'74%',
    }}>
      <motion.div
        animate={{scale:[1,1.5,1],opacity:[0.6,1,0.6]}}
        transition={{duration:1.8,repeat:Infinity}}
        style={{width:7,height:7,borderRadius:'50%',flexShrink:0,background:'#00d4ff',boxShadow:'0 0 8px #00d4ff',marginTop:4}}
      />
      <span style={{fontFamily:'"Space Grotesk",system-ui,sans-serif',fontSize:13.5,fontWeight:500,letterSpacing:'0.02em',color:'#90e0ef',lineHeight:1.55}}>
        {body}
      </span>
    </motion.div>
  );
}

// ── Finale quote ──────────────────────────────────────────────
function QuoteCard({ quote, body }) {
  return (
    <motion.div {...fade} style={{
      display:'flex',flexDirection:'column',alignItems:'center',gap:10,
      padding:'20px 36px',
      background:'rgba(3,9,18,0.95)',
      border:'1px solid rgba(0,230,118,0.45)',
      borderRadius:16,
      backdropFilter:'blur(20px)',
      boxShadow:'0 0 60px rgba(0,230,118,0.14), 0 2px 40px rgba(0,0,0,0.8)',
      maxWidth:'65%',textAlign:'center',
    }}>
      <span style={{fontFamily:'"Orbitron",monospace',fontSize:9.5,letterSpacing:'0.2em',color:'#00e676',textTransform:'uppercase'}}>
        Dr. Shawky's Principle
      </span>
      <span style={{fontFamily:'"Space Grotesk",Georgia,serif',fontSize:16,fontWeight:600,color:'#00e676',fontStyle:'italic',lineHeight:1.55}}>
        "{quote}"
      </span>
      <div style={{width:'40%',height:1,background:'rgba(0,230,118,0.25)'}}/>
      <span style={{fontFamily:'"Space Grotesk",system-ui,sans-serif',fontSize:13,color:'#b7f5d0',letterSpacing:'0.02em'}}>
        {body}
      </span>
      <motion.span initial={{scale:0}} animate={{scale:1}} transition={{delay:0.3,type:'spring',stiffness:300}}
        style={{fontSize:24,color:'#00e676'}}>✓</motion.span>
    </motion.div>
  );
}

// ── Main export ───────────────────────────────────────────────
export default function NarrationOverlay() {
  const { narration } = useSimStore();
  const held   = useHeldText(narration);
  const parsed = held ? parse(held) : null;

  return (
    <div style={{
      position:'absolute', top:'13%', left:0, right:0,
      display:'flex', justifyContent:'center',
      pointerEvents:'none', zIndex:20,
    }}>
      <AnimatePresence mode="wait">
        {parsed?.type === 'step'    && <StepCard   key={held} {...parsed} />}
        {parsed?.type === 'quote'   && <QuoteCard  key={held} {...parsed} />}
        {parsed?.type === 'narrate' && <NarrateBar key={held} body={parsed.body} />}
      </AnimatePresence>
    </div>
  );
}
