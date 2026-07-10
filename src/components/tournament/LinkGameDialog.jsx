import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link2, Unlink, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";

// Lets an admin link one or more scheduled games (between the match's two teams)
// to a bracket match. When those games complete, series wins update automatically.
export default function LinkGameDialog({ open, onOpenChange, match, teams, games, onToggleGame }) {
  const getTeam = (id) => teams.find((t) => t.id === id);
  const homeTeam = match ? getTeam(match.home_team_id) : null;
  const awayTeam = match ? getTeam(match.away_team_id) : null;
  const linkedIds = match?.game_ids || [];

  // Only games between exactly these two teams (either home/away arrangement).
  const eligibleGames = useMemo(() => {
    if (!match?.home_team_id || !match?.away_team_id) return [];
    const a = match.home_team_id;
    const b = match.away_team_id;
    return games
      .filter(
        (g) =>
          (g.home_team_id === a && g.away_team_id === b) ||
          (g.home_team_id === b && g.away_team_id === a)
      )
      .sort((x, y) => new Date(x.game_date) - new Date(y.game_date));
  }, [games, match]);

  if (!match) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <Link2 className="w-5 h-5 text-purple-600" />
            Link Games to Match
          </DialogTitle>
        </DialogHeader>

        {!homeTeam || !awayTeam ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            Assign both teams to this match before linking a game.
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400 -mt-2">
              <span className="font-bold">{homeTeam.name}</span> vs{" "}
              <span className="font-bold">{awayTeam.name}</span>. Linked games auto-count series wins when completed.
            </p>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto mt-2">
              {eligibleGames.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-semibold">No scheduled games between these teams yet.</p>
                  <p className="text-xs">Create the game in the Schedule first.</p>
                </div>
              )}

              {eligibleGames.map((game) => {
                const isLinked = linkedIds.includes(game.id);
                const isCompleted = game.status === "completed";
                return (
                  <div
                    key={game.id}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl border-2 transition-all ${
                      isLinked
                        ? "border-purple-400 bg-purple-50 dark:bg-purple-950/30"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {getTeam(game.home_team_id)?.name} vs {getTeam(game.away_team_id)?.name}
                        </span>
                        {isCompleted ? (
                          <Badge className="bg-green-600 text-white text-[10px]">
                            {game.home_score}-{game.away_score}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            {game.status?.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      {game.game_date && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {format(new Date(game.game_date), "MMM d, yyyy • h:mm a")}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={isLinked ? "outline" : "default"}
                      onClick={() => onToggleGame(match, game.id, !isLinked)}
                      className={
                        isLinked
                          ? "border-red-300 text-red-600 hover:bg-red-50 shrink-0"
                          : "bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                      }
                    >
                      {isLinked ? (
                        <><Unlink className="w-4 h-4 mr-1" /> Unlink</>
                      ) : (
                        <><CheckCircle2 className="w-4 h-4 mr-1" /> Link</>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}