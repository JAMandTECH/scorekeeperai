import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, RefreshCw } from "lucide-react";

export default function AIGameSummary({ game, homeTeam, awayTeam, topPlayers }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateSummary = async () => {
    setLoading(true);
    try {
      const prompt = `Generate an exciting, professional sports game summary for this ${game.sport} game:

Game Details:
- Home Team: ${homeTeam.name} (${game.home_score} points)
- Away Team: ${awayTeam.name} (${game.away_score} points)
- Date: ${new Date(game.game_date).toLocaleDateString()}
- Location: ${game.location || 'N/A'}
${game.quarter_scores ? `- Quarter Scores: ${game.quarter_scores.map((q, i) => `Q${i+1}: ${q.home}-${q.away}`).join(', ')}` : ''}

Top Performers:
${topPlayers.map(p => `- ${p.name}: ${p.stats}`).join('\n')}

Write a 3-paragraph summary (100-150 words total) covering:
1. Game outcome and key moments
2. Top player performances
3. What this means for both teams

Keep it exciting and engaging for fans!`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
      });

      setSummary(result);
    } catch (error) {
      console.error("Error generating summary:", error);
      setSummary("Unable to generate summary at this time. Please try again later.");
    }
    setLoading(false);
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-2 border-purple-200 dark:border-purple-800">
      <CardContent className="p-4">
        {!summary ? (
          <Button
            onClick={generateSummary}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating AI Summary...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate AI Game Summary
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-bold text-purple-900 dark:text-purple-300">
                AI-Generated Game Summary
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {summary}
            </p>
            <Button
              onClick={generateSummary}
              disabled={loading}
              size="sm"
              variant="outline"
              className="w-full border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 font-semibold"
            >
              <RefreshCw className="w-3 h-3 mr-2" />
              Regenerate
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}