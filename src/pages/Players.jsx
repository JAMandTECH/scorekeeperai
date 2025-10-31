import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserCircle, Plus, Edit } from "lucide-react";

export default function Players() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [orgId, setOrgId] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [filterTeam, setFilterTeam] = useState("all");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    setOrgId(currentUser.organization_id);
  };

  const { data: players = [] } = useQuery({
    queryKey: ["players", orgId],
    queryFn: () =>
      orgId ? base44.entities.Player.filter({ organization_id: orgId }) : [],
    enabled: !!orgId,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["teams", orgId],
    queryFn: () =>
      orgId ? base44.entities.Team.filter({ organization_id: orgId }) : [],
    enabled: !!orgId,
  });

  const createPlayerMutation = useMutation({
    mutationFn: (data) => base44.entities.Player.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["players"]);
      setIsDialogOpen(false);
      setEditingPlayer(null);
    },
  });

  const updatePlayerMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Player.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["players"]);
      setIsDialogOpen(false);
      setEditingPlayer(null);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      organization_id: orgId,
      team_id: formData.get("team_id"),
      first_name: formData.get("first_name"),
      last_name: formData.get("last_name"),
      jersey_number: formData.get("jersey_number"),
      position: formData.get("position"),
      date_of_birth: formData.get("date_of_birth"),
      height: formData.get("height"),
      weight: formData.get("weight"),
      status: formData.get("status"),
    };

    if (editingPlayer) {
      updatePlayerMutation.mutate({ id: editingPlayer.id, data });
    } else {
      createPlayerMutation.mutate(data);
    }
  };

  const getTeamName = (teamId) => {
    const team = teams.find((t) => t.id === teamId);
    return team?.name || "Unknown Team";
  };

  const filteredPlayers = players.filter((p) => {
    if (filterTeam === "all") return true;
    return p.team_id === filterTeam;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "injured":
        return "bg-red-100 text-red-700";
      case "inactive":
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
            <h1 className="text-3xl font-bold text-slate-900">Players</h1>
            <p className="text-slate-600 mt-1">
              Manage all players in your organization
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingPlayer(null);
              setIsDialogOpen(true);
            }}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Player
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <Select value={filterTeam} onValueChange={setFilterTeam}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filter by team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Players Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Jersey</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Height/Weight</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlayers.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {player.photo_url ? (
                          <img
                            src={player.photo_url}
                            alt={`${player.first_name} ${player.last_name}`}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-full flex items-center justify-center">
                            <UserCircle className="w-6 h-6 text-white" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold">
                            {player.first_name} {player.last_name}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-bold">
                        #{player.jersey_number}
                      </Badge>
                    </TableCell>
                    <TableCell>{getTeamName(player.team_id)}</TableCell>
                    <TableCell>{player.position || "-"}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {player.height && <div>{player.height}</div>}
                        {player.weight && <div>{player.weight}</div>}
                        {!player.height && !player.weight && "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(player.status)}>
                        {player.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingPlayer(player);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredPlayers.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                No players found
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Player Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlayer ? "Edit Player" : "Add New Player"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  defaultValue={editingPlayer?.first_name}
                  required
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  defaultValue={editingPlayer?.last_name}
                  required
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="team_id">Team *</Label>
                <Select
                  name="team_id"
                  defaultValue={editingPlayer?.team_id}
                  required
                >
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
                <Label htmlFor="jersey_number">Jersey Number *</Label>
                <Input
                  id="jersey_number"
                  name="jersey_number"
                  defaultValue={editingPlayer?.jersey_number}
                  required
                  placeholder="23"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  name="position"
                  defaultValue={editingPlayer?.position}
                  placeholder="e.g., Guard, Forward, Center"
                />
              </div>
              <div>
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  name="date_of_birth"
                  type="date"
                  defaultValue={editingPlayer?.date_of_birth}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="height">Height</Label>
                <Input
                  id="height"
                  name="height"
                  defaultValue={editingPlayer?.height}
                  placeholder="6'2&quot; or 188cm"
                />
              </div>
              <div>
                <Label htmlFor="weight">Weight</Label>
                <Input
                  id="weight"
                  name="weight"
                  defaultValue={editingPlayer?.weight}
                  placeholder="180 lbs or 82 kg"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                name="status"
                defaultValue={editingPlayer?.status || "active"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="injured">Injured</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600"
              >
                {editingPlayer ? "Update" : "Create"} Player
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}