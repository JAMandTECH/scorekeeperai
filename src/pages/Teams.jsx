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
import { Users, Plus, Edit, Trash2 } from "lucide-react";

export default function Teams() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [orgId, setOrgId] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    setOrgId(currentUser.organization_id);
  };

  const { data: teams = [] } = useQuery({
    queryKey: ["teams", orgId],
    queryFn: () =>
      orgId ? base44.entities.Team.filter({ organization_id: orgId }) : [],
    enabled: !!orgId,
  });

  const { data: players = [] } = useQuery({
    queryKey: ["players", orgId],
    queryFn: () =>
      orgId ? base44.entities.Player.filter({ organization_id: orgId }) : [],
    enabled: !!orgId,
  });

  const createTeamMutation = useMutation({
    mutationFn: (data) => base44.entities.Team.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["teams"]);
      setIsDialogOpen(false);
      setEditingTeam(null);
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Team.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["teams"]);
      setIsDialogOpen(false);
      setEditingTeam(null);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      organization_id: orgId,
      name: formData.get("name"),
      sport: formData.get("sport"),
      division: formData.get("division"),
      coach_name: formData.get("coach_name"),
      coach_phone: formData.get("coach_phone"),
      primary_color: formData.get("primary_color"),
      secondary_color: formData.get("secondary_color"),
    };

    if (editingTeam) {
      updateTeamMutation.mutate({ id: editingTeam.id, data });
    } else {
      createTeamMutation.mutate(data);
    }
  };

  const getTeamPlayerCount = (teamId) => {
    return players.filter((p) => p.team_id === teamId).length;
  };

  return (
    <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Teams</h1>
            <p className="text-slate-600 mt-1">
              Manage all teams in your organization
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingTeam(null);
              setIsDialogOpen(true);
            }}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Team
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <Card
              key={team.id}
              className="hover:shadow-lg transition-shadow overflow-hidden"
            >
              <div
                className="h-24"
                style={{
                  background: `linear-gradient(135deg, ${team.primary_color || "#f97316"} 0%, ${team.secondary_color || "#fbbf24"} 100%)`,
                }}
              />
              <CardHeader className="-mt-8">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-white rounded-xl shadow-lg flex items-center justify-center">
                      {team.logo_url ? (
                        <img
                          src={team.logo_url}
                          alt={team.name}
                          className="w-14 h-14 rounded-lg object-cover"
                        />
                      ) : (
                        <Users className="w-8 h-8 text-slate-600" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <Badge
                        variant="secondary"
                        className="mt-1 capitalize"
                      >
                        {team.sport}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingTeam(team);
                      setIsDialogOpen(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {team.division && (
                    <div>
                      <p className="text-sm text-slate-600">Division</p>
                      <p className="font-medium">{team.division}</p>
                    </div>
                  )}
                  {team.coach_name && (
                    <div>
                      <p className="text-sm text-slate-600">Coach</p>
                      <p className="font-medium">{team.coach_name}</p>
                      {team.coach_phone && (
                        <p className="text-sm text-slate-600">
                          {team.coach_phone}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="pt-3 border-t">
                    <p className="text-sm text-slate-600">
                      {getTeamPlayerCount(team.id)} Player
                      {getTeamPlayerCount(team.id) !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {teams.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-4">No teams yet</p>
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add First Team
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Team Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTeam ? "Edit Team" : "Add New Team"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Team Name *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editingTeam?.name}
                required
                placeholder="Enter team name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sport">Sport *</Label>
                <Select
                  name="sport"
                  defaultValue={editingTeam?.sport || "basketball"}
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
              <div>
                <Label htmlFor="division">Division</Label>
                <Input
                  id="division"
                  name="division"
                  defaultValue={editingTeam?.division}
                  placeholder="e.g., Division A, U-18"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="coach_name">Coach Name</Label>
                <Input
                  id="coach_name"
                  name="coach_name"
                  defaultValue={editingTeam?.coach_name}
                  placeholder="Coach full name"
                />
              </div>
              <div>
                <Label htmlFor="coach_phone">Coach Phone</Label>
                <Input
                  id="coach_phone"
                  name="coach_phone"
                  defaultValue={editingTeam?.coach_phone}
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primary_color">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary_color"
                    name="primary_color"
                    type="color"
                    defaultValue={editingTeam?.primary_color || "#f97316"}
                    className="w-20 h-10"
                  />
                  <Input
                    defaultValue={editingTeam?.primary_color || "#f97316"}
                    placeholder="#f97316"
                    className="flex-1"
                    disabled
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="secondary_color">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondary_color"
                    name="secondary_color"
                    type="color"
                    defaultValue={editingTeam?.secondary_color || "#fbbf24"}
                    className="w-20 h-10"
                  />
                  <Input
                    defaultValue={editingTeam?.secondary_color || "#fbbf24"}
                    placeholder="#fbbf24"
                    className="flex-1"
                    disabled
                  />
                </div>
              </div>
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
                {editingTeam ? "Update" : "Create"} Team
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}