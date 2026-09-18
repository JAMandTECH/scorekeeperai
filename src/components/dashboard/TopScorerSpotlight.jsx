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
} from "recharts";

function ScorerCard({ label, topScorer, teamMap }) {
  const [selectedKey, setSelectedKey] = React.useState("points");
  const chartData = topScorer?.chartData || [];

  const activeSeries = React.useMemo(
    () => chartData.map((d) => ({ game: d.game, value: d[selectedKey] ?? 0 })),
    [chartData, selectedKey]
  );

  const selectedStat = topScorer?.stats.find((s) => s.key === selectedKey) || topScorer?.stats?.[0];
  const selectedLabel = selectedStat?.label || "Points";

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

  const peakIdx = activeSeries.reduce((mi, d, i, arr) => (d.value > arr[mi].value ? i : mi), 0);
  const lastIdx = activeSeries.length - 1;
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
          <div className="w-24 h-24 shrink-0 rounded-full overflow-hidden ring-1 ring-border">
            {p.photo_url ? (
              <img src={p.photo_url} alt={p.first_name} className="w-full h-full object-cover object-top" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary text-foreground text-2xl font-heading font-bold">{initials}</div>
            )}
          </div>
          <div className="min-w-0 shrink-0">
            <p className="font-heading text-lg font-bold tracking-tight truncate">{p.first_name} {p.last_name}</p>
            <p className="text-sm text-muted-foreground truncate">{teamName}{p.jersey_number ? ` · #${p.jersey_number}` : ""}</p>
          </div>
          <div className="flex flex-wrap items-end justify-end gap-x-3 gap-y-2 ml-auto">
            <div className="flex flex-col items-center min-w-[42px]">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">GP</span>
              <span className="font-heading text-xl font-bold tabular-nums leading-none text-foreground">{topScorer.gp}</span>
              <span className="text-[10px] text-muted-foreground tabular-nums mt-0.5">&nbsp;</span>
            </div>
            {topScorer.stats.map((s) => {
              const isActive = s.key === selectedKey;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSelectedKey(s.key)}
                  className={`flex flex-col items-center min-w-[42px] rounded-md px-1.5 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isActive ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-muted"}`}
                  title={`Show ${s.label} per game`}
                >
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{s.label}</span>
                  <span className={`font-heading text-xl font-bold tabular-nums leading-none ${isActive ? "text-primary" : "text-foreground"}`}>{s.avg.toFixed(1)}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums mt-0.5">{Math.round(s.total)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2 pt-4 border-t border-border">
          <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{selectedLabel} Per Game</span>
        </div>
        {activeSeries.length > 0 ? (
          <div className="h-28 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeSeries} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="game" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, "auto"]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 0, color: "hsl(var(--foreground))" }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  formatter={(value) => [value, selectedLabel]}
                />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={renderDot} activeDot={{ r: 4, fill: "hsl(var(--primary))", stroke: "hsl(var(--card))", strokeWidth: 1.5 }} isAnimationActive={false} />
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

    const eligibleGameIds = new Set(teamGames.map((g) => g.id));
    const myStats = playerStats.filter((s) => s.player_id === ptsRow.id && eligibleGameIds.has(s.game_id));

    // Per-game accumulation for every tracked stat
    const perGame = {};
    const accGame = (key, gameId, val) => {
      if (!perGame[key]) perGame[key] = {};
      perGame[key][gameId] = (perGame[key][gameId] || 0) + val;
    };
    myStats.forEach((s) => {
      if (sport === "volleyball") {
        accGame("aces", s.game_id, Number(s.aces || 0));
        accGame("attacks", s.game_id, Number(s.attacks || 0));
        accGame("blocks", s.game_id, Number(s.blocks || 0));
        accGame("points", s.game_id, Number(s.aces || 0) + Number(s.attacks || 0) + Number(s.blocks || 0));
      } else {
        accGame("points", s.game_id, Number(s.points || 0));
        accGame("rebounds", s.game_id, Number(s.rebounds || 0));
        accGame("assists", s.game_id, Number(s.assists || 0));
        accGame("steals", s.game_id, Number(s.steals || 0));
        accGame("blocks", s.game_id, Number(s.blocks || 0));
        accGame("three_pointers", s.game_id, Number(s.three_pointers || 0));
      }
    });

    const chartData = teamGames.map((g, i) => {
      const row = { game: `G${i + 1}` };
      Object.keys(perGame).forEach((key) => {
        row[key] = perGame[key][g.id] || 0;
      });
      return row;
    });

    const sumKey = (key) => myStats.reduce((acc, s) => acc + Number(s[key] || 0), 0);
    let pointsTotal;
    if (sport === "volleyball") {
      pointsTotal = sumKey("aces") + sumKey("attacks") + sumKey("blocks");
    } else {
      const stored = sumKey("points");
      if (stored > 0) {
        pointsTotal = stored;
      } else {
        const threes = sumKey("three_pointers");
        const fgm = sumKey("field_goals_made");
        const twos = Math.max(fgm - threes, 0);
        const ftm = sumKey("free_throws_made");
        pointsTotal = twos * 2 + threes * 3 + ftm;
      }
    }
    const gp = ptsRow.gamesPlayed;
    const mk = (label, total, key) => ({ label, total, avg: gp > 0 ? total / gp : 0, key });
    const statRows = sport === "volleyball"
      ? [
          mk("PTS", pointsTotal, "points"),
          mk("ACES", sumKey("aces"), "aces"),
          mk("ATK", sumKey("attacks"), "attacks"),
          mk("BLK", sumKey("blocks"), "blocks"),
        ]
      : [
          mk("PTS", pointsTotal, "points"),
          mk("REB", sumKey("rebounds"), "rebounds"),
          mk("AST", sumKey("assists"), "assists"),
          mk("STL", sumKey("steals"), "steals"),
          mk("BLK", sumKey("blocks"), "blocks"),
          mk("3PM", sumKey("three_pointers"), "three_pointers"),
        ];

    return {
      player,
      ppg: ptsRow.avgNum,
      gp,
      chartData,
      sport,
      stats: statRows,
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
          <div className="space-y-4">
            {openTop && <ScorerCard label="Open" topScorer={openTop} teamMap={teamMap} />}
            {veteranTop && <ScorerCard label="Veterans" topScorer={veteranTop} teamMap={teamMap} />}
          </div>
        )}
        {hasVolleyball && (
          <div className="space-y-4">
            {vOpenTop && <ScorerCard label="Volleyball · Open" topScorer={vOpenTop} teamMap={teamMap} />}
            {vVeteranTop && <ScorerCard label="Volleyball · Veterans" topScorer={vVeteranTop} teamMap={teamMap} />}
          </div>
        )}
      </div>
    </StatsFetchingIndicator>
  );
}