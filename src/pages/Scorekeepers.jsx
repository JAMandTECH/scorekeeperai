
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, UserCheck, Mail, Trash2, AlertTriangle, Menu, X, LogOut, Sun, Moon, Home, BarChart3, Trophy, Users, Calendar, Shield, PlayCircle, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
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

export default function Scorekeepers() {
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [selectedSports, setSelectedSports] = useState([]);
  const [searchError, setSearchError] = useState("");
  const [removingScorekeeper, setRemovingScorekeeper] = useState(null);
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

  const isSuperAdmin = user?.role === 'admin' && user?.is_super_admin === true;
  const isAdmin = user?.role === 'admin';

  const superAdminNav = [
    { title: "Home", url: createPageUrl("Home"), icon: Home },
    { title: "Dashboard", url: createPageUrl("Dashboard"), icon: BarChart3 },
    { title: "Organizations", url: createPageUrl("Organizations"), icon: Building2 },
    { title: "All Teams", url: createPageUrl("AllTeams"), icon: Users },
    { title: "All Games", url: createPageUrl("AllGames"), icon: Calendar },
    { title: "Admin Approvals", url: createPageUrl("AdminApprovals"), icon: Shield },
  ];

  const adminNav = [
    { title: "Home", url: createPageUrl("Home"), icon: Home },
    { title: "Dashboard", url: createPageUrl("Dashboard"), icon: BarChart3 },
    { title: "Divisions", url: createPageUrl("Divisions"), icon: Trophy },
    { title: "Teams", url: createPageUrl("Teams"), icon: Users },
    { title: "Players", url: createPageUrl("Players"), icon: Trophy },
    { title: "Games", url: createPageUrl("Games"), icon: Calendar },
    { title: "Scorekeepers", url: createPageUrl("Scorekeepers"), icon: Shield },
    { title: "Live Scoring", url: createPageUrl("LiveScoring"), icon: PlayCircle },
    { title: "Statistics", url: createPageUrl("Statistics"), icon: BarChart3 },
  ];

  const navigationItems = isSuperAdmin ? superAdminNav : (isAdmin ? adminNav : []);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user?.organization_id,
  });

  // Filter scorekeepers for this organization
  const scorekeepers = allUsers.filter(u => 
    u.is_scorekeeper === true && 
    u.organization_id === user?.organization_id
  );

  const assignScorekeeperMutation = useMutation({
    mutationFn: async ({ userId, sports }) => {
      await base44.entities.User.update(userId, {
        is_scorekeeper: true,
        organization_id: user?.organization_id,
        scorekeeper_sports: sports,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['all-users']);
      setShowForm(false);
      setEmail("");
      setSelectedSports([]);
      setSearchError("");
    },
  });

  const removeScorekeeperMutation = useMutation({
    mutationFn: async (userId) => {
      await base44.entities.User.update(userId, {
        is_scorekeeper: false,
        scorekeeper_sports: [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['all-users']);
      setRemovingScorekeeper(null);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSearchError("");

    if (selectedSports.length === 0) {
      setSearchError("Please select at least one sport");
      return;
    }

    // Find user by email
    const foundUser = allUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!foundUser) {
      setSearchError("No user found with this email. The user must be registered first.");
      return;
    }

    if (foundUser.organization_id && foundUser.organization_id !== user?.organization_id) {
      setSearchError("This user belongs to another organization.");
      return;
    }

    if (foundUser.is_scorekeeper && foundUser.organization_id === user?.organization_id) {
      setSearchError("This user is already a scorekeeper for your organization.");
      return;
    }

    assignScorekeeperMutation.mutate({ userId: foundUser.id, sports: selectedSports });
  };

  const handleSportToggle = (sport) => {
    if (selectedSports.includes(sport)) {
      setSelectedSports(selectedSports.filter(s => s !== sport));
    } else {
      setSelectedSports([...selectedSports, sport]);
    }
  };

  const handleRemoveClick = (scorekeeper) => {
    setRemovingScorekeeper(scorekeeper);
  };

  const handleRemoveConfirm = () => {
    if (removingScorekeeper) {
      removeScorekeeperMutation.mutate(removingScorekeeper.id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-900 dark:via-blue-950/10 dark:to-gray-900">
      {/* HEADER WITH HAMBURGER MENU */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Toggle Navigation Menu"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            ) : (
              <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            )}
          </button>
          <div className="flex items-center gap-3">
            {organization?.logo_url ? (
              <Avatar className="w-10 h-10 border-2 border-orange-500 shadow-lg">
                <AvatarImage src={organization.logo_url} />
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black">
                  {organization.name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                </svg>
              </div>
            )}
            <div className="hidden sm:block">
              <span className="font-bold text-xl text-gray-900 dark:text-white tracking-tight">
                {organization?.name || 'ALAB'}
              </span>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 -mt-1 font-medium tracking-wide">
                {organization ? 'ORGANIZATION' : 'SPORTS LEAGUE'}
              </p>
            </div>
            {isSuperAdmin && (
              <span className="hidden lg:inline-block ml-2 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2.5 py-1 rounded-full font-semibold shadow-sm">
                SUPER ADMIN
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={toggleDarkMode}
            variant="ghost"
            size="icon"
            className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>

          <div className="hidden lg:flex items-center gap-3 text-sm">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-sm font-bold text-white">
                {user?.full_name?.[0] || 'U'}
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">{user?.full_name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Administrator</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold shadow-md"
            size="sm"
          >
            <LogOut className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* SIDEBAR */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
          transform transition-transform duration-200 ease-in-out mt-16 shadow-2xl
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="h-full flex flex-col pt-6 pb-6">
            {organization && (
              <div className="px-4 mb-6">
                <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 rounded-xl border-2 border-orange-200 dark:border-orange-800">
                  <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-700 shadow-lg">
                    <AvatarImage src={organization.logo_url} />
                    <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white font-black text-sm">
                      {organization.name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-gray-900 dark:text-white truncate">{organization.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Your Organization</p>
                  </div>
                </div>
              </div>
            )}

            <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
              {navigationItems.map((item) => {
                const isActive = window.location.pathname === item.url;
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.title}
                  </Link>
                );
              })}
            </nav>

            <div className="px-4 pt-4 border-t border-gray-200 dark:border-gray-700 mt-auto bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-sm font-bold text-white">
                    {user?.full_name?.[0] || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.full_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-700 dark:hover:text-red-300 hover:border-red-300 dark:hover:border-red-700 font-semibold"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-gray-900/50 dark:bg-black/70 z-30 backdrop-blur-sm mt-16"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        {/* MAIN CONTENT */}
        <main className="flex-1 min-w-0">
          <div className="p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
              {/* Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-4xl font-black text-gray-900 dark:text-white">Scorekeepers</h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Manage users who can score games</p>
                </div>
                <Button 
                  onClick={() => setShowForm(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-xl"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Scorekeeper
                </Button>
              </div>

              {/* Scorekeepers Grid */}
              {scorekeepers.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {scorekeepers.map((scorekeeper) => (
                    <Card key={scorekeeper.id} className="relative overflow-hidden border-2 border-blue-100 dark:border-blue-900 bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-950/30 shadow-lg hover:shadow-2xl transition-all">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-3xl"></div>
                      <CardHeader className="relative z-10">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3 flex-1">
                            <Avatar className="w-14 h-14 border-4 border-white dark:border-gray-700 shadow-xl">
                              <AvatarImage src={scorekeeper.photo_url} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-black text-lg">
                                {scorekeeper.full_name?.substring(0, 2).toUpperCase() || 'SK'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-lg font-black text-gray-900 dark:text-white truncate">
                                {scorekeeper.full_name}
                              </CardTitle>
                              <Badge className="mt-2 bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 font-bold">
                                Scorekeeper
                              </Badge>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleRemoveClick(scorekeeper)}
                            className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 relative z-10">
                        <div className="flex items-center gap-2 bg-white/60 dark:bg-gray-900/60 rounded-xl p-3">
                          <Mail className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium truncate">
                            {scorekeeper.email}
                          </span>
                        </div>
                        
                        {scorekeeper.scorekeeper_sports && scorekeeper.scorekeeper_sports.length > 0 && (
                          <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-3">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mb-2">Can Score:</p>
                            <div className="flex gap-2 flex-wrap">
                              {scorekeeper.scorekeeper_sports.map(sport => (
                                <Badge 
                                  key={sport}
                                  className={`${
                                    sport === 'basketball'
                                      ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800'
                                      : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                                  } font-bold`}
                                >
                                  {sport === 'basketball' ? '🏀' : '🏐'} {sport.charAt(0).toUpperCase() + sport.slice(1)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-200 to-blue-300 dark:from-blue-800 dark:to-blue-700 rounded-full flex items-center justify-center mx-auto mb-6">
                    <UserCheck className="w-12 h-12 text-blue-600 dark:text-blue-300" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-xl font-bold">No scorekeepers yet</p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Add users who can score games for your organization</p>
                </div>
              )}

              {/* Add Scorekeeper Dialog */}
              <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-gray-900 dark:text-white">
                      Add Scorekeeper
                    </DialogTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Enter the email of a registered user to assign as scorekeeper
                    </p>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="email" className="font-bold text-gray-700 dark:text-gray-300">User Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setSearchError("");
                        }}
                        placeholder="user@example.com"
                        required
                        className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                      />
                      {searchError && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-2 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" />
                          {searchError}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className="font-bold text-gray-700 dark:text-gray-300 mb-3 block">Sports Access</Label>
                      <div className="space-y-2">
                        <div 
                          onClick={() => handleSportToggle('basketball')}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedSports.includes('basketball')
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
                              : 'border-gray-300 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-700'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            selectedSports.includes('basketball')
                              ? 'border-orange-500 bg-orange-500'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {selectedSports.includes('basketball') && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 dark:text-white">🏀 Basketball</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Can score basketball games</p>
                          </div>
                        </div>

                        <div 
                          onClick={() => handleSportToggle('volleyball')}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedSports.includes('volleyball')
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                              : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            selectedSports.includes('volleyball')
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {selectedSports.includes('volleyball') && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 dark:text-white">🏐 Volleyball</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Can score volleyball games</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm">
                      <p className="text-blue-800 dark:text-blue-300 font-semibold">
                        💡 The user must already be registered in the system
                      </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setShowForm(false);
                          setEmail("");
                          setSelectedSports([]);
                          setSearchError("");
                        }}
                        className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        disabled={assignScorekeeperMutation.isLoading}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold"
                      >
                        {assignScorekeeperMutation.isLoading ? 'Assigning...' : 'Assign Scorekeeper'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Remove Confirmation Dialog */}
              <AlertDialog open={!!removingScorekeeper} onOpenChange={() => setRemovingScorekeeper(null)}>
                <AlertDialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
                  <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-red-100 dark:bg-red-950/30 rounded-xl flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                      </div>
                      <AlertDialogTitle className="text-xl font-black text-gray-900 dark:text-white">
                        Remove Scorekeeper?
                      </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-gray-600 dark:text-gray-400 font-medium">
                      Are you sure you want to remove <span className="font-bold text-gray-900 dark:text-white">{removingScorekeeper?.full_name}</span> as a scorekeeper?
                      <br /><br />
                      They will no longer be able to score games for your organization.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-2 border-gray-300 dark:border-gray-600 font-bold">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRemoveConfirm}
                      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold"
                    >
                      Remove Scorekeeper
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
