import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, TrendingUp } from "lucide-react";
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
      <Card className="overflow-hidden border border-[#1c2c4a] bg-[#0d1830] shadow-futuristic">
        <div className="px-5 py-4 bg-gradient-to-r from-[#13233f] to-[#0d1830] flex items-center gap-2">
          <Crown className="w-4 h-4 text-yellow-300" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-300">Top Scorer · {label}</span>
        </div>
        <CardContent className="py-10">
          <p className="text-sm text-slate-500 font-medium text-center">No data yet</p>
        </CardContent>
      </Card>
    );
  }

  const p = topScorer.player;
  const initials = `${(p.first_name || "?")[0] || ""}${(p.last_name || "")[0] || ""}`.toUpperCase();
  const teamName = teamMap[p.team_id]?.name || "—";

  return (
    <Card className="relative overflow-hidden border border-[#1c2c4a] bg-[#0d1830] shadow-futuristic">
      {/* Large floating background image, overlapping under the stats */}
      <div className="absolute inset-0 flex items-start justify-center pointer-events-none">
        {p.photo_url ? (
          <img src={p.photo_url} alt={p.first_name} className="w-full h-full object-cover object-top opacity-25 drop-shadow-2xl" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/10 text-9xl font-black">{initials}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1830] via-[#0d1830]/70 to-transparent" />
      </div>

      <div className="relative z-10 px-5 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <Crown className="w-4 h-4 text-yellow-300" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-300">Top Scorer · {label}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xl font-black text-white truncate drop-shadow-lg">{p.first_name} {p.last_name}</p>
            <p className="text-sm text-slate-300 truncate drop-shadow">{teamName}{p.jersey_number ? ` · #${p.jersey_number}` : ""}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-4xl font-black bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent leading-none drop-shadow-lg">
              {topScorer.ppg.toFixed(1)}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300 mt-1">PPG</p>
          </div>
        </div>
      </div>

      <CardContent className="relative z-10 pt-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl bg-[#16243f]/80 backdrop-blur-sm p-3 text-center">
            <p className="text-lg font-black text-white">{topScorer.stats.total_points || 0}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">Total Pts</p>
          </div>
          <div className="rounded-xl bg-[#16243f]/80 backdrop-blur-sm p-3 text-center">
            <p className="text-lg font-black text-white">{topScorer.gp}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">Games</p>
          </div>
          <div className="rounded-xl bg-[#16243f]/80 backdrop-blur-sm p-3 text-center">
            <p className="text-lg font-black text-white">{topScorer.stats.total_rebounds || 0}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">Rebounds</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Points Per Game</span>
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
      </CardContent>
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

  // Season stats hold the real per-game numbers (Player records are zeroed)
  const { data: seasonStats = [] } = useQuery({
    queryKey: ["top-scorer-season-stats", organizationId],
    queryFn: () => base44.entities.PlayerSeasonStats.filter({ organization_id: organizationId, sport: "basketball" }),
    enabled: !!organizationId,
    refetchInterval: 20000,
  });

  const isVeteran = React.useCallback((s) => {
    const div = teamMap[s.team_id]?.division || teamMap[playerMap[s.player_id]?.team_id]?.division || "";
    return div.toLowerCase().includes("veteran");
  }, [teamMap, playerMap]);

  const pickTop = React.useCallback((stats) => {
    let best = null;
    stats.forEach((s) => {
      const gp = s.games_played || 0;
      if (gp <= 0) return;
      const ppg = (s.total_points || 0) / gp;
      if (ppg > 0 && (!best || ppg > best.ppg)) {
        best = { stats: s, ppg, gp };
      }
    });
    if (!best) return null;
    const player = playerMap[best.stats.player_id];
    if (!player) return null;
    return { player, stats: best.stats, ppg: best.ppg, gp: best.gp };
  }, [playerMap]);

  const openTop = React.useMemo(() => pickTop(seasonStats.filter((s) => !isVeteran(s))), [seasonStats, isVeteran, pickTop]);
  const veteranTop = React.useMemo(() => pickTop(seasonStats.filter((s) => isVeteran(s))), [seasonStats, isVeteran, pickTop]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <ScorerCard label="Open" topScorer={openTop} teamMap={teamMap} />
      <ScorerCard label="Veterans" topScorer={veteranTop} teamMap={teamMap} />
    </div>
  );
}