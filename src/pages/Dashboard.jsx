import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Trophy, Users, Calendar, Building2, Shield, ArrowRight, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

  const handleLogout = () => {
    base44.auth.logout(createPageUrl("Home"));
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const upcomingGames = games.filter(g => g.status === 'scheduled').slice(0, 5);
  const recentGames = games.filter(g => g.status === 'completed').slice(0, 5);
  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🔴 MODERN DARK LOGOUT BANNER - ALWAYS VISIBLE 🔴 */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white py-4 px-6 flex items-center justify-between sticky top-0 z-50 shadow-xl border-b border-gray-700">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">ALAB Sports Management</h1>
            <p className="text-xs text-gray-400">{user?.full_name} • {isSuperAdmin ? 'Super Admin' : 'Admin'}</p>
          </div>
        </div>
        <Button 
          onClick={handleLogout}
          className="bg-white text-gray-900 hover:bg-gray-100 font-bold text-base px-6 py-3 h-auto shadow-lg hover:shadow-xl transition-all"
        >
          <LogOut className="w-5 h-5 mr-2" />
          LOGOUT
        </Button>
      </div>

      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Super Admin Banner */}
          {isAdmin && !isSuperAdmin && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Upgrade to Super Admin
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Get full access to manage all organizations, teams, and system-wide operations.
                    </p>
                  </div>
                </div>
                <Link to={createPageUrl("SuperAdminSetup")}>
                  <Button className="bg-blue-600 hover:bg-blue-700 flex-shrink-0">
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
                <div className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                  Super Admin
                </div>
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              {isSuperAdmin ? 'System-wide overview' : 'Overview of your organization'}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {isSuperAdmin && (
              <Card className="border-gray-200 bg-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Organizations</CardTitle>
                  <Building2 className="w-4 h-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{organizations.length}</div>
                  <p className="text-xs text-gray-500 mt-1">Active organizations</p>
                </CardContent>
              </Card>
            )}
            
            <Card className="border-gray-200 bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Teams</CardTitle>
                <Users className="w-4 h-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{teams.length}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {teams.filter(t => t.sport === 'basketball').length} Basketball · {teams.filter(t => t.sport === 'volleyball').length} Volleyball
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-gray-200 bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Players</CardTitle>
                <Trophy className="w-4 h-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{players.length}</div>
                <p className="text-xs text-gray-500 mt-1">Total registered</p>
              </CardContent>
            </Card>
            
            <Card className="border-gray-200 bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Games</CardTitle>
                <Calendar className="w-4 h-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{games.length}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {games.filter(g => g.status === 'scheduled').length} upcoming
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Games Grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Upcoming Games */}
            <Card className="border-gray-200 bg-white">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-gray-900">Upcoming Games</CardTitle>
                <Link to={createPageUrl(isSuperAdmin ? "AllGames" : "Games")} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View all
                </Link>
              </CardHeader>
              <CardContent>
                {upcomingGames.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No upcoming games</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingGames.map((game) => (
                      <div key={game.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-500">{new Date(game.game_date).toLocaleDateString()}</span>
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium">
                            {game.sport}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          Home Team vs Away Team
                        </div>
                        {game.location && (
                          <p className="text-xs text-gray-500 mt-1">{game.location}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Results */}
            <Card className="border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="text-gray-900">Recent Results</CardTitle>
              </CardHeader>
              <CardContent>
                {recentGames.length === 0 ? (
                  <div className="text-center py-12">
                    <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No completed games</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentGames.map((game) => (
                      <div key={game.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs text-gray-500">{new Date(game.game_date).toLocaleDateString()}</span>
                          <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded font-medium">
                            Completed
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">Home Team</div>
                            <div className="text-2xl font-bold text-gray-900 mt-1">{game.home_score}</div>
                          </div>
                          <div className="text-gray-400 text-lg">-</div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">Away Team</div>
                            <div className="text-2xl font-bold text-gray-900 mt-1">{game.away_score}</div>
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