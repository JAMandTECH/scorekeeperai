import React from "react";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { usePlayerLeaders, buildLeaderboard } from "@/components/hooks/usePlayerLeaders";
import StatsFetchingIndicator from "@/components/stats/StatsFetchingIndicator";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  Tooltip,
  LabelList,
} from "recharts";

function ScorerCard({ label, topScorer, teamMap }) {
  const chartData = topScorer?.chartData || [];

  if (!topScorer) {
    return (
      <Card>
        <div className="p-5">
          <p className="text-sm text-muted-foreground text-center py-8">No top scorer data for {label} yet.</p>
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
        {/* Free-floating avatar — sits directly on the card surface, no panel behind */}
        <div className="w-20 h-20 shrink-0 rounded-full overflow-hidden">
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

        {/* Neon-green line chart — right side, month axis */}
        <div className="flex-1 min-w-0 h-28">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 0, color: "hsl(var(--foreground))" }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                />
                <Line type="monotone" dataKey="points" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={false} isAnimationActive={false}>
                  <LabelList dataKey="points" position="top" fill="hsl(var(--foreground))" fontSize={11} fontWeight={700} offset={6} />
                </Line>
              </LineChart>
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

  const basketballDivisions = React.useMemo(() => [...new Set(
    teams.filter((t) => (t.sport || "").toLowerCase() === "basketball").map((t) => t.division).filter(Boolean)
  )], [teams]);
  const openDivision = basketballDivisions.find((d) => d.toLowerCase().includes("open")) || null;
  const veteranDivision = basketballDivisions.find((d) => d.toLowerCase().includes("veteran")) || null;

  const volleyballDivisions = React.useMemo(() => [...new Set(
    teams.filter((t) => (t.sport || "").toLowerCase() === "volleyball").map((t) => t.division).filter(Boolean)
  )], [teams]);
  const vOpenDivision = volleyballDivisions.find((d) => d.toLowerCase().includes("open")) || null;
  const vVeteranDivision = volleyballDivisions.find((d) => d.toLowerCase().includes("veteran")) || null;

  const buildTop = React.useCallback((division, sport = "basketball") => {
    const ctx = { games, playerStats, teams, players, sport, division, limit: 1 };
    const ptsRow = buildLeaderboard({ ...ctx, statType: "points" })[0];
    if (!ptsRow) return null;
    const player = playerMap[ptsRow.id];
    if (!player) return null;
    const secondaryStat = sport === "volleyball" ? "aces" : "rebounds";
    const secRow = buildLeaderboard({ ...ctx, statType: secondaryStat, limit: 50 }).find((r) => r.id === ptsRow.id);

    const teamsById = new Map(teams.map((t) => [t.id, t]));
    const teamGames = games
      .filter((g) => {
        if (g.status !== "completed") return false;
        if ((g.sport || "").toLowerCase() !== sport) return false;
        if (g.home_team_id !== player.team_id && g.away_team_id !== player.team_id) return false;
        const homeDiv = teamsById.get(g.home_team_id)?.division || "No Division";
        const awayDiv = teamsById.get(g.away_team_id)?.division || "No Division";
        return homeDiv === division || awayDiv === division;
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
      ppg: ptsRow.avgNum,
      gp: ptsRow.gamesPlayed,
      chartData,
      sport,
      stats: {
        total_points: ptsRow.total,
        total_rebounds: secRow?.total || 0,
        secondaryLabel: sport === "volleyball" ? "ACES" : "REB",
      },
    };
  }, [games, playerStats, teams, players, playerMap]);

  const openTop = React.useMemo(() => openDivision ? buildTop(openDivision, "basketball") : null, [buildTop, openDivision]);
  const veteranTop = React.useMemo(() => veteranDivision ? buildTop(veteranDivision, "basketball") : null, [buildTop, veteranDivision]);
  const vOpenTop = React.useMemo(() => vOpenDivision ? buildTop(vOpenDivision, "volleyball") : null, [buildTop, vOpenDivision]);
  const vVeteranTop = React.useMemo(() => vVeteranDivision ? buildTop(vVeteranDivision, "volleyball") : null, [buildTop, vVeteranDivision]);

  const hasBasketball = openTop || veteranTop;
  const hasVolleyball = vOpenTop || vVeteranTop;

  return (
    <StatsFetchingIndicator loading={isLoading} fetching={isFetching} label="Refreshing top scorers…">
      <div className="space-y-6">
        {hasBasketball && (
          <div className="grid md:grid-cols-2 gap-6">
            {openTop && <ScorerCard label="Open" topScorer={openTop} teamMap={teamMap} />}
            {veteranTop && <ScorerCard label="Veterans" topScorer={veteranTop} teamMap={teamMap} />}
          </div>
        )}
        {hasVolleyball && (
          <div className="grid md:grid-cols-2 gap-6">
            {vOpenTop && <ScorerCard label="Volleyball · Open" topScorer={vOpenTop} teamMap={teamMap} />}
            {vVeteranTop && <ScorerCard label="Volleyball · Veterans" topScorer={vVeteranTop} teamMap={teamMap} />}
          </div>
        )}
      </div>
    </StatsFetchingIndicator>
  );
}