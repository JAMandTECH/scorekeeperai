import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, TrendingUp } from "lucide-react";
import { usePlayerLeaders, buildLeaderboard } from "@/components/hooks/usePlayerLeaders";
import StatsFetchingIndicator from "@/components/stats/StatsFetchingIndicator";
import {
  ResponsiveContainer,
  LineChart,
  Line,
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

  const peakIdx = chartData.reduce((mi, d, i, arr) => (d.points > arr[mi].points ? i : mi), 0);
  const lastIdx = chartData.length - 1;
  const renderDot = (props) => {
    const { cx, cy, index, key } = props;
    if (index !== peakIdx && index !== lastIdx) return null;
    return <circle key={key} cx={cx} cy={cy} r={3.5} fill="hsl(var(--primary))" stroke="hsl(var(--card))" strokeWidth={1.5} />;
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Crown className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Top Scorer · {label}</span>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-24 h-24 shrink-0 rounded-full overflow-hidden bg-secondary/60">
            {p.photo_url ? (
              <img src={p.photo_url} alt={p.first_name} className="w-full h-full object-cover object-top" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-foreground/40 text-xl font-heading font-bold">{initials}</div>
            )}
          </div>
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

        <div className="flex items-baseline gap-2 mb-4 text-sm text-muted-foreground tabular-nums">
          <span><span className="font-heading font-bold text-foreground">{topScorer.stats.total_points || 0}</span> PTS</span>
          <span className="text-border">·</span>
          <span><span className="font-heading font-bold text-foreground">{topScorer.gp}</span> GP</span>
          <span className="text-border">·</span>
          <span><span className="font-heading font-bold text-foreground">{topScorer.stats.total_rebounds || 0}</span> {topScorer.stats.secondaryLabel || "REB"}</span>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Points Per Game</span>
        </div>
        {chartData.length > 0 ? (
          <div className="h-40 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="game" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, "auto"]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 0, color: "hsl(var(--foreground))" }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                />
                <Line type="monotone" dataKey="points" stroke="hsl(var(--primary))" strokeWidth={2} dot={renderDot} activeDot={false} isAnimationActive={false}>
                  <LabelList dataKey="points" position="top" fill="hsl(var(--foreground))" fontSize={11} fontWeight={700} offset={6} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No per-game data yet</p>
        )}
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

    const chartData = teamGames.map((g, i) => ({ game: `G${i + 1}`, points: ptsByGame[g.id] || 0 }));

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