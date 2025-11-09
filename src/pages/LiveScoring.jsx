
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, PlayCircle, AlertTriangle, ChevronRight, Clock, TrendingUp, Target, Zap, Shield, RotateCcw, User, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function LiveScoring() {
  const [game, setGame] = useState(null);
  const [currentQuarter, setCurrentQuarter] = useState(1);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [quarterScores, setQuarterScores] = useState([]);
  const [homeTimeouts, setHomeTimeouts] = useState(5);
  const [awayTimeouts, setAwayTimeouts] = useState(5);
  const [homeTeamFouls, setHomeTeamFouls] = useState(0);
  const [awayTeamFouls, setAwayTeamFouls] = useState(0);
  const [playerStats, setPlayerStats] = useState({});
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showQuarterEnd, setShowQuarterEnd] = useState(false);
  const [actionHistory, setActionHistory] = useState([]);
  const [showQuarterStats, setShowQuarterStats] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadGame();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadGame = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('game_id');
    if (!gameId) {
      navigate(createPageUrl("Games"));
      return;
    }

    const games = await base44.entities.Game.list();
    const currentGame = games.find(g => g.id === gameId);
    if (!currentGame) {
      navigate(createPageUrl("Games"));
      return;
    }

    setGame(currentGame);
    setHomeScore(currentGame.home_score || 0);
    setAwayScore(currentGame.away_score || 0);
    setCurrentQuarter(currentGame.current_quarter || 1);
    setQuarterScores(currentGame.quarter_scores || []);
    setHomeTimeouts(currentGame.home_timeouts ?? 5);
    setAwayTimeouts(currentGame.away_timeouts ?? 5);
    setHomeTeamFouls(currentGame.home_team_fouls || 0);
    setAwayTeamFouls(currentGame.away_team_fouls || 0);
    
    if (currentGame.status === 'scheduled') {
      await base44.entities.Game.update(gameId, { status: 'in_progress' });
    }

    const stats = await base44.entities.PlayerGameStats.filter({ game_id: gameId });
    const statsMap = {};
    stats.forEach(stat => {
      const key = `${stat.player_id}_${stat.quarter}`;
      statsMap[key] = stat;
    });
    setPlayerStats(statsMap);
  };

  const { data: homeTeam } = useQuery({
    queryKey: ['team', game?.home_team_id],
    queryFn: async () => {
      const teams = await base44.entities.Team.list();
      return teams.find(t => t.id === game?.home_team_id);
    },
    enabled: !!game?.home_team_id,
  });

  const { data: awayTeam } = useQuery({
    queryKey: ['team', game?.away_team_id],
    queryFn: async () => {
      const teams = await base44.entities.Team.list();
      return teams.find(t => t.id === game?.away_team_id);
    },
    enabled: !!game?.away_team_id,
  });

  const { data: homePlayers = [] } = useQuery({
    queryKey: ['players', game?.home_team_id],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p => p.team_id === game?.home_team_id);
    },
    enabled: !!game?.home_team_id,
  });

  const { data: awayPlayers = [] } = useQuery({
    queryKey: ['players', game?.away_team_id],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p => p.team_id === game?.away_team_id);
    },
    enabled: !!game?.away_team_id,
  });

  const getPlayerStatKey = (playerId) => `${playerId}_${currentQuarter}`;

  const getPlayerStat = (playerId, statType) => {
    let total = 0;
    for (let q = 1; q <= currentQuarter; q++) {
      const key = `${playerId}_${q}`;
      total += playerStats[key]?.[statType] || 0;
    }
    return total;
  };

  const getCurrentQuarterPlayerStat = (playerId, statType) => {
    const key = `${playerId}_${currentQuarter}`;
    return playerStats[key]?.[statType] || 0;
  };

  const getTotalPlayerFouls = (playerId) => {
    let totalFouls = 0;
    for (let q = 1; q <= currentQuarter; q++) {
      const key = `${playerId}_${q}`;
      totalFouls += playerStats[key]?.fouls || 0;
    }
    return totalFouls;
  };

  // Calculate total team points from all players
  const calculateTeamPointsFromPlayers = (teamPlayers) => {
    return teamPlayers.reduce((total, player) => {
      return total + getPlayerStat(player.id, 'points');
    }, 0);
  };

  // Update multiple stats at once to avoid race conditions and simplify logic
  const updatePlayerStats = async (playerId, teamId, statUpdates) => {
    const key = getPlayerStatKey(playerId);
    let statToPersist = null; 

    setPlayerStats(prev => {
      const existingStat = prev[key] || {};
      const newStatData = {
        ...existingStat, // Start with all existing properties to preserve un-updated ones
        game_id: game.id,
        player_id: playerId,
        team_id: teamId,
        quarter: currentQuarter,
      };

      // Apply all stat updates
      statUpdates.forEach(({ statType, value }) => {
        newStatData[statType] = Math.max(0, (newStatData[statType] || 0) + value);
      });
      
      statToPersist = newStatData; // Capture this for the async DB operation

      return {
        ...prev,
        [key]: newStatData,
      };
    });

    // Now persist statToPersist (which now holds the ID if existing)
    try {
      if (statToPersist.id) {
        await base44.entities.PlayerGameStats.update(statToPersist.id, statToPersist);
      } else {
        const created = await base44.entities.PlayerGameStats.create(statToPersist);
        // If it was a new creation, update the local state with the assigned ID
        setPlayerStats(prev => ({
          ...prev,
          [key]: { ...prev[key], id: created.id }, // Update the specific stat object with its new ID
        }));
      }
    } catch (error) {
      console.error("Error saving player stats:", error);
    }
  };

  const addPoints = async (points) => {
    if (!selectedPlayer || !selectedTeam) return;

    const oldHomeScore = homeScore;
    const oldAwayScore = awayScore;

    const newHomeScore = selectedTeam === 'home' ? homeScore + points : homeScore;
    const newAwayScore = selectedTeam === 'away' ? awayScore + points : awayScore;

    setHomeScore(newHomeScore);
    setAwayScore(newAwayScore);

    const teamId = selectedTeam === 'home' ? game.home_team_id : game.away_team_id;
    
    // Prepare all stat updates at once
    const statUpdates = [
      { statType: 'points', value: points }
    ];
    
    if (points === 3) {
      statUpdates.push(
        { statType: 'three_pointers', value: 1 },
        { statType: 'field_goals_made', value: 1 },
        { statType: 'field_goals_attempted', value: 1 }
      );
    } else if (points === 2) {
      statUpdates.push(
        { statType: 'field_goals_made', value: 1 },
        { statType: 'field_goals_attempted', value: 1 }
      );
    } else if (points === 1) {
      statUpdates.push(
        { statType: 'free_throws_made', value: 1 },
        { statType: 'free_throws_attempted', value: 1 }
      );
    }

    // Update all stats at once
    await updatePlayerStats(selectedPlayer.id, teamId, statUpdates);

    await base44.entities.Game.update(game.id, {
      home_score: newHomeScore,
      away_score: newAwayScore,
    });

    setActionHistory(prev => [...prev, {
      type: 'score',
      team: selectedTeam,
      points: points,
      playerId: selectedPlayer.id,
      quarter: currentQuarter,
      oldHomeScore: oldHomeScore,
      oldAwayScore: oldAwayScore,
      statUpdates: statUpdates, // Store the list of updates for undo
    }]);
  };

  const addPlayerStat = async (statType, value) => {
    if (!selectedPlayer || !selectedTeam) return;

    const teamId = selectedTeam === 'home' ? game.home_team_id : game.away_team_id;
    const statUpdates = [{ statType, value }];
    await updatePlayerStats(selectedPlayer.id, teamId, statUpdates);
    
    setActionHistory(prev => [...prev, {
      type: statType,
      playerId: selectedPlayer.id,
      teamId: teamId,
      quarter: currentQuarter,
      value: value,
      statUpdates: statUpdates, // Store the list of updates for undo
    }]);
  };

  const handleFoul = async () => {
    if (!selectedPlayer || !selectedTeam) return;

    const teamId = selectedTeam === 'home' ? game.home_team_id : game.away_team_id;
    const oldTeamFouls = selectedTeam === 'home' ? homeTeamFouls : awayTeamFouls;
    
    const statUpdates = [{ statType: 'fouls', value: 1 }];
    await updatePlayerStats(selectedPlayer.id, teamId, statUpdates);
    
    const newTeamFouls = oldTeamFouls + 1;
    if (selectedTeam === 'home') {
      setHomeTeamFouls(newTeamFouls);
      await base44.entities.Game.update(game.id, { home_team_fouls: newTeamFouls });
    } else {
      setAwayTeamFouls(newTeamFouls);
      await base44.entities.Game.update(game.id, { away_team_fouls: newTeamFouls });
    }

    setActionHistory(prev => [...prev, {
      type: 'foul',
      playerId: selectedPlayer.id,
      teamId: teamId,
      quarter: currentQuarter,
      team: selectedTeam,
      oldTeamFouls: oldTeamFouls,
      statUpdates: statUpdates, // Store the list of updates for undo
    }]);

    const totalFouls = getTotalPlayerFouls(selectedPlayer.id) + 1;
    if (totalFouls >= game.player_foul_limit) {
      alert(`⚠️ Player has reached foul limit (${game.player_foul_limit} fouls) and is disqualified!`);
      setSelectedPlayer(null);
      setSelectedTeam(null);
    } else if (totalFouls === game.player_foul_limit - 1) {
      alert(`⚠️ Warning: Player has ${totalFouls} fouls! One more foul and they will be disqualified.`);
    }
  };

  const useTimeout = async (team) => {
    const oldHomeTimeouts = homeTimeouts;
    const oldAwayTimeouts = awayTimeouts;

    if (team === 'home' && homeTimeouts > 0) {
      const newTimeouts = homeTimeouts - 1;
      setHomeTimeouts(newTimeouts);
      await base44.entities.Game.update(game.id, { home_timeouts: newTimeouts });
      setActionHistory(prev => [...prev, {
        type: 'timeout',
        team: 'home',
        quarter: currentQuarter,
        oldTimeouts: oldHomeTimeouts,
      }]);
    } else if (team === 'away' && awayTimeouts > 0) {
      const newTimeouts = awayTimeouts - 1;
      setAwayTimeouts(newTimeouts);
      await base44.entities.Game.update(game.id, { away_timeouts: newTimeouts });
      setActionHistory(prev => [...prev, {
        type: 'timeout',
        team: 'away',
        quarter: currentQuarter,
        oldTimeouts: oldAwayTimeouts,
      }]);
    }
  };

  const handleUndo = async () => {
    if (actionHistory.length === 0) return;

    const lastAction = actionHistory[actionHistory.length - 1];
    setActionHistory(prev => prev.slice(0, -1));

    if (lastAction.type === 'score' ||
        ['rebounds', 'assists', 'steals', 'blocks', 'fouls'].includes(lastAction.type)) {
      
      if (lastAction.type === 'score') {
        setHomeScore(lastAction.oldHomeScore);
        setAwayScore(lastAction.oldAwayScore);
        await base44.entities.Game.update(game.id, {
          home_score: lastAction.oldHomeScore,
          away_score: lastAction.oldAwayScore,
        });
      }

      // Reverse all stat updates by negating their values
      const reverseUpdates = lastAction.statUpdates.map(update => ({
        statType: update.statType,
        value: -update.value
      }));
      
      await updatePlayerStats(lastAction.playerId, lastAction.teamId, reverseUpdates);

      if (lastAction.type === 'foul') {
        if (lastAction.team === 'home') {
          setHomeTeamFouls(lastAction.oldTeamFouls);
          await base44.entities.Game.update(game.id, { home_team_fouls: lastAction.oldTeamFouls });
        } else {
          setAwayTeamFouls(lastAction.oldTeamFouls);
          await base44.entities.Game.update(game.id, { away_team_fouls: lastAction.oldTeamFouls });
        }
      }

    } else if (lastAction.type === 'timeout') {
      if (lastAction.team === 'home') {
        setHomeTimeouts(lastAction.oldTimeouts);
        await base44.entities.Game.update(game.id, { home_timeouts: lastAction.oldTimeouts });
      } else {
        setAwayTimeouts(lastAction.oldTimeouts);
        await base44.entities.Game.update(game.id, { away_timeouts: lastAction.oldTimeouts });
      }
    }
  };

  const endQuarter = async () => {
    const quarterScore = {
      quarter: currentQuarter,
      home: homeScore,
      away: awayScore,
    };

    const newQuarterScores = [...quarterScores, quarterScore];
    setQuarterScores(newQuarterScores);
    setHomeTeamFouls(0);
    setAwayTeamFouls(0);

    const nextQuarter = currentQuarter + 1;
    const newOvertimeCount = nextQuarter > 4 ? (nextQuarter - 4) : 0;

    await base44.entities.Game.update(game.id, {
      quarter_scores: newQuarterScores,
      current_quarter: nextQuarter,
      home_team_fouls: 0,
      away_team_fouls: 0,
      overtime_count: newOvertimeCount,
    });

    setCurrentQuarter(nextQuarter);
    setShowQuarterEnd(false);
    setActionHistory([]);
  };

  const endGame = async () => {
    if (homeScore === awayScore && currentQuarter >= 4) {
      alert("Game is tied! Please play overtime period.");
      return;
    }

    await base44.entities.Game.update(game.id, {
      status: 'completed',
      home_score: homeScore,
      away_score: awayScore,
    });

    if (homeScore > awayScore) {
      const allTeams = await base44.entities.Team.list();
      const home = allTeams.find(t => t.id === game.home_team_id);
      await base44.entities.Team.update(game.home_team_id, {
        wins: (home.wins || 0) + 1
      });
      
      const away = allTeams.find(t => t.id === game.away_team_id);
      await base44.entities.Team.update(game.away_team_id, {
        losses: (away.losses || 0) + 1
      });
    } else {
      const allTeams = await base44.entities.Team.list();
      const home = allTeams.find(t => t.id === game.home_team_id);
      await base44.entities.Team.update(game.home_team_id, {
        losses: (home.losses || 0) + 1
      });
      
      const away = allTeams.find(t => t.id === game.away_team_id);
      await base44.entities.Team.update(game.away_team_id, {
        wins: (away.wins || 0) + 1
      });
    }

    navigate(createPageUrl("Games"));
  };

  if (!game || !homeTeam || !awayTeam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  const quarterLabel = currentQuarter <= 4 ? `Q${currentQuarter}` : `OT${currentQuarter - 4}`;
  const inPenalty = (team) => {
    return (team === 'home' ? homeTeamFouls : awayTeamFouls) >= game.penalty_limit_per_quarter;
  };

  // Calculate player totals for verification
  const homePlayerPoints = calculateTeamPointsFromPlayers(homePlayers);
  const awayPlayerPoints = calculateTeamPointsFromPlayers(awayPlayers);
  const homePointsDiff = homeScore - homePlayerPoints;
  const awayPointsDiff = awayScore - awayPlayerPoints;

  const PlayerRow = ({ player, team, teamId, onSelect }) => {
    const totalFouls = getTotalPlayerFouls(player.id);
    const points = getPlayerStat(player.id, 'points');
    const rebounds = getPlayerStat(player.id, 'rebounds');
    const assists = getPlayerStat(player.id, 'assists');
    const steals = getPlayerStat(player.id, 'steals');
    const blocks = getPlayerStat(player.id, 'blocks');
    const isFouledOut = totalFouls >= game.player_foul_limit;
    const isSelected = selectedPlayer?.id === player.id;

    return (
      <button
        onClick={() => {
          if (isFouledOut) return;
          onSelect(player, team);
        }}
        className={`w-full text-left border-2 rounded-lg p-2 mb-2 transition-all ${
          isFouledOut 
            ? 'bg-red-50 dark:bg-red-950/30 opacity-50 cursor-not-allowed border-red-300 dark:border-red-800' 
            : isSelected
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 border-orange-400 ring-2 ring-orange-300 shadow-lg scale-105'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600 hover:shadow-md'
        }`}
        disabled={isFouledOut}
      >
        <div className="flex items-center gap-2">
          <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700 shadow-md">
            <AvatarImage src={player.photo_url} />
            <AvatarFallback className={`text-sm font-black ${isSelected ? 'bg-white text-orange-600' : 'bg-gradient-to-br from-orange-600 to-orange-700 text-white'}`}>
              {player.jersey_number}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
              #{player.jersey_number} {player.first_name} {player.last_name}
            </p>
            <div className={`flex gap-2 text-[10px] mt-0.5 font-semibold ${isSelected ? 'text-orange-100' : 'text-gray-600 dark:text-gray-400'}`}>
              <span>PTS: {points}</span>
              <span>REB: {rebounds}</span>
              <span>AST: {assists}</span>
              <span>STL: {steals}</span>
              <span>BLK: {blocks}</span>
              <span className={totalFouls >= game.player_foul_limit - 1 ? 'text-red-600 dark:text-red-400' : ''}>
                FL: {totalFouls}/{game.player_foul_limit}
              </span>
            </div>
          </div>
          {isFouledOut && (
            <Badge className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5">FOULED OUT</Badge>
          )}
        </div>
      </button>
    );
  };

  const handlePlayerSelect = (player, team) => {
    setSelectedPlayer(player);
    setSelectedTeam(team);
  };

  // Force re-render key based on player stats
  const getPlayerRenderKey = (playerId) => {
    const points = getPlayerStat(playerId, 'points');
    const rebounds = getPlayerStat(playerId, 'rebounds');
    const assists = getPlayerStat(playerId, 'assists');
    const steals = getPlayerStat(playerId, 'steals');
    const blocks = getPlayerStat(playerId, 'blocks');
    const fouls = getTotalPlayerFouls(playerId);
    return `${playerId}_${points}_${rebounds}_${assists}_${steals}_${blocks}_${fouls}_${currentQuarter}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-900/20 to-gray-900">
      {/* Main Scoreboard - Sticky at top WITH TEAM LOGOS */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-gray-900 via-orange-900 to-gray-900 border-b-4 border-orange-500 shadow-2xl">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Badge className="bg-red-600 text-white border-2 border-red-400 px-6 py-2 text-base font-black shadow-lg">
              <PlayCircle className="w-5 h-5 mr-2 animate-pulse" />
              LIVE - {quarterLabel}
            </Badge>
            <Badge className="bg-orange-600 text-white border-2 border-orange-400 px-4 py-2 text-sm font-black">
              BASKETBALL
            </Badge>
            <Badge className="bg-purple-600 text-white border-2 border-purple-400 px-4 py-2 text-sm font-black">
              {game.game_type?.replace('_', ' ').toUpperCase() || 'REGULAR SEASON'}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-4 items-center mb-4">
            {/* HOME TEAM WITH LOGO */}
            <div className="text-center">
              <div className="text-orange-400 text-sm font-black mb-2">HOME</div>
              <div className="flex items-center justify-center gap-3 mb-2">
                <Avatar className="w-16 h-16 border-4 border-orange-400 shadow-2xl">
                  <AvatarImage src={homeTeam.logo_url} />
                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white font-black text-lg">
                    {homeTeam.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-white text-2xl font-black text-left">{homeTeam.name}</div>
              </div>
              <div className="text-orange-500 text-7xl font-black mb-2">{homeScore}</div>
              <div className="flex flex-col items-center gap-1">
                <div className="flex justify-center gap-4 text-xs font-bold">
                  <span className={`${inPenalty('home') ? 'text-red-400' : 'text-white'}`}>
                    FOULS: {homeTeamFouls}/{game.penalty_limit_per_quarter}
                  </span>
                  <span className="text-white">TO: {homeTimeouts}</span>
                </div>
                <div className="text-[10px] text-gray-400 font-semibold">
                  Player Total: {homePlayerPoints} {homePointsDiff !== 0 && (
                    <span className={homePointsDiff > 0 ? 'text-yellow-400' : 'text-red-400'}>
                      ({homePointsDiff > 0 ? '+' : ''}{homePointsDiff})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* QUARTER SCORES WITH BUTTONS BELOW */}
            <div className="text-center">
              <div className="text-white text-2xl font-black mb-3">{quarterLabel}</div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4">
                <div className="flex justify-center gap-3 flex-wrap">
                  {[1, 2, 3, 4].map(q => {
                    const qScore = quarterScores.find(qs => qs.quarter === q);
                    return (
                      <div key={q} className="text-base font-black text-white">
                        <span className="text-gray-400">Q{q}:</span> {qScore ? `${qScore.home}-${qScore.away}` : '-'}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* QUARTER END AND CANCEL BUTTONS */}
              <div className="flex gap-2 justify-center">
                {currentQuarter <= 4 && (
                  <Button
                    onClick={() => setShowQuarterEnd(true)}
                    size="sm"
                    className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-black text-xs px-4 py-2"
                  >
                    END {quarterLabel}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
                {currentQuarter > 4 && (
                  <Button
                    onClick={() => setShowQuarterEnd(true)}
                    size="sm"
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-black text-xs px-4 py-2"
                  >
                    END {quarterLabel}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
                {currentQuarter >= 4 && homeScore !== awayScore && (
                  <Button
                    onClick={endGame}
                    size="sm"
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-black text-xs px-4 py-2"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    END GAME
                  </Button>
                )}
                {currentQuarter === 4 && homeScore === awayScore && (
                  <Button
                    onClick={() => setShowQuarterEnd(true)}
                    size="sm"
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-black text-xs px-4 py-2"
                  >
                    START OT
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
                <Button
                  onClick={() => navigate(createPageUrl("Games"))}
                  variant="outline"
                  size="sm"
                  className="border-2 border-gray-400 text-white hover:bg-gray-700 font-black text-xs px-4 py-2"
                >
                  CANCEL
                </Button>
              </div>
            </div>

            {/* AWAY TEAM WITH LOGO */}
            <div className="text-center">
              <div className="text-blue-400 text-sm font-black mb-2">AWAY</div>
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="text-white text-2xl font-black text-right">{awayTeam.name}</div>
                <Avatar className="w-16 h-16 border-4 border-blue-400 shadow-2xl">
                  <AvatarImage src={awayTeam.logo_url} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-black text-lg">
                    {awayTeam.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="text-blue-500 text-7xl font-black mb-2">{awayScore}</div>
              <div className="flex flex-col items-center gap-1">
                <div className="flex justify-center gap-4 text-xs font-bold">
                  <span className={`${inPenalty('away') ? 'text-red-400' : 'text-white'}`}>
                    FOULS: {awayTeamFouls}/{game.penalty_limit_per_quarter}
                  </span>
                  <span className="text-white">TO: {awayTimeouts}</span>
                </div>
                <div className="text-[10px] text-gray-400 font-semibold">
                  Player Total: {awayPlayerPoints} {awayPointsDiff !== 0 && (
                    <span className={awayPointsDiff > 0 ? 'text-yellow-400' : 'text-red-400'}>
                      ({awayPointsDiff > 0 ? '+' : ''}{awayPointsDiff})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SYNCHRONIZATION WARNING */}
          {(Math.abs(homePointsDiff) > 0 || Math.abs(awayPointsDiff) > 0) && (
            <Alert className="bg-yellow-900/50 border-2 border-yellow-500 mb-4">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <AlertDescription className="text-yellow-200 font-bold">
                ⚠️ Score Verification: 
                {Math.abs(homePointsDiff) > 0 && ` ${homeTeam.name}: Team ${homeScore} vs Players ${homePlayerPoints}`}
                {Math.abs(homePointsDiff) > 0 && Math.abs(awayPointsDiff) > 0 && ' | '}
                {Math.abs(awayPointsDiff) > 0 && ` ${awayTeam.name}: Team ${awayScore} vs Players ${awayPlayerPoints}`}
              </AlertDescription>
            </Alert>
          )}

          {/* TIED GAME ALERT */}
          {currentQuarter >= 4 && homeScore === awayScore && (
            <Alert className="bg-yellow-900/50 border-2 border-yellow-500 mb-4">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <AlertDescription className="text-yellow-200 font-bold text-center">
                ⚠️ Game is TIED! Must play overtime period before ending game.
              </AlertDescription>
            </Alert>
          )}

          {(inPenalty('home') || inPenalty('away')) && (
            <Alert className="bg-yellow-900/50 border-2 border-yellow-500 mb-4">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <AlertDescription className="text-yellow-200 font-bold">
                {inPenalty('home') && `${homeTeam.name} in penalty`}
                {inPenalty('home') && inPenalty('away') && ' | '}
                {inPenalty('away') && `${awayTeam.name} in penalty`}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Control Panel - STICKY */}
      {selectedPlayer ? (
        <div className="sticky z-40 bg-gradient-to-br from-gray-900 via-orange-900/20 to-gray-900" style={{ top: '300px' }}>
          <div className="mx-4 my-4">
            <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-14 h-14 border-4 border-blue-200 dark:border-blue-800 shadow-lg">
                      <AvatarImage src={selectedPlayer.photo_url} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-black text-lg">
                        {selectedPlayer.jersey_number}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white">
                        #{selectedPlayer.jersey_number} {selectedPlayer.first_name} {selectedPlayer.last_name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                        {selectedTeam === 'home' ? homeTeam?.name : awayTeam?.name}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedPlayer(null)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    ✕
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => addPoints(1)}
                    className="flex-1 min-w-[80px] h-14 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 active:scale-95 text-white font-black text-sm shadow-lg transition-all duration-150 hover:shadow-xl"
                  >
                    +1 PT
                  </Button>
                  <Button
                    onClick={() => addPoints(2)}
                    className="flex-1 min-w-[80px] h-14 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 active:scale-95 text-white font-black text-sm shadow-lg transition-all duration-150 hover:shadow-xl"
                  >
                    +2 PTS
                  </Button>
                  <Button
                    onClick={() => addPoints(3)}
                    className="flex-1 min-w-[80px] h-14 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-95 text-white font-black text-sm shadow-lg transition-all duration-150 hover:shadow-xl"
                  >
                    +3 PTS
                  </Button>
                  <Button
                    onClick={() => addPlayerStat('rebounds', 1)}
                    className="flex-1 min-w-[80px] h-14 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 active:scale-95 text-white font-bold text-xs shadow-lg transition-all duration-150 hover:shadow-xl"
                  >
                    <TrendingUp className="w-4 h-4 mr-1" />
                    REB
                  </Button>
                  <Button
                    onClick={() => addPlayerStat('assists', 1)}
                    className="flex-1 min-w-[80px] h-14 bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 active:scale-95 text-white font-bold text-xs shadow-lg transition-all duration-150 hover:shadow-xl"
                  >
                    <Target className="w-4 h-4 mr-1" />
                    AST
                  </Button>
                  <Button
                    onClick={() => addPlayerStat('steals', 1)}
                    className="flex-1 min-w-[80px] h-14 bg-gradient-to-br from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 active:scale-95 text-white font-bold text-xs shadow-lg transition-all duration-150 hover:shadow-xl"
                  >
                    <Zap className="w-4 h-4 mr-1" />
                    STL
                  </Button>
                  <Button
                    onClick={() => addPlayerStat('blocks', 1)}
                    className="flex-1 min-w-[80px] h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 active:scale-95 text-white font-bold text-xs shadow-lg transition-all duration-150 hover:shadow-xl"
                  >
                    <Shield className="w-4 h-4 mr-1" />
                    BLK
                  </Button>
                  <Button
                    onClick={handleFoul}
                    className="flex-1 min-w-[80px] h-14 bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-white font-bold text-xs shadow-lg transition-all duration-150 hover:shadow-xl"
                  >
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    FOUL
                  </Button>
                  <Button
                    onClick={handleUndo}
                    disabled={actionHistory.length === 0}
                    className="flex-1 min-w-[80px] h-14 bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 active:scale-95 text-white font-bold text-xs shadow-lg transition-all duration-150 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    UNDO
                  </Button>
                </div>

                {/* QUARTER STATS WITH TOGGLE */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Quarter Stats:</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowQuarterStats(!showQuarterStats)}
                      className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                      {showQuarterStats ? (
                        <>
                          <EyeOff className="w-4 h-4 mr-1" />
                          Hide
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-1" />
                          Show
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {showQuarterStats && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                        <div>
                          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{getCurrentQuarterPlayerStat(selectedPlayer.id, 'points')}</div>
                          <div className="xs text-gray-500 dark:text-gray-400 font-semibold">PTS</div>
                        </div>
                        <div>
                          <div className="text-2xl font-black text-green-600 dark:text-green-400">{getCurrentQuarterPlayerStat(selectedPlayer.id, 'rebounds')}</div>
                          <div className="xs text-gray-500 dark:text-gray-400 font-semibold">REB</div>
                        </div>
                        <div>
                          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{getCurrentQuarterPlayerStat(selectedPlayer.id, 'assists')}</div>
                          <div className="xs text-gray-500 dark:text-gray-400 font-semibold">AST</div>
                        </div>
                        <div>
                          <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400">{getCurrentQuarterPlayerStat(selectedPlayer.id, 'steals')}</div>
                          <div className="xs text-gray-500 dark:text-gray-400 font-semibold">STL</div>
                        </div>
                        <div>
                          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{getCurrentQuarterPlayerStat(selectedPlayer.id, 'blocks')}</div>
                          <div className="xs text-gray-500 dark:text-gray-400 font-semibold">BLK</div>
                        </div>
                        <div>
                          <div className="text-2xl font-black text-orange-600 dark:text-orange-400">{getCurrentQuarterPlayerStat(selectedPlayer.id, 'fouls')}</div>
                          <div className="xs text-gray-500 dark:text-gray-400 font-semibold">FOULS</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="mx-4 mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border-2 border-blue-200 dark:border-gray-700 rounded-xl p-8 text-center shadow-lg">
          <User className="w-16 h-16 text-blue-400 dark:text-blue-500 mx-auto mb-4" />
          <p className="text-xl font-black text-gray-900 dark:text-white mb-2">Select a Player</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            Click on a player below to start tracking statistics
          </p>
        </div>
      )}

      {/* Players Section - USING FLEXBOX FOR TRULY FROZEN HEADERS */}
      <div className="max-w-7xl mx-auto p-4 pb-24">
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Home Team - FLEXBOX STRUCTURE */}
          <div className="flex flex-col h-[700px] bg-gradient-to-br from-orange-900/40 to-orange-950/40 border-4 border-orange-500 backdrop-blur-sm rounded-xl">
            {/* FROZEN HEADER */}
            <div className="flex-shrink-0 bg-orange-900/95 backdrop-blur-sm border-b-4 border-orange-500 p-3 rounded-t-xl">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-black text-white">
                  {homeTeam.name} - HOME
                </h2>
                <Button
                  onClick={() => useTimeout('home')}
                  disabled={homeTimeouts === 0}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-3 py-1.5 disabled:opacity-50 whitespace-nowrap"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  TO ({homeTimeouts})
                </Button>
              </div>
            </div>
            {/* SCROLLABLE PLAYERS */}
            <div className="flex-1 overflow-y-auto p-3">
              {homePlayers.map(player => (
                <PlayerRow key={getPlayerRenderKey(player.id)} player={player} team="home" teamId={game.home_team_id} onSelect={handlePlayerSelect} />
              ))}
            </div>
          </div>

          {/* Away Team - FLEXBOX STRUCTURE */}
          <div className="flex flex-col h-[700px] bg-gradient-to-br from-blue-900/40 to-blue-950/40 border-4 border-blue-500 backdrop-blur-sm rounded-xl">
            {/* FROZEN HEADER */}
            <div className="flex-shrink-0 bg-blue-900/95 backdrop-blur-sm border-b-4 border-blue-500 p-3 rounded-t-xl">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-black text-white">
                  {awayTeam.name} - AWAY
                </h2>
                <Button
                  onClick={() => useTimeout('away')}
                  disabled={awayTimeouts === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 disabled:opacity-50 whitespace-nowrap"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  TO ({awayTimeouts})
                </Button>
              </div>
            </div>
            {/* SCROLLABLE PLAYERS */}
            <div className="flex-1 overflow-y-auto p-3">
              {awayPlayers.map(player => (
                <PlayerRow key={getPlayerRenderKey(player.id)} player={player} team="away" teamId={game.away_team_id} onSelect={handlePlayerSelect} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* End Quarter Dialog */}
      <Dialog open={showQuarterEnd} onOpenChange={setShowQuarterEnd}>
        <DialogContent className="bg-gray-900 border-4 border-orange-500 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl font-black">
              End of {quarterLabel}
            </DialogTitle>
            <DialogDescription className="text-gray-300 font-bold">
              {currentQuarter === 4 && homeScore === awayScore 
                ? 'Game is tied! Overtime will begin.' 
                : 'Save quarter data and proceed to next period?'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
              <div className="flex justify-between text-lg font-bold mb-3 text-white">
                <span>{homeTeam.name}</span>
                <span className="text-orange-500 text-3xl">{homeScore}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-white">
                <span>{awayTeam.name}</span>
                <span className="text-blue-500 text-3xl">{awayScore}</span>
              </div>
            </div>
            {currentQuarter === 4 && homeScore === awayScore && (
              <Alert className="bg-purple-900/50 border-2 border-purple-500">
                <AlertTriangle className="h-4 w-4 text-purple-400" />
                <AlertDescription className="text-purple-200 font-bold">
                  🏀 Game is tied! Overtime period (OT) will begin.
                </AlertDescription>
              </Alert>
            )}
            <div className="flex gap-3">
              <Button
                onClick={endQuarter}
                className={`flex-1 font-black ${
                  currentQuarter >= 4 && homeScore === awayScore
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
                    : 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-600 hover:to-orange-800'
                } text-white`}
              >
                {currentQuarter < 4 
                  ? `PROCEED TO Q${currentQuarter + 1}` 
                  : currentQuarter === 4 && homeScore === awayScore 
                    ? 'START OVERTIME' 
                    : currentQuarter > 4 && homeScore === awayScore
                      ? `PROCEED TO OT${currentQuarter - 3}`
                      : 'FINISH QUARTER'}
              </Button>
              <Button
                onClick={() => setShowQuarterEnd(false)}
                variant="outline"
                className="flex-1 border-2 border-gray-600 text-white hover:bg-gray-800 font-black"
              >
                CANCEL
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
