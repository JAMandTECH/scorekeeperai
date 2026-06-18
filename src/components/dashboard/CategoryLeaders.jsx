import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown } from "lucide-react";
import { usePlayerLeaders, buildLeaderboard } from "@/components/hooks/usePlayerLeaders";

const BASKETBALL_IMG = "https://media.base44.com/images/public/690476f21c3624553ac82b4f/21d6fe5db_generated_image.png";
const VOLLEYBALL_IMG = "https://media.base44.com/images/public/690476f21c3624553ac82b4f/555569101_generated_image.png";

const BASKETBALL_CATEGORIES = [
  { key: "points", label: "Points", color: "from-orange-500 to-red-500" },
  { key: "rebounds", label: "Rebounds", color: "from-amber-500 to-orange-500" },
  { key: "assists", label: "Assists", color: "from-yellow-500 to-amber-500" },
  { key: "steals", label: "Steals", color: "from-rose-500 to-pink-500" },
  { key: "blocks", label: "Blocks", color: "from-red-500 to-rose-500" },
  { key: "three_pointers", label: "3-Pointers", color: "from-orange-500 to-yellow-500" },
];

const VOLLEYBALL_CATEGORIES = [
  { key: "points", label: "Points", color: "from-cyan-500 to-blue-500" },
  { key: "aces", label: "Aces", color: "from-blue-500 to-indigo-500" },
  { key: "attacks", label: "Attacks", color: "from-sky-500 to-cyan-500" },
];

function LeaderRow({ category, leader }) {
  const initials = leader
    ? `${(leader.first_name || "?")[0] || ""}${(leader.last_name || "")[0] || ""}`.toUpperCase()
    : "—";
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#16243f]">
      <div className="flex flex-col items-center justify-center w-20 shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{category.label}</span>
        <span className={`text-2xl font-black bg-gradient-to-r ${category.color} bg-clip-text text-transparent leading-none`}>
          {leader ? leader.avg : "0.0"}
        </span>
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 leading-none">avg</span>
        {leader && (
          <span className="text-[10px] font-semibold text-slate-500 mt-0.5">
            {leader.total} total
          </span>
        )}
      </div>
      {leader ? (
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Avatar className="w-9 h-9 ring-1 ring-yellow-400/50">
            <AvatarImage src={leader.photo_url} alt={leader.first_name} />
            <AvatarFallback className={`bg-gradient-to-br ${category.color} text-white text-xs font-bold`}>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">
              {leader.first_name} {leader.last_name}
            </p>
            <p className="text-xs text-slate-400 truncate">{leader.team_name || "—"}</p>
          </div>
          <Crown className="w-4 h-4 text-yellow-500 ml-auto shrink-0" />
        </div>
      ) : (
        <span className="text-sm text-slate-500 font-medium">No data yet</span>
      )}
    </div>
  );
}

function computeLeaders(categories, { sport, division, games, playerStats, teams, players }) {
  return categories.map((cat) => {
    const rows = buildLeaderboard({
      statType: cat.key,
      sport,
      division,
      games,
      playerStats,
      teams,
      players,
      limit: 1,
    });
    return { category: cat, leader: rows[0] || null };
  });
}

function DivisionGroup({ label, leaders }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs font-black uppercase tracking-widest text-slate-300">{label}</span>
        <div className="flex-1 h-px bg-[#1c2c4a]" />
      </div>
      {leaders.map(({ category, leader }) => (
        <LeaderRow key={category.key} category={category} leader={leader} />
      ))}
    </div>
  );
}

function SportLeaders({ title, image, overlay, categories, sport, ctx, splitDivisions, openDivision, veteranDivision }) {
  const openLeaders = splitDivisions ? computeLeaders(categories, { ...ctx, sport, division: openDivision }) : null;
  const veteranLeaders = splitDivisions ? computeLeaders(categories, { ...ctx, sport, division: veteranDivision }) : null;
  const leaders = computeLeaders(categories, { ...ctx, sport, division: null });

  return (
    <Card className="overflow-hidden border border-[#1c2c4a] bg-[#0d1830] shadow-futuristic">
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
      <CardContent className="pt-4 space-y-4">
        {splitDivisions ? (
          <>
            <DivisionGroup label="Open" leaders={openLeaders} />
            <DivisionGroup label="Veterans" leaders={veteranLeaders} />
          </>
        ) : (
          <div className="space-y-2">
            {leaders.map(({ category, leader }) => (
              <LeaderRow key={category.key} category={category} leader={leader} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CategoryLeaders({ organizationId, players = [], teams = [], rightColumnExtra = null }) {
  const { games, playerStats } = usePlayerLeaders(organizationId);
  const ctx = { games, playerStats, teams, players };

  // Resolve the actual division names used by basketball teams so the split matches Home.
  const basketballDivisions = [...new Set(
    teams.filter((t) => (t.sport || "").toLowerCase() === "basketball").map((t) => t.division).filter(Boolean)
  )];
  const openDivision = basketballDivisions.find((d) => d.toLowerCase().includes("open")) || "Open Division";
  const veteranDivision = basketballDivisions.find((d) => d.toLowerCase().includes("veteran")) || "Veterans Division";

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <SportLeaders
        title="Basketball"
        image={BASKETBALL_IMG}
        overlay="from-orange-950/95 via-orange-900/50 to-transparent"
        categories={BASKETBALL_CATEGORIES}
        sport="basketball"
        ctx={ctx}
        splitDivisions
        openDivision={openDivision}
        veteranDivision={veteranDivision}
      />
      <div className="space-y-6">
        <SportLeaders
          title="Volleyball"
          image={VOLLEYBALL_IMG}
          overlay="from-cyan-950/95 via-blue-900/50 to-transparent"
          categories={VOLLEYBALL_CATEGORIES}
          sport="volleyball"
          ctx={ctx}
        />
        {rightColumnExtra}
      </div>
    </div>
  );
}