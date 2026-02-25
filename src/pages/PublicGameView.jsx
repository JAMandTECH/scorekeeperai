import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, PlayCircle, Video, RefreshCw } from "lucide-react";
import LiveStreamEmbed from "@/components/LiveStreamEmbed";

export default function PublicGameView() {
  const [darkMode, setDarkMode] = useState(false);
  
  // Get game_id from URL
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get('game_id');

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Fetch game data with auto-refresh every 5 seconds
  const { data: game, isLoading: gameLoading, refetch } = useQuery({
    queryKey: ['public-game', gameId],
    queryFn: async () => {
      const games = await base44.entities.Game.list();
      return games.find(g => g.id === gameId);
    },
    enabled: !!gameId,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  // Fetch teams
  const { data: teams = [] } = useQuery({
    queryKey: ['public-game-teams'],
    queryFn: () => base44.entities.Team.list(),
    enabled: !!game,
  });

  // Fetch players
  const { data: players = [] } = useQuery({
    queryKey: ['public-game-players'],
    queryFn: () => base44.entities.Player.list(),
    enabled: !!game,
  });

  // Fetch player stats for this game
  const { data: playerStats = [] } = useQuery({
    queryKey: ['public-game-stats', gameId],
    queryFn: () => base44.entities.PlayerGameStats.filter({ game_id: gameId }),
    enabled: !!gameId,
    refetchInterval: 5000,
  });

  if (gameLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Game Not Found</h2>
          <Link to={createPageUrl("Home")}>
            <Button>Back to Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const homeTeam = teams.find(t => t.id === game.home_team_id);
  const awayTeam = teams.find(t => t.id === game.away_team_id);
  
  const homePlayers = players.filter(p => p.team_id === game.home_team_id);
  const awayPlayers = players.filter(p => p.team_id === game.away_team_id);

  // Calculate player totals from stats
  const getPlayerTotals = (playerId) => {
    const stats = playerStats.filter(s => s.player_id === playerId);
    return {
      points: stats.reduce((sum, s) => sum + (s.points || 0), 0),
      rebounds: stats.reduce((sum, s) => sum + (s.rebounds || 0), 0),
      assists: stats.reduce((sum, s) => sum + (s.assists || 0), 0),
      steals: stats.reduce((sum, s) => sum + (s.steals || 0), 0),
      blocks: stats.reduce((sum, s) => sum + (s.blocks || 0), 0),
      fouls: stats.reduce((sum, s) => sum + (s.fouls || 0), 0),
    };
  };

  const quarterLabel = game.sport === 'basketball' 
    ? (game.current_quarter <= 4 ? `Quarter ${game.current_quarter}` : `Overtime ${game.current_quarter - 4}`)
    : `Set ${game.current_quarter}`;

  const isLive = game.status === 'in_progress';
  const sportColor = game.sport === 'basketball' ? 'orange' : 'blue';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-black/50 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" className="text-white hover:bg-white/10">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            {isLive && (
              <Badge className="bg-red-500 text-white font-bold animate-pulse flex items-center gap-1">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                LIVE
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-white hover:bg-white/10">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Main Scoreboard */}
        <Card className={`mb-8 overflow-hidden border-2 ${isLive ? 'border-red-500/50' : 'border-gray-700'} bg-gradient-to-br from-gray-800 to-gray-900`}>
          <CardHeader className={`bg-gradient-to-r from-${sportColor}-600 to-${sportColor}-700 py-4`}>
            <div className="flex items-center justify-between">
              <Badge className="bg-white/20 text-white font-bold border-0 uppercase">
                {game.sport}
              </Badge>
              <span className="text-white font-bold">{quarterLabel}</span>
              <Badge className={`font-bold border-0 ${isLive ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                {game.status === 'completed' ? 'FINAL' : game.status === 'in_progress' ? 'LIVE' : 'SCHEDULED'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              {/* Home Team */}
              <div className="flex-1 text-center">
                <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-white/20 shadow-2xl">
                  <AvatarImage src={homeTeam?.logo_url} />
                  <AvatarFallback className={`bg-gradient-to-br from-${sportColor}-500 to-${sportColor}-600 text-white text-2xl font-black`}>
                    {homeTeam?.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-black text-white mb-1">{homeTeam?.name || 'Home Team'}</h3>
                <p className="text-gray-400 text-sm font-medium">HOME</p>
              </div>

              {/* Score */}
              <div className="flex flex-col items-center mx-8">
                <div className="text-7xl font-black text-white tracking-tight">
                  {game.sport === 'volleyball'
                    ? ((game.quarter_scores && game.quarter_scores.length > 0)
                        ? (game.quarter_scores || []).reduce((sum, s) => sum + (s.home || 0), 0)
                        : (game.home_score ?? 0))
                    : (game.home_score ?? 0)}
                  <span className="text-gray-500">-</span>
                  {game.sport === 'volleyball'
                    ? ((game.quarter_scores && game.quarter_scores.length > 0)
                        ? (game.quarter_scores || []).reduce((sum, s) => sum + (s.away || 0), 0)
                        : (game.away_score ?? 0))
                    : (game.away_score ?? 0)}
                </div>
                {game.quarter_scores && game.quarter_scores.length > 0 && (
                  <div className="flex gap-2 mt-4">
                    {game.quarter_scores.map((q, idx) => (
                      <Badge key={idx} variant="outline" className="text-white border-white/30 text-xs">
                        {game.sport === 'basketball' ? `Q${idx + 1}` : `Set ${idx + 1}`}: {q.home}-{q.away}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Away Team */}
              <div className="flex-1 text-center">
                <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-white/20 shadow-2xl">
                  <AvatarImage src={awayTeam?.logo_url} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-2xl font-black">
                    {awayTeam?.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-black text-white mb-1">{awayTeam?.name || 'Away Team'}</h3>
                <p className="text-gray-400 text-sm font-medium">AWAY</p>
              </div>
            </div>

            {/* Game Info */}
            <div className="flex justify-center gap-8 mt-6 text-sm text-gray-400">
              {game.location && <span>📍 {game.location}</span>}
              {game.court_number && <span>🏀 Court {game.court_number}</span>}
              <span>📅 {new Date(game.game_date).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Live Stream */}
        {game.stream_url && (
          <Card className="mb-8 bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-red-500" />
                Live Stream
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LiveStreamEmbed 
                streamUrl={game.stream_url} 
                gameTitle={`${homeTeam?.name} vs ${awayTeam?.name}`}
              />
            </CardContent>
          </Card>
        )}

        {/* Player Stats */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Home Team Stats */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className={`bg-gradient-to-r from-${sportColor}-600/20 to-transparent border-b border-gray-700`}>
              <CardTitle className="text-white flex items-center gap-3">
                <Avatar className="w-8 h-8 border-2 border-white/20">
                  <AvatarImage src={homeTeam?.logo_url} />
                  <AvatarFallback className={`bg-${sportColor}-600 text-white text-xs font-bold`}>
                    {homeTeam?.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {homeTeam?.name || 'Home Team'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-400">
                      <th className="text-left py-3 px-4">#</th>
                      <th className="text-left py-3 px-4">Player</th>
                      <th className="text-center py-3 px-2">PTS</th>
                      <th className="text-center py-3 px-2">REB</th>
                      <th className="text-center py-3 px-2">AST</th>
                      <th className="text-center py-3 px-2">STL</th>
                      <th className="text-center py-3 px-2">BLK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {homePlayers.map(player => {
                      const totals = getPlayerTotals(player.id);
                      return (
                        <tr key={player.id} className="border-b border-gray-700/50 hover:bg-white/5">
                          <td className="py-3 px-4 text-gray-400 font-bold">{player.jersey_number}</td>
                          <td className="py-3 px-4 text-white font-medium">{player.first_name} {player.last_name}</td>
                          <td className="text-center py-3 px-2 text-white font-bold">{totals.points}</td>
                          <td className="text-center py-3 px-2 text-gray-300">{totals.rebounds}</td>
                          <td className="text-center py-3 px-2 text-gray-300">{totals.assists}</td>
                          <td className="text-center py-3 px-2 text-gray-300">{totals.steals}</td>
                          <td className="text-center py-3 px-2 text-gray-300">{totals.blocks}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Away Team Stats */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="bg-gradient-to-r from-blue-600/20 to-transparent border-b border-gray-700">
              <CardTitle className="text-white flex items-center gap-3">
                <Avatar className="w-8 h-8 border-2 border-white/20">
                  <AvatarImage src={awayTeam?.logo_url} />
                  <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">
                    {awayTeam?.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {awayTeam?.name || 'Away Team'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-400">
                      <th className="text-left py-3 px-4">#</th>
                      <th className="text-left py-3 px-4">Player</th>
                      <th className="text-center py-3 px-2">PTS</th>
                      <th className="text-center py-3 px-2">REB</th>
                      <th className="text-center py-3 px-2">AST</th>
                      <th className="text-center py-3 px-2">STL</th>
                      <th className="text-center py-3 px-2">BLK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {awayPlayers.map(player => {
                      const totals = getPlayerTotals(player.id);
                      return (
                        <tr key={player.id} className="border-b border-gray-700/50 hover:bg-white/5">
                          <td className="py-3 px-4 text-gray-400 font-bold">{player.jersey_number}</td>
                          <td className="py-3 px-4 text-white font-medium">{player.first_name} {player.last_name}</td>
                          <td className="text-center py-3 px-2 text-white font-bold">{totals.points}</td>
                          <td className="text-center py-3 px-2 text-gray-300">{totals.rebounds}</td>
                          <td className="text-center py-3 px-2 text-gray-300">{totals.assists}</td>
                          <td className="text-center py-3 px-2 text-gray-300">{totals.steals}</td>
                          <td className="text-center py-3 px-2 text-gray-300">{totals.blocks}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}