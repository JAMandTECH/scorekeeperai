import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Timer as TimerIcon, Calendar, PlayCircle, CheckCircle, Clock } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import { useGameTimer } from "@/lib/useGameTimer";
import { defaultTimerForGame } from "@/lib/timerLogic";
import TimerSetupCard from "@/components/timekeeper/TimerSetupCard";
import TimerControlPanel from "@/components/timekeeper/TimerControlPanel";

export default function Timekeeper() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadUser();
    const savedDarkMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedDarkMode);
    if (savedDarkMode) document.documentElement.classList.add("dark");
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("darkMode", String(next));
    if (next) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      // Non-timekeepers (who aren't admins) shouldn't be here
      const isTk = currentUser.is_timekeeper === true || currentUser.data?.is_timekeeper === true;
      if (!isTk && currentUser.role !== "admin") {
        window.location.href = createPageUrl("Home");
      }
    } catch (e) {
      base44.auth.redirectToLogin(createPageUrl("Timekeeper"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => base44.auth.logout(createPageUrl("PublicLanding"));

  const { data: organization } = useQuery({
    queryKey: ["timekeeper-organization", user?.organization_id, user?.active_organization_id],
    queryFn: async () => {
      const res = await base44.functions.invoke("getUserOrganization", {});
      return res?.data?.organization || null;
    },
    enabled: !!user?.organization_id || !!user?.active_organization_id,
  });

  // Assigned games — direct query filtered by the caller's email.
  // RLS allows read for users whose org matches the game's org.
  const { data: myGames = [], isLoading: gamesLoading } = useQuery({
    queryKey: ["timekeeper-games", user?.email],
    queryFn: async () => {
      const games = await base44.entities.Game.filter(
        { timekeeper_email: user.email },
        "-game_date",
        100
      );
      return Array.isArray(games) ? games : [];
    },
    enabled: !!user?.email,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["timekeeper-teams"],
    queryFn: () => base44.entities.Team.list(),
    enabled: !!user?.email,
  });

  const timerHook = useGameTimer(selectedGameId);
  const { timer, loading: timerLoading } = timerHook;

  const selectedGame = myGames.find((g) => g.id === selectedGameId) || null;

  const getTeamName = (id) => teams.find((t) => t.id === id)?.name || "TBD";

  // Create the GameTimer record with the chosen config (via service role)
  const initializeTimer = async (config) => {
    if (!selectedGame) return;
    setBusy(true);
    try {
      const base = defaultTimerForGame(selectedGame);
      const patch = {
        ...base,
        ...config,
        game_clock_remaining_ms: config.period_length_seconds * 1000,
        shot_clock_remaining_ms: config.shot_clock_length_seconds * 1000,
      };
      await base44.functions.invoke("mutateGameTimer", {
        action: "create",
        game_id: selectedGame.id,
        patch,
      });
      timerHook.refetch();
    } catch (e) {
      console.error("Initialize timer failed:", e);
      alert("Could not initialize timer: " + (e.message || e));
    } finally {
      setBusy(false);
    }
  };

  // Update config (period length/count/structure/shot clock)
  const saveConfig = async (config) => {
    if (!timer) return;
    setBusy(true);
    try {
      const bothStopped = !timer.game_clock_running && !timer.shot_clock_running;
      const patch = {
        ...config,
        ...(bothStopped
          ? {
              game_clock_remaining_ms: config.period_length_seconds * 1000,
              shot_clock_remaining_ms: config.shot_clock_length_seconds * 1000,
              game_clock_end_iso: null,
              shot_clock_end_iso: null,
            }
          : {}),
      };
      await base44.functions.invoke("mutateGameTimer", {
        action: "update",
        timer_id: timer.id,
        patch,
      });
    } catch (e) {
      console.error("Save config failed:", e);
      alert("Could not save config: " + (e.message || e));
    } finally {
      setBusy(false);
    }
  };

  // Generic patch for clock actions
  const patchTimer = async (patch) => {
    if (!timer) return;
    try {
      await base44.functions.invoke("mutateGameTimer", {
        action: "update",
        timer_id: timer.id,
        patch,
      });
    } catch (e) {
      console.error("Patch timer failed:", e);
      alert("Could not update timer: " + (e.message || e));
    }
  };

  if (loading || !user) {
    return (
      <div className="arena-command min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const timekeeperNav = [
    { title: "Organization Home", url: createPageUrl("Home"), icon: Clock },
    { title: "Timekeeper", url: createPageUrl("Timekeeper"), icon: TimerIcon },
  ];

  return (
    <div className="arena-command min-h-screen bg-background text-foreground">
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
          navigationItems={timekeeperNav}
        />

        <main className="flex-1 min-w-0">
          <div className="p-6 lg:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="flex items-center gap-3">
                <TimerIcon className="w-7 h-7 text-primary" />
                <div>
                  <h1 className="font-heading text-3xl font-bold tracking-tight">Timekeeper</h1>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Run the game clock and shot clock for your assigned games.
                  </p>
                </div>
              </div>

              {!selectedGameId && (
                <>
                  {gamesLoading ? (
                    <div className="flex justify-center py-20">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                    </div>
                  ) : myGames.length === 0 ? (
                    <Card className="border border-border bg-card">
                      <CardContent className="py-16 text-center">
                        <div className="w-20 h-20 border border-border bg-background flex items-center justify-center mx-auto mb-5">
                          <Calendar className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground text-lg font-heading font-bold">
                          No games assigned to you
                        </p>
                        <p className="text-muted-foreground text-sm mt-2">
                          An admin must assign you as timekeeper on a game's schedule.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                      {myGames.map((game) => (
                        <button
                          key={game.id}
                          onClick={() => setSelectedGameId(game.id)}
                          className="text-left"
                        >
                          <Card className="border border-border bg-card hover:border-foreground/20 transition-colors h-full">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <Badge variant="outline" className="border-border text-muted-foreground font-medium uppercase text-xs">
                                  {game.status === "scheduled" && <Clock className="w-3 h-3 mr-1" />}
                                  {game.status === "in_progress" && <PlayCircle className="w-3 h-3 mr-1" />}
                                  {game.status === "completed" && <CheckCircle className="w-3 h-3 mr-1" />}
                                  {game.status}
                                </Badge>
                                <Badge variant="outline" className="border-border text-foreground font-heading font-bold uppercase text-xs">
                                  {game.sport}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="font-heading font-bold text-foreground">
                                {getTeamName(game.home_team_id)} <span className="text-muted-foreground font-normal">vs</span> {getTeamName(game.away_team_id)}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {new Date(game.game_date).toLocaleDateString()} at{" "}
                                {new Date(game.game_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </CardContent>
                          </Card>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {selectedGameId && (
                <div className="space-y-6">
                  <Button variant="ghost" onClick={() => setSelectedGameId(null)} className="font-medium">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to my games
                  </Button>

                  <Card className="border border-border bg-card">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="font-heading font-bold text-foreground">
                          {getTeamName(selectedGame?.home_team_id)} <span className="text-muted-foreground font-normal">vs</span> {getTeamName(selectedGame?.away_team_id)}
                        </p>
                        <Badge variant="outline" className="border-border text-muted-foreground font-medium uppercase text-xs">
                          {selectedGame?.sport} · {new Date(selectedGame?.game_date).toLocaleDateString()}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {timerLoading ? (
                    <div className="flex justify-center py-16">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                    </div>
                  ) : !timer ? (
                    <TimerSetupCard
                      game={selectedGame}
                      timer={null}
                      onInitialize={initializeTimer}
                      onSaveConfig={saveConfig}
                      busy={busy}
                    />
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6 items-start">
                      <TimerControlPanel
                        timer={timer}
                        gameClockMs={timerHook.gameClockMs}
                        shotClockMs={timerHook.shotClockMs}
                        gameClockRunning={timerHook.gameClockRunning}
                        shotClockRunning={timerHook.shotClockRunning}
                        periodLabel={timerHook.periodLabel}
                        onPatch={patchTimer}
                        busy={busy}
                        homeTeamName={getTeamName(selectedGame?.home_team_id)}
                        awayTeamName={getTeamName(selectedGame?.away_team_id)}
                      />
                      <TimerSetupCard
                        game={selectedGame}
                        timer={timer}
                        onInitialize={initializeTimer}
                        onSaveConfig={saveConfig}
                        busy={busy}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}