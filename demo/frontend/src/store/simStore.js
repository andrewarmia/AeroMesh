import { create } from 'zustand';

export const useSimStore = create((set, get) => ({
  // Connection
  connected: false,
  setConnected: (v) => set({ connected: v }),

  // World view
  worldView: 'bft',
  setWorldView: (v) => set({ worldView: v }),

  // Delivery tracking (package dropped per drone)
  droppedDroneIds: new Set(),
  addDroppedDrone:    (id) => set((s) => ({ droppedDroneIds: new Set([...s.droppedDroneIds, id]) })),
  removeDroppedDrone: (id) => set((s) => { const n = new Set(s.droppedDroneIds); n.delete(id); return { droppedDroneIds: n }; }),

  // State
  drones: [],
  view: 0,
  leader: 0,
  round: 0,
  seq: 0,
  bwPct: 0,
  byz: 0,
  jammed: false,
  busy: false,

  // Protocol events
  arrows: [],
  ripples: [],
  banner: { text: '', color: '' },
  narration: '',
  commitFlash: null,        // { color, id }

  // RSM log
  rsmEntries: [],
  rsmCount: 0,

  // Drones flying in from outside
  joiningDrones: {},   // { droneId: true }

  // Event log
  logEntries: [],

  // Actions (called by WebSocket handler)
  applyState: (msg) => set({
    drones:  msg.drones,
    view:    msg.view,
    leader:  msg.leader,
    round:   msg.round,
    seq:     msg.seq,
    bwPct:   msg.bw_pct,
    byz:     msg.byz,
    jammed:  msg.jammed,
    busy:    msg.busy ?? false,
  }),

  addArrow: (arrow) => set((s) => ({
    arrows: [...s.arrows, { ...arrow, id: Date.now() + Math.random() }],
  })),

  clearArrows: () => set({ arrows: [] }),

  addRipple: (ripple) => {
    const id = Date.now() + Math.random();
    set((s) => ({ ripples: [...s.ripples, { ...ripple, id }] }));
    setTimeout(() => {
      set((s) => ({ ripples: s.ripples.filter((r) => r.id !== id) }));
    }, 1200);
  },

  setBanner: (banner) => set({ banner }),

  setNarration: (narration) => set({ narration }),

  triggerCommitFlash: (color) => {
    const id = Date.now();
    set({ commitFlash: { color, id } });
    setTimeout(() => set((s) => s.commitFlash?.id === id ? { commitFlash: null } : {}), 800);
  },

  addRsmEntry: (entry) => set((s) => {
    const entries = [entry, ...s.rsmEntries].slice(0, 8);
    return { rsmEntries: entries, rsmCount: s.rsmCount + 1 };
  }),

  clearRsm: () => set({ rsmEntries: [], rsmCount: 0 }),

  addJoiningDrone: (id) => {
    set((s) => ({ joiningDrones: { ...s.joiningDrones, [id]: true } }));
    setTimeout(() => {
      set((s) => {
        const j = { ...s.joiningDrones };
        delete j[id];
        return { joiningDrones: j };
      });
    }, 4500);
  },

  addLog: (entry) => set((s) => {
    const entries = [...s.logEntries, { ...entry, ts: new Date(), id: Date.now() + Math.random() }];
    return { logEntries: entries.slice(-300) };
  }),
}));
