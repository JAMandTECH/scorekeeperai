import React from "react";
import { Card } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { computeTeamRecords, standingsColumns, orgStandingsFlags } from "@/lib/standings";
import StandingsControls from "@/components/standings/StandingsControls";

function normalizeDivision(name) {
  const d = (name || "General").trim();
  if (/^open( division)?$/i.test(d)) return "Open Division";
  if (/^veterans?( division)?$/i.test(d)) return "Veterans Division";
  return d;
}

const SPORT_LABEL = { basketball: "Basketball", volleyball: "Volleyball" };

function TeamRow({ team, rank, showDraws, showDefaults }) {
  const wins = team.wins || 0;
  const losses = team.losses || 0;
  const draws = team.draws || 0;
  const defaults = team.defaults || 0;
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors">
      <span className={`font-heading text-sm font-bold tabular-nums w-6 ${rank === 0 ? 'text-primary' : 'text-muted-foreground'}`}>{rank + 1}</span>
      <div className="w-8 h-8 overflow-hidden border border-border bg-secondary flex items-center justify-center shrink-0">
        {team.logo_url ? (
          <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-[11px] font-heading font-bold text-muted-foreground">
            {(team.name || "?").slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <span className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">{team.name}</span>
      <div className="flex items-center gap-1.5 shrink-0 text-sm font-heading font-bold tabular-nums">
        <span className="text-foreground">{wins}</span>
        <span className="text-muted-foreground">-</span>
        <span className="text-muted-foreground">{losses}</span>
        {showDraws && (
          <>
            <span className="text-muted-foreground">-</span>
            <span className="text-muted-foreground">{draws}</span>
          </>
        )}
        {showDefaults && (
          <>
            <span className="text-muted-foreground">-</span>
            <span className="text-primary">{defaults}</span>
          </>
        )}
      </div>
    </div>
  );
}

function DivisionCard({ division, sport, teams, showDraws, showDefaults }) {
  const top3 = [...teams]
    .sort((a, b) => (b.winPct || 0) - (a.winPct || 0) || (b.diff || 0) - (a.diff || 0))
    .slice(0, 3);

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          <h3 className="font-heading text-base font-bold tracking-tight">{division}</h3>
        </div>
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          {SPORT_LABEL[sport] || sport}
        </span>
      </div>
      <div className="divide-y divide-border">
        {top3.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No teams yet</p>
        ) : (
          top3.map((team, i) => (
            <TeamRow
              key={team.id}
              team={team}
              rank={i}
              showDraws={showDraws}
              showDefaults={showDefaults}
            />
          ))
        )}
      </div>
    </Card>
  );
}

export default function DivisionStandings({ teams = [], games = [], organization, user, onStandingsUpdated }) {
  const flags = orgStandingsFlags(organization);
  const { showDraws, showDefaults } = standingsColumns(flags);

  const groups = React.useMemo(() => {
    const records = computeTeamRecords(teams, games, flags);
    const byKey = {};
    teams
      .filter((t) => t.status !== "rejected")
      .forEach((t) => {
        const r = records[t.id] || { wins: 0, losses: 0, draws: 0, defaults: 0, pointsFor: 0, pointsAgainst: 0, winPct: 0, diff: 0 };
        const enriched = {
          ...t,
          wins: r.wins,
          losses: r.losses,
          draws: r.draws,
          defaults: r.defaults,
          winPct: r.winPct,
          diff: r.diff,
        };
        const sport = t.sport || "basketball";
        const division = normalizeDivision(t.division);
        const key = `${sport}__${division}`;
        if (!byKey[key]) byKey[key] = { sport, division, teams: [] };
        byKey[key].teams.push(enriched);
      });
    return Object.values(byKey).sort(
      (a, b) => a.sport.localeCompare(b.sport) || a.division.localeCompare(b.division)
    );
  }, [teams, games, flags.excludeDraws, flags.excludeDefaults]);

  if (groups.length === 0) return null;

  const isAdmin = user?.role === 'admin';

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="font-heading text-xl font-bold tracking-tight flex items-center gap-2">
          Division Standings
          <span className="text-sm font-normal text-muted-foreground">· Top 3 teams</span>
        </h2>
        {isAdmin && (
          <StandingsControls organization={organization} onUpdated={onStandingsUpdated} />
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {groups.map((g) => (
          <DivisionCard
            key={`${g.sport}-${g.division}`}
            division={g.division}
            sport={g.sport}
            teams={g.teams}
            showDraws={showDraws}
            showDefaults={showDefaults}
          />
        ))}
      </div>
    </div>
  );
}