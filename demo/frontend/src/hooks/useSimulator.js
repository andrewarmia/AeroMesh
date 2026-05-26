import { useEffect, useRef } from 'react';
import { useSimStore } from '../store/simStore';

const WS_URL = `ws://${window.location.host}/ws`;

export function useSimulator() {
  const ws = useRef(null);
  const reconnTimer = useRef(null);
  const store = useSimStore();

  function connect() {
    const socket = new WebSocket(WS_URL);
    ws.current = socket;

    socket.onopen = () => {
      store.setConnected(true);
      clearTimeout(reconnTimer.current);
    };

    socket.onclose = () => {
      store.setConnected(false);
      reconnTimer.current = setTimeout(connect, 2500);
    };

    socket.onerror = () => {
      store.setConnected(false);
    };

    socket.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        handleMsg(msg, store);
      } catch { /* ignore */ }
    };
  }

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnTimer.current);
      ws.current?.close();
    };
  }, []);

  function send(action, extra = {}) {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ action, ...extra }));
    }
  }

  return { send };
}

function handleMsg(msg, store) {
  switch (msg.type) {
    case 'state':        store.applyState(msg);                        break;
    case 'log':          store.addLog(msg);                            break;
    case 'banner':       store.setBanner({ text: msg.text, color: msg.color }); break;
    case 'narrate':      store.setNarration(msg.text);                 break;
    case 'arrow':        store.addArrow(msg);                          break;
    case 'clear_arrows': store.clearArrows();                          break;
    case 'ripple':       store.addRipple(msg);                         break;
    case 'rsm_commit':   store.addRsmEntry(msg);                       break;
    case 'rsm_clear':    store.clearRsm();                             break;
    case 'drone_join':   store.addJoiningDrone(msg.id);               break;
    case 'commit_flash': store.triggerCommitFlash(msg.color || '#2dc653'); break;
  }
}
