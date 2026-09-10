import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Calendar, Archive, ArrowLeft, Medal, TrendingUp, Sun, Moon, LogOut } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";

export default function PastSeasons() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();

  const currentOrgId = user?.active_organization_id || user?.organization_id;

  useEffect(() => {
    loadUser();
    const savedDarkMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedDarkMode);
    if (savedDarkMode) document.documentElement.classList.add("dark");
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("darkMode", next.toString());
    if (next) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      let user = currentUser;
      try {
        const allUsers = await base44.entities.User.list();
        const freshUser = allUsers.find((u) => u.id === currentUser.id);
        if (freshUser) user = { ...currentUser, ...freshUser };
      } catch (_) {}
      setUser(user);
    } catch (error) {
      base44.auth.redirectToLogin("/PastSeasons");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => base44.auth.logout("/");

  const { data: organization } = useQuery({
    queryKey: ["user-organization", currentOrgId],
    queryFn: async () => {
      const res = await base44.functions.invoke("getUserOrganization", {});
      return res.data?.organization || null;
    },
    enabled: !!currentOrgId,
  });

  const { data: seasons = [], isLoading: seasonsLoading } = useQuery({
    queryKey: ["archived-seasons", currentOrgId],
    queryFn: async () => {
      const res = await base44.functions.invoke("getArchivedSeasons", { organization_id: currentOrgId });
      return res.data?.seasons || [];
    },
    enabled: !!currentOrgId,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminHeader
        user={user}
        organization={organization}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        handleLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      <div className="flex">
        <AdminSidebar
          user={user}
          organization={organization}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          handleLogout={handleLogout}
        />
        <main className="flex-1 min-w-0">
          <div className="p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                  </Link>
                  <h1 className="font-futuristic text-4xl font-black flex items-center gap-3">
                    <Archive className="w-8 h-8 text-amber-500" />
                    Past Seasons
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">
                    {organization ? `Archived seasons for ${organization.name}` : "Archived season history"}
                  </p>
                </div>
              </div>

              {seasonsLoading ? (
                <div className="flex justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-amber-500 border-t-transparent" />
                </div>
              ) : seasons.length === 0 ? (
                <Card className="border-2 border-dashed border-amber-200 dark:border-amber-800/40 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/10 dark:to-orange-950/10">
                  <CardContent className="py-16 text-center">
                    <Archive className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                    <p className="text-lg font-bold">No archived seasons yet</p>
                    <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                      When you archive a completed season, it will appear here with its champion, final standings, and top statistical leaders.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {seasons.map((season) => (
                    <SeasonCard key={season.id} season={season} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function SeasonCard({ season }) {
  const standings = Array.isArray(season.final_standings) ? season.final_standings : [];
  const topStandings = standings.slice(0, 5);
  const leaders = season.top_leaders || {};
  const topScorers = leaders.top_scorers || [];
  const topAssisters = leaders.top_assisters || [];

  return (
    <Card className="overflow-hidden border border-amber-200/50 dark:border-amber-500/20 bg-white/80 dark:bg-[#141a2e]/90 backdrop-blur-xl shadow-lg">
      <CardHeader className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-200/40 dark:border-amber-500/20">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl font-black flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              {season.name}
            </CardTitle>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="capitalize font-semibold">{season.sport}</span>
              {season.division && <span>· {season.division}</span>}
              {season.archived_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {new Date(season.archived_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          {season.champion_team_name && (
            <div className="flex flex-col items-center text-center shrink-0">
              <Avatar className="w-12 h-12 border-2 border-amber-400 shadow-lg">
                <AvatarImage src={standings.find((s) => s.team_id === season.champion_team_id)?.logo_url} />
                <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white font-black text-sm">
                  {season.champion_team_name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] font-bold text-amber-500 mt-1 uppercase tracking-wide">Champion</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-5 space-y-5">
        {season.champion_team_name && (
          <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 px-3 py-2">
            <Medal className="w-5 h-5 text-amber-500 shrink-0" />
            <span className="font-black text-sm">{season.champion_team_name}</span>
            <span className="text-xs text-muted-foreground ml-auto">
              {standings[0] ? `${standings[0].wins}-${standings[0].draws || 0}-${standings[0].losses}` : ""}
            </span>
          </div>
        )}

        {topStandings.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Final Standings
            </p>
            <div className="space-y-1.5">
              {topStandings.map((s, idx) => (
                <div key={s.team_id || idx} className="flex items-center gap-2.5 text-sm">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${idx === 0 ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"}`}>
                    {idx + 1}
                  </span>
                  <span className="font-semibold truncate flex-1">{s.name}</span>
                  <span className="text-xs font-bold text-muted-foreground tabular-nums shrink-0">
                    {s.wins}-{s.draws || 0}-{s.losses}
                  </span>
                  <span className="text-xs font-bold tabular-nums w-12 text-right shrink-0">
                    {(s.win_pct * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(topScorers.length > 0 || topAssisters.length > 0) && (
          <div className="grid grid-cols-2 gap-3">
            {topScorers.length > 0 && (
              <LeaderList title="Top Scorers" items={topScorers} valueKey="total_points" />
            )}
            {topAssisters.length > 0 && (
              <LeaderList title="Top Assisters" items={topAssisters} valueKey="total_assists" />
            )}
          </div>
        )}

        {season.notes && (
          <p className="text-xs text-muted-foreground italic border-t pt-3">"{season.notes}"</p>
        )}
      </CardContent>
    </Card>
  );
}

function LeaderList({ title, items, valueKey }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
      <div className="space-y-1">
        {items.slice(0, 3).map((p, idx) => (
          <div key={p.player_id || idx} className="flex items-center justify-between text-xs">
            <span className="truncate font-medium">{p.name}</span>
            <span className="font-bold tabular-nums shrink-0 ml-2">{p[valueKey]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}