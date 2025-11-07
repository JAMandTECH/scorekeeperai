import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Minus, CheckCircle, PlayCircle, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function LiveScoring() {
  const [game, setGame] = useState(null);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [selectedHomePlayer, setSelectedHomePlayer] = useState(null);
  const [selectedAwayPlayer, setSelectedAwayPlayer] = useState(null);
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
    
    if (currentGame.status === 'scheduled') {
      await base44.entities.Game.update(gameId, { status: 'in_progress' });
    }
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

  const updateScoreMutation = useMutation({
    mutationFn: async ({ home, away }) => {
      await base44.entities.Game.update(game.id, {
        home_score: home,
        away_score: away,
      });
    },
  });

  const updatePlayerStatsMutation = useMutation({
    mutationFn: async ({ playerId, points }) => {
      const player = [...homePlayers, ...awayPlayers].find(p => p.id === playerId);
      if (player) {
        await base44.entities.Player.update(playerId, {
          total_points: (player.total_points || 0) + points,
          games_played: player.games_played || 1,
        });
      }
    },
  });

  const updateScore = (team, points, playerId = null) => {
    if (team === 'home') {
      const newScore = Math.max(0, homeScore + points);
      setHomeScore(newScore);
      updateScoreMutation.mutate({ home: newScore, away: awayScore });
      
      if (points > 0 && playerId) {
        updatePlayerStatsMutation.mutate({ playerId, points });
      }
    } else {
      const newScore = Math.max(0, awayScore + points);
      setAwayScore(newScore);
      updateScoreMutation.mutate({ home: homeScore, away: newScore });
      
      if (points > 0 && playerId) {
        updatePlayerStatsMutation.mutate({ playerId, points });
      }
    }
  };

  const endGame = async () => {
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

  const PlayerSelector = ({ players, selectedPlayer, onSelect, team }) => (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-600 mb-2">
        {selectedPlayer ? 'Selected Scorer:' : 'Select player who scored:'}
      </p>
      <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
        {players.map((player) => (
          <button
            key={player.id}
            onClick={() => onSelect(player)}
            className={`p-2 rounded-lg border-2 transition-all text-left ${
              selectedPlayer?.id === player.id
                ? team === 'home'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-600 bg-gray-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8 border">
                <AvatarImage src={player.photo_url} />
                <AvatarFallback className={`text-xs font-bold ${
                  selectedPlayer?.id === player.id
                    ? team === 'home' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {player.jersey_number}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">
                  #{player.jersey_number}
                </p>
                <p className="text-xs text-gray-600 truncate">
                  {player.first_name[0]}. {player.last_name}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
      {players.length === 0 && (
        <p className="text-xs text-gray-500 text-center py-4">No players in roster</p>
      )}
    </div>
  );

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <Badge className="bg-red-100 text-red-700 border-red-300 mb-4">
            <PlayCircle className="w-4 h-4 mr-1" />
            LIVE - {game.sport.toUpperCase()}
          </Badge>
          <p className="text-gray-600">{new Date(game.game_date).toLocaleDateString()}</p>
          {game.location && <p className="text-gray-500 text-sm">📍 {game.location}</p>}
        </div>

        {/* Main Scoreboard */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Home Team */}
          <Card className="bg-white border-2 border-blue-600 shadow-lg">
            <CardHeader className="text-center border-b border-gray-200 pb-4">
              <CardTitle className="text-gray-900 text-2xl">{homeTeam.name}</CardTitle>
              <p className="text-gray-500">HOME</p>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <div className="text-7xl font-bold text-blue-600 mb-2">{homeScore}</div>
              </div>

              {/* Player Selection */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <PlayerSelector
                  players={homePlayers}
                  selectedPlayer={selectedHomePlayer}
                  onSelect={setSelectedHomePlayer}
                  team="home"
                />
              </div>

              {/* Score Buttons */}
              <div className="grid grid-cols-3 gap-3">
                <Button
                  onClick={() => {
                    if (!selectedHomePlayer) {
                      alert('Please select a player first!');
                      return;
                    }
                    updateScore('home', 1, selectedHomePlayer.id);
                  }}
                  className="h-20 text-2xl bg-blue-600 hover:bg-blue-700 text-white"
                >
                  +1
                </Button>
                <Button
                  onClick={() => {
                    if (!selectedHomePlayer) {
                      alert('Please select a player first!');
                      return;
                    }
                    updateScore('home', 2, selectedHomePlayer.id);
                  }}
                  className="h-20 text-2xl bg-blue-600 hover:bg-blue-700 text-white"
                >
                  +2
                </Button>
                <Button
                  onClick={() => {
                    if (!selectedHomePlayer) {
                      alert('Please select a player first!');
                      return;
                    }
                    updateScore('home', 3, selectedHomePlayer.id);
                  }}
                  className="h-20 text-2xl bg-blue-600 hover:bg-blue-700 text-white"
                >
                  +3
                </Button>
              </div>
              <Button
                onClick={() => updateScore('home', -1)}
                variant="outline"
                className="w-full mt-3 border-gray-300"
              >
                <Minus className="w-4 h-4 mr-2" />
                Undo Point
              </Button>
            </CardContent>
          </Card>

          {/* Away Team */}
          <Card className="bg-white border-2 border-gray-300 shadow-lg">
            <CardHeader className="text-center border-b border-gray-200 pb-4">
              <CardTitle className="text-gray-900 text-2xl">{awayTeam.name}</CardTitle>
              <p className="text-gray-500">AWAY</p>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <div className="text-7xl font-bold text-gray-900 mb-2">{awayScore}</div>
              </div>

              {/* Player Selection */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <PlayerSelector
                  players={awayPlayers}
                  selectedPlayer={selectedAwayPlayer}
                  onSelect={setSelectedAwayPlayer}
                  team="away"
                />
              </div>

              {/* Score Buttons */}
              <div className="grid grid-cols-3 gap-3">
                <Button
                  onClick={() => {
                    if (!selectedAwayPlayer) {
                      alert('Please select a player first!');
                      return;
                    }
                    updateScore('away', 1, selectedAwayPlayer.id);
                  }}
                  className="h-20 text-2xl bg-gray-200 hover:bg-gray-300 text-gray-900"
                >
                  +1
                </Button>
                <Button
                  onClick={() => {
                    if (!selectedAwayPlayer) {
                      alert('Please select a player first!');
                      return;
                    }
                    updateScore('away', 2, selectedAwayPlayer.id);
                  }}
                  className="h-20 text-2xl bg-gray-200 hover:bg-gray-300 text-gray-900"
                >
                  +2
                </Button>
                <Button
                  onClick={() => {
                    if (!selectedAwayPlayer) {
                      alert('Please select a player first!');
                      return;
                    }
                    updateScore('away', 3, selectedAwayPlayer.id);
                  }}
                  className="h-20 text-2xl bg-gray-200 hover:bg-gray-300 text-gray-900"
                >
                  +3
                </Button>
              </div>
              <Button
                onClick={() => updateScore('away', -1)}
                variant="outline"
                className="w-full mt-3 border-gray-300"
              >
                <Minus className="w-4 h-4 mr-2" />
                Undo Point
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Game Controls */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <Button
                onClick={endGame}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                End Game
              </Button>
              <Button
                onClick={() => navigate(createPageUrl("Games"))}
                variant="outline"
                className="border-gray-300 px-8 py-6 text-lg"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}