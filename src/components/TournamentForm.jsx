import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

export default function TournamentForm({ teams, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: "",
    sport: "basketball",
    division: "",
    num_teams: 8,
    start_date: "",
    end_date: "",
  });

  const [bestOfSettings, setBestOfSettings] = useState({
    quarter_finals: 1,
    semi_finals: 3,
    finals: 5,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, best_of_settings: bestOfSettings });
  };

  const getRoundsForTeamCount = (numTeams) => {
    const rounds = [];
    if (numTeams >= 16) rounds.push("round_of_16");
    if (numTeams >= 8) rounds.push("quarter_finals");
    if (numTeams >= 4) rounds.push("semi_finals");
    rounds.push("finals");
    return rounds;
  };

  const rounds = getRoundsForTeamCount(formData.num_teams);

  return (
    <Card className="border-2 border-blue-200 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl font-black">
          <Trophy className="w-6 h-6 text-blue-600" />
          Create Tournament
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="font-bold">Tournament Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Season 2025 Playoffs"
              required
              className="font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sport" className="font-bold">Sport *</Label>
              <select
                id="sport"
                value={formData.sport}
                onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 font-medium"
                required
              >
                <option value="basketball">Basketball</option>
                <option value="volleyball">Volleyball</option>
              </select>
            </div>

            <div>
              <Label htmlFor="num_teams" className="font-bold">Number of Teams *</Label>
              <select
                id="num_teams"
                value={formData.num_teams}
                onChange={(e) => setFormData({ ...formData, num_teams: parseInt(e.target.value) })}
                className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 font-medium"
                required
              >
                <option value="4">4 Teams</option>
                <option value="8">8 Teams</option>
                <option value="16">16 Teams</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="division" className="font-bold">Division</Label>
            <Input
              id="division"
              value={formData.division}
              onChange={(e) => setFormData({ ...formData, division: e.target.value })}
              placeholder="e.g., Division A"
              className="font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date" className="font-bold">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
                className="font-medium"
              />
            </div>
            <div>
              <Label htmlFor="end_date" className="font-bold">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="font-medium"
              />
            </div>
          </div>

          <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
            <Label className="font-bold text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-orange-600" />
              Best of Series Configuration
            </Label>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure how many games teams need to win in each round
            </p>
            {rounds.map((round) => (
              <div key={round} className="flex items-center justify-between">
                <span className="text-sm font-semibold capitalize text-gray-700 dark:text-gray-300">
                  {round.replace(/_/g, " ")}
                </span>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-gray-500">Best of:</Label>
                  <select
                    value={bestOfSettings[round] || 1}
                    onChange={(e) => setBestOfSettings({ ...bestOfSettings, [round]: parseInt(e.target.value) })}
                    className="w-20 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm font-bold"
                  >
                    <option value="1">1</option>
                    <option value="3">3</option>
                    <option value="5">5</option>
                    <option value="7">7</option>
                  </select>
                  <Badge variant="outline" className="text-xs">
                    Win {Math.ceil((bestOfSettings[round] || 1) / 2)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} className="font-bold">
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold">
              Create Tournament
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}