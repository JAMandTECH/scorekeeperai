import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Timer as TimerIcon } from "lucide-react";
import { defaultTimerForGame } from "@/lib/timerLogic";

/**
 * Configuration form for a game timer.
 * - When `timer` is null: shows "Initialize Timer" (creates the record).
 * - When `timer` exists: shows "Save Config" (updates config fields).
 */
export default function TimerSetupCard({ game, timer, onInitialize, onSaveConfig, busy }) {
  const defaults = { ...defaultTimerForGame(game), ...(timer || {}) };
  const [periodLength, setPeriodLength] = useState(defaults.period_length_seconds / 60);
  const [periodCount, setPeriodCount] = useState(defaults.period_count);
  const [periodStructure, setPeriodStructure] = useState(defaults.period_structure);
  const [shotClock, setShotClock] = useState(defaults.shot_clock_length_seconds);

  // Re-sync when switching games / timer loads
  useEffect(() => {
    setPeriodLength((defaults.period_length_seconds || 600) / 60);
    setPeriodCount(defaults.period_count || 4);
    setPeriodStructure(defaults.period_structure || "quarters");
    setShotClock(defaults.shot_clock_length_seconds ?? 24);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer?.id, game?.id]);

  const buildConfig = () => ({
    period_length_seconds: Math.max(1, Math.round(Number(periodLength) * 60)),
    period_count: Math.max(1, parseInt(periodCount, 10) || 1),
    period_structure: periodStructure,
    shot_clock_length_seconds: Math.max(0, parseInt(shotClock, 10) || 0),
  });

  const handleInitialize = (e) => {
    e.preventDefault();
    onInitialize(buildConfig());
  };

  const handleSave = (e) => {
    e.preventDefault();
    onSaveConfig(buildConfig());
  };

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="border-b border-border py-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <TimerIcon className="w-4 h-4 text-primary" />
          {timer ? "Timer Configuration" : "Initialize Timer"}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={timer ? handleSave : handleInitialize} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="period-length" className="font-heading font-bold text-foreground">
                Period length (minutes)
              </Label>
              <Input
                id="period-length"
                type="number"
                min="1"
                step="0.5"
                value={periodLength}
                onChange={(e) => setPeriodLength(e.target.value)}
                className="bg-background border border-border text-foreground font-medium"
              />
            </div>
            <div>
              <Label htmlFor="period-count" className="font-heading font-bold text-foreground">
                Number of periods
              </Label>
              <Input
                id="period-count"
                type="number"
                min="1"
                max="10"
                value={periodCount}
                onChange={(e) => setPeriodCount(e.target.value)}
                className="bg-background border border-border text-foreground font-medium"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="period-structure" className="font-heading font-bold text-foreground">
              Period structure
            </Label>
            <select
              id="period-structure"
              value={periodStructure}
              onChange={(e) => setPeriodStructure(e.target.value)}
              className="w-full bg-background border border-border text-foreground px-3 py-2 font-medium"
            >
              <option value="quarters">Quarters</option>
              <option value="halves">Halves</option>
              <option value="sets">Sets</option>
              <option value="periods">Periods</option>
            </select>
          </div>

          <div>
            <Label htmlFor="shot-clock" className="font-heading font-bold text-foreground">
              Shot clock length (seconds, 0 = off)
            </Label>
            <Input
              id="shot-clock"
              type="number"
              min="0"
              max="99"
              value={shotClock}
              onChange={(e) => setShotClock(e.target.value)}
              className="bg-background border border-border text-foreground font-medium"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={busy} className="font-medium">
              {busy ? "Saving..." : timer ? "Save Config" : "Initialize Timer"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}