import React from "react";
import { Card } from "@/components/ui/card";
import { usePlayerLeaders, buildLeaderboard } from "@/components/hooks/usePlayerLeaders";

const CATEGORIES = [
  { key: "points", label: "Points", unit: "Points" },
  { key: "rebounds", label: "Rebounds", unit: "Rebounds" },
  { key: "assists", label: "Assists", unit: "Assists" },
];

function CategoryCard({ label, unit, topTotal, secondTotal }) {
  return (
    <Card>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="font-heading text-2xl font-bold tabular-nums">{topTotal || 0}</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Top Leaders</span>
          <span className="text-xs text-muted-foreground tabular-nums">{secondTotal || 0} {unit}</span>
        </div>
      </div>
    </Card>
  );
}

export default function CategoryLeaders({ organizationId, players = [], teams = [], rightColumnExtra = null }) {
  const { games, playerStats } = usePlayerLeaders(organizationId, teams);

  const leaders = React.useMemo(() => {
    const sport = "basketball";
    return CATEGORIES.map((cat) => {
      const rows = buildLeaderboard({
        statType: cat.key,
        sport,
        division: null,
        games,
        playerStats,
        teams,
        players,
        limit: 2,
      });
      return {
        ...cat,
        topTotal: rows[0]?.total || 0,
        secondTotal: rows[1]?.total || 0,
      };
    });
  }, [games, playerStats, teams, players]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {leaders.map((l) => (
          <CategoryCard key={l.key} label={l.label} unit={l.unit} topTotal={l.topTotal} secondTotal={l.secondTotal} />
        ))}
      </div>
      {rightColumnExtra}
    </div>
  );
}