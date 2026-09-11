import React, { useState, useEffect } from "react";
// Note: React.useMemo and React.useCallback used without named imports to avoid duplicate hook import issues
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Edit, Trophy, Upload, Image, LayoutGrid, Table, Trash2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Teams() {
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [deletingTeam, setDeletingTeam] = useState(null);
  const [user, setUser] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState('card');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const canManageTeams = user?.role === 'admin';

  useEffect(() => {
    loadUser();
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      console.log("Teams: User loaded", currentUser);

      const orgId = currentUser?.active_organization_id || currentUser?.organization_id;
      if (!orgId) {
        console.log("Teams: No organization, redirecting to JoinOrganization");
        window.location.href = createPageUrl("JoinOrganization");
        return;
      }

      // Normalize so the rest of the page can rely on organization_id
      setUser({ ...currentUser, organization_id: orgId });
    } catch (error) {
      console.error("Error loading user:", error);
      window.location.href = createPageUrl("Home");
    } finally {
      setLoading(false);
    }
  };

  const { data: organization, isLoading: orgLoading, error: orgError } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      const res = await base44.functions.invoke('getUserOrganization', {});
      return res?.data?.organization || null;
    },
    enabled: !!user?.organization_id,
  });
  
  // Log organization loading state
  useEffect(() => {
    console.log("Teams: orgLoading", orgLoading, "orgError", orgError, "organization", organization);
  }, [orgLoading, orgError, organization]);

  const handleLogout = () => {
    base44.auth.logout(createPageUrl("PublicLanding"));
  };

  const recalc = async () => {
    if (!user?.organization_id) return;
    try {
      await base44.functions.invoke('recalcStandings', { organization_id: user.organization_id });
    } catch (e) {
      console.warn('Recalc standings failed (non-blocking):', e?.response?.data || e.message);
    }
  };

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['teams', user?.organization_id],
    queryFn: async () => {
      await recalc();
      return base44.entities.Team.filter({ organization_id: user?.organization_id }, '-created_date');
    },
    enabled: !!user?.organization_id,
  });

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['all-players'],
    queryFn: () => base44.entities.Player.list(),
    enabled: !!user?.organization_id,
  });

  const { data: orgGames = [] } = useQuery({
    queryKey: ['org-games', user?.organization_id],
    queryFn: () => base44.entities.Game.filter({ organization_id: user?.organization_id, status: 'completed' }),
    enabled: !!user?.organization_id,
  });

  // Derived data (define before any early returns)
  const completedGames = React.useMemo(() => (orgGames || []).filter(g => g.status === 'completed'), [orgGames]);

  const pointsDiffMap = React.useMemo(() => {
    const map = {};
    completedGames.forEach(g => {
      const hId = g.home_team_id;
      const aId = g.away_team_id;
      if (!map[hId]) map[hId] = { pf: 0, pa: 0 };
      if (!map[aId]) map[aId] = { pf: 0, pa: 0 };
      map[hId].pf += g.home_score || 0;
      map[hId].pa += g.away_score || 0;
      map[aId].pf += g.away_score || 0;
      map[aId].pa += g.home_score || 0;
    });
    return map;
  }, [completedGames]);

  const sortTeams = React.useCallback((arr) => {
    return [...arr].sort((a, b) => {
      const winsA = a.wins || 0, winsB = b.wins || 0;
      if (winsB !== winsA) return winsB - winsA;
      const diffA = (pointsDiffMap[a.id]?.pf || 0) - (pointsDiffMap[a.id]?.pa || 0);
      const diffB = (pointsDiffMap[b.id]?.pf || 0) - (pointsDiffMap[b.id]?.pa || 0);
      if (diffB !== diffA) return diffB - diffA;
      const lossesA = a.losses || 0, lossesB = b.losses || 0;
      return lossesA - lossesB;
    });
  }, [pointsDiffMap]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      let seasonId = null;
      try {
        const res = await base44.functions.invoke('getActiveSeason', {});
        seasonId = res.data?.season?.id || null;
      } catch (_) {}
      return base44.entities.Team.create({ ...data, season_id: seasonId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['teams']);
      setShowForm(false);
      setEditingTeam(null);
      setLogoFile(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Team.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['teams']);
      setShowForm(false);
      setEditingTeam(null);
      setLogoFile(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Team.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['teams']);
      setDeletingTeam(null);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      const formData = new FormData(e.target);
      const data = {
        organization_id: user?.organization_id,
        name: formData.get('name'),
        sport: formData.get('sport'),
        division: formData.get('division'),
        coach_name: formData.get('coach_name'),
        coach_contact: formData.get('coach_contact'),
      };

      if (logoFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: logoFile });
        data.logo_url = file_url;
      }

      if (editingTeam) {
        updateMutation.mutate({ id: editingTeam.id, data });
      } else {
        createMutation.mutate(data);
      }
    } catch (error) {
      console.error("Error uploading logo:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (team) => {
    setEditingTeam(team);
    setLogoFile(null);
    setShowForm(true);
  };

  const handleDeleteClick = (team) => {
    const playersInTeam = allPlayers.filter(p => p.team_id === team.id);
    setDeletingTeam({ ...team, playersCount: playersInTeam.length });
  };

  console.log("Teams: Render check - loading:", loading, "user:", user, "teamsLoading:", teamsLoading);
  
  if (loading || !user || teamsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
        <p className="mt-4 text-muted-foreground text-sm">Loading teams...</p>
      </div>
    );
  }

  const basketballTeams = teams.filter(t => t.sport === 'basketball');
  const volleyballTeams = teams.filter(t => t.sport === 'volleyball');

  const basketballTeamsSorted = sortTeams(basketballTeams);
  const volleyballTeamsSorted = sortTeams(volleyballTeams);

  const TeamCard = ({ team, sportColor }) => (
    <Card className="relative border border-border bg-card hover:border-foreground/20 transition-colors">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3 flex-1">
            <Avatar className="w-16 h-16 border border-border">
              <AvatarImage src={team.logo_url} />
              <AvatarFallback className="bg-secondary text-foreground font-heading font-bold text-lg">
                {team.name?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-heading font-bold truncate">{team.name}</CardTitle>
              <Badge variant="outline" className="border-border text-muted-foreground font-medium mt-2">
                {team.division || 'No Division'}
              </Badge>
            </div>
          </div>
          {canManageTeams && (
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleEdit(team)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleDeleteClick(team)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center p-3 border border-border bg-background">
          <span className="text-sm text-muted-foreground font-medium">Record</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-heading font-bold text-primary">{team.wins || 0}W</span>
            <span className="text-muted-foreground">-</span>
            <span className="text-lg font-heading font-bold text-destructive">{team.losses || 0}L</span>
          </div>
        </div>
        
        {team.coach_name && (
          <div className="text-sm text-muted-foreground font-medium">
            <span>Coach:</span> <span className="text-foreground font-heading font-bold">{team.coach_name}</span>
          </div>
        )}
        
        <Link to={createPageUrl("Players") + `?team_id=${team.id}`}>
          <Button variant="outline" className="w-full font-medium">
            <Users className="w-4 h-4 mr-2" />
            View Players
          </Button>
        </Link>
      </CardContent>
    </Card>
  );

  const TeamTable = ({ teams, sportColor }) => (
    <Card className="border border-border bg-card">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left py-4 px-4 text-muted-foreground font-heading font-bold text-sm uppercase tracking-wide">Team</th>
                <th className="text-center py-4 px-4 text-muted-foreground font-heading font-bold text-sm uppercase tracking-wide">Division</th>
                <th className="text-center py-4 px-4 text-muted-foreground font-heading font-bold text-sm uppercase tracking-wide">W</th>
                <th className="text-center py-4 px-4 text-muted-foreground font-heading font-bold text-sm uppercase tracking-wide">L</th>
                <th className="text-center py-4 px-4 text-muted-foreground font-heading font-bold text-sm uppercase tracking-wide">Coach</th>
                <th className="text-center py-4 px-4 text-muted-foreground font-heading font-bold text-sm uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12 border border-border">
                        <AvatarImage src={team.logo_url} />
                        <AvatarFallback className="bg-secondary text-foreground text-xs font-heading font-bold">
                          {team.name?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-heading font-bold text-foreground">{team.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <Badge variant="outline" className="border-border text-muted-foreground font-medium">
                      {team.division || 'No Division'}
                    </Badge>
                  </td>
                  <td className="py-4 px-4 text-center text-primary font-heading font-bold text-lg tabular-nums">{team.wins || 0}</td>
                  <td className="py-4 px-4 text-center text-destructive font-heading font-bold text-lg tabular-nums">{team.losses || 0}</td>
                  <td className="py-4 px-4 text-center text-muted-foreground font-medium text-sm">
                    {team.coach_name || '-'}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <Link to={createPageUrl("Players") + `?team_id=${team.id}`}>
                        <Button variant="outline" size="sm" className="font-medium">
                          <Users className="w-4 h-4 mr-1" />
                          Players
                        </Button>
                      </Link>
                      {canManageTeams && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEdit(team)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteClick(team)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminHeader 
        user={user}
        organization={organization}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        handleLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="flex">
        <AdminSidebar 
          user={user}
          organization={organization}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          handleLogout={handleLogout}
        />

        <main className="flex-1 min-w-0">
          <div className="p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="font-heading text-3xl font-bold tracking-tight">Teams</h1>
                  <p className="text-muted-foreground mt-1 text-sm">Manage your organization's teams</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <div className="flex border border-border rounded-sm p-1">
                    <Button
                      variant={viewMode === 'card' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('card')}
                      className={`font-medium ${viewMode === 'card' ? '' : 'text-muted-foreground'}`}
                    >
                      <LayoutGrid className="w-4 h-4 mr-2" />
                      Cards
                    </Button>
                    <Button
                      variant={viewMode === 'table' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('table')}
                      className={`font-medium ${viewMode === 'table' ? '' : 'text-muted-foreground'}`}
                    >
                      <Table className="w-4 h-4 mr-2" />
                      Table
                    </Button>
                  </div>
                  {canManageTeams && (
                    <Button 
                      onClick={() => {
                        setEditingTeam(null);
                        setLogoFile(null);
                        setShowForm(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Team
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-6">
                  <h2 className="font-heading text-xl font-bold tracking-tight">Basketball Teams</h2>
                  <p className="text-sm text-muted-foreground mt-1">{basketballTeams.length} teams</p>
                </div>
                
                {viewMode === 'card' ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {basketballTeamsSorted.map((team) => (
                      <TeamCard key={team.id} team={team} sportColor="orange" />
                    ))}
                  </div>
                ) : (
                  <TeamTable teams={basketballTeamsSorted} sportColor="orange" />
                )}
              </div>

              <div>
                <div className="mb-6">
                  <h2 className="font-heading text-xl font-bold tracking-tight">Volleyball Teams</h2>
                  <p className="text-sm text-muted-foreground mt-1">{volleyballTeams.length} teams</p>
                </div>
                
                {viewMode === 'card' ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {volleyballTeamsSorted.map((team) => (
                      <TeamCard key={team.id} team={team} sportColor="blue" />
                    ))}
                  </div>
                ) : (
                  <TeamTable teams={volleyballTeamsSorted} sportColor="blue" />
                )}
              </div>

              <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-heading font-bold">{editingTeam ? 'Edit Team' : 'Add New Team'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label className="font-heading font-bold text-foreground">Team Logo</Label>
                      <div className="mt-2 flex items-center gap-4">
                        <Avatar className="w-20 h-20 border border-border">
                          <AvatarImage src={logoFile ? URL.createObjectURL(logoFile) : editingTeam?.logo_url} />
                          <AvatarFallback className="bg-muted">
                            <Image className="w-8 h-8 text-muted-foreground" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setLogoFile(e.target.files[0])}
                            className="bg-background border border-border text-foreground font-medium"
                          />
                          <p className="text-xs text-muted-foreground mt-1">PNG, JPG, or GIF (Max 5MB)</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="name" className="font-heading font-bold text-foreground">Team Name</Label>
                      <Input
                        id="name"
                        name="name"
                        defaultValue={editingTeam?.name}
                        required
                        className="bg-background border border-border text-foreground font-medium"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sport" className="font-heading font-bold text-foreground">Sport</Label>
                      <Select name="sport" defaultValue={editingTeam?.sport || 'basketball'} required>
                        <SelectTrigger className="bg-background border border-border text-foreground font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basketball">Basketball</SelectItem>
                          <SelectItem value="volleyball">Volleyball</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="division" className="font-heading font-bold text-foreground">Division</Label>
                      <Input
                        id="division"
                        name="division"
                        defaultValue={editingTeam?.division}
                        placeholder="e.g., Division A, Youth League"
                        className="bg-background border border-border text-foreground font-medium"
                      />
                    </div>
                    <div>
                      <Label htmlFor="coach_name" className="font-heading font-bold text-foreground">Coach Name</Label>
                      <Input
                        id="coach_name"
                        name="coach_name"
                        defaultValue={editingTeam?.coach_name}
                        className="bg-background border border-border text-foreground font-medium"
                      />
                    </div>
                    <div>
                      <Label htmlFor="coach_contact" className="font-heading font-bold text-foreground">Coach Contact</Label>
                      <Input
                        id="coach_contact"
                        name="coach_contact"
                        defaultValue={editingTeam?.coach_contact}
                        placeholder="Phone or email"
                        className="bg-background border border-border text-foreground font-medium"
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="font-medium">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={uploading} className="font-medium">
                        {uploading ? (
                          <>
                            <Upload className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          editingTeam ? 'Update' : 'Create'
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <AlertDialog open={!!deletingTeam} onOpenChange={() => setDeletingTeam(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-destructive/10 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-destructive" />
                      </div>
                      <AlertDialogTitle className="text-xl font-heading font-bold">
                        Delete Team?
                      </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-muted-foreground font-medium">
                      Are you sure you want to delete <span className="font-heading font-bold text-foreground">"{deletingTeam?.name}"</span>?
                      {deletingTeam?.playersCount > 0 && (
                        <div className="mt-3 p-3 bg-muted border border-border">
                          <p className="text-sm text-foreground font-medium">
                            ⚠️ Warning: This team has {deletingTeam.playersCount} player(s). Deleting this team will also remove all associated players and their statistics.
                          </p>
                        </div>
                      )}
                      <p className="mt-3 font-medium text-destructive">This action cannot be undone.</p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="font-medium">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate(deletingTeam.id)}
                      className="font-medium"
                    >
                      Delete Team
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}