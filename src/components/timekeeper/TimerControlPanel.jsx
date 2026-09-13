import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Pause, RotateCcw, SkipForward, SkipBack, Plus } from "lucide-react";
import { formatGameClock, formatShotClock, parseClockInput } from "@/lib/timerLogic";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * The big game clock + shot clock control panel.
 * All mutations go through `onPatch(patch)` which writes to the GameTimer entity.
 * Reset is gated: the confirmation dialog only opens when both clocks are stopped.
 */
export default function TimerControlPanel({
  timer,
  gameClockMs,
  shotClockMs,
  gameClockRunning,
  shotClockRunning,
  periodLabel: pLabel,
  onPatch,
  busy,
  homeTeamName = "Home",
  awayTeamName = "Away",
}) {
  const [adjustGame, setAdjustGame] = useState("");
  const [adjustShot, setAdjustShot] = useState("");
  const [resetTarget, setResetTarget] = useState(null); // "game" | "shot" | null
  const [periodInput, setPeriodInput] = useState("");

  const periodLenMs = (timer?.period_length_seconds || 0) * 1000;
  const shotLenMs = (timer?.shot_clock_length_seconds || 0) * 1000;
  const showShotClock = (timer?.shot_clock_length_seconds || 0) > 0;
  const bothStopped = !gameClockRunning && !shotClockRunning;

  const now = Date.now();
  const isoIn = (ms) => new Date(now + ms).toISOString();

  // --- Game clock actions ---
  const startGame = () => {
    const remaining = gameClockMs > 0 ? gameClockMs : periodLenMs;
    onPatch({
      game_clock_running: true,
      game_clock_end_iso: isoIn(remaining),
      game_clock_remaining_ms: remaining,
    });
  };
  const pauseGame = () => {
    onPatch({
      game_clock_running: false,
      game_clock_end_iso: null,
      game_clock_remaining_ms: Math.max(0, gameClockMs),
    });
  };
  const requestResetGame = () => {
    if (!bothStopped) return;
    setResetTarget("game");
  };
  const doResetGame = () => {
    onPatch({
      game_clock_running: false,
      game_clock_end_iso: null,
      game_clock_remaining_ms: periodLenMs,
    });
    setResetTarget(null);
  };
  const adjustGameClock = () => {
    const ms = parseClockInput(adjustGame);
    if (ms === null) return;
    onPatch({
      game_clock_running: false,
      game_clock_end_iso: null,
      game_clock_remaining_ms: Math.max(0, ms),
    });
    setAdjustGame("");
  };

  // --- Shot clock actions ---
  const startShot = () => {
    const remaining = shotClockMs > 0 ? shotClockMs : shotLenMs;
    onPatch({
      shot_clock_running: true,
      shot_clock_end_iso: isoIn(remaining),
      shot_clock_remaining_ms: remaining,
    });
  };
  const pauseShot = () => {
    onPatch({
      shot_clock_running: false,
      shot_clock_end_iso: null,
      shot_clock_remaining_ms: Math.max(0, shotClockMs),
    });
  };
  const requestResetShot = () => {
    if (!bothStopped) return;
    setResetTarget("shot");
  };
  const doResetShot = () => {
    onPatch({
      shot_clock_running: false,
      shot_clock_end_iso: null,
      shot_clock_remaining_ms: shotLenMs,
      possession: null,
    });
    setResetTarget(null);
  };
  const adjustShotClock = () => {
    const secs = parseInt(adjustShot, 10);
    if (isNaN(secs)) return;
    onPatch({
      shot_clock_running: false,
      shot_clock_end_iso: null,
      shot_clock_remaining_ms: Math.max(0, secs * 1000),
    });
    setAdjustShot("");
  };

  // --- Period actions (always pause + reset both clocks) ---
  const changePeriod = (newPeriod) => {
    const clamped = Math.max(1, Math.min(timer?.period_count || 1, newPeriod));
    onPatch({
      current_period: clamped,
      game_clock_running: false,
      game_clock_end_iso: null,
      game_clock_remaining_ms: periodLenMs,
      shot_clock_running: false,
      shot_clock_end_iso: null,
      shot_clock_remaining_ms: shotLenMs,
    });
  };
  const setPeriod = () => {
    const p = parseInt(periodInput, 10);
    if (!isNaN(p)) changePeriod(p);
    setPeriodInput("");
  };

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="border-b border-border py-4">
        <CardTitle className="flex items-center justify-between text-base">
          <span>{pLabel}</span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
            {timer?.period_structure || "quarters"} · {timer?.period_count} total
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Game clock */}
        <div className="text-center">
          <p className="text-[11px] font-heading font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Game Clock
          </p>
          <div
            className={`font-heading font-bold tabular-nums leading-none text-7xl sm:text-8xl ${
              gameClockRunning ? "text-primary" : "text-foreground"
            }`}
          >
            {formatGameClock(gameClockMs)}
          </div>
          <div className="flex items-center justify-center gap-2 mt-4">
            {gameClockRunning ? (
              <Button onClick={pauseGame} variant="outline" className="font-medium">
                <Pause className="w-4 h-4 mr-2" /> Pause
              </Button>
            ) : (
              <Button onClick={startGame} className="font-medium">
                <Play className="w-4 h-4 mr-2" /> Start
              </Button>
            )}
            <Button
              onClick={requestResetGame}
              variant="outline"
              disabled={!bothStopped}
              className="font-medium"
              title={bothStopped ? "Reset game clock" : "Pause both clocks to reset"}
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Reset
            </Button>
          </div>
          <div className="flex items-center justify-center gap-2 mt-3">
            <Input
              value={adjustGame}
              onChange={(e) => setAdjustGame(e.target.value)}
              placeholder="M:SS"
              className="w-28 bg-background border border-border text-foreground font-medium text-center"
            />
            <Button onClick={adjustGameClock} variant="ghost" size="sm" className="font-medium">
              Set time
            </Button>
          </div>
        </div>

        {/* Shot clock */}
        {showShotClock && (
          <div className="text-center border-t border-border pt-6">
            <p className="text-[11px] font-heading font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Shot Clock
            </p>
            <div
              className={`font-heading font-bold tabular-nums leading-none text-6xl ${
                shotClockRunning ? "text-destructive" : "text-foreground"
              }`}
            >
              {formatShotClock(shotClockMs)}
            </div>
            <div className="flex items-center justify-center gap-2 mt-4">
              {shotClockRunning ? (
                <Button onClick={pauseShot} variant="outline" className="font-medium">
                  <Pause className="w-4 h-4 mr-2" /> Pause
                </Button>
              ) : (
                <Button onClick={startShot} variant="outline" className="font-medium">
                  <Play className="w-4 h-4 mr-2" /> Start
                </Button>
              )}
              <Button
                onClick={requestResetShot}
                variant="outline"
                disabled={!bothStopped}
                className="font-medium"
                title={bothStopped ? "Reset shot clock" : "Pause both clocks to reset"}
              >
                <RotateCcw className="w-4 h-4 mr-2" /> Reset
              </Button>
              <Button
                onClick={doResetShot}
                variant="ghost"
                size="sm"
                disabled={!bothStopped}
                className="font-medium"
                title="Reset shot clock to full"
              >
                <Plus className="w-4 h-4 mr-1" /> {timer?.shot_clock_length_seconds}
              </Button>
            </div>
            <div className="flex items-center justify-center gap-2 mt-3">
              <Input
                value={adjustShot}
                onChange={(e) => setAdjustShot(e.target.value)}
                placeholder="seconds"
                type="number"
                min="0"
                className="w-28 bg-background border border-border text-foreground font-medium text-center"
              />
              <Button onClick={adjustShotClock} variant="ghost" size="sm" className="font-medium">
                Set time
              </Button>
            </div>
          </div>
        )}

        {/* Ball Possession */}
        {showShotClock && (
          <div className="border-t border-border pt-6">
            <p className="text-[11px] font-heading font-bold uppercase tracking-widest text-muted-foreground mb-3 text-center">
              Ball Possession
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button
                onClick={() => onPatch({ possession: "home" })}
                variant={timer?.possession === "home" ? "default" : "outline"}
                className="font-medium"
              >
                {homeTeamName} Ball
              </Button>
              <Button
                onClick={() => onPatch({ possession: "away" })}
                variant={timer?.possession === "away" ? "default" : "outline"}
                className="font-medium"
              >
                {awayTeamName} Ball
              </Button>
            </div>
          </div>
        )}

        {/* Period controls */}
        <div className="border-t border-border pt-6 flex items-center justify-center gap-3">
          <Button onClick={() => changePeriod((timer?.current_period || 1) - 1)} variant="outline" size="sm" className="font-medium">
            <SkipBack className="w-4 h-4 mr-1" /> Prev
          </Button>
          <div className="flex items-center gap-2">
            <Input
              value={periodInput}
              onChange={(e) => setPeriodInput(e.target.value)}
              placeholder={`${timer?.current_period || 1}`}
              type="number"
              min="1"
              max={timer?.period_count || 1}
              className="w-16 bg-background border border-border text-foreground font-medium text-center"
            />
            <Button onClick={setPeriod} variant="ghost" size="sm" className="font-medium">
              Set
            </Button>
          </div>
          <Button onClick={() => changePeriod((timer?.current_period || 1) + 1)} variant="outline" size="sm" className="font-medium">
            Next <SkipForward className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>

      {/* Reset confirmation — only reachable when both clocks are stopped */}
      <AlertDialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-heading font-bold">
              Reset {resetTarget === "game" ? "Game Clock" : "Shot Clock"}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium">
              This will reset the {resetTarget === "game" ? "game clock" : "shot clock"} back to its full length. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-medium">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={resetTarget === "game" ? doResetGame : doResetShot}
              className="font-medium"
            >
              Confirm Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}