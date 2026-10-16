import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createPageUrl } from "@/utils";
import { DEMO_TEAMS, DEMO_PLAYERS } from "@/lib/trialDemo";
import {
  PlayCircle, ChevronRight, CheckCircle, Clock, TrendingUp, Target, Zap,
  Shield, AlertTriangle, Flag, RotateCcw, Trophy, Lock, Sparkles, Sun, Moon,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

/**
 * Demo Live Scoring — fully interactive simulation with NO backend calls.
 * All state is local and resets on navigation/refresh. Supports both sports
 * via ?sport=basketball or ?sport=volleyball.
 */
export default function DemoLiveScoring() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const sport = urlParams.get("sport") === "volleyball" ? "volleyball" : "basketball";

  const homeTeam = DEMO_TEAMS[sport].home;
  const awayTeam = DEMO_TEAMS[sport].away;
  const homePlayers = DEMO_PLAYERS[sport].home;
  const awayPlayers = DEMO_PLAYERS[sport].away;

  const isBB = sport === "basketball";
  const maxPeriods = isBB ? 4 : 5;
  const periodLabel = (p) => (isBB ? (p <= 4 ? `Q${p}` : `OT${p - 4}`) : `Set ${p}`);

  // ── Local-only state ──────────────────────────────────────────────
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [currentPeriod, setCurrentPeriod] = useState(1);
  const [periodScores, setPeriodScores] = useState([]);
  const [playerStats, setPlayerStats] = useState({});
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [actionHistory, setActionHistory] = useState([]);
  const [homeTimeouts, setHomeTimeouts] = useState(isBB ? 1 : 2);
  const [awayTimeouts, setAwayTimeouts] = useState(isBB ? 1 : 2);
  const [homeTeamFouls, setHomeTeamFouls] = useState(0);
  const [awayTeamFouls, setAwayTeamFouls] = useState(0);
  const [showEndPeriod, setShowEndPeriod] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [darkMode, setDarkMode] = useState(
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );

  // ── Stat helpers (local only) ─────────────────────────────────────
  const statKey = (pid, p) => `${pid}_${p}`;

  const getTotalStat = (pid, statType) => {
    let t = 0;
    for (let p = 1; p <= currentPeriod; p++) t += playerStats[statKey(pid, p)]?.[statType] || 0;
    return t;
  };

  const applyStat = (pid, teamId, statType, value, period = currentPeriod) => {
    const k = statKey(pid, period);
    setPlayerStats((prev) => {
      const ex = prev[k] || {};
      return { ...prev, [k]: { ...ex, [statType]: Math.max(0, (ex[statType] || 0) + value) } };
    });
  };

  // ── Actions ────────────────────────────────────────────────────────
  const addPoints = (pid, teamId, pts) => {
    if (gameEnded) return;
    const isHome = teamId === homeTeam.id;
    setHomeScore((s) => (isHome ? s + pts : s));
    setAwayScore((s) => (!isHome ? s + pts : s));
    applyStat(pid, teamId, "points", pts);
    if (pts === 3) { applyStat(pid, teamId, "three_pointers", 1); applyStat(pid, teamId, "field_goals_made", 1); applyStat(pid, teamId, "field_goals_attempted", 1); }
    else if (pts === 2) { applyStat(pid, teamId, "field_goals_made", 1); applyStat(pid, teamId, "field_goals_attempted", 1); }
    else if (pts === 1) { applyStat(pid, teamId, "free_throws_made", 1); applyStat(pid, teamId, "free_throws_attempted", 1); }
    setActionHistory((h) => [...h, { type: "score", pid, teamId, pts, period: currentPeriod, prevHome: homeScore, prevAway: awayScore }]);
  };

  const addStat = (pid, teamId, statType, value = 1) => {
    if (gameEnded) return;
    applyStat(pid, teamId, statType, value);
    setActionHistory((h) => [...h, { type: statType, pid, teamId, value, period: currentPeriod }]);
  };

  // Volleyball: scoring actions that add both a stat and a point
  const scoreWithStat = (pid, teamId, statType) => {
    if (gameEnded) return;
    const isHome = teamId === homeTeam.id;
    setHomeScore((s) => (isHome ? s + 1 : s));
    setAwayScore((s) => (!isHome ? s + 1 : s));
    applyStat(pid, teamId, statType, 1);
    setActionHistory((h) => [...h, { type: "score_with_stat", pid, teamId, statType, period: currentPeriod, prevHome: homeScore, prevAway: awayScore }]);
  };

  const scoreOnly = (teamId) => {
    if (gameEnded) return;
    const isHome = teamId === homeTeam.id;
    setHomeScore((s) => (isHome ? s + 1 : s));
    setAwayScore((s) => (!isHome ? s + 1 : s));
    setActionHistory((h) => [...h, { type: "score_only", teamId, period: currentPeriod, prevHome: homeScore, prevAway: awayScore }]);
  };

  const handleFoul = (pid, teamId) => {
    if (gameEnded) return;
    const isHome = teamId === homeTeam.id;
    if (isHome) setHomeTeamFouls((f) => f + 1); else setAwayTeamFouls((f) => f + 1);
    applyStat(pid, teamId, "fouls", 1);
    setActionHistory((h) => [...h, { type: "foul", pid, teamId, period: currentPeriod, isHome }]);
  };

  const handleTimeout = (team) => {
    if (gameEnded) return;
    if (team === "home" && homeTimeouts > 0) { setHomeTimeouts((t) => t - 1); setActionHistory((h) => [...h, { type: "timeout", team }]); }
    else if (team === "away" && awayTimeouts > 0) { setAwayTimeouts((t) => t - 1); setActionHistory((h) => [...h, { type: "timeout", team }]); }
  };

  const handleUndo = () => {
    if (actionHistory.length === 0 || gameEnded) return;
    const last = actionHistory[actionHistory.length - 1];
    setActionHistory((h) => h.slice(0, -1));

    if (last.type === "score" || last.type === "score_with_stat") {
      const isHome = last.teamId === homeTeam.id;
      const pts = last.type === "score" ? last.pts : 1;
      setHomeScore(last.prevHome);
      setAwayScore(last.prevAway);
      if (last.type === "score") applyStat(last.pid, last.teamId, "points", -pts, last.period);
      else applyStat(last.pid, last.teamId, last.statType, -1, last.period);
    } else if (last.type === "score_only") {
      setHomeScore(last.prevHome);
      setAwayScore(last.prevAway);
    } else if (last.type === "foul") {
      if (last.isHome) setHomeTeamFouls((f) => Math.max(0, f - 1)); else setAwayTeamFouls((f) => Math.max(0, f - 1));
      applyStat(last.pid, last.teamId, "fouls", -1, last.period);
    } else if (last.type === "timeout") {
      if (last.team === "home") setHomeTimeouts((t) => t + 1); else setAwayTimeouts((t) => t + 1);
    } else if (last.statType) {
      applyStat(last.pid, last.teamId, last.type, -last.value, last.period);
    }
  };

  const endPeriod = () => {
    const prevHome = periodScores.reduce((s, q) => s + q.home, 0);
    const prevAway = periodScores.reduce((s, q) => s + q.away, 0);
    const ps = { quarter: currentPeriod, home: homeScore - prevHome, away: awayScore - prevAway };
    const newPS = (() => { const i = periodScores.findIndex((q) => q.quarter === currentPeriod); const u = [...periodScores]; if (i >= 0) u[i] = ps; else u.push(ps); return u; })();
    setPeriodScores(newPS);

    // Check if game should end
    if (isBB && currentPeriod >= 4 && homeScore !== awayScore) { setGameEnded(true); setShowEndPeriod(false); return; }
    if (!isBB && currentPeriod >= 3) {
      const homeSets = newPS.filter((s) => s.home > s.away).length;
      const awaySets = newPS.filter((s) => s.away > s.home).length;
      if (homeSets >= 3 || awaySets >= 3) { setGameEnded(true); setShowEndPeriod(false); return; }
    }
    if (!isBB && currentPeriod >= 5) { setGameEnded(true); setShowEndPeriod(false); return; }

    setCurrentPeriod((p) => p + 1);
    setHomeTeamFouls(0);
    setAwayTeamFouls(0);
    setActionHistory([]);
    setShowEndPeriod(false);
  };

  const endGame = () => {
    setGameEnded(true);
  };

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) document.documentElement.classList.add("dark"); else document.documentElement.classList.remove("dark");
    localStorage.setItem("darkMode", String(next));
  };

  const resetDemo = () => {
    setHomeScore(0); setAwayScore(0); setCurrentPeriod(1); setPeriodScores([]);
    setPlayerStats({}); setSelectedPlayer(null); setSelectedTeam(null);
    setActionHistory([]); setHomeTimeouts(isBB ? 1 : 2); setAwayTimeouts(isBB ? 1 : 2);
    setHomeTeamFouls(0); setAwayTeamFouls(0); setGameEnded(false);
  };

  // ── Render helpers ─────────────────────────────────────────────────
  const PlayerRow = ({ player, team }) => {
    const isSelected = selectedPlayer?.id === player.id;
    if (isBB) {
      const pts = getTotalStat(player.id, "points");
      const reb = getTotalStat(player.id, "rebounds");
      const ast = getTotalStat(player.id, "assists");
      const stl = getTotalStat(player.id, "steals");
      const blk = getTotalStat(player.id, "blocks");
      const fls = getTotalStat(player.id, "fouls");
      return (
        <button
          onClick={() => { setSelectedPlayer(player); setSelectedTeam(team); }}
          className={`w-full text-left border rounded-sm p-3 mb-2 transition-colors ${
            isSelected ? "bg-primary border-primary text-primary-foreground"
            : "bg-card border-border hover:border-foreground/30"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Avatar className="w-10 h-10 border border-border">
                <AvatarFallback className={`text-sm font-heading font-bold ${isSelected ? "bg-background text-foreground" : "bg-secondary text-foreground"}`}>
                  {player.jersey_number}
                </AvatarFallback>
              </Avatar>
              <p className={`text-sm font-heading font-bold truncate ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>
                {player.first_name} {player.last_name}
              </p>
            </div>
            <div className={`flex gap-3 ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>
              {[["PTS", pts], ["REB", reb], ["AST", ast], ["STL", stl], ["BLK", blk], ["FL", fls]].map(([l, v]) => (
                <div key={l} className="text-center">
                  <div className="text-xl font-heading font-bold tabular-nums">{v}</div>
                  <div className={`text-[9px] font-medium ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </button>
      );
    }
    const atk = getTotalStat(player.id, "attacks");
    const blk = getTotalStat(player.id, "blocks");
    const ace = getTotalStat(player.id, "aces");
    const ast = getTotalStat(player.id, "assists");
    const dig = getTotalStat(player.id, "rebounds");
    const err = getTotalStat(player.id, "rally_errors");
    const pts = atk + blk + ace;
    return (
      <button
        onClick={() => { setSelectedPlayer(player); setSelectedTeam(team); }}
        className={`w-full text-left border rounded-sm p-3 mb-2 transition-colors ${
          isSelected ? "bg-primary border-primary text-primary-foreground"
          : "bg-card border-border hover:border-foreground/30"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Avatar className="w-10 h-10 border border-border">
              <AvatarFallback className={`text-sm font-heading font-bold ${isSelected ? "bg-background text-foreground" : "bg-secondary text-foreground"}`}>
                {player.jersey_number}
              </AvatarFallback>
            </Avatar>
            <p className={`text-sm font-heading font-bold truncate ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>
              {player.first_name} {player.last_name}
            </p>
          </div>
          <div className={`flex gap-3 ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>
            {[["PTS", pts], ["ATK", atk], ["BLK", blk], ["ACE", ace], ["DIG", dig], ["ERR", err]].map(([l, v]) => (
              <div key={l} className="text-center">
                <div className="text-xl font-heading font-bold tabular-nums">{v}</div>
                <div className={`text-[9px] font-medium ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Top Nav ── */}
      <div className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-heading font-bold flex items-center gap-2">
                Demo Live Scoring
                <Badge className="bg-amber-500 text-black px-2 py-0.5 text-[10px] font-heading font-bold uppercase tracking-wide">
                  <Sparkles className="w-3 h-3 mr-1" /> Trial Demo
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground font-medium">
                {isBB ? "Basketball" : "Volleyball"} simulation — changes are not saved
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={resetDemo} variant="outline" size="sm" className="font-medium">
              <RotateCcw className="w-4 h-4 mr-1" /> Reset Demo
            </Button>
            <Button onClick={toggleDark} variant="outline" size="sm" className="font-medium p-2">
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button onClick={() => navigate(createPageUrl("SubscriptionManagement"))} size="sm" className="font-medium">
              <Lock className="w-4 h-4 mr-1" /> Subscribe
            </Button>
            <Button onClick={() => navigate(createPageUrl("Games"))} variant="outline" size="sm" className="font-medium">
              <ChevronRight className="w-4 h-4 mr-1 rotate-180" /> Back to Games
            </Button>
          </div>
        </div>
      </div>

      {/* ── Demo Banner ── */}
      <div className="bg-amber-500/10 border-b border-amber-500/30">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-foreground font-medium">
            You're in <span className="font-heading font-bold">Demo Mode</span>. All scoring actions are simulated and won't affect real league data.
            <button onClick={() => navigate(createPageUrl("SubscriptionManagement"))} className="ml-2 underline font-heading font-bold hover:text-primary">
              Subscribe to unlock live scoring →
            </button>
          </p>
        </div>
      </div>

      {/* ── Scoreboard ── */}
      <div className="sticky z-40 bg-card border-b-2 border-border" style={{ top: "64px" }}>
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-center gap-3 mb-4 flex-wrap">
            <Badge className={`px-6 py-2 text-base font-heading font-bold ${gameEnded ? "bg-foreground text-background" : "bg-destructive text-destructive-foreground"}`}>
              {gameEnded ? (<><CheckCircle className="w-5 h-5 mr-2" /> FINAL</>) : (<><PlayCircle className="w-5 h-5 mr-2 animate-pulse" /> LIVE - {periodLabel(currentPeriod)}</>)}
            </Badge>
            <Badge variant="outline" className="border-border text-muted-foreground px-4 py-2 text-sm font-heading font-bold uppercase">
              {isBB ? "BASKETBALL" : "VOLLEYBALL"}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-4 items-center mb-4">
            {/* Home */}
            <div className="text-center">
              <div className="text-muted-foreground text-sm font-heading font-bold mb-2 uppercase tracking-wide">HOME</div>
              <div className="flex items-center justify-center gap-3 mb-2">
                <Avatar className="w-16 h-16 border border-border">
                  <AvatarFallback className="bg-secondary text-foreground font-heading font-bold text-lg">
                    {homeTeam.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-foreground text-2xl font-heading font-bold text-left">{homeTeam.name}</div>
              </div>
              <div className="text-foreground text-5xl font-heading font-bold tabular-nums mb-2">{homeScore}</div>
              {isBB && (
                <div className="flex justify-center gap-4 text-xs font-medium items-center">
                  <span className="text-foreground">FOULS: {homeTeamFouls}/5</span>
                  <span className="text-muted-foreground">TO: {homeTimeouts}</span>
                </div>
              )}
              {!isBB && (
                <div className="text-xs text-muted-foreground font-medium">
                  Sets Won: {periodScores.filter((s) => s.home > s.away).length}
                </div>
              )}
            </div>

            {/* Center */}
            <div className="text-center">
              <div className="text-foreground text-lg font-heading font-bold mb-1">{periodLabel(currentPeriod)}</div>
              <div className="text-sm text-muted-foreground font-medium mb-3">
                {(isBB ? [1, 2, 3, 4] : [1, 2, 3, 4, 5]).map((p, idx) => {
                  const ps = periodScores.find((q) => q.quarter === p);
                  return <span key={p}>{`${isBB ? "Q" : "S"}${p}:${ps ? `${ps.home}-${ps.away}` : "-"}`}{idx < (isBB ? 3 : 4) ? ", " : ""}</span>;
                })}
              </div>
              <div className="flex gap-2 justify-center flex-wrap">
                {!gameEnded && (
                  <Button onClick={() => setShowEndPeriod(true)} size="sm" className="font-medium text-xs px-4 py-2">
                    END {periodLabel(currentPeriod)} <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
                {!gameEnded && isBB && currentPeriod >= 4 && homeScore !== awayScore && (
                  <Button onClick={endGame} size="sm" className="font-medium text-xs px-4 py-2">
                    <CheckCircle className="w-4 h-4 mr-1" /> END GAME
                  </Button>
                )}
                {!gameEnded && !isBB && currentPeriod >= 3 && (
                  <Button onClick={endGame} size="sm" className="font-medium text-xs px-4 py-2">
                    <CheckCircle className="w-4 h-4 mr-1" /> END GAME
                  </Button>
                )}
                <Button onClick={() => navigate(createPageUrl("Games"))} variant="outline" size="sm" className="font-medium text-xs px-4 py-2">
                  CANCEL
                </Button>
              </div>
            </div>

            {/* Away */}
            <div className="text-center">
              <div className="text-muted-foreground text-sm font-heading font-bold mb-2 uppercase tracking-wide">AWAY</div>
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="text-foreground text-2xl font-heading font-bold text-right">{awayTeam.name}</div>
                <Avatar className="w-16 h-16 border border-border">
                  <AvatarFallback className="bg-secondary text-foreground font-heading font-bold text-lg">
                    {awayTeam.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="text-foreground text-5xl font-heading font-bold tabular-nums mb-2">{awayScore}</div>
              {isBB && (
                <div className="flex justify-center gap-4 text-xs font-medium items-center">
                  <span className="text-foreground">FOULS: {awayTeamFouls}/5</span>
                  <span className="text-muted-foreground">TO: {awayTimeouts}</span>
                </div>
              )}
              {!isBB && (
                <div className="text-xs text-muted-foreground font-medium">
                  Sets Won: {periodScores.filter((s) => s.away > s.home).length}
                </div>
              )}
            </div>
          </div>

          {gameEnded && (
            <Alert className="bg-primary/10 border border-primary/30 mb-4">
              <Trophy className="h-5 w-5 text-primary" />
              <AlertDescription className="text-foreground font-medium">
                {homeScore > awayScore ? `${homeTeam.name} wins!` : awayScore > homeScore ? `${awayTeam.name} wins!` : "Game ended in a tie!"}
                {" "} Final: {homeScore}-{awayScore}. This was a simulation — no data was saved.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* ── Control Panel ── */}
      {selectedPlayer && !gameEnded ? (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border">
          <div className="mx-4 my-2">
            <Card className="border border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-14 h-14 border border-border">
                      <AvatarFallback className="bg-secondary text-foreground font-heading font-bold text-lg">
                        {selectedPlayer.jersey_number}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-heading font-bold text-foreground">
                        {selectedPlayer.first_name} {selectedPlayer.last_name}
                      </h3>
                      <p className="text-sm text-muted-foreground font-medium">
                        {selectedTeam === "home" ? homeTeam.name : awayTeam.name} • {selectedPlayer.position}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" onClick={() => setSelectedPlayer(null)} className="text-muted-foreground hover:text-foreground">✕</Button>
                </div>

                <div className="flex flex-nowrap gap-2 overflow-x-auto whitespace-nowrap">
                  {isBB ? (
                    <>
                      <Button onClick={() => addPoints(selectedPlayer.id, selectedTeam === "home" ? homeTeam.id : awayTeam.id, 1)} className="flex-1 min-w-[80px] h-14 font-heading font-bold text-sm">+1 PT</Button>
                      <Button onClick={() => addPoints(selectedPlayer.id, selectedTeam === "home" ? homeTeam.id : awayTeam.id, 2)} className="flex-1 min-w-[80px] h-14 font-heading font-bold text-sm">+2 PTS</Button>
                      <Button onClick={() => addPoints(selectedPlayer.id, selectedTeam === "home" ? homeTeam.id : awayTeam.id, 3)} className="flex-1 min-w-[80px] h-14 font-heading font-bold text-sm">+3 PTS</Button>
                      <Button onClick={() => addStat(selectedPlayer.id, selectedTeam === "home" ? homeTeam.id : awayTeam.id, "rebounds")} variant="secondary" className="flex-1 min-w-[80px] h-14 font-medium text-xs"><TrendingUp className="w-4 h-4 mr-1" />REB</Button>
                      <Button onClick={() => addStat(selectedPlayer.id, selectedTeam === "home" ? homeTeam.id : awayTeam.id, "assists")} variant="secondary" className="flex-1 min-w-[80px] h-14 font-medium text-xs"><Target className="w-4 h-4 mr-1" />AST</Button>
                      <Button onClick={() => addStat(selectedPlayer.id, selectedTeam === "home" ? homeTeam.id : awayTeam.id, "steals")} variant="secondary" className="flex-1 min-w-[80px] h-14 font-medium text-xs"><Zap className="w-4 h-4 mr-1" />STL</Button>
                      <Button onClick={() => addStat(selectedPlayer.id, selectedTeam === "home" ? homeTeam.id : awayTeam.id, "blocks")} variant="secondary" className="flex-1 min-w-[80px] h-14 font-medium text-xs"><Shield className="w-4 h-4 mr-1" />BLK</Button>
                      <Button onClick={() => handleFoul(selectedPlayer.id, selectedTeam === "home" ? homeTeam.id : awayTeam.id)} variant="secondary" className="flex-1 min-w-[80px] h-14 font-medium text-xs"><AlertTriangle className="w-4 h-4 mr-1" />FOUL</Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={() => scoreWithStat(selectedPlayer.id, selectedTeam === "home" ? homeTeam.id : awayTeam.id, "attacks")} className="flex-1 min-w-[90px] h-14 font-heading font-bold text-xs"><Target className="w-4 h-4 mr-1" />ATTACK</Button>
                      <Button onClick={() => scoreWithStat(selectedPlayer.id, selectedTeam === "home" ? homeTeam.id : awayTeam.id, "blocks")} className="flex-1 min-w-[80px] h-14 font-heading font-bold text-xs"><Shield className="w-4 h-4 mr-1" />BLOCK</Button>
                      <Button onClick={() => scoreWithStat(selectedPlayer.id, selectedTeam === "home" ? homeTeam.id : awayTeam.id, "aces")} className="flex-1 min-w-[80px] h-14 font-heading font-bold text-xs"><Zap className="w-4 h-4 mr-1" />ACE</Button>
                      <Button onClick={() => addStat(selectedPlayer.id, selectedTeam === "home" ? homeTeam.id : awayTeam.id, "assists")} variant="secondary" className="flex-1 min-w-[80px] h-14 font-medium text-xs">ASSIST</Button>
                      <Button onClick={() => addStat(selectedPlayer.id, selectedTeam === "home" ? homeTeam.id : awayTeam.id, "rebounds")} variant="secondary" className="flex-1 min-w-[80px] h-14 font-medium text-xs">DIG</Button>
                      <Button onClick={() => addStat(selectedPlayer.id, selectedTeam === "home" ? homeTeam.id : awayTeam.id, "rally_errors")} variant="secondary" className="flex-1 min-w-[80px] h-14 font-medium text-xs">ERROR</Button>
                      <Button onClick={() => scoreOnly(selectedTeam === "home" ? homeTeam.id : awayTeam.id)} variant="secondary" className="flex-1 min-w-[80px] h-14 font-medium text-xs"><Trophy className="w-4 h-4 mr-1" />RALLY</Button>
                    </>
                  )}
                  <Button onClick={handleUndo} disabled={actionHistory.length === 0} variant="outline" className="flex-1 min-w-[80px] h-14 font-medium text-xs disabled:opacity-50">
                    <RotateCcw className="w-4 h-4 mr-1" />UNDO
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : !gameEnded ? (
        <div className="mx-4 mt-4 border border-border bg-card px-4 py-3 flex items-center gap-3">
          <p className="text-base font-heading font-bold text-foreground whitespace-nowrap">Select a Player</p>
          <span className="text-muted-foreground/40 select-none">·</span>
          <p className="text-sm text-muted-foreground font-medium truncate">Click on a player below to start tracking statistics (demo)</p>
        </div>
      ) : null}

      {/* ── Players ── */}
      <div className="max-w-7xl mx-auto p-4 pb-40">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex flex-col h-[700px] bg-card border border-border rounded-sm">
            <div className="flex-shrink-0 bg-muted border-b border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-heading font-bold text-foreground">{homeTeam.name} - HOME</h2>
                <Button onClick={() => handleTimeout("home")} disabled={homeTimeouts === 0} className="font-medium text-xs px-3 py-1.5 disabled:opacity-50 whitespace-nowrap">
                  <Clock className="w-3 h-3 mr-1" />TO ({homeTimeouts})
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {homePlayers.map((p) => <PlayerRow key={p.id} player={p} team="home" />)}
            </div>
          </div>
          <div className="flex flex-col h-[700px] bg-card border border-border rounded-sm">
            <div className="flex-shrink-0 bg-muted border-b border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-heading font-bold text-foreground">{awayTeam.name} - AWAY</h2>
                <Button onClick={() => handleTimeout("away")} disabled={awayTimeouts === 0} className="font-medium text-xs px-3 py-1.5 disabled:opacity-50 whitespace-nowrap">
                  <Clock className="w-3 h-3 mr-1" />TO ({awayTimeouts})
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {awayPlayers.map((p) => <PlayerRow key={p.id} player={p} team="away" />)}
            </div>
          </div>
        </div>
      </div>

      {/* ── End Period Dialog ── */}
      <Dialog open={showEndPeriod} onOpenChange={setShowEndPeriod}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading font-bold">End of {periodLabel(currentPeriod)}</DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium">
              {isBB && currentPeriod === 4 && homeScore === awayScore
                ? "Game is tied! Overtime will begin."
                : `Save ${periodLabel(currentPeriod)} data and proceed?`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted border border-border p-6">
              <div className="flex justify-between text-lg font-heading font-bold mb-3 text-foreground">
                <span>{homeTeam.name}</span>
                <span className="text-foreground text-3xl tabular-nums">{homeScore}</span>
              </div>
              <div className="flex justify-between text-lg font-heading font-bold text-foreground">
                <span>{awayTeam.name}</span>
                <span className="text-foreground text-3xl tabular-nums">{awayScore}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={endPeriod} className="flex-1 font-heading font-bold">
                {currentPeriod < maxPeriods ? `PROCEED TO ${periodLabel(currentPeriod + 1)}` : "END GAME"}
              </Button>
              <Button onClick={() => setShowEndPeriod(false)} variant="outline" className="flex-1 font-medium">CANCEL</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}