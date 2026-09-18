/**
 * Shared standings computation used by every standings surface
 * (Dashboard DivisionStandings, Home StandingsTable, Statistics team table,
 * and the public StandingsWidget via the backend mirror).
 *
 * Win% = (wins + (excludeDraws ? 0 : draws * 0.5)) / (wins + losses + (excludeDraws ? 0 : draws))
 * - excludeDraws: drawn games drop out of the denominator and lose their 0.5 weight; D column hidden.
 * - excludeDefaults: defaulted games are skipped entirely from W/L/D/Win%; DEFAULT column hidden.
 *   A team's DEFAULT count = completed, non-archived, regular-season games where
 *   is_default === true and defaulted_team_id === that team's id.
 */

export function computeTeamRecords(teams, games, { excludeDraws = false, excludeDefaults = false } = {}) {
  const rec = {};
  teams.forEach((t) => {
    rec[t.id] = { wins: 0, losses: 0, draws: 0, defaults: 0, pointsFor: 0, pointsAgainst: 0 };
  });

  games
    .filter(
      (g) =>
        g.status === "completed" &&
        g.archived !== true &&
        (g.game_type || "regular_season") === "regular_season"
    )
    .forEach((g) => {
      const h = g.home_team_id;
      const a = g.away_team_id;
      if (!rec[h] || !rec[a]) return;

      const isDefault = g.is_default === true;
      if (isDefault && excludeDefaults) return; // skip entirely from W/L/D/Win%

      const sport = (g.sport || "").toLowerCase();
      let hs;
      let as;
      let homeWin = false;
      let awayWin = false;
      let draw = false;

      if (sport === "volleyball" && Array.isArray(g.quarter_scores) && g.quarter_scores.length > 0) {
        hs = g.quarter_scores.reduce((sum, s) => sum + (s.home || 0), 0);
        as = g.quarter_scores.reduce((sum, s) => sum + (s.away || 0), 0);
        const homeSets = g.quarter_scores.filter((s) => (s.home || 0) > (s.away || 0)).length;
        const awaySets = g.quarter_scores.filter((s) => (s.away || 0) > (s.home || 0)).length;
        if (homeSets > awaySets) homeWin = true;
        else if (awaySets > homeSets) awayWin = true;
        else draw = true;
      } else {
        hs = Number(g.home_score || 0);
        as = Number(g.away_score || 0);
        if (hs > as) homeWin = true;
        else if (as > hs) awayWin = true;
        else draw = true;
      }

      // Always accumulate points for/against (informational, used for Diff/PF/PA)
      rec[h].pointsFor += hs;
      rec[h].pointsAgainst += as;
      rec[a].pointsFor += as;
      rec[a].pointsAgainst += hs;

      // When excluding draws, drawn games don't count toward W/L/D or the Win% denominator.
      if (draw && excludeDraws) return;

      if (homeWin) {
        rec[h].wins++;
        rec[a].losses++;
      } else if (awayWin) {
        rec[a].wins++;
        rec[h].losses++;
      } else {
        rec[h].draws++;
        rec[a].draws++;
      }

      if (isDefault) {
        if (g.defaulted_team_id === h) rec[h].defaults++;
        else if (g.defaulted_team_id === a) rec[a].defaults++;
      }
    });

  Object.keys(rec).forEach((id) => {
    const r = rec[id];
    const denom = r.wins + r.losses + (excludeDraws ? 0 : r.draws);
    const num = r.wins + (excludeDraws ? 0 : r.draws * 0.5);
    r.winPct = denom > 0 ? num / denom : 0;
    r.gamesPlayed = r.wins + r.losses + r.draws;
    r.diff = r.pointsFor - r.pointsAgainst;
  });

  return rec;
}

export function standingsColumns({ excludeDraws = false, excludeDefaults = false } = {}) {
  return {
    showDraws: !excludeDraws,
    showDefaults: !excludeDefaults,
  };
}

export function orgStandingsFlags(organization) {
  return {
    excludeDraws: !!organization?.standings_exclude_draws,
    excludeDefaults: !!organization?.standings_exclude_defaults,
  };
}