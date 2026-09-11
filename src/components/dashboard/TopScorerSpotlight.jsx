import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, TrendingUp } from "lucide-react";
import { usePlayerLeaders, buildLeaderboard } from "@/components/hooks/usePlayerLeaders";
import StatsFetchingIndicator from "@/components/stats/StatsFetchingIndicator";
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
  const chartData = topScorer?.chartData || [];

  if (!topScorer) {
    return (
      <Card>
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Crown className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Top Scorer · {label}</span>
        </div>
        <CardContent className="py-10">
          <p className="text-sm text-muted-foreground text-center">No data yet</p>
        </CardContent>
      </Card>
    );
  }

  const p = topScorer.player;
  const initials = `${(p.first_name || "?")[0] || ""}${(p.last_name || "")[0] || ""}`.toUpperCase();
  const teamName = teamMap[p.team_id]?.name || "—";

  return (
    <Card className="overflow-hidden">
      <div className="flex">
        <div className="w-32 shrink-0 self-stretch relative overflow-hidden border-r border-border bg-secondary">
          {p.photo_url ? (
            <img src={p.photo_url} alt={p.first_name} className="absolute inset-0 w-full h-full object-cover object-top" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-foreground/40 text-4xl font-heading font-bold">{initials}</div>
          )}
        </div>

        <div className="flex-1 min-w-0 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Top Scorer · {label}</span>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="min-w-0 flex-1">
              <p className="font-heading text-lg font-bold tracking-tight truncate">{p.first_name} {p.last_name}</p>
              <p className="text-sm text-muted-foreground truncate">{teamName}{p.jersey_number ? ` · #${p.jersey_number}` : ""}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-heading text-3xl font-bold tabular-nums leading-none text-primary">
                {topScorer.ppg.toFixed(1)}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mt-1">PPG</p>
            </div>
          </div>

          <div className="flex gap-2 mb-3">
            <div className="flex-1 border border-border bg-card py-1.5 px-2 text-center">
              <span className="text-sm font-heading font-bold tabular-nums">{topScorer.stats.total_points || 0}</span>
              <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground ml-1">Pts</span>
            </div>
            <div className="flex-1 border border-border bg-card py-1.5 px-2 text-center">
              <span className="text-sm font-heading font-bold tabular-nums">{topScorer.gp}</span>
              <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground ml-1">GP</span>
            </div>
            <div className="flex-1 border border-border bg-card py-1.5 px-2 text-center">
              <span className="text-sm font-heading font-bold tabular-nums">{topScorer.stats.total_rebounds || 0}</span>
              <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground ml-1">Reb</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Points Per Game</span>
          </div>
          {chartData.length > 0 ? (
            <div className="h-44 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 18, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id={`ppgFill-${label}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="game" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 0, color: "hsl(var(--foreground))" }}
                    labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  />
                  <Area type="monotone" dataKey="points" stroke="hsl(var(--primary))" strokeWidth={2} fill={`url(#ppgFill-${label})`}>
                    <LabelList dataKey="points" position="top" fill="hsl(var(--foreground))" fontSize={11} fontWeight={700} />
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No per-game data yet</p>
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

  const { games, playerStats, isLoading, isFetching } = usePlayerLeaders(organizationId, teams);

  const basketballDivisions = React.useMemo(() => [...new Set(
    teams.filter((t) => (t.sport || "").toLowerCase() === "basketball").map((t) => t.division).filter(Boolean)
  )], [teams]);
  const openDivision = basketballDivisions.find((d) => d.toLowerCase().includes("open")) || "Open Division";
  const veteranDivision = basketballDivisions.find((d) => d.toLowerCase().includes("veteran")) || "Veterans Division";

  const buildTop = React.useCallback((division) => {
    const ctx = { games, playerStats, teams, players, sport: "basketball", division, limit: 1 };
    const ptsRow = buildLeaderboard({ ...ctx, statType: "points" })[0];
    if (!ptsRow) return null;
    const player = playerMap[ptsRow.id];
    if (!player) return null;
    const rebRow = buildLeaderboard({ ...ctx, statType: "rebounds", limit: 50 }).find((r) => r.id === ptsRow.id);

    const teamsById = new Map(teams.map((t) => [t.id, t]));
    const teamGames = games
      .filter((g) => {
        if (g.status !== "completed") return false;
        if ((g.sport || "").toLowerCase() !== "basketball") return false;
        if (g.home_team_id !== player.team_id && g.away_team_id !== player.team_id) return false;
        const homeDiv = teamsById.get(g.home_team_id)?.division || "No Division";
        const awayDiv = teamsById.get(g.away_team_id)?.division || "No Division";
        return homeDiv === division || awayDiv === division;
      })
      .sort((a, b) => new Date(a.game_date) - new Date(b.game_date));

    const ptsByGame = {};
    playerStats.forEach((s) => {
      if (s.player_id !== ptsRow.id) return;
      ptsByGame[s.game_id] = (ptsByGame[s.game_id] || 0) + Number(s.points || 0);
    });

    const chartData = teamGames.map((g, i) => ({ game: `G${i + 1}`, points: ptsByGame[g.id] || 0 }));

    return {
      player,
      ppg: ptsRow.avgNum,
      gp: ptsRow.gamesPlayed,
      chartData,
      stats: {
        total_points: ptsRow.total,
        total_rebounds: rebRow?.total || 0,
      },
    };
  }, [games, playerStats, teams, players, playerMap]);

  const openTop = React.useMemo(() => buildTop(openDivision), [buildTop, openDivision]);
  const veteranTop = React.useMemo(() => buildTop(veteranDivision), [buildTop, veteranDivision]);

  return (
    <StatsFetchingIndicator loading={isLoading} fetching={isFetching} label="Refreshing top scorers…">
      <div className="grid md:grid-cols-2 gap-6">
        <ScorerCard label="Open" topScorer={openTop} teamMap={teamMap} />
        <ScorerCard label="Veterans" topScorer={veteranTop} teamMap={teamMap} />
      </div>
    </StatsFetchingIndicator>
  );
}