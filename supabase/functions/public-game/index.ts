import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) return json({ error: 'Supabase server configuration is incomplete' }, 500);

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const body = await req.json().catch(() => ({}));
    const gameId = body.game_id || body.gameId;
    if (!gameId) return json({ error: 'game_id is required' }, 400);

    const { data: game, error: gameError } = await admin
      .from('scorepilot_games')
      .select('*')
      .eq('id', gameId)
      .maybeSingle();
    if (gameError) throw gameError;
    if (!game || game.archived) return json({ error: 'Game not found' }, 404);

    const teamIds = [game.home_team_id, game.away_team_id].filter(Boolean);
    const [{ data: teams, error: teamsError }, { data: stats, error: statsError }] = await Promise.all([
      admin.from('scorepilot_teams').select('id,name,sport,division,logo_url').in('id', teamIds),
      admin.from('scorepilot_player_game_stats').select('game_id,player_id,team_id,quarter,points,rebounds,assists,steals,blocks,fouls,three_pointers,field_goals_made,field_goals_attempted,free_throws_made,free_throws_attempted,aces,attacks,rally_errors').eq('game_id', gameId),
    ]);
    if (teamsError) throw teamsError;
    if (statsError) throw statsError;

    const { data: players, error: playersError } = teamIds.length
      ? await admin.from('scorepilot_players').select('id,name,jersey_number,team_id,position,photo_url').in('team_id', teamIds)
      : { data: [], error: null };
    if (playersError) throw playersError;

    return json({
      game,
      teams: teams || [],
      players: players || [],
      stats: stats || [],
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('public-game error', error);
    return json({ error: error instanceof Error ? error.message : 'Internal error' }, 500);
  }
});
