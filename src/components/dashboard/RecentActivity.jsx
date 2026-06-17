import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, UserPlus, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function RecentActivity({ organizationId, teams = [], players = [] }) {
  const { data: games = [], isLoading } = useQuery({
    queryKey: ['recent-activity-games', organizationId],
    queryFn: () => base44.entities.Game.filter(
      { organization_id: organizationId, status: 'completed' },
      '-updated_date',
      10
    ),
    enabled: !!organizationId,
    refetchInterval: 15000,
  });

  const teamMap = React.useMemo(() => {
    const m = {};
    teams.forEach((t) => { m[t.id] = t; });
    return m;
  }, [teams]);

  const activities = React.useMemo(() => {
    const items = [];

    games.forEach((g) => {
      const home = teamMap[g.home_team_id]?.name || 'Home';
      const away = teamMap[g.away_team_id]?.name || 'Away';
      items.push({
        id: `game-${g.id}`,
        type: 'game',
        icon: Trophy,
        color: 'from-purple-500 to-pink-600',
        title: `${home} ${g.home_score ?? 0} – ${g.away_score ?? 0} ${away}`,
        subtitle: 'Game completed',
        date: g.updated_date,
      });
    });

    teams.forEach((t) => {
      items.push({
        id: `team-${t.id}`,
        type: 'team',
        icon: Users,
        color: 'from-orange-500 to-red-600',
        title: t.name,
        subtitle: 'Team added',
        date: t.created_date,
      });
    });

    players.forEach((p) => {
      items.push({
        id: `player-${p.id}`,
        type: 'player',
        icon: UserPlus,
        color: 'from-green-500 to-emerald-600',
        title: `${p.first_name} ${p.last_name}`,
        subtitle: 'Player registered',
        date: p.created_date,
      });
    });

    return items
      .filter((i) => i.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8);
  }, [games, teams, players, teamMap]);

  return (
    <Card className="border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-futuristic">
      <CardHeader className="border-b border-gray-200/50 dark:border-gray-700/50">
        <CardTitle className="text-xl font-black text-gray-900 dark:text-white">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-gray-700/40 animate-pulse" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">No recent activity yet</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {activities.map((a) => {
              const Icon = a.icon;
              return (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                  <div className={`w-10 h-10 flex-shrink-0 bg-gradient-to-br ${a.color} rounded-xl flex items-center justify-center shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{a.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{a.subtitle}</p>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap">
                    {formatDistanceToNow(new Date(a.date), { addSuffix: true })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}