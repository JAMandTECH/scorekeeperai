
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Minus, CheckCircle, PlayCircle, ChevronRight, Clock } from "lucide-react";
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
    
    if (pointType === 'attack') {
      await updatePlayerStat(selectedPlayer.id, teamId, 'field_goals_made', 1);
    } else if (pointType === 'block') {
      await updatePlayerStat(selectedPlayer.id, teamId, 'blocks', 1);
    } else if (pointType === 'ace') {
      await updatePlayerStat(selectedPlayer.id, teamId, 'three_pointers', 1);
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

    if (lastAction.playerId && lastAction.pointType !== 'rally') {
      const teamId = lastAction.team === 'home' ? game.home_team_id : game.away_team_id;
      
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
    let homeSetsWon = 0;
    let awaySetsWon = 0;
    
    setScores.forEach(set => {
      if (set.home > set.away) homeSetsWon++;
      else awaySetsWon++;
    });

    // Add current set score to total sets won calculation
    if (homeScore > awayScore) homeSetsWon++;
    else if (awayScore > homeScore) awaySetsWon++;


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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  const setLabel = `Set ${currentSet}`;

  const PlayerRow = ({ player, team, teamId }) => {
    const attacks = getPlayerStat(player.id, 'field_goals_made');
    const blocks = getPlayerStat(player.id, 'blocks');
    const aces = getPlayerStat(player.id, 'three_pointers');
    const assists = getPlayerStat(player.id, 'assists');
    const points = attacks + blocks + aces;
    const isSelected = selectedPlayer?.id === player.id;

    return (
      <button
        onClick={() => {
          setSelectedPlayer(player);
          setSelectedTeam(team);
        }}
        className={`w-full text-left border-2 rounded-xl p-4 mb-2 transition-all ${
          isSelected
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 border-blue-400 ring-4 ring-blue-300 shadow-xl scale-105'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg'
        }`}
      >
        <div className="flex items-center gap-3">
          <Avatar className="w-14 h-14 border-3 border-white dark:border-gray-700 shadow-lg">
            <AvatarImage src={player.photo_url} />
            <AvatarFallback className={`text-base font-black ${isSelected ? 'bg-white text-blue-600' : 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'}`}>
              {player.jersey_number}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className={`text-base font-black truncate ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
              #{player.jersey_number} {player.first_name} {player.last_name}
            </p>
            <div className={`flex gap-3 text-xs mt-1 font-bold ${isSelected ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'}`}>
              <span>PTS: {points}</span>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900">
      {/* STICKY HEADER - Scoreboard */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 border-b-4 border-blue-500 shadow-2xl">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Badge className="bg-red-600 text-white border-2 border-red-400 px-6 py-2 text-base font-black shadow-lg">
              <PlayCircle className="w-5 h-5 mr-2 animate-pulse" />
              LIVE - {setLabel}
            </Badge>
            <Badge className="bg-blue-600 text-white border-2 border-blue-400 px-4 py-2 text-sm font-black">
              VOLLEYBALL
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-4 items-center mb-4">
            {/* Home Team */}
            <div className="text-center">
              <div className="text-blue-400 text-sm font-black mb-2">HOME</div>
              <div className="text-white text-xl font-black mb-1 flex items-center justify-center gap-2">
                <span>{homeTeam.name}</span>
                <Badge className="bg-blue-500/30 text-blue-200 border border-blue-400 text-xs font-bold px-2">
                  TO: {homeTimeouts}
                </Badge>
              </div>
              <div className="text-blue-500 text-7xl font-black mb-2">{homeScore}</div>
              <div className="text-white text-xs font-bold">
                Sets Won: {setScores.filter(s => s.home > s.away).length}
              </div>
            </div>

            {/* Set Info */}
            <div className="text-center">
              <div className="text-white text-xl font-black mb-2">{setLabel}</div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                {[1, 2, 3, 4, 5].map(s => {
                  const setScore = setScores.find(ss => ss.quarter === s);
                  return (
                    <div key={s} className="flex justify-between text-sm font-bold text-white mb-1">
                      <span>Set {s}:</span>
                      <span>{setScore ? `${setScore.home} - ${setScore.away}` : '-'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Away Team */}
            <div className="text-center">
              <div className="text-cyan-400 text-sm font-black mb-2">AWAY</div>
              <div className="text-white text-xl font-black mb-1 flex items-center justify-center gap-2">
                <span>{awayTeam.name}</span>
                <Badge className="bg-cyan-500/30 text-cyan-200 border border-cyan-400 text-xs font-bold px-2">
                  TO: {awayTimeouts}
                </Badge>
              </div>
              <div className="text-cyan-500 text-7xl font-black mb-2">{awayScore}</div>
              <div className="text-white text-xs font-bold">
                Sets Won: {setScores.filter(s => s.away > s.home).length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STICKY CONTROL PANEL */}
      {selectedPlayer && (
        <div className="sticky top-[250px] z-40 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 border-y-4 border-blue-400 shadow-2xl">
          <div className="max-w-7xl mx-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <Avatar className="w-14 h-14 border-4 border-white shadow-xl">
                  <AvatarImage src={selectedPlayer.photo_url} />
                  <AvatarFallback className="bg-white text-blue-600 font-black text-lg">
                    {selectedPlayer.jersey_number}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-black text-lg">
                    #{selectedPlayer.jersey_number} {selectedPlayer.first_name} {selectedPlayer.last_name}
                  </p>
                  <p className="text-blue-100 text-xs font-bold">
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

            <div className="flex gap-2">
              <Button
                onClick={() => addPoint('attack')}
                className="flex-1 h-14 text-base font-black bg-orange-500 hover:bg-orange-600 text-white border-3 border-white shadow-xl"
              >
                🏐 ATK
              </Button>
              <Button
                onClick={() => addPoint('block')}
                className="flex-1 h-14 text-base font-black bg-red-500 hover:bg-red-600 text-white border-3 border-white shadow-xl"
              >
                🚫 BLK
              </Button>
              <Button
                onClick={() => addPoint('ace')}
                className="flex-1 h-14 text-base font-black bg-yellow-500 hover:bg-yellow-600 text-white border-3 border-white shadow-xl"
              >
                ⚡ ACE
              </Button>
              <Button
                onClick={() => addPoint('rally')}
                className="flex-1 h-14 text-base font-black bg-green-500 hover:bg-green-600 text-white border-3 border-white shadow-xl"
              >
                🎯 RLY
              </Button>
              <Button
                onClick={undoLastScore}
                disabled={scoreHistory.length === 0}
                className="flex-1 h-14 text-base font-black bg-gray-700 hover:bg-gray-800 text-white border-3 border-white shadow-xl disabled:opacity-50"
              >
                UNDO
              </Button>
            </div>
          </div>
        </div>
      )}

      {!selectedPlayer && (
        <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 border-y-4 border-cyan-400 py-6 text-center sticky top-[250px] z-40">
          <p className="text-white font-black text-xl">👆 SELECT A PLAYER TO START TRACKING</p>
        </div>
      )}

      {/* SCROLLABLE PLAYERS SECTION */}
      <div className="max-w-7xl mx-auto p-4 pb-24">
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-br from-blue-900/40 to-blue-950/40 border-4 border-blue-500 backdrop-blur-sm">
            <CardHeader className="border-b-4 border-blue-500 bg-blue-900/50">
              <CardTitle className="text-2xl font-black text-white">
                {homeTeam.name} - HOME
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 max-h-[600px] overflow-y-auto">
              {homePlayers.map(player => (
                <PlayerRow key={player.id} player={player} team="home" teamId={game.home_team_id} />
              ))}
            </CardContent>
            <div className="p-4 border-t-4 border-blue-500">
              <Button
                onClick={() => useTimeout('home')}
                disabled={homeTimeouts === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-12 disabled:opacity-50"
              >
                <Clock className="w-5 h-5 mr-2" />
                TIMEOUT ({homeTimeouts} LEFT)
              </Button>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-900/40 to-cyan-950/40 border-4 border-cyan-500 backdrop-blur-sm">
            <CardHeader className="border-b-4 border-cyan-500 bg-cyan-900/50">
              <CardTitle className="text-2xl font-black text-white">
                {awayTeam.name} - AWAY
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 max-h-[600px] overflow-y-auto">
              {awayPlayers.map(player => (
                <PlayerRow key={player.id} player={player} team="away" teamId={game.away_team_id} />
              ))}
            </CardContent>
            <div className="p-4 border-t-4 border-cyan-500">
              <Button
                onClick={() => useTimeout('away')}
                disabled={awayTimeouts === 0}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-black h-12 disabled:opacity-50"
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
              {currentSet <= 5 && (
                <Button
                  onClick={() => setShowSetEnd(true)}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-black text-lg px-8 py-6"
                >
                  END {setLabel}
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              )}
              {currentSet >= 3 && (
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
    </div>
  );
}
