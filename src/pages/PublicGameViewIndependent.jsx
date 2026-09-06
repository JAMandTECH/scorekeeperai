import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Video, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import LiveStreamEmbed from '@/components/LiveStreamEmbed';

const loadPublicGame = async (gameId) => {
  const { data, error } = await supabase.functions.invoke('public-game', { body: { game_id: gameId } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
};

const sum = (rows, key) => rows.reduce((total, row) => total + (Number(row?.[key]) || 0), 0);

export default function PublicGameViewIndependent() {
  const gameId = new URLSearchParams(window.location.search).get('game_id');
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['scorepilot-public-game', gameId],
    queryFn: () => loadPublicGame(gameId),
    enabled: Boolean(gameId),
    refetchInterval: 5000,
  });

  if (!gameId) return <PublicError message="A game_id is required." />;
  if (isLoading) return <PublicLoading />;
  if (error || !data?.game) return <PublicError message={error?.message || 'Game not found.'} />;

  const game = data.game;
  const teams = data.teams || [];
  const players = data.players || [];
  const stats = data.stats || [];
  const homeTeam = teams.find((team) => team.id === game.home_team_id);
  const awayTeam = teams.find((team) => team.id === game.away_team_id);
  const homePlayers = players.filter((player) => player.team_id === game.home_team_id);
  const awayPlayers = players.filter((player) => player.team_id === game.away_team_id);
  const isLive = game.status === 'in_progress';
  const isVolleyball = game.sport === 'volleyball';
  const homeScore = Number(game.home_score || 0);
  const awayScore = Number(game.away_score || 0);

  const teamTotals = (player) => {
    const rows = stats.filter((row) => row.player_id === player.id);
    return {
      points: sum(rows, 'points'),
      rebounds: sum(rows, 'rebounds'),
      assists: sum(rows, 'assists'),
      steals: sum(rows, 'steals'),
      blocks: sum(rows, 'blocks'),
    };
  };

  const quarterLabel = isVolleyball
    ? `Set ${game.current_quarter || 1}`
    : (game.current_quarter || 1) <= 4 ? `Quarter ${game.current_quarter || 1}` : `Overtime ${(game.current_quarter || 1) - 4}`;

  const scoreDisplay = isVolleyball && Array.isArray(game.quarter_scores) && game.quarter_scores.length
    ? `${sum(game.quarter_scores, 'home')} - ${sum(game.quarter_scores, 'away')}`
    : `${homeScore} - ${awayScore}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/50 backdrop-blur-xl px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/">
            <Button variant="ghost" className="text-white hover:bg-white/10"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
          </Link>
          <div className="flex items-center gap-2">
            {isLive && <Badge className="bg-red-500 text-white animate-pulse">LIVE</Badge>}
            <Badge variant="outline" className="border-white/20 text-white">{game.sport}</Badge>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-white hover:bg-white/10" disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <Card className="overflow-hidden border-white/10 bg-white/[0.04] text-white shadow-2xl">
          <CardHeader className="border-b border-white/10 bg-gradient-to-r from-red-600/80 via-orange-500/70 to-red-600/80">
            <div className="flex items-center justify-between gap-4">
              <Badge className="bg-white/15 text-white uppercase">{game.sport}</Badge>
              <span className="font-semibold">{quarterLabel}</span>
              <Badge className={isLive ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}>{isLive ? 'LIVE' : game.status === 'completed' ? 'FINAL' : 'SCHEDULED'}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6">
              <PublicTeam team={homeTeam} label="HOME" />
              <div className="text-center">
                <div className="text-5xl sm:text-7xl font-black tracking-tight">{scoreDisplay}</div>
                {Array.isArray(game.quarter_scores) && game.quarter_scores.length > 0 && (
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {game.quarter_scores.map((score, index) => (
                      <Badge key={index} variant="outline" className="border-white/20 text-white/80">
                        {isVolleyball ? `S${index + 1}` : `Q${index + 1}`}: {score.home}-{score.away}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <PublicTeam team={awayTeam} label="AWAY" />
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-5 text-sm text-white/60">
              {game.location && <span>📍 {game.location}</span>}
              {game.court_number && <span>🏟️ Court {game.court_number}</span>}
              {game.game_date && <span>📅 {new Date(game.game_date).toLocaleString()}</span>}
            </div>
          </CardContent>
        </Card>

        {game.stream_url && (
          <Card className="border-white/10 bg-white/[0.04] text-white">
            <CardHeader><CardTitle className="flex items-center gap-2"><Video className="h-5 w-5 text-red-400" />Live Stream</CardTitle></CardHeader>
            <CardContent><LiveStreamEmbed streamUrl={game.stream_url} gameTitle={`${homeTeam?.name || 'Home'} vs ${awayTeam?.name || 'Away'}`} /></CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <PlayerTable title={homeTeam?.name || 'Home Team'} players={homePlayers} totals={teamTotals} sport={game.sport} />
          <PlayerTable title={awayTeam?.name || 'Away Team'} players={awayPlayers} totals={teamTotals} sport={game.sport} />
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-white/40"><Trophy className="h-4 w-4" />Powered by ScorePilot AI</div>
      </main>
    </div>
  );
}

function PublicTeam({ team, label }) {
  const name = team?.name || label;
  return (
    <div className="text-center">
      <Avatar className="mx-auto mb-3 h-20 w-20 border-4 border-white/10 sm:h-24 sm:w-24">
        <AvatarImage src={team?.logo_url || undefined} />
        <AvatarFallback className="bg-slate-800 text-xl font-black">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="text-lg font-black sm:text-2xl">{name}</div>
      <div className="mt-1 text-xs font-semibold tracking-wider text-white/50">{label}</div>
    </div>
  );
}

function PlayerTable({ title, players, totals, sport }) {
  return (
    <Card className="border-white/10 bg-white/[0.04] text-white">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/10 text-white/50"><th className="px-4 py-3 text-left">#</th><th className="px-4 py-3 text-left">Player</th><th className="px-2 py-3">PTS</th><th className="px-2 py-3">AST</th><th className="px-2 py-3">REB</th><th className="px-2 py-3">STL</th><th className="px-2 py-3">BLK</th></tr></thead>
            <tbody>
              {players.map((player) => {
                const t = totals(player);
                return <tr key={player.id} className="border-b border-white/5 last:border-0"><td className="px-4 py-3 text-white/60">{player.jersey_number || '-'}</td><td className="px-4 py-3 font-medium">{player.name}</td><td className="px-2 py-3 text-center font-bold">{t.points}</td><td className="px-2 py-3 text-center">{sport === 'basketball' ? t.assists : '-'}</td><td className="px-2 py-3 text-center">{sport === 'basketball' ? t.rebounds : '-'}</td><td className="px-2 py-3 text-center">{sport === 'basketball' ? t.steals : '-'}</td><td className="px-2 py-3 text-center">{sport === 'basketball' ? t.blocks : '-'}</td></tr>;
              })}
              {!players.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-white/40">No player statistics recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function PublicLoading() {
  return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-white" /></div>;
}

function PublicError({ message }) {
  return <div className="min-h-screen bg-slate-950 px-4 flex items-center justify-center"><Card className="max-w-md border-white/10 bg-white/[0.04] text-white"><CardContent className="p-8 text-center"><h1 className="text-2xl font-black">Game Not Available</h1><p className="mt-3 text-white/60">{message}</p><Link to="/" className="mt-6 inline-flex"><Button>Back to ScorePilot</Button></Link></CardContent></Card></div>;
}
