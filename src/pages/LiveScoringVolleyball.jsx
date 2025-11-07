
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Minus, CheckCircle, PlayCircle, AlertTriangle, ChevronRight } from "lucide-react";
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
  const [scoreHistory, setScoreHistory] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadGame();
  }, []);

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

  const getPlayerStatKey = (playerId) => `${playerId}_${currentSet}`;

  const getPlayerStat = (playerId, statType) => {
    const key = getPlayerStatKey(playerId);
    return playerStats[key]?.[statType] || 0;
  };

  const updatePlayerStat = async (playerId, teamId, statType, value) => {
    const key = getPlayerStatKey(playerId);
    const existingStat = playerStats[key];

    const newStatValue = (existingStat?.[statType] || 0) + value;
    
    const updatedStat = {
      ...existingStat,
      game_id: game.id,
      player_id: playerId,
      team_id: teamId,
      quarter: currentSet,
      [statType]: Math.max(0, newStatValue),
    };

    setPlayerStats(prev => ({
      ...prev,
      [key]: updatedStat,
    }));

    if (existingStat?.id) {
      await base44.entities.PlayerGameStats.update(existingStat.id, updatedStat);
    } else {
      const created = await base44.entities.PlayerGameStats.create(updatedStat);
      updatedStat.id = created.id;
      setPlayerStats(prev => ({
        ...prev,
        [key]: updatedStat,
      }));
    }
  };

  const addPoint = async (pointType) => {
    if (!selectedPlayer || !selectedTeam) return;

    const newHomeScore = selectedTeam === 'home' ? homeScore + 1 : homeScore;
    const newAwayScore = selectedTeam === 'away' ? awayScore + 1 : awayScore;

    setHomeScore(newHomeScore);
    setAwayScore(newAwayScore);

    setScoreHistory(prev => [...prev, {
      team: selectedTeam,
      pointType,
      playerId: selectedPlayer.id,
      set: currentSet,
      homeScore: newHomeScore,
      awayScore: newAwayScore,
    }]);

    await base44.entities.Game.update(game.id, {
      home_score: newHomeScore,
      away_score: newAwayScore,
    });

    const teamId = selectedTeam === 'home' ? game.home_team_id : game.away_team_id;
    
    // Only track player stats for attack, block, and ace (NOT rally points)
    if (pointType !== 'rally') {
      await updatePlayerStat(selectedPlayer.id, teamId, 'points', 1);
      
      // Track specific volleyball stats
      if (pointType === 'attack') {
        await updatePlayerStat(selectedPlayer.id, teamId, 'field_goals_made', 1);
      } else if (pointType === 'block') {
        await updatePlayerStat(selectedPlayer.id, teamId, 'blocks', 1);
      } else if (pointType === 'ace') {
        await updatePlayerStat(selectedPlayer.id, teamId, 'three_pointers', 1);
      }
    }
  };

  const undoLastScore = async () => {
    if (scoreHistory.length === 0) return;

    const lastAction = scoreHistory[scoreHistory.length - 1];
    const newHomeScore = homeScore - (lastAction.team === 'home' ? 1 : 0);
    const newAwayScore = awayScore - (lastAction.team === 'away' ? 1 : 0);

    setHomeScore(newHomeScore);
    setAwayScore(newAwayScore);
    setScoreHistory(prev => prev.slice(0, -1));

    await base44.entities.Game.update(game.id, {
      home_score: newHomeScore,
      away_score: newAwayScore,
    });

    // Only undo player stats if it wasn't a rally point
    if (lastAction.playerId && lastAction.pointType !== 'rally') {
      const teamId = lastAction.team === 'home' ? game.home_team_id : game.away_team_id;
      await updatePlayerStat(lastAction.playerId, teamId, 'points', -1);
      
      if (lastAction.pointType === 'attack') {
        await updatePlayerStat(lastAction.playerId, teamId, 'field_goals_made', -1);
      } else if (lastAction.pointType === 'block') {
        await updatePlayerStat(lastAction.playerId, teamId, 'blocks', -1);
      } else if (lastAction.pointType === 'ace') {
        await updatePlayerStat(lastAction.playerId, teamId, 'three_pointers', -1);
      }
    }
  };

  const updateStat = async (statType, value) => {
    if (!selectedPlayer || !selectedTeam) return;
    const teamId = selectedTeam === 'home' ? game.home_team_id : game.away_team_id;
    await updatePlayerStat(selectedPlayer.id, teamId, statType, value);
  };

  const useTimeout = async (team) => {
    if (team === 'home' && homeTimeouts > 0) {
      const newTimeouts = homeTimeouts - 1;
      setHomeTimeouts(newTimeouts);
      await base44.entities.Game.update(game.id, { home_timeouts: newTimeouts });
    } else if (team === 'away' && awayTimeouts > 0) {
      const newTimeouts = awayTimeouts - 1;
      setAwayTimeouts(newTimeouts);
      await base44.entities.Game.update(game.id, { away_timeouts: newTimeouts });
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

    await base44.entities.Game.update(game.id, {
      quarter_scores: newSetScores,
      current_quarter: currentSet + 1,
    });

    if (currentSet < 5) {
      // Reset scores for next set
      setHomeScore(0);
      setAwayScore(0);
      setCurrentSet(currentSet + 1);
      await base44.entities.Game.update(game.id, {
        home_score: 0,
        away_score: 0,
      });
    }

    setShowSetEnd(false);
    setScoreHistory([]);
  };

  const endGame = async () => {
    // Calculate sets won
    let homeSetsWon = 0;
    let awaySetsWon = 0;
    
    setScores.forEach(set => {
      if (set.home > set.away) homeSetsWon++;
      else awaySetsWon++;
    });

    // Add current set
    if (homeScore > awayScore) homeSetsWon++;
    else awaySetsWon++;

    await base44.entities.Game.update(game.id, {
      status: 'completed',
      home_score: homeSetsWon,
      away_score: awaySetsWon,
    });

    if (homeSetsWon > awaySetsWon) {
      const homeTeamData = await base44.entities.Team.list();
      const home = homeTeamData.find(t => t.id === game.home_team_id);
      await base44.entities.Team.update(game.home_team_id, {
        wins: (home.wins || 0) + 1
      });
      
      const away = homeTeamData.find(t => t.id === game.away_team_id);
      await base44.entities.Team.update(game.away_team_id, {
        losses: (away.losses || 0) + 1
      });
    } else {
      const homeTeamData = await base44.entities.Team.list();
      const home = homeTeamData.find(t => t.id === game.home_team_id);
      await base44.entities.Team.update(game.home_team_id, {
        losses: (home.losses || 0) + 1
      });
      
      const away = homeTeamData.find(t => t.id === game.away_team_id);
      await base44.entities.Team.update(game.away_team_id, {
        wins: (away.wins || 0) + 1
      });
    }

    navigate(createPageUrl("Games"));
  };

  if (!game || !homeTeam || !awayTeam) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const setLabel = `Set ${currentSet}`;

  const PlayerRow = ({ player, team, teamId }) => {
    const points = getPlayerStat(player.id, 'points');
    const attacks = getPlayerStat(player.id, 'field_goals_made');
    const blocks = getPlayerStat(player.id, 'blocks');
    const aces = getPlayerStat(player.id, 'three_pointers');
    const assists = getPlayerStat(player.id, 'assists');
    const isSelected = selectedPlayer?.id === player.id;

    return (
      <button
        onClick={() => {
          setSelectedPlayer(player);
          setSelectedTeam(team);
        }}
        className={`w-full text-left border rounded-lg p-3 mb-2 transition-all ${
          isSelected
            ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-600 shadow-md'
            : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
        }`}
      >
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12 border-2 border-gray-300">
            <AvatarImage src={player.photo_url} />
            <AvatarFallback className={`text-sm font-bold ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'}`}>
              {player.jersey_number}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">
              #{player.jersey_number} {player.first_name} {player.last_name}
            </p>
            <div className="flex gap-3 text-xs text-gray-600 mt-1">
              <span className="font-semibold">PTS: {points}</span>
              <span>ATK: {attacks}</span>
              <span>BLK: {blocks}</span>
              <span>ACE: {aces}</span>
              <span>AST: {assists}</span>
            </div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="p-3 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Header */}
        <div className="text-center">
          <Badge className="bg-red-100 text-red-700 border-red-300 mb-2">
            <PlayCircle className="w-4 h-4 mr-1" />
            LIVE - {setLabel}
          </Badge>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Badge variant="outline" className="text-blue-600 border-blue-600">
              {game.sport}
            </Badge>
            {game.game_type && (
              <Badge variant="outline" className="text-purple-600 border-purple-600">
                {game.game_type.replace('_', ' ').toUpperCase()}
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-600">{new Date(game.game_date).toLocaleDateString()}</p>
        </div>

        {/* Set Scores */}
        <Card className="bg-white border-gray-200">
          <CardContent className="p-3">
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium">
              <div className="text-gray-600">Team</div>
              {[1, 2, 3, 4, 5].map(s => (
                <div key={s} className={currentSet === s ? 'text-blue-600' : 'text-gray-600'}>
                  Set {s}
                </div>
              ))}
              <div className="text-gray-900 font-bold">Sets Won</div>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center mt-2">
              <div className="text-xs font-medium text-gray-900 truncate">{homeTeam.name}</div>
              {[1, 2, 3, 4, 5].map(s => {
                const setScore = setScores.find(ss => ss.quarter === s);
                const score = s === currentSet ? homeScore : (setScore?.home || '-');
                return (
                  <div key={s} className={`text-sm font-semibold ${currentSet === s ? 'text-blue-600' : ''}`}>
                    {score}
                  </div>
                );
              })}
              <div className="text-xl font-bold text-blue-600">
                {setScores.filter(s => s.home > s.away).length}
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center mt-1">
              <div className="text-xs font-medium text-gray-900 truncate">{awayTeam.name}</div>
              {[1, 2, 3, 4, 5].map(s => {
                const setScore = setScores.find(ss => ss.quarter === s);
                const score = s === currentSet ? awayScore : (setScore?.away || '-');
                return (
                  <div key={s} className={`text-sm font-semibold ${currentSet === s ? 'text-gray-700' : ''}`}>
                    {score}
                  </div>
                );
              })}
              <div className="text-xl font-bold text-gray-900">
                {setScores.filter(s => s.away > s.home).length}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* UNIVERSAL CONTROL PANEL */}
        {selectedPlayer && (
          <Card className="bg-gradient-to-r from-blue-600 to-blue-700 border-2 border-blue-800 shadow-lg sticky top-3 z-10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 border-2 border-white">
                    <AvatarImage src={selectedPlayer.photo_url} />
                    <AvatarFallback className="bg-white text-blue-600 font-bold">
                      {selectedPlayer.jersey_number}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-white font-bold">
                      #{selectedPlayer.jersey_number} {selectedPlayer.first_name} {selectedPlayer.last_name}
                    </p>
                    <p className="text-blue-100 text-xs">
                      {selectedTeam === 'home' ? homeTeam.name : awayTeam.name} • {selectedTeam.toUpperCase()}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setSelectedPlayer(null);
                    setSelectedTeam(null);
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-blue-800"
                >
                  ✕
                </Button>
              </div>

              {/* Volleyball Point Types */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <Button
                  onClick={() => addPoint('attack')}
                  className="h-14 text-base font-bold bg-orange-500 hover:bg-orange-600 text-white border-2 border-white"
                >
                  🏐 Attack
                </Button>
                <Button
                  onClick={() => addPoint('block')}
                  className="h-14 text-base font-bold bg-red-500 hover:bg-red-600 text-white border-2 border-white"
                >
                  🚫 Block
                </Button>
                <Button
                  onClick={() => addPoint('ace')}
                  className="h-14 text-base font-bold bg-yellow-500 hover:bg-yellow-600 text-white border-2 border-white"
                >
                  ⚡ Ace
                </Button>
                <Button
                  onClick={() => addPoint('rally')}
                  className="h-14 text-base font-bold bg-green-500 hover:bg-green-600 text-white border-2 border-white"
                >
                  🎯 Rally Point
                </Button>
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {['assists', 'rebounds'].map((stat) => (
                  <div key={stat} className="bg-white/10 backdrop-blur rounded-lg p-2">
                    <div className="text-white text-xs font-medium mb-1 text-center">
                      {stat === 'assists' ? 'Assists' : 'Digs'}
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        onClick={() => updateStat(stat, -1)}
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-white hover:bg-white/20"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="text-white font-bold w-6 text-center">
                        {getPlayerStat(selectedPlayer.id, stat)}
                      </span>
                      <Button
                        onClick={() => updateStat(stat, 1)}
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-white hover:bg-white/20"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Undo Button */}
              <Button
                onClick={undoLastScore}
                disabled={scoreHistory.length === 0}
                variant="outline"
                className="w-full bg-white/10 text-white border-2 border-white hover:bg-white/20"
              >
                Undo Last Point
              </Button>
            </CardContent>
          </Card>
        )}

        {!selectedPlayer && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center">
            <p className="text-blue-900 font-medium">👆 Select a player to start scoring</p>
          </div>
        )}

        {/* Teams Grid */}
        <div className="grid lg:grid-cols-2 gap-3">
          {/* Home Team */}
          <Card className="bg-white border-2 border-blue-600">
            <CardHeader className="pb-2 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg text-gray-900">{homeTeam.name}</CardTitle>
                  <p className="text-xs text-gray-500">HOME</p>
                </div>
                <div className="text-3xl font-bold text-blue-600">{homeScore}</div>
              </div>
              <div className="flex justify-between text-xs mt-2">
                <span className="text-gray-600">Timeouts: {homeTimeouts}</span>
              </div>
            </CardHeader>
            <CardContent className="p-2 max-h-[500px] overflow-y-auto">
              {homePlayers.map(player => (
                <PlayerRow key={player.id} player={player} team="home" teamId={game.home_team_id} />
              ))}
            </CardContent>
            <div className="p-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => useTimeout('home')}
                disabled={homeTimeouts === 0}
                className="w-full text-xs"
              >
                Timeout ({homeTimeouts})
              </Button>
            </div>
          </Card>

          {/* Away Team */}
          <Card className="bg-white border-2 border-gray-300">
            <CardHeader className="pb-2 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg text-gray-900">{awayTeam.name}</CardTitle>
                  <p className="text-xs text-gray-500">AWAY</p>
                </div>
                <div className="text-3xl font-bold text-gray-900">{awayScore}</div>
              </div>
              <div className="flex justify-between text-xs mt-2">
                <span className="text-gray-600">Timeouts: {awayTimeouts}</span>
              </div>
            </CardHeader>
            <CardContent className="p-2 max-h-[500px] overflow-y-auto">
              {awayPlayers.map(player => (
                <PlayerRow key={player.id} player={player} team="away" teamId={game.away_team_id} />
              ))}
            </CardContent>
            <div className="p-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => useTimeout('away')}
                disabled={awayTimeouts === 0}
                className="w-full text-xs"
              >
                Timeout ({awayTimeouts})
              </Button>
            </div>
          </Card>
        </div>

        {/* Game Controls */}
        <Card className="bg-white border-gray-200">
          <CardContent className="p-3">
            <div className="flex flex-wrap gap-2 justify-center">
              {currentSet <= 5 && (
                <Button
                  onClick={() => setShowSetEnd(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-sm h-9"
                >
                  End {setLabel}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              {currentSet >= 3 && (
                <Button
                  onClick={endGame}
                  className="bg-green-600 hover:bg-green-700 text-sm h-9"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  End Game
                </Button>
              )}
              <Button
                onClick={() => navigate(createPageUrl("Games"))}
                variant="outline"
                className="text-sm h-9"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Set End Dialog */}
        <Dialog open={showSetEnd} onOpenChange={setShowSetEnd}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>End of {setLabel}</DialogTitle>
              <DialogDescription>
                Save set data and proceed to next set?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between text-lg font-bold mb-2">
                  <span>{homeTeam.name}</span>
                  <span className="text-blue-600">{homeScore}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>{awayTeam.name}</span>
                  <span className="text-gray-900">{awayScore}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={endSet}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Proceed to {currentSet < 5 ? `Set ${currentSet + 1}` : 'End Game'}
                </Button>
                <Button
                  onClick={() => setShowSetEnd(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
