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
      
      if (!currentUser?.organization_id) {
        console.log("Teams: No organization_id, redirecting to Dashboard");
        window.location.href = createPageUrl("Dashboard");
        return;
      }
      
      setUser(currentUser);
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
      console.log("Teams: Fetching organization for", user?.organization_id);
      const orgs = await base44.entities.Organization.list();
      const org = orgs.find(o => o.id === user?.organization_id);
      console.log("Teams: Organization found", org);
      return org;
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
  }, [pointsDiffMap])
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Team.create(data),
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading teams...</p>
      </div>
    );
  }

  const basketballTeams = teams.filter(t => t.sport === 'basketball');
  const volleyballTeams = teams.filter(t => t.sport === 'volleyball');

  const basketballTeamsSorted = sortTeams(basketballTeams);
  const volleyballTeamsSorted = sortTeams(volleyballTeams);

  const TeamCard = ({ team, sportColor }) => (
    <Card className={`relative overflow-hidden border-2 border-${sportColor}-100 dark:border-${sportColor}-900 bg-gradient-to-br from-white to-${sportColor}-50 dark:from-gray-800 dark:to-${sportColor}-950/30 shadow-lg hover:shadow-2xl transition-all group`}>
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-${sportColor}-500/20 to-transparent rounded-full blur-3xl`}></div>
      <CardHeader className="relative z-10">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3 flex-1">
            <Avatar className="w-16 h-16 border-4 border-white dark:border-gray-700 shadow-xl">
              <AvatarImage src={team.logo_url} />
              <AvatarFallback className={`bg-gradient-to-br from-${sportColor}-500 to-${sportColor}-600 text-white font-black text-lg`}>
                {team.name?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-black text-gray-900 dark:text-white truncate">{team.name}</CardTitle>
              <Badge className={`bg-${sportColor}-100 text-${sportColor}-700 border-${sportColor}-200 dark:bg-${sportColor}-950 dark:text-${sportColor}-300 dark:border-${sportColor}-800 font-bold mt-2`}>
                {team.division || 'No Division'}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => handleEdit(team)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => handleDeleteClick(team)}
              className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative z-10 space-y-4">
        <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-gray-900/50 rounded-xl">
          <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Record</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-green-600 dark:text-green-400">{team.wins || 0}W</span>
            <span className="text-gray-400">-</span>
            <span className="text-lg font-black text-red-600 dark:text-red-400">{team.losses || 0}L</span>
          </div>
        </div>
        
        {team.coach_name && (
          <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            <span className="text-gray-500 dark:text-gray-500">Coach:</span> <span className="text-gray-900 dark:text-white font-bold">{team.coach_name}</span>
          </div>
        )}
        
        <Link to={createPageUrl("Players") + `?team_id=${team.id}`}>
          <Button variant="outline" className={`w-full border-2 border-${sportColor}-200 dark:border-${sportColor}-800 text-${sportColor}-700 dark:text-${sportColor}-400 hover:bg-${sportColor}-50 dark:hover:bg-${sportColor}-950 font-bold`}>
            <Users className="w-4 h-4 mr-2" />
            View Players
          </Button>
        </Link>
      </CardContent>
    </Card>
  );

  const TeamTable = ({ teams, sportColor }) => (
    <Card className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900 border-b-2 border-gray-100 dark:border-gray-700">
                <th className="text-left py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">TEAM</th>
                <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">DIVISION</th>
                <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">W</th>
                <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">L</th>
                <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">COACH</th>
                <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.id} className={`border-b border-gray-100 dark:border-gray-700 hover:bg-${sportColor}-50/50 dark:hover:bg-${sportColor}-950/20 transition-colors`}>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-700 shadow-md">
                        <AvatarImage src={team.logo_url} />
                        <AvatarFallback className={`bg-gradient-to-br from-${sportColor}-500 to-${sportColor}-600 text-white text-xs font-bold`}>
                          {team.name?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-bold text-gray-900 dark:text-white">{team.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <Badge className={`bg-${sportColor}-100 text-${sportColor}-700 border-${sportColor}-200 dark:bg-${sportColor}-950 dark:text-${sportColor}-300 dark:border-${sportColor}-800 font-bold`}>
                      {team.division || 'No Division'}
                    </Badge>
                  </td>
                  <td className="py-4 px-4 text-center text-green-600 dark:text-green-400 font-bold text-lg">{team.wins || 0}</td>
                  <td className="py-4 px-4 text-center text-red-600 dark:text-red-400 font-bold text-lg">{team.losses || 0}</td>
                  <td className="py-4 px-4 text-center text-gray-600 dark:text-gray-400 font-medium text-sm">
                    {team.coach_name || '-'}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <Link to={createPageUrl("Players") + `?team_id=${team.id}`}>
                        <Button variant="outline" size="sm" className={`border-2 border-${sportColor}-200 dark:border-${sportColor}-800 text-${sportColor}-700 dark:text-${sportColor}-400 hover:bg-${sportColor}-50 dark:hover:bg-${sportColor}-950 font-bold`}>
                          <Users className="w-4 h-4 mr-1" />
                          Players
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEdit(team)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteClick(team)}
                        className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-gray-50 dark:from-gray-900 dark:via-orange-950/10 dark:to-gray-900">
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
                  <h1 className="text-4xl font-black text-gray-900 dark:text-white">Teams</h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Manage your organization's teams</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <div className="flex bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-1 shadow-sm">
                    <Button
                      variant={viewMode === 'card' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('card')}
                      className={`font-bold ${viewMode === 'card' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}
                    >
                      <LayoutGrid className="w-4 h-4 mr-2" />
                      Cards
                    </Button>
                    <Button
                      variant={viewMode === 'table' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('table')}
                      className={`font-bold ${viewMode === 'table' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}
                    >
                      <Table className="w-4 h-4 mr-2" />
                      Table
                    </Button>
                  </div>
                  <Button 
                    onClick={() => {
                      setEditingTeam(null);
                      setLogoFile(null);
                      setShowForm(true);
                    }}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-xl"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Team
                  </Button>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                      <path d="M2 12h20"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">Basketball Teams</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{basketballTeams.length} teams</p>
                  </div>
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
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Trophy className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">Volleyball Teams</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{volleyballTeams.length} teams</p>
                  </div>
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
                <DialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-gray-900 dark:text-white">{editingTeam ? 'Edit Team' : 'Add New Team'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label className="font-bold text-gray-700 dark:text-gray-300">Team Logo</Label>
                      <div className="mt-2 flex items-center gap-4">
                        <Avatar className="w-20 h-20 border-4 border-gray-200 dark:border-gray-600">
                          <AvatarImage src={logoFile ? URL.createObjectURL(logoFile) : editingTeam?.logo_url} />
                          <AvatarFallback className="bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700">
                            <Image className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setLogoFile(e.target.files[0])}
                            className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PNG, JPG, or GIF (Max 5MB)</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="name" className="font-bold text-gray-700 dark:text-gray-300">Team Name</Label>
                      <Input
                        id="name"
                        name="name"
                        defaultValue={editingTeam?.name}
                        required
                        className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sport" className="font-bold text-gray-700 dark:text-gray-300">Sport</Label>
                      <Select name="sport" defaultValue={editingTeam?.sport || 'basketball'} required>
                        <SelectTrigger className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600">
                          <SelectItem value="basketball">Basketball</SelectItem>
                          <SelectItem value="volleyball">Volleyball</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="division" className="font-bold text-gray-700 dark:text-gray-300">Division</Label>
                      <Input
                        id="division"
                        name="division"
                        defaultValue={editingTeam?.division}
                        placeholder="e.g., Division A, Youth League"
                        className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <Label htmlFor="coach_name" className="font-bold text-gray-700 dark:text-gray-300">Coach Name</Label>
                      <Input
                        id="coach_name"
                        name="coach_name"
                        defaultValue={editingTeam?.coach_name}
                        className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <Label htmlFor="coach_contact" className="font-bold text-gray-700 dark:text-gray-300">Coach Contact</Label>
                      <Input
                        id="coach_contact"
                        name="coach_contact"
                        defaultValue={editingTeam?.coach_contact}
                        placeholder="Phone or email"
                        className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={uploading} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold">
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
                <AlertDialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
                  <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-red-100 dark:bg-red-950/30 rounded-xl flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                      </div>
                      <AlertDialogTitle className="text-xl font-black text-gray-900 dark:text-white">
                        Delete Team?
                      </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-gray-600 dark:text-gray-400 font-medium">
                      Are you sure you want to delete <span className="font-bold text-gray-900 dark:text-white">"{deletingTeam?.name}"</span>?
                      {deletingTeam?.playersCount > 0 && (
                        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <p className="text-sm text-yellow-800 dark:text-yellow-300 font-semibold">
                            ⚠️ Warning: This team has {deletingTeam.playersCount} player(s). Deleting this team will also remove all associated players and their statistics.
                          </p>
                        </div>
                      )}
                      <p className="mt-3 font-semibold text-red-600 dark:text-red-400">This action cannot be undone.</p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-2 border-gray-300 dark:border-gray-600 font-bold">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate(deletingTeam.id)}
                      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold"
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