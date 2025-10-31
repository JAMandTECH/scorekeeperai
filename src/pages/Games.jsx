import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Trophy, Plus, Play, Calendar, MapPin, Edit } from "lucide-react";
import { format } from "date-fns";

export default function Games() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [orgId, setOrgId] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    setOrgId(currentUser.organization_id);
  };

  const { data: games = [] } = useQuery({
    queryKey: ["games", orgId],
    queryFn: () =>
      orgId
        ? base44.entities.Game.filter({ organization_id: orgId }, "-scheduled_date")
        : [],
    enabled: !!orgId,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["teams", orgId],
    queryFn: () =>
      orgId ? base44.entities.Team.filter({ organization_id: orgId }) : [],
    enabled: !!orgId,
  });

  const createGameMutation = useMutation({
    mutationFn: (data) => base44.entities.Game.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["games"]);
      setIsDialogOpen(false);
      setEditingGame(null);
    },
  });

  const updateGameMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Game.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["games"]);
      setIsDialogOpen(false);
      setEditingGame(null);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const homeTeamId = formData.get("home_team_id");
    const awayTeamId = formData.get("away_team_id");
    const homeTeam = teams.find((t) => t.id === homeTeamId);
    const awayTeam = teams.find((t) => t.id === awayTeamId);

    const data = {
      organization_id: orgId,
      sport: formData.get("sport"),
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      home_team_name: homeTeam?.name,
      away_team_name: awayTeam?.name,
      scheduled_date: formData.get("scheduled_date"),
      venue: formData.get("venue"),
      status: formData.get("status") || "scheduled",
    };

    if (editingGame) {
      updateGameMutation.mutate({ id: editingGame.id, data });
    } else {
      createGameMutation.mutate(data);
    }
  };

  const startGame = async (gameId) => {
    await base44.entities.Game.update(gameId, {
      status: "in_progress",
      started_at: new Date().toISOString(),
      current_period: "Q1",
    });
    queryClient.invalidateQueries(["games"]);
    navigate(createPageUrl("LiveScoring") + `?gameId=${gameId}`);
  };

  const filteredGames = games.filter((g) => {
    if (filterStatus === "all") return true;
    return g.status === filterStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-700";
      case "in_progress":
        return "bg-red-100 text-red-700";
      case "completed":
        return "bg-green-100 text-green-700";
      case "cancelled":
        return "bg-slate-100 text-slate-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Games</h1>
            <p className="text-slate-600 mt-1">Manage all games and schedules</p>
          </div>
          <Button
            onClick={() => {
              setEditingGame(null);
              setIsDialogOpen(true);
            }}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Plus className="w-5 h-5 mr-2" />
            Schedule Game
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-2">
          {["all", "scheduled", "in_progress", "completed"].map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(status)}
              className={
                filterStatus === status
                  ? "bg-orange-500 hover:bg-orange-600"
                  : ""
              }
            >
              {status === "all" ? "All" : status.replace("_", " ")}
            </Button>
          ))}
        </div>

        {/* Games List */}
        <div className="space-y-4">
          {filteredGames.map((game) => (
            <Card key={game.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge className={getStatusColor(game.status)}>
                        {game.status.replace("_", " ")}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {game.sport}
                      </Badge>
                      {game.status === "in_progress" && (
                        <Badge className="bg-red-500 animate-pulse">LIVE</Badge>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 mb-4">
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Home Team</p>
                        <p className="text-xl font-bold text-slate-900">
                          {game.home_team_name}
                        </p>
                        {game.status !== "scheduled" && (
                          <p className="text-3xl font-bold text-orange-600 mt-1">
                            {game.home_score || 0}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Away Team</p>
                        <p className="text-xl font-bold text-slate-900">
                          {game.away_team_name}
                        </p>
                        {game.status !== "scheduled" && (
                          <p className="text-3xl font-bold text-orange-600 mt-1">
                            {game.away_score || 0}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(game.scheduled_date), "MMM d, yyyy h:mm a")}
                      </div>
                      {game.venue && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {game.venue}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {game.status === "scheduled" && (
                      <Button
                        onClick={() => startGame(game.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Game
                      </Button>
                    )}
                    {game.status === "in_progress" && (
                      <Button
                        onClick={() =>
                          navigate(
                            createPageUrl("LiveScoring") + `?gameId=${game.id}`
                          )
                        }
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Score Live
                      </Button>
                    )}
                    {game.status === "completed" && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          navigate(
                            createPageUrl("GameDetails") + `?gameId=${game.id}`
                          )
                        }
                      >
                        View Stats
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingGame(game);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredGames.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 mb-4">No games found</p>
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Schedule First Game
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Game Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingGame ? "Edit Game" : "Schedule New Game"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="sport">Sport *</Label>
              <Select
                name="sport"
                defaultValue={editingGame?.sport || "basketball"}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basketball">Basketball</SelectItem>
                  <SelectItem value="volleyball">Volleyball</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="home_team_id">Home Team *</Label>
                <Select name="home_team_id" defaultValue={editingGame?.home_team_id} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="away_team_id">Away Team *</Label>
                <Select name="away_team_id" defaultValue={editingGame?.away_team_id} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="scheduled_date">Date & Time *</Label>
              <Input
                id="scheduled_date"
                name="scheduled_date"
                type="datetime-local"
                defaultValue={
                  editingGame?.scheduled_date
                    ? new Date(editingGame.scheduled_date)
                        .toISOString()
                        .slice(0, 16)
                    : ""
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="venue">Venue *</Label>
              <Input
                id="venue"
                name="venue"
                defaultValue={editingGame?.venue}
                placeholder="Game venue/location"
                required
              />
            </div>
            {editingGame && (
              <div>
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={editingGame?.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
                {editingGame ? "Update" : "Schedule"} Game
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}