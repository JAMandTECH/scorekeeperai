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
    const { gameId, templateId, posterStyle } = body || {};
    if (!gameId || !templateId) {
      return Response.json({ error: 'gameId and templateId are required' }, { status: 400 });
    }

    // Get game via helper function
    const topRes = await base44.functions.invoke('getTopPlayersForGame', { gameId });
    const { game } = topRes?.data || {};
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

    // Build the final prompt: team atmosphere only, no game details or stat/player content
    const lines = [];
    if (typeof tmpl.prompt === 'string' && tmpl.prompt.trim()) {
      lines.push(tmpl.prompt.trim());
    }
    lines.push(
      posterStyle === 'best_player'
        ? `Create a championship award-night arena background for a single-player ${game.sport} MVP poster.`
        : `Create a bold, high-energy ${game.sport} team-atmosphere background for a game day social poster.`
    );
    lines.push(`Team atmosphere: ${game.home_team_name} and ${game.away_team_name}${game.division ? `, ${game.division} division` : ''}.`);
    if (org?.name) lines.push(`Club atmosphere: ${org.name}${org.tournament_name ? ' • ' + org.tournament_name : ''}.`);
    const palette = [org?.theme?.primary_color, org?.theme?.secondary_color, org?.theme?.accent_color].filter(Boolean);
    if (palette.length) lines.push(`Color palette dominated by ${palette.join(', ')}.`);
    lines.push(
      posterStyle === 'best_player'
        ? 'Mood: golden stage spotlight, warm trophy-night haze, deep shadowed edges, celebratory gold light rays, distant blurred crowd silhouettes.'
        : 'Mood: dramatic arena environment — stadium spotlights, haze, crowd silhouettes, polished court or net surface texture, motion energy.'
    );
    lines.push('Strictly no text, lettering, numbers, jerseys or jersey numbers, scoreboards, dates, locations, signage, logos, watermarks, or any readable wording anywhere in the image.');
    lines.push('Empty unpopulated court: no players and no foreground figures; the crowd may appear only as distant blurred silhouettes.');
    lines.push('Do not copy any logo, lettering, or wording from the reference image; use only its colors.');
    lines.push('Leave generous clean negative space for later overlay text and player photos.');
    lines.push('Photorealistic cinematic lighting, premium pro sports poster background, high resolution, crisp detail, no grain or blur.');

    const finalPrompt = lines.join('\n');

    const existing = [];
    if (org?.logo_url) existing.push(org.logo_url);

    const gen = await base44.integrations.Core.GenerateImage({
      prompt: finalPrompt,
      existing_image_urls: existing.length ? existing : undefined,
    });

    return Response.json({ url: gen?.url || null }, { status: 200 });
  } catch (error) {
    console.error('generatePosterImage error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});