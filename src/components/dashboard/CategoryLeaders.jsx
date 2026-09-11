import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown } from "lucide-react";
import { usePlayerLeaders, buildLeaderboard } from "@/components/hooks/usePlayerLeaders";

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

function LeaderRow({ category, leader }) {
  const initials = leader
    ? `${(leader.first_name || "?")[0] || ""}${(leader.last_name || "")[0] || ""}`.toUpperCase()
    : "—";
  return (
    <div className="flex items-center gap-3 p-2.5 border border-border bg-card">
      <div className="flex flex-col items-center justify-center w-16 shrink-0">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{category.label}</span>
        <span className="font-heading text-xl font-bold tabular-nums leading-none">
          {leader ? leader.avg : "0.0"}
        </span>
        <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground leading-none">avg</span>
      </div>
      {leader ? (
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Avatar className="w-8 h-8 border border-border">
            <AvatarImage src={leader.photo_url} alt={leader.first_name} />
            <AvatarFallback className="bg-secondary text-foreground text-xs font-heading font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {leader.first_name} {leader.last_name}
            </p>
            <p className="text-xs text-muted-foreground truncate">{leader.team_name || "—"}</p>
          </div>
          <Crown className="w-4 h-4 text-primary ml-auto shrink-0" />
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">No data yet</span>
      )}
    </div>
  );
}

function computeLeaders(categories, { sport, division, games, playerStats, teams, players }) {
  return categories.map((cat) => {
    const rows = buildLeaderboard({
      statType: cat.key,
      sport,
      division,
      games,
      playerStats,
      teams,
      players,
      limit: 1,
    });
    return { category: cat, leader: rows[0] || null };
  });
}

function DivisionGroup({ label, leaders }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs font-heading font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      {leaders.map(({ category, leader }) => (
        <LeaderRow key={category.key} category={category} leader={leader} />
      ))}
    </div>
  );
}

function SportLeaders({ title, categories, sport, ctx, splitDivisions, openDivision, veteranDivision }) {
  const openLeaders = splitDivisions ? computeLeaders(categories, { ...ctx, sport, division: openDivision }) : null;
  const veteranLeaders = splitDivisions ? computeLeaders(categories, { ...ctx, sport, division: veteranDivision }) : null;
  const leaders = computeLeaders(categories, { ...ctx, sport, division: null });

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-5 py-4 flex items-center gap-2">
        <Crown className="w-4 h-4 text-primary" />
        <h3 className="font-heading text-base font-bold tracking-tight">{title}</h3>
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide ml-auto">Category Leaders</span>
      </div>
      <CardContent className="pt-4 space-y-4">
        {splitDivisions ? (
          <>
            <DivisionGroup label="Open" leaders={openLeaders} />
            <DivisionGroup label="Veterans" leaders={veteranLeaders} />
          </>
        ) : (
          <div className="space-y-2">
            {leaders.map(({ category, leader }) => (
              <LeaderRow key={category.key} category={category} leader={leader} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CategoryLeaders({ organizationId, players = [], teams = [], rightColumnExtra = null }) {
  const { games, playerStats } = usePlayerLeaders(organizationId, teams);
  const ctx = { games, playerStats, teams, players };

  const basketballDivisions = [...new Set(
    teams.filter((t) => (t.sport || "").toLowerCase() === "basketball").map((t) => t.division).filter(Boolean)
  )];
  const openDivision = basketballDivisions.find((d) => d.toLowerCase().includes("open")) || "Open Division";
  const veteranDivision = basketballDivisions.find((d) => d.toLowerCase().includes("veteran")) || "Veterans Division";

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <SportLeaders
        title="Basketball"
        categories={BASKETBALL_CATEGORIES}
        sport="basketball"
        ctx={ctx}
        splitDivisions
        openDivision={openDivision}
        veteranDivision={veteranDivision}
      />
      <div className="space-y-6">
        <SportLeaders
          title="Volleyball"
          categories={VOLLEYBALL_CATEGORIES}
          sport="volleyball"
          ctx={ctx}
        />
        {rightColumnExtra}
      </div>
    </div>
  );
}