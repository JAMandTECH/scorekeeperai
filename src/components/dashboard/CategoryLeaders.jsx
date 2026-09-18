import React from "react";
import { Card } from "@/components/ui/card";
import { usePlayerLeaders, buildLeaderboard } from "@/components/hooks/usePlayerLeaders";
import StatsFetchingIndicator from "@/components/stats/StatsFetchingIndicator";

function normalizeDivision(name) {
  const d = (name || "General").trim();
  if (/^open( division)?$/i.test(d)) return "Open Division";
  if (/^veterans?( division)?$/i.test(d)) return "Veterans Division";
  return d;
}

const SPORT_LABEL = { basketball: "Basketball", volleyball: "Volleyball" };

const BASKETBALL_CATEGORIES = [
  { key: "points", label: "Points" },
  { key: "rebounds", label: "Rebounds" },
  { key: "assists", label: "Assists" },
  { key: "steals", label: "Steals" },
  { key: "blocks", label: "Blocks" },
  { key: "three_pointers", label: "3-Pointers" },
];

const VOLLEYBALL_CATEGORIES = [
  { key: "points", label: "Points" },
  { key: "aces", label: "Aces" },
  { key: "attacks", label: "Attacks" },
];

function LeaderRow({ row, rank, unit }) {
  const name = `${row.first_name || ""} ${row.last_name || ""}`.trim() || "Unknown";
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
      <span className={`font-heading text-xs font-bold tabular-nums w-5 shrink-0 ${rank === 0 ? "text-primary" : "text-muted-foreground"}`}>{rank + 1}</span>
      <div className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-border shrink-0 bg-secondary">
        {row.photo_url ? (
          <img src={row.photo_url} alt={name} className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] font-heading font-bold text-foreground">
            {name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{name}</p>
        <p className="text-xs text-muted-foreground truncate">{row.team_name}{row.jersey_number ? ` · #${row.jersey_number}` : ""}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-heading text-sm font-bold tabular-nums text-foreground">{row.total}</p>
        <p className="text-[10px] text-muted-foreground tabular-nums">{row.avg} {unit}/g</p>
      </div>
    </div>
  );
}

function CategoryCard({ category, division, sport, games, playerStats, teams, players }) {
  const rows = React.useMemo(
    () =>
      buildLeaderboard({
        statType: category.key,
        sport,
        division,
        games,
        playerStats,
        teams,
        players,
        limit: 10,
      }),
    [category.key, sport, division, games, playerStats, teams, players]
  );

  const topTotal = rows[0]?.total || 0;

  return (
    <Card>
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">{category.label}</span>
          <span className="font-heading text-2xl font-bold tabular-nums">{topTotal}</span>
        </div>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No leaders yet</p>
        ) : (
          <div>
            {rows.map((r, i) => (
              <LeaderRow key={r.id} row={r} rank={i} unit={category.label} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function SportSection({ sport, categories, games, playerStats, teams, players }) {
  // Distinct divisions for this sport (from teams).
  const divisions = React.useMemo(() => {
    const set = new Set();
    teams
      .filter((t) => (t.sport || "").toLowerCase() === sport)
      .forEach((t) => set.add(normalizeDivision(t.division)));
    return Array.from(set).sort();
  }, [teams, sport]);

  if (divisions.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-sm font-bold tracking-tight text-foreground">{SPORT_LABEL[sport]}</h3>
      {divisions.map((division) => (
        <div key={division} className="space-y-2">
          <p className="text-xs text-muted-foreground">{division}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <CategoryCard
                key={cat.key}
                category={cat}
                division={division}
                sport={sport}
                games={games}
                playerStats={playerStats}
                teams={teams}
                players={players}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CategoryLeaders({ organizationId, players = [], teams = [], rightColumnExtra = null }) {
  const { games, playerStats, isLoading, isFetching } = usePlayerLeaders(organizationId, teams);

  return (
    <StatsFetchingIndicator loading={isLoading} fetching={isFetching} label="Refreshing category leaders…">
      <div className="space-y-6">
        <SportSection sport="basketball" categories={BASKETBALL_CATEGORIES} games={games} playerStats={playerStats} teams={teams} players={players} />
        <SportSection sport="volleyball" categories={VOLLEYBALL_CATEGORIES} games={games} playerStats={playerStats} teams={teams} players={players} />
        {rightColumnExtra}
      </div>
    </StatsFetchingIndicator>
  );
}