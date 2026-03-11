import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function EditStatsDialog({
  isOpen,
  onClose,
  sport = "basketball",
  players = [], // [{id, label, teamId}]
  playerStatsMap = {}, // key: `${playerId}_${period}` -> stat obj
  currentMaxPeriod = 4,
  defaultPlayerId = null,
  defaultPeriod = 1,
  applyUpdates, // async (playerId, teamId, period, updates)
}) {
  const [mode, setMode] = useState("adjust"); // 'adjust' | 'reassign'

  // Adjust mode state
  const [playerId, setPlayerId] = useState(defaultPlayerId || (players[0]?.id ?? null));
  const [period, setPeriod] = useState(defaultPeriod || 1);
  const baseStatKeys = sport === "basketball"
    ? ["points", "rebounds", "assists", "steals", "blocks", "fouls"]
    : ["attacks", "blocks", "aces", "assists", "rebounds", "rally_errors"];
  const [values, setValues] = useState(() => Object.fromEntries(baseStatKeys.map(k => [k, 0])));

  // Reassign mode state
  const [fromPlayerId, setFromPlayerId] = useState(players[0]?.id ?? null);
  const [fromPeriod, setFromPeriod] = useState(1);
  const [toPlayerId, setToPlayerId] = useState(players[0]?.id ?? null);
  const [toPeriod, setToPeriod] = useState(1);
  const [moveStat, setMoveStat] = useState(baseStatKeys[0]);
  const [moveAmount, setMoveAmount] = useState(1);

  const currentKey = useMemo(() => (playerId ? `${playerId}_${period}` : null), [playerId, period]);
  const currentStats = playerStatsMap[currentKey] || {};

  useEffect(() => {
    // Initialize values with current stats when dialog opens or selection changes
    if (!isOpen) return;
    const obj = {};
    baseStatKeys.forEach(k => { obj[k] = Number(currentStats?.[k] || 0); });
    setValues(obj);
  }, [isOpen, currentKey]);

  const handleSaveAdjust = async () => {
    if (!playerId) return;
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    const updates = [];
    baseStatKeys.forEach((k) => {
      const prev = Number(currentStats?.[k] || 0);
      const next = Number(values[k] || 0);
      const delta = next - prev;
      if (delta !== 0) updates.push({ statType: k, value: delta });
    });
    if (updates.length === 0) { onClose?.(); return; }
    await applyUpdates(playerId, player.teamId, Number(period) || 1, updates);
    onClose?.();
  };

  const handleSaveReassign = async () => {
    if (!fromPlayerId || !toPlayerId || moveAmount <= 0) return;
    const fromPlayer = players.find(p => p.id === fromPlayerId);
    const toPlayer = players.find(p => p.id === toPlayerId);
    if (!fromPlayer || !toPlayer) return;
    const amt = Number(moveAmount) || 0;
    if (amt <= 0) return;
    // Negative on source, positive on dest
    await applyUpdates(fromPlayerId, fromPlayer.teamId, Number(fromPeriod) || 1, [{ statType: moveStat, value: -amt }]);
    await applyUpdates(toPlayerId, toPlayer.teamId, Number(toPeriod) || 1, [{ statType: moveStat, value: amt }]);
    onClose?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="bg-white dark:bg-gray-900 border-2 border-yellow-400 max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white text-2xl font-black">Edit Player Statistics</DialogTitle>
          <DialogDescription className="text-gray-700 dark:text-gray-300 font-bold">
            {sport === 'basketball' ? 'Adjust quarter stats or reassign stats between players/quarters.' : 'Adjust set stats or reassign stats between players/sets.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button onClick={() => setMode('adjust')} variant={mode === 'adjust' ? 'default' : 'outline'} className="font-bold">Adjust Stats</Button>
          <Button onClick={() => setMode('reassign')} variant={mode === 'reassign' ? 'default' : 'outline'} className="font-bold">Reassign Stats</Button>
        </div>

        {mode === 'adjust' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-bold">Player</Label>
                <select value={playerId || ''} onChange={(e) => setPlayerId(e.target.value)} className="w-full mt-1 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 font-medium">
                  {players.map((p) => (
                    <option value={p.id} key={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="font-bold">{sport === 'basketball' ? 'Quarter' : 'Set'}</Label>
                <Input type="number" min={1} max={Math.max(1, currentMaxPeriod)} value={period} onChange={(e) => setPeriod(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {baseStatKeys.map((k) => (
                <div key={k}>
                  <Label className="uppercase text-xs font-bold">{k.replace('_', ' ')}</Label>
                  <Input type="number" min={0} value={values[k]} onChange={(e) => setValues(v => ({ ...v, [k]: Number(e.target.value) }))} />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose} className="font-bold">Cancel</Button>
              <Button onClick={handleSaveAdjust} className="bg-yellow-600 hover:bg-yellow-700 text-white font-black">Save Changes</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-bold">From Player</Label>
                <select value={fromPlayerId || ''} onChange={(e) => setFromPlayerId(e.target.value)} className="w-full mt-1 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 font-medium">
                  {players.map((p) => (
                    <option value={p.id} key={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="font-bold">From {sport === 'basketball' ? 'Quarter' : 'Set'}</Label>
                <Input type="number" min={1} value={fromPeriod} onChange={(e) => setFromPeriod(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="font-bold">To Player</Label>
                <select value={toPlayerId || ''} onChange={(e) => setToPlayerId(e.target.value)} className="w-full mt-1 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 font-medium">
                  {players.map((p) => (
                    <option value={p.id} key={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="font-bold">To {sport === 'basketball' ? 'Quarter' : 'Set'}</Label>
                <Input type="number" min={1} value={toPeriod} onChange={(e) => setToPeriod(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="font-bold">Stat</Label>
                <select value={moveStat} onChange={(e) => setMoveStat(e.target.value)} className="w-full mt-1 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 font-medium">
                  {baseStatKeys.map(k => <option key={k} value={k}>{k.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <Label className="font-bold">Amount</Label>
                <Input type="number" min={1} value={moveAmount} onChange={(e) => setMoveAmount(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose} className="font-bold">Cancel</Button>
              <Button onClick={handleSaveReassign} className="bg-yellow-600 hover:bg-yellow-700 text-white font-black">Move Stat</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}