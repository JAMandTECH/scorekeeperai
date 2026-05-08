export default function getTopScorers({
  teams,
  players,
  playerStats,
  games,
  organization,
  division = null,
  limit = 10,
}) {
  const sport = 'basketball';
  const sportTeamIds = teams
    .filter(
      (t) =>
        (t.sport || '').toLowerCase() === sport &&
        (!division || ((t.division || 'No Division').toString().trim().toLowerCase().includes((division || '').toString().trim().toLowerCase())))
    )
    .map((t) => t.id);

  const sportPlayers = players.filter((p) => sportTeamIds.includes(p.team_id));
  const includeArchived = organization?.settings?.include_archived_in_leaders === true;
  const eligibleGameIds = new Set(
    games
      .filter(
        (g) =>
          (g.sport || '').toLowerCase() === sport &&
          g.status === 'completed' &&
          (includeArchived || !g.archived)
      )
      .map((g) => g.id)
  );

  return sportPlayers
    .map((player) => {
      const playerStatsList = playerStats.filter((s) => s.player_id === player.id && eligibleGameIds.has(s.game_id));

      const total = playerStatsList.reduce((sum, s) => {
        const stored = Number(s.points || 0);
        if (stored > 0) return sum + stored;
        const threes = Number(s.three_pointers || 0);
        const fgm = Number(s.field_goals_made || 0);
        const twos = Math.max(fgm - threes, 0);
        const ftm = Number(s.free_throws_made || 0);
        return sum + (twos * 2) + (threes * 3) + ftm;
      }, 0);

      const team = teams.find((t) => t.id === player.team_id);
      const gamesPlayed = [...new Set(playerStatsList.map((s) => s.game_id))].length;

      return {
        ...player,
        total,
        gamesPlayed,
        average: gamesPlayed > 0 ? (total / gamesPlayed).toFixed(1) : 0,
        averageLabel: 'PPG',
        teamName: team?.name || 'Unknown',
        teamLogoUrl: team?.logo_url || '',
        division: team?.division || 'No Division',
      };
    })
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}