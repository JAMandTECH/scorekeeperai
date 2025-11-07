import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Minus, CheckCircle, PlayCircle, AlertTriangle, ChevronRight, ChevronLeft } from "lucide-react";
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
  const [selectedAction, setSelectedAction] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showQuarterEnd, setShowQuarterEnd] = useState(false);
  const [scoreHistory, setScoreHistory] = useState([]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
    setCurrentQuarter(currentGame.current_quarter || 1);
    setQuarterScores(currentGame.quarter_scores || []);
    setHomeTimeouts(currentGame.home_timeouts ?? 5);
    setAwayTimeouts(currentGame.away_timeouts ?? 5);
    setHomeTeamFouls(currentGame.home_team_fouls || 0);
    setAwayTeamFouls(currentGame.away_team_fouls || 0);
    
    if (currentGame.status === 'scheduled') {
      await base44.entities.Game.update(gameId, { status: 'in_progress' });
    }

    // Load player stats
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
    const key = getPlayerStatKey(playerId);
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

  const updatePlayerStat = async (playerId, teamId, statType, value) => {
    const key = getPlayerStatKey(playerId);
    const existingStat = playerStats[key];

    const newStatValue = (existingStat?.[statType] || 0) + value;
    
    const updatedStat = {
      ...existingStat,
      game_id: game.id,
      player_id: playerId,
      team_id: teamId,
      quarter: currentQuarter,
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

  const addScore = async (team, points, playerId) => {
    const newHomeScore = team === 'home' ? homeScore + points : homeScore;
    const newAwayScore = team === 'away' ? awayScore + points : awayScore;

    setHomeScore(newHomeScore);
    setAwayScore(newAwayScore);

    // Add to history for undo
    setScoreHistory(prev => [...prev, {
      team,
      points,
      playerId,
      quarter: currentQuarter,
      homeScore: newHomeScore,
      awayScore: newAwayScore,
    }]);

    await base44.entities.Game.update(game.id, {
      home_score: newHomeScore,
      away_score: newAwayScore,
    });

    if (playerId) {
      await updatePlayerStat(playerId, team === 'home' ? game.home_team_id : game.away_team_id, 'points', points);
    }

    setSelectedAction(null);
    setSelectedPlayer(null);
  };

  const undoLastScore = async () => {
    if (scoreHistory.length === 0) return;

    const lastAction = scoreHistory[scoreHistory.length - 1];
    const newHomeScore = homeScore - (lastAction.team === 'home' ? lastAction.points : 0);
    const newAwayScore = awayScore - (lastAction.team === 'away' ? lastAction.points : 0);

    setHomeScore(newHomeScore);
    setAwayScore(newAwayScore);
    setScoreHistory(prev => prev.slice(0, -1));

    await base44.entities.Game.update(game.id, {
      home_score: newHomeScore,
      away_score: newAwayScore,
    });

    if (lastAction.playerId) {
      await updatePlayerStat(
        lastAction.playerId,
        lastAction.team === 'home' ? game.home_team_id : game.away_team_id,
        'points',
        -lastAction.points
      );
    }
  };

  const addFoul = async (playerId, teamId, team) => {
    await updatePlayerStat(playerId, teamId, 'fouls', 1);
    
    const newTeamFouls = team === 'home' ? homeTeamFouls + 1 : awayTeamFouls + 1;
    if (team === 'home') {
      setHomeTeamFouls(newTeamFouls);
    } else {
      setAwayTeamFouls(newTeamFouls);
    }

    await base44.entities.Game.update(game.id, {
      home_team_fouls: team === 'home' ? newTeamFouls : homeTeamFouls,
      away_team_fouls: team === 'away' ? newTeamFouls : awayTeamFouls,
    });

    const totalFouls = getTotalPlayerFouls(playerId) + 1;
    if (totalFouls >= game.player_foul_limit) {
      alert(`⚠️ Player has reached foul limit (${game.player_foul_limit} fouls) and is disqualified!`);
    } else if (totalFouls === game.player_foul_limit - 1) {
      alert(`⚠️ Warning: Player has ${totalFouls} fouls! One more foul and they will be disqualified.`);
    }

    setSelectedAction(null);
    setSelectedPlayer(null);
  };

  const removeFoul = async (playerId, teamId, team) => {
    const currentFouls = getPlayerStat(playerId, 'fouls');
    if (currentFouls === 0) return;

    await updatePlayerStat(playerId, teamId, 'fouls', -1);
    
    const newTeamFouls = Math.max(0, (team === 'home' ? homeTeamFouls : awayTeamFouls) - 1);
    if (team === 'home') {
      setHomeTeamFouls(newTeamFouls);
    } else {
      setAwayTeamFouls(newTeamFouls);
    }

    await base44.entities.Game.update(game.id, {
      home_team_fouls: team === 'home' ? newTeamFouls : homeTeamFouls,
      away_team_fouls: team === 'away' ? newTeamFouls : awayTeamFouls,
    });
  };

  const updateStat = async (playerId, teamId, statType, value) => {
    await updatePlayerStat(playerId, teamId, statType, value);
    setSelectedAction(null);
    setSelectedPlayer(null);
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

  const endQuarter = async () => {
    const quarterScore = {
      quarter: currentQuarter,
      home: homeScore,
      away: awayScore,
    };

    const newQuarterScores = [...quarterScores, quarterScore];
    setQuarterScores(newQuarterScores);

    // Reset team fouls for new quarter
    setHomeTeamFouls(0);
    setAwayTeamFouls(0);

    await base44.entities.Game.update(game.id, {
      quarter_scores: newQuarterScores,
      current_quarter: currentQuarter + 1,
      home_team_fouls: 0,
      away_team_fouls: 0,
    });

    if (currentQuarter < 4) {
      setCurrentQuarter(currentQuarter + 1);
    } else {
      // Check if tie after regulation
      if (homeScore === awayScore) {
        // Go to OT
        setCurrentQuarter(5);
        await base44.entities.Game.update(game.id, {
          current_quarter: 5,
          overtime_count: 1,
        });
      }
    }

    setShowQuarterEnd(false);
    setScoreHistory([]);
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

    // Update team records
    if (homeScore > awayScore) {
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

  const quarterLabel = currentQuarter <= 4 ? `Q${currentQuarter}` : `OT${currentQuarter - 4}`;
  const inPenalty = (team) => {
    return (team === 'home' ? homeTeamFouls : awayTeamFouls) >= game.penalty_limit_per_quarter;
  };

  const PlayerRow = ({ player, team, teamId }) => {
    const totalFouls = getTotalPlayerFouls(player.id);
    const points = getPlayerStat(player.id, 'points');
    const rebounds = getPlayerStat(player.id, 'rebounds');
    const assists = getPlayerStat(player.id, 'assists');
    const fouls = getPlayerStat(player.id, 'fouls');
    const isFouledOut = totalFouls >= game.player_foul_limit;

    return (
      <div className={`border-b border-gray-100 p-2 ${isFouledOut ? 'bg-red-50 opacity-60' : 'hover:bg-gray-50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <Avatar className="w-8 h-8">
              <AvatarImage src={player.photo_url} />
              <AvatarFallback className="text-xs bg-gray-200 text-gray-700 font-bold">
                {player.jersey_number}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                #{player.jersey_number} {player.first_name[0]}. {player.last_name}
              </p>
              <div className="flex gap-3 text-xs text-gray-600">
                <span>PTS: {points}</span>
                <span>REB: {rebounds}</span>
                <span>AST: {assists}</span>
                <span className={totalFouls >= game.player_foul_limit - 1 ? 'text-red-600 font-bold' : ''}>
                  FL: {totalFouls}/{game.player_foul_limit}
                </span>
              </div>
            </div>
          </div>
          {!isFouledOut && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setSelectedPlayer(player);
                  setSelectedAction({ type: 'score', team, teamId });
                }}
              >
                Score
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setSelectedPlayer(player);
                  setSelectedAction({ type: 'stat', team, teamId });
                }}
              >
                Stats
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => addFoul(player.id, teamId, team)}
              >
                +F
              </Button>
              {fouls > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => removeFoul(player.id, teamId, team)}
                >
                  -F
                </Button>
              )}
            </div>
          )}
          {isFouledOut && (
            <Badge className="bg-red-600 text-white">Fouled Out</Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="text-center">
          <Badge className="bg-red-100 text-red-700 border-red-300 mb-2">
            <PlayCircle className="w-4 h-4 mr-1" />
            LIVE - {quarterLabel}
          </Badge>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Badge variant="outline" className="text-blue-600 border-blue-600">
              {game.sport}
            </Badge>
            <Badge variant="outline" className="text-purple-600 border-purple-600">
              {game.game_type.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm text-gray-600">{new Date(game.game_date).toLocaleDateString()}</p>
        </div>

        {/* Quarter Scores */}
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="grid grid-cols-6 gap-2 text-center text-xs font-medium">
              <div className="text-gray-600">Team</div>
              {[1, 2, 3, 4].map(q => (
                <div key={q} className={currentQuarter === q ? 'text-blue-600' : 'text-gray-600'}>
                  Q{q}
                </div>
              ))}
              <div className="text-gray-900 font-bold">Total</div>
            </div>
            <div className="grid grid-cols-6 gap-2 text-center mt-2">
              <div className="text-sm font-medium text-gray-900 truncate">{homeTeam.name}</div>
              {[1, 2, 3, 4].map(q => {
                const qScore = quarterScores.find(qs => qs.quarter === q);
                const prevQScore = quarterScores.find(qs => qs.quarter === q - 1);
                const score = q === currentQuarter ? homeScore : (qScore?.home || 0);
                const prevScore = q === 1 ? 0 : (prevQScore?.home || 0);
                const qPoints = score - prevScore;
                return (
                  <div key={q} className={`text-sm font-semibold ${currentQuarter === q ? 'text-blue-600' : ''}`}>
                    {q < currentQuarter ? qPoints : (q === currentQuarter ? qPoints : '-')}
                  </div>
                );
              })}
              <div className="text-lg font-bold text-blue-600">{homeScore}</div>
            </div>
            <div className="grid grid-cols-6 gap-2 text-center mt-1">
              <div className="text-sm font-medium text-gray-900 truncate">{awayTeam.name}</div>
              {[1, 2, 3, 4].map(q => {
                const qScore = quarterScores.find(qs => qs.quarter === q);
                const prevQScore = quarterScores.find(qs => qs.quarter === q - 1);
                const score = q === currentQuarter ? awayScore : (qScore?.away || 0);
                const prevScore = q === 1 ? 0 : (prevQScore?.away || 0);
                const qPoints = score - prevScore;
                return (
                  <div key={q} className={`text-sm font-semibold ${currentQuarter === q ? 'text-gray-700' : ''}`}>
                    {q < currentQuarter ? qPoints : (q === currentQuarter ? qPoints : '-')}
                  </div>
                );
              })}
              <div className="text-lg font-bold text-gray-900">{awayScore}</div>
            </div>
          </CardContent>
        </Card>

        {/* Penalty Warnings */}
        {(inPenalty('home') || inPenalty('away')) && (
          <Alert className="bg-yellow-50 border-yellow-300">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-sm text-yellow-800">
              {inPenalty('home') && `${homeTeam.name} in penalty (${homeTeamFouls} team fouls)`}
              {inPenalty('home') && inPenalty('away') && ' | '}
              {inPenalty('away') && `${awayTeam.name} in penalty (${awayTeamFouls} team fouls)`}
            </AlertDescription>
          </Alert>
        )}

        {/* Teams Grid */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Home Team */}
          <Card className="bg-white border-2 border-blue-600">
            <CardHeader className="pb-3 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-gray-900">{homeTeam.name}</CardTitle>
                  <p className="text-xs text-gray-500">HOME</p>
                </div>
                <div className="text-4xl font-bold text-blue-600">{homeScore}</div>
              </div>
              <div className="flex justify-between text-xs mt-2">
                <span className={homeTeamFouls >= game.penalty_limit_per_quarter ? 'text-red-600 font-bold' : 'text-gray-600'}>
                  Team Fouls: {homeTeamFouls}/{game.penalty_limit_per_quarter}
                </span>
                <span className="text-gray-600">Timeouts: {homeTimeouts}</span>
              </div>
            </CardHeader>
            <CardContent className="p-2 max-h-[400px] overflow-y-auto">
              {homePlayers.map(player => (
                <PlayerRow key={player.id} player={player} team="home" teamId={game.home_team_id} />
              ))}
            </CardContent>
            <div className="p-2 border-t flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => useTimeout('home')}
                disabled={homeTimeouts === 0}
                className="flex-1"
              >
                Timeout ({homeTimeouts})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={undoLastScore}
                disabled={scoreHistory.length === 0}
                className="flex-1"
              >
                Undo Score
              </Button>
            </div>
          </Card>

          {/* Away Team */}
          <Card className="bg-white border-2 border-gray-300">
            <CardHeader className="pb-3 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-gray-900">{awayTeam.name}</CardTitle>
                  <p className="text-xs text-gray-500">AWAY</p>
                </div>
                <div className="text-4xl font-bold text-gray-900">{awayScore}</div>
              </div>
              <div className="flex justify-between text-xs mt-2">
                <span className={awayTeamFouls >= game.penalty_limit_per_quarter ? 'text-red-600 font-bold' : 'text-gray-600'}>
                  Team Fouls: {awayTeamFouls}/{game.penalty_limit_per_quarter}
                </span>
                <span className="text-gray-600">Timeouts: {awayTimeouts}</span>
              </div>
            </CardHeader>
            <CardContent className="p-2 max-h-[400px] overflow-y-auto">
              {awayPlayers.map(player => (
                <PlayerRow key={player.id} player={player} team="away" teamId={game.away_team_id} />
              ))}
            </CardContent>
            <div className="p-2 border-t flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => useTimeout('away')}
                disabled={awayTimeouts === 0}
                className="flex-1"
              >
                Timeout ({awayTimeouts})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={undoLastScore}
                disabled={scoreHistory.length === 0}
                className="flex-1"
              >
                Undo Score
              </Button>
            </div>
          </Card>
        </div>

        {/* Game Controls */}
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 justify-center">
              {currentQuarter <= 4 && (
                <Button
                  onClick={() => setShowQuarterEnd(true)}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  End {quarterLabel}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
              {currentQuarter >= 4 && (
                <Button
                  onClick={endGame}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  End Game
                </Button>
              )}
              <Button
                onClick={() => navigate(createPageUrl("Games"))}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Score Action Dialog */}
        <Dialog open={selectedAction?.type === 'score' && !!selectedPlayer} onOpenChange={() => {
          setSelectedAction(null);
          setSelectedPlayer(null);
        }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Add Score</DialogTitle>
              <DialogDescription>
                #{selectedPlayer?.jersey_number} {selectedPlayer?.first_name} {selectedPlayer?.last_name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-3">
              <Button
                onClick={() => addScore(selectedAction?.team, 1, selectedPlayer?.id)}
                className="h-20 text-2xl bg-blue-600 hover:bg-blue-700"
              >
                +1
              </Button>
              <Button
                onClick={() => addScore(selectedAction?.team, 2, selectedPlayer?.id)}
                className="h-20 text-2xl bg-blue-600 hover:bg-blue-700"
              >
                +2
              </Button>
              <Button
                onClick={() => addScore(selectedAction?.team, 3, selectedPlayer?.id)}
                className="h-20 text-2xl bg-blue-600 hover:bg-blue-700"
              >
                +3
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Stats Action Dialog */}
        <Dialog open={selectedAction?.type === 'stat' && !!selectedPlayer} onOpenChange={() => {
          setSelectedAction(null);
          setSelectedPlayer(null);
        }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Update Stats</DialogTitle>
              <DialogDescription>
                #{selectedPlayer?.jersey_number} {selectedPlayer?.first_name} {selectedPlayer?.last_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Rebounds</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStat(selectedPlayer?.id, selectedAction?.teamId, 'rebounds', -1)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-8 text-center font-bold">{getPlayerStat(selectedPlayer?.id, 'rebounds')}</span>
                  <Button
                    size="sm"
                    onClick={() => updateStat(selectedPlayer?.id, selectedAction?.teamId, 'rebounds', 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Assists</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStat(selectedPlayer?.id, selectedAction?.teamId, 'assists', -1)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-8 text-center font-bold">{getPlayerStat(selectedPlayer?.id, 'assists')}</span>
                  <Button
                    size="sm"
                    onClick={() => updateStat(selectedPlayer?.id, selectedAction?.teamId, 'assists', 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Steals</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStat(selectedPlayer?.id, selectedAction?.teamId, 'steals', -1)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-8 text-center font-bold">{getPlayerStat(selectedPlayer?.id, 'steals')}</span>
                  <Button
                    size="sm"
                    onClick={() => updateStat(selectedPlayer?.id, selectedAction?.teamId, 'steals', 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Blocks</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStat(selectedPlayer?.id, selectedAction?.teamId, 'blocks', -1)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-8 text-center font-bold">{getPlayerStat(selectedPlayer?.id, 'blocks')}</span>
                  <Button
                    size="sm"
                    onClick={() => updateStat(selectedPlayer?.id, selectedAction?.teamId, 'blocks', 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Quarter End Dialog */}
        <Dialog open={showQuarterEnd} onOpenChange={setShowQuarterEnd}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>End of {quarterLabel}</DialogTitle>
              <DialogDescription>
                Save quarter data and proceed to next period?
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
              {currentQuarter === 4 && homeScore === awayScore && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Game is tied! Overtime period will begin.
                  </AlertDescription>
                </Alert>
              )}
              <div className="flex gap-3">
                <Button
                  onClick={endQuarter}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Proceed to {currentQuarter < 4 ? `Q${currentQuarter + 1}` : (homeScore === awayScore ? 'OT' : 'End Game')}
                </Button>
                <Button
                  onClick={() => setShowQuarterEnd(false)}
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