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

  const bestPlayersByGame = React.useMemo(() => {
    const byGame = {};
    gameStats.forEach((s) => {
      const g = byGame[s.game_id] || {};
      const p = g[s.player_id] || { player_id: s.player_id, team_id: s.team_id, points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, aces: 0, attacks: 0, rally_errors: 0 };
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

    const pickBestForTeam = (game, agg, teamId) => {
      let best = null;
      Object.values(agg).forEach((p) => {
        if (p.team_id !== teamId) return;
        const score = scorePlayer(game.sport, p);
        if (score > 0 && (!best || score > best.score)) best = { ...p, score };
      });
      if (!best) return null;
      const player = playerMap[best.player_id];
      return {
        name: player ? `${player.first_name} ${player.last_name}` : 'Player',
        stats: statLine(game.sport, best),
      };
    };

    const result = {};
    games.forEach((game) => {
      const agg = byGame[game.id];
      if (!agg) return;
      const best = [
        pickBestForTeam(game, agg, game.home_team_id),
        pickBestForTeam(game, agg, game.away_team_id),
      ].filter(Boolean);
      if (best.length) result[game.id] = best;
    });
    return result;
  }, [gameStats, games, playerMap]);

  const activities = React.useMemo(() => {
    const items = [];

    games.forEach((g) => {
      const home = teamMap[g.home_team_id]?.name || 'Home';
      const away = teamMap[g.away_team_id]?.name || 'Away';
      const best = bestPlayersByGame[g.id];
      items.push({
        id: `game-${g.id}`,
        type: 'game',
        icon: Trophy,
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
        title: `${p.first_name} ${p.last_name}`,
        subtitle: 'Player registered',
        date: p.created_date,
      });
    });

    return items
      .filter((i) => i.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8);
  }, [games, teams, players, teamMap, bestPlayersByGame]);

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="text-base font-heading font-bold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-muted animate-pulse" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No recent activity yet</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {activities.map((a) => {
              const Icon = a.icon;
              return (
                <div key={a.id} className="p-3 border border-border bg-card hover:bg-muted transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 flex-shrink-0 border border-border bg-secondary flex items-center justify-center">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.subtitle}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                      {formatDistanceToNow(new Date(a.date), { addSuffix: true })}
                    </span>
                  </div>
                  {Array.isArray(a.best) && a.best.length > 0 && (
                    <div className="mt-2.5 ml-[44px] grid grid-cols-2 gap-3 border-t border-border pt-2">
                      {[0, 1].map((idx) => {
                        const b = a.best[idx];
                        return (
                          <div key={idx} className={`flex flex-col gap-0.5 ${idx === 1 ? 'items-end text-right' : 'items-start text-left'}`}>
                            {b ? (
                              <>
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground">
                                  <Star className="w-3 h-3 fill-primary text-primary" />
                                  {b.name}
                                </span>
                                <span className="text-[11px] text-muted-foreground tabular-nums">{b.stats}</span>
                              </>
                            ) : null}
                          </div>
                        );
                      })}
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