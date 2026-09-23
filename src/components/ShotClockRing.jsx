import React from "react";

const GREEN = "#77DD77";

export default function ShotClockRing({ shotClockMs, shotClockLengthSeconds, running }) {
  const totalMs = (shotClockLengthSeconds || 0) * 1000;
  const remaining = Math.max(0, Math.min(totalMs, shotClockMs || 0));
  const fraction = totalMs > 0 ? remaining / totalMs : 0;

  const size = 120;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * fraction;
  const seconds = Math.ceil(remaining / 1000);

  return (
    <div className="flex flex-col items-center">
      <p className="text-[10px] font-heading font-bold uppercase tracking-widest mb-1" style={{ color: "#9CA3AF" }}>Shot Clock</p>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={GREEN}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            style={{ transition: "stroke-dasharray 0.3s linear" }}
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center font-heading font-bold tabular-nums leading-none"
          style={{ fontSize: "2rem", color: running ? GREEN : "#fff" }}
        >
          {seconds}
        </span>
      </div>
    </div>
  );
}