import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, TrendingUp } from "lucide-react";
import { usePlayerLeaders, buildLeaderboard } from "@/components/hooks/usePlayerLeaders";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
} from "recharts";

function ScorerCard({ label, topScorer, teamMap }) {
  const playerId = topScorer?.player?.id;

  // Per-game points for the chart
  const { data: rawStats = [] } = useQuery({
    queryKey: ["top-scorer-game-stats", playerId],
    queryFn: () => base44.entities.PlayerGameStats.filter({ player_id: playerId }),
    enabled: !!playerId,
    refetchInterval: 20000,
  });

  const chartData = React.useMemo(() => {
    if (!rawStats.length) return [];
    const byGame = {};
    rawStats.forEach((s) => {
      byGame[s.game_id] = (byGame[s.game_id] || 0) + (s.points || 0);
    });
    return Object.values(byGame).map((pts, i) => ({ game: `G${i + 1}`, points: pts }));
  }, [rawStats]);

  if (!topScorer) {
    return (
      <Card className="overflow-hidden border border-gray-200 bg-white dark:border-[#1c2c4a] dark:bg-[#0d1830] shadow-futuristic">
        <div className="px-5 py-4 bg-gradient-to-r from-gray-100 to-white dark:from-[#13233f] dark:to-[#0d1830] flex items-center gap-2">
          <Crown className="w-4 h-4 text-yellow-500 dark:text-yellow-300" />
          <span className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-slate-300">Top Scorer · {label}</span>
        </div>
        <CardContent className="py-10">
          <p className="text-sm text-gray-400 dark:text-slate-500 font-medium text-center">No data yet</p>
        </CardContent>
      </Card>
    );
  }

  const p = topScorer.player;
  const initials = `${(p.first_name || "?")[0] || ""}${(p.last_name || "")[0] || ""}`.toUpperCase();
  const teamName = teamMap[p.team_id]?.name || "—";

  return (
    <Card className="overflow-hidden border border-gray-200 bg-white dark:border-[#1c2c4a] dark:bg-[#0d1830] shadow-futuristic">
      <div className="flex">
        {/* Full-height image column on the left with stylized background */}
        <div className="w-40 shrink-0 self-stretch relative overflow-hidden">
          {/* Decorative background layers */}
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-800" />
          <div
            className="absolute inset-0 opacity-30 mix-blend-overlay"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=600&q=70')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
          {/* Glow circle behind the player */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-sky-400/40 blur-3xl" />

          {/* Player image / initials on top */}
          {p.photo_url ? (
            <img src={p.photo_url} alt={p.first_name} className="absolute inset-0 w-full h-full object-cover object-top drop-shadow-2xl" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/90 text-5xl font-black drop-shadow-lg">{initials}</div>
          )}
        </div>

        {/* Right column: header, narrow stats, graph */}
        <div className="flex-1 min-w-0 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-yellow-500 dark:text-yellow-300" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-slate-300">Top Scorer · {label}</span>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="min-w-0 flex-1">
              <p className="text-xl font-black text-gray-900 dark:text-white truncate">{p.first_name} {p.last_name}</p>
              <p className="text-sm text-gray-500 dark:text-slate-400 truncate">{teamName}{p.jersey_number ? ` · #${p.jersey_number}` : ""}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-4xl font-black bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent leading-none">
                {topScorer.ppg.toFixed(1)}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mt-1">PPG</p>
            </div>
          </div>

          {/* Narrow stats row above the graph */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1 rounded-lg bg-gray-100 dark:bg-[#16243f] py-1.5 px-2 text-center">
              <span className="text-sm font-black text-gray-900 dark:text-white">{topScorer.stats.total_points || 0}</span>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 ml-1">Pts</span>
            </div>
            <div className="flex-1 rounded-lg bg-gray-100 dark:bg-[#16243f] py-1.5 px-2 text-center">
              <span className="text-sm font-black text-gray-900 dark:text-white">{topScorer.gp}</span>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 ml-1">GP</span>
            </div>
            <div className="flex-1 rounded-lg bg-gray-100 dark:bg-[#16243f] py-1.5 px-2 text-center">
              <span className="text-sm font-black text-gray-900 dark:text-white">{topScorer.stats.total_rebounds || 0}</span>
              <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 ml-1">Reb</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Points Per Game</span>
          </div>
          {chartData.length > 0 ? (
            <div className="h-44 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 18, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="ppgFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1c2c4a" vertical={false} />
                  <XAxis dataKey="game" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip
                    contentStyle={{ background: "#0d1830", border: "1px solid #1c2c4a", borderRadius: 12, color: "#fff" }}
                    labelStyle={{ color: "#94a3b8" }}
                  />
                  <Area type="monotone" dataKey="points" stroke="#38bdf8" strokeWidth={2.5} fill="url(#ppgFill)">
                    <LabelList dataKey="points" position="top" fill="#e2e8f0" fontSize={11} fontWeight={700} />
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-500 font-medium text-center py-8">No per-game data yet</p>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function TopScorerSpotlight({ organizationId, players = [], teams = [] }) {
  const teamMap = React.useMemo(() => {
    const m = {};
    teams.forEach((t) => { m[t.id] = t; });
    return m;
  }, [teams]);

  const playerMap = React.useMemo(() => {
    const m = {};
    players.forEach((p) => { m[p.id] = p; });
    return m;
  }, [players]);

  // Same data source & logic as Category Leaders / Home / Statistics so the #1 scorer matches.
  const { games, playerStats } = usePlayerLeaders(organizationId);

  // Resolve actual basketball division names used by this org.
  const basketballDivisions = React.useMemo(() => [...new Set(
    teams.filter((t) => (t.sport || "").toLowerCase() === "basketball").map((t) => t.division).filter(Boolean)
  )], [teams]);
  const openDivision = basketballDivisions.find((d) => d.toLowerCase().includes("open")) || "Open Division";
  const veteranDivision = basketballDivisions.find((d) => d.toLowerCase().includes("veteran")) || "Veterans Division";

  // Build a "topScorer" shape (player + ppg + gp + stats.total_points/total_rebounds) from leaderboards.
  const buildTop = React.useCallback((division) => {
    const ctx = { games, playerStats, teams, players, sport: "basketball", division, limit: 1 };
    const ptsRow = buildLeaderboard({ ...ctx, statType: "points" })[0];
    if (!ptsRow) return null;
    const player = playerMap[ptsRow.id];
    if (!player) return null;
    const rebRow = buildLeaderboard({ ...ctx, statType: "rebounds", limit: 50 }).find((r) => r.id === ptsRow.id);
    return {
      player,
      ppg: ptsRow.avgNum,
      gp: ptsRow.gamesPlayed,
      stats: {
        total_points: ptsRow.total,
        total_rebounds: rebRow?.total || 0,
      },
    };
  }, [games, playerStats, teams, players, playerMap]);

  const openTop = React.useMemo(() => buildTop(openDivision), [buildTop, openDivision]);
  const veteranTop = React.useMemo(() => buildTop(veteranDivision), [buildTop, veteranDivision]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <ScorerCard label="Open" topScorer={openTop} teamMap={teamMap} />
      <ScorerCard label="Veterans" topScorer={veteranTop} teamMap={teamMap} />
    </div>
  );
}