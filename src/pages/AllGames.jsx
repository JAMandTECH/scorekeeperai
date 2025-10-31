import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";

export default function AllGames() {
  const navigate = useNavigate();

  const { data: games = [] } = useQuery({
    queryKey: ["allGames"],
    queryFn: () => base44.entities.Game.list("-scheduled_date"),
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => base44.entities.Organization.list(),
  });

  const getOrgName = (orgId) => {
    const org = organizations.find((o) => o.id === orgId);
    return org?.name || "Unknown Organization";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-700";
      case "in_progress":
        return "bg-red-100 text-red-700";
      case "completed":
        return "bg-green-100 text-green-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">All Games</h1>
          <p className="text-slate-600 mt-1">
            View games across all organizations
          </p>
        </div>

        <div className="space-y-4">
          {games.map((game) => (
            <Card key={game.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge className={getStatusColor(game.status)}>
                        {game.status.replace("_", " ")}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {game.sport}
                      </Badge>
                      <span className="text-sm text-slate-600">
                        {getOrgName(game.organization_id)}
                      </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 mb-4">
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Home Team</p>
                        <p className="text-xl font-bold text-slate-900">
                          {game.home_team_name}
                        </p>
                        {game.status !== "scheduled" && (
                          <p className="text-3xl font-bold text-orange-600 mt-1">
                            {game.home_score || 0}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Away Team</p>
                        <p className="text-xl font-bold text-slate-900">
                          {game.away_team_name}
                        </p>
                        {game.status !== "scheduled" && (
                          <p className="text-3xl font-bold text-orange-600 mt-1">
                            {game.away_score || 0}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(game.scheduled_date), "MMM d, yyyy h:mm a")}
                      </div>
                      {game.venue && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {game.venue}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {games.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">No games found</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}