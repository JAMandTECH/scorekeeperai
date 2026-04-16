import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { gameId, templateId } = body || {};
    if (!gameId || !templateId) {
      return Response.json({ error: 'gameId and templateId are required' }, { status: 400 });
    }

    // Get game + top players via helper function
    const topRes = await base44.functions.invoke('getTopPlayersForGame', { gameId });
    if (topRes?.status !== 200) {
      return Response.json({ error: topRes?.data?.error || 'Failed to load top players' }, { status: topRes?.status || 500 });
    }
    const { game, topPlayers } = topRes?.data || {};
    if (!game) {
      return Response.json({ error: 'Game not found or inaccessible' }, { status: 404 });
    }

    // Fetch organization and template
    const [orgArr, tmplArr] = await Promise.all([
      base44.entities.Organization.filter({ id: game.organization_id }),
      base44.entities.PosterTemplate.filter({ id: templateId })
    ]);
    const org = orgArr?.[0];
    const tmpl = tmplArr?.[0];
    if (!tmpl) {
      return Response.json({ error: 'Template not found' }, { status: 404 });
    }

    // Team names
    const [homeTeamArr, awayTeamArr] = await Promise.all([
      base44.entities.Team.filter({ id: game.home_team_id }),
      base44.entities.Team.filter({ id: game.away_team_id })
    ]);
    const homeTeamName = homeTeamArr?.[0]?.name || 'Home';
    const awayTeamName = awayTeamArr?.[0]?.name || 'Away';

    // Compute top players (top 5)
    const stats = await base44.entities.PlayerGameStats.filter({ game_id: gameId });
    const agg = new Map();
    for (const s of stats) {
      const p = agg.get(s.player_id) || {
        player_id: s.player_id,
        team_id: s.team_id,
        points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, three_pointers: 0,
        field_goals_made: 0, free_throws_made: 0,
        aces: 0, attacks: 0, rally_errors: 0,
      };
      p.points += s.points || 0;
      p.rebounds += s.rebounds || 0;
      p.assists += s.assists || 0;
      p.steals += s.steals || 0;
      p.blocks += s.blocks || 0;
      p.three_pointers += s.three_pointers || 0;
      p.field_goals_made += s.field_goals_made || 0;
      p.free_throws_made += s.free_throws_made || 0;
      p.aces += s.aces || 0;
      p.attacks += s.attacks || 0;
      p.rally_errors += s.rally_errors || 0;
      agg.set(s.player_id, p);
    }

    const scored = Array.from(agg.values()).map((p) => {
      let score = 0;
      if (game.sport === 'basketball') {
        score = (p.points || 0) * 1.0 + (p.rebounds || 0) * 0.7 + (p.assists || 0) * 0.7 + (p.steals || 0) * 0.5 + (p.blocks || 0) * 0.5 + (p.three_pointers || 0) * 0.4;
      } else if (game.sport === 'volleyball') {
        score = (p.attacks || 0) * 1.0 + (p.blocks || 0) * 0.7 + (p.aces || 0) * 0.5 - (p.rally_errors || 0) * 0.2;
      } else {
        score = (p.points || 0);
      }
      return { ...p, score };
    }).sort((a, b) => b.score - a.score).slice(0, 5);

    const topPlayers = await Promise.all(scored.map(async (p) => {
      const arr = await base44.entities.Player.filter({ id: p.player_id });
      const rec = arr?.[0];
      return {
        ...p,
        first_name: rec?.first_name || '',
        last_name: rec?.last_name || '',
        jersey_number: rec?.jersey_number || '',
        photo_url: rec?.photo_url || '',
      };
    }));

    const dateStr = new Date(game.game_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Build the final prompt combining template and context
    const lines = [];
    if (typeof tmpl.prompt === 'string' && tmpl.prompt.trim()) {
      lines.push(tmpl.prompt.trim());
    }
    lines.push(`Design a bold, high-energy ${game.sport} game day background for social media.`);
    lines.push(`Focus: ${homeTeamName} vs ${awayTeamName} (Division: ${game.division || 'N/A'}) on ${dateStr} at ${game.location || 'TBD'}.`);
    if (org?.name) lines.push(`Incorporate subtle branding for ${org.name}${org.tournament_name ? ' • ' + org.tournament_name : ''}.`);
    if (org?.theme?.primary_color) lines.push(`Use a palette influenced by ${org.theme.primary_color}, ${org.theme.secondary_color || ''}, ${org.theme.accent_color || ''}.`);
    lines.push('Leave clean negative space for overlay text (titles, scores) and 3-5 player headshots with stat lines.');
    lines.push('No text in the image itself; this is a background composition. Photorealistic lighting, pro sports poster style.');

    const playerHints = topPlayers?.slice(0, 5).map((p) => {
      if (game.sport === 'basketball') {
        return `${p.first_name} ${p.last_name} #${p.jersey_number}: ${p.points} PTS, ${p.rebounds} REB, ${p.assists} AST`;
      } else {
        return `${p.first_name} ${p.last_name} #${p.jersey_number}: ${p.attacks} ATK, ${p.blocks} BLK, ${p.aces} ACE`;
      }
    }) || [];
    if (playerHints.length) {
      lines.push('Featured players (for composition guidance, not text overlay):');
      lines.push(playerHints.join(' | '));
    }

    const finalPrompt = lines.join('\n');

    const existing = [];
    if (org?.logo_url) existing.push(org.logo_url);

    const gen = await base44.integrations.Core.GenerateImage({
      prompt: finalPrompt,
      existing_image_urls: existing.length ? existing : undefined,
    });

    if (!gen?.url) {
      return Response.json({ error: 'Image generation failed' }, { status: 502 });
    }

    return Response.json({ url: gen.url }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});