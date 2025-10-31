import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

export default function AllTeams() {
  const { data: teams = [] } = useQuery({
    queryKey: ['all-teams'],
    queryFn: () => base44.entities.Team.list('-created_date'),
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
  });

  const getOrgName = (orgId) => {
    const org = organizations.find(o => o.id === orgId);
    return org?.name || 'Unknown Organization';
  };

  return (
    <div className="p-4 md:p-8 bg-gray-950 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">All Teams</h1>
          <p className="text-gray-400 mt-1">System-wide team overview</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <Card key={team.id} className="bg-gray-900 border-gray-800">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-yellow-400/10 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white">{team.name}</CardTitle>
                    <p className="text-gray-500 text-sm">{getOrgName(team.organization_id)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge className="bg-yellow-400/10 text-yellow-400">
                    {team.sport}
                  </Badge>
                  {team.division && (
                    <Badge variant="outline" className="border-gray-700 text-gray-400">
                      {team.division}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Record</span>
                  <span className="text-white font-semibold">
                    {team.wins || 0}W - {team.losses || 0}L
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}