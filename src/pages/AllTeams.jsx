import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, LayoutGrid, Table, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AllTeams() {
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'

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

  const TeamCard = ({ team }) => {
    const sportColor = team.sport === 'basketball' ? 'orange' : 'blue';
    
    return (
      <Card className={`bg-white dark:bg-gray-800 border-2 border-${sportColor}-100 dark:border-${sportColor}-900 shadow-lg hover:shadow-xl transition-all`}>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-700 shadow-md">
              <AvatarImage src={team.logo_url} />
              <AvatarFallback className={`bg-gradient-to-br from-${sportColor}-500 to-${sportColor}-600 text-white text-sm font-bold`}>
                {team.name?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg text-gray-900 dark:text-white truncate">{team.name}</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{getOrgName(team.organization_id)}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge className={`bg-${sportColor}-100 text-${sportColor}-700 border-${sportColor}-200 dark:bg-${sportColor}-950 dark:text-${sportColor}-300 dark:border-${sportColor}-800 font-bold`}>
              {team.sport}
            </Badge>
            {team.division && (
              <Badge variant="outline" className="border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 font-semibold">
                {team.division}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center text-sm bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400 font-semibold">Record</span>
            <div className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400 font-bold">{team.wins || 0}W</span>
              <span className="text-gray-400">-</span>
              <span className="text-red-600 dark:text-red-400 font-bold">{team.losses || 0}L</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const TeamsTable = () => (
    <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900 border-b-2 border-gray-200 dark:border-gray-700">
                <th className="text-left py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">TEAM</th>
                <th className="text-left py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">ORGANIZATION</th>
                <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">SPORT</th>
                <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">DIVISION</th>
                <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">W</th>
                <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">L</th>
                <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">PCT</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => {
                const sportColor = team.sport === 'basketball' ? 'orange' : 'blue';
                const gamesPlayed = (team.wins || 0) + (team.losses || 0);
                const winPct = gamesPlayed > 0 ? ((team.wins || 0) / gamesPlayed * 100).toFixed(0) : 0;
                
                return (
                  <tr key={team.id} className={`border-b border-gray-100 dark:border-gray-700 hover:bg-${sportColor}-50/50 dark:hover:bg-${sportColor}-950/20 transition-colors`}>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700 shadow-md">
                          <AvatarImage src={team.logo_url} />
                          <AvatarFallback className={`bg-gradient-to-br from-${sportColor}-500 to-${sportColor}-600 text-white text-xs font-bold`}>
                            {team.name?.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-bold text-gray-900 dark:text-white">{team.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-700 dark:text-gray-300 font-medium">{getOrgName(team.organization_id)}</td>
                    <td className="py-4 px-4 text-center">
                      <Badge className={`bg-${sportColor}-100 text-${sportColor}-700 border-${sportColor}-200 dark:bg-${sportColor}-950 dark:text-${sportColor}-300 dark:border-${sportColor}-800 font-bold`}>
                        {team.sport}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {team.division ? (
                        <Badge variant="outline" className="border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 font-semibold">
                          {team.division}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-600 text-sm">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center text-green-600 dark:text-green-400 font-bold text-lg">{team.wins || 0}</td>
                    <td className="py-4 px-4 text-center text-red-600 dark:text-red-400 font-bold text-lg">{team.losses || 0}</td>
                    <td className="py-4 px-4 text-center text-gray-900 dark:text-white font-bold">{winPct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 md:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">All Teams</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">System-wide team overview ({teams.length} teams)</p>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-1 shadow-sm">
            <Button
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('card')}
              className={`font-bold ${viewMode === 'card' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Cards
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className={`font-bold ${viewMode === 'table' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}
            >
              <Table className="w-4 h-4 mr-2" />
              Table
            </Button>
          </div>
        </div>

        {viewMode === 'card' ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        ) : (
          <TeamsTable />
        )}

        {teams.length === 0 && (
          <div className="text-center py-16">
            <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">No teams found</p>
          </div>
        )}
      </div>
    </div>
  );
}