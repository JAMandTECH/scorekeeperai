import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify the request is from a trusted source (system or super admin)
    const user = await base44.auth.me();
    if (user && (!user.is_super_admin || user.role !== 'admin')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all organizations with Basic or Premium tier
    const allOrganizations = await base44.asServiceRole.entities.Organization.list();
    const organizationsToBackup = allOrganizations.filter(
      org => org.subscription_tier === 'basic' || org.subscription_tier === 'premium'
    );

    const results = [];

    for (const organization of organizationsToBackup) {
      try {
        // Create backup history record
        const backupHistory = await base44.asServiceRole.entities.BackupHistory.create({
          organization_id: organization.id,
          organization_name: organization.name,
          subscription_tier: organization.subscription_tier,
          backup_date: new Date().toISOString(),
          backed_up_by: 'system',
          status: 'in_progress'
        });

        // Collect all organization data
        const teams = await base44.asServiceRole.entities.Team.filter({ organization_id: organization.id });
        const teamIds = teams.map(t => t.id);
        
        let players = [];
        let games = [];
        let playerStats = [];
        let divisions = [];
        let tournaments = [];
        let bracketMatches = [];
        let socialPosts = [];
        let socialComments = [];
        let socialLikes = [];
        let notifications = [];
        let userOrganizations = [];
        let roles = [];

        if (teamIds.length > 0) {
          const allPlayers = await base44.asServiceRole.entities.Player.list();
          players = allPlayers.filter(p => teamIds.includes(p.team_id));
        }

        games = await base44.asServiceRole.entities.Game.filter({ organization_id: organization.id });
        const gameIds = games.map(g => g.id);

        if (gameIds.length > 0) {
          const allStats = await base44.asServiceRole.entities.PlayerGameStats.list();
          playerStats = allStats.filter(s => gameIds.includes(s.game_id));
        }

        divisions = await base44.asServiceRole.entities.Division.filter({ organization_id: organization.id });
        tournaments = await base44.asServiceRole.entities.Tournament.filter({ organization_id: organization.id });
        
        const tournamentIds = tournaments.map(t => t.id);
        if (tournamentIds.length > 0) {
          const allMatches = await base44.asServiceRole.entities.BracketMatch.list();
          bracketMatches = allMatches.filter(m => tournamentIds.includes(m.tournament_id));
        }

        socialPosts = await base44.asServiceRole.entities.SocialPost.filter({ organization_id: organization.id });
        const postIds = socialPosts.map(p => p.id);
        
        if (postIds.length > 0) {
          const allComments = await base44.asServiceRole.entities.SocialComment.list();
          socialComments = allComments.filter(c => postIds.includes(c.post_id));
          
          const allLikes = await base44.asServiceRole.entities.SocialLike.list();
          socialLikes = allLikes.filter(l => postIds.includes(l.post_id));
        }

        notifications = await base44.asServiceRole.entities.Notification.filter({ organization_id: organization.id });
        userOrganizations = await base44.asServiceRole.entities.UserOrganization.filter({ organization_id: organization.id });
        roles = await base44.asServiceRole.entities.Role.filter({ organization_id: organization.id });

        // Prepare backup data
        const backupData = {
          backup_metadata: {
            organization_id: organization.id,
            organization_name: organization.name,
            subscription_tier: organization.subscription_tier,
            backup_date: new Date().toISOString(),
            backed_up_by: 'system'
          },
          organization: organization,
          teams: teams,
          players: players,
          games: games,
          player_stats: playerStats,
          divisions: divisions,
          tournaments: tournaments,
          bracket_matches: bracketMatches,
          social_posts: socialPosts,
          social_comments: socialComments,
          social_likes: socialLikes,
          notifications: notifications,
          user_organizations: userOrganizations,
          roles: roles
        };

        // Convert to JSON and create a Blob
        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        // Upload to private storage
        const uploadResponse = await base44.asServiceRole.integrations.Core.UploadPrivateFile({
          file: blob
        });

        // Update backup history with success
        await base44.asServiceRole.entities.BackupHistory.update(backupHistory.id, {
          status: 'success',
          file_uri: uploadResponse.file_uri,
          file_size_bytes: blob.size,
          data_summary: {
            teams_count: teams.length,
            players_count: players.length,
            games_count: games.length,
            stats_count: playerStats.length
          }
        });

        results.push({
          organization: organization.name,
          status: 'success',
          backup_id: backupHistory.id
        });

      } catch (error) {
        results.push({
          organization: organization.name,
          status: 'failed',
          error: error.message
        });
      }
    }

    return Response.json({ 
      success: true,
      message: `Scheduled backup completed for ${organizationsToBackup.length} organizations`,
      results: results
    });

  } catch (error) {
    return Response.json({ 
      error: 'Scheduled backup failed', 
      details: error.message 
    }, { status: 500 });
  }
});