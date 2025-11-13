
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Calendar, PlayCircle, CheckCircle, Clock, MapPin, Menu, X, LogOut, Sun, Moon, Home, BarChart3, Trophy, Users, Shield, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"; // Added Avatar imports

export default function Games() {
  const [showForm, setShowForm] = useState(false);
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null); // New state
  const [sidebarOpen, setSidebarOpen] = useState(false); // New state
  const [darkMode, setDarkMode] = useState(false); // New state
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

  const { data: teams = [] } = useQuery({
    queryKey: ['teams', user?.organization_id],
    queryFn: () => base44.entities.Team.filter({ organization_id: user?.organization_id }),
    enabled: !!user?.organization_id,
  });

  const { data: games = [] } = useQuery({
    queryKey: ['games', user?.organization_id],
    queryFn: () => base44.entities.Game.filter({ organization_id: user?.organization_id }, '-game_date'),
    enabled: !!user?.organization_id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Game.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['games']);
      setShowForm(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      organization_id: user?.organization_id,
      home_team_id: formData.get('home_team_id'),
      away_team_id: formData.get('away_team_id'),
      sport: formData.get('sport'),
      game_type: formData.get('game_type'),
      game_date: new Date(formData.get('game_date')).toISOString(),
      location: formData.get('location'),
      penalty_limit_per_quarter: parseInt(formData.get('penalty_limit_per_quarter')),
      player_foul_limit: parseInt(formData.get('player_foul_limit')),
      status: 'scheduled',
    };

    createMutation.mutate(data);
  };

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Unknown';
  };

  const scheduledGames = games.filter(g => g.status === 'scheduled');
  const inProgressGames = games.filter(g => g.status === 'in_progress');
  const completedGames = games.filter(g => g.status === 'completed');

  const GameCard = ({ game }) => {
    const sportColor = game.sport === 'basketball' ? 'orange' : 'blue';
    const statusColor = 
      game.status === 'scheduled' ? 'blue' :
      game.status === 'in_progress' ? 'yellow' : 'green';
    
    return (
      <Card className={`relative overflow-hidden border-2 border-${sportColor}-100 dark:border-${sportColor}-900 bg-gradient-to-br from-white to-${sportColor}-50 dark:from-gray-800 dark:to-${sportColor}-950/30 shadow-lg hover:shadow-2xl transition-all group`}>
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-${sportColor}-500/20 to-transparent rounded-full blur-3xl`}></div>
        
        <CardHeader className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <Badge className={`bg-${statusColor}-100 text-${statusColor}-700 border-${statusColor}-200 dark:bg-${statusColor}-950 dark:text-${statusColor}-300 dark:border-${statusColor}-800 font-bold mb-2`}>
                {game.status === 'scheduled' && <Clock className="w-3 h-3 mr-1" />}
                {game.status === 'in_progress' && <PlayCircle className="w-3 h-3 mr-1" />}
                {game.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                {game.status ? game.status.replace('_', ' ').toUpperCase() : 'SCHEDULED'}
              </Badge>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(game.game_date).toLocaleDateString()}
              </p>
            </div>
            <Badge variant="outline" className={`text-${sportColor}-600 dark:text-${sportColor}-400 border-${sportColor}-600 dark:border-${sportColor}-400 font-black`}>
              {game.sport}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 relative z-10">
          <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <p className="text-gray-900 dark:text-white font-black">{getTeamName(game.home_team_id)}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold">HOME</p>
              </div>
              {game.status === 'completed' ? (
                <>
                  <div className={`text-4xl font-black text-${sportColor}-600 dark:text-${sportColor}-400`}>{game.home_score}</div>
                  <div className="text-gray-400 dark:text-gray-600 px-4 text-2xl font-black">-</div>
                  <div className="text-4xl font-black text-gray-900 dark:text-white">{game.away_score}</div>
                </>
              ) : (
                <div className="text-gray-400 dark:text-gray-600 text-xl font-bold">vs</div>
              )}
              <div className="flex-1 text-right">
                <p className="text-gray-900 dark:text-white font-black">{getTeamName(game.away_team_id)}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold">AWAY</p>
              </div>
            </div>
          </div>
          
          {game.location && (
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {game.location}
            </p>
          )}
          
          {game.status === 'scheduled' && (
            <Link to={createPageUrl(game.sport === 'volleyball' ? 'LiveScoringVolleyball' : 'LiveScoring') + `?game_id=${game.id}`}>
              <Button className={`w-full bg-gradient-to-r from-${sportColor}-600 to-${sportColor}-700 hover:from-${sportColor}-700 hover:to-${sportColor}-800 text-white font-bold shadow-lg`}>
                <PlayCircle className="w-4 h-4 mr-2" />
                Start Game
              </Button>
            </Link>
          )}
          {game.status === 'in_progress' && (
            <Link to={createPageUrl(game.sport === 'volleyball' ? 'LiveScoringVolleyball' : 'LiveScoring') + `?game_id=${game.id}`}>
              <Button className={`w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white font-bold shadow-lg`}>
                Continue Scoring
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/30 to-gray-50 dark:from-gray-900 dark:via-green-950/10 dark:to-gray-900">
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
                  <h1 className="text-4xl font-black text-gray-900 dark:text-white">Games</h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Schedule and manage games</p>
                </div>
                <Button 
                  onClick={() => setShowForm(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-xl"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Schedule Game
                </Button>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="scheduled" className="space-y-6">
                <TabsList className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 p-1 rounded-xl shadow-lg">
                  <TabsTrigger value="scheduled" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white dark:text-gray-300 font-bold rounded-lg">
                    Scheduled ({scheduledGames.length})
                  </TabsTrigger>
                  <TabsTrigger value="in_progress" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-600 data-[state=active]:to-yellow-700 data-[state=active]:text-white dark:text-gray-300 font-bold rounded-lg">
                    In Progress ({inProgressGames.length})
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-green-700 data-[state=active]:text-white dark:text-gray-300 font-bold rounded-lg">
                    Completed ({completedGames.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="scheduled" className="space-y-4">
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {scheduledGames.map(game => <GameCard key={game.id} game={game} />)}
                  </div>
                  {scheduledGames.length === 0 && (
                    <div className="text-center py-20">
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-200 to-blue-300 dark:from-blue-800 dark:to-blue-700 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Clock className="w-12 h-12 text-blue-600 dark:text-blue-300" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-xl font-bold">No scheduled games</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="in_progress" className="space-y-4">
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {inProgressGames.map(game => <GameCard key={game.id} game={game} />)}
                  </div>
                  {inProgressGames.length === 0 && (
                    <div className="text-center py-20">
                      <div className="w-24 h-24 bg-gradient-to-br from-yellow-200 to-yellow-300 dark:from-yellow-800 dark:to-yellow-700 rounded-full flex items-center justify-center mx-auto mb-6">
                        <PlayCircle className="w-12 h-12 text-yellow-600 dark:text-yellow-300" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-xl font-bold">No games in progress</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="completed" className="space-y-4">
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {completedGames.map(game => <GameCard key={game.id} game={game} />)}
                  </div>
                  {completedGames.length === 0 && (
                    <div className="text-center py-20">
                      <div className="w-24 h-24 bg-gradient-to-br from-green-200 to-green-300 dark:from-green-800 dark:to-green-700 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-300" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-xl font-bold">No completed games</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Dialog */}
              <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 max-w-xl">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-gray-900 dark:text-white">Schedule New Game</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="sport" className="font-bold text-gray-700 dark:text-gray-300">Sport</Label>
                      <select
                        id="sport"
                        name="sport"
                        required
                        className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-3 py-2 font-medium"
                      >
                        <option value="">Select sport</option>
                        <option value="basketball">Basketball</option>
                        <option value="volleyball">Volleyball</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="game_type" className="font-bold text-gray-700 dark:text-gray-300">Game Type</Label>
                      <select
                        id="game_type"
                        name="game_type"
                        required
                        className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-3 py-2 font-medium"
                      >
                        <option value="regular_season">Regular Season</option>
                        <option value="playoffs">Playoffs</option>
                        <option value="semi_finals">Semi Finals</option>
                        <option value="finals">Finals</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="penalty_limit_per_quarter" className="font-bold text-gray-700 dark:text-gray-300">Team Foul Penalty Limit</Label>
                        <Input
                          id="penalty_limit_per_quarter"
                          name="penalty_limit_per_quarter"
                          type="number"
                          defaultValue="5"
                          min="1"
                          max="10"
                          required
                          className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Fouls per quarter before penalty</p>
                      </div>
                      <div>
                        <Label htmlFor="player_foul_limit" className="font-bold text-gray-700 dark:text-gray-300">Player Foul Limit</Label>
                        <Input
                          id="player_foul_limit"
                          name="player_foul_limit"
                          type="number"
                          defaultValue="5"
                          min="1"
                          max="10"
                          required
                          className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Personal fouls before ejection</p>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="home_team_id" className="font-bold text-gray-700 dark:text-gray-300">Home Team</Label>
                      <select
                        id="home_team_id"
                        name="home_team_id"
                        required
                        className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-3 py-2 font-medium"
                      >
                        <option value="">Select team</option>
                        {teams.map(team => (
                          <option key={team.id} value={team.id}>{team.name} ({team.sport})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="away_team_id" className="font-bold text-gray-700 dark:text-gray-300">Away Team</Label>
                      <select
                        id="away_team_id"
                        name="away_team_id"
                        required
                        className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-3 py-2 font-medium"
                      >
                        <option value="">Select team</option>
                        {teams.map(team => (
                          <option key={team.id} value={team.id}>{team.name} ({team.sport})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="game_date" className="font-bold text-gray-700 dark:text-gray-300">Game Date & Time</Label>
                      <Input
                        id="game_date"
                        name="game_date"
                        type="datetime-local"
                        required
                        className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <Label htmlFor="location" className="font-bold text-gray-700 dark:text-gray-300">Location</Label>
                      <Input
                        id="location"
                        name="location"
                        placeholder="e.g., Main Gym, Court 1"
                        className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold">
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold">
                        Schedule Game
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
