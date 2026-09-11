import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, PlayCircle, Video, RefreshCw, Eye, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import LiveStreamEmbed from "@/components/LiveStreamEmbed";

export default function PublicGameView() {
  const [darkMode, setDarkMode] = useState(false);
  const [hideScoreboard, setHideScoreboard] = useState(false);
  
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

  // Fetch player stats for this game via backend function (public-safe)
  const { data: playerStats = [] } = useQuery({
    queryKey: ['public-game-stats', gameId],
    queryFn: async () => {
      const res = await base44.functions.invoke('getGamePlayerStats', { game_id: gameId });
      return res.data || [];
    },
    enabled: !!gameId,
    refetchInterval: 5000,
  });

  if (gameLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center border border-border">
          <h2 className="font-heading text-2xl font-bold mb-4">Game Not Found</h2>
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            {game.stream_url && (
              <div className="flex items-center gap-2 px-3 py-1.5 border border-border">
                {hideScoreboard ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4" />}
                <Switch
                  checked={!hideScoreboard}
                  onCheckedChange={(checked) => setHideScoreboard(!checked)}
                  id="scoreboard-toggle"
                />
                <Label htmlFor="scoreboard-toggle" className="text-xs font-medium cursor-pointer whitespace-nowrap">
                  {hideScoreboard ? "Scoreboard Hidden" : "Scoreboard Visible"}
                </Label>
              </div>
            )}
            {isLive && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <span className="live-dot" />
                LIVE
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Main Scoreboard */}
        <Card className={`mb-8 overflow-hidden ${isLive ? 'border-primary' : ''}`} style={{ display: hideScoreboard ? 'none' : 'block' }}>
          <CardHeader className="bg-muted border-b border-border py-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="font-medium uppercase border-border text-muted-foreground">
                {game.sport}
              </Badge>
              <span className="font-heading font-bold text-foreground">{quarterLabel}</span>
              <Badge variant="outline" className={`font-medium ${isLive ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}>
                {game.status === 'completed' ? 'FINAL' : game.status === 'in_progress' ? 'LIVE' : 'SCHEDULED'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              {/* Home Team */}
              <div className="flex-1 text-center">
                <Avatar className="w-24 h-24 mx-auto mb-4 border border-border">
                  <AvatarImage src={homeTeam?.logo_url} />
                  <AvatarFallback className="bg-secondary text-foreground text-2xl font-heading font-bold">
                    {homeTeam?.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-heading font-bold text-foreground mb-1">{homeTeam?.name || 'Home Team'}</h3>
                <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">HOME</p>
              </div>

              {/* Score */}
              <div className="flex flex-col items-center mx-8">
                <div className="text-7xl font-heading font-bold text-foreground tracking-tight tabular-nums">
                  {game.sport === 'volleyball'
                    ? ((game.quarter_scores && game.quarter_scores.length > 0)
                        ? (game.quarter_scores || []).reduce((sum, s) => sum + (s.home || 0), 0)
                        : (game.home_score ?? 0))
                    : (game.home_score ?? 0)}
                  <span className="text-muted-foreground">-</span>
                  {game.sport === 'volleyball'
                    ? ((game.quarter_scores && game.quarter_scores.length > 0)
                        ? (game.quarter_scores || []).reduce((sum, s) => sum + (s.away || 0), 0)
                        : (game.away_score ?? 0))
                    : (game.away_score ?? 0)}
                </div>
                {game.quarter_scores && game.quarter_scores.length > 0 && (
                  <div className="flex gap-2 mt-4">
                    {game.quarter_scores.map((q, idx) => (
                      <Badge key={idx} variant="outline" className="border-border text-muted-foreground text-xs font-medium">
                        {game.sport === 'basketball' ? `Q${idx + 1}` : `Set ${idx + 1}`}: {q.home}-{q.away}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Away Team */}
              <div className="flex-1 text-center">
                <Avatar className="w-24 h-24 mx-auto mb-4 border border-border">
                  <AvatarImage src={awayTeam?.logo_url} />
                  <AvatarFallback className="bg-secondary text-foreground text-2xl font-heading font-bold">
                    {awayTeam?.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-heading font-bold text-foreground mb-1">{awayTeam?.name || 'Away Team'}</h3>
                <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">AWAY</p>
              </div>
            </div>

            {/* Game Info */}
            <div className="flex justify-center gap-8 mt-6 text-sm text-muted-foreground">
              {game.location && <span>{game.location}</span>}
              {game.court_number && <span>Court {game.court_number}</span>}
              <span>{new Date(game.game_date).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Live Stream */}
        {game.stream_url && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                Live Stream
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LiveStreamEmbed 
                streamUrl={game.stream_url} 
                gameTitle={`${homeTeam?.name} vs ${awayTeam?.name}`}
                game={game}
                showScoreOverlay
              />
            </CardContent>
          </Card>
        )}

        {/* Player Stats */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Home Team Stats */}
          <Card>
            <CardHeader className="bg-muted border-b border-border">
              <CardTitle className="flex items-center gap-3">
                <Avatar className="w-8 h-8 border border-border">
                  <AvatarImage src={homeTeam?.logo_url} />
                  <AvatarFallback className="bg-secondary text-foreground text-xs font-heading font-bold">
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
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-3 px-4 font-heading font-bold">#</th>
                      <th className="text-left py-3 px-4 font-heading font-bold">Player</th>
                      <th className="text-center py-3 px-2 font-heading font-bold">PTS</th>
                      <th className="text-center py-3 px-2 font-heading font-bold">REB</th>
                      <th className="text-center py-3 px-2 font-heading font-bold">AST</th>
                      <th className="text-center py-3 px-2 font-heading font-bold">STL</th>
                      <th className="text-center py-3 px-2 font-heading font-bold">BLK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {homePlayers.map(player => {
                      const totals = getPlayerTotals(player.id);
                      return (
                        <tr key={player.id} className="border-b border-border hover:bg-muted/50">
                          <td className="py-3 px-4 text-muted-foreground font-heading font-bold">{player.jersey_number}</td>
                          <td className="py-3 px-4 text-foreground font-medium">{player.first_name} {player.last_name}</td>
                          <td className="text-center py-3 px-2 text-foreground font-heading font-bold tabular-nums">{totals.points}</td>
                          <td className="text-center py-3 px-2 text-foreground tabular-nums">{totals.rebounds}</td>
                          <td className="text-center py-3 px-2 text-foreground tabular-nums">{totals.assists}</td>
                          <td className="text-center py-3 px-2 text-foreground tabular-nums">{totals.steals}</td>
                          <td className="text-center py-3 px-2 text-foreground tabular-nums">{totals.blocks}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Away Team Stats */}
          <Card>
            <CardHeader className="bg-muted border-b border-border">
              <CardTitle className="flex items-center gap-3">
                <Avatar className="w-8 h-8 border border-border">
                  <AvatarImage src={awayTeam?.logo_url} />
                  <AvatarFallback className="bg-secondary text-foreground text-xs font-heading font-bold">
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
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-3 px-4 font-heading font-bold">#</th>
                      <th className="text-left py-3 px-4 font-heading font-bold">Player</th>
                      <th className="text-center py-3 px-2 font-heading font-bold">PTS</th>
                      <th className="text-center py-3 px-2 font-heading font-bold">REB</th>
                      <th className="text-center py-3 px-2 font-heading font-bold">AST</th>
                      <th className="text-center py-3 px-2 font-heading font-bold">STL</th>
                      <th className="text-center py-3 px-2 font-heading font-bold">BLK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {awayPlayers.map(player => {
                      const totals = getPlayerTotals(player.id);
                      return (
                        <tr key={player.id} className="border-b border-border hover:bg-muted/50">
                          <td className="py-3 px-4 text-muted-foreground font-heading font-bold">{player.jersey_number}</td>
                          <td className="py-3 px-4 text-foreground font-medium">{player.first_name} {player.last_name}</td>
                          <td className="text-center py-3 px-2 text-foreground font-heading font-bold tabular-nums">{totals.points}</td>
                          <td className="text-center py-3 px-2 text-foreground tabular-nums">{totals.rebounds}</td>
                          <td className="text-center py-3 px-2 text-foreground tabular-nums">{totals.assists}</td>
                          <td className="text-center py-3 px-2 text-foreground tabular-nums">{totals.steals}</td>
                          <td className="text-center py-3 px-2 text-foreground tabular-nums">{totals.blocks}</td>
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