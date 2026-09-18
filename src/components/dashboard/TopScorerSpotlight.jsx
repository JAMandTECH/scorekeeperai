import React from "react";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { usePlayerLeaders, buildLeaderboard } from "@/components/hooks/usePlayerLeaders";
import StatsFetchingIndicator from "@/components/stats/StatsFetchingIndicator";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

function ScorerCard({ topScorer, teamMap }) {
  const chartData = topScorer?.chartData || [];

  if (!topScorer) {
    return (
      <Card>
        <div className="p-5">
          <p className="text-sm text-muted-foreground text-center py-8">No top scorer data yet.</p>
        </div>
      </Card>
    );
  }

  const p = topScorer.player;
  const initials = `${(p.first_name || "?")[0] || ""}${(p.last_name || "")[0] || ""}`.toUpperCase();
  const teamName = teamMap[p.team_id]?.name || "—";
  const fullName = `${p.first_name} ${p.last_name}`;
  const totalPoints = topScorer.stats.total_points || 0;

  return (
    <Card className="overflow-hidden">
      <div className="p-5 flex items-center gap-5">
        {/* Avatar with thin subtle ring */}
        <div className="w-20 h-20 shrink-0 rounded-full overflow-hidden ring-1 ring-border">
          {p.photo_url ? (
            <img src={p.photo_url} alt={p.first_name} className="w-full h-full object-cover object-top" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary text-foreground text-lg font-heading font-bold">{initials}</div>
          )}
        </div>

        {/* Name + subtitle */}
        <div className="min-w-0 shrink-0">
          <p className="font-heading text-xl font-bold tracking-tight truncate">{fullName}</p>
          <p className="text-sm text-muted-foreground mt-1 truncate">Top Scorer: {fullName} - {totalPoints} Points</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{teamName}{p.jersey_number ? ` · #${p.jersey_number}` : ""}</p>
        </div>

        {/* Neon-emerald area chart with gradient fill + Y-axis labels */}
        <div className="flex-1 min-w-0 h-28">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="ptsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 0, color: "hsl(var(--foreground))" }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                />
                <Area type="monotone" dataKey="points" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#ptsGrad)" dot={false} activeDot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No per-game data</div>
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

  const buildTop = React.useCallback((sport = "basketball") => {
    const ctx = { games, playerStats, teams, players, sport, division: null, limit: 1 };
    const ptsRow = buildLeaderboard({ ...ctx, statType: "points" })[0];
    if (!ptsRow) return null;
    const player = playerMap[ptsRow.id];
    if (!player) return null;

    const teamGames = games
      .filter((g) => {
        if (g.status !== "completed") return false;
        if ((g.sport || "").toLowerCase() !== sport) return false;
        return g.home_team_id === player.team_id || g.away_team_id === player.team_id;
      })
      .sort((a, b) => new Date(a.game_date) - new Date(b.game_date));

    const ptsByGame = {};
    playerStats.forEach((s) => {
      if (s.player_id !== ptsRow.id) return;
      let val;
      if (sport === "volleyball") {
        val = Number(s.aces || 0) + Number(s.attacks || 0) + Number(s.blocks || 0);
      } else {
        val = Number(s.points || 0);
      }
      ptsByGame[s.game_id] = (ptsByGame[s.game_id] || 0) + val;
    });

    const chartData = teamGames.map((g, i) => {
      const d = g.game_date ? new Date(g.game_date) : null;
      return { month: d ? format(d, "MMM") : `G${i + 1}`, points: ptsByGame[g.id] || 0 };
    });

    return {
      player,
      chartData,
      sport,
      stats: { total_points: ptsRow.total },
    };
  }, [games, playerStats, teams, players, playerMap]);

  const topScorer = React.useMemo(() => buildTop("basketball") || buildTop("volleyball"), [buildTop]);

  return (
    <StatsFetchingIndicator loading={isLoading} fetching={isFetching} label="Refreshing top scorers…">
      <ScorerCard topScorer={topScorer} teamMap={teamMap} />
    </StatsFetchingIndicator>
  );
}