
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayCircle, ChevronRight, Clock, Target, Shield, Zap, Trophy, RotateCcw, User, Eye, EyeOff, CheckCircle, AlertTriangle, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import VoiceAssistant from "@/components/VoiceAssistant";


export default function LiveScoringVolleyball() {
  const [game, setGame] = useState(null);
  const [currentSet, setCurrentSet] = useState(1);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [setScores, setSetScores] = useState([]);
  const [homeTimeouts, setHomeTimeouts] = useState(5);
  const [awayTimeouts, setAwayTimeouts] = useState(5);
  const [playerStats, setPlayerStats] = useState({});
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showSetEnd, setShowSetEnd] = useState(false);
  const [showDefaultDialog, setShowDefaultDialog] = useState(false);
  const [actionHistory, setActionHistory] = useState([]);
  const [showSetStats, setShowSetStats] = useState(true);
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

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
    setCurrentSet(currentGame.current_quarter || 1);
    setSetScores(currentGame.quarter_scores || []);
    setHomeTimeouts(currentGame.home_timeouts ?? 5);
    setAwayTimeouts(currentGame.away_timeouts ?? 5);
    
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

  const getPlayerStatKey = (playerId) => `${playerId}_${currentSet}`;

  const getPlayerStat = (playerId, statType) => {
    let total = 0;
    for (let s = 1; s <= currentSet; s++) {
      const key = `${playerId}_${s}`;
      total += playerStats[key]?.[statType] || 0;
    }
    return total;
  };

  const getCurrentSetPlayerStat = (playerId, statType) => {
    const key = `${playerId}_${currentSet}`;
    return playerStats[key]?.[statType] || 0;
  };

  const updatePlayerStats = async (playerId, teamId, statUpdates) => {
    const key = getPlayerStatKey(playerId);
    
    setPlayerStats(prev => {
      const existingStat = prev[key] || {};
      const updatedStat = {
        ...existingStat,
        game_id: game.id,
        player_id: playerId,
        team_id: teamId,
        quarter: currentSet,
      };

      statUpdates.forEach(({ statType, value }) => {
        updatedStat[statType] = Math.max(0, (existingStat[statType] || 0) + value);
      });

      return {
        ...prev,
        [key]: updatedStat,
      };
    });

    setTimeout(async () => {
      const currentStats = playerStats;
      const statToSave = currentStats[key]; 
      
      if (!statToSave) return;

      try {
        if (statToSave.id) {
          await base44.entities.PlayerGameStats.update(statToSave.id, statToSave);
        } else {
          const created = await base44.entities.PlayerGameStats.create(statToSave);
          setPlayerStats(prev => ({
            ...prev,
            [key]: { ...prev[key], id: created.id },
          }));
        }
      } catch (error) {
        console.error("Error saving player stats:", error);
      }
    }, 100);
  };

  const handleScoreWithStat = async (statType, pointType) => {
    if (!selectedPlayer || !selectedTeam || !game) return;

    const teamId = selectedTeam === 'home' ? game.home_team_id : game.away_team_id;
    const key = getPlayerStatKey(selectedPlayer.id);
    const currentStatValue = playerStats[key]?.[statType] || 0;

    const newHomeScore = selectedTeam === 'home' ? homeScore + 1 : homeScore;
    const newAwayScore = selectedTeam === 'away' ? awayScore + 1 : awayScore;

    // Add a COMBINED action to history
    const action = {
      type: 'score_with_stat',
      playerId: selectedPlayer.id,
      teamId: teamId,
      statType: statType,
      value: 1,
      team: selectedTeam,
      pointType: pointType,
      quarter: currentSet,
      previousHomeScore: homeScore,
      previousAwayScore: awayScore,
      previousStatValue: currentStatValue,
    };
    setActionHistory(prev => [...prev, action]);

    // Update player stat
    await updatePlayerStats(selectedPlayer.id, teamId, [{ statType, value: 1 }]);

    // Update score
    setHomeScore(newHomeScore);
    setAwayScore(newAwayScore);
    await base44.entities.Game.update(game.id, {
      home_score: newHomeScore,
      away_score: newAwayScore,
    });
  };

  const handleScoreOnly = async () => {
    if (!selectedTeam || !game) return;

    const newHomeScore = selectedTeam === 'home' ? homeScore + 1 : homeScore;
    const newAwayScore = selectedTeam === 'away' ? awayScore + 1 : awayScore;

    const action = {
      type: 'score_only',
      team: selectedTeam,
      quarter: currentSet,
      previousHomeScore: homeScore,
      previousAwayScore: awayScore,
    };
    setActionHistory(prev => [...prev, action]);

    setHomeScore(newHomeScore);
    setAwayScore(newAwayScore);

    await base44.entities.Game.update(game.id, {
      home_score: newHomeScore,
      away_score: newAwayScore,
    });
  };

  const handleUndo = async () => {
    if (actionHistory.length === 0) return;

    const lastAction = actionHistory[actionHistory.length - 1];
    setActionHistory(prev => prev.slice(0, -1));

    if (lastAction.quarter !== currentSet) {
      console.warn("Cannot undo action from a previous set.");
      return; 
    }

    if (lastAction.type === 'score_with_stat') {
      // Undo both score AND stat
      const newHomeScore = lastAction.previousHomeScore;
      const newAwayScore = lastAction.previousAwayScore;
      setHomeScore(newHomeScore);
      setAwayScore(newAwayScore);
      await base44.entities.Game.update(game.id, {
        home_score: newHomeScore,
        away_score: newAwayScore,
      });
      
      await updatePlayerStats(lastAction.playerId, lastAction.teamId, [{ 
        statType: lastAction.statType, 
        value: -lastAction.value 
      }]);
    } else if (lastAction.type === 'score_only') {
      // Undo only score
      const newHomeScore = lastAction.previousHomeScore;
      const newAwayScore = lastAction.previousAwayScore;
      setHomeScore(newHomeScore);
      setAwayScore(newAwayScore);
      await base44.entities.Game.update(game.id, {
        home_score: newHomeScore,
        away_score: newAwayScore,
      });
    } else if (lastAction.type === 'timeout') {
      if (lastAction.team === 'home') {
        const newTimeouts = homeTimeouts + 1;
        setHomeTimeouts(newTimeouts);
        await base44.entities.Game.update(game.id, { home_timeouts: newTimeouts });
      } else if (lastAction.team === 'away') {
        const newTimeouts = awayTimeouts + 1;
        setAwayTimeouts(newTimeouts);
        await base44.entities.Game.update(game.id, { away_timeouts: newTimeouts });
      }
    }
  };

  const useTimeout = async (team) => {
    if (game) {
      const action = {
        type: 'timeout',
        team: team,
        quarter: currentSet,
      };
      setActionHistory(prev => [...prev, action]);

      if (team === 'home' && homeTimeouts > 0) {
        const newTimeouts = homeTimeouts - 1;
        setHomeTimeouts(newTimeouts);
        await base44.entities.Game.update(game.id, { home_timeouts: newTimeouts });
      } else if (team === 'away' && awayTimeouts > 0) {
        const newTimeouts = awayTimeouts - 1;
        setAwayTimeouts(newTimeouts);
        await base44.entities.Game.update(game.id, { away_timeouts: newTimeouts });
      }
    }
  };

  const endSet = async () => {
    const setScore = {
      quarter: currentSet,
      home: homeScore,
      away: awayScore,
    };

    const newSetScores = [...setScores, setScore];
    setSetScores(newSetScores);

    const totalHomeScore = newSetScores.reduce((sum, s) => sum + s.home, 0);
    const totalAwayScore = newSetScores.reduce((sum, s) => sum + s.away, 0);

    await base44.entities.Game.update(game.id, {
      quarter_scores: newSetScores,
      current_quarter: currentSet + 1,
      home_score: totalHomeScore,
      away_score: totalAwayScore,
    });

    if (currentSet < 5) {
      setCurrentSet(currentSet + 1);
    }
    
    setHomeScore(0);
    setAwayScore(0);
    setActionHistory([]);
    setShowSetEnd(false);
  };

  const endGame = async () => {
    let homeSetsWon = 0;
    let awaySetsWon = 0;
    
    setScores.forEach(set => {
      if (set.home > set.away) homeSetsWon++;
      else if (set.away > set.home) awaySetsWon++;
    });

    if (homeScore > awayScore) homeSetsWon++;
    else if (awayScore > homeScore) awaySetsWon++;

    const allSets = [...setScores, { home: homeScore, away: awayScore }];
    const finalHomeScore = allSets.reduce((sum, s) => sum + s.home, 0);
    const finalAwayScore = allSets.reduce((sum, s) => sum + s.away, 0);

    await base44.entities.Game.update(game.id, {
      status: 'completed',
      home_score: finalHomeScore,
      away_score: finalAwayScore,
    });

    const allTeams = await base44.entities.Team.list();
    const homeTeamToUpdate = allTeams.find(t => t.id === game.home_team_id);
    const awayTeamToUpdate = allTeams.find(t => t.id === game.away_team_id);

    if (homeSetsWon > awaySetsWon) {
      if (homeTeamToUpdate) {
        await base44.entities.Team.update(game.home_team_id, {
          wins: (homeTeamToUpdate.wins || 0) + 1
        });
      }
      if (awayTeamToUpdate) {
        await base44.entities.Team.update(game.away_team_id, {
          losses: (awayTeamToUpdate.losses || 0) + 1
        });
      }
    } else if (awaySetsWon > homeSetsWon) {
      if (homeTeamToUpdate) {
        await base44.entities.Team.update(game.home_team_id, {
          losses: (homeTeamToUpdate.losses || 0) + 1
        });
      }
      if (awayTeamToUpdate) {
        await base44.entities.Team.update(game.away_team_id, {
          wins: (awayTeamToUpdate.wins || 0) + 1
        });
      }
    }

    navigate(createPageUrl("Games"));
  };

  const handleVoiceCommand = async ({ team, player, action, value }) => {
    if (!game) {
      console.warn("Game not loaded, cannot process voice command.");
      return;
    }

    const teamId = team === 'home' ? game.home_team_id : game.away_team_id;
    
    // Select the player and team
    setSelectedPlayer(player);
    setSelectedTeam(team);

    // Execute the action based on the command
    if (action === 'point') {
      await handleScoreOnly();
    } else if (action === 'kill') {
      await handleScoreWithStat('field_goals_made', 'attack');
    } else if (action === 'ace') {
      await handleScoreWithStat('three_pointers', 'ace');
    } else if (action === 'block') {
      await handleScoreWithStat('blocks', 'block');
    } else if (action === 'assist') {
      await updatePlayerStats(player.id, teamId, [{ statType: 'assists', value: 1 }]);
    } else if (action === 'dig') {
      await updatePlayerStats(player.id, teamId, [{ statType: 'rebounds', value: 1 }]);
    } else if (action === 'error') {
      await updatePlayerStats(player.id, teamId, [{ statType: 'steals', value: 1 }]);
    }
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

  if (!game || !homeTeam || !awayTeam || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  const setLabel = `Set ${currentSet}`;
  const currentSetStats = selectedPlayer ? (playerStats[`${selectedPlayer.id}_${currentSet}`] || {}) : {};

  const PlayerRow = ({ player, team, teamId, onSelect }) => {
    const attacks = getPlayerStat(player.id, 'field_goals_made');
    const blocks = getPlayerStat(player.id, 'blocks');
    const aces = getPlayerStat(player.id, 'three_pointers');
    const assists = getPlayerStat(player.id, 'assists');
    const points = attacks + blocks + aces;

    const isSelected = selectedPlayer?.id === player.id;

    return (
      <button
        onClick={() => onSelect(player, team)}
        className={`w-full text-left border-2 rounded-lg p-3 mb-2 transition-all ${
          isSelected
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 border-blue-400 ring-2 ring-blue-300 shadow-lg scale-105'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700 shadow-md">
              <AvatarImage src={player.photo_url} />
              <AvatarFallback className={`text-sm font-black ${isSelected ? 'bg-white text-blue-600' : 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'}`}>
                {player.jersey_number}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                #{player.jersey_number} {player.first_name} {player.last_name}
              </p>
            </div>
          </div>
          <div className={`flex gap-3 flex-shrink-0 ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
            <div className="text-center">
              <div className="text-xl font-black">{points}</div>
              <div className={`text-[9px] font-semibold ${isSelected ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>PTS</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black">{attacks}</div>
              <div className={`text-[9px] font-semibold ${isSelected ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>ATK</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black">{blocks}</div>
              <div className={`text-[9px] font-semibold ${isSelected ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>BLK</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black">{aces}</div>
              <div className={`text-[9px] font-semibold ${isSelected ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>ACE</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black">{assists}</div>
              <div className={`text-[9px] font-semibold ${isSelected ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>AST</div>
            </div>
          </div>
        </div>
      </button>
    );
  };

  const handlePlayerSelect = (player, team) => {
    setSelectedPlayer(player);
    setSelectedTeam(team);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900">
      <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {organization?.logo_url && (
              <Avatar className="w-10 h-10 border-2 border-blue-500 shadow-lg">
                <AvatarImage src={organization.logo_url} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white font-black text-sm">
                  {organization.name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <div>
              <h1 className="text-lg font-black text-white">{organization?.name || 'Live Scoring'}</h1>
              <p className="text-xs text-gray-400 font-semibold">Volleyball Game Management</p>
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

      <div className="sticky z-40 bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 border-b-4 border-blue-500 shadow-2xl" style={{ top: game.is_default ? '164px' : '64px' }}>
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Badge className="bg-red-600 text-white border-2 border-red-400 px-6 py-2 text-base font-black shadow-lg">
              <PlayCircle className="w-5 h-5 mr-2 animate-pulse" />
              LIVE - {setLabel}
            </Badge>
            <Badge className="bg-blue-600 text-white border-2 border-blue-400 px-4 py-2 text-sm font-black">
              VOLLEYBALL
            </Badge>
            <Badge className="bg-purple-600 text-white border-2 border-purple-400 px-4 py-2 text-sm font-black">
              {game.game_type?.replace('_', ' ').toUpperCase() || 'REGULAR SEASON'}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-4 items-center mb-4">
            <div className="text-center">
              <div className="text-blue-400 text-sm font-black mb-2">HOME</div>
              <div className="flex items-center justify-center gap-3 mb-2">
                <Avatar className="w-16 h-16 border-4 border-blue-400 shadow-2xl">
                  <AvatarImage src={homeTeam.logo_url} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-black text-lg">
                    {homeTeam.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-white text-2xl font-black text-left">{homeTeam.name}</div>
              </div>
              <div className="text-blue-500 text-7xl font-black mb-2">{homeScore}</div>
              <div className="text-white text-xs font-bold">
                Total: {setScores.reduce((sum, s) => sum + s.home, 0) + homeScore} | Sets Won: {setScores.filter(s => s.home > s.away).length}
              </div>
            </div>

            <div className="text-center">
              <div className="text-white text-2xl font-black mb-3">{setLabel}</div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4">
                <div className="flex justify-center gap-3 flex-wrap">
                  {[1, 2, 3, 4, 5].map(s => {
                    const setScore = setScores.find(ss => ss.quarter === s);
                    return (
                      <div key={s} className="text-base font-black text-white">
                        <span className="text-gray-400">S{s}:</span> {setScore ? `${setScore.home}-${setScore.away}` : '-'}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 justify-center">
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
                {currentSet <= 5 && (
                  <Button
                    onClick={() => setShowSetEnd(true)}
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-black text-xs px-4 py-2"
                  >
                    END {setLabel}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
                {currentSet >= 3 && (
                  <Button
                    onClick={endGame}
                    size="sm"
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-black text-xs px-4 py-2"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    END GAME
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

            <div className="text-center">
              <div className="text-cyan-400 text-sm font-black mb-2">AWAY</div>
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="text-white text-2xl font-black text-right">{awayTeam.name}</div>
                <Avatar className="w-16 h-16 border-4 border-cyan-400 shadow-2xl">
                  <AvatarImage src={awayTeam.logo_url} />
                  <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white font-black text-lg">
                    {awayTeam.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="text-cyan-500 text-7xl font-black mb-2">{awayScore}</div>
              <div className="text-white text-xs font-bold">
                Total: {setScores.reduce((sum, s) => sum + s.away, 0) + awayScore} | Sets Won: {setScores.filter(s => s.away > s.home).length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Assistant - Add below scoreboard */}
      <div className="max-w-7xl mx-auto px-4 mt-4">
        <VoiceAssistant
          homePlayers={homePlayers}
          awayPlayers={awayPlayers}
          onCommand={handleVoiceCommand}
          sport="volleyball"
        />
      </div>

      {selectedPlayer ? (
        <div className="sticky z-30 bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900" style={{ top: '364px' }}>
          <div className="mx-4 my-4">
            <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-14 h-14 border-4 border-blue-200 dark:border-blue-800 shadow-lg">
                      <AvatarImage src={selectedPlayer?.photo_url} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-black text-lg">
                        {selectedPlayer?.jersey_number}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white">
                        #{selectedPlayer?.jersey_number} {selectedPlayer?.first_name} {selectedPlayer?.last_name}
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
                    onClick={() => handleScoreWithStat('field_goals_made', 'attack')}
                    className="flex-1 min-w-[90px] h-14 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-95 text-white font-black text-xs shadow-lg transition-all duration-150 hover:shadow-xl"
                  >
                    <Target className="w-4 h-4 mr-1" />
                    ATTACK
                  </Button>
                  <Button
                    onClick={() => handleScoreWithStat('blocks', 'block')}
                    className="flex-1 min-w-[90px] h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 active:scale-95 text-white font-black text-xs shadow-lg transition-all duration-150 hover:shadow-xl"
                  >
                    <Shield className="w-4 h-4 mr-1" />
                    BLOCK
                  </Button>
                  <Button
                    onClick={() => handleScoreWithStat('three_pointers', 'ace')}
                    className="flex-1 min-w-[80px] h-14 bg-gradient-to-br from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 active:scale-95 text-white font-bold text-xs shadow-lg transition-all duration-150 hover:shadow-xl"
                  >
                    <Zap className="w-4 h-4 mr-1" />
                    ACE
                  </Button>
                  <Button
                    onClick={handleScoreOnly}
                    className="flex-1 min-w-[90px] h-14 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 active:scale-95 text-white font-bold text-xs shadow-lg transition-all duration-150 hover:shadow-xl"
                  >
                    <Trophy className="w-4 h-4 mr-1" />
                    RALLY
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

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Set Stats:</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSetStats(!showSetStats)}
                      className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                      {showSetStats ? (
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

                  {showSetStats && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-2xl font-black text-orange-600 dark:text-orange-400">{currentSetStats.field_goals_made || 0}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">ATK</div>
                        </div>
                        <div>
                          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{currentSetStats.blocks || 0}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">BLK</div>
                        </div>
                        <div>
                          <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400">{currentSetStats.three_pointers || 0}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">ACE</div>
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

      <div className="max-w-7xl mx-auto p-4 pb-24">
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="flex flex-col h-[700px] bg-gradient-to-br from-blue-900/40 to-blue-950/40 border-4 border-blue-500 backdrop-blur-sm rounded-xl">
            <div className="flex-shrink-0 bg-blue-900/95 backdrop-blur-sm border-b-4 border-blue-500 p-3 rounded-t-xl">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-black text-white">
                  {homeTeam.name} - HOME
                </h2>
                <Button
                  onClick={() => useTimeout('home')}
                  disabled={homeTimeouts === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 disabled:opacity-50 whitespace-nowrap"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  TO ({homeTimeouts})
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {homePlayers.map(player => (
                <PlayerRow key={player.id} player={player} team="home" teamId={game.home_team_id} onSelect={handlePlayerSelect} />
              ))}
            </div>
          </div>

          <div className="flex flex-col h-[700px] bg-gradient-to-br from-cyan-900/40 to-cyan-950/40 border-4 border-cyan-500 backdrop-blur-sm rounded-xl">
            <div className="flex-shrink-0 bg-cyan-900/95 backdrop-blur-sm border-b-4 border-cyan-500 p-3 rounded-t-xl">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-black text-white">
                  {awayTeam.name} - AWAY
                </h2>
                <Button
                  onClick={() => useTimeout('away')}
                  disabled={awayTimeouts === 0}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs px-3 py-1.5 disabled:opacity-50 whitespace-nowrap"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  TO ({awayTimeouts})
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {awayPlayers.map(player => (
                <PlayerRow key={player.id} player={player} team="away" teamId={game.away_team_id} onSelect={handlePlayerSelect} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showSetEnd} onOpenChange={setShowSetEnd}>
        <DialogContent className="bg-gray-900 border-4 border-blue-500 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl font-black">End of {setLabel}</DialogTitle>
            <DialogDescription className="text-gray-300 font-bold">
              Save set data and proceed to next set?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-xl p-6 border-2 border-gray-700">
              <div className="flex justify-between text-lg font-bold mb-3 text-white">
                <span>{homeTeam.name}</span>
                <span className="text-blue-500 text-3xl">{homeScore}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-white">
                <span>{awayTeam.name}</span>
                <span className="text-cyan-500 text-3xl">{awayScore}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={endSet}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-black"
              >
                PROCEED TO {currentSet < 5 ? `SET ${currentSet + 1}` : 'END GAME'}
              </Button>
              <Button
                onClick={() => setShowSetEnd(false)}
                variant="outline"
                className="flex-1 border-2 border-gray-600 text-white hover:bg-gray-800 font-black"
              >
                CANCEL
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-lg py-6 border-2 border-blue-400"
              >
                {homeTeam.name} DEFAULTS
                <span className="ml-2 text-sm">(Away team wins 20-0)</span>
              </Button>
              
              <Button
                onClick={() => handleDeclareDefault(game.away_team_id)}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-black text-lg py-6 border-2 border-cyan-400"
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
    </div>
  );
}
