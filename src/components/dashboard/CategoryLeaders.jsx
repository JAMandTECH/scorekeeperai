import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown } from "lucide-react";

const BASKETBALL_IMG = "https://media.base44.com/images/public/690476f21c3624553ac82b4f/51a6d4f65_generated_image.png";
const VOLLEYBALL_IMG = "https://media.base44.com/images/public/690476f21c3624553ac82b4f/0e1f778f3_generated_image.png";

const BASKETBALL_CATEGORIES = [
  { key: "total_points", label: "Points", color: "from-orange-500 to-red-500" },
  { key: "total_rebounds", label: "Rebounds", color: "from-amber-500 to-orange-500" },
  { key: "total_assists", label: "Assists", color: "from-yellow-500 to-amber-500" },
  { key: "total_steals", label: "Steals", color: "from-rose-500 to-pink-500" },
  { key: "total_blocks", label: "Blocks", color: "from-red-500 to-rose-500" },
  { key: "total_three_pointers", label: "3-Pointers", color: "from-orange-500 to-yellow-500" },
];

const VOLLEYBALL_CATEGORIES = [
  { key: "total_points", label: "Points", color: "from-cyan-500 to-blue-500" },
  { key: "total_aces", label: "Aces", color: "from-blue-500 to-indigo-500" },
  { key: "total_attacks", label: "Attacks", color: "from-sky-500 to-cyan-500" },
];

function LeaderRow({ category, leader }) {
  const initials = leader
    ? `${(leader.first_name || "?")[0] || ""}${(leader.last_name || "")[0] || ""}`.toUpperCase()
    : "—";
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/30">
      <div className="flex flex-col items-center justify-center w-20 shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{category.label}</span>
        <span className={`text-2xl font-black bg-gradient-to-r ${category.color} bg-clip-text text-transparent leading-none`}>
          {leader ? leader.value : 0}
        </span>
      </div>
      {leader ? (
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Avatar className="w-9 h-9 ring-1 ring-yellow-400/50">
            <AvatarImage src={leader.photo_url} alt={leader.first_name} />
            <AvatarFallback className={`bg-gradient-to-br ${category.color} text-white text-xs font-bold`}>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {leader.first_name} {leader.last_name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{leader.team_name || "—"}</p>
          </div>
          <Crown className="w-4 h-4 text-yellow-500 ml-auto shrink-0" />
        </div>
      ) : (
        <span className="text-sm text-gray-400 dark:text-gray-500 font-medium">No data yet</span>
      )}
    </div>
  );
}

function SportLeaders({ title, image, overlay, categories, stats, playerMap, teamMap }) {
  const leaders = categories.map((cat) => {
    let best = null;
    stats.forEach((s) => {
      const val = s[cat.key] || 0;
      if (val > 0 && (!best || val > best.value)) {
        const player = playerMap[s.player_id];
        if (!player) return;
        best = {
          value: val,
          first_name: player.first_name,
          last_name: player.last_name,
          photo_url: player.photo_url,
          team_name: teamMap[s.team_id]?.name || teamMap[player.team_id]?.name,
        };
      }
    });
    return { category: cat, leader: best };
  });

  return (
    <Card className="overflow-hidden border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-futuristic">
      <div className="relative h-28">
        <img src={image} alt={title} className="absolute inset-0 w-full h-full object-cover" />
        <div className={`absolute inset-0 bg-gradient-to-t ${overlay}`} />
        <div className="absolute bottom-0 left-0 p-4">
          <span className="text-xs font-bold uppercase tracking-widest text-white/70">Category Leaders</span>
          <h3 className="text-2xl font-black text-white drop-shadow-lg leading-tight">{title}</h3>
        </div>
        <div className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
          <Crown className="w-5 h-5 text-yellow-300" />
        </div>
      </div>
      <CardContent className="pt-4 space-y-2">
        {leaders.map(({ category, leader }) => (
          <LeaderRow key={category.key} category={category} leader={leader} />
        ))}
      </CardContent>
    </Card>
  );
}

export default function CategoryLeaders({ organizationId, players = [], teams = [] }) {
  const { data: seasonStats = [] } = useQuery({
    queryKey: ["category-leaders-stats", organizationId],
    queryFn: () => base44.entities.PlayerSeasonStats.filter({ organization_id: organizationId }),
    enabled: !!organizationId,
    refetchInterval: 20000,
  });

  const playerMap = React.useMemo(() => {
    const m = {};
    players.forEach((p) => { m[p.id] = p; });
    return m;
  }, [players]);

  const teamMap = React.useMemo(() => {
    const m = {};
    teams.forEach((t) => { m[t.id] = t; });
    return m;
  }, [teams]);

  const basketballStats = seasonStats.filter((s) => s.sport === "basketball");
  const volleyballStats = seasonStats.filter((s) => s.sport === "volleyball");

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <SportLeaders
        title="Basketball"
        image={BASKETBALL_IMG}
        overlay="from-orange-950/95 via-orange-900/50 to-transparent"
        categories={BASKETBALL_CATEGORIES}
        stats={basketballStats}
        playerMap={playerMap}
        teamMap={teamMap}
      />
      <SportLeaders
        title="Volleyball"
        image={VOLLEYBALL_IMG}
        overlay="from-cyan-950/95 via-blue-900/50 to-transparent"
        categories={VOLLEYBALL_CATEGORIES}
        stats={volleyballStats}
        playerMap={playerMap}
        teamMap={teamMap}
      />
    </div>
  );
}