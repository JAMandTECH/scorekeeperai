import React from "react";
import { Card } from "@/components/ui/card";
import { Trophy, Medal, Award } from "lucide-react";

// Normalize division names so "Open" and "Open Division" count as the same division
function normalizeDivision(name) {
  const d = (name || "General").trim();
  if (/^open( division)?$/i.test(d)) return "Open Division";
  if (/^veterans?( division)?$/i.test(d)) return "Veterans Division";
  return d;
}

const SPORT_LABEL = { basketball: "Basketball", volleyball: "Volleyball" };

// Sport-specific header background image + gradient
const SPORT_THEMES = {
  basketball: {
    gradient: "from-orange-600 via-amber-600 to-red-600",
    image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=70",
  },
  volleyball: {
    gradient: "from-blue-600 via-cyan-600 to-sky-500",
    image: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=800&q=70",
  },
};

const RANK_META = [
  { icon: Trophy, color: "text-yellow-400", badge: "bg-yellow-400/20 text-yellow-300" },
  { icon: Medal, color: "text-slate-300", badge: "bg-slate-300/20 text-slate-200" },
  { icon: Award, color: "text-amber-600", badge: "bg-amber-600/20 text-amber-400" },
];

function TeamRow({ team, rank }) {
  const meta = RANK_META[rank] || RANK_META[2];
  const RankIcon = meta.icon;
  const wins = team.wins || 0;
  const losses = team.losses || 0;
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${meta.badge}`}>
        <RankIcon className="w-4 h-4" />
      </div>
      <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-gray-100 dark:bg-white/10 flex items-center justify-center">
        {team.logo_url ? (
          <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-[11px] font-black text-gray-500 dark:text-slate-300">
            {(team.name || "?").slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <span className="flex-1 min-w-0 text-sm font-bold text-gray-900 dark:text-white truncate">{team.name}</span>
      <div className="flex items-center gap-1.5 shrink-0 text-sm font-black">
        <span className="text-green-600 dark:text-green-400">{wins}</span>
        <span className="text-gray-300 dark:text-slate-600">-</span>
        <span className="text-red-500 dark:text-red-400">{losses}</span>
      </div>
    </div>
  );
}

function DivisionCard({ division, sport, teams }) {
  const theme = SPORT_THEMES[sport] || SPORT_THEMES.basketball;
  const top3 = [...teams]
    .sort((a, b) => (b.winPct || 0) - (a.winPct || 0) || (b.diff || 0) - (a.diff || 0))
    .slice(0, 3);

  return (
    <Card className="relative overflow-hidden border border-gray-200 dark:border-[#1c2c4a] bg-white dark:bg-[#0d1830] shadow-futuristic">
      <div className="relative h-24">
        <img src={theme.image} alt={division} className="absolute inset-0 w-full h-full object-cover" />
        <div className={`absolute inset-0 bg-gradient-to-r ${theme.gradient} opacity-80`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute top-2 right-3">
          <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur text-[11px] font-bold text-white uppercase tracking-wide">
            {SPORT_LABEL[sport] || sport}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-white drop-shadow" />
          <h3 className="text-lg font-black text-white drop-shadow truncate uppercase tracking-wide">{division}</h3>
        </div>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-white/5">
        {top3.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-slate-500 font-medium text-center py-6">No teams yet</p>
        ) : (
          top3.map((team, i) => <TeamRow key={team.id} team={team} rank={i} />)
        )}
      </div>
    </Card>
  );
}

// Compute live wins/losses from completed games (matches the main standings page,
// ignoring any stale stored wins/losses on the team records).
function computeRecords(teams, games) {
  const rec = {};
  teams.forEach((t) => { rec[t.id] = { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 }; });
  games
    .filter((g) => g.status === "completed" && g.archived !== true && (g.game_type || 'regular_season') === 'regular_season')
    .forEach((g) => {
      const h = g.home_team_id, a = g.away_team_id;
      if (!rec[h] || !rec[a]) return;
      const sport = (g.sport || "").toLowerCase();
      let hs, as;
      if (sport === "volleyball" && Array.isArray(g.quarter_scores) && g.quarter_scores.length > 0) {
        hs = g.quarter_scores.reduce((sum, s) => sum + (s.home || 0), 0);
        as = g.quarter_scores.reduce((sum, s) => sum + (s.away || 0), 0);
        const homeSets = g.quarter_scores.filter((s) => (s.home || 0) > (s.away || 0)).length;
        const awaySets = g.quarter_scores.filter((s) => (s.away || 0) > (s.home || 0)).length;
        if (homeSets > awaySets) { rec[h].wins++; rec[a].losses++; }
        else if (awaySets > homeSets) { rec[a].wins++; rec[h].losses++; }
      } else {
        hs = Number(g.home_score || 0); as = Number(g.away_score || 0);
        if (hs > as) { rec[h].wins++; rec[a].losses++; }
        else if (as > hs) { rec[a].wins++; rec[h].losses++; }
      }
      rec[h].pointsFor += hs; rec[h].pointsAgainst += as;
      rec[a].pointsFor += as; rec[a].pointsAgainst += hs;
    });
  return rec;
}

export default function DivisionStandings({ teams = [], games = [] }) {
  const groups = React.useMemo(() => {
    const records = computeRecords(teams, games);
    const byKey = {};
    teams
      .filter((t) => t.status !== "rejected")
      .forEach((t) => {
        const r = records[t.id] || { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 };
        const gp = r.wins + r.losses;
        const enriched = { ...t, wins: r.wins, losses: r.losses, winPct: gp > 0 ? r.wins / gp : 0, diff: r.pointsFor - r.pointsAgainst };
        const sport = t.sport || "basketball";
        const division = normalizeDivision(t.division);
        const key = `${sport}__${division}`;
        if (!byKey[key]) byKey[key] = { sport, division, teams: [] };
        byKey[key].teams.push(enriched);
      });
    // Sort: basketball first, then by division name
    return Object.values(byKey).sort(
      (a, b) => a.sport.localeCompare(b.sport) || a.division.localeCompare(b.division)
    );
  }, [teams, games]);

  if (groups.length === 0) return null;

  return (
    <div>
      <h2 className="text-xl font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-500" /> Division Standings
        <span className="text-sm font-semibold text-gray-500 dark:text-slate-400">· Top 3 teams</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {groups.map((g, i) => (
          <DivisionCard
            key={`${g.sport}-${g.division}`}
            division={g.division}
            sport={g.sport}
            teams={g.teams}
          />
        ))}
      </div>
    </div>
  );
}