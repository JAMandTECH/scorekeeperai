import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle, ChevronRight, Clock, PlayCircle, RotateCcw, Shield, Sparkles, Target, TrendingUp, Zap,
} from "lucide-react";
import { DEMO_PLAYERS, DEMO_TEAMS } from "@/lib/trialDemo";
import { buildFrames } from "@/components/landing/liveScoringScript";

const FRAMES = buildFrames();
const ROSTER_SIZE = 4;
const STEP_MS = 1500;

const homeTeam = DEMO_TEAMS.basketball.home;
const awayTeam = DEMO_TEAMS.basketball.away;
const homeRoster = DEMO_PLAYERS.basketball.home.slice(0, ROSTER_SIZE);
const awayRoster = DEMO_PLAYERS.basketball.away.slice(0, ROSTER_SIZE);

const CONTROLS = [
  { key: "pt1", label: "+1 PT", tone: "primary" },
  { key: "pt2", label: "+2 PTS", tone: "primary" },
  { key: "pt3", label: "+3 PTS", tone: "primary" },
  { key: "reb", label: "REB", icon: TrendingUp },
  { key: "ast", label: "AST", icon: Target },
  { key: "stl", label: "STL", icon: Zap },
  { key: "blk", label: "BLK", icon: Shield },
  { key: "foul", label: "FOUL", icon: AlertTriangle },
  { key: "undo", label: "UNDO", icon: RotateCcw, tone: "muted" },
];

const initials = (name) => (name || "").substring(0, 2).toUpperCase();

const renderRow = (player, team, index, stats, selected) => {
  const s = stats[String(index)] || { points: 0, reb: 0, ast: 0, stl: 0, blk: 0, fl: 0 };
  const isSelected = selected?.team === team && selected?.key === String(index);
  return (
    <div
      key={player.id}
      className={`mb-2 flex items-center justify-between gap-2 border px-2.5 py-2 transition-colors duration-300 last:mb-0 ${
        isSelected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Avatar className="h-8 w-8 border border-border">
          <AvatarFallback className="bg-secondary font-heading text-xs font-bold text-foreground">
            {player.jersey_number}
          </AvatarFallback>
        </Avatar>
        <p className="truncate font-heading text-xs font-bold">
          {player.first_name} {player.last_name}
        </p>
      </div>
      <div className="flex shrink-0 gap-2.5">
        {[["PTS", s.points], ["REB", s.reb], ["AST", s.ast], ["STL", s.stl], ["BLK", s.blk], ["FL", s.fl]].map(([label, value]) => (
          <div key={label} className="text-center">
            <p className="font-heading text-sm font-bold tabular-nums">{value}</p>
            <p className={`text-[9px] font-medium ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const renderRoster = (title, team, roster, stats, selected, timeouts) => (
  <div className="flex flex-col border border-border bg-card">
    <div className="flex items-center justify-between gap-2 border-b border-border bg-muted px-3 py-2">
      <p className="font-heading text-sm font-bold">{title}</p>
      <span className="inline-flex items-center gap-1 bg-primary px-2 py-1 text-[10px] font-heading font-bold text-primary-foreground">
        <Clock className="w-3 h-3" /> TO ({timeouts})
      </span>
    </div>
    <div className="p-3">
      {roster.map((player, index) => renderRow(player, team, index, stats, selected))}
    </div>
  </div>
);

/**
 * Animated, non-interactive replay of the real live scoring screen
 * (the same scoreboard, roster rows and control bar the demo page renders).
 */
export default function LiveScoringPreview() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIndex(FRAMES.length - 1);
      return;
    }
    const id = setInterval(() => {
      setIndex((i) => (i >= FRAMES.length + 1 ? 0 : i + 1));
    }, STEP_MS);
    return () => clearInterval(id);
  }, []);

  const frame = FRAMES[Math.min(index, FRAMES.length - 1)];

  return (
    <div className="border border-border bg-background">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <div>
          <p className="font-heading text-sm font-bold">Demo Live Scoring</p>
          <p className="text-xs font-medium text-muted-foreground">Basketball simulation — changes are not saved</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-1 border border-border px-2 py-1">
            <RotateCcw className="w-3 h-3" /> Reset Demo
          </span>
          <span className="inline-flex items-center gap-1 border border-border px-2 py-1">
            <ChevronRight className="w-3 h-3 rotate-180" /> Back to Home
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2">
        <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-600" />
        <p className="truncate text-xs font-medium">
          You&apos;re in <span className="font-heading font-bold">Demo Mode</span>. Simulated scoring — real league data is never touched.
        </p>
      </div>

      <div aria-hidden="true">
        <div className="border-b-2 border-border bg-card px-4 py-4">
          <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
            <Badge variant="destructive" className="gap-1.5 px-3 py-1 text-[10px] font-heading font-bold uppercase tracking-wide">
              <PlayCircle className="w-3.5 h-3.5 animate-pulse" /> Live · Q{frame.period}
            </Badge>
            <Badge variant="outline" className="px-2 py-1 text-[10px] font-heading font-bold uppercase tracking-wide text-muted-foreground">
              Basketball
            </Badge>
          </div>

          <div className="grid grid-cols-3 items-start gap-3">
            <div className="text-center">
              <p className="mb-1.5 text-[10px] font-heading font-bold uppercase tracking-wide text-muted-foreground">Home</p>
              <div className="mb-1 flex items-center justify-center gap-2">
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarFallback className="bg-secondary font-heading text-xs font-bold text-foreground">
                    {initials(homeTeam.name)}
                  </AvatarFallback>
                </Avatar>
                <p className="font-heading text-sm font-bold">{homeTeam.name}</p>
              </div>
              <p key={`h${frame.home}`} className="animate-scorePulse font-heading text-3xl font-bold tabular-nums md:text-4xl">
                {frame.home}
              </p>
              <p className="text-[10px] font-medium text-muted-foreground">
                FOULS: {frame.homeFouls}/5 · TO: {frame.homeTimeouts}
              </p>
            </div>

            <div className="text-center">
              <p className="font-heading text-sm font-bold">Q{frame.period}</p>
              <p className="mb-2 text-[10px] font-medium text-muted-foreground">
                {[1, 2, 3, 4].map((p, i) => {
                  const ps = frame.periodScores.find((s) => s.quarter === p);
                  return (
                    <span key={p}>{`Q${p}:${ps ? `${ps.home}-${ps.away}` : "-"}`}{i < 3 ? ", " : ""}</span>
                  );
                })}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <span className="inline-flex items-center gap-1 bg-primary px-3 py-1.5 text-[10px] font-heading font-bold text-primary-foreground">
                  END Q{frame.period} <ChevronRight className="w-3 h-3" />
                </span>
                <span className="inline-flex items-center border border-border px-3 py-1.5 text-[10px] font-medium text-muted-foreground">
                  CANCEL
                </span>
              </div>
            </div>

            <div className="text-center">
              <p className="mb-1.5 text-[10px] font-heading font-bold uppercase tracking-wide text-muted-foreground">Away</p>
              <div className="mb-1 flex items-center justify-center gap-2">
                <p className="font-heading text-sm font-bold">{awayTeam.name}</p>
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarFallback className="bg-secondary font-heading text-xs font-bold text-foreground">
                    {initials(awayTeam.name)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <p key={`a${frame.away}`} className="animate-scorePulse font-heading text-3xl font-bold tabular-nums md:text-4xl">
                {frame.away}
              </p>
              <p className="text-[10px] font-medium text-muted-foreground">
                FOULS: {frame.awayFouls}/5 · TO: {frame.awayTimeouts}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 bg-background p-4 md:grid-cols-2">
          {renderRoster(`${homeTeam.name} · HOME`, "home", homeRoster, frame.stats.home, frame.selected, frame.homeTimeouts)}
          {renderRoster(`${awayTeam.name} · AWAY`, "away", awayRoster, frame.stats.away, frame.selected, frame.awayTimeouts)}
        </div>

        <div className="border-t border-border bg-card px-4 py-3">
          <div className="mb-2 flex min-w-0 items-center gap-2">
            <Avatar className="h-8 w-8 border border-border">
              <AvatarFallback className="bg-secondary font-heading text-xs font-bold text-foreground">
                {frame.selected?.jersey ?? "--"}
              </AvatarFallback>
            </Avatar>
            <p className="truncate font-heading text-sm font-bold">{frame.label}</p>
          </div>
          <div className="flex flex-nowrap gap-2 overflow-x-auto">
            {CONTROLS.map((c) => {
              const Icon = c.icon;
              const pressed = frame.control === c.key;
              const tone = c.tone === "primary"
                ? "border-primary bg-primary text-primary-foreground"
                : c.tone === "muted"
                  ? "border-border bg-card text-muted-foreground"
                  : "border-border bg-secondary text-secondary-foreground";
              return (
                <span
                  key={c.key}
                  className={`inline-flex h-10 min-w-[62px] flex-1 items-center justify-center gap-1 border px-2 text-[10px] font-heading font-bold transition-all duration-200 ${tone} ${
                    pressed ? "-translate-y-0.5 ring-2 ring-foreground/40" : ""
                  }`}
                >
                  {Icon ? <Icon className="w-3 h-3" /> : null}
                  {c.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <p className="sr-only">
        Animated preview of the ScorekeeperAI live scoring screen, showing a sample basketball game being scored tap by tap.
      </p>
    </div>
  );
}