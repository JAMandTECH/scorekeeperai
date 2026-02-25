import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar, Filter, Trophy, ChevronDown, ChevronUp, LayoutGrid, Table } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AIGameSummary from "@/components/AIGameSummary";

export default function AllGames() {
  const [user, setUser] = useState(null);
  const [selectedSport, setSelectedSport] = useState('all');
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [expandedGame, setExpandedGame] = useState(null);
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.log("User not authenticated");
    }
  };

  // Fetch all data
  const { data: allGames = [] } = useQuery({
    queryKey: ['all-games-history'],
    queryFn: () => base44.entities.Game.list('-game_date'),
  });

  const { data: allTeams = [] } = useQuery({
    queryKey: ['all-teams-history'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['all-players-history'],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: allPlayerStats = [] } = useQuery({
    queryKey: ['all-player-stats-history'],
    queryFn: () => base44.entities.PlayerGameStats.list(),
  });

  const { data: allDivisions = [] } = useQuery({
    queryKey: ['all-divisions-history'],
    queryFn: () => base44.entities.Division.list(),
  });

  // Get unique divisions and sports
  const divisions = ['all', ...new Set(allTeams.map(t => t.division || 'No Division').filter(Boolean))];
  const sports = ['all', 'basketball', 'volleyball'];

  // Filter teams based on sport and division
  const filteredTeams = allTeams.filter(team => {
    const sportMatch = selectedSport === 'all' || team.sport === selectedSport;
    const divisionMatch = selectedDivision === 'all' || (team.division || 'No Division') === selectedDivision;
    return sportMatch && divisionMatch;
  });

  // Filter games based on selected filters
  const filteredGames = allGames.filter(game => {
    if (selectedSport !== 'all' && game.sport !== selectedSport) return false;
    
    if (selectedDivision !== 'all') {
      const homeTeam = allTeams.find(t => t.id === game.home_team_id);
      const awayTeam = allTeams.find(t => t.id === game.away_team_id);
      const homeDivision = homeTeam?.division || 'No Division';
      const awayDivision = awayTeam?.division || 'No Division';
      if (homeDivision !== selectedDivision && awayDivision !== selectedDivision) return false;
    }
    
    if (selectedTeam !== 'all') {
      if (game.home_team_id !== selectedTeam && game.away_team_id !== selectedTeam) return false;
    }
    
    return true;
  });

  const getTeamName = (teamId) => {
    const team = allTeams.find(t => t.id === teamId);
    return team?.name || 'Unknown';
  };

  const getTeamLogo = (teamId) => {
    const team = allTeams.find(t => t.id === teamId);
    return team?.logo_url || null;
  };

  const getBestPlayerForTeam = (gameId, teamId, sport) => {
    const gameStats = allPlayerStats.filter(s => s.game_id === gameId && s.team_id === teamId);
    
    if (gameStats.length === 0) return null;

    let bestPlayerStat;
    if (sport === 'basketball') {
      bestPlayerStat = gameStats.reduce((best, current) => {
        const currentPoints = current.points || 0;
        const bestPoints = best?.points || 0;
        return currentPoints > bestPoints ? current : best;
      }, null);
    } else {
      bestPlayerStat = gameStats.reduce((best, current) => {
        const currentScore = (current.field_goals_made || 0) + (current.blocks || 0) + (current.three_pointers || 0);
        const bestScore = best ? ((best.field_goals_made || 0) + (best.blocks || 0) + (best.three_pointers || 0)) : 0;
        return currentScore > bestScore ? current : best;
      }, null);
    }

    if (!bestPlayerStat) return null;

    const player = allPlayers.find(p => p.id === bestPlayerStat.player_id);
    return { player, stats: bestPlayerStat };
  };

  const getGamePlayerStats = (gameId, homeTeamId, awayTeamId) => {
    const gameStats = allPlayerStats.filter(s => s.game_id === gameId);
    
    const homeStats = gameStats
      .filter(s => s.team_id === homeTeamId)
      .map(stat => ({
        ...stat,
        player: allPlayers.find(p => p.id === stat.player_id)
      }))
      .filter(s => s.player);

    const awayStats = gameStats
      .filter(s => s.team_id === awayTeamId)
      .map(stat => ({
        ...stat,
        player: allPlayers.find(p => p.id === stat.player_id)
      }))
      .filter(s => s.player);

    return { homeStats, awayStats };
  };

  const handleDivisionChange = (division) => {
    setSelectedDivision(division);
    setSelectedTeam('all');
  };

  const handleSportChange = (sport) => {
    setSelectedSport(sport);
    setSelectedDivision('all');
    setSelectedTeam('all');
  };

  const GameCard = ({ game }) => {
    const sportColor = game.sport === 'basketball' ? 'orange' : 'blue';
    const homeTeam = allTeams.find(t => t.id === game.home_team_id);
    const awayTeam = allTeams.find(t => t.id === game.away_team_id);
    
    const homeBestPlayer = game.status === 'completed' ? getBestPlayerForTeam(game.id, game.home_team_id, game.sport) : null;
    const awayBestPlayer = game.status === 'completed' ? getBestPlayerForTeam(game.id, game.away_team_id, game.sport) : null;

    const isExpanded = expandedGame === game.id;
    const { homeStats, awayStats } = isExpanded ? getGamePlayerStats(game.id, game.home_team_id, game.away_team_id) : { homeStats: [], awayStats: [] };

    const topPlayersForAI = [];
    if (homeBestPlayer) {
      topPlayersForAI.push({
        name: `${homeBestPlayer.player?.first_name} ${homeBestPlayer.player?.last_name}`,
        team: homeTeam?.name,
        stats: game.sport === 'basketball'
          ? `${homeBestPlayer.stats.points} PTS, ${homeBestPlayer.stats.rebounds || 0} REB, ${homeBestPlayer.stats.assists || 0} AST`
          : `${homeBestPlayer.stats.field_goals_made || 0} ATK, ${homeBestPlayer.stats.blocks || 0} BLK, ${homeBestPlayer.stats.three_pointers || 0} ACE`
      });
    }
    if (awayBestPlayer) {
      topPlayersForAI.push({
        name: `${awayBestPlayer.player?.first_name} ${awayBestPlayer.player?.last_name}`,
        team: awayTeam?.name,
        stats: game.sport === 'basketball'
          ? `${awayBestPlayer.stats.points} PTS, ${awayBestPlayer.stats.rebounds || 0} REB, ${awayBestPlayer.stats.assists || 0} AST`
          : `${awayBestPlayer.stats.field_goals_made || 0} ATK, ${awayBestPlayer.stats.blocks || 0} BLK, ${awayBestPlayer.stats.three_pointers || 0} ACE`
      });
    }

    return (
      <Card className={`relative overflow-hidden border-2 border-${sportColor}-100 dark:border-${sportColor}-900 bg-gradient-to-br from-white to-${sportColor}-50 dark:from-gray-800 dark:to-${sportColor}-950/30 shadow-lg hover:shadow-2xl transition-all`}>
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-${sportColor}-500/20 to-transparent rounded-full blur-3xl`}></div>
        
        <CardHeader className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                {new Date(game.game_date).toLocaleDateString()} • {new Date(game.game_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex gap-2">
              <Badge className={`${
                game.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800' :
                game.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800' :
                'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
              } font-bold`}>
                {game.status?.replace('_', ' ').toUpperCase() || 'SCHEDULED'}
              </Badge>
              <Badge variant="outline" className={`text-${sportColor}-600 dark:text-${sportColor}-400 border-${sportColor}-600 dark:border-${sportColor}-400 font-bold`}>
                {game.sport === 'basketball' ? '🏀' : '🏐'} {game.sport}
              </Badge>
            </div>
          </div>

          {game.location && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium">📍 {game.location}</p>
          )}
        </CardHeader>

        <CardContent className="space-y-4 relative z-10">
          {/* Score Display */}
          <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-4">
            {/* Home Team */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 flex-1">
                <Avatar className="w-14 h-14 border-2 border-white dark:border-gray-700 shadow-md">
                  <AvatarImage src={homeTeam?.logo_url} />
                  <AvatarFallback className={`bg-gradient-to-br from-${sportColor}-500 to-${sportColor}-600 text-white font-bold text-sm`}>
                    {homeTeam?.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-900 dark:text-white truncate">{getTeamName(game.home_team_id)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">HOME</p>
                </div>
              </div>
              {game.status === 'completed' && (
                <div className={`text-5xl font-black text-${sportColor}-600 dark:text-${sportColor}-400`}>
                  {game.sport === 'volleyball'
                    ? ((game.quarter_scores && game.quarter_scores.length > 0)
                        ? (game.quarter_scores || []).reduce((sum, s) => sum + (s.home || 0), 0)
                        : (game.home_score ?? 0))
                    : (game.home_score ?? 0)}
                </div>
              )}
            </div>

            {/* Away Team */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <Avatar className="w-14 h-14 border-2 border-white dark:border-gray-700 shadow-md">
                  <AvatarImage src={awayTeam?.logo_url} />
                  <AvatarFallback className="bg-gradient-to-br from-gray-500 to-gray-600 text-white font-bold text-sm">
                    {awayTeam?.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-900 dark:text-white truncate">{getTeamName(game.away_team_id)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">AWAY</p>
                </div>
              </div>
              {game.status === 'completed' && (
                <div className="text-5xl font-black text-gray-900 dark:text-white">
                  {game.sport === 'volleyball'
                    ? ((game.quarter_scores && game.quarter_scores.length > 0)
                        ? (game.quarter_scores || []).reduce((sum, s) => sum + (s.away || 0), 0)
                        : (game.away_score ?? 0))
                    : (game.away_score ?? 0)}
                </div>
              )}
            </div>
          </div>

          {/* Quarter/Set Scores */}
          {game.status === 'completed' && game.quarter_scores && game.quarter_scores.length > 0 && (
            <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 font-bold mb-2">
                {game.sport === 'basketball' ? 'Quarter Scores:' : 'Set Scores:'}
              </p>
              <div className="flex flex-wrap gap-2">
                {game.quarter_scores.map((score, idx) => (
                  <div key={idx} className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-1">
                      {game.sport === 'basketball' ? `Q${score.quarter}` : `Set ${score.quarter}`}
                    </p>
                    <p className="font-black text-gray-900 dark:text-white">
                      {score.home} - {score.away}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Best Players */}
          {game.status === 'completed' && (homeBestPlayer || awayBestPlayer) && (
            <div className="space-y-2">
              <p className="text-xs text-gray-600 dark:text-gray-400 font-bold">⭐ Best Players:</p>
              
              {/* Home Best Player */}
              {homeBestPlayer && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold mb-2">{getTeamName(game.home_team_id)}</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700">
                      <AvatarImage src={homeBestPlayer.player?.photo_url} />
                      <AvatarFallback className={`bg-gradient-to-br from-${sportColor}-500 to-${sportColor}-600 text-white text-xs font-bold`}>
                        {homeBestPlayer.player?.jersey_number}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        #{homeBestPlayer.player?.jersey_number} {homeBestPlayer.player?.first_name} {homeBestPlayer.player?.last_name}
                      </p>
                      <p className="text-[10px] text-gray-600 dark:text-gray-400 font-semibold">
                        {game.sport === 'basketball' 
                          ? `${homeBestPlayer.stats.points} PTS • ${homeBestPlayer.stats.rebounds || 0} REB • ${homeBestPlayer.stats.assists || 0} AST`
                          : `${homeBestPlayer.stats.field_goals_made || 0} ATK • ${homeBestPlayer.stats.blocks || 0} BLK • ${homeBestPlayer.stats.three_pointers || 0} ACE`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Away Best Player */}
              {awayBestPlayer && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold mb-2">{getTeamName(game.away_team_id)}</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700">
                      <AvatarImage src={awayBestPlayer.player?.photo_url} />
                      <AvatarFallback className="bg-gradient-to-br from-gray-500 to-gray-600 text-white text-xs font-bold">
                        {awayBestPlayer.player?.jersey_number}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        #{awayBestPlayer.player?.jersey_number} {awayBestPlayer.player?.first_name} {awayBestPlayer.player?.last_name}
                      </p>
                      <p className="text-[10px] text-gray-600 dark:text-gray-400 font-semibold">
                        {game.sport === 'basketball' 
                          ? `${awayBestPlayer.stats.points} PTS • ${awayBestPlayer.stats.rebounds || 0} REB • ${awayBestPlayer.stats.assists || 0} AST`
                          : `${awayBestPlayer.stats.field_goals_made || 0} ATK • ${awayBestPlayer.stats.blocks || 0} BLK • ${awayBestPlayer.stats.three_pointers || 0} ACE`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* View Full Stats Button */}
          {game.status === 'completed' && (
            <Button
              variant="outline"
              className="w-full font-bold border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => setExpandedGame(isExpanded ? null : game.id)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-2" />
                  Hide Full Statistics
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  View Full Statistics
                </>
              )}
            </Button>
          )}

          {/* Expanded Stats */}
          {isExpanded && (
            <div className="space-y-4 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
              {/* Home Team Stats */}
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                  {getTeamName(game.home_team_id)} - Player Statistics
                </p>
                <div className="space-y-2">
                  {homeStats.map((stat) => (
                    <div key={stat.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 rounded-lg p-2 text-xs border border-gray-200 dark:border-gray-700">
                      <Avatar className="w-8 h-8 border border-gray-300 dark:border-gray-600">
                        <AvatarImage src={stat.player?.photo_url} />
                        <AvatarFallback className="bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-[10px] font-bold">
                          {stat.player?.jersey_number}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white truncate">
                          #{stat.player?.jersey_number} {stat.player?.first_name} {stat.player?.last_name}
                        </p>
                        <p className="text-[10px] text-gray-600 dark:text-gray-400 font-semibold">
                          {game.sport === 'basketball'
                            ? `${stat.points || 0} PTS • ${stat.rebounds || 0} REB • ${stat.assists || 0} AST • ${stat.fouls || 0} FLS`
                            : `${stat.field_goals_made || 0} ATK • ${stat.blocks || 0} BLK • ${stat.three_pointers || 0} ACE`
                          }
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Away Team Stats */}
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                  {getTeamName(game.away_team_id)} - Player Statistics
                </p>
                <div className="space-y-2">
                  {awayStats.map((stat) => (
                    <div key={stat.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 rounded-lg p-2 text-xs border border-gray-200 dark:border-gray-700">
                      <Avatar className="w-8 h-8 border border-gray-300 dark:border-gray-600">
                        <AvatarImage src={stat.player?.photo_url} />
                        <AvatarFallback className="bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-[10px] font-bold">
                          {stat.player?.jersey_number}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white truncate">
                          #{stat.player?.jersey_number} {stat.player?.first_name} {stat.player?.last_name}
                        </p>
                        <p className="text-[10px] text-gray-600 dark:text-gray-400 font-semibold">
                          {game.sport === 'basketball'
                            ? `${stat.points || 0} PTS • ${stat.rebounds || 0} REB • ${stat.assists || 0} AST • ${stat.fouls || 0} FLS`
                            : `${stat.field_goals_made || 0} ATK • ${stat.blocks || 0} BLK • ${stat.three_pointers || 0} ACE`
                          }
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AI Game Summary - NEW (only for completed games) */}
          {game.status === 'completed' && homeTeam && awayTeam && (
            <div className="mt-4">
              <AIGameSummary
                game={game}
                homeTeam={homeTeam}
                awayTeam={awayTeam}
                topPlayers={topPlayersForAI}
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const GamesTable = () => (
    <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900 border-b-2 border-gray-200 dark:border-gray-700">
                <th className="text-left py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">DATE</th>
                <th className="text-left py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">MATCH</th>
                <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">SPORT</th>
                <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">SCORE</th>
                <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">STATUS</th>
                <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {filteredGames.map((game) => {
                const sportColor = game.sport === 'basketball' ? 'orange' : 'blue';
                const homeTeam = allTeams.find(t => t.id === game.home_team_id);
                const awayTeam = allTeams.find(t => t.id === game.away_team_id);
                const isExpanded = expandedGame === game.id;
                const { homeStats, awayStats } = isExpanded ? getGamePlayerStats(game.id, game.home_team_id, game.away_team_id) : { homeStats: [], awayStats: [] };
                
                return (
                  <React.Fragment key={game.id}>
                    <tr className={`border-b border-gray-100 dark:border-gray-700 hover:bg-${sportColor}-50/50 dark:hover:bg-${sportColor}-950/20 transition-colors`}>
                      <td className="py-4 px-4 text-gray-700 dark:text-gray-300 font-semibold text-sm">
                        {new Date(game.game_date).toLocaleDateString()}
                        <br />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(game.game_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8 border-2 border-white dark:border-gray-700">
                              <AvatarImage src={homeTeam?.logo_url} />
                              <AvatarFallback className={`bg-gradient-to-br from-${sportColor}-500 to-${sportColor}-600 text-white text-xs font-bold`}>
                                {homeTeam?.name?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-bold text-gray-900 dark:text-white text-sm">{getTeamName(game.home_team_id)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8 border-2 border-white dark:border-gray-700">
                              <AvatarImage src={awayTeam?.logo_url} />
                              <AvatarFallback className="bg-gradient-to-br from-gray-500 to-gray-600 text-white text-xs font-bold">
                                {awayTeam?.name?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-bold text-gray-900 dark:text-white text-sm">{getTeamName(game.away_team_id)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Badge variant="outline" className={`text-${sportColor}-600 dark:text-${sportColor}-400 border-${sportColor}-600 dark:border-${sportColor}-400 font-bold`}>
                          {game.sport === 'basketball' ? '🏀' : '🏐'} {game.sport}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {game.status === 'completed' ? (
                          <div className="font-black text-2xl text-gray-900 dark:text-white">
                            {game.sport === 'volleyball' 
                              ? `${(game.quarter_scores || []).reduce((sum, s) => sum + (s.home || 0), 0)} - ${(game.quarter_scores || []).reduce((sum, s) => sum + (s.away || 0), 0)}`
                              : `${game.home_score} - ${game.away_score}`
                            }
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600 text-sm">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Badge className={`${
                          game.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800' :
                          game.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800' :
                          'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                        } font-bold`}>
                          {game.status?.replace('_', ' ').toUpperCase() || 'SCHEDULED'}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {game.status === 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="font-bold border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setExpandedGame(isExpanded ? null : game.id)}
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-4 h-4 mr-1" />
                                Hide
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4 mr-1" />
                                View
                              </>
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                    
                    {/* Expanded Row */}
                    {isExpanded && (
                      <tr className={`border-b-2 border-gray-200 dark:border-gray-700 bg-${sportColor}-50/30 dark:bg-${sportColor}-950/10`}>
                        <td colSpan="6" className="p-6">
                          <div className="space-y-6">
                            {/* Quarter/Set Scores */}
                            {game.quarter_scores && game.quarter_scores.length > 0 && (
                              <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                                  {game.sport === 'basketball' ? 'Quarter Scores' : 'Set Scores'}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {game.quarter_scores.map((score, idx) => (
                                    <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-3 border-2 border-gray-200 dark:border-gray-700">
                                      <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-1">
                                        {game.sport === 'basketball' ? `Q${score.quarter}` : `Set ${score.quarter}`}
                                      </p>
                                      <p className="font-black text-gray-900 dark:text-white text-lg">
                                        {score.home} - {score.away}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Player Statistics */}
                            <div className="grid md:grid-cols-2 gap-6">
                              {/* Home Team Stats */}
                              <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                                  {getTeamName(game.home_team_id)} - Player Statistics
                                </p>
                                <div className="space-y-2">
                                  {homeStats.map((stat) => (
                                    <div key={stat.id} className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-3 text-xs border border-gray-200 dark:border-gray-700">
                                      <Avatar className="w-10 h-10 border-2 border-gray-300 dark:border-gray-600">
                                        <AvatarImage src={stat.player?.photo_url} />
                                        <AvatarFallback className="bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold">
                                          {stat.player?.jersey_number}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-900 dark:text-white truncate">
                                          #{stat.player?.jersey_number} {stat.player?.first_name} {stat.player?.last_name}
                                        </p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
                                          {game.sport === 'basketball'
                                            ? `${stat.points || 0} PTS • ${stat.rebounds || 0} REB • ${stat.assists || 0} AST • ${stat.fouls || 0} FLS`
                                            : `${stat.field_goals_made || 0} ATK • ${stat.blocks || 0} BLK • ${stat.three_pointers || 0} ACE`
                                          }
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Away Team Stats */}
                              <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                                  {getTeamName(game.away_team_id)} - Player Statistics
                                </p>
                                <div className="space-y-2">
                                  {awayStats.map((stat) => (
                                    <div key={stat.id} className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-3 text-xs border border-gray-200 dark:border-gray-700">
                                      <Avatar className="w-10 h-10 border-2 border-gray-300 dark:border-gray-600">
                                        <AvatarImage src={stat.player?.photo_url} />
                                        <AvatarFallback className="bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold">
                                          {stat.player?.jersey_number}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-900 dark:text-white truncate">
                                          #{stat.player?.jersey_number} {stat.player?.first_name} {stat.player?.last_name}
                                        </p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
                                          {game.sport === 'basketball'
                                            ? `${stat.points || 0} PTS • ${stat.rebounds || 0} REB • ${stat.assists || 0} AST • ${stat.fouls || 0} FLS`
                                            : `${stat.field_goals_made || 0} ATK • ${stat.blocks || 0} BLK • ${stat.three_pointers || 0} ACE`
                                          }
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-gray-50 dark:from-gray-900 dark:via-purple-950/10 dark:to-gray-900">
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header with View Toggle */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-black text-gray-900 dark:text-white">Games History</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">
                Complete game history with detailed statistics
              </p>
            </div>

            {/* View Toggle */}
            <div className="flex bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-1 shadow-sm">
              <Button
                variant={viewMode === 'card' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('card')}
                className={`font-bold ${viewMode === 'card' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                Cards
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className={`font-bold ${viewMode === 'table' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}
              >
                <Table className="w-4 h-4 mr-2" />
                Table
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Filter className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">Filter Games</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {filteredGames.length} game{filteredGames.length !== 1 ? 's' : ''} found
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Sport Filter */}
                  <div>
                    <Label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 block">SPORT</Label>
                    <select
                      value={selectedSport}
                      onChange={(e) => handleSportChange(e.target.value)}
                      className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-3 py-2.5 font-bold shadow-sm hover:border-purple-400 dark:hover:border-purple-600 transition-colors"
                    >
                      {sports.map(sport => (
                        <option key={sport} value={sport}>
                          {sport === 'all' ? '🏀🏐 All Sports' : sport === 'basketball' ? '🏀 Basketball' : '🏐 Volleyball'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Division Filter */}
                  <div>
                    <Label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 block">DIVISION</Label>
                    <select
                      value={selectedDivision}
                      onChange={(e) => handleDivisionChange(e.target.value)}
                      className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-3 py-2.5 font-bold shadow-sm hover:border-purple-400 dark:hover:border-purple-600 transition-colors"
                    >
                      {divisions.map(div => (
                        <option key={div} value={div}>
                          {div === 'all' ? '📁 All Divisions' : div}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Team Filter */}
                  <div>
                    <Label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 block">TEAM</Label>
                    <select
                      value={selectedTeam}
                      onChange={(e) => setSelectedTeam(e.target.value)}
                      className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-3 py-2.5 font-bold shadow-sm hover:border-purple-400 dark:hover:border-purple-600 transition-colors"
                    >
                      <option value="all">👥 All Teams</option>
                      {filteredTeams.map(team => (
                        <option key={team.id} value={team.id}>
                          {team.sport === 'basketball' ? '🏀' : '🏐'} {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Active Filters */}
                {(selectedSport !== 'all' || selectedDivision !== 'all' || selectedTeam !== 'all') && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Active Filters:</span>
                    {selectedSport !== 'all' && (
                      <Badge className="bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800 font-bold">
                        {selectedSport === 'basketball' ? '🏀 Basketball' : '🏐 Volleyball'}
                        <button
                          onClick={() => handleSportChange('all')}
                          className="ml-2 hover:text-orange-900 dark:hover:text-orange-100"
                        >
                          ✕
                        </button>
                      </Badge>
                    )}
                    {selectedDivision !== 'all' && (
                      <Badge className="bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 font-bold">
                        📁 {selectedDivision}
                        <button
                          onClick={() => handleDivisionChange('all')}
                          className="ml-2 hover:text-blue-900 dark:hover:text-blue-100"
                        >
                          ✕
                        </button>
                      </Badge>
                    )}
                    {selectedTeam !== 'all' && (
                      <Badge className="bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800 font-bold">
                        👥 {getTeamName(selectedTeam)}
                        <button
                          onClick={() => setSelectedTeam('all')}
                          className="ml-2 hover:text-purple-900 dark:hover:text-purple-100"
                        >
                          ✕
                        </button>
                      </Badge>
                    )}
                    <button
                      onClick={() => {
                        setSelectedSport('all');
                        setSelectedDivision('all');
                        setSelectedTeam('all');
                      }}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-bold underline ml-2"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Games Display */}
          {filteredGames.length > 0 ? (
            viewMode === 'card' ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGames.map(game => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            ) : (
              <GamesTable />
            )
          ) : (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-12 h-12 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-xl font-bold">No games found</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                Try adjusting your filters or check back later
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}