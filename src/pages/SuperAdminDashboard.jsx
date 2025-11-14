import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Trophy, Calendar, TrendingUp, BarChart3, Zap, Loader2 } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { createPageUrl } from "@/utils";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";

export default function SuperAdminDashboard() {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState('all');
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  useEffect(() => {
    loadUser();
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    
    if (currentUser?.role !== 'admin' || !currentUser?.is_super_admin) {
      window.location.href = createPageUrl("Dashboard");
    }
  };

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

  const handleLogout = () => {
    base44.auth.logout(createPageUrl("PublicLanding"));
  };

  const { data: allOrganizations = [] } = useQuery({
    queryKey: ['all-organizations'],
    queryFn: () => base44.entities.Organization.list(),
    enabled: !!user,
  });

  const { data: allTeams = [] } = useQuery({
    queryKey: ['all-teams'],
    queryFn: () => base44.entities.Team.list(),
    enabled: !!user,
  });

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['all-players'],
    queryFn: () => base44.entities.Player.list(),
    enabled: !!user,
  });

  const { data: allGames = [] } = useQuery({
    queryKey: ['all-games'],
    queryFn: () => base44.entities.Game.list('-game_date'),
    enabled: !!user,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
  });

  const activeOrganizations = allOrganizations.filter(org => org.status === 'active');
  
  const filteredData = selectedOrgId === 'all' ? {
    teams: allTeams,
    players: allPlayers,
    games: allGames,
  } : {
    teams: allTeams.filter(t => t.organization_id === selectedOrgId),
    players: allPlayers.filter(p => {
      const team = allTeams.find(t => t.id === p.team_id);
      return team?.organization_id === selectedOrgId;
    }),
    games: allGames.filter(g => g.organization_id === selectedOrgId),
  };

  const selectedOrg = selectedOrgId !== 'all' ? allOrganizations.find(o => o.id === selectedOrgId) : null;

  const generateAIAnalysis = async () => {
    setLoadingAnalysis(true);
    try {
      const prompt = `You are analyzing a sports league management platform. Here are the statistics:

${selectedOrgId === 'all' ? 'PLATFORM-WIDE STATISTICS:' : `ORGANIZATION: ${selectedOrg?.name}`}

Total Organizations: ${selectedOrgId === 'all' ? activeOrganizations.length : '1 (selected)'}
Total Teams: ${filteredData.teams.length}
- Basketball Teams: ${filteredData.teams.filter(t => t.sport === 'basketball').length}
- Volleyball Teams: ${filteredData.teams.filter(t => t.sport === 'volleyball').length}

Total Players: ${filteredData.players.length}
Total Games: ${filteredData.games.length}
- Completed Games: ${filteredData.games.filter(g => g.status === 'completed').length}
- Scheduled Games: ${filteredData.games.filter(g => g.status === 'scheduled').length}
- In Progress Games: ${filteredData.games.filter(g => g.status === 'in_progress').length}

${selectedOrgId === 'all' ? `Total Platform Users: ${allUsers.length}` : ''}

Please provide:
1. A brief executive summary (2-3 sentences)
2. Key insights and trends you notice
3. Recommendations for improvement or growth opportunities
4. Any concerning patterns or areas that need attention

Keep the response concise and actionable for a super administrator.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false,
      });

      setAiAnalysis(result);
    } catch (error) {
      console.error("AI Analysis error:", error);
      setAiAnalysis("Unable to generate analysis at this time.");
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const sportDistribution = [
    { name: 'Basketball', value: filteredData.teams.filter(t => t.sport === 'basketball').length, color: '#f97316' },
    { name: 'Volleyball', value: filteredData.teams.filter(t => t.sport === 'volleyball').length, color: '#3b82f6' },
  ];

  const gameStatusData = [
    { name: 'Completed', value: filteredData.games.filter(g => g.status === 'completed').length },
    { name: 'Scheduled', value: filteredData.games.filter(g => g.status === 'scheduled').length },
    { name: 'In Progress', value: filteredData.games.filter(g => g.status === 'in_progress').length },
  ];

  const organizationStats = allOrganizations.map(org => ({
    name: org.name,
    teams: allTeams.filter(t => t.organization_id === org.id).length,
    players: allPlayers.filter(p => {
      const team = allTeams.find(t => t.id === p.team_id);
      return team?.organization_id === org.id;
    }).length,
    games: allGames.filter(g => g.organization_id === org.id).length,
  })).sort((a, b) => b.teams - a.teams).slice(0, 10);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-900 dark:via-blue-950/10 dark:to-gray-900">
      <AdminHeader 
        user={user}
        organization={null}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        handleLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="flex">
        <AdminSidebar 
          user={user}
          organization={null}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          handleLogout={handleLogout}
        />

        <main className="flex-1 min-w-0">
          <div className="p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
              {/* Header */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-xl">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white">Super Admin Dashboard</h1>
                    <p className="text-gray-600 dark:text-gray-400 font-medium">Platform-wide analytics and insights</p>
                  </div>
                </div>
              </div>

              {/* Organization Selector */}
              <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl font-black text-gray-900 dark:text-white">
                    <Building2 className="w-5 h-5" />
                    Select Organization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <select
                    value={selectedOrgId}
                    onChange={(e) => {
                      setSelectedOrgId(e.target.value);
                      setAiAnalysis(null);
                    }}
                    className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-4 py-3 font-bold shadow-sm hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
                  >
                    <option value="all">🌐 All Organizations (Platform-wide)</option>
                    {activeOrganizations.map(org => (
                      <option key={org.id} value={org.id}>
                        🏢 {org.name}
                      </option>
                    ))}
                  </select>
                  {selectedOrg && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                        📧 {selectedOrg.contact_email}
                      </p>
                      {selectedOrg.contact_phone && (
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                          📱 {selectedOrg.contact_phone}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Key Metrics */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-xl text-white">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold opacity-90">
                      <Building2 className="w-4 h-4" />
                      Organizations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-black">{selectedOrgId === 'all' ? activeOrganizations.length : '1'}</div>
                    <p className="text-xs opacity-80 mt-1">
                      {selectedOrgId === 'all' ? 'Active organizations' : 'Selected'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0 shadow-xl text-white">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold opacity-90">
                      <Users className="w-4 h-4" />
                      Teams
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-black">{filteredData.teams.length}</div>
                    <p className="text-xs opacity-80 mt-1">
                      🏀 {filteredData.teams.filter(t => t.sport === 'basketball').length} Basketball • 
                      🏐 {filteredData.teams.filter(t => t.sport === 'volleyball').length} Volleyball
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0 shadow-xl text-white">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold opacity-90">
                      <Trophy className="w-4 h-4" />
                      Players
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-black">{filteredData.players.length}</div>
                    <p className="text-xs opacity-80 mt-1">Registered players</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0 shadow-xl text-white">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold opacity-90">
                      <Calendar className="w-4 h-4" />
                      Games
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-black">{filteredData.games.length}</div>
                    <p className="text-xs opacity-80 mt-1">
                      ✅ {filteredData.games.filter(g => g.status === 'completed').length} Completed
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* AI Analysis */}
              <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-2 border-indigo-200 dark:border-indigo-800 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl font-black text-gray-900 dark:text-white">
                    <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    AI Performance Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!aiAnalysis && !loadingAnalysis && (
                    <Button
                      onClick={generateAIAnalysis}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold shadow-lg"
                    >
                      <Zap className="w-5 h-5 mr-2" />
                      Generate AI Analysis
                    </Button>
                  )}

                  {loadingAnalysis && (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                      <span className="ml-3 text-gray-600 dark:text-gray-400 font-semibold">
                        Analyzing data...
                      </span>
                    </div>
                  )}

                  {aiAnalysis && !loadingAnalysis && (
                    <div className="space-y-4">
                      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border-2 border-indigo-200 dark:border-indigo-800">
                        <div className="prose dark:prose-invert max-w-none">
                          <div className="text-gray-900 dark:text-white whitespace-pre-wrap font-medium">
                            {aiAnalysis}
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={generateAIAnalysis}
                        variant="outline"
                        className="w-full border-2 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 font-bold"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Regenerate Analysis
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Charts Row 1 */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Sport Distribution */}
                <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl font-black text-gray-900 dark:text-white">
                      Sport Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={sportDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {sportDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Game Status */}
                <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl font-black text-gray-900 dark:text-white">
                      Game Status Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={gameStatusData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Organization Comparison (only if viewing all) */}
              {selectedOrgId === 'all' && organizationStats.length > 0 && (
                <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl font-black text-gray-900 dark:text-white">
                      Top Organizations by Teams
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={organizationStats} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={150} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="teams" fill="#3b82f6" name="Teams" />
                        <Bar dataKey="players" fill="#8b5cf6" name="Players" />
                        <Bar dataKey="games" fill="#10b981" name="Games" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Organizations List */}
              {selectedOrgId === 'all' && (
                <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl font-black text-gray-900 dark:text-white">
                      All Organizations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {activeOrganizations.map(org => {
                        const orgTeams = allTeams.filter(t => t.organization_id === org.id);
                        const orgPlayers = allPlayers.filter(p => {
                          const team = allTeams.find(t => t.id === p.team_id);
                          return team?.organization_id === org.id;
                        });
                        const orgGames = allGames.filter(g => g.organization_id === org.id);

                        return (
                          <Card
                            key={org.id}
                            className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:shadow-xl transition-all cursor-pointer"
                            onClick={() => setSelectedOrgId(org.id)}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h3 className="font-black text-lg text-gray-900 dark:text-white">
                                    {org.name}
                                  </h3>
                                  <Badge className="mt-2 bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800 font-bold">
                                    Active
                                  </Badge>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                                  <div className="text-2xl font-black text-orange-600 dark:text-orange-400">
                                    {orgTeams.length}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                                    Teams
                                  </div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                                  <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                                    {orgPlayers.length}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                                    Players
                                  </div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                                  <div className="text-2xl font-black text-green-600 dark:text-green-400">
                                    {orgGames.length}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                                    Games
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}