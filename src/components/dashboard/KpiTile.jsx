import React from "react";
import { Link } from "react-router-dom";

/**
 * Compact glassmorphic KPI tile for the Arena Command stat rail.
 * `accent` highlights the tile in neon emerald (used for live games).
 */
export default function KpiTile({ icon: Icon, label, value, sub, accent = false, to }) {
  const inner = (
    <div
      className={`relative overflow-hidden rounded-lg border bg-card p-4 h-full transition-colors ${
        accent ? "border-primary/50" : "border-border"
      } ${to ? "hover:border-primary/40 cursor-pointer" : ""}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-heading font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <Icon className={`w-4 h-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <p
        className={`font-heading text-3xl font-bold tabular-nums leading-none ${
          accent ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-2 text-xs text-muted-foreground">{sub}</p>}
      {accent && (
        <span className="absolute top-3 right-9 w-2 h-2 rounded-full bg-primary animate-pulse" />
      )}
    </div>
  );

  if (to) return <Link to={to} className="block h-full">{inner}</Link>;
  return inner;
}