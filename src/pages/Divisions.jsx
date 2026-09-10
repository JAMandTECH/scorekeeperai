import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// Link is no longer needed here as navigation is handled by AdminSidebar
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Textarea is replaced by Input for the description field as per outline
import { Plus, Trophy, Edit, Trash2, AlertTriangle, FolderOpen } from "lucide-react"; // FolderOpen for empty states and division card icons, Trophy for Volleyball header icon
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
// Avatar components are now internal to AdminHeader/AdminSidebar
import { createPageUrl } from "@/utils";
import AdminHeader from "@/components/AdminHeader"; // New component import
import AdminSidebar from "@/components/AdminSidebar"; // New component import
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

export default function Divisions() {
  const [showForm, setShowForm] = useState(false);
  const [editingDivision, setEditingDivision] = useState(null);
  const [deletingDivision, setDeletingDivision] = useState(null);
  // user, organization, sidebarOpen, darkMode states remain here as per outline to be passed to AdminHeader/Sidebar
  const [user, setUser] = useState(null);
  // organization state is now managed by React Query
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
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
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  // Fetch organization using React Query
  const { data: organization } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      const res = await base44.functions.invoke('getUserOrganization', {});
      return res?.data?.organization || null;
    },
    enabled: !!user?.organization_id,
  });

  const handleLogout = () => {
    base44.auth.logout(createPageUrl("PublicLanding"));
  };

  // Removed navigation-related state and logic (isSuperAdmin, isAdmin, navigation arrays)
  // as it's expected to be managed within AdminSidebar.

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions', user?.organization_id],
    queryFn: async () => {
      if (user?.organization_id) {
        // Outline simplified this query function, removing the logic to assign organization_id to existing divisions.
        // It now only filters for divisions that already have the organization_id.
        return base44.entities.Division.filter({ organization_id: user?.organization_id });
      }
      return [];
    },
    enabled: !!user?.organization_id,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams', user?.organization_id],
    queryFn: () => base44.entities.Team.filter({ organization_id: user?.organization_id }),
    enabled: !!user?.organization_id,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      let seasonId = null;
      try {
        const res = await base44.functions.invoke('getActiveSeason', {});
        seasonId = res.data?.season?.id || null;
      } catch (_) {}
      return base44.entities.Division.create({ ...data, season_id: seasonId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['divisions']);
      queryClient.invalidateQueries(['teams']); // Invalidate teams as new division might change team contexts
      setShowForm(false);
      setEditingDivision(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Division.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['divisions']);
      queryClient.invalidateQueries(['teams']); // Invalidate teams as updated division might change team contexts
      setShowForm(false);
      setEditingDivision(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Division.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['divisions']);
      queryClient.invalidateQueries(['teams']); // Invalidate teams as deleted division might change team contexts
      setDeletingDivision(null);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      organization_id: user?.organization_id,
      name: formData.get('name'),
      sport: formData.get('sport'),
      description: formData.get('description'),
    };

    if (editingDivision) {
      updateMutation.mutate({ id: editingDivision.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (division) => {
    setEditingDivision(division);
    setShowForm(true);
  };

  const handleDeleteClick = (division) => {
    // Keep this logic to populate teamsCount, as it's used in the AlertDialogDescription
    const teamsInDivision = teams.filter(t => t.division === division.name && t.sport === division.sport);
    setDeletingDivision({ ...division, teamsCount: teamsInDivision.length });
  };

  const getTeamsInDivision = (divisionName, sport) => {
    return teams.filter(t => t.division === divisionName && t.sport === sport);
  };

  const basketballDivisions = divisions.filter(d => d.sport === 'basketball');
  const volleyballDivisions = divisions.filter(d => d.sport === 'volleyball');

  // DivisionCard component was removed, its logic is now inlined directly into the JSX below.

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
          currentPage="Divisions" // Pass current page for active link styling in AdminSidebar
        />

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 mt-16 lg:hidden" // `mt-16` to offset header height, `lg:hidden` to hide on desktop
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        {/* MAIN CONTENT */}
        <main className="flex-1 min-w-0 lg:ml-64"> {/* `lg:ml-64` to offset desktop sidebar width */}
          <div className="p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
              {/* Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="font-heading text-3xl font-bold tracking-tight">Divisions</h1>
                  <p className="text-muted-foreground mt-2 font-medium">Organize teams into divisions</p> {/* Updated description */}
                </div>
                <Button 
                  onClick={() => {
                    setEditingDivision(null);
                    setShowForm(true);
                  }}
                  className="font-medium"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Division
                </Button>
              </div>

              {/* Basketball Divisions */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 border border-border bg-card flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                      <path d="M2 12h20"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-heading font-bold">Basketball Divisions</h2>
                    <p className="text-sm text-muted-foreground font-medium">{basketballDivisions.length} divisions</p>
                  </div>
                </div>
                
                {basketballDivisions.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {basketballDivisions.map((division) => {
                      const divisionTeams = getTeamsInDivision(division.name, 'basketball');
                      return (
                        <Card key={division.id} className="relative border border-border bg-card hover:border-foreground/20 transition-colors">
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-14 h-14 border border-border bg-muted flex items-center justify-center">
                                  <FolderOpen className="w-7 h-7 text-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-lg font-heading font-bold truncate">{division.name}</CardTitle>
                                  <Badge variant="outline" className="mt-2 border-border text-muted-foreground font-medium uppercase text-xs">
                                    Basketball
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleEdit(division)}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDeleteClick(division)}
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {division.description && (
                              <div className="border border-border bg-background p-3">
                                <p className="text-sm text-muted-foreground font-medium">{division.description}</p>
                              </div>
                            )}
                            <div className="flex justify-between text-sm border border-border bg-background p-3">
                              <span className="text-muted-foreground font-medium">Teams in Division</span>
                              <span className="font-heading font-bold text-primary tabular-nums">{divisionTeams.length}</span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 border border-border bg-card">
                    <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">No basketball divisions yet</p>
                  </div>
                )}
              </div>

              {/* Volleyball Divisions */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 border border-border bg-card flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                      <path d="M2 12h20"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-heading font-bold">Volleyball Divisions</h2>
                    <p className="text-sm text-muted-foreground font-medium">{volleyballDivisions.length} divisions</p>
                  </div>
                </div>
                
                {volleyballDivisions.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {volleyballDivisions.map((division) => {
                      const divisionTeams = getTeamsInDivision(division.name, 'volleyball');
                      return (
                        <Card key={division.id} className="relative border border-border bg-card hover:border-foreground/20 transition-colors">
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-14 h-14 border border-border bg-muted flex items-center justify-center">
                                  <FolderOpen className="w-7 h-7 text-foreground" /> {/* Using FolderOpen for consistency */}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-lg font-heading font-bold truncate">{division.name}</CardTitle>
                                  <Badge variant="outline" className="mt-2 border-border text-muted-foreground font-medium uppercase text-xs">
                                    Volleyball
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleEdit(division)}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDeleteClick(division)}
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {division.description && (
                              <div className="border border-border bg-background p-3">
                                <p className="text-sm text-muted-foreground font-medium">{division.description}</p>
                              </div>
                            )}
                            <div className="flex justify-between text-sm border border-border bg-background p-3">
                              <span className="text-muted-foreground font-medium">Teams in Division</span>
                              <span className="font-heading font-bold text-primary tabular-nums">{divisionTeams.length}</span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 border border-border bg-card">
                    <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">No volleyball divisions yet</p>
                  </div>
                )}
              </div>

              {/* Add/Edit Dialog */}
              <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-heading font-bold">
                      {editingDivision ? 'Edit Division' : 'Add New Division'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="font-heading font-bold text-foreground">Division Name</Label>
                      <Input
                        id="name"
                        name="name"
                        defaultValue={editingDivision?.name}
                        placeholder="e.g., Division A, Youth League"
                        required
                        className="bg-background border border-border text-foreground font-medium"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="sport" className="font-heading font-bold text-foreground">Sport</Label>
                      <select
                        id="sport"
                        name="sport"
                        defaultValue={editingDivision?.sport || 'basketball'}
                        required
                        className="w-full bg-background border border-border text-foreground px-3 py-2 font-medium"
                      >
                        <option value="basketball">Basketball</option>
                        <option value="volleyball">Volleyball</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="description" className="font-heading font-bold text-foreground">Description (Optional)</Label>
                      <Input // Changed to Input as per outline
                        id="description"
                        name="description"
                        defaultValue={editingDivision?.description}
                        placeholder="Add division details or rules..."
                        className="bg-background border border-border text-foreground font-medium"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowForm(false)}
                        className="font-medium"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        className="font-medium"
                      >
                        {editingDivision ? 'Update' : 'Create'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Delete Confirmation Dialog */}
              <AlertDialog open={!!deletingDivision} onOpenChange={() => setDeletingDivision(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-destructive/10 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-destructive" />
                      </div>
                      <AlertDialogTitle className="text-xl font-heading font-bold">
                        Delete Division?
                      </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-muted-foreground font-medium">
                      Are you sure you want to delete <span className="font-heading font-bold text-foreground">"{deletingDivision?.name}"</span>?
                      {deletingDivision?.teamsCount > 0 && (
                        <div className="mt-3 p-3 bg-muted border border-border">
                          <p className="text-sm text-foreground font-medium">
                            ⚠️ Warning: {deletingDivision.teamsCount} team(s) are currently in this division.
                          </p>
                        </div>
                      )}
                      <p className="mt-3">This will not delete teams in this division, but they will no longer be associated with it.</p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="font-medium">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate(deletingDivision.id)}
                      className="font-medium"
                    >
                      Delete Division
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