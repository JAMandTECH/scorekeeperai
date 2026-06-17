import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, UserPlus, TrendingUp, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function scorePlayer(sport, p) {
  if (sport === 'volleyball') {
    return (p.attacks || 0) * 1.0 + (p.blocks || 0) * 0.7 + (p.aces || 0) * 0.5 - (p.rally_errors || 0) * 0.2;
  }
  return (p.points || 0) * 1.0 + (p.rebounds || 0) * 0.7 + (p.assists || 0) * 0.7 + (p.steals || 0) * 0.5 + (p.blocks || 0) * 0.5;
}

function statLine(sport, p) {
  if (sport === 'volleyball') {
    return [
      (p.attacks || 0) > 0 && `${p.attacks} ATK`,
      (p.aces || 0) > 0 && `${p.aces} ACE`,
      (p.blocks || 0) > 0 && `${p.blocks} BLK`,
    ].filter(Boolean).join(' · ');
  }
  return [
    `${p.points || 0} PTS`,
    (p.rebounds || 0) > 0 && `${p.rebounds} REB`,
    (p.assists || 0) > 0 && `${p.assists} AST`,
  ].filter(Boolean).join(' · ');
}

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

  const completedGameIds = React.useMemo(
    () => games.map((g) => g.id),
    [games]
  );

  const { data: gameStats = [] } = useQuery({
    queryKey: ['recent-activity-stats', completedGameIds],
    queryFn: () => base44.entities.PlayerGameStats.filter({ game_id: { $in: completedGameIds } }),
    enabled: completedGameIds.length > 0,
    refetchInterval: 15000,
  });

  const teamMap = React.useMemo(() => {
    const m = {};
    teams.forEach((t) => { m[t.id] = t; });
    return m;
  }, [teams]);

  const playerMap = React.useMemo(() => {
    const m = {};
    players.forEach((p) => { m[p.id] = p; });
    return m;
  }, [players]);

  // Best player per game (aggregated across quarters)
  const bestPlayerByGame = React.useMemo(() => {
    const byGame = {};
    gameStats.forEach((s) => {
      const g = byGame[s.game_id] || {};
      const p = g[s.player_id] || { player_id: s.player_id, points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, aces: 0, attacks: 0, rally_errors: 0 };
      p.points += s.points || 0;
      p.rebounds += s.rebounds || 0;
      p.assists += s.assists || 0;
      p.steals += s.steals || 0;
      p.blocks += s.blocks || 0;
      p.aces += s.aces || 0;
      p.attacks += s.attacks || 0;
      p.rally_errors += s.rally_errors || 0;
      g[s.player_id] = p;
      byGame[s.game_id] = g;
    });

    const result = {};
    games.forEach((game) => {
      const agg = byGame[game.id];
      if (!agg) return;
      let best = null;
      Object.values(agg).forEach((p) => {
        const score = scorePlayer(game.sport, p);
        if (score > 0 && (!best || score > best.score)) best = { ...p, score };
      });
      if (best) {
        const player = playerMap[best.player_id];
        result[game.id] = {
          name: player ? `${player.first_name} ${player.last_name}` : 'Player',
          stats: statLine(game.sport, best),
        };
      }
    });
    return result;
  }, [gameStats, games, playerMap]);

  const activities = React.useMemo(() => {
    const items = [];

    games.forEach((g) => {
      const home = teamMap[g.home_team_id]?.name || 'Home';
      const away = teamMap[g.away_team_id]?.name || 'Away';
      const best = bestPlayerByGame[g.id];
      items.push({
        id: `game-${g.id}`,
        type: 'game',
        icon: Trophy,
        color: 'from-purple-500 to-pink-600',
        title: `${home} ${g.home_score ?? 0} – ${g.away_score ?? 0} ${away}`,
        subtitle: 'Game completed',
        date: g.updated_date,
        best,
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
  }, [games, teams, players, teamMap, bestPlayerByGame]);

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
                <div key={a.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-start gap-3">
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
                  {a.best && (
                    <div className="mt-2.5 ml-[52px] flex items-center gap-2 flex-wrap border-t border-gray-200 dark:border-gray-600/50 pt-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-yellow-700 dark:text-yellow-400">
                        <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                        {a.best.name}
                      </span>
                      <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">{a.best.stats}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}