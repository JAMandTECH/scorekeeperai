import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Clock, Play } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";

export default function Schedule() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [orgId, setOrgId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    setOrgId(currentUser.organization_id);
  };

  const { data: games = [] } = useQuery({
    queryKey: ["games", orgId],
    queryFn: () =>
      orgId
        ? base44.entities.Game.filter({ organization_id: orgId }, "-game_date")
        : [],
    enabled: !!orgId,
  });

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getGamesForDate = (date) => {
    return games.filter((game) => {
      const gameDate = new Date(game.game_date || game.scheduled_date);
      return isSameDay(gameDate, date);
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-500";
      case "in_progress":
        return "bg-red-500";
      case "completed":
        return "bg-green-500";
      default:
        return "bg-slate-500";
    }
  };

  return (
    <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Schedule</h1>
          <p className="text-slate-600 mt-1">View all scheduled games</p>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  {format(selectedDate, "MMMM yyyy")}
                </h2>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSelectedDate(
                        new Date(
                          selectedDate.getFullYear(),
                          selectedDate.getMonth() - 1
                        )
                      )
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(new Date())}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSelectedDate(
                        new Date(
                          selectedDate.getFullYear(),
                          selectedDate.getMonth() + 1
                        )
                      )
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-semibold text-slate-600 py-2"
                  >
                    {day}
                  </div>
                ))}

                {/* Empty cells for days before month starts */}
                {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Calendar days */}
                {daysInMonth.map((day) => {
                  const dayGames = getGamesForDate(day);
                  const isToday = isSameDay(day, new Date());
                  const isSelected = isSameDay(day, selectedDate);

                  return (
                    <div
                      key={day.toString()}
                      onClick={() => setSelectedDate(day)}
                      className={`aspect-square border rounded-lg p-2 cursor-pointer transition-all ${
                        isToday
                          ? "border-orange-500 bg-orange-50"
                          : "border-slate-200 hover:border-orange-300"
                      } ${isSelected ? "ring-2 ring-orange-500" : ""}`}
                    >
                      <div className="text-sm font-semibold text-slate-900">
                        {format(day, "d")}
                      </div>
                      {dayGames.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {dayGames.slice(0, 2).map((game) => (
                            <div
                              key={game.id}
                              className={`h-1.5 rounded-full ${getStatusColor(
                                game.status
                              )}`}
                            />
                          ))}
                          {dayGames.length > 2 && (
                            <div className="text-xs text-slate-600">
                              +{dayGames.length - 2}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Games for selected date */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-4">
                {format(selectedDate, "MMMM d, yyyy")}
              </h3>

              <div className="space-y-3">
                {getGamesForDate(selectedDate).map((game) => (
                  <div
                    key={game.id}
                    className="border border-slate-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() =>
                      navigate(
                        game.status === "in_progress"
                          ? createPageUrl("LiveScoring") + `?gameId=${game.id}`
                          : createPageUrl("Games") + `?gameId=${game.id}`
                      )
                    }
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge
                        className={getStatusColor(game.status)}
                        variant={game.status === "in_progress" ? "default" : "outline"}
                      >
                        {game.status === "in_progress" ? "LIVE" : game.status}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {game.sport}
                      </Badge>
                    </div>
                    <p className="font-semibold text-sm mb-1">
                      {game.home_team_name} vs {game.away_team_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Clock className="w-3 h-3" />
                      {format(new Date(game.game_date || game.scheduled_date), "h:mm a")}
                    </div>
                    {game.status === 'completed' && (
                      <div className="mt-1 text-sm font-bold text-slate-700">
                        {(() => {
                          const isVB = game.sport === 'volleyball';
                          const hasSets = Array.isArray(game.quarter_scores) && game.quarter_scores.length > 0;
                          const home = isVB ? (hasSets ? (game.quarter_scores || []).reduce((sum, s) => sum + (s.home || 0), 0) : (game.home_score ?? 0)) : (game.home_score ?? 0);
                          const away = isVB ? (hasSets ? (game.quarter_scores || []).reduce((sum, s) => sum + (s.away || 0), 0) : (game.away_score ?? 0)) : (game.away_score ?? 0);
                          return `${home} - ${away}`;
                        })()}
                      </div>
                    )}
                    {game.venue && (
                      <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                        <MapPin className="w-3 h-3" />
                        {game.venue}
                      </div>
                    )}
                  </div>
                ))}

                {getGamesForDate(selectedDate).length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Calendar className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm">No games scheduled for this date</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Games List */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4">All Upcoming Games</h3>
            <div className="space-y-3">
              {games
                .filter((g) => g.status === "scheduled")
                .slice(0, 10)
                .map((game) => (
                  <div
                    key={game.id}
                    className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() =>
                      navigate(createPageUrl("Games") + `?gameId=${game.id}`)
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="outline" className="capitalize">
                            {game.sport}
                          </Badge>
                          <span className="text-sm text-slate-600">
                            {format(new Date(game.scheduled_date), "MMM d, yyyy h:mm a")}
                          </span>
                        </div>
                        <p className="font-semibold text-lg">
                          {game.home_team_name} vs {game.away_team_name}
                        </p>
                        {game.venue && (
                          <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                            <MapPin className="w-4 h-4" />
                            {game.venue}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              {games.filter((g) => g.status === "scheduled").length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  No upcoming games scheduled
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}