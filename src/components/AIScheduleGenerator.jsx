import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Zap } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AIScheduleGenerator({ isOpen, onClose, onGenerate, isLoading, teams }) {
  const [sport, setSport] = useState("");
  const [rounds, setRounds] = useState("1");

  const canGenerate = sport && rounds;

  const handleGenerate = () => {
    if (canGenerate) {
      onGenerate(sport, parseInt(rounds));
    }
  };

  const availableSports = Array.from(new Set(teams.map(team => team.sport)));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-blue-600" /> AI Generate Schedule
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400 font-medium">
            Let the AI create a full season schedule based on your registered teams.
            Dates, times, venues, and scorekeepers will be added later.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="sport-select" className="font-bold text-gray-700 dark:text-gray-300">Sport</Label>
            <Select onValueChange={setSport} value={sport}>
              <SelectTrigger id="sport-select" className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium">
                <SelectValue placeholder="Select a sport" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600">
                {availableSports.map(s => (
                  <SelectItem key={s} value={s} className="font-medium">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="rounds-select" className="font-bold text-gray-700 dark:text-gray-300">Number of Rounds</Label>
            <Select onValueChange={setRounds} value={rounds}>
              <SelectTrigger id="rounds-select" className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium">
                <SelectValue placeholder="Select number of rounds" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600">
                <SelectItem value="1" className="font-medium">1 Round (Each team plays each other once)</SelectItem>
                <SelectItem value="2" className="font-medium">2 Rounds (Each team plays each other twice)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-100 dark:border-gray-700">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold">
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!canGenerate || isLoading}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold"
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><Zap className="w-4 h-4 mr-2" /> Generate Schedule</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}