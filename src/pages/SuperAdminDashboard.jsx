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

  const { data: superAdminData } = useQuery({
    queryKey: ['super-admin-data'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getSuperAdminData', {});
      return response.data;
    },
    enabled: !!user,
  });

  const allOrganizations = superAdminData?.organizations || [];
  const allTeams = superAdminData?.teams || [];
  const allPlayers = superAdminData?.players || [];
  const allGames = superAdminData?.games || [];
  const allUsers = superAdminData?.users || [];

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
    { name: 'Basketball', value: filteredData.teams.filter(t => t.sport === 'basketball').length, color: 'hsl(var(--primary))' },
    { name: 'Volleyball', value: filteredData.teams.filter(t => t.sport === 'volleyball').length, color: 'hsl(var(--muted-foreground))' },
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
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
                  <div className="w-12 h-12 border border-border flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="font-heading text-3xl font-bold tracking-tight">Super Admin Dashboard</h1>
                    <p className="text-muted-foreground font-medium">Platform-wide analytics and insights</p>
                  </div>
                </div>
              </div>

              {/* Organization Selector */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl font-heading font-bold">
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
                    className="w-full bg-background border border-border text-foreground px-4 py-3 font-medium hover:border-foreground/20 transition-colors"
                  >
                    <option value="all">All Organizations (Platform-wide)</option>
                    {activeOrganizations.map(org => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                  {selectedOrg && (
                    <div className="mt-4 p-4 bg-muted border border-border">
                      <p className="text-sm font-medium text-foreground">
                        {selectedOrg.contact_email}
                      </p>
                      {selectedOrg.contact_phone && (
                        <p className="text-sm font-medium text-foreground">
                          {selectedOrg.contact_phone}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Key Metrics */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-heading font-bold text-muted-foreground">
                      <Building2 className="w-4 h-4" />
                      Organizations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-heading font-bold tabular-nums">{selectedOrgId === 'all' ? activeOrganizations.length : '1'}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedOrgId === 'all' ? 'Active organizations' : 'Selected'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-heading font-bold text-muted-foreground">
                      <Users className="w-4 h-4" />
                      Teams
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-heading font-bold tabular-nums">{filteredData.teams.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      BB {filteredData.teams.filter(t => t.sport === 'basketball').length} • VB {filteredData.teams.filter(t => t.sport === 'volleyball').length}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-heading font-bold text-muted-foreground">
                      <Trophy className="w-4 h-4" />
                      Players
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-heading font-bold tabular-nums">{filteredData.players.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">Registered players</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-heading font-bold text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      Games
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-heading font-bold tabular-nums">{filteredData.games.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {filteredData.games.filter(g => g.status === 'completed').length} Completed
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* AI Analysis */}
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl font-heading font-bold">
                    <Zap className="w-5 h-5 text-primary" />
                    AI Performance Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!aiAnalysis && !loadingAnalysis && (
                    <Button
                      onClick={generateAIAnalysis}
                      className="w-full font-medium"
                    >
                      <Zap className="w-5 h-5 mr-2" />
                      Generate AI Analysis
                    </Button>
                  )}

                  {loadingAnalysis && (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <span className="ml-3 text-muted-foreground font-medium">
                        Analyzing data...
                      </span>
                    </div>
                  )}

                  {aiAnalysis && !loadingAnalysis && (
                    <div className="space-y-4">
                      <div className="bg-muted border border-border p-6">
                        <div className="prose dark:prose-invert max-w-none">
                          <div className="text-foreground whitespace-pre-wrap font-medium">
                            {aiAnalysis}
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={generateAIAnalysis}
                        variant="outline"
                        className="w-full font-medium"
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
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl font-heading font-bold">
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
                          fill="hsl(var(--primary))"
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
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl font-heading font-bold">
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
                        <Bar dataKey="value" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Organization Comparison (only if viewing all) */}
              {selectedOrgId === 'all' && organizationStats.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl font-heading font-bold">
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
                        <Bar dataKey="teams" fill="hsl(var(--primary))" name="Teams" />
                        <Bar dataKey="players" fill="hsl(var(--secondary-foreground))" name="Players" />
                        <Bar dataKey="games" fill="hsl(var(--muted-foreground))" name="Games" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Organizations List */}
              {selectedOrgId === 'all' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl font-heading font-bold">
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
                            className="hover:border-foreground/20 transition-colors cursor-pointer"
                            onClick={() => setSelectedOrgId(org.id)}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h3 className="font-heading font-bold text-lg text-foreground">
                                    {org.name}
                                  </h3>
                                  <Badge variant="outline" className="mt-2 border-primary text-primary font-medium">
                                    Active
                                  </Badge>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="bg-muted p-3">
                                  <div className="text-2xl font-heading font-bold text-foreground tabular-nums">
                                    {orgTeams.length}
                                  </div>
                                  <div className="text-xs text-muted-foreground font-medium">
                                    Teams
                                  </div>
                                </div>
                                <div className="bg-muted p-3">
                                  <div className="text-2xl font-heading font-bold text-foreground tabular-nums">
                                    {orgPlayers.length}
                                  </div>
                                  <div className="text-xs text-muted-foreground font-medium">
                                    Players
                                  </div>
                                </div>
                                <div className="bg-muted p-3">
                                  <div className="text-2xl font-heading font-bold text-foreground tabular-nums">
                                    {orgGames.length}
                                  </div>
                                  <div className="text-xs text-muted-foreground font-medium">
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