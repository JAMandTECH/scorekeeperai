import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Minus,
  Play,
  Pause,
  CheckCircle,
  Trophy,
} from "lucide-react";

export default function LiveScoring() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get("gameId");

  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showEventDialog, setShowEventDialog] = useState(false);

  const { data: game } = useQuery({
    queryKey: ["game", gameId],
    queryFn: async () => {
      const games = await base44.entities.Game.filter({ id: gameId });
      return games[0];
    },
    enabled: !!gameId,
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  const { data: homePlayers = [] } = useQuery({
    queryKey: ["homePlayers", game?.home_team_id],
    queryFn: () =>
      base44.entities.Player.filter({ team_id: game.home_team_id }),
    enabled: !!game?.home_team_id,
  });

  const { data: awayPlayers = [] } = useQuery({
    queryKey: ["awayPlayers", game?.away_team_id],
    queryFn: () =>
      base44.entities.Player.filter({ team_id: game.away_team_id }),
    enabled: !!game?.away_team_id,
  });

  const { data: gameEvents = [] } = useQuery({
    queryKey: ["gameEvents", gameId],
    queryFn: () => base44.entities.GameEvent.filter({ game_id: gameId }, "-created_date"),
    enabled: !!gameId,
  });

  const addEventMutation = useMutation({
    mutationFn: (eventData) => base44.entities.GameEvent.create(eventData),
    onSuccess: () => {
      queryClient.invalidateQueries(["gameEvents"]);
      queryClient.invalidateQueries(["game"]);
      setShowEventDialog(false);
      setSelectedPlayer(null);
    },
  });

  const updateGameMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Game.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["game"]);
    },
  });

  const addPoints = (teamType, points, eventType = "2_points") => {
    const teamId = teamType === "home" ? game.home_team_id : game.away_team_id;
    const currentScore =
      teamType === "home" ? game.home_score || 0 : game.away_score || 0;

    // Update game score
    const updateData =
      teamType === "home"
        ? { home_score: currentScore + points }
        : { away_score: currentScore + points };

    updateGameMutation.mutate({ id: gameId, data: updateData });

    // Add event
    addEventMutation.mutate({
      game_id: gameId,
      team_id: teamId,
      event_type: eventType,
      points,
      period: game.current_period,
      timestamp: new Date().toISOString(),
    });
  };

  const openPlayerEventDialog = (teamType) => {
    setSelectedTeam(teamType);
    setShowEventDialog(true);
  };

  const recordPlayerEvent = (eventType, points = 0) => {
    if (!selectedPlayer) return;

    const player =
      selectedTeam === "home"
        ? homePlayers.find((p) => p.id === selectedPlayer)
        : awayPlayers.find((p) => p.id === selectedPlayer);

    const teamId =
      selectedTeam === "home" ? game.home_team_id : game.away_team_id;

    addEventMutation.mutate({
      game_id: gameId,
      team_id: teamId,
      player_id: selectedPlayer,
      player_name: `${player.first_name} ${player.last_name}`,
      event_type: eventType,
      points,
      period: game.current_period,
      timestamp: new Date().toISOString(),
    });

    // Update score if points
    if (points > 0) {
      const currentScore =
        selectedTeam === "home"
          ? game.home_score || 0
          : game.away_score || 0;

      const updateData =
        selectedTeam === "home"
          ? { home_score: currentScore + points }
          : { away_score: currentScore + points };

      updateGameMutation.mutate({ id: gameId, data: updateData });
    }
  };

  const endGame = async () => {
    await base44.entities.Game.update(gameId, {
      status: "completed",
      ended_at: new Date().toISOString(),
    });
    queryClient.invalidateQueries(["game"]);
    navigate(createPageUrl("Games"));
  };

  const changePeriod = (period) => {
    updateGameMutation.mutate({ id: gameId, data: { current_period: period } });
  };

  if (!game) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <p>Loading game...</p>
      </div>
    );
  }

  const isBasketball = game.sport === "basketball";
  const periods = isBasketball
    ? ["Q1", "Q2", "Q3", "Q4", "OT"]
    : ["Set 1", "Set 2", "Set 3", "Set 4", "Set 5"];

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-900 to-slate-800 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Games"))}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <Badge className="bg-red-500 text-lg px-4 py-2 animate-pulse">
            LIVE
          </Badge>
          <Button
            onClick={endGame}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            End Game
          </Button>
        </div>

        {/* Scoreboard */}
        <Card className="mb-6 bg-gradient-to-r from-orange-500 to-yellow-500 border-none">
          <CardContent className="p-8">
            <div className="grid grid-cols-3 gap-6 items-center">
              {/* Home Team */}
              <div className="text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  {game.home_team_name}
                </h2>
                <div className="text-6xl md:text-8xl font-bold text-white mb-4">
                  {game.home_score || 0}
                </div>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() => addPoints("home", 1, "1_point")}
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white"
                  >
                    +1
                  </Button>
                  <Button
                    onClick={() => addPoints("home", 2, "2_points")}
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white"
                  >
                    +2
                  </Button>
                  {isBasketball && (
                    <Button
                      onClick={() => addPoints("home", 3, "3_points")}
                      size="sm"
                      className="bg-white/20 hover:bg-white/30 text-white"
                    >
                      +3
                    </Button>
                  )}
                  <Button
                    onClick={() => openPlayerEventDialog("home")}
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white"
                  >
                    Player Stats
                  </Button>
                </div>
              </div>

              {/* Period */}
              <div className="text-center">
                <p className="text-white/80 text-lg mb-2">Current Period</p>
                <p className="text-4xl font-bold text-white mb-4">
                  {game.current_period}
                </p>
                <Select
                  value={game.current_period}
                  onValueChange={changePeriod}
                >
                  <SelectTrigger className="bg-white/20 text-white border-white/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((period) => (
                      <SelectItem key={period} value={period}>
                        {period}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Away Team */}
              <div className="text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  {game.away_team_name}
                </h2>
                <div className="text-6xl md:text-8xl font-bold text-white mb-4">
                  {game.away_score || 0}
                </div>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() => addPoints("away", 1, "1_point")}
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white"
                  >
                    +1
                  </Button>
                  <Button
                    onClick={() => addPoints("away", 2, "2_points")}
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white"
                  >
                    +2
                  </Button>
                  {isBasketball && (
                    <Button
                      onClick={() => addPoints("away", 3, "3_points")}
                      size="sm"
                      className="bg-white/20 hover:bg-white/30 text-white"
                    >
                      +3
                    </Button>
                  )}
                  <Button
                    onClick={() => openPlayerEventDialog("away")}
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white"
                  >
                    Player Stats
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card className="bg-white/95 backdrop-blur">
          <CardHeader>
            <CardTitle>Recent Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {gameEvents.slice(0, 20).map((event, index) => (
                <div
                  key={event.id || index}
                  className="flex items-center justify-between p-3 border border-slate-200 rounded-lg"
                >
                  <div>
                    <p className="font-semibold">
                      {event.player_name || "Team Event"}
                    </p>
                    <p className="text-sm text-slate-600 capitalize">
                      {event.event_type.replace(/_/g, " ")}
                      {event.points > 0 && ` - ${event.points} points`}
                    </p>
                  </div>
                  <Badge variant="outline">{event.period}</Badge>
                </div>
              ))}
              {gameEvents.length === 0 && (
                <p className="text-center text-slate-500 py-8">
                  No events yet. Start scoring!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Player Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Record Event -{" "}
              {selectedTeam === "home"
                ? game.home_team_name
                : game.away_team_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Select Player
              </label>
              <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a player" />
                </SelectTrigger>
                <SelectContent>
                  {(selectedTeam === "home" ? homePlayers : awayPlayers).map(
                    (player) => (
                      <SelectItem key={player.id} value={player.id}>
                        #{player.jersey_number} {player.first_name}{" "}
                        {player.last_name}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedPlayer && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Record Event:</p>
                {isBasketball ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => recordPlayerEvent("1_point", 1)}
                      variant="outline"
                    >
                      Free Throw (1pt)
                    </Button>
                    <Button
                      onClick={() => recordPlayerEvent("2_points", 2)}
                      variant="outline"
                    >
                      2-Pointer
                    </Button>
                    <Button
                      onClick={() => recordPlayerEvent("3_points", 3)}
                      variant="outline"
                    >
                      3-Pointer
                    </Button>
                    <Button
                      onClick={() => recordPlayerEvent("rebound", 0)}
                      variant="outline"
                    >
                      Rebound
                    </Button>
                    <Button
                      onClick={() => recordPlayerEvent("assist", 0)}
                      variant="outline"
                    >
                      Assist
                    </Button>
                    <Button
                      onClick={() => recordPlayerEvent("steal", 0)}
                      variant="outline"
                    >
                      Steal
                    </Button>
                    <Button
                      onClick={() => recordPlayerEvent("block", 0)}
                      variant="outline"
                    >
                      Block
                    </Button>
                    <Button
                      onClick={() => recordPlayerEvent("foul", 0)}
                      variant="outline"
                    >
                      Foul
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => recordPlayerEvent("spike", 1)}
                      variant="outline"
                    >
                      Spike (1pt)
                    </Button>
                    <Button
                      onClick={() => recordPlayerEvent("ace", 1)}
                      variant="outline"
                    >
                      Ace (1pt)
                    </Button>
                    <Button
                      onClick={() => recordPlayerEvent("block_volleyball", 1)}
                      variant="outline"
                    >
                      Block (1pt)
                    </Button>
                    <Button
                      onClick={() => recordPlayerEvent("dig", 0)}
                      variant="outline"
                    >
                      Dig
                    </Button>
                    <Button
                      onClick={() => recordPlayerEvent("set", 0)}
                      variant="outline"
                    >
                      Set
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}