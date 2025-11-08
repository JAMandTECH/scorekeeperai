
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Minus, CheckCircle, PlayCircle, AlertTriangle, ChevronRight, Clock } from "lucide-react";
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

  const addScore = async (points) => {
    if (!selectedPlayer || !selectedTeam) return;

    const newHomeScore = selectedTeam === 'home' ? homeScore + points : homeScore;
    const newAwayScore = selectedTeam === 'away' ? awayScore + points : awayScore;

    setHomeScore(newHomeScore);
    setAwayScore(newAwayScore);

    setScoreHistory(prev => [...prev, {
      team: selectedTeam,
      points,
      playerId: selectedPlayer.id,
      quarter: currentQuarter,
      homeScore: newHomeScore,
      awayScore: newAwayScore,
    }]);

    await base44.entities.Game.update(game.id, {
      home_score: newHomeScore,
      away_score: newAwayScore,
    });

    await updatePlayerStat(
      selectedPlayer.id, 
      selectedTeam === 'home' ? game.home_team_id : game.away_team_id, 
      'points', 
      points
    );
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

  const addFoul = async () => {
    if (!selectedPlayer || !selectedTeam) return;

    const teamId = selectedTeam === 'home' ? game.home_team_id : game.away_team_id;
    await updatePlayerStat(selectedPlayer.id, teamId, 'fouls', 1);
    
    const newTeamFouls = selectedTeam === 'home' ? homeTeamFouls + 1 : awayTeamFouls + 1;
    if (selectedTeam === 'home') {
      setHomeTeamFouls(newTeamFouls);
    } else {
      setAwayTeamFouls(newTeamFouls);
    }

    await base44.entities.Game.update(game.id, {
      home_team_fouls: selectedTeam === 'home' ? newTeamFouls : homeTeamFouls,
      away_team_fouls: selectedTeam === 'away' ? newTeamFouls : awayTeamFouls,
    });

    const totalFouls = getTotalPlayerFouls(selectedPlayer.id) + 1;
    if (totalFouls >= game.player_foul_limit) {
      alert(`⚠️ Player has reached foul limit (${game.player_foul_limit} fouls) and is disqualified!`);
      setSelectedPlayer(null);
      setSelectedTeam(null);
    } else if (totalFouls === game.player_foul_limit - 1) {
      alert(`⚠️ Warning: Player has ${totalFouls} fouls! One more foul and they will be disqualified.`);
    }
  };

  const removeFoul = async () => {
    if (!selectedPlayer || !selectedTeam) return;

    const currentFouls = getPlayerStat(selectedPlayer.id, 'fouls');
    if (currentFouls === 0) return;

    const teamId = selectedTeam === 'home' ? game.home_team_id : game.away_team_id;
    await updatePlayerStat(selectedPlayer.id, teamId, 'fouls', -1);
    
    const newTeamFouls = Math.max(0, (selectedTeam === 'home' ? homeTeamFouls : awayTeamFouls) - 1);
    if (selectedTeam === 'home') {
      setHomeTeamFouls(newTeamFouls);
    } else {
      setAwayTeamFouls(newTeamFouls);
    }

    await base44.entities.Game.update(game.id, {
      home_team_fouls: selectedTeam === 'home' ? newTeamFouls : homeTeamFouls,
      away_team_fouls: selectedTeam === 'away' ? newTeamFouls : awayTeamFouls,
    });
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

    await base44.entities.Game.update(game.id, {
      quarter_scores: newQuarterScores,
      current_quarter: currentQuarter + 1,
      home_team_fouls: 0,
      away_team_fouls: 0,
    });

    if (currentQuarter < 4) {
      setCurrentQuarter(currentQuarter + 1);
    } else {
      if (homeScore === awayScore) {
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
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
    const steals = getPlayerStat(player.id, 'steals');
    const blocks = getPlayerStat(player.id, 'blocks');
    const isFouledOut = totalFouls >= game.player_foul_limit;
    const isSelected = selectedPlayer?.id === player.id;

    return (
      <button
        onClick={() => {
          if (isFouledOut) return;
          setSelectedPlayer(player);
          setSelectedTeam(team);
        }}
        className={`w-full text-left border-2 rounded-xl p-4 mb-2 transition-all ${
          isFouledOut 
            ? 'bg-red-50 dark:bg-red-950/30 opacity-50 cursor-not-allowed border-red-300 dark:border-red-800' 
            : isSelected
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 border-orange-400 ring-4 ring-orange-300 shadow-xl scale-105'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600 hover:shadow-lg'
        }`}
        disabled={isFouledOut}
      >
        <div className="flex items-center gap-3">
          <Avatar className="w-14 h-14 border-3 border-white dark:border-gray-700 shadow-lg">
            <AvatarImage src={player.photo_url} />
            <AvatarFallback className={`text-base font-black ${isSelected ? 'bg-white text-orange-600' : 'bg-gradient-to-br from-orange-600 to-orange-700 text-white'}`}>
              {player.jersey_number}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className={`text-base font-black truncate ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
              #{player.jersey_number} {player.first_name} {player.last_name}
            </p>
            <div className={`flex gap-3 text-xs mt-1 font-bold ${isSelected ? 'text-orange-100' : 'text-gray-600 dark:text-gray-400'}`}>
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
            <Badge className="bg-red-600 text-white text-xs font-black">FOULED OUT</Badge>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-900/20 to-gray-900">
      {/* STICKY HEADER - Scoreboard */}
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
          </div>

          <div className="grid grid-cols-3 gap-4 items-center mb-4">
            {/* Home Team */}
            <div className="text-center">
              <div className="text-orange-400 text-sm font-black mb-2">HOME</div>
              <div className="text-white text-xl font-black mb-1 flex items-center justify-center gap-2">
                <span>{homeTeam.name}</span>
                <Badge className="bg-orange-500/30 text-orange-200 border border-orange-400 text-xs font-bold px-2">
                  TO: {homeTimeouts}
                </Badge>
              </div>
              <div className="text-orange-500 text-7xl font-black mb-2">{homeScore}</div>
              <div className="flex justify-center text-xs font-bold">
                <span className={`${inPenalty('home') ? 'text-red-400' : 'text-white'}`}>
                  FOULS: {homeTeamFouls}/{game.penalty_limit_per_quarter}
                </span>
              </div>
            </div>

            {/* Quarter Info */}
            <div className="text-center">
              <div className="text-white text-xl font-black mb-2">{quarterLabel}</div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                {[1, 2, 3, 4].map(q => {
                  const qScore = quarterScores.find(qs => qs.quarter === q);
                  return (
                    <div key={q} className="flex justify-between text-sm font-bold text-white mb-1">
                      <span>Q{q}:</span>
                      <span>{qScore ? `${qScore.home} - ${qScore.away}` : '-'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Away Team */}
            <div className="text-center">
              <div className="text-blue-400 text-sm font-black mb-2">AWAY</div>
              <div className="text-white text-xl font-black mb-1 flex items-center justify-center gap-2">
                <span>{awayTeam.name}</span>
                <Badge className="bg-blue-500/30 text-blue-200 border border-blue-400 text-xs font-bold px-2">
                  TO: {awayTimeouts}
                </Badge>
              </div>
              <div className="text-blue-500 text-7xl font-black mb-2">{awayScore}</div>
              <div className="flex justify-center text-xs font-bold">
                <span className={`${inPenalty('away') ? 'text-red-400' : 'text-white'}`}>
                  FOULS: {awayTeamFouls}/{game.penalty_limit_per_quarter}
                </span>
              </div>
            </div>
          </div>

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

      {/* STICKY CONTROL PANEL */}
      {selectedPlayer && (
        <div className="sticky top-[280px] z-40 bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 border-y-4 border-orange-400 shadow-2xl">
          <div className="max-w-7xl mx-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <Avatar className="w-14 h-14 border-4 border-white shadow-xl">
                  <AvatarImage src={selectedPlayer.photo_url} />
                  <AvatarFallback className="bg-white text-orange-600 font-black text-lg">
                    {selectedPlayer.jersey_number}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-black text-lg">
                    #{selectedPlayer.jersey_number} {selectedPlayer.first_name} {selectedPlayer.last_name}
                  </p>
                  <p className="text-orange-100 text-xs font-bold">
                    {selectedTeam === 'home' ? homeTeam.name : awayTeam.name} • {selectedTeam.toUpperCase()}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setSelectedPlayer(null);
                  setSelectedTeam(null);
                }}
                className="bg-white/20 hover:bg-white/30 text-white border-2 border-white font-black text-sm px-4 py-2"
              >
                ✕ CLOSE
              </Button>
            </div>

            <div className="flex gap-2 mb-3">
              <Button
                onClick={() => addScore(1)}
                className="flex-1 h-14 text-xl font-black bg-white text-orange-600 hover:bg-orange-50 border-3 border-white shadow-xl"
              >
                +1
              </Button>
              <Button
                onClick={() => addScore(2)}
                className="flex-1 h-14 text-xl font-black bg-white text-orange-600 hover:bg-orange-50 border-3 border-white shadow-xl"
              >
                +2
              </Button>
              <Button
                onClick={() => addScore(3)}
                className="flex-1 h-14 text-xl font-black bg-white text-orange-600 hover:bg-orange-50 border-3 border-white shadow-xl"
              >
                +3
              </Button>
              <Button
                onClick={undoLastScore}
                disabled={scoreHistory.length === 0}
                className="flex-1 h-14 text-base font-black bg-yellow-600 hover:bg-yellow-700 text-white border-3 border-white shadow-xl disabled:opacity-50"
              >
                UNDO
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={addFoul}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black border-2 border-white h-11 text-sm"
              >
                ADD FOUL
              </Button>
              {getPlayerStat(selectedPlayer.id, 'fouls') > 0 && (
                <Button
                  onClick={removeFoul}
                  className="flex-1 bg-white/20 hover:bg-white/30 text-white border-2 border-white font-black h-11 text-sm"
                >
                  UNDO FOUL
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {!selectedPlayer && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 border-y-4 border-blue-400 py-6 text-center sticky top-[280px] z-40">
          <p className="text-white font-black text-xl">👆 SELECT A PLAYER TO START TRACKING</p>
        </div>
      )}

      {/* SCROLLABLE PLAYERS SECTION */}
      <div className="max-w-7xl mx-auto p-4 pb-24">
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-br from-orange-900/40 to-orange-950/40 border-4 border-orange-500 backdrop-blur-sm">
            <CardHeader className="border-b-4 border-orange-500 bg-orange-900/50">
              <CardTitle className="text-2xl font-black text-white">
                {homeTeam.name} - HOME
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 max-h-[600px] overflow-y-auto">
              {homePlayers.map(player => (
                <PlayerRow key={player.id} player={player} team="home" teamId={game.home_team_id} />
              ))}
            </CardContent>
            <div className="p-4 border-t-4 border-orange-500">
              <Button
                onClick={() => useTimeout('home')}
                disabled={homeTimeouts === 0}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black h-12 disabled:opacity-50"
              >
                <Clock className="w-5 h-5 mr-2" />
                TIMEOUT ({homeTimeouts} LEFT)
              </Button>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-blue-900/40 to-blue-950/40 border-4 border-blue-500 backdrop-blur-sm">
            <CardHeader className="border-b-4 border-blue-500 bg-blue-900/50">
              <CardTitle className="text-2xl font-black text-white">
                {awayTeam.name} - AWAY
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 max-h-[600px] overflow-y-auto">
              {awayPlayers.map(player => (
                <PlayerRow key={player.id} player={player} team="away" teamId={game.away_team_id} />
              ))}
            </CardContent>
            <div className="p-4 border-t-4 border-blue-500">
              <Button
                onClick={() => useTimeout('away')}
                disabled={awayTimeouts === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-12 disabled:opacity-50"
              >
                <Clock className="w-5 h-5 mr-2" />
                TIMEOUT ({awayTimeouts} LEFT)
              </Button>
            </div>
          </Card>
        </div>

        <Card className="mt-6 bg-gray-900 border-4 border-gray-700">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4 justify-center">
              {currentQuarter <= 4 && (
                <Button
                  onClick={() => setShowQuarterEnd(true)}
                  className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-black text-lg px-8 py-6"
                >
                  END {quarterLabel}
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              )}
              {currentQuarter >= 4 && (
                <Button
                  onClick={endGame}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-black text-lg px-8 py-6"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  END GAME
                </Button>
              )}
              <Button
                onClick={() => navigate(createPageUrl("Games"))}
                variant="outline"
                className="border-2 border-gray-600 text-white hover:bg-gray-800 font-black text-lg px-8 py-6"
              >
                CANCEL
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showQuarterEnd} onOpenChange={setShowQuarterEnd}>
        <DialogContent className="bg-gray-900 border-4 border-orange-500 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl font-black">End of {quarterLabel}</DialogTitle>
            <DialogDescription className="text-gray-300 font-bold">
              Save quarter data and proceed to next period?
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
              <Alert className="bg-yellow-900/50 border-2 border-yellow-500">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-yellow-200 font-bold">
                  Game is tied! Overtime period will begin.
                </AlertDescription>
              </Alert>
            )}
            <div className="flex gap-3">
              <Button
                onClick={endQuarter}
                className="flex-1 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-black"
              >
                PROCEED TO {currentQuarter < 4 ? `Q${currentQuarter + 1}` : (homeScore === awayScore ? 'OT' : 'END GAME')}
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
