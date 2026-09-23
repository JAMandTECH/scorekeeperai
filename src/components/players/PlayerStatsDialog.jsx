import React, { useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const BASKETBALL_STATS = [
  { key: "points", label: "PTS", full: "Points" },
  { key: "rebounds", label: "REB", full: "Rebounds" },
  { key: "assists", label: "AST", full: "Assists" },
  { key: "steals", label: "STL", full: "Steals" },
  { key: "blocks", label: "BLK", full: "Blocks" },
  { key: "three_pointers", label: "3PT", full: "3-Pointers" },
];

const VOLLEYBALL_STATS = [
  { key: "attacks", label: "ATK", full: "Attacks" },
  { key: "blocks", label: "BLK", full: "Blocks" },
  { key: "aces", label: "ACE", full: "Aces" },
];

const vballTotal = (r) =>
  (Number(r.attacks) || 0) + (Number(r.blocks) || 0) + (Number(r.aces) || 0);

export default function PlayerStatsDialog({
  open,
  onOpenChange,
  player,
  sport,
  teamName,
  teamLogo,
  statRecords = [],
  gamesPlayed = 0,
}) {
  const isVolleyball = sport === "volleyball";
  const stats = isVolleyball ? VOLLEYBALL_STATS : BASKETBALL_STATS;
  const [selectedKey, setSelectedKey] = useState(null);

  const { games, totals, averages, perGame } = useMemo(() => {
    const recs = statRecords || [];
    const gp = gamesPlayed > 0 ? gamesPlayed : [...new Set(recs.map((r) => r.game_id))].length;

    const totalsObj = {};
    const avgObj = {};
    stats.forEach((s) => {
      const total = recs.reduce((a, r) => a + (Number(r[s.key]) || 0), 0);
      totalsObj[s.label] = total;
      avgObj[s.label] = gp > 0 ? (total / gp).toFixed(1) : "0.0";
    });
    if (!isVolleyball) {
      totalsObj.PTS = recs.reduce((a, r) => a + (Number(r.points) || 0), 0);
      avgObj.PTS = gp > 0 ? (totalsObj.PTS / gp).toFixed(1) : "0.0";
    }

    // Group by game, sort chronologically by record created_date
    const byGame = {};
    recs.forEach((r) => {
      const gid = r.game_id || `g${r.id}`;
      if (!byGame[gid]) byGame[gid] = { date: r.created_date || "", vals: {} };
      stats.forEach((s) => {
        byGame[gid].vals[s.key] = (byGame[gid].vals[s.key] || 0) + (Number(r[s.key]) || 0);
      });
      if (!isVolleyball) {
        byGame[gid].vals.points = (byGame[gid].vals.points || 0) + (Number(r.points) || 0);
      }
    });
    const perGameArr = Object.entries(byGame)
      .sort((a, b) => new Date(a[1].date) - new Date(b[1].date))
      .map(([, v], i) => ({ game: `G${i + 1}`, ...v.vals }));

    return { games: gp, totals: totalsObj, averages: avgObj, perGame: perGameArr };
  }, [statRecords, isVolleyball, gamesPlayed]);

  if (!player) return null;

  const maxTotal = Math.max(1, ...Object.values(totals));
  const selectedStat = stats.find((s) => s.key === selectedKey);
  const chartData = selectedKey
    ? perGame.map((g) => ({ game: g.game, value: g[selectedKey] || 0 }))
    : [];
  const hasData = perGame.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden border border-border bg-card text-card-foreground">
        <div className="grid md:grid-cols-[300px_1fr]">
          {/* Left: player identity */}
          <div className="bg-muted/40 p-6 flex flex-col border-r border-border">
            <div className="flex items-center gap-3 mb-4">
              {teamLogo && (
                <Avatar className="w-12 h-12 border border-border">
                  <AvatarImage src={teamLogo} />
                  <AvatarFallback className="bg-muted text-xs">T</AvatarFallback>
                </Avatar>
              )}
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {teamName}
              </span>
            </div>

            <div className="relative rounded-lg overflow-hidden bg-muted aspect-[3/4] mb-4 flex items-end justify-center border border-border">
              {player.photo_url ? (
                <img
                  src={player.photo_url}
                  alt={`${player.first_name} ${player.last_name}`}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-20 h-20 text-muted-foreground/40" />
                </div>
              )}
              <div className="absolute top-3 right-3 text-4xl font-black text-foreground/80">
                #{player.jersey_number}
              </div>
            </div>

            <h2 className="text-3xl font-black leading-none uppercase font-heading">
              {player.first_name}
              <br />
              {player.last_name}
            </h2>
            <p className="text-muted-foreground text-sm font-bold mt-2">
              {player.position || "—"} {player.height ? `• ${player.height}` : ""}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-muted rounded-lg p-3 text-center border border-border">
                <div className="text-2xl font-black text-foreground">{games}</div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase">Games</div>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center border border-border">
                <div className="text-2xl font-black text-primary">{averages.PTS}</div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase">PPG</div>
              </div>
            </div>
          </div>

          {/* Right: graphical stats */}
          <div className="p-6 max-h-[80vh] overflow-y-auto">
            {!hasData ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16">
                <User className="w-12 h-12 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground font-bold">No statistics recorded yet</p>
                <p className="text-muted-foreground/60 text-sm mt-1">
                  Stats will appear here once games are played.
                </p>
              </div>
            ) : (
              <>
                {/* Per-game averages — clickable selectors */}
                <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-3">
                  Per Game Averages
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
                  {stats.map((s) => {
                    const isActive = selectedKey === s.key;
                    return (
                      <button
                        key={s.key}
                        onClick={() => setSelectedKey(isActive ? null : s.key)}
                        className={`rounded-lg p-3 text-center border transition-all ${
                          isActive
                            ? "border-primary bg-primary/10"
                            : "border-border bg-muted hover:border-primary/50"
                        }`}
                      >
                        <div className={`text-xl font-black ${isActive ? "text-primary" : "text-foreground"}`}>
                          {averages[s.label]}
                        </div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase">
                          {s.label} / G
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Total bars */}
                <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-3">
                  Season Totals
                </h3>
                <div className="space-y-3 mb-6">
                  {stats.map((s) => {
                    const value = totals[s.label] || 0;
                    return (
                      <div key={s.key}>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-muted-foreground">{s.label}</span>
                          <span className="text-foreground">{value}</span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden border border-border">
                          <div
                            className="h-full rounded-full transition-all bg-primary"
                            style={{ width: `${(value / maxTotal) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Per-game trend graph — only when a stat is selected */}
                {selectedStat && chartData.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
                        {selectedStat.full} Per Game
                      </h3>
                    </div>
                    <div className="h-28 bg-muted rounded-lg p-3 border border-border">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                          <XAxis dataKey="game" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} width={32} />
                          <Tooltip
                            contentStyle={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: 8,
                              color: "hsl(var(--foreground))",
                              fontSize: 12,
                            }}
                            labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={(props) => {
                              const { cx, cy, index, payload } = props;
                              const max = Math.max(...chartData.map((d) => d.value));
                              const isPeak = payload.value === max && max > 0;
                              const isLast = index === chartData.length - 1;
                              return isPeak || isLast ? (
                                <circle key={index} cx={cx} cy={cy} r={3} fill="hsl(var(--primary))" />
                              ) : null;
                            }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}