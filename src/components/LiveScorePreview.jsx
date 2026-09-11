import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { PlayCircle, Zap } from "lucide-react";

const mockTeams = {
  home: { name: "Thunder Hawks", logo: "🦅" },
  away: { name: "Storm Riders", logo: "⚡" }
};

const mockPlayers = [
  { name: "Jordan", number: "23", team: "home" },
  { name: "Bryant", number: "24", team: "away" },
  { name: "James", number: "6", team: "home" },
  { name: "Curry", number: "30", team: "away" }
];

export default function LiveScorePreview() {
  const [homeScore, setHomeScore] = useState(42);
  const [awayScore, setAwayScore] = useState(38);
  const [quarter, setQuarter] = useState(2);
  const [time, setTime] = useState("7:23");
  const [lastScorer, setLastScorer] = useState(null);
  const [recentEvent, setRecentEvent] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const scorer = Math.random() > 0.5 ? 'home' : 'away';
      const points = Math.random() > 0.7 ? 3 : 2;
      
      if (scorer === 'home') {
        setHomeScore(prev => prev + points);
      } else {
        setAwayScore(prev => prev + points);
      }

      const player = mockPlayers.filter(p => p.team === scorer)[Math.floor(Math.random() * 2)];
      setLastScorer({ ...player, points });
      setRecentEvent(`${player.name} scores ${points}!`);

      const [min, sec] = time.split(':').map(Number);
      let newSec = sec - Math.floor(Math.random() * 15 + 5);
      let newMin = min;
      
      if (newSec < 0) {
        newMin--;
        newSec = 59 + newSec;
      }
      
      if (newMin < 0) {
        setQuarter(prev => (prev >= 4 ? 1 : prev + 1));
        setTime("12:00");
      } else {
        setTime(`${newMin}:${newSec.toString().padStart(2, '0')}`);
      }

      setTimeout(() => setRecentEvent(null), 2000);
    }, 3000);

    return () => clearInterval(interval);
  }, [time]);

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="border-b border-border py-3 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="live-dot" />
          <span className="text-sm font-medium">Game 24 • Regular Season</span>
        </div>
        <div className="text-center">
          <div className="font-heading text-xl font-bold tabular-nums">{time}</div>
          <div className="text-xs text-muted-foreground">Q{quarter}</div>
        </div>
      </div>

      {/* Scores */}
      <div className="p-8">
        <div className="grid grid-cols-3 gap-6 items-center mb-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto border border-border flex items-center justify-center text-3xl mb-3">
              {mockTeams.home.logo}
            </div>
            <h3 className="font-heading font-bold text-base mb-2">{mockTeams.home.name}</h3>
            <motion.div 
              key={homeScore}
              initial={{ scale: 1.2, color: 'hsl(var(--primary))' }}
              animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
              transition={{ duration: 0.4 }}
              className="font-heading text-5xl font-bold tabular-nums"
            >
              {homeScore}
            </motion.div>
          </div>

          <div className="text-center">
            <div className="text-sm text-muted-foreground">vs</div>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 mx-auto border border-border flex items-center justify-center text-3xl mb-3">
              {mockTeams.away.logo}
            </div>
            <h3 className="font-heading font-bold text-base mb-2">{mockTeams.away.name}</h3>
            <motion.div 
              key={awayScore}
              initial={{ scale: 1.2, color: 'hsl(var(--primary))' }}
              animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
              transition={{ duration: 0.4 }}
              className="font-heading text-5xl font-bold tabular-nums"
            >
              {awayScore}
            </motion.div>
          </div>
        </div>

        {/* Recent Event */}
        <AnimatePresence mode="wait">
          {recentEvent && (
            <motion.div
              key={recentEvent}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="mt-6"
            >
              <div className="border border-primary/30 bg-primary/5 p-4 flex items-center justify-center gap-3">
                <Zap className="w-5 h-5 text-primary" />
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Latest Action</div>
                  <div className="font-heading font-bold text-base">
                    #{lastScorer?.number} {lastScorer?.name} • {lastScorer?.points} PTS
                  </div>
                </div>
                <Zap className="w-5 h-5 text-primary" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-px bg-border border border-border mt-6">
          <div className="bg-card p-3 text-center">
            <div className="font-heading text-xl font-bold tabular-nums">12</div>
            <div className="text-xs text-muted-foreground">Rebounds</div>
          </div>
          <div className="bg-card p-3 text-center">
            <div className="font-heading text-xl font-bold tabular-nums">8</div>
            <div className="text-xs text-muted-foreground">Assists</div>
          </div>
          <div className="bg-card p-3 text-center">
            <div className="font-heading text-xl font-bold tabular-nums">5</div>
            <div className="text-xs text-muted-foreground">Steals</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border py-3 px-6">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <PlayCircle className="w-3.5 h-3.5" />
          Real-time scoring • Live updates • Instant statistics
        </div>
      </div>
    </Card>
  );
}