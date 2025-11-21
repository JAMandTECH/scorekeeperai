import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, PlayCircle, AlertTriangle, ChevronRight, Clock, TrendingUp, Target, Zap, Shield, RotateCcw, User, Eye, EyeOff, Flag } from "lucide-react";
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
import VoiceAssistant from "@/components/VoiceAssistant";

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
  const [selectedTeam, setSelectedTeam] = useState(null); // 'home' or 'away'
  const [showQuarterEnd, setShowQuarterEnd] = useState(false);
  const [actionHistory, setActionHistory] = useState([]);
  const [showQuarterStats, setShowQuarterStats] = useState(true);
  const [showDefaultDialog, setShowDefaultDialog] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadGame();
    loadUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

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

  const { data: organization } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      const orgs = await base44.entities.Organization.list();
      return orgs.find(o => o.id === user?.organization_id);
    },
    enabled: !!user?.organization_id,
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

  const updatePlayerStats = async (playerId, teamId, statUpdates) => {
    const key = getPlayerStatKey(playerId);
    let statToPersist = null; 

    setPlayerStats(prev => {
      const existingStat = prev[key] || {};
      const newStatData = {
        ...existingStat,
        game_id: game.id,
        player_id: playerId,
        team_id: teamId,
        quarter: currentQuarter,
      };

      statUpdates.forEach(({ statType, value }) => {
        newStatData[statType] = Math.max(0, (newStatData[statType] || 0) + value);
      });
      
      statToPersist = newStatData;

      return {
        ...prev,
        [key]: newStatData,
      };
    });

    try {
      if (statToPersist.id) {
        await base44.entities.PlayerGameStats.update(statToPersist.id, statToPersist);
      } else {
        const created = await base44.entities.PlayerGameStats.create(statToPersist);
        setPlayerStats(prev => ({
          ...prev,
          [key]: { ...prev[key], id: created.id },
        }));
      }
    } catch (error) {
      console.error("Error saving player stats:", error);
    }
  };

  // Updated addPoints to accept playerId and teamId
  const addPoints = async (playerId, teamId, points) => {
    const oldHomeScore = homeScore;
    const oldAwayScore = awayScore;

    const isHomeTeam = teamId === game.home_team_id;
    const newHomeScore = isHomeTeam ? homeScore + points : homeScore;
    const newAwayScore = !isHomeTeam ? awayScore + points : awayScore;

    setHomeScore(newHomeScore);
    setAwayScore(newAwayScore);
    
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

    await updatePlayerStats(playerId, teamId, statUpdates);

    await base44.entities.Game.update(game.id, {
      home_score: newHomeScore,
      away_score: newAwayScore,
    });

    setActionHistory(prev => [...prev, {
      type: 'score',
      team: isHomeTeam ? 'home' : 'away',
      points: points,
      playerId: playerId,
      quarter: currentQuarter,
      oldHomeScore: oldHomeScore,
      oldAwayScore: oldAwayScore,
      statUpdates: statUpdates,
    }]);
  };

  // Updated addPlayerStat to accept playerId and teamId
  const addPlayerStat = async (playerId, teamId, statType, value) => {
    const statUpdates = [{ statType, value }];
    await updatePlayerStats(playerId, teamId, statUpdates);
    
    setActionHistory(prev => [...prev, {
      type: statType,
      playerId: playerId,
      teamId: teamId,
      quarter: currentQuarter,
      value: value,
      statUpdates: statUpdates,
    }]);
  };

  // Updated handleFoul to accept playerId and teamId
  const handleFoul = async (playerId, teamId) => {
    const isHomeTeam = teamId === game.home_team_id;
    const currentTeam = isHomeTeam ? 'home' : 'away';
    const oldTeamFouls = isHomeTeam ? homeTeamFouls : awayTeamFouls;
    
    const statUpdates = [{ statType: 'fouls', value: 1 }];
    await updatePlayerStats(playerId, teamId, statUpdates);
    
    const newTeamFouls = oldTeamFouls + 1;
    if (isHomeTeam) {
      setHomeTeamFouls(newTeamFouls);
      await base44.entities.Game.update(game.id, { home_team_fouls: newTeamFouls });
    } else {
      setAwayTeamFouls(newTeamFouls);
      await base44.entities.Game.update(game.id, { away_team_fouls: newTeamFouls });
    }

    setActionHistory(prev => [...prev, {
      type: 'foul',
      playerId: playerId,
      teamId: teamId,
      quarter: currentQuarter,
      team: currentTeam,
      oldTeamFouls: oldTeamFouls,
      statUpdates: statUpdates,
    }]);

    const totalFouls = getTotalPlayerFouls(playerId) + 1;
    if (totalFouls >= game.player_foul_limit) {
      alert(`⚠️ Player has reached foul limit (${game.player_foul_limit} fouls) and is disqualified!`);
      // Keeping player selected visually, but interaction is disabled by PlayerRow component
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
    // Calculate the score for THIS QUARTER ONLY by subtracting previous quarters' scores
    const previousHomeTotalScore = quarterScores.reduce((sum, q) => sum + q.home, 0);
    const previousAwayTotalScore = quarterScores.reduce((sum, q) => sum + q.away, 0);
    
    const quarterScore = {
      quarter: currentQuarter,
      home: homeScore - previousHomeTotalScore,
      away: awayScore - previousAwayTotalScore,
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
      home_score: homeScore, // Persist the cumulative score
      away_score: awayScore, // Persist the cumulative score
    });

    setCurrentQuarter(nextQuarter);
    // DON'T reset scores - they continue accumulating
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

  const handleDeclareDefault = async (defaultedTeamId) => {
    const winningTeamId = defaultedTeamId === game.home_team_id ? game.away_team_id : game.home_team_id;
    const newHomeScore = defaultedTeamId === game.home_team_id ? 0 : 20;
    const newAwayScore = defaultedTeamId === game.away_team_id ? 0 : 20;

    await base44.entities.Game.update(game.id, {
      status: 'completed',
      home_score: newHomeScore,
      away_score: newAwayScore,
      is_default: true,
      defaulted_team_id: defaultedTeamId,
      winning_team_id: winningTeamId,
    });

    const allTeams = await base44.entities.Team.list();
    const winningTeam = allTeams.find(t => t.id === winningTeamId);
    const defaultedTeam = allTeams.find(t => t.id === defaultedTeamId);

    await base44.entities.Team.update(winningTeamId, {
      wins: (winningTeam.wins || 0) + 1
    });

    await base44.entities.Team.update(defaultedTeamId, {
      losses: (defaultedTeam.losses || 0) + 1
    });

    setShowDefaultDialog(false);
    navigate(createPageUrl("Games"));
  };

  const handleUndoDefault = async () => {
    if (!game.is_default) return;

    const allTeams = await base44.entities.Team.list();
    const winningTeam = allTeams.find(t => t.id === game.winning_team_id);
    const defaultedTeam = allTeams.find(t => t.id === game.defaulted_team_id);

    await base44.entities.Team.update(game.winning_team_id, {
      wins: Math.max(0, (winningTeam.wins || 0) - 1)
    });

    await base44.entities.Team.update(game.defaulted_team_id, {
      losses: Math.max(0, (defaultedTeam.losses || 0) - 1)
    });

    await base44.entities.Game.update(game.id, {
      status: 'in_progress',
      home_score: 0,
      away_score: 0,
      is_default: false,
      defaulted_team_id: null,
      winning_team_id: null,
    });

    await loadGame();
  };

  // New voice command handler
  const handleVoiceCommand = async ({ team, player, action }) => {
    if (!game || !player) return;

    const teamId = team === 'home' ? game.home_team_id : game.away_team_id;
    
    // Select the player and team for UI highlight
    setSelectedPlayer(player);
    setSelectedTeam(team);

    // Execute the action based on the command
    if (action === '3-pointer') {
      await addPoints(player.id, teamId, 3);
    } else if (action === '2-pointer') {
      await addPoints(player.id, teamId, 2);
    } else if (action === 'free-throw') {
      await addPoints(player.id, teamId, 1);
    } else if (action === 'foul') {
      await handleFoul(player.id, teamId);
    } else if (action === 'rebound') {
      await addPlayerStat(player.id, teamId, 'rebounds', 1);
    } else if (action === 'assist') {
      await addPlayerStat(player.id, teamId, 'assists', 1);
    } else if (action === 'steal') {
      await addPlayerStat(player.id, teamId, 'steals', 1);
    } else if (action === 'block') {
      await addPlayerStat(player.id, teamId, 'blocks', 1);
    }
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
        className={`relative w-full text-left border-2 rounded-xl p-3 transition-all group overflow-hidden ${
          isFouledOut 
            ? 'bg-red-900/20 opacity-40 cursor-not-allowed border-red-500/30' 
            : isSelected
              ? 'bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 border-orange-400 ring-4 ring-orange-500/30 shadow-2xl scale-105'
              : 'bg-gradient-to-br from-white/5 to-white/10 border-white/20 hover:border-orange-400/50 hover:shadow-xl hover:scale-102 backdrop-blur-sm'
        }`}
        disabled={isFouledOut}
      >
        {!isFouledOut && !isSelected && (
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/10 to-orange-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
        )}
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <div className={`absolute inset-0 ${isSelected ? 'bg-orange-400' : 'bg-orange-500/50'} rounded-xl blur-lg ${isSelected ? 'animate-pulse' : ''}`}></div>
              <Avatar className="relative w-12 h-12 border-3 border-orange-400 shadow-2xl">
                <AvatarImage src={player.photo_url} />
                <AvatarFallback className={`text-base font-black ${isSelected ? 'bg-white text-orange-600' : 'bg-gradient-to-br from-orange-500 to-red-600 text-white'}`}>
                  {player.jersey_number}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="min-w-0">
              <p className={`text-base font-black truncate tracking-wide ${isSelected ? 'text-white drop-shadow-lg' : 'text-white'}`}>
                #{player.jersey_number} {player.first_name} {player.last_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={`flex gap-2 ${isSelected ? 'text-white' : 'text-white/90'}`}>
              <div className="text-center px-2 py-1 rounded-lg bg-black/30 border border-white/10">
                <div className="text-lg font-black">{points}</div>
                <div className={`text-[8px] font-semibold ${isSelected ? 'text-orange-200' : 'text-gray-400'}`}>PTS</div>
              </div>
              <div className="text-center px-2 py-1 rounded-lg bg-black/30 border border-white/10">
                <div className="text-lg font-black">{rebounds}</div>
                <div className={`text-[8px] font-semibold ${isSelected ? 'text-orange-200' : 'text-gray-400'}`}>REB</div>
              </div>
              <div className="text-center px-2 py-1 rounded-lg bg-black/30 border border-white/10">
                <div className="text-lg font-black">{assists}</div>
                <div className={`text-[8px] font-semibold ${isSelected ? 'text-orange-200' : 'text-gray-400'}`}>AST</div>
              </div>
              <div className="text-center px-2 py-1 rounded-lg bg-black/30 border border-white/10">
                <div className="text-lg font-black">{steals}</div>
                <div className={`text-[8px] font-semibold ${isSelected ? 'text-orange-200' : 'text-gray-400'}`}>STL</div>
              </div>
              <div className="text-center px-2 py-1 rounded-lg bg-black/30 border border-white/10">
                <div className="text-lg font-black">{blocks}</div>
                <div className={`text-[8px] font-semibold ${isSelected ? 'text-orange-200' : 'text-gray-400'}`}>BLK</div>
              </div>
              <div className={`text-center px-2 py-1 rounded-lg ${totalFouls >= game.player_foul_limit - 1 ? 'bg-red-500/30 border-red-500' : 'bg-black/30'} border border-white/10`}>
                <div className={`text-lg font-black ${totalFouls >= game.player_foul_limit - 1 ? 'text-red-300' : ''}`}>{totalFouls}</div>
                <div className={`text-[8px] font-semibold ${isSelected ? 'text-orange-200' : 'text-gray-400'}`}>FL</div>
              </div>
            </div>
            {isFouledOut && (
              <Badge className="bg-red-600 border-2 border-red-400 text-white text-[10px] font-black px-2 py-1 shadow-xl">FOULED OUT</Badge>
            )}
          </div>
        </div>
      </button>
    );
  };

  const handlePlayerSelect = (player, team) => {
    setSelectedPlayer(player);
    setSelectedTeam(team);
  };

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
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iIzFmMmQzZCIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9nPjwvc3ZnPg==')] opacity-5"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      
      {/* TOP NAVIGATION BAR */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b-2 border-orange-500/50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {organization?.logo_url && (
              <Avatar className="w-10 h-10 border-2 border-orange-500 shadow-lg">
                <AvatarImage src={organization.logo_url} />
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black text-sm">
                  {organization.name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <div>
              <h1 className="text-lg font-black text-white">{organization?.name || 'Live Scoring'}</h1>
              <p className="text-xs text-gray-400 font-semibold">Basketball Game Management</p>
            </div>
          </div>
          <Button
            onClick={() => navigate(createPageUrl("Dashboard"))}
            variant="outline"
            size="sm"
            className="border-2 border-gray-600 text-white hover:bg-gray-800 font-bold"
          >
            <ChevronRight className="w-4 h-4 mr-1 rotate-180" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* DEFAULT GAME ALERT */}
      {game.is_default && (
        <div className="sticky z-40 bg-red-900/95 border-b-4 border-red-500" style={{ top: '64px' }}>
          <div className="max-w-7xl mx-auto p-4">
            <Alert className="bg-red-800/50 border-2 border-red-400">
              <Flag className="h-5 w-5 text-red-300" />
              <AlertDescription className="text-red-100 font-bold flex items-center justify-between">
                <span>⚠️ This game ended by DEFAULT. {game.defaulted_team_id === homeTeam.id ? homeTeam.name : awayTeam.name} defaulted. Final Score: {game.home_score}-{game.away_score}</span>
                <Button
                  onClick={handleUndoDefault}
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold ml-4"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Undo Default
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      {/* Main Scoreboard */}
      <div className="sticky z-40 bg-black/90 backdrop-blur-xl border-b-4 border-orange-500 shadow-2xl" style={{ top: game.is_default ? '164px' : '64px' }}>
        <div className="absolute inset-0 bg-gradient-to-r from-orange-900/20 via-transparent to-blue-900/20"></div>
        <div className="max-w-7xl mx-auto p-6 relative z-10">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Badge className="bg-gradient-to-r from-red-600 to-red-700 text-white border-2 border-red-400/50 px-8 py-3 text-lg font-black shadow-2xl backdrop-blur-sm">
              <PlayCircle className="w-6 h-6 mr-2 animate-pulse" />
              LIVE - {quarterLabel}
            </Badge>
            <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-2 border-orange-400/50 px-6 py-3 text-base font-black shadow-xl">
              🏀 BASKETBALL
            </Badge>
            <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-2 border-purple-400/50 px-6 py-3 text-base font-black shadow-xl">
              {game.game_type?.replace('_', ' ').toUpperCase() || 'REGULAR SEASON'}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-8 items-center mb-6">
            {/* HOME TEAM */}
            <div className="text-center relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-transparent rounded-3xl blur-3xl"></div>
              <div className="relative z-10">
                <Badge className="mb-3 bg-orange-500/20 text-orange-400 border border-orange-500/50 font-black text-sm px-4 py-1 backdrop-blur-sm">
                  HOME
                </Badge>
                <div className="flex items-center justify-center gap-4 mb-3">
                  <Avatar className="w-20 h-20 border-4 border-orange-500 shadow-2xl ring-4 ring-orange-500/30">
                    <AvatarImage src={homeTeam.logo_url} />
                    <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black text-2xl">
                      {homeTeam.name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-white text-3xl font-black text-left tracking-tight">{homeTeam.name}</div>
                </div>
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-500 opacity-50 blur-2xl"></div>
                  <div className="text-orange-400 text-8xl font-black mb-3 relative z-10 drop-shadow-2xl" style={{textShadow: '0 0 30px rgba(251, 146, 60, 0.5)'}}>{homeScore}</div>
                </div>
                <div className="flex justify-center gap-6 text-sm font-bold">
                  <span className={`px-3 py-1 rounded-lg backdrop-blur-sm ${inPenalty('home') ? 'bg-red-500/30 text-red-300 border border-red-500/50' : 'bg-white/10 text-orange-300 border border-orange-500/30'}`}>
                    FOULS: {homeTeamFouls}/{game.penalty_limit_per_quarter}
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-white/10 text-orange-300 border border-orange-500/30 backdrop-blur-sm">TO: {homeTimeouts}</span>
                </div>
              </div>
            </div>

            {/* QUARTER SCORES */}
            <div className="text-center relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent rounded-3xl blur-3xl"></div>
              <div className="relative z-10">
                <div className="text-white text-3xl font-black mb-4 tracking-wider" style={{textShadow: '0 0 20px rgba(168, 85, 247, 0.5)'}}>{quarterLabel}</div>
                <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md rounded-2xl p-5 mb-6 border border-white/20 shadow-2xl">
                  <div className="flex justify-center gap-4 flex-wrap">
                    {[1, 2, 3, 4].map(q => {
                      const qScore = quarterScores.find(qs => qs.quarter === q);
                      const isCurrent = q === currentQuarter;
                      return (
                        <div key={q} className={`px-3 py-2 rounded-lg font-black transition-all ${
                          isCurrent 
                            ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white scale-110 shadow-xl border-2 border-orange-400' 
                            : 'bg-black/30 text-gray-300 border border-white/10'
                        }`}>
                          <div className="text-[10px] opacity-70 mb-1">Q{q}</div>
                          <div className="text-lg">{qScore ? `${qScore.home}-${qScore.away}` : '-'}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              
                {/* BUTTONS */}
                <div className="flex gap-2 justify-center flex-wrap">
                {!game.is_default && game.status === 'in_progress' && (
                  <Button
                    onClick={() => setShowDefaultDialog(true)}
                    size="sm"
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-black text-xs px-4 py-2"
                  >
                    <Flag className="w-4 h-4 mr-1" />
                    DEFAULT
                  </Button>
                )}
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
            </div>

            {/* AWAY TEAM */}
            <div className="text-center relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent rounded-3xl blur-3xl"></div>
              <div className="relative z-10">
                <Badge className="mb-3 bg-blue-500/20 text-blue-400 border border-blue-500/50 font-black text-sm px-4 py-1 backdrop-blur-sm">
                  AWAY
                </Badge>
                <div className="flex items-center justify-center gap-4 mb-3">
                  <div className="text-white text-3xl font-black text-right tracking-tight">{awayTeam.name}</div>
                  <Avatar className="w-20 h-20 border-4 border-blue-500 shadow-2xl ring-4 ring-blue-500/30">
                    <AvatarImage src={awayTeam.logo_url} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white font-black text-2xl">
                      {awayTeam.name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 opacity-50 blur-2xl"></div>
                  <div className="text-blue-400 text-8xl font-black mb-3 relative z-10 drop-shadow-2xl" style={{textShadow: '0 0 30px rgba(59, 130, 246, 0.5)'}}>{awayScore}</div>
                </div>
                <div className="flex justify-center gap-6 text-sm font-bold">
                  <span className={`px-3 py-1 rounded-lg backdrop-blur-sm ${inPenalty('away') ? 'bg-red-500/30 text-red-300 border border-red-500/50' : 'bg-white/10 text-blue-300 border border-blue-500/30'}`}>
                    FOULS: {awayTeamFouls}/{game.penalty_limit_per_quarter}
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-white/10 text-blue-300 border border-blue-500/30 backdrop-blur-sm">TO: {awayTimeouts}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ALERTS */}
          {currentQuarter >= 4 && homeScore === awayScore && (
            <Alert className="bg-yellow-900/50 border-2 border-yellow-500 mb-4">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <AlertDescription className="text-yellow-200 font-bold text-center">
                ⚠️ Game is TIED! Must play overtime period.
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

      {/* Voice Assistant - Add below scoreboard */}
      <div className="max-w-7xl mx-auto px-4 mt-4">
        <VoiceAssistant
          homePlayers={homePlayers}
          awayPlayers={awayPlayers}
          onCommand={handleVoiceCommand}
          sport="basketball"
        />
      </div>

      {/* Control Panel */}
      {selectedPlayer ? (
        <div className="sticky z-30" style={{ top: game.is_default ? '670px' : '570px' }}>
          <div className="mx-4 my-4">
            <Card className="relative overflow-hidden bg-gradient-to-br from-gray-900 to-black border-4 border-orange-500/50 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-purple-500/10 to-blue-500/10"></div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-500/20 to-transparent rounded-full blur-3xl"></div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-blue-500 rounded-2xl blur-xl opacity-60 animate-pulse"></div>
                      <Avatar className="relative w-16 h-16 border-4 border-orange-400 shadow-2xl ring-4 ring-orange-500/30">
                        <AvatarImage src={selectedPlayer.photo_url} />
                        <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white font-black text-2xl">
                          {selectedPlayer.jersey_number}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white mb-1">
                        #{selectedPlayer.jersey_number} {selectedPlayer.first_name} {selectedPlayer.last_name}
                      </h3>
                      <p className="text-sm text-orange-400 font-bold tracking-wide">
                        {selectedTeam === 'home' ? homeTeam?.name : awayTeam?.name}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedPlayer(null)}
                    className="text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                  >
                    <div className="text-2xl">✕</div>
                  </Button>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  <Button
                    onClick={() => addPoints(selectedPlayer.id, selectedTeam === 'home' ? game.home_team_id : game.away_team_id, 1)}
                    className="relative overflow-hidden group h-16 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 active:scale-95 text-white font-black text-base shadow-2xl transition-all duration-150 border-2 border-blue-400/50"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <span className="relative z-10">+1 PT</span>
                  </Button>
                  <Button
                    onClick={() => addPoints(selectedPlayer.id, selectedTeam === 'home' ? game.home_team_id : game.away_team_id, 2)}
                    className="relative overflow-hidden group h-16 bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 hover:from-green-600 hover:via-green-700 hover:to-emerald-700 active:scale-95 text-white font-black text-base shadow-2xl transition-all duration-150 border-2 border-green-400/50"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <span className="relative z-10">+2 PTS</span>
                  </Button>
                  <Button
                    onClick={() => addPoints(selectedPlayer.id, selectedTeam === 'home' ? game.home_team_id : game.away_team_id, 3)}
                    className="relative overflow-hidden group h-16 bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 hover:from-orange-600 hover:via-orange-700 hover:to-red-700 active:scale-95 text-white font-black text-base shadow-2xl transition-all duration-150 border-2 border-orange-400/50"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <span className="relative z-10">+3 PTS</span>
                  </Button>
                  <Button
                    onClick={() => addPlayerStat(selectedPlayer.id, selectedTeam === 'home' ? game.home_team_id : game.away_team_id, 'rebounds', 1)}
                    className="relative overflow-hidden group h-16 bg-gradient-to-br from-purple-500 via-purple-600 to-fuchsia-600 hover:from-purple-600 hover:via-purple-700 hover:to-fuchsia-700 active:scale-95 text-white font-bold text-sm shadow-2xl transition-all duration-150 border-2 border-purple-400/50"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <span className="relative z-10 flex items-center gap-1">
                      <TrendingUp className="w-5 h-5" />
                      REB
                    </span>
                  </Button>
                  <Button
                    onClick={() => addPlayerStat(selectedPlayer.id, selectedTeam === 'home' ? game.home_team_id : game.away_team_id, 'assists', 1)}
                    className="relative overflow-hidden group h-16 bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-600 hover:from-teal-600 hover:via-teal-700 hover:to-cyan-700 active:scale-95 text-white font-bold text-sm shadow-2xl transition-all duration-150 border-2 border-teal-400/50"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <span className="relative z-10 flex items-center gap-1">
                      <Target className="w-5 h-5" />
                      AST
                    </span>
                  </Button>
                  <Button
                    onClick={() => addPlayerStat(selectedPlayer.id, selectedTeam === 'home' ? game.home_team_id : game.away_team_id, 'steals', 1)}
                    className="relative overflow-hidden group h-16 bg-gradient-to-br from-cyan-500 via-cyan-600 to-blue-600 hover:from-cyan-600 hover:via-cyan-700 hover:to-blue-700 active:scale-95 text-white font-bold text-sm shadow-2xl transition-all duration-150 border-2 border-cyan-400/50"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <span className="relative z-10 flex items-center gap-1">
                      <Zap className="w-5 h-5" />
                      STL
                    </span>
                  </Button>
                  <Button
                    onClick={() => addPlayerStat(selectedPlayer.id, selectedTeam === 'home' ? game.home_team_id : game.away_team_id, 'blocks', 1)}
                    className="relative overflow-hidden group h-16 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:via-indigo-700 hover:to-purple-700 active:scale-95 text-white font-bold text-sm shadow-2xl transition-all duration-150 border-2 border-indigo-400/50"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <span className="relative z-10 flex items-center gap-1">
                      <Shield className="w-5 h-5" />
                      BLK
                    </span>
                  </Button>
                  <Button
                    onClick={() => handleFoul(selectedPlayer.id, selectedTeam === 'home' ? game.home_team_id : game.away_team_id)}
                    className="relative overflow-hidden group h-16 bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:via-amber-700 hover:to-yellow-700 active:scale-95 text-white font-bold text-sm shadow-2xl transition-all duration-150 border-2 border-amber-400/50"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <span className="relative z-10 flex items-center gap-1">
                      <AlertTriangle className="w-5 h-5" />
                      FOUL
                    </span>
                  </Button>
                  <Button
                    onClick={handleUndo}
                    disabled={actionHistory.length === 0}
                    className="relative overflow-hidden group h-16 bg-gradient-to-br from-rose-500 via-rose-600 to-pink-600 hover:from-rose-600 hover:via-rose-700 hover:to-pink-700 active:scale-95 text-white font-bold text-sm shadow-2xl transition-all duration-150 border-2 border-rose-400/50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <span className="relative z-10 flex items-center gap-1">
                      <RotateCcw className="w-5 h-5" />
                      UNDO
                    </span>
                  </Button>
                </div>

                {/* QUARTER STATS */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-orange-400 tracking-wide">QUARTER STATS</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowQuarterStats(!showQuarterStats)}
                      className="text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"
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
                    <div className="p-5 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl">
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 text-center">
                        <div className="bg-black/30 rounded-xl p-3 border border-blue-500/30">
                          <div className="text-3xl font-black text-blue-400">{getCurrentQuarterPlayerStat(selectedPlayer.id, 'points')}</div>
                          <div className="text-[10px] text-blue-300 font-semibold tracking-wide">PTS</div>
                        </div>
                        <div className="bg-black/30 rounded-xl p-3 border border-green-500/30">
                          <div className="text-3xl font-black text-green-400">{getCurrentQuarterPlayerStat(selectedPlayer.id, 'rebounds')}</div>
                          <div className="text-[10px] text-green-300 font-semibold tracking-wide">REB</div>
                        </div>
                        <div className="bg-black/30 rounded-xl p-3 border border-purple-500/30">
                          <div className="text-3xl font-black text-purple-400">{getCurrentQuarterPlayerStat(selectedPlayer.id, 'assists')}</div>
                          <div className="text-[10px] text-purple-300 font-semibold tracking-wide">AST</div>
                        </div>
                        <div className="bg-black/30 rounded-xl p-3 border border-cyan-500/30">
                          <div className="text-3xl font-black text-cyan-400">{getCurrentQuarterPlayerStat(selectedPlayer.id, 'steals')}</div>
                          <div className="text-[10px] text-cyan-300 font-semibold tracking-wide">STL</div>
                        </div>
                        <div className="bg-black/30 rounded-xl p-3 border border-indigo-500/30">
                          <div className="text-3xl font-black text-indigo-400">{getCurrentQuarterPlayerStat(selectedPlayer.id, 'blocks')}</div>
                          <div className="text-[10px] text-indigo-300 font-semibold tracking-wide">BLK</div>
                        </div>
                        <div className="bg-black/30 rounded-xl p-3 border border-orange-500/30">
                          <div className="text-3xl font-black text-orange-400">{getCurrentQuarterPlayerStat(selectedPlayer.id, 'fouls')}</div>
                          <div className="text-[10px] text-orange-300 font-semibold tracking-wide">FOULS</div>
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
        <div className="mx-4 mt-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-purple-500/10 to-blue-500/10 rounded-2xl blur-xl"></div>
          <div className="relative bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-sm border-2 border-orange-500/30 rounded-2xl p-10 text-center shadow-2xl">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-blue-500 rounded-full blur-2xl opacity-50 animate-pulse"></div>
              <User className="relative w-20 h-20 text-orange-400 mx-auto" />
            </div>
            <p className="text-2xl font-black text-white mb-2 tracking-wide">SELECT A PLAYER</p>
            <p className="text-base text-gray-400 font-medium">
              Click on a player below to start tracking statistics
            </p>
          </div>
        </div>
      )}

      {/* Players Section */}
      <div className="max-w-7xl mx-auto p-4 pb-24 relative z-10">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Home Team */}
          <div className="flex flex-col h-[700px] relative overflow-hidden rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-900/40 via-orange-950/60 to-black/80 backdrop-blur-sm"></div>
            <div className="absolute inset-0 border-4 border-orange-500/50 rounded-2xl"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl"></div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex-shrink-0 bg-gradient-to-r from-orange-600 to-red-600 border-b-4 border-orange-400/50 p-4 rounded-t-2xl shadow-xl">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-2xl font-black text-white tracking-wide drop-shadow-lg">
                    {homeTeam.name} - HOME
                  </h2>
                  <Button
                    onClick={() => useTimeout('home')}
                    disabled={homeTimeouts === 0}
                    className="bg-black/50 hover:bg-black/70 border-2 border-orange-400/50 text-white font-bold text-sm px-4 py-2 disabled:opacity-30 whitespace-nowrap backdrop-blur-sm shadow-xl"
                  >
                    <Clock className="w-4 h-4 mr-1" />
                    TO ({homeTimeouts})
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {homePlayers.map(player => (
                  <PlayerRow key={getPlayerRenderKey(player.id)} player={player} team="home" teamId={game.home_team_id} onSelect={handlePlayerSelect} />
                ))}
              </div>
            </div>
          </div>

          {/* Away Team */}
          <div className="flex flex-col h-[700px] relative overflow-hidden rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-blue-950/60 to-black/80 backdrop-blur-sm"></div>
            <div className="absolute inset-0 border-4 border-blue-500/50 rounded-2xl"></div>
            <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-cyan-600 border-b-4 border-blue-400/50 p-4 rounded-t-2xl shadow-xl">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-2xl font-black text-white tracking-wide drop-shadow-lg">
                    {awayTeam.name} - AWAY
                  </h2>
                  <Button
                    onClick={() => useTimeout('away')}
                    disabled={awayTimeouts === 0}
                    className="bg-black/50 hover:bg-black/70 border-2 border-blue-400/50 text-white font-bold text-sm px-4 py-2 disabled:opacity-30 whitespace-nowrap backdrop-blur-sm shadow-xl"
                  >
                    <Clock className="w-4 h-4 mr-1" />
                    TO ({awayTimeouts})
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {awayPlayers.map(player => (
                  <PlayerRow key={getPlayerRenderKey(player.id)} player={player} team="away" teamId={game.away_team_id} onSelect={handlePlayerSelect} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Declare Default Dialog */}
      <Dialog open={showDefaultDialog} onOpenChange={setShowDefaultDialog}>
        <DialogContent className="bg-gray-900 border-4 border-red-500 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl font-black flex items-center gap-2">
              <Flag className="w-6 h-6 text-red-400" />
              Declare Game Default
            </DialogTitle>
            <DialogDescription className="text-gray-300 font-bold">
              Select which team is defaulting. The non-defaulting team will automatically win 20-0.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="bg-red-900/50 border-2 border-red-500">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200 font-bold text-sm">
                ⚠️ This action will end the game immediately. The defaulting team will receive a loss and the other team will receive a win.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button
                onClick={() => handleDeclareDefault(game.home_team_id)}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black text-lg py-6 border-2 border-orange-400"
              >
                {homeTeam.name} DEFAULTS
                <span className="ml-2 text-sm">(Away team wins 20-0)</span>
              </Button>
              
              <Button
                onClick={() => handleDeclareDefault(game.away_team_id)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-lg py-6 border-2 border-blue-400"
              >
                {awayTeam.name} DEFAULTS
                <span className="ml-2 text-sm">(Home team wins 20-0)</span>
              </Button>
            </div>

            <Button
              onClick={() => setShowDefaultDialog(false)}
              variant="outline"
              className="w-full border-2 border-gray-600 text-white hover:bg-gray-800 font-black"
            >
              CANCEL
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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