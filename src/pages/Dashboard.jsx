
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Trophy, Users, Calendar, Building2, Shield, ArrowRight, TrendingUp, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AIInsights from "@/components/AIInsights";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsSuperAdmin(currentUser?.role === 'admin' && currentUser?.is_super_admin === true);
    } catch (error) {
      base44.auth.redirectToLogin(createPageUrl("Dashboard"));
    }
  };

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
    enabled: isSuperAdmin,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams', user?.organization_id],
    queryFn: () => isSuperAdmin 
      ? base44.entities.Team.list() 
      : base44.entities.Team.filter({ organization_id: user?.organization_id }),
    enabled: !!user,
  });

  const { data: players = [] } = useQuery({
    queryKey: ['players', user?.organization_id],
    queryFn: async () => {
      if (isSuperAdmin) {
        return base44.entities.Player.list();
      }
      const orgTeams = await base44.entities.Team.filter({ organization_id: user?.organization_id });
      const teamIds = orgTeams.map(t => t.id);
      if (teamIds.length === 0) return [];
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p => teamIds.includes(p.team_id));
    },
    enabled: !!user,
  });

  const { data: games = [] } = useQuery({
    queryKey: ['games', user?.organization_id],
    queryFn: () => isSuperAdmin 
      ? base44.entities.Game.list('-game_date') 
      : base44.entities.Game.filter({ organization_id: user?.organization_id }, '-game_date'),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const upcomingGames = games.filter(g => g.status === 'scheduled').slice(0, 5);
  const recentGames = games.filter(g => g.status === 'completed').slice(0, 5);
  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-900 dark:via-blue-950/20 dark:to-gray-900">
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Super Admin Banner */}
          {isAdmin && !isSuperAdmin && (
            <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-700 dark:via-indigo-700 dark:to-purple-700 border-2 border-blue-400 dark:border-blue-500 rounded-2xl p-6 shadow-xl">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAv/MjAwMC9zdmciPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PHBhdGggZD0iTTM2IDE4YzMuMzE0IDAgNiAyLjY4NiA2IDZzLTIuNjg2IDYtNiA2LTYtMi42ODYtNi02IDIuNjg2LTYgNi02eiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjAuNSIgb3BhY2l0eT0iMC4xIi8+PC9nPg==')] opacity-30"></div>
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white mb-2">
                      Upgrade to Super Admin
                    </h3>
                    <p className="text-blue-100 text-sm max-w-2xl">
                      Get full access to manage all organizations, teams, and system-wide operations.
                    </p>
                  </div>
                </div>
                <Link to={createPageUrl("SuperAdminSetup")}>
                  <Button className="bg-white text-blue-600 hover:bg-blue-50 font-bold shadow-lg flex-shrink-0">
                    Setup Now
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              {isSuperAdmin && (
                <div className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-black rounded-full shadow-lg">
                  SUPER ADMIN
                </div>
              )}
            </div>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white bg-clip-text">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">
              {isSuperAdmin ? 'System-wide overview' : 'Overview of your organization'}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {isSuperAdmin && (
              <Card className="relative overflow-hidden border-2 border-purple-100 dark:border-purple-900 bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-950/30 shadow-lg hover:shadow-xl transition-all group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-2xl"></div>
                <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                  <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400">Organizations</CardTitle>
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-4xl font-black text-gray-900 dark:text-white mb-1">{organizations.length}</div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Active organizations</p>
                </CardContent>
              </Card>
            )}
            
            <Card className="relative overflow-hidden border-2 border-blue-100 dark:border-blue-900 bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-950/30 shadow-lg hover:shadow-xl transition-all group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-2xl"></div>
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400">Teams</CardTitle>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="w-5 h-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-4xl font-black text-gray-900 dark:text-white mb-1">{teams.length}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                  {teams.filter(t => t.sport === 'basketball').length} Basketball · {teams.filter(t => t.sport === 'volleyball').length} Volleyball
                </p>
              </CardContent>
            </Card>
            
            <Card className="relative overflow-hidden border-2 border-orange-100 dark:border-orange-900 bg-gradient-to-br from-white to-orange-50 dark:from-gray-800 dark:to-orange-950/30 shadow-lg hover:shadow-xl transition-all group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/20 to-transparent rounded-full blur-2xl"></div>
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400">Players</CardTitle>
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-4xl font-black text-gray-900 dark:text-white mb-1">{players.length}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Total registered</p>
              </CardContent>
            </Card>
            
            <Card className="relative overflow-hidden border-2 border-green-100 dark:border-green-900 bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-950/30 shadow-lg hover:shadow-xl transition-all group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/20 to-transparent rounded-full blur-2xl"></div>
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-bold text-gray-600 dark:text-gray-400">Games</CardTitle>
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-4xl font-black text-gray-900 dark:text-white mb-1">{games.length}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                  {games.filter(g => g.status === 'scheduled').length} upcoming
                </p>
              </CardContent>
            </Card>
          </div>

          {/* AI Insights Section - NEW */}
          {(teams.length > 0 || games.length > 0) && (
            <AIInsights
              teams={teams}
              players={players}
              games={games}
              organizationName={isSuperAdmin ? "ALAB Sports System" : user?.organization_id}
            />
          )}

          {/* Games Grid */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Upcoming Games */}
            <Card className="border-2 border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl">
              <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/30 dark:to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Upcoming Games</CardTitle>
                  </div>
                  <Link to={createPageUrl(isSuperAdmin ? "AllGames" : "Games")} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold flex items-center gap-1">
                    View all
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {upcomingGames.length === 0 ? (
                  <div className="text-center py-16">
                    <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No upcoming games</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingGames.map((game) => (
                      <div key={game.id} className="relative overflow-hidden border-2 border-gray-100 dark:border-gray-700 rounded-xl p-4 hover:shadow-lg transition-all bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 group">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{new Date(game.game_date).toLocaleDateString()}</span>
                          <Badge className={`font-bold ${
                            game.sport === 'basketball' 
                              ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800' 
                              : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                          }`}>
                            {game.sport}
                          </Badge>
                        </div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          Home Team vs Away Team
                        </div>
                        {game.location && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">📍 {game.location}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Results */}
            <Card className="border-2 border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl">
              <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700 bg-gradient-to-r from-green-50 to-transparent dark:from-green-950/30 dark:to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Recent Results</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {recentGames.length === 0 ? (
                  <div className="text-center py-16">
                    <Trophy className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No completed games</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentGames.map((game) => (
                      <div key={game.id} className="relative overflow-hidden border-2 border-gray-100 dark:border-gray-700 rounded-xl p-5 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 hover:shadow-lg transition-all">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{new Date(game.game_date).toLocaleDateString()}</span>
                          <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800 font-bold">
                            FINAL
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="text-sm font-bold text-gray-900 dark:text-white mb-1">Home Team</div>
                            <div className="text-3xl font-black text-blue-600 dark:text-blue-400">{game.home_score}</div>
                          </div>
                          <div className="text-gray-300 dark:text-gray-600 text-2xl font-black px-4">-</div>
                          <div className="flex-1 text-right">
                            <div className="text-sm font-bold text-gray-900 dark:text-white mb-1">Away Team</div>
                            <div className="text-3xl font-black text-gray-900 dark:text-white">{game.away_score}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
