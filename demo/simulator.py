"""
AeroMesh BFT Simulator  –  v3 (story edition)
• Default speed 0.25×  — slow enough to follow every step
• Full visual leader-election walk-through
• Merge emits drone_join so drones fly into the scene
• All narrations rewritten for non-DSS audience (plain-English story)
"""

import asyncio
import math
from enum import Enum
from dataclasses import dataclass
from typing import Callable, Awaitable, List, Dict


class DroneRole(str, Enum):
    LEADER  = "LEADER"
    GUARD   = "GUARD"
    NETWORK = "NETWORK"
    SERVICE = "SERVICE"

class DroneState(str, Enum):
    HONEST      = "HONEST"
    BYZANTINE   = "BYZANTINE"
    CRASHED     = "CRASHED"
    QUARANTINED = "QUARANTINED"
    SAFE_HOVER  = "SAFE_HOVER"


@dataclass
class Drone:
    id:    int
    label: str
    role:  DroneRole
    state: DroneState = DroneState.HONEST
    x:     float = 0.0
    y:     float = 0.0


def _hex_positions(cx=300, cy=270, r=148):
    pos = [(cx, cy)]
    for i in range(6):
        ang = math.radians(i * 60 - 90)
        pos.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    return pos


_INITIAL_ROLES = [
    DroneRole.LEADER, DroneRole.GUARD, DroneRole.GUARD,
    DroneRole.NETWORK, DroneRole.NETWORK,
    DroneRole.SERVICE, DroneRole.SERVICE,
]

_RSM_COMMANDS = [
    "SPRAY_ZONE_{:02d}", "SCAN_SECTOR_{}", "DELIVER_PKG_{:03d}",
    "ASSIGN_D{}_TO_SECTOR_{}", "OBSTACLE_CLEAR_{}", "RETURN_HOME_D{}",
    "REFUEL_WAYPOINT_{}", "PHOTO_SURVEY_{:02d}",
]


class AeroMeshSimulator:
    N      = 7
    F      = 2
    QUORUM = 5

    def __init__(self, emit_fn: Callable[[Dict], Awaitable[None]]):
        self._emit    = emit_fn
        self._busy    = False
        self._view    = 0
        self._seq     = 0
        self._round   = 0
        self._jammed  = False
        self._speed   = 0.25          # ← always start slow so viewers can follow
        self._leader_id = 0
        self.drones: List[Drone] = []
        self._init_drones()

    def _init_drones(self):
        positions = _hex_positions()
        self.drones = [
            Drone(id=i, label=f"D{i+1}", role=_INITIAL_ROLES[i],
                  x=positions[i][0], y=positions[i][1])
            for i in range(self.N)
        ]
        self._leader_id = 0

    # ── emit helpers ──────────────────────────────────────────

    async def _state(self):
        await self._emit({
            "type": "state",
            "drones": [
                {"id": d.id, "label": d.label,
                 "role": d.role.value, "state": d.state.value,
                 "x": d.x, "y": d.y}
                for d in self.drones
            ],
            "view": self._view, "leader": self._leader_id,
            "round": self._round, "seq": self._seq,
            "bw_pct": 30 if not self._jammed else 0,
            "byz": sum(1 for d in self.drones if d.state == DroneState.BYZANTINE),
            "jammed": self._jammed,
            "busy": self._busy,
        })

    async def _log(self, text: str, level="info"):
        await self._emit({"type": "log", "level": level, "text": text})

    async def _banner(self, text: str, color="blue"):
        await self._emit({"type": "banner", "text": text, "color": color})

    async def _narrate(self, text: str):
        await self._emit({"type": "narrate", "text": text})

    async def _rsm_commit(self):
        tmpl = _RSM_COMMANDS[self._seq % len(_RSM_COMMANDS)]
        try:    cmd = tmpl.format(self._seq, chr(65 + self._seq % 8))
        except: cmd = tmpl.format(self._seq)
        await self._emit({"type": "rsm_commit", "seq": self._seq,
                          "cmd": cmd, "view": self._view, "round": self._round})

    async def _ripple(self, drone_id: int, color: str = "#00b4d8"):
        await self._emit({"type": "ripple", "id": drone_id, "color": color})

    async def _arrow(self, src: int, dst: int, kind: str, ok=True):
        await self._emit({"type": "arrow", "from": src, "to": dst, "kind": kind, "ok": ok})

    async def _clear(self):
        await self._emit({"type": "clear_arrows"})

    async def _pause(self, ms: float):
        await asyncio.sleep(ms / 1000 / self._speed)

    def _honest(self):
        return [d for d in self.drones if d.state == DroneState.HONEST]

    def _live(self):
        return [d for d in self.drones if d.state not in (DroneState.CRASHED, DroneState.QUARANTINED)]

    def _leader(self):
        return self.drones[self._leader_id]

    # ── BFT ROUND ─────────────────────────────────────────────

    async def run_bft_round(self):
        if self._busy:
            await self._log("⚠ Protocol already running — wait for it to finish", "warn"); return
        self._busy = True
        try:
            leader = self._leader()
            if leader.state != DroneState.HONEST:
                await self._log(f"[ERROR] Leader {leader.label} is {leader.state.value} — triggering view-change", "error")
                await self._do_view_change(); return
            if self._jammed:
                await self._log("[OMISSION] Channel jammed — consensus suspended", "warn"); return
            honest = self._honest()
            if len(honest) < self.QUORUM:
                await self._log(f"[QUORUM FAIL] Only {len(honest)} honest drones — need {self.QUORUM}", "error"); return

            self._seq += 1; self._round += 1

            # PREPARE
            await self._banner("PHASE 1 — PREPARE", "blue")
            await self._narrate(f"{leader.label} is the squadron commander. It proposes the next mission task (block #{self._seq}) and sends it to all 6 drones for approval.")
            await self._ripple(leader.id, "#00b4d8")
            await self._log(f"[PREPARE] {leader.label} → all  |  view={self._view}, seq={self._seq}, H=0x{self._seq:04x}", "protocol")
            await self._pause(200)
            for d in self.drones:
                if d.id == leader.id: continue
                await self._arrow(leader.id, d.id, "PREPARE", ok=d.state != DroneState.CRASHED)
                await self._pause(120)
            await self._pause(600)
            await self._clear()

            # VOTE
            await self._banner("PHASE 2 — VOTE", "green")
            await self._narrate("Each drone checks the proposal. If it looks valid and honest, it sends back a signed VOTE. Think of it as raising your hand to say 'I agree'.")
            vote_count = 0
            for d in self.drones:
                if d.id == leader.id: continue
                if d.state == DroneState.BYZANTINE:
                    await self._log(f"[BYZANTINE] {d.label} is lying — sends conflicting votes to confuse peers!", "error")
                    peers = [t for t in self.drones if t.state == DroneState.HONEST][:2]
                    for t in peers:
                        await self._arrow(d.id, t.id, "VOTE_CONFLICT", ok=False)
                        await self._pause(100)
                elif d.state in (DroneState.HONEST, DroneState.SAFE_HOVER):
                    await self._arrow(d.id, leader.id, "VOTE", ok=True)
                    await self._log(f"[VOTE]  {d.label} → {leader.label}  |  signed ✓", "info")
                    vote_count += 1
                    await self._pause(130)

            await self._pause(400)
            await self._log(f"[QUORUM] {vote_count} honest votes collected — need {self.QUORUM} ✓", "success")
            await self._narrate(f"Got {vote_count} honest votes — that's more than the minimum {self.QUORUM} needed. The math (n=3f+1) guarantees Byzantine drones can't outvote the honest ones!")
            await self._pause(500)
            await self._clear()

            # COMMIT
            await self._banner("PHASE 3 — COMMIT", "orange")
            await self._narrate(f"Quorum reached! {leader.label} broadcasts the final COMMIT. Every drone writes task #{self._seq} into their log. The entire swarm is now in perfect sync.")
            await self._ripple(leader.id, "#2dc653")
            for d in self.drones:
                if d.id == leader.id: continue
                if d.state in (DroneState.HONEST, DroneState.SAFE_HOVER):
                    await self._arrow(leader.id, d.id, "COMMIT", ok=True)
                    await self._pause(100)
            await self._pause(400)
            await self._log(f"[COMMIT] Round {self._round} committed ✓  seq={self._seq}  BW≈30%", "success")
            await self._rsm_commit()
            await self._emit({"type": "commit_flash"})
            await self._state()
            await self._pause(500)
            await self._clear()
            await self._narrate("")

        finally:
            self._busy = False

    # ── BYZANTINE ─────────────────────────────────────────────

    async def inject_byzantine(self):
        if self._busy:
            await self._log("⚠ Protocol running…", "warn"); return

        byz = [d for d in self.drones if d.state == DroneState.BYZANTINE]
        if len(byz) >= self.F:
            await self._log(f"[SECURITY] Already at max f={self.F} Byzantine drones — BFT still safe ✓", "warn"); return

        candidates = [d for d in self.drones if d.state == DroneState.HONEST and d.id != self._leader_id]
        if not candidates:
            await self._log("[INFO] No honest non-leader drones to compromise", "warn"); return

        target = candidates[-1]
        target.state = DroneState.BYZANTINE
        byz_total = sum(1 for d in self.drones if d.state == DroneState.BYZANTINE)

        await self._banner("CYBER ATTACK — GPS SPOOFING", "red")
        await self._narrate(f"A hacker just compromised {target.label}! Its GPS is now spoofed — it will deliberately send WRONG position data to confuse the swarm and cause mid-air collisions.")
        await self._log(f"[ATTACK] GPS spoofing activated on {target.label}!", "error")
        await self._ripple(target.id, "#e63946")
        await self._pause(500)

        await self._narrate(f"{target.label} is now lying — telling D1 it's at position X:10, but telling D2 it's at position X:50. Classic Byzantine behavior.")
        await self._log(f"[ATTACK] {target.label} sends pos X:10 to D1  AND  pos X:50 to D2 simultaneously", "error")
        honest_peers = [d for d in self.drones if d.state == DroneState.HONEST]
        for t in honest_peers[:2]:
            await self._arrow(target.id, t.id, "FAKE_POS_A", ok=False); await self._pause(150)
        for t in honest_peers[2:4]:
            await self._arrow(target.id, t.id, "FAKE_POS_B", ok=False); await self._pause(150)

        await self._pause(400)
        if byz_total <= self.F:
            await self._narrate(f"BUT — the BFT formula n=3f+1 says: with n=7 drones we can survive up to f=2 liars. Right now {byz_total} drone(s) are lying, so the remaining {self.N - byz_total} honest drones can still outvote them. Safe! ✓")
            await self._log(f"[BFT] Byzantine: {byz_total}/{self.F} — quorum of {self.QUORUM} honest drones holds ✓", "success")
        else:
            await self._narrate(f"DANGER: {byz_total} Byzantine drones exceeds our tolerance of f={self.F}. BFT safety could be broken!")
            await self._log(f"[WARNING] Byzantine: {byz_total} > f={self.F} — threshold EXCEEDED!", "error")
        await self._state()
        await self._pause(400)
        await self._clear()
        await self._narrate("")

    # ── KILL LEADER ───────────────────────────────────────────

    async def kill_leader(self):
        if self._busy:
            await self._log("⚠ Protocol running…", "warn"); return
        self._busy = True
        try:
            leader = self._leader()
            await self._banner("LEADER CRASH FAULT", "red")
            await self._narrate(f"Oh no! {leader.label} — the squadron commander — just lost power and fell out of the sky. Bird strike, dead battery, hardware failure. It's gone.")
            await self._pause(400)
            leader.state = DroneState.CRASHED
            await self._log(f"[CRASH] {leader.label} CRASHED — bird strike / battery depleted", "error")
            await self._state()
            await self._pause(600)
            await self._narrate(f"Every surviving drone starts an internal countdown: T_hb = 1000ms. If we don't hear from the commander in 1 second... we elect a new one.")
            await self._pause(800)
            await self._narrate("1000ms passed... silence. The old commander is officially gone. Launching emergency election now!")
            await self._pause(400)
            await self._do_view_change()
        finally:
            self._busy = False

    async def _do_view_change(self):
        old_leader = self._leader()
        await self._banner("LEADER ELECTION — VIEW-CHANGE", "purple")
        await self._log(f"[TIMEOUT] T_hb=1000ms expired — no PREPARE from {old_leader.label}", "warn")

        live = [d for d in self.drones
                if d.state not in (DroneState.CRASHED, DroneState.BYZANTINE, DroneState.QUARANTINED)]

        # Step 1: Each drone broadcasts VIEW-CHANGE to ALL peers
        await self._narrate("Step 1: Every surviving drone casts a signed vote — 'I agree the old leader is gone, let's move to the next view'")
        await self._pause(300)
        for sender in live:
            await self._log(f"[VC]  {sender.label} → all: VIEW-CHANGE(v={self._view+1}, last_seq={self._seq}, σ_{sender.id+1})", "protocol")
            await self._ripple(sender.id, "#9b59b6")
            for receiver in live:
                if receiver.id != sender.id:
                    await self._arrow(sender.id, receiver.id, "VIEW_CHANGE", ok=True)
            await self._pause(250)
        await self._clear()
        await self._pause(300)

        # Step 2: Count votes
        vote_count = len(live)
        await self._narrate(f"Step 2: Counting signed VIEW-CHANGE messages... got {vote_count}. We need at least 2f+1 = {self.QUORUM}. {'✓ Quorum reached!' if vote_count >= self.QUORUM else '✗ Not enough!'}")
        await self._pause(500)
        await self._log(f"[VC] {vote_count} VIEW-CHANGE messages collected — quorum {self.QUORUM} {'✓' if vote_count >= self.QUORUM else '✗'}", "success" if vote_count >= self.QUORUM else "error")
        await self._pause(300)

        # Step 3: Select next leader (rotate view, skip dead/byz drones)
        attempts = 0
        while attempts < self.N:
            self._view += 1
            candidate_id = self._view % self.N
            candidate = self.drones[candidate_id]
            if candidate.state not in (DroneState.CRASHED, DroneState.BYZANTINE, DroneState.QUARANTINED):
                for d in self.drones:
                    if d.role == DroneRole.LEADER and d.id != candidate_id:
                        d.role = DroneRole.SERVICE
                candidate.role  = DroneRole.LEADER
                self._leader_id = candidate_id
                break
            attempts += 1

        new_leader = self._leader()

        # Step 4: Announce + key ceremony
        await self._narrate(f"Step 3: The formula says the next commander is drone #{(self._view % self.N) + 1} — that's {new_leader.label}! Everyone now re-encrypts with a fresh key so the old crashed drone can never fake commands.")
        await self._pause(300)
        await self._ripple(new_leader.id, "#00b4d8")
        await self._log(f"[NEW-VIEW] {new_leader.label} elected Leader  |  view={self._view}", "success")
        await self._log(f"[KDF]  K_view_{self._view} = HKDF(K_sess, {self._view} ‖ squadron_id) — new key active", "info")
        await self._pause(400)
        await self._emit({"type": "commit_flash", "color": "#9b59b6"})
        await self._narrate(f"{new_leader.label} is the new commander! New encrypted channel active. Mission continues — zero downtime.")
        await self._state()
        await self._pause(300)

    # ── RF JAM ────────────────────────────────────────────────

    async def rf_jam(self):
        self._jammed = not self._jammed
        if self._jammed:
            await self._banner("RF JAMMING ACTIVE", "gray")
            await self._narrate("An enemy is blasting radio noise on our frequency. The drones can't hear each other anymore. Rather than guess and crash, every drone enters SAFE HOVER — freeze in place until comms come back.")
            await self._log("[OMISSION] Broadband jammer on Tier 3 FANET 5.8 GHz", "error")
            await self._pause(300)
            for d in self.drones:
                if d.state == DroneState.HONEST:
                    d.state = DroneState.SAFE_HOVER
            await self._log("[SAFETY] All drones → SAFE_HOVER (liveness paused, safety intact)", "warn")
            await self._log("[FHSS]  Attempting 79-channel frequency hopping at 1600 hops/s…", "info")
            await self._narrate("This is the FLP Impossibility in action — no algorithm can guarantee progress under infinite jamming, so we choose SAFETY over speed. The drones hover safely until the jam clears.")
        else:
            await self._banner("RF JAMMING CLEARED", "green")
            for d in self.drones:
                if d.state == DroneState.SAFE_HOVER:
                    d.state = DroneState.HONEST
            await self._log("[RECOVERY] Channel restored — SAFE_HOVER released", "success")
            await self._narrate("Frequency hopping found a clean channel! All drones wake up, resume their positions, and BFT consensus restarts from where it left off. No data was lost.")
            await self._log(f"[RESUME] BFT consensus resuming from seq={self._seq}", "success")
        await self._state()

    # ── GCS EMERGENCY ─────────────────────────────────────────

    async def gcs_emergency(self):
        if self._busy:
            await self._log("⚠ Protocol running…", "warn"); return
        self._busy = True
        try:
            await self._banner("DOLEV-STRONG — GCS EMERGENCY", "amber")
            await self._narrate("Weather radar just detected a storm! Ground Control needs to order ALL drones to Return-To-Base — immediately. But how does every drone KNOW the order is real, not a fake?")
            await self._pause(600)
            await self._narrate("Answer: Dolev-Strong protocol. The command must pass through 3 rounds of signing — like a legal document needing 3 witnesses. A hacked drone can't forge 3 real signatures.")
            await self._log("[GCS] RETURN-TO-BASE | storm approaching — signed by 3-of-4 GCS replicas", "warn")
            await self._pause(500)

            leader = self._leader()

            await self._log("[ROUND 1] GCS → leader  |  RTB + σ_GCS1 + σ_GCS2 + σ_GCS3", "protocol")
            await self._narrate("Round 1: Ground Control signs the RTB order with 3 independent keys and sends it to the squadron commander.")
            await self._arrow(0, leader.id, "RTB_R1", ok=True)
            await self._ripple(leader.id, "#f4a261")
            await self._pause(600)

            await self._narrate(f"Round 2: {leader.label} adds its own signature and forwards to all 6 drones — now 4 signatures on the document.")
            await self._log(f"[ROUND 2] {leader.label} → all  |  RTB + 4 signatures", "protocol")
            for d in self.drones:
                if d.id == leader.id: continue
                if d.state not in (DroneState.CRASHED,):
                    await self._arrow(leader.id, d.id, "RTB_R2", ok=True)
                    await self._pause(120)
            await self._pause(500)

            await self._narrate("Round 3: All-to-all relay — every drone passes the signed order to its neighbours. Each drone must independently collect t+1=3 valid signatures before obeying.")
            await self._log("[ROUND 3] All → all  |  relay — every honest drone collects 3 sigs", "protocol")
            live = [d for d in self.drones if d.state not in (DroneState.CRASHED,)]
            for i in range(min(4, len(live))):
                await self._arrow(live[i].id, live[(i+1) % len(live)].id, "RTB_R3", ok=True)
                await self._pause(120)
            await self._pause(500)

            await self._log("[DELIVER] RTB delivered to all honest drones ✓  (3 sigs verified)", "success")
            await self._log("[TIMING]  3 × 500ms = 1.5 s < 2 s emergency deadline ✓", "success")
            await self._emit({"type": "commit_flash", "color": "#f4a261"})
            await self._narrate("RTB order authenticated and delivered in 1.5 seconds — well within the 2-second storm deadline. All drones start returning to base. Synchronized. Safe.")
            await self._pause(500)
            await self._clear()
        finally:
            self._busy = False

    # ── BELOW QUORUM / MERGE ──────────────────────────────────

    async def below_quorum_merge(self):
        if self._busy:
            await self._log("⚠ Protocol running…", "warn"); return
        self._busy = True
        try:
            await self._banner("BELOW-QUORUM — MERGE PROTOCOL", "orange")
            await self._narrate("Worst case scenario: 3 drones crash at the same time — battery failure, mid-air collision, whatever. The squad drops to 4 drones, below the safe minimum of 5.")
            await self._pause(400)

            to_crash = [d for d in self.drones if d.state == DroneState.HONEST and d.id != self._leader_id][:3]
            for d in to_crash:
                d.state = DroneState.CRASHED
                await self._log(f"[CRASH] {d.label} lost  (battery / bird strike)", "error")
                await self._pause(250)

            live_n = len([d for d in self.drones if d.state not in (DroneState.CRASHED, DroneState.BYZANTINE, DroneState.QUARANTINED)])
            await self._state()
            await self._pause(400)

            await self._narrate(f"Only {live_n} drones left — below the BFT minimum of 5. This is critical: with fewer than 5 honest drones we can't mathematically prove decisions are honest. ALL PROPOSALS FROZEN. Safety first.")
            await self._log(f"[QUORUM] Live={live_n} < {self.QUORUM} — NEW PROPOSALS HALTED", "error")
            await self._pause(600)

            # P1 – Distress beacon
            await self._narrate("P1: The survivors broadcast a DISTRESS BEACON on the backup LoRa radio (915 MHz). Think of it as a flare gun — 'We need help!'")
            await self._log("[P1] DISTRESS_BEACON emitted on Tier 2 LoRa 915 MHz", "warn")
            for d in self.drones:
                if d.state not in (DroneState.CRASHED, DroneState.BYZANTINE):
                    await self._ripple(d.id, "#f77f00")
            await self._pause(600)

            # P2 – GCS arbitrates
            await self._narrate("P2: Ground Control hears the beacon and identifies a nearby squad with spare drones. It authorises a transfer — 'Send 2 reinforcements to Squadron Alpha.'")
            await self._log("[P2] GCS arbitrates donor squadron  (n_D=6 ≥ 2f+2=6)", "info")
            await self._pause(600)

            # P3 – State transfer
            await self._narrate("P3: The 3 survivors agree on the exact state of the mission log — what tasks were done, what's pending. The new drones must start from the SAME history.")
            await self._log("[P3] RSM state transfer — f+1=3 survivors agree on H(state)=0xc4f2…", "info")
            await self._pause(600)

            # P3.5 – Guard authentication
            await self._narrate("P3.5: The Guard drone runs a cryptographic handshake on each new arrival. It's like airport security — 'Prove you have the right credentials before joining our network.'")
            await self._log("[P3.5] Guard drone: polynomial threshold auth on each new joiner", "protocol")
            await self._log("       Σ cᵢ = Σ p(xᵢ)·∏(−xᵣ/(xᵢ−xᵣ))·P  →  Σcᵢ == Q  ✓", "protocol")

            guard = next((d for d in self.drones if d.role == DroneRole.GUARD and d.state == DroneState.HONEST), None)
            await self._pause(600)

            # P4 – Key ceremony + restore drones (they fly in)
            self._view += 1
            await self._narrate("P4: New drones cleared! Fresh encryption keys are generated — the old crashed drones can never use their old keys to sneak back in as impostors.")
            await self._log(f"[P4] K_view_{self._view} = HKDF(K_sess, {self._view}) — new session key active", "info")
            await self._pause(500)

            # Restore & emit drone_join for visual fly-in
            restored = 0
            for d in self.drones:
                if d.state == DroneState.CRASHED and restored < 2:
                    d.state = DroneState.HONEST
                    restored += 1
                    await self._emit({"type": "drone_join", "id": d.id, "label": d.label})
                    await self._narrate(f"Watch {d.label} fly in from the donor squadron and join the formation! ✈")
                    await self._pause(1800)   # give time for the fly-in animation

            if guard:
                await self._arrow(guard.id, self.drones[list(range(self.N))[4]].id, "AUTH_OK", ok=True)

            # P5 – Resume
            await self._log(f"[P5] NEW-VIEW(v={self._view}) broadcast — consensus resumes", "success")
            live2 = len([d for d in self.drones if d.state not in (DroneState.CRASHED, DroneState.BYZANTINE, DroneState.QUARANTINED)])
            await self._log(f"[RESTORED] Squadron live={live2} ≥ quorum {self.QUORUM}  BFT liveness restored ✓", "success")
            await self._emit({"type": "commit_flash", "color": "#2dc653"})
            await self._narrate(f"Squadron back to {live2} drones — above the safe minimum of 5. BFT consensus restarts. The mission never had to abort. This is what resilience looks like.")
            await self._state()

        finally:
            self._busy = False

    # ── AUTO DEMO ─────────────────────────────────────────────

    async def auto_demo(self):
        if self._busy:
            await self._log("⚠ Protocol running…", "warn"); return

        await self.reset()
        await self._pause(600)

        await self._narrate("AUTO-DEMO Step 1/6 — Normal BFT consensus · 'Work fast and safe under good conditions'")
        await self._pause(800)
        await self.run_bft_round()
        await self._pause(600)
        await self.run_bft_round()
        await self._pause(800)

        await self._narrate("AUTO-DEMO Step 2/6 — GPS-spoofing cyber attack · Byzantine fault injection")
        await self._pause(800)
        await self.inject_byzantine()
        await self._pause(600)

        await self._narrate("AUTO-DEMO Step 3/6 — BFT consensus survives the attack · n=3f+1 in action")
        await self._pause(800)
        await self.run_bft_round()
        await self._pause(800)

        await self._narrate("AUTO-DEMO Step 4/6 — Commander crashes mid-mission · View-change elects new leader")
        await self._pause(800)
        await self.kill_leader()
        await self._pause(600)

        await self._narrate("AUTO-DEMO Step 5/6 — Storm alert from Ground Control · Dolev-Strong emergency broadcast")
        await self._pause(800)
        await self.gcs_emergency()
        await self._pause(800)

        await self._narrate("AUTO-DEMO Step 6/6 — Multiple crashes, below quorum · 6-phase Merge protocol")
        await self._pause(800)
        await self.below_quorum_merge()
        await self._pause(800)

        await self._narrate("'Work safely under faulty conditions' — AeroMesh demonstrated end-to-end ✓")
        await self._log("[AUTO-DEMO] All 6 scenarios complete. AeroMesh is production-grade BFT ✓", "success")

    # ── STOP (cancel any running protocol) ───────────────────

    async def stop(self):
        self._busy = False
        await self._emit({"type": "clear_arrows"})
        await self._emit({"type": "banner",  "text": "", "color": ""})
        await self._emit({"type": "narrate", "text": ""})
        await self._log("[STOP] Sequence cancelled by user", "warn")
        await self._state()

    # ── RESET ─────────────────────────────────────────────────

    async def reset(self):
        self._busy = False; self._view = 0; self._seq = 0
        self._round = 0; self._jammed = False
        self._init_drones()
        await self._emit({"type": "clear_arrows"})
        await self._emit({"type": "banner",   "text": "", "color": ""})
        await self._emit({"type": "narrate",  "text": ""})
        await self._emit({"type": "rsm_clear"})
        await self._log("[RESET] Squadron restored to initial state ✓", "success")
        await self._state()
