import React, { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Trophy, ChevronDown, ChevronUp, LayoutGrid, Table as TableIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AIGameSummary from "@/components/AIGameSummary";

export default function GameHistory({ 
  completedGames, 
  teams, 
  allPlayers, 
  allPlayerStats,
  selectedSport,
  selectedDivision,
  selectedTeam,
  onSportChange,
  onDivisionChange,
  onTeamChange 
}) {
  const [expandedGame, setExpandedGame] = useState(null);
  const [viewMode, setViewMode] = useState('card');
  const [statsByGame, setStatsByGame] = useState({});
  const [loadingGame, setLoadingGame] = useState(null);
  const [statsError, setStatsError] = useState({});
  const [extraPlayers, setExtraPlayers] = useState([]);
  const rosterCacheRef = useRef({});

  // Fast lookup for players by ID
  const playerById = useMemo(() => {
    const map = {};
    ([...(allPlayers || []), ...(extraPlayers || [])]).forEach(p => { if (p?.id) map[p.id] = p; });
    return map;
  }, [allPlayers, extraPlayers]);

  const fetchStatsForGame = async (gameId) => {
    setLoadingGame(gameId);
    setStatsError((prev) => ({ ...prev, [gameId]: null }));
    const delays = [0, 1000, 2000, 4000, 8000];
    for (let i = 0; i < delays.length; i++) {
      if (delays[i]) await new Promise((r) => setTimeout(r, delays[i]));
      try {
        const res = await base44.entities.PlayerGameStats.filter({ game_id: gameId }, '-updated_date', 200);
        let arr = Array.isArray(res) ? res : [];
        // Fallback to backend function (with retries) if direct query returns nothing
        if (!arr.length) {
          try {
            const resp = await base44.functions.invoke('getGamePlayerStats', { game_id: gameId });
            const fromFn = Array.isArray(resp?.data) ? resp.data : [];
            if (fromFn.length) arr = fromFn;
          } catch (_) {}
        }
        setStatsByGame((prev) => ({ ...prev, [gameId]: arr }));
        setLoadingGame(null);
        return;
      } catch (e) {
        if (i === delays.length - 1) {
          setStatsError((prev) => ({ ...prev, [gameId]: e?.message || 'Failed to load' }));
          setLoadingGame(null);
        }
      }
    }
  };

  useEffect(() => {
    if (!expandedGame) return;
    if (!statsByGame[expandedGame] || statsByGame[expandedGame].length === 0) {
      fetchStatsForGame(expandedGame);
    }
  }, [expandedGame]);

  // Ensure player details exist for all stats in the expanded game
  useEffect(() => {
    if (!expandedGame) return;
    const baseStats = (statsByGame[expandedGame] && statsByGame[expandedGame].length > 0)
      ? statsByGame[expandedGame]
      : (allPlayerStats || []).filter(s => s.game_id === expandedGame);
    if (!baseStats || baseStats.length === 0) return;
    const missingIds = Array.from(new Set(baseStats.map(s => s.player_id).filter(id => !playerById[id])));
    if (missingIds.length === 0) return;

    (async () => {
      try {
        const all = await base44.entities.Player.list();
        const needed = all.filter(p => missingIds.includes(p.id));
        if (needed.length) {
          setExtraPlayers(prev => {
            const existing = new Set(prev.map(p => p.id));
            const combined = [...prev];
            needed.forEach(p => { if (!existing.has(p.id)) combined.push(p); });
            return combined;
          });
        }
      } catch (_) {
        // silent fail - stats will still show numbers
      }
    })();
  }, [expandedGame, statsByGame, allPlayerStats, playerById]);

  // Prefetch rosters for expanded game's teams to restore names quickly
  useEffect(() => {
    if (!expandedGame) return;
    const game = (completedGames || []).find(g => g.id === expandedGame);
    if (!game) return;
    const teamIds = [game.home_team_id, game.away_team_id].filter(Boolean);
    const toFetch = teamIds.filter(id => !rosterCacheRef.current[id]);
    if (toFetch.length === 0) return;

    (async () => {
      try {
        const results = await Promise.all(
          toFetch.map(id => base44.entities.Player.filter({ team_id: id }, '-created_date', 200))
        );
        results.forEach((list, idx) => { rosterCacheRef.current[toFetch[idx]] = list || []; });
        const merge = results.flat().filter(Boolean);
        if (merge.length) {
          setExtraPlayers(prev => {
            const existing = new Set(prev.map(p => p.id));
            const combined = [...prev];
            merge.forEach(p => { if (p?.id && !existing.has(p.id)) combined.push(p); });
            return combined;
          });
        }
      } catch (_) {
        // ignore - UI still shows totals
      }
    })();
  }, [expandedGame, completedGames]);

  // Get unique divisions for filters
  const divisions = ['all', ...new Set(teams.map(t => t.division || 'No Division').filter(Boolean))];

  // Filter teams based on sport and division
  const filteredTeams = teams.filter(team => {
    const sportMatch = selectedSport === 'all' || team.sport === selectedSport;
    const divisionMatch = selectedDivision === 'all' || (team.division || 'No Division') === selectedDivision;
    return sportMatch && divisionMatch;
  });

  // Filter games
  const filteredGames = completedGames.filter(game => {
    if (selectedSport !== 'all' && game.sport !== selectedSport) return false;
    
    if (selectedDivision !== 'all') {
      const homeTeam = teams.find(t => t.id === game.home_team_id);
      const awayTeam = teams.find(t => t.id === game.away_team_id);
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
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Unknown';
  };

  const getBestPlayerForTeam = (gameId, teamId, sport) => {
    const pool = (statsByGame[gameId] && statsByGame[gameId].length > 0) ? statsByGame[gameId] : allPlayerStats;
    const gameStats = pool.filter(s => s.game_id === gameId && s.team_id === teamId);

    if (gameStats.length === 0) return null;

    // Aggregate per player across all quarters/sets
    const totalsByPlayer = {};
    for (const s of gameStats) {
      const pid = s.player_id;
      if (!totalsByPlayer[pid]) {
        totalsByPlayer[pid] = {
          player_id: pid,
          team_id: teamId,
          points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, fouls: 0,
          attacks: 0, aces: 0, rally_errors: 0
        };
      }
      const t = totalsByPlayer[pid];
      t.points += s.points || 0;
      t.rebounds += s.rebounds || 0;
      t.assists += s.assists || 0;
      t.steals += s.steals || 0;
      t.blocks += s.blocks || 0;
      t.fouls += s.fouls || 0;
      t.attacks += s.attacks || 0;
      t.aces += s.aces || 0;
      t.rally_errors += s.rally_errors || 0;
    }

    const values = Object.values(totalsByPlayer);
    let best = null;
    if (sport === 'basketball') {
      best = values.reduce((b, c) => (c.points || 0) > ((b?.points) || 0) ? c : b, null);
    } else {
      best = values.reduce((b, c) => {
        const cScore = (c.attacks || 0) + (c.blocks || 0) + (c.aces || 0);
        const bScore = b ? ((b.attacks || 0) + (b.blocks || 0) + (b.aces || 0)) : 0;
        return cScore > bScore ? c : b;
      }, null);
    }
    if (!best) return null;
    const player = playerById[best.player_id] || null;
    return { player, stats: best };
  };

  const getGamePlayerStats = (gameId, homeTeamId, awayTeamId) => {
    const gameStats = (statsByGame[gameId] && statsByGame[gameId].length > 0)
      ? statsByGame[gameId]
      : allPlayerStats.filter(s => s.game_id === gameId);

    const aggregateTeam = (teamId) => {
      const totals = {};
      gameStats.filter(s => s.team_id === teamId).forEach(s => {
        const pid = s.player_id;
        if (!totals[pid]) {
          totals[pid] = {
            player_id: pid,
            team_id: teamId,
            points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, fouls: 0,
            attacks: 0, aces: 0, rally_errors: 0,
          };
        }
        const t = totals[pid];
        t.points += s.points || 0;
        t.rebounds += s.rebounds || 0;
        t.assists += s.assists || 0;
        t.steals += s.steals || 0;
        t.blocks += s.blocks || 0;
        t.fouls += s.fouls || 0;
        t.attacks += s.attacks || 0;
        t.aces += s.aces || 0;
        t.rally_errors += s.rally_errors || 0;
      });
      // Map to array and attach player object
      return Object.values(totals).map(stat => ({
        ...stat,
        player: playerById[stat.player_id] || null
      }));
    };

    const homeStats = aggregateTeam(homeTeamId);
    const awayStats = aggregateTeam(awayTeamId);
    return { homeStats, awayStats };
  };

  const GameCard = ({ game }) => {
    const sportColor = game.sport === 'basketball' ? 'orange' : 'blue';
    const homeTeam = teams.find(t => t.id === game.home_team_id);
    const awayTeam = teams.find(t => t.id === game.away_team_id);
    const homeBestPlayer = getBestPlayerForTeam(game.id, game.home_team_id, game.sport);
    const awayBestPlayer = getBestPlayerForTeam(game.id, game.away_team_id, game.sport);
    const isExpanded = expandedGame === game.id;
    const { homeStats, awayStats } = isExpanded ? getGamePlayerStats(game.id, game.home_team_id, game.away_team_id) : { homeStats: [], awayStats: [] };

    const topPlayersForAI = [];
    if (homeBestPlayer) {
      topPlayersForAI.push({
        name: `${homeBestPlayer.player?.first_name} ${homeBestPlayer.player?.last_name}`,
        team: homeTeam?.name,
        stats: game.sport === 'basketball'
          ? `${homeBestPlayer.stats.points} PTS, ${homeBestPlayer.stats.rebounds || 0} REB, ${homeBestPlayer.stats.assists || 0} AST`
          : `${homeBestPlayer.stats.attacks || 0} ATK, ${homeBestPlayer.stats.blocks || 0} BLK, ${homeBestPlayer.stats.aces || 0} ACE`
      });
    }
    if (awayBestPlayer) {
      topPlayersForAI.push({
        name: `${awayBestPlayer.player?.first_name} ${awayBestPlayer.player?.last_name}`,
        team: awayTeam?.name,
        stats: game.sport === 'basketball'
          ? `${awayBestPlayer.stats.points} PTS, ${awayBestPlayer.stats.rebounds || 0} REB, ${awayBestPlayer.stats.assists || 0} AST`
          : `${awayBestPlayer.stats.attacks || 0} ATK, ${awayBestPlayer.stats.blocks || 0} BLK, ${awayBestPlayer.stats.aces || 0} ACE`
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
            <Badge variant="outline" className={`text-${sportColor}-600 dark:text-${sportColor}-400 border-${sportColor}-600 dark:border-${sportColor}-400 font-bold`}>
              {game.sport === 'basketball' ? '🏀' : '🏐'} {game.sport}
            </Badge>
          </div>
          {game.location && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium">📍 {game.location}</p>
          )}
        </CardHeader>

        <CardContent className="space-y-4 relative z-10">
          {/* Score Display */}
          <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-4">
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
              <div className={`text-5xl font-black text-${sportColor}-600 dark:text-${sportColor}-400`}>
                {game.sport === 'volleyball' ? (game.quarter_scores || []).reduce((sum, s) => sum + (s.home || 0), 0) : game.home_score}
              </div>
            </div>

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
              <div className="text-5xl font-black text-gray-900 dark:text-white">
                {game.sport === 'volleyball' ? (game.quarter_scores || []).reduce((sum, s) => sum + (s.away || 0), 0) : game.away_score}
              </div>
            </div>
          </div>

          {/* Quarter/Set Scores */}
          {game.quarter_scores && game.quarter_scores.length > 0 && (
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
          {(homeBestPlayer || awayBestPlayer) && (
            <div className="space-y-2">
              <p className="text-xs text-gray-600 dark:text-gray-400 font-bold">⭐ Best Players:</p>
              
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
                        {homeBestPlayer.player?.first_name} {homeBestPlayer.player?.last_name}
                      </p>
                      <p className="text-[10px] text-gray-600 dark:text-gray-400 font-semibold">
                        {game.sport === 'basketball' 
                          ? `${homeBestPlayer.stats.points} PTS • ${homeBestPlayer.stats.rebounds || 0} REB • ${homeBestPlayer.stats.assists || 0} AST`
                          : `${homeBestPlayer.stats.attacks || 0} ATK • ${homeBestPlayer.stats.blocks || 0} BLK • ${homeBestPlayer.stats.aces || 0} ACE`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
                        {awayBestPlayer.player?.first_name} {awayBestPlayer.player?.last_name}
                      </p>
                      <p className="text-[10px] text-gray-600 dark:text-gray-400 font-semibold">
                        {game.sport === 'basketball' 
                          ? `${awayBestPlayer.stats.points} PTS • ${awayBestPlayer.stats.rebounds || 0} REB • ${awayBestPlayer.stats.assists || 0} AST`
                          : `${awayBestPlayer.stats.attacks || 0} ATK • ${awayBestPlayer.stats.blocks || 0} BLK • ${awayBestPlayer.stats.aces || 0} ACE`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* View Full Stats Button */}
          <Button
            variant="outline"
            className="w-full font-bold border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => { const next = isExpanded ? null : game.id; setExpandedGame(next); if (next) fetchStatsForGame(game.id); }}
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

          {/* Expanded Stats */}
          {isExpanded && (
            <div className="space-y-4 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
              {(loadingGame === game.id || (!statsByGame[game.id] && isExpanded)) && (
                <div className="text-xs text-gray-600 dark:text-gray-300">Loading player stats...</div>
              )}
              {statsError[game.id] && (
                <div className="text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                  Failed to load stats.
                  <Button size="sm" variant="outline" onClick={() => fetchStatsForGame(game.id)}>Retry</Button>
                </div>
              )}
              {!statsError[game.id] && loadingGame !== game.id && (statsByGame[game.id] || (allPlayerStats && allPlayerStats.length)) && homeStats.length === 0 && awayStats.length === 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400">No player statistics recorded for this game yet.</div>
              )}
              {(loadingGame === game.id || (!statsByGame[game.id] && isExpanded)) && (
                <div className="text-xs text-gray-600 dark:text-gray-300">Loading player stats...</div>
              )}
              {statsError[game.id] && (
                <div className="text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                  Failed to load stats.
                  <Button size="sm" variant="outline" onClick={() => fetchStatsForGame(game.id)}>Retry</Button>
                </div>
              )}
              {!statsError[game.id] && loadingGame !== game.id && (statsByGame[game.id] || (allPlayerStats && allPlayerStats.length)) && homeStats.length === 0 && awayStats.length === 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400">No player statistics recorded for this game yet.</div>
              )}
              {(loadingGame === game.id || (!statsByGame[game.id] && isExpanded)) && (
                <div className="text-xs text-gray-600 dark:text-gray-300">Loading player stats...</div>
              )}
              {statsError[game.id] && (
                <div className="text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                  Failed to load stats.
                  <Button size="sm" variant="outline" onClick={() => fetchStatsForGame(game.id)}>Retry</Button>
                </div>
              )}
              {!statsError[game.id] && loadingGame !== game.id && (statsByGame[game.id] || (allPlayerStats && allPlayerStats.length)) && homeStats.length === 0 && awayStats.length === 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400">No player statistics recorded for this game yet.</div>
              )}
              {(loadingGame === game.id || (!statsByGame[game.id] && isExpanded)) && (
                <div className="text-xs text-gray-600 dark:text-gray-300">Loading player stats...</div>
              )}
              {statsError[game.id] && (
                <div className="text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                  Failed to load stats.
                  <Button size="sm" variant="outline" onClick={() => fetchStatsForGame(game.id)}>Retry</Button>
                </div>
              )}
              {!statsError[game.id] && loadingGame !== game.id && (statsByGame[game.id] || (allPlayerStats && allPlayerStats.length)) && homeStats.length === 0 && awayStats.length === 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400">No player statistics recorded for this game yet.</div>
              )}
              {/* Home Team Stats */}
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">
                  {getTeamName(game.home_team_id)} - Player Statistics
                </p>
                <div className="space-y-2">
                  {homeStats.map((stat) => (
                    <div key={stat.player?.id || stat.player_id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 rounded-lg p-2 text-xs border border-gray-200 dark:border-gray-700">
                      <Avatar className="w-8 h-8 border border-gray-300 dark:border-gray-600">
                        <AvatarImage src={stat.player?.photo_url} />
                        <AvatarFallback className="bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-[10px] font-bold">
                          {stat.player?.jersey_number}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white truncate">
                          {stat.player?.first_name || 'Player'} {stat.player?.last_name || ''}
                        </p>
                        <p className="text-[10px] text-gray-600 dark:text-gray-400 font-semibold">
                          {game.sport === 'basketball'
                            ? `${stat.points || 0} PTS • ${stat.rebounds || 0} REB • ${stat.assists || 0} AST • ${stat.steals || 0} STL • ${stat.blocks || 0} BLK • ${stat.fouls || 0} FLS`
                            : `${stat.attacks || 0} ATK • ${stat.blocks || 0} BLK • ${stat.aces || 0} ACE • ${stat.rally_errors || 0} ERR`
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
                    <div key={stat.player?.id || stat.player_id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 rounded-lg p-2 text-xs border border-gray-200 dark:border-gray-700">
                      <Avatar className="w-8 h-8 border border-gray-300 dark:border-gray-600">
                        <AvatarImage src={stat.player?.photo_url} />
                        <AvatarFallback className="bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-[10px] font-bold">
                          {stat.player?.jersey_number}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white truncate">
                          {stat.player?.first_name || 'Player'} {stat.player?.last_name || ''}
                        </p>
                        <p className="text-[10px] text-gray-600 dark:text-gray-400 font-semibold">
                          {game.sport === 'basketball'
                            ? `${stat.points || 0} PTS • ${stat.rebounds || 0} REB • ${stat.assists || 0} AST • ${stat.steals || 0} STL • ${stat.blocks || 0} BLK • ${stat.fouls || 0} FLS`
                            : `${stat.attacks || 0} ATK • ${stat.blocks || 0} BLK • ${stat.aces || 0} ACE • ${stat.rally_errors || 0} ERR`
                          }
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AI Game Summary */}
          {homeTeam && awayTeam && (
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

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex justify-end">
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
            <TableIcon className="w-4 h-4 mr-2" />
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
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">Filter Game History</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {filteredGames.length} game{filteredGames.length !== 1 ? 's' : ''} found
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Sport Filter */}
              <div>
                <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 block">SPORT</label>
                <select
                  value={selectedSport}
                  onChange={(e) => onSportChange(e.target.value)}
                  className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-3 py-2.5 font-bold shadow-sm hover:border-purple-400 dark:hover:border-purple-600 transition-colors"
                >
                  <option value="all">🏀🏐 All Sports</option>
                  <option value="basketball">🏀 Basketball</option>
                  <option value="volleyball">🏐 Volleyball</option>
                </select>
              </div>

              {/* Division Filter */}
              <div>
                <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 block">DIVISION</label>
                <select
                  value={selectedDivision}
                  onChange={(e) => onDivisionChange(e.target.value)}
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
                <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 block">TEAM</label>
                <select
                  value={selectedTeam}
                  onChange={(e) => onTeamChange(e.target.value)}
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
                      <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">DETAILS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGames.map((game) => {
                      const sportColor = game.sport === 'basketball' ? 'orange' : 'blue';
                      const homeTeam = teams.find(t => t.id === game.home_team_id);
                      const awayTeam = teams.find(t => t.id === game.away_team_id);
                      const isExpanded = expandedGame === game.id;
                      const { homeStats, awayStats } = isExpanded ? getGamePlayerStats(game.id, game.home_team_id, game.away_team_id) : { homeStats: [], awayStats: [] };
                      const homeBestPlayer = isExpanded ? getBestPlayerForTeam(game.id, game.home_team_id, game.sport) : null;
                      const awayBestPlayer = isExpanded ? getBestPlayerForTeam(game.id, game.away_team_id, game.sport) : null;

                      const topPlayersForAI = [];
                      if (homeBestPlayer) {
                        topPlayersForAI.push({
                          name: `${homeBestPlayer.player?.first_name} ${homeBestPlayer.player?.last_name}`,
                          team: homeTeam?.name,
                          stats: game.sport === 'basketball'
                            ? `${homeBestPlayer.stats.points} PTS, ${homeBestPlayer.stats.rebounds || 0} REB, ${homeBestPlayer.stats.assists || 0} AST`
                            : `${homeBestPlayer.stats.attacks || 0} ATK, ${homeBestPlayer.stats.blocks || 0} BLK, ${homeBestPlayer.stats.aces || 0} ACE`
                        });
                      }
                      if (awayBestPlayer) {
                        topPlayersForAI.push({
                          name: `${awayBestPlayer.player?.first_name} ${awayBestPlayer.player?.last_name}`,
                          team: awayTeam?.name,
                          stats: game.sport === 'basketball'
                            ? `${awayBestPlayer.stats.points} PTS, ${awayBestPlayer.stats.rebounds || 0} REB, ${awayBestPlayer.stats.assists || 0} AST`
                            : `${awayBestPlayer.stats.attacks || 0} ATK, ${awayBestPlayer.stats.blocks || 0} BLK, ${awayBestPlayer.stats.aces || 0} ACE`
                        });
                      }

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
                              <div className="font-black text-2xl text-gray-900 dark:text-white">
                                {game.sport === 'volleyball' 
                                  ? `${(game.quarter_scores || []).reduce((sum, s) => sum + (s.home || 0), 0)} - ${(game.quarter_scores || []).reduce((sum, s) => sum + (s.away || 0), 0)}`
                                  : `${game.home_score} - ${game.away_score}`
                                }
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                className="font-bold border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => { const next = isExpanded ? null : game.id; setExpandedGame(next); if (next) fetchStatsForGame(game.id); }}
                              >
                                {isExpanded ? <><ChevronUp className="w-4 h-4 mr-1" />Hide</> : <><ChevronDown className="w-4 h-4 mr-1" />View</>}
                              </Button>
                            </td>
                          </tr>
                          
                          {/* Expanded Row */}
                          {isExpanded && (
                            <tr className={`border-b-2 border-gray-200 dark:border-gray-700 bg-${sportColor}-50/30 dark:bg-${sportColor}-950/10`}>
                              <td colSpan="5" className="p-6">
                                <div className="space-y-6">
                                  {(loadingGame === game.id || (!statsByGame[game.id] && isExpanded)) && (
                                    <div className="text-xs text-gray-600 dark:text-gray-300">Loading player stats...</div>
                                  )}
                                  {statsError[game.id] && (
                                    <div className="text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                                      Failed to load stats.
                                      <Button size="sm" variant="outline" onClick={() => fetchStatsForGame(game.id)}>Retry</Button>
                                    </div>
                                  )}
                                  {!statsError[game.id] && loadingGame !== game.id && (statsByGame[game.id] || (allPlayerStats && allPlayerStats.length)) && homeStats.length === 0 && awayStats.length === 0 && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">No player statistics recorded for this game yet.</div>
                                  )}
                                  {(loadingGame === game.id || (!statsByGame[game.id] && isExpanded)) && (
                                    <div className="text-xs text-gray-600 dark:text-gray-300">Loading player stats...</div>
                                  )}
                                  {statsError[game.id] && (
                                    <div className="text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                                      Failed to load stats.
                                      <Button size="sm" variant="outline" onClick={() => fetchStatsForGame(game.id)}>Retry</Button>
                                    </div>
                                  )}
                                  {!statsError[game.id] && loadingGame !== game.id && (statsByGame[game.id] || (allPlayerStats && allPlayerStats.length)) && homeStats.length === 0 && awayStats.length === 0 && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">No player statistics recorded for this game yet.</div>
                                  )}
                                  {(loadingGame === game.id || (!statsByGame[game.id] && isExpanded)) && (
                                    <div className="text-xs text-gray-600 dark:text-gray-300">Loading player stats...</div>
                                  )}
                                  {statsError[game.id] && (
                                    <div className="text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                                      Failed to load stats.
                                      <Button size="sm" variant="outline" onClick={() => fetchStatsForGame(game.id)}>Retry</Button>
                                    </div>
                                  )}
                                  {!statsError[game.id] && loadingGame !== game.id && (statsByGame[game.id] || (allPlayerStats && allPlayerStats.length)) && homeStats.length === 0 && awayStats.length === 0 && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">No player statistics recorded for this game yet.</div>
                                  )}
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
                                          <div key={stat.player?.id || stat.player_id} className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-3 text-xs border border-gray-200 dark:border-gray-700">
                                            <Avatar className="w-10 h-10 border-2 border-gray-300 dark:border-gray-600">
                                              <AvatarImage src={stat.player?.photo_url} />
                                              <AvatarFallback className="bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold">
                                                {stat.player?.jersey_number}
                                              </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                              <p className="font-bold text-gray-900 dark:text-white truncate">
                                                {stat.player?.first_name} {stat.player?.last_name}
                                              </p>
                                              <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
                                                {game.sport === 'basketball'
                                                  ? `${stat.points || 0} PTS • ${stat.rebounds || 0} REB • ${stat.assists || 0} AST • ${stat.steals || 0} STL • ${stat.blocks || 0} BLK • ${stat.fouls || 0} FLS`
                                                  : `${stat.attacks || 0} ATK • ${stat.blocks || 0} BLK • ${stat.aces || 0} ACE • ${stat.rally_errors || 0} ERR`
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
                                          <div key={stat.player?.id || stat.player_id} className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-3 text-xs border border-gray-200 dark:border-gray-700">
                                            <Avatar className="w-10 h-10 border-2 border-gray-300 dark:border-gray-600">
                                              <AvatarImage src={stat.player?.photo_url} />
                                              <AvatarFallback className="bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold">
                                                {stat.player?.jersey_number}
                                              </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                              <p className="font-bold text-gray-900 dark:text-white truncate">
                                                {stat.player?.first_name} {stat.player?.last_name}
                                              </p>
                                              <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
                                                {game.sport === 'basketball'
                                                  ? `${stat.points || 0} PTS • ${stat.rebounds || 0} REB • ${stat.assists || 0} AST • ${stat.steals || 0} STL • ${stat.blocks || 0} BLK • ${stat.fouls || 0} FLS`
                                                  : `${stat.attacks || 0} ATK • ${stat.blocks || 0} BLK • ${stat.aces || 0} ACE • ${stat.rally_errors || 0} ERR`
                                                }
                                              </p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  {/* AI Game Summary */}
                                  {homeTeam && awayTeam && (
                                    <div className="mt-4">
                                      <AIGameSummary
                                        game={game}
                                        homeTeam={homeTeam}
                                        awayTeam={awayTeam}
                                        topPlayers={topPlayersForAI}
                                      />
                                    </div>
                                  )}
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
        )
      ) : (
        <div className="text-center py-20">
          <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-12 h-12 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-xl font-bold">No game history found</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
            Complete some games to see them here
          </p>
        </div>
      )}
    </div>
  );
}