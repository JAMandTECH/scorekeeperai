import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Zap } from "lucide-react";

const mockTeams = {
  home: {
    name: "Thunder Hawks",
    color: "from-orange-500 to-red-600",
    logo: "🦅"
  },
  away: {
    name: "Storm Riders",
    color: "from-blue-500 to-indigo-600",
    logo: "⚡"
  }
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
      // Randomly update scores
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

      // Simulate time countdown
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
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-3xl"></div>
      
      <Card className="relative overflow-hidden border-4 border-gray-200 dark:border-gray-700 shadow-2xl bg-gradient-to-br from-white via-blue-50/50 to-purple-50/50 dark:from-gray-900 dark:via-blue-950/30 dark:to-purple-950/30">
        {/* Live Badge */}
        <div className="absolute top-4 right-4 z-10">
          <Badge className="bg-red-500 text-white font-bold px-4 py-2 animate-pulse shadow-lg">
            <div className="w-2 h-2 bg-white rounded-full mr-2 animate-ping"></div>
            LIVE DEMO
          </Badge>
        </div>

        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 dark:from-black dark:via-gray-900 dark:to-indigo-950 text-white py-4 px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-green-400" />
              <span className="font-bold text-sm">Game 24 • Regular Season</span>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black">{time}</div>
              <div className="text-xs text-blue-300 font-semibold">Q{quarter}</div>
            </div>
          </div>
        </div>

        {/* Scores */}
        <div className="p-8">
          <div className="grid grid-cols-3 gap-6 items-center mb-6">
            {/* Home Team */}
            <motion.div 
              className="text-center"
              animate={lastScorer?.team === 'home' ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <div className={`w-20 h-20 mx-auto bg-gradient-to-br ${mockTeams.home.color} rounded-2xl flex items-center justify-center text-5xl shadow-lg mb-3`}>
                {mockTeams.home.logo}
              </div>
              <h3 className="font-black text-gray-900 dark:text-white text-lg mb-2">{mockTeams.home.name}</h3>
              <motion.div 
                key={homeScore}
                initial={{ scale: 1.3, color: '#10b981' }}
                animate={{ scale: 1, color: '#1f2937' }}
                transition={{ duration: 0.4 }}
                className="text-6xl font-black text-gray-900 dark:text-white"
              >
                {homeScore}
              </motion.div>
            </motion.div>

            {/* VS Divider */}
            <div className="text-center">
              <div className="text-3xl font-black text-gray-400 dark:text-gray-600">VS</div>
            </div>

            {/* Away Team */}
            <motion.div 
              className="text-center"
              animate={lastScorer?.team === 'away' ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <div className={`w-20 h-20 mx-auto bg-gradient-to-br ${mockTeams.away.color} rounded-2xl flex items-center justify-center text-5xl shadow-lg mb-3`}>
                {mockTeams.away.logo}
              </div>
              <h3 className="font-black text-gray-900 dark:text-white text-lg mb-2">{mockTeams.away.name}</h3>
              <motion.div 
                key={awayScore}
                initial={{ scale: 1.3, color: '#10b981' }}
                animate={{ scale: 1, color: '#1f2937' }}
                transition={{ duration: 0.4 }}
                className="text-6xl font-black text-gray-900 dark:text-white"
              >
                {awayScore}
              </motion.div>
            </motion.div>
          </div>

          {/* Recent Event */}
          <AnimatePresence mode="wait">
            {recentEvent && (
              <motion.div
                key={recentEvent}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="mt-6"
              >
                <div className="bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-teal-500/20 border-2 border-green-400 dark:border-green-600 rounded-xl p-4 flex items-center justify-center gap-3">
                  <Zap className="w-6 h-6 text-green-600 dark:text-green-400" />
                  <div className="text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Latest Action</div>
                    <div className="text-xl font-black text-gray-900 dark:text-white">
                      #{lastScorer?.number} {lastScorer?.name} • {lastScorer?.points} PTS
                    </div>
                  </div>
                  <Zap className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4 mt-6 text-center">
            <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 rounded-xl p-3 border-2 border-orange-200 dark:border-orange-800">
              <div className="text-2xl font-black text-orange-600 dark:text-orange-400">12</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold">Rebounds</div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl p-3 border-2 border-blue-200 dark:border-blue-800">
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">8</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold">Assists</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-xl p-3 border-2 border-purple-200 dark:border-purple-800">
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400">5</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold">Steals</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gradient-to-r from-gray-100 to-blue-50 dark:from-gray-800 dark:to-blue-950/30 py-3 px-6 border-t-2 border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 font-semibold">
            <PlayCircle className="w-4 h-4" />
            Real-time scoring • Live updates • Instant statistics
          </div>
        </div>
      </Card>
    </div>
  );
}