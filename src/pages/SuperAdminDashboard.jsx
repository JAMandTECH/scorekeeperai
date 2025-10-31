import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Building2, Users, Trophy, TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SuperAdminDashboard() {
  const navigate = useNavigate();

  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => base44.entities.Organization.list("-created_date"),
  });

  const { data: games = [] } = useQuery({
    queryKey: ["allGames"],
    queryFn: () => base44.entities.Game.list("-created_date", 10),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["allTeams"],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: players = [] } = useQuery({
    queryKey: ["allPlayers"],
    queryFn: () => base44.entities.Player.list(),
  });

  const activeOrgs = organizations.filter((o) => o.status === "active").length;
  const inProgressGames = games.filter((g) => g.status === "in_progress").length;

  return (
    <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Super Admin Dashboard
            </h1>
            <p className="text-slate-600 mt-1">
              Manage all organizations and system-wide settings
            </p>
          </div>
          <Button
            onClick={() => navigate(createPageUrl("Organizations"))}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Organization
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Organizations"
            value={organizations.length}
            subtitle={`${activeOrgs} active`}
            icon={<Building2 className="w-6 h-6" />}
            color="bg-blue-500"
          />
          <StatCard
            title="Total Teams"
            value={teams.length}
            subtitle="Across all orgs"
            icon={<Users className="w-6 h-6" />}
            color="bg-green-500"
          />
          <StatCard
            title="Total Players"
            value={players.length}
            subtitle="Active players"
            icon={<TrendingUp className="w-6 h-6" />}
            color="bg-purple-500"
          />
          <StatCard
            title="Live Games"
            value={inProgressGames}
            subtitle={`${games.length} total games`}
            icon={<Trophy className="w-6 h-6" />}
            color="bg-orange-500"
          />
        </div>

        {/* Organizations Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  onClick={() => navigate(createPageUrl("Organizations"))}
                  className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    {org.logo_url ? (
                      <img
                        src={org.logo_url}
                        alt={org.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{org.name}</h3>
                      <p className="text-sm text-slate-600 capitalize">
                        {org.sport_type}
                      </p>
                      <div className="mt-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            org.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {org.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {organizations.length === 0 && (
                <div className="col-span-3 text-center py-12 text-slate-500">
                  No organizations yet. Click "Add Organization" to get started.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, color }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-slate-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          </div>
          <div className={`${color} p-3 rounded-xl text-white`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}