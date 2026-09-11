import React from "react";
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
} from "recharts";

const SURFACE = "#16181A";
const BORDER = "#26292C";
const INK = "#EDEDEA";
const MUTED = "#8A8D91";
const EMERALD = "#3FAE7A";

function ScorerCard({ label, topScorer, teamMap }) {
  const chartData = topScorer?.chartData || [];

  if (!topScorer) {
    return (
      <div
        className="rounded-lg overflow-hidden"
        style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
      >
        <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <Crown className="w-4 h-4" style={{ color: EMERALD }} />
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: MUTED }}>
            Top Scorer · {label}
          </span>
        </div>
        <div className="py-10">
          <p className="text-sm text-center" style={{ color: MUTED }}>No data yet</p>
        </div>
      </div>
    );
  }

  const p = topScorer.player;
  const initials = `${(p.first_name || "?")[0] || ""}${(p.last_name || "")[0] || ""}`.toUpperCase();
  const teamName = teamMap[p.team_id]?.name || "—";

  // Peak + last-game dot markers only
  const peakIndex = chartData.reduce(
    (acc, d, i) => (d.points > (chartData[acc]?.points ?? -Infinity) ? i : acc),
    0
  );
  const lastIndex = chartData.length - 1;
  const renderDot = (props) => {
    const { cx, cy, index } = props;
    if (index !== peakIndex && index !== lastIndex) return <g />;
    return (
      <circle cx={cx} cy={cy} r={3.5} fill={EMERALD} stroke={SURFACE} strokeWidth={2} />
    );
  };

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: INK }}
    >
      {/* Header: photo upper-left + identity + PPG */}
      <div className="flex items-start gap-4 p-5">
        <div
          className="w-16 h-16 shrink-0 rounded-md overflow-hidden relative"
          style={{ background: "#1F2124" }}
        >
          {p.photo_url ? (
            <img
              src={p.photo_url}
              alt={p.first_name}
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center font-heading font-bold text-xl"
              style={{ color: MUTED }}
            >
              {initials}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <Crown className="w-3.5 h-3.5" style={{ color: EMERALD }} />
            <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: MUTED }}>
              Top Scorer · {label}
            </span>
          </div>
          <p className="font-heading text-lg font-bold tracking-tight truncate" style={{ color: INK }}>
            {p.first_name} {p.last_name}
          </p>
          <p className="text-xs truncate" style={{ color: MUTED }}>
            {teamName}{p.jersey_number ? ` · #${p.jersey_number}` : ""}
          </p>
        </div>

        <div className="text-right shrink-0">
          <p className="font-heading text-3xl font-bold tabular-nums leading-none" style={{ color: EMERALD }}>
            {topScorer.ppg.toFixed(1)}
          </p>
          <p className="text-[10px] font-medium uppercase tracking-wider mt-1" style={{ color: MUTED }}>PPG</p>
        </div>
      </div>

      {/* Inline stat row */}
      <div className="px-5 pb-4">
        <p className="text-xs tabular-nums" style={{ color: MUTED }}>
          <span className="font-heading font-bold" style={{ color: INK }}>{topScorer.stats.total_points || 0}</span> PTS
          <span className="mx-2">·</span>
          <span className="font-heading font-bold" style={{ color: INK }}>{topScorer.gp}</span> GP
          <span className="mx-2">·</span>
          <span className="font-heading font-bold" style={{ color: INK }}>{topScorer.stats.total_rebounds || 0}</span> REB
        </p>
      </div>

      {/* Chart spread full-width underneath */}
      <div className="px-5 pb-5">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-3.5 h-3.5" style={{ color: MUTED }} />
          <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: MUTED }}>
            Points Per Game
          </span>
        </div>
        {chartData.length > 0 ? (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <XAxis
                  dataKey="game"
                  tick={{ fill: MUTED, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  dy={6}
                />
                <YAxis
                  domain={[0, "auto"]}
                  tick={{ fill: MUTED, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  cursor={{ stroke: BORDER, strokeDasharray: "3 3" }}
                  contentStyle={{
                    background: "#1F2124",
                    border: `1px solid ${BORDER}`,
                    borderRadius: 6,
                    color: INK,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: MUTED }}
                />
                <Line
                  type="monotone"
                  dataKey="points"
                  stroke={EMERALD}
                  strokeWidth={2}
                  dot={renderDot}
                  activeDot={{ r: 4, fill: EMERALD, stroke: SURFACE, strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-center py-8" style={{ color: MUTED }}>No per-game data yet</p>
        )}
      </div>
    </div>
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