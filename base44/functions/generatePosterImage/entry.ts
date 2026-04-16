import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    const dateStr = new Date(game.game_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Build the final prompt combining template and context
    const lines = [];
    const tmplPrompt = (tmpl?.prompt || '').trim();
    if (tmplPrompt) lines.push(tmplPrompt);
    lines.push(`Design a bold, high-energy ${game.sport} game day background for social media.`);
    lines.push(`Focus: ${game.home_team_name} vs ${game.away_team_name} (Division: ${game.division || 'N/A'}) on ${dateStr} at ${game.location || 'TBD'}.`);
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

    return Response.json({ url: gen?.url || null }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});