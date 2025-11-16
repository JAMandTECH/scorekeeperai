import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, Calendar, Clock, MapPin } from "lucide-react";

export default function ConflictResolver({ conflicts, gameDate, courtNumber, allGames, onSelectAlternative }) {
  const [showAlternatives, setShowAlternatives] = useState(false);

  const generateAlternatives = () => {
    const alternatives = [];
    const startTime = new Date(gameDate);
    const courts = ['1', '2', '3', '4', 'A', 'B'];
    
    // Try different courts at same time
    courts.forEach(court => {
      if (court !== courtNumber) {
        const conflictingGames = allGames.filter(game => {
          if (game.status === 'completed' || game.court_number !== court) return false;
          const existingStart = new Date(game.game_date);
          const existingEnd = new Date(existingStart.getTime() + (game.duration_hours || 1.5) * 60 * 60 * 1000);
          const newEnd = new Date(startTime.getTime() + 1.5 * 60 * 60 * 1000);
          return (startTime < existingEnd && newEnd > existingStart);
        });
        
        if (conflictingGames.length === 0) {
          alternatives.push({
            type: 'court',
            courtNumber: court,
            gameDate: gameDate,
            label: `Court ${court} at ${startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
            available: true
          });
        }
      }
    });
    
    // Try 1 hour earlier
    const earlierTime = new Date(startTime.getTime() - 60 * 60 * 1000);
    const earlierConflicts = allGames.filter(game => {
      if (game.status === 'completed' || game.court_number !== courtNumber) return false;
      const existingStart = new Date(game.game_date);
      const existingEnd = new Date(existingStart.getTime() + (game.duration_hours || 1.5) * 60 * 60 * 1000);
      const newEnd = new Date(earlierTime.getTime() + 1.5 * 60 * 60 * 1000);
      return (earlierTime < existingEnd && newEnd > existingStart);
    });
    
    if (earlierConflicts.length === 0) {
      alternatives.push({
        type: 'time',
        courtNumber: courtNumber,
        gameDate: earlierTime.toISOString(),
        label: `1 hour earlier - ${earlierTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
        available: true
      });
    }
    
    // Try 1 hour later
    const laterTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    const laterConflicts = allGames.filter(game => {
      if (game.status === 'completed' || game.court_number !== courtNumber) return false;
      const existingStart = new Date(game.game_date);
      const existingEnd = new Date(existingStart.getTime() + (game.duration_hours || 1.5) * 60 * 60 * 1000);
      const newEnd = new Date(laterTime.getTime() + 1.5 * 60 * 60 * 1000);
      return (laterTime < existingEnd && newEnd > existingStart);
    });
    
    if (laterConflicts.length === 0) {
      alternatives.push({
        type: 'time',
        courtNumber: courtNumber,
        gameDate: laterTime.toISOString(),
        label: `1 hour later - ${laterTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
        available: true
      });
    }
    
    return alternatives.slice(0, 5); // Return max 5 alternatives
  };

  const alternatives = generateAlternatives();

  if (conflicts.length === 0) {
    return (
      <Alert className="bg-green-50 dark:bg-green-950/30 border-2 border-green-500">
        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
        <AlertDescription className="text-green-800 dark:text-green-300 font-bold">
          ✓ No scheduling conflicts detected! This time slot is available.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      <Alert className="bg-red-50 dark:bg-red-950/30 border-2 border-red-500">
        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
        <AlertDescription className="text-red-800 dark:text-red-300 font-bold">
          <p className="font-black mb-2">⚠️ SCHEDULING CONFLICT DETECTED!</p>
          <p className="text-sm">The selected court and time overlaps with {conflicts.length} existing game(s)</p>
        </AlertDescription>
      </Alert>

      {alternatives.length > 0 && (
        <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
          <CardHeader>
            <CardTitle className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Suggested Alternatives
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alternatives.map((alt, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg p-3 border border-blue-200 dark:border-blue-700"
              >
                <div className="flex items-center gap-2">
                  {alt.type === 'court' ? (
                    <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  )}
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {alt.label}
                  </span>
                  <Badge className="bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 text-xs">
                    Available
                  </Badge>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onSelectAlternative(alt)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Use This
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}