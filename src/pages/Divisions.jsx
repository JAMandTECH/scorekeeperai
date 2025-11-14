
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
  const [organization, setOrganization] = useState(null);
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
    
    if (currentUser?.organization_id) {
      const orgs = await base44.entities.Organization.list();
      const userOrg = orgs.find(o => o.id === currentUser.organization_id);
      setOrganization(userOrg);
    }
  };

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
    mutationFn: (data) => base44.entities.Division.create(data),
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-900 dark:via-blue-950/10 dark:to-gray-900">
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
            className="fixed inset-0 bg-gray-900/50 dark:bg-black/70 z-30 backdrop-blur-sm mt-16 lg:hidden" // `mt-16` to offset header height, `lg:hidden` to hide on desktop
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
                  <h1 className="text-4xl font-black text-gray-900 dark:text-white">Divisions</h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Organize teams into divisions</p> {/* Updated description */}
                </div>
                <Button 
                  onClick={() => {
                    setEditingDivision(null);
                    setShowForm(true);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-xl"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Division
                </Button>
              </div>

              {/* Basketball Divisions */}
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
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">Basketball Divisions</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{basketballDivisions.length} divisions</p>
                  </div>
                </div>
                
                {basketballDivisions.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {basketballDivisions.map((division) => {
                      const divisionTeams = getTeamsInDivision(division.name, 'basketball');
                      return (
                        <Card key={division.id} className="relative overflow-hidden border-2 border-orange-100 dark:border-orange-900 bg-gradient-to-br from-white to-orange-50 dark:from-gray-800 dark:to-orange-950/30 shadow-lg hover:shadow-2xl transition-all">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/20 to-transparent rounded-full blur-3xl"></div>
                          <CardHeader className="relative z-10">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-xl">
                                  <FolderOpen className="w-7 h-7 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-lg font-black text-gray-900 dark:text-white truncate">{division.name}</CardTitle>
                                  <Badge className="mt-2 bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800 font-bold">
                                    Basketball
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleEdit(division)}
                                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDeleteClick(division)}
                                  className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3 relative z-10">
                            {division.description && (
                              <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-3">
                                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{division.description}</p>
                              </div>
                            )}
                            <div className="flex justify-between text-sm bg-white/60 dark:bg-gray-900/60 rounded-xl p-3">
                              <span className="text-gray-600 dark:text-gray-400 font-bold">Teams in Division</span>
                              <span className="font-black text-orange-600 dark:text-orange-400">{divisionTeams.length}</span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700">
                    <FolderOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">No basketball divisions yet</p>
                  </div>
                )}
              </div>

              {/* Volleyball Divisions */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                      <path d="M2 12h20"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">Volleyball Divisions</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{volleyballDivisions.length} divisions</p>
                  </div>
                </div>
                
                {volleyballDivisions.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {volleyballDivisions.map((division) => {
                      const divisionTeams = getTeamsInDivision(division.name, 'volleyball');
                      return (
                        <Card key={division.id} className="relative overflow-hidden border-2 border-blue-100 dark:border-blue-900 bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-950/30 shadow-lg hover:shadow-2xl transition-all">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-3xl"></div>
                          <CardHeader className="relative z-10">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-xl">
                                  <FolderOpen className="w-7 h-7 text-white" /> {/* Using FolderOpen for consistency */}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-lg font-black text-gray-900 dark:text-white truncate">{division.name}</CardTitle>
                                  <Badge className="mt-2 bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 font-bold">
                                    Volleyball
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleEdit(division)}
                                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDeleteClick(division)}
                                  className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3 relative z-10">
                            {division.description && (
                              <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-3">
                                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{division.description}</p>
                              </div>
                            )}
                            <div className="flex justify-between text-sm bg-white/60 dark:bg-gray-900/60 rounded-xl p-3">
                              <span className="text-gray-600 dark:text-gray-400 font-bold">Teams in Division</span>
                              <span className="font-black text-blue-600 dark:text-blue-400">{divisionTeams.length}</span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700">
                    <FolderOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">No volleyball divisions yet</p>
                  </div>
                )}
              </div>

              {/* Add/Edit Dialog */}
              <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-gray-900 dark:text-white">
                      {editingDivision ? 'Edit Division' : 'Add New Division'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="font-bold text-gray-700 dark:text-gray-300">Division Name</Label>
                      <Input
                        id="name"
                        name="name"
                        defaultValue={editingDivision?.name}
                        placeholder="e.g., Division A, Youth League"
                        required
                        className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="sport" className="font-bold text-gray-700 dark:text-gray-300">Sport</Label>
                      <select
                        id="sport"
                        name="sport"
                        defaultValue={editingDivision?.sport || 'basketball'}
                        required
                        className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-3 py-2 font-medium"
                      >
                        <option value="basketball">Basketball</option>
                        <option value="volleyball">Volleyball</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="description" className="font-bold text-gray-700 dark:text-gray-300">Description (Optional)</Label>
                      <Input // Changed to Input as per outline
                        id="description"
                        name="description"
                        defaultValue={editingDivision?.description}
                        placeholder="Add division details or rules..."
                        className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowForm(false)}
                        className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold"
                      >
                        {editingDivision ? 'Update' : 'Create'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Delete Confirmation Dialog */}
              <AlertDialog open={!!deletingDivision} onOpenChange={() => setDeletingDivision(null)}>
                <AlertDialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
                  <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-red-100 dark:bg-red-950/30 rounded-xl flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                      </div>
                      <AlertDialogTitle className="text-xl font-black text-gray-900 dark:text-white">
                        Delete Division?
                      </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-gray-600 dark:text-gray-400 font-medium">
                      Are you sure you want to delete <span className="font-bold text-gray-900 dark:text-white">"{deletingDivision?.name}"</span>?
                      {deletingDivision?.teamsCount > 0 && (
                        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <p className="text-sm text-yellow-800 dark:text-yellow-300 font-semibold">
                            ⚠️ Warning: {deletingDivision.teamsCount} team(s) are currently in this division.
                          </p>
                        </div>
                      )}
                      <p className="mt-3">This will not delete teams in this division, but they will no longer be associated with it.</p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-2 border-gray-300 dark:border-gray-600 font-bold">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate(deletingDivision.id)}
                      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold"
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
