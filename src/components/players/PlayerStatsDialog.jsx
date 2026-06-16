import React, { useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

// NBA-style player stats profile. Shows only stats that have data.
export default function PlayerStatsDialog({
  open,
  onOpenChange,
  player,
  sport,
  teamName,
  teamLogo,
  statRecords = [],
}) {
  const isVolleyball = sport === "volleyball";

  const { games, averages, totals, monthly } = useMemo(() => {
    const recs = statRecords || [];
    const gameIds = [...new Set(recs.map((r) => r.game_id))];
    const gp = gameIds.length || 0;
    const sum = (key) => recs.reduce((a, r) => a + (Number(r[key]) || 0), 0);

    let totalsObj = {};
    if (isVolleyball) {
      const atk = sum("attacks");
      const blk = sum("blocks");
      const ace = sum("aces");
      totalsObj = { PTS: atk + blk + ace, ATK: atk, BLK: blk, ACE: ace };
    } else {
      totalsObj = {
        PTS: sum("points"),
        REB: sum("rebounds"),
        AST: sum("assists"),
        BLK: sum("blocks"),
        STL: sum("steals"),
        "3PT": sum("three_pointers"),
      };
    }

    const avgObj = {};
    Object.entries(totalsObj).forEach(([k, v]) => {
      avgObj[k] = gp > 0 ? (v / gp).toFixed(1) : "0.0";
    });

    // Monthly trend of total points-equivalent per record's created month
    const byMonth = {};
    recs.forEach((r) => {
      const d = r.created_date ? new Date(r.created_date) : null;
      const label = d
        ? d.toLocaleString("en-US", { month: "short" })
        : "—";
      const pts = isVolleyball
        ? (Number(r.attacks) || 0) + (Number(r.blocks) || 0) + (Number(r.aces) || 0)
        : Number(r.points) || 0;
      byMonth[label] = (byMonth[label] || 0) + pts;
    });
    const order = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyArr = Object.entries(byMonth)
      .map(([month, value]) => ({ month, value }))
      .sort((a, b) => order.indexOf(a.month) - order.indexOf(b.month));

    return { games: gp, averages: avgObj, totals: totalsObj, monthly: monthlyArr };
  }, [statRecords, isVolleyball]);

  if (!player) return null;

  // Only keep stats that have at least some recorded value
  const statEntries = Object.entries(totals).filter(([, v]) => v > 0);
  const maxTotal = Math.max(1, ...statEntries.map(([, v]) => v));

  const accent = isVolleyball ? "#3b82f6" : "#f97316";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-0 bg-[#0e0e12] text-white">
        <div className="grid md:grid-cols-[300px_1fr]">
          {/* Left: player identity */}
          <div className="bg-gradient-to-b from-[#1a1a22] to-[#0e0e12] p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              {teamLogo && (
                <Avatar className="w-12 h-12 border border-white/10">
                  <AvatarImage src={teamLogo} />
                  <AvatarFallback className="bg-white/10 text-xs">T</AvatarFallback>
                </Avatar>
              )}
              <span className="text-xs font-bold text-white/50 uppercase tracking-wider">
                {teamName}
              </span>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-white/5 aspect-[3/4] mb-4 flex items-end justify-center">
              {player.photo_url ? (
                <img
                  src={player.photo_url}
                  alt={`${player.first_name} ${player.last_name}`}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-20 h-20 text-white/20" />
                </div>
              )}
              <div className="absolute top-3 right-3 text-4xl font-black text-white/80">
                #{player.jersey_number}
              </div>
            </div>

            <h2 className="text-3xl font-black leading-none uppercase">
              {player.first_name}
              <br />
              {player.last_name}
            </h2>
            <p className="text-white/50 text-sm font-bold mt-2">
              {player.position || "—"} {player.height ? `• ${player.height}` : ""}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-2xl font-black">{games}</div>
                <div className="text-[10px] font-bold text-white/40 uppercase">Games</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-2xl font-black">{averages.PTS}</div>
                <div className="text-[10px] font-bold text-white/40 uppercase">PPG</div>
              </div>
            </div>
          </div>

          {/* Right: graphical stats */}
          <div className="p-6 max-h-[80vh] overflow-y-auto">
            {statEntries.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16">
                <User className="w-12 h-12 text-white/20 mb-3" />
                <p className="text-white/60 font-bold">No statistics recorded yet</p>
                <p className="text-white/30 text-sm mt-1">
                  Stats will appear here once games are played.
                </p>
              </div>
            ) : (
              <>
                {/* Per-game averages cards */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
                  {statEntries.map(([label]) => (
                    <div
                      key={label}
                      className="bg-white/5 rounded-xl p-3 text-center border border-white/5"
                    >
                      <div className="text-xl font-black" style={{ color: accent }}>
                        {averages[label]}
                      </div>
                      <div className="text-[10px] font-bold text-white/40 uppercase">
                        {label} / G
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total bars */}
                <h3 className="text-sm font-black uppercase tracking-wider text-white/60 mb-3">
                  Season Totals
                </h3>
                <div className="space-y-3 mb-8">
                  {statEntries.map(([label, value]) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-white/60">{label}</span>
                        <span className="text-white">{value}</span>
                      </div>
                      <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(value / maxTotal) * 100}%`,
                            background: accent,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Monthly trend */}
                {monthly.length > 1 && (
                  <>
                    <h3 className="text-sm font-black uppercase tracking-wider text-white/60 mb-3">
                      Points Trend
                    </h3>
                    <div className="h-56 bg-white/5 rounded-xl p-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthly}>
                          <defs>
                            <linearGradient id="statGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={accent} stopOpacity={0.5} />
                              <stop offset="100%" stopColor={accent} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                          <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                          <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
                          <Tooltip
                            contentStyle={{
                              background: "#1a1a22",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: 8,
                              color: "#fff",
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke={accent}
                            strokeWidth={2}
                            fill="url(#statGrad)"
                          />
                        </AreaChart>
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