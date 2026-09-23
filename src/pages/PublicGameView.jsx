import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, PlayCircle, Video, RefreshCw, Eye, EyeOff, Maximize, Minimize } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import LiveStreamEmbed from "@/components/LiveStreamEmbed";
import ShareGameBar from "@/components/ShareGameBar";
import ScoreboardInsights from "@/components/ScoreboardInsights";
import { useFullscreen } from "@/lib/useFullscreen";
import { useGameTimer } from "@/lib/useGameTimer";
import { formatGameClock, formatShotClock } from "@/lib/timerLogic";

export default function PublicGameView() {
  const [darkMode, setDarkMode] = useState(false);
  const [hideScoreboard, setHideScoreboard] = useState(false);
  const { ref: scoreboardRef, isFullscreen: scoreboardFullscreen, toggle: toggleScoreboardFullscreen, scale: scoreboardScale, designWidth: scoreboardDesignWidth } = useFullscreen();
  
  // Get game_id from URL
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get('game_id');

  const { timer, gameClockMs, shotClockMs, gameClockRunning, shotClockRunning } = useGameTimer(gameId);

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

  // Resolve the current viewer to gate player stats (org members only).
  const { data: currentUser } = useQuery({
    queryKey: ['public-game-viewer'],
    queryFn: async () => {
      try { return await base44.auth.me(); } catch { return null; }
    },
  });

  // Fetch player stats for this game (auth + same-org enforced server-side).
  const { data: playerStats = [] } = useQuery({
    queryKey: ['public-game-stats', gameId],
    queryFn: async () => {
      const res = await base44.functions.invoke('getGamePlayerStats', { game_id: gameId });
      return res.data || [];
    },
    enabled: !!gameId && !!currentUser,
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

  // Player stats are restricted to authenticated members of the game's org.
  const canViewStats = !!currentUser && !!game && (
    Boolean(currentUser.is_super_admin) ||
    currentUser.organization_id === game.organization_id ||
    currentUser.active_organization_id === game.organization_id ||
    currentUser.data?.organization_id === game.organization_id ||
    currentUser.data?.active_organization_id === game.organization_id
  );

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

  const homeScore = game.sport === 'volleyball'
    ? ((game.quarter_scores && game.quarter_scores.length > 0)
        ? (game.quarter_scores || []).reduce((sum, s) => sum + (s.home || 0), 0)
        : (game.home_score ?? 0))
    : (game.home_score ?? 0);
  const awayScore = game.sport === 'volleyball'
    ? ((game.quarter_scores && game.quarter_scores.length > 0)
        ? (game.quarter_scores || []).reduce((sum, s) => sum + (s.away || 0), 0)
        : (game.away_score ?? 0))
    : (game.away_score ?? 0);

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
            <ShareGameBar title={`${homeTeam?.name || 'Home'} vs ${awayTeam?.name || 'Away'} — live on ScorekeeperAI`} />
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Main Scoreboard */}
        <Card ref={scoreboardRef} className={`mb-8 rounded-none border ${scoreboardFullscreen ? 'overflow-auto' : 'overflow-hidden'}`} style={{ background: '#0E0F11', display: hideScoreboard ? 'none' : 'block' }}>
          <div style={scoreboardFullscreen ? { zoom: scoreboardScale, width: `${scoreboardDesignWidth}px`, margin: '0 auto' } : undefined}>
            <CardHeader className="py-4 border-b" style={{ background: '#14181C', borderColor: '#2A2D31' }}>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-medium uppercase" style={{ borderColor: '#2A2D31', color: '#9CA3AF' }}>
                  {game.sport}
                </Badge>
                <span className="font-heading font-bold text-white">{quarterLabel}</span>
                <div className="flex items-center gap-2">
                  {isLive ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-heading font-bold uppercase tracking-widest" style={{ background: 'rgba(119,221,119,0.12)', color: '#77DD77' }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#77DD77' }} />
                      LIVE
                    </span>
                  ) : (
                    <Badge variant="outline" className="font-medium" style={{ borderColor: '#2A2D31', color: '#9CA3AF' }}>
                      {game.status === 'completed' ? 'FINAL' : 'SCHEDULED'}
                    </Badge>
                  )}
                  <Button variant="ghost" size="icon" onClick={toggleScoreboardFullscreen} className="h-7 w-7 hover:bg-white/5">
                    {scoreboardFullscreen ? <Minimize className="w-4 h-4 text-white" /> : <Maximize className="w-4 h-4 text-white" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="dark p-0">
              {/* Split panel scoreboard */}
              <div className="relative grid grid-cols-[1fr_200px_1fr]" style={{ background: '#0E0F11' }}>
                {/* Possession glow */}
                {timer?.possession === 'home' && (
                  <div className="absolute left-0 top-0 bottom-0 pointer-events-none" style={{ width: 'calc((100% - 200px) / 2)', background: 'linear-gradient(90deg, rgba(119,221,119,0.10), transparent)' }} aria-hidden />
                )}
                {timer?.possession === 'away' && (
                  <div className="absolute right-0 top-0 bottom-0 pointer-events-none" style={{ width: 'calc((100% - 200px) / 2)', background: 'linear-gradient(270deg, rgba(119,221,119,0.10), transparent)' }} aria-hidden />
                )}

                {/* Home half */}
                <div className="relative flex flex-col items-center justify-center py-10 px-6" style={{ background: '#1A1C1E' }}>
                  <Avatar className="w-20 h-20 mb-4" style={{ border: '1px solid rgba(255,255,255,0.10)' }}>
                    <AvatarImage src={homeTeam?.logo_url} />
                    <AvatarFallback className="text-2xl font-heading font-bold" style={{ background: '#2A2D31', color: '#fff' }}>
                      {homeTeam?.name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-lg font-heading font-bold text-white mb-2 text-center flex items-center gap-2">
                    {timer?.possession === 'home' && <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#77DD77', boxShadow: '0 0 8px #77DD77' }} />}
                    {homeTeam?.name || 'Home Team'}
                  </h3>
                  <span className="text-[10px] font-heading font-bold uppercase tracking-widest px-3 py-1 mb-8" style={{ background: '#2A2D31', color: '#9CA3AF' }}>HOME</span>
                  <div className="font-heading font-bold tabular-nums leading-none text-white" style={{ fontSize: '7rem' }}>
                    {homeScore}
                  </div>
                </div>

                {/* Center clock column */}
                <div className="relative flex flex-col items-center justify-center px-4 py-8" style={{ background: '#0E0F11', borderLeft: '1px solid #77DD77', borderRight: '1px solid #77DD77' }}>
                  {timer ? (
                    <>
                      <p className="text-[10px] font-heading font-bold uppercase tracking-widest mb-1" style={{ color: '#9CA3AF' }}>Game Clock</p>
                      <div className={`font-heading font-bold tabular-nums leading-none mb-4 ${gameClockRunning ? 'text-primary' : 'text-white'}`} style={{ fontSize: '2.5rem' }}>
                        {formatGameClock(gameClockMs)}
                      </div>
                      <span className="px-3 py-1 text-[10px] font-heading font-bold uppercase tracking-widest mb-4 border" style={{ borderColor: '#77DD77', color: '#77DD77', background: 'rgba(119,221,119,0.08)' }}>
                        {quarterLabel}
                      </span>
                      {(timer.shot_clock_length_seconds || 0) > 0 && (
                        <>
                          <p className="text-[10px] font-heading font-bold uppercase tracking-widest mb-1" style={{ color: '#9CA3AF' }}>Shot Clock</p>
                          <div className={`font-heading font-bold tabular-nums leading-none ${shotClockRunning ? 'text-destructive' : 'text-white'}`} style={{ fontSize: '2rem' }}>
                            {formatShotClock(shotClockMs)}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <span className="px-3 py-1 text-[10px] font-heading font-bold uppercase tracking-widest border text-center" style={{ borderColor: '#77DD77', color: '#77DD77', background: 'rgba(119,221,119,0.08)' }}>
                      {quarterLabel}
                    </span>
                  )}
                </div>

                {/* Away half */}
                <div className="relative flex flex-col items-center justify-center py-10 px-6" style={{ background: '#16191B' }}>
                  <Avatar className="w-20 h-20 mb-4" style={{ border: '1px solid rgba(255,255,255,0.10)' }}>
                    <AvatarImage src={awayTeam?.logo_url} />
                    <AvatarFallback className="text-2xl font-heading font-bold" style={{ background: '#2A2D31', color: '#fff' }}>
                      {awayTeam?.name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-lg font-heading font-bold text-white mb-2 text-center flex items-center gap-2">
                    {timer?.possession === 'away' && <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#77DD77', boxShadow: '0 0 8px #77DD77' }} />}
                    {awayTeam?.name || 'Away Team'}
                  </h3>
                  <span className="text-[10px] font-heading font-bold uppercase tracking-widest px-3 py-1 mb-8" style={{ background: '#2A2D31', color: '#9CA3AF' }}>AWAY</span>
                  <div className="font-heading font-bold tabular-nums leading-none text-white" style={{ fontSize: '7rem' }}>
                    {awayScore}
                  </div>
                </div>
              </div>

              {/* Quarter scores */}
              {game.quarter_scores && game.quarter_scores.length > 0 && (
                <div className="flex justify-center gap-2 py-3 border-t flex-wrap" style={{ background: '#0E0F11', borderColor: '#2A2D31' }}>
                  {game.quarter_scores.map((q, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs font-medium" style={{ borderColor: '#2A2D31', color: '#9CA3AF' }}>
                      {game.sport === 'basketball' ? `Q${idx + 1}` : `Set ${idx + 1}`}: {q.home}-{q.away}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Insights footer */}
              <ScoreboardInsights game={game} players={players} playerStats={playerStats} />
            </CardContent>
          </div>
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

        {/* Player Stats — gated to org members */}
        {canViewStats ? (
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
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground font-medium mb-1">Player statistics are available to organization members only.</p>
              <p className="text-muted-foreground text-sm">Sign in with the organization's account to view detailed stats.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}