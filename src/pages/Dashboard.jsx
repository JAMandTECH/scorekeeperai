import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Trophy, Users, Calendar, TrendingUp, Plus, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [orgId, setOrgId] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    setOrgId(currentUser.organization_id);
  };

  const { data: teams = [] } = useQuery({
    queryKey: ["teams", orgId],
    queryFn: () =>
      orgId ? base44.entities.Team.filter({ organization_id: orgId }) : [],
    enabled: !!orgId,
  });

  const { data: players = [] } = useQuery({
    queryKey: ["players", orgId],
    queryFn: () =>
      orgId ? base44.entities.Player.filter({ organization_id: orgId }) : [],
    enabled: !!orgId,
  });

  const { data: games = [] } = useQuery({
    queryKey: ["games", orgId],
    queryFn: () =>
      orgId
        ? base44.entities.Game.filter({ organization_id: orgId }, "-scheduled_date")
        : [],
    enabled: !!orgId,
  });

  const upcomingGames = games.filter((g) => g.status === "scheduled").slice(0, 5);
  const liveGames = games.filter((g) => g.status === "in_progress");

  if (!orgId) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="text-center py-12">
            <p className="text-slate-600 mb-4">
              You are not assigned to any organization yet. Please contact your super admin.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-600 mt-1">
              Welcome back, {user?.full_name || "Admin"}
            </p>
          </div>
          <Button
            onClick={() => navigate(createPageUrl("Games"))}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Game
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Teams"
            value={teams.length}
            icon={<Users className="w-6 h-6" />}
            color="bg-blue-500"
          />
          <StatCard
            title="Total Players"
            value={players.length}
            icon={<TrendingUp className="w-6 h-6" />}
            color="bg-green-500"
          />
          <StatCard
            title="Total Games"
            value={games.length}
            icon={<Trophy className="w-6 h-6" />}
            color="bg-purple-500"
          />
          <StatCard
            title="Live Now"
            value={liveGames.length}
            icon={<Play className="w-6 h-6" />}
            color="bg-red-500"
          />
        </div>

        {/* Live Games */}
        {liveGames.length > 0 && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <Play className="w-5 h-5" />
                Live Games
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {liveGames.map((game) => (
                  <div
                    key={game.id}
                    onClick={() =>
                      navigate(createPageUrl("LiveScoring") + `?gameId=${game.id}`)
                    }
                    className="bg-white p-4 rounded-lg cursor-pointer hover:shadow-md transition-shadow border border-red-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className="bg-red-500">LIVE</Badge>
                          <span className="text-sm text-slate-600">
                            {game.current_period}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {game.home_team_name}
                            </p>
                            <p className="text-2xl font-bold text-orange-600">
                              {game.home_score}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {game.away_team_name}
                            </p>
                            <p className="text-2xl font-bold text-orange-600">
                              {game.away_score}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button size="sm" className="bg-red-500 hover:bg-red-600">
                        View Live
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Games */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upcoming Games</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(createPageUrl("Schedule"))}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingGames.length > 0 ? (
              <div className="space-y-3">
                {upcomingGames.map((game) => (
                  <div
                    key={game.id}
                    className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() =>
                      navigate(createPageUrl("Games") + `?gameId=${game.id}`)
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 mb-2">
                          {format(new Date(game.scheduled_date), "MMM d, yyyy h:mm a")}
                        </p>
                        <p className="font-semibold text-slate-900">
                          {game.home_team_name} vs {game.away_team_name}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">{game.venue}</p>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {game.sport}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                No upcoming games scheduled
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-slate-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
          </div>
          <div className={`${color} p-3 rounded-xl text-white`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}