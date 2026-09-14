import React, { useState, useEffect, useRef } from "react";
import { Maximize2 } from "lucide-react";

const NEON = "#b8ff00";
const RED = "#ff3b3b";

const TEAMS = {
  home: {
    name: "STRIKERS (OPEN)",
    badge: "HOME",
    logo: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=200&q=80",
    color: "#f97316",
  },
  away: {
    name: "DUKE HOOPS",
    badge: "AWAY",
    logo: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=200&q=80",
    color: "#facc15",
  },
};

const GAME_LENGTH = 600;
const SHOT_LENGTH = 24;

function formatClock(totalSeconds) {
  const m = Math.floor(Math.max(0, totalSeconds) / 60);
  const s = Math.floor(Math.max(0, totalSeconds) % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function ShotClockRing({ seconds, total }) {
  const radius = 46;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, seconds / total));
  const offset = circ * (1 - pct);
  const danger = seconds <= 5;
  return (
    <div className="relative w-[120px] h-[120px] flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={danger ? RED : NEON}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.4s ease", filter: `drop-shadow(0 0 6px ${danger ? RED : NEON}66)` }}
        />
      </svg>
      <span
        className="font-heading text-4xl font-bold tabular-nums"
        style={{ color: danger ? RED : "#fff" }}
      >
        {Math.ceil(Math.max(0, seconds))}
      </span>
    </div>
  );
}

function TeamColumn({ side, score, flash }) {
  const t = TEAMS[side];
  return (
    <div className="flex-1 flex flex-col items-center text-center px-4 py-6 min-w-0">
      <div
        className="w-14 h-14 rounded-full border-2 mb-3 overflow-hidden bg-white/5 flex items-center justify-center"
        style={{ borderColor: `${t.color}55` }}
      >
        <img src={t.logo} alt="" className="w-full h-full object-cover" />
      </div>
      <span className="font-heading text-sm font-bold tracking-wide text-white uppercase leading-tight">
        {t.name}
      </span>
      <span className="mt-1.5 mb-3 text-[10px] font-semibold tracking-[0.15em] text-white/55 border border-white/15 rounded-full px-2 py-0.5">
        {t.badge}
      </span>
      <span
        key={flash}
        className="font-heading text-6xl font-bold tabular-nums text-white leading-none"
        style={{ animation: flash ? "sbScorePulse 0.6s ease-out" : "none" }}
      >
        {score}
      </span>
    </div>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="tracking-[0.12em] text-white/45 uppercase">{label}</span>
      <span className="font-semibold text-white/85 tabular-nums">{value}</span>
    </div>
  );
}

export default function BroadcastScoreboard() {
  const [gameClock, setGameClock] = useState(GAME_LENGTH);
  const [shotClock, setShotClock] = useState(SHOT_LENGTH);
  const [quarter, setQuarter] = useState(1);
  const [scores, setScores] = useState({ home: 0, away: 0 });
  const [fouls, setFouls] = useState({ home: 0, away: 0 });
  const [topScorer, setTopScorer] = useState({ home: "—", away: "—" });
  const [foulTrouble, setFoulTrouble] = useState({ home: "—", away: "—" });
  const [flash, setFlash] = useState({ home: 0, away: 0 });

  useEffect(() => {
    const id = setInterval(() => {
      setGameClock((g) => {
        if (g > 1) return g - 1;
        setQuarter((q) => (q < 4 ? q + 1 : 1));
        setShotClock(SHOT_LENGTH);
        return GAME_LENGTH;
      });
      setShotClock((s) => (s > 1 ? s - 1 : SHOT_LENGTH));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const side = Math.random() > 0.5 ? "home" : "away";
      const pts = [2, 3, 1][Math.floor(Math.random() * 3)];
      setScores((prev) => ({ ...prev, [side]: prev[side] + pts }));
      setFlash((f) => ({ ...f, [side]: f[side] + 1 }));
      setShotClock(SHOT_LENGTH);
      if (Math.random() > 0.7) {
        const fside = Math.random() > 0.5 ? "home" : "away";
        setFouls((f) => ({ ...f, [fside]: f[fside] + 1 }));
      }
    }, 7000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const names = { home: ["J. Carter", "M. Reed", "A. Brooks"], away: ["T. Walsh", "K. Owens", "D. Pierce"] };
    setTopScorer({
      home: scores.home > 0 ? `${names.home[scores.home % 3]} ${scores.home}` : "—",
      away: scores.away > 0 ? `${names.away[scores.away % 3]} ${scores.away}` : "—",
    });
    setFoulTrouble({
      home: fouls.home >= 4 ? `#12 (${fouls.home})` : "—",
      away: fouls.away >= 4 ? `#7 (${fouls.away})` : "—",
    });
  }, [scores, fouls]);

  const timeOfDay = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
      style={{ background: "#1a1a1a" }}
    >
      <style>{`
        @keyframes sbScorePulse {
          0% { transform: scale(1); }
          35% { transform: scale(1.18); color: ${NEON}; }
          100% { transform: scale(1); }
        }
        @keyframes sbFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sbGlow {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.6; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <span className="text-[10px] font-bold tracking-[0.15em] rounded-full px-2.5 py-1" style={{ background: NEON, color: "#0a0a0a" }}>
          BASKETBALL
        </span>
        <span className="text-[10px] font-semibold tracking-[0.15em] text-white/45 uppercase">Quarter {quarter}</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.15em] text-white/70">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: NEON, animation: "sbGlow 1.5s ease-in-out infinite" }} />
            LIVE
          </span>
          <Maximize2 className="w-3.5 h-3.5 text-white/40" />
        </div>
      </div>

      {/* Main split */}
      <div className="flex items-stretch relative" style={{ animation: "sbFadeIn 0.6s ease-out" }}>
        <TeamColumn side="home" score={scores.home} flash={flash.home} />

        {/* Center clock column */}
        <div className="relative flex flex-col items-center justify-center px-3 py-6 min-w-[150px]">
          <div className="absolute top-0 bottom-0 left-0 w-px" style={{ background: `${NEON}40` }} />
          <div className="absolute top-0 bottom-0 right-0 w-px" style={{ background: `${NEON}40` }} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at center, ${NEON}1f, transparent 60%)` }} />
          <span className="relative text-[10px] text-white/45 tabular-nums mb-1">{timeOfDay}</span>
          <span className="relative font-heading text-4xl font-bold tabular-nums text-white leading-none mb-2">
            {formatClock(gameClock)}
          </span>
          <span className="relative text-[10px] font-semibold tracking-[0.15em] rounded-full px-2 py-0.5 mb-3" style={{ border: `1px solid ${NEON}55`, color: NEON }}>
            QUARTER {quarter}
          </span>
          <div className="relative">
            <ShotClockRing seconds={shotClock} total={SHOT_LENGTH} />
          </div>
        </div>

        <TeamColumn side="away" score={scores.away} flash={flash.away} />
      </div>

      {/* Footer stats */}
      <div className="grid grid-cols-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#262626" }}>
        {["home", "away"].map((side) => (
          <div key={side} className="px-5 py-3 space-y-1.5" style={{ borderRight: side === "home" ? `1px solid ${NEON}30` : "none" }}>
            <StatRow label="TEAM FOULS" value={fouls[side]} />
            <StatRow label="TOP SCORER" value={topScorer[side]} />
            <StatRow label="FOUL TROUBLE" value={foulTrouble[side]} />
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-5 py-2 text-[10px] font-medium tracking-[0.1em] text-white/45 uppercase border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <span>Court 1</span>
        <span>9/13/2026</span>
      </div>
    </div>
  );
}