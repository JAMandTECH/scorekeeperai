import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Trophy, Users, Calendar, TrendingUp, Building2, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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
      setIsSuperAdmin(currentUser?.role === 'admin' && currentUser?.email?.includes('superadmin'));
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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  const upcomingGames = games.filter(g => g.status === 'scheduled').slice(0, 5);
  const recentGames = games.filter(g => g.status === 'completed').slice(0, 5);

  return (
    <div className="p-4 md:p-8 bg-gray-950 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            {isSuperAdmin && <Shield className="w-8 h-8 text-yellow-400" />}
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              {isSuperAdmin ? 'Super Admin Dashboard' : 'Dashboard'}
            </h1>
          </div>
          <p className="text-gray-400">
            {isSuperAdmin ? 'Manage all organizations and system-wide operations' : 'Overview of your sports organization'}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {isSuperAdmin && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Organizations</CardTitle>
                <Building2 className="w-4 h-4 text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{organizations.length}</div>
                <p className="text-xs text-gray-500 mt-1">Active organizations</p>
              </CardContent>
            </Card>
          )}
          
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Teams</CardTitle>
              <Users className="w-4 h-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{teams.length}</div>
              <p className="text-xs text-gray-500 mt-1">
                {teams.filter(t => t.sport === 'basketball').length} Basketball, {teams.filter(t => t.sport === 'volleyball').length} Volleyball
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Players</CardTitle>
              <Trophy className="w-4 h-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{players.length}</div>
              <p className="text-xs text-gray-500 mt-1">Total registered players</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Games</CardTitle>
              <Calendar className="w-4 h-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{games.length}</div>
              <p className="text-xs text-gray-500 mt-1">
                {games.filter(g => g.status === 'scheduled').length} upcoming
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upcoming Games */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>Upcoming Games</span>
                <Link to={createPageUrl(isSuperAdmin ? "AllGames" : "Games")} className="text-sm text-yellow-400 hover:text-yellow-300">
                  View all
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingGames.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No upcoming games scheduled</p>
              ) : (
                <div className="space-y-4">
                  {upcomingGames.map((game) => (
                    <div key={game.id} className="bg-gray-950 border border-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500">{new Date(game.game_date).toLocaleDateString()}</span>
                        <span className="text-xs bg-yellow-400/10 text-yellow-400 px-2 py-1 rounded">
                          {game.sport}
                        </span>
                      </div>
                      <div className="text-white font-medium">
                        Home Team vs Away Team
                      </div>
                      {game.location && (
                        <p className="text-sm text-gray-500 mt-1">{game.location}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Games */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Recent Results</CardTitle>
            </CardHeader>
            <CardContent>
              {recentGames.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No completed games yet</p>
              ) : (
                <div className="space-y-4">
                  {recentGames.map((game) => (
                    <div key={game.id} className="bg-gray-950 border border-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500">{new Date(game.game_date).toLocaleDateString()}</span>
                        <span className="text-xs bg-green-400/10 text-green-400 px-2 py-1 rounded">
                          Completed
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-white">
                          <div className="font-medium">Home Team</div>
                          <div className="text-2xl font-bold text-yellow-400">{game.home_score}</div>
                        </div>
                        <div className="text-gray-500 text-xl">vs</div>
                        <div className="text-white text-right">
                          <div className="font-medium">Away Team</div>
                          <div className="text-2xl font-bold">{game.away_score}</div>
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
  );
}