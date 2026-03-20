import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only super admins can restore backups
    if (!user || user.role !== 'admin' || !user.is_super_admin) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { backup_id, restore_mode } = await req.json();

    if (!backup_id) {
      return Response.json({ error: 'backup_id is required' }, { status: 400 });
    }

    // Fetch backup history
    const backups = await base44.asServiceRole.entities.BackupHistory.list();
    const backup = backups.find(b => b.id === backup_id);

    if (!backup || backup.status !== 'success') {
      return Response.json({ error: 'Invalid or failed backup' }, { status: 404 });
    }

    // Download backup file
    const signedUrl = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: backup.file_uri,
      expires_in: 300
    });

    const response = await fetch(signedUrl.signed_url);
    const backupData = await response.json();

    // Restore mode: 'merge' (add missing data) or 'replace' (delete and recreate)
    const mode = restore_mode || 'merge';

    const restoredCounts = {
      teams: 0,
      players: 0,
      games: 0,
      stats: 0
    };

    if (mode === 'replace') {
      // WARNING: This deletes all existing data for the organization
      // Delete in reverse order of dependencies
      const existingGames = await base44.asServiceRole.entities.Game.filter({ 
        organization_id: backup.organization_id 
      });
      
      for (const game of existingGames) {
        const stats = await base44.asServiceRole.entities.PlayerGameStats.filter({ game_id: game.id });
        for (const stat of stats) {
          await base44.asServiceRole.entities.PlayerGameStats.delete(stat.id);
        }
        await base44.asServiceRole.entities.Game.delete(game.id);
      }

      const existingTeams = await base44.asServiceRole.entities.Team.filter({ 
        organization_id: backup.organization_id 
      });
      
      for (const team of existingTeams) {
        const teamPlayers = await base44.asServiceRole.entities.Player.filter({ team_id: team.id });
        for (const player of teamPlayers) {
          await base44.asServiceRole.entities.Player.delete(player.id);
        }
        await base44.asServiceRole.entities.Team.delete(team.id);
      }

      const existingDivisions = await base44.asServiceRole.entities.Division.filter({ 
        organization_id: backup.organization_id 
      });
      for (const division of existingDivisions) {
        await base44.asServiceRole.entities.Division.delete(division.id);
      }
    }

    // Restore data (works for both merge and replace modes)
    // Restore divisions first
    for (const division of backupData.divisions || []) {
      const { id, created_date, updated_date, created_by, ...divisionData } = division;
      try {
        await base44.asServiceRole.entities.Division.create(divisionData);
      } catch (error) {
        console.error(`Error restoring division ${division.name}:`, error.message);
      }
    }

    // Restore teams
    const teamIdMap = {};
    for (const team of backupData.teams || []) {
      const { id, created_date, updated_date, created_by, ...teamData } = team;
      try {
        const newTeam = await base44.asServiceRole.entities.Team.create(teamData);
        teamIdMap[id] = newTeam.id;
        restoredCounts.teams++;
      } catch (error) {
        console.error(`Error restoring team ${team.name}:`, error.message);
      }
    }

    // Restore players
    const playerIdMap = {};
    for (const player of backupData.players || []) {
      const { id, created_date, updated_date, created_by, team_id, ...playerData } = player;
      try {
        const newPlayer = await base44.asServiceRole.entities.Player.create({
          ...playerData,
          team_id: teamIdMap[team_id] || team_id
        });
        playerIdMap[id] = newPlayer.id;
        restoredCounts.players++;
      } catch (error) {
        console.error(`Error restoring player ${player.first_name} ${player.last_name}:`, error.message);
      }
    }

    // Restore games
    const gameIdMap = {};
    for (const game of backupData.games || []) {
      const { id, created_date, updated_date, created_by, home_team_id, away_team_id, ...gameData } = game;
      try {
        const newGame = await base44.asServiceRole.entities.Game.create({
          ...gameData,
          home_team_id: teamIdMap[home_team_id] || home_team_id,
          away_team_id: teamIdMap[away_team_id] || away_team_id
        });
        gameIdMap[id] = newGame.id;
        restoredCounts.games++;
      } catch (error) {
        console.error(`Error restoring game:`, error.message);
      }
    }

    // Restore player stats
    for (const stat of backupData.player_stats || []) {
      const { id, created_date, updated_date, created_by, game_id, player_id, team_id, ...statData } = stat;
      try {
        await base44.asServiceRole.entities.PlayerGameStats.create({
          ...statData,
          game_id: gameIdMap[game_id] || game_id,
          player_id: playerIdMap[player_id] || player_id,
          team_id: teamIdMap[team_id] || team_id
        });
        restoredCounts.stats++;
      } catch (error) {
        console.error(`Error restoring player stat:`, error.message);
      }
    }

    return Response.json({ 
      success: true, 
      message: `Backup restored successfully for ${backup.organization_name}`,
      restored: restoredCounts
    });

  } catch (error) {
    return Response.json({ 
      error: 'Restoration failed', 
      details: error.message 
    }, { status: 500 });
  }
});