"""
AeroMesh Interactive Demo — FastAPI + WebSocket server  v2
Run: python app.py
Open: http://localhost:8000
"""

import asyncio
import json
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from simulator import AeroMeshSimulator

# ─────────────────────────────────────────────────────────
# APP SETUP
# ─────────────────────────────────────────────────────────

app = FastAPI(title="AeroMesh Demo")
STATIC_DIR       = Path(__file__).parent / "static"
REACT_BUILD_DIR  = Path(__file__).parent / "static_react"

# ─────────────────────────────────────────────────────────
# CONNECTED CLIENTS  (broadcast to all open WebSockets)
# ─────────────────────────────────────────────────────────

_clients: set[WebSocket] = set()


async def _broadcast(msg: dict):
    if not _clients:
        return
    data = json.dumps(msg)
    dead: set[WebSocket] = set()
    for ws in list(_clients):
        try:
            await ws.send_text(data)
        except Exception:
            dead.add(ws)
    _clients.difference_update(dead)


# ─────────────────────────────────────────────────────────
# SIMULATOR  (single shared instance)
# ─────────────────────────────────────────────────────────

sim = AeroMeshSimulator(emit_fn=_broadcast)

# ─────────────────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────────────────

@app.get("/", response_class=FileResponse)
async def index():
    # Prefer the React build if available, fall back to legacy HTML
    react_index = REACT_BUILD_DIR / "index.html"
    if react_index.exists():
        return FileResponse(react_index)
    return FileResponse(STATIC_DIR / "index.html")


# Serve React production build (assets JS/CSS)
if REACT_BUILD_DIR.exists():
    app.mount("/assets", StaticFiles(directory=REACT_BUILD_DIR / "assets"), name="react_assets")

# Serve legacy static files
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# ─────────────────────────────────────────────────────────
# WEBSOCKET  /ws
# ─────────────────────────────────────────────────────────

ACTION_MAP = {
    "bft_round":        sim.run_bft_round,
    "inject_byzantine": sim.inject_byzantine,
    "kill_leader":      sim.kill_leader,
    "rf_jam":           sim.rf_jam,
    "gcs_emergency":    sim.gcs_emergency,
    "below_quorum":     sim.below_quorum_merge,
    "auto_demo":        sim.auto_demo,
    "stop":             sim.stop,
    "reset":            sim.reset,
}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    _clients.add(ws)
    await sim._state()

    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            action = msg.get("action", "")

            # Speed-change is a parameterised action (not in ACTION_MAP)
            if action == "set_speed":
                sim._speed = max(0.25, min(4.0, float(msg.get("speed", 1.0))))
                await ws.send_text(json.dumps({
                    "type": "log", "level": "info",
                    "text": f"[SPEED]  Simulation speed set to {sim._speed:.2f}×"
                }))
                continue

            if action in ACTION_MAP:
                asyncio.create_task(ACTION_MAP[action]())
            else:
                await ws.send_text(json.dumps({
                    "type": "log", "level": "warn",
                    "text": f"[SERVER] Unknown action: {action!r}"
                }))

    except WebSocketDisconnect:
        _clients.discard(ws)
    except Exception as exc:
        _clients.discard(ws)
        print(f"WS error: {exc}")


# ─────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    print("\n" + "═" * 60)
    print("  AeroMesh Interactive Demo  v2")
    print("  http://localhost:8000")
    print("═" * 60 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="warning")
