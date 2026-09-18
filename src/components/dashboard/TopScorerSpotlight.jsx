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
  LabelList,
} from "recharts";

function normalizeDivision(name) {
  const d = (name || "General").trim();
  if (/^open( division)?$/i.test(d)) return "Open Division";
  if (/^veterans?( division)?$/i.test(d)) return "Veterans Division";
  return d;
}

const SPORT_LABEL = { basketball: "Basketball", volleyball: "Volleyball" };

function ScorerCard({ topScorer, teamMap, divisionLabel, sportLabel }) {
  const chartData = topScorer?.chartData || [];

  if (!topScorer) {
    return (
      <Card>
        <div className="p-4">
          <p className="text-xs text-muted-foreground mb-2">{sportLabel} · {divisionLabel}</p>
          <p className="text-sm text-muted-foreground text-center py-6">No top scorer data yet.</p>
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
      <div className="p-4">
        <p className="text-xs text-muted-foreground mb-3">{sportLabel} · {divisionLabel}</p>
        <div className="flex items-center gap-4">
          {/* Avatar with thin subtle ring */}
          <div className="w-16 h-16 shrink-0 rounded-full overflow-hidden ring-1 ring-border">
            {p.photo_url ? (
              <img src={p.photo_url} alt={p.first_name} className="w-full h-full object-cover object-top" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary text-foreground text-base font-heading font-bold">{initials}</div>
            )}
          </div>

          {/* Name + subtitle */}
          <div className="min-w-0 shrink-0 w-44">
            <p className="font-heading text-lg font-bold tracking-tight truncate">{fullName}</p>
            <p className="text-sm text-muted-foreground mt-1 truncate">Top Scorer: {fullName} - {totalPoints} Points</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{teamName}{p.jersey_number ? ` · #${p.jersey_number}` : ""}</p>
          </div>

          {/* Neon-emerald area chart with gradient fill + Y-axis labels + per-game point labels */}
          <div className="flex-1 min-w-0 h-28">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 18, right: 8, bottom: 0, left: -10 }}>
                  <defs>
                    <linearGradient id={`ptsGrad-${topScorer.player.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="tick" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 0, color: "hsl(var(--foreground))" }}
                    labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                    formatter={(v) => [`${v} pts`, "Points"]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.gameLabel || ""}
                  />
                  <Area type="monotone" dataKey="points" stroke="hsl(var(--primary))" strokeWidth={2} fill={`url(#ptsGrad-${topScorer.player.id})`} isAnimationActive={false}>
                    <LabelList dataKey="points" position="top" fill="hsl(var(--foreground))" fontSize={11} fontWeight={600} offset={4} />
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No per-game data</div>
            )}
          </div>
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

  // Derive distinct (sport, division) buckets that actually have teams.
  const buckets = React.useMemo(() => {
    const set = new Set();
    teams.forEach((t) => {
      if (t.sport && t.division) set.add(`${t.sport}||${normalizeDivision(t.division)}`);
    });
    return Array.from(set)
      .map((key) => {
        const [sport, division] = key.split("||");
        return { sport, division };
      })
      .sort((a, b) => (a.sport === b.sport ? a.division.localeCompare(b.division) : a.sport.localeCompare(b.sport)));
  }, [teams]);

  const buildTop = React.useCallback((sport, division) => {
    const ctx = { games, playerStats, teams, players, sport, division, limit: 1 };
    const ptsRow = buildLeaderboard({ ...ctx, statType: "points" })[0];
    if (!ptsRow) return null;
    const player = playerMap[ptsRow.id];
    if (!player) return null;

    const teamGames = games
      .filter((g) => {
        if (g.status !== "completed") return false;
        if ((g.sport || "").toLowerCase() !== sport) return false;
        const homeDiv = normalizeDivision(teamMap[g.home_team_id]?.division);
        const awayDiv = normalizeDivision(teamMap[g.away_team_id]?.division);
        return homeDiv === division || awayDiv === division;
      })
      .filter((g) => g.home_team_id === player.team_id || g.away_team_id === player.team_id)
      .sort((a, b) => new Date(a.game_date) - new Date(b.game_date));

    const ptsByGame = {};
    playerStats.forEach((s) => {
      if (s.player_id !== ptsRow.id) return;
      const team = teamMap[s.team_id];
      if (team && normalizeDivision(team.division) !== division) return;
      let val;
      if (sport === "volleyball") {
        val = Number(s.aces || 0) + Number(s.attacks || 0) + Number(s.blocks || 0);
      } else {
        val = Number(s.points || 0);
      }
      ptsByGame[s.game_id] = (ptsByGame[s.game_id] || 0) + val;
    });

    // Dedupe month labels: show "MMM yyyy" on first occurrence, blank after.
    const seen = new Set();
    const chartData = teamGames.map((g, i) => {
      const d = g.game_date ? new Date(g.game_date) : null;
      const my = d ? format(d, "MMM yyyy") : `Game ${i + 1}`;
      const tick = seen.has(my) ? "" : my;
      seen.add(my);
      return { tick, points: ptsByGame[g.id] || 0, gameLabel: my };
    });

    return {
      player,
      chartData,
      sport,
      division,
      stats: { total_points: ptsRow.total },
    };
  }, [games, playerStats, teams, players, playerMap, teamMap]);

  const cards = React.useMemo(
    () => buckets.map((b) => ({ ...b, top: buildTop(b.sport, b.division) })),
    [buckets, buildTop]
  );

  if (cards.length === 0) {
    return (
      <StatsFetchingIndicator loading={isLoading} fetching={isFetching} label="Refreshing top scorers…">
        <Card><div className="p-5"><p className="text-sm text-muted-foreground text-center py-6">No divisions with teams yet.</p></div></Card>
      </StatsFetchingIndicator>
    );
  }

  return (
    <StatsFetchingIndicator loading={isLoading} fetching={isFetching} label="Refreshing top scorers…">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {cards.map((c) => (
          <ScorerCard
            key={`${c.sport}-${c.division}`}
            topScorer={c.top}
            teamMap={teamMap}
            sportLabel={SPORT_LABEL[c.sport] || c.sport}
            divisionLabel={c.division}
          />
        ))}
      </div>
    </StatsFetchingIndicator>
  );
}