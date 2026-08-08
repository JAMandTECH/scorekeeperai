import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, Trophy, Users, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Credit-saving controls: cache AI insights for 24h and throttle manual refreshes.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const REFRESH_COOLDOWN_MS = 30000; // 30 seconds

export default function AIInsights({ teams, players, games, organizationName }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const cooldownTimer = useRef(null);

  // Cache key derived from the exact data signature the insights depend on,
  // so cached results are only reused when the underlying data is unchanged.
  const getCacheKey = () => {
    const basketballTeams = teams.filter(t => t.sport === 'basketball').length;
    const volleyballTeams = teams.filter(t => t.sport === 'volleyball').length;
    const completedGames = games.filter(g => g.status === 'completed').length;
    const upcomingGames = games.filter(g => g.status === 'scheduled').length;
    return `ai-insights-${organizationName || 'ALAB'}-b${basketballTeams}-v${volleyballTeams}-p${players.length}-c${completedGames}-u${upcomingGames}`;
  };

  const loadFromCache = () => {
    try {
      const raw = localStorage.getItem(getCacheKey());
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed.timestamp || Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
      return Array.isArray(parsed.insights) ? parsed.insights : null;
    } catch {
      return null;
    }
  };

  const saveToCache = (insightsData) => {
    try {
      localStorage.setItem(getCacheKey(), JSON.stringify({ timestamp: Date.now(), insights: insightsData }));
    } catch {
      // Storage may be full or unavailable — silently skip, generation still works.
    }
  };

  const generateInsights = async (force = false) => {
    // Serve cached insights when available and fresh (unless forced by manual refresh).
    if (!force) {
      const cached = loadFromCache();
      if (cached) {
        setInsights(cached);
        return;
      }
    }

    setLoading(true);
    try {
      // Prepare data summary
      const basketballTeams = teams.filter(t => t.sport === 'basketball').length;
      const volleyballTeams = teams.filter(t => t.sport === 'volleyball').length;
      const completedGames = games.filter(g => g.status === 'completed').length;
      const upcomingGames = games.filter(g => g.status === 'scheduled').length;

      const prompt = `As a sports analytics AI, analyze this league data and provide 3-5 key insights:

League: ${organizationName || 'ALAB Sports'}
- Basketball Teams: ${basketballTeams}
- Volleyball Teams: ${volleyballTeams}
- Total Players: ${players.length}
- Completed Games: ${completedGames}
- Upcoming Games: ${upcomingGames}

Provide insights in JSON format:
{
  "insights": [
    {
      "title": "Brief title (3-5 words)",
      "description": "One sentence insight",
      "type": "success|info|warning",
      "icon": "trophy|trending|users"
    }
  ]
}

Focus on: league growth, team participation, player engagement, and upcoming events.`;

      const schema = {
        type: "object",
        properties: {
          insights: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                type: { type: "string" },
                icon: { type: "string" }
              }
            }
          }
        }
      };

      let insightsOut = [];
      try {
        // Use the cost-efficient model for this structured summarization task.
        const result = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema, model: "gpt_5_mini" });
        insightsOut = result.insights || [];
      } catch (err) {
        try {
          const { data } = await base44.functions.invoke('geminiChat', { prompt, response_json_schema: schema });
          const out = data?.output;
          insightsOut = out?.insights || [];
        } catch (e2) {
          insightsOut = [];
        }
      }

      setInsights(insightsOut);
      saveToCache(insightsOut);
    } catch (error) {
      console.error("Error generating insights:", error);
      setInsights([]);
    }
    setLoading(false);
  };

  // Manual refresh: force regeneration and apply a cooldown to prevent rapid-fire calls.
  const handleManualRefresh = () => {
    if (cooldown || loading) return;
    generateInsights(true);
    setCooldown(true);
    if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    cooldownTimer.current = setTimeout(() => setCooldown(false), REFRESH_COOLDOWN_MS);
  };

  useEffect(() => {
    if (teams.length > 0 || games.length > 0) {
      generateInsights();
    }
    return () => { if (cooldownTimer.current) clearTimeout(cooldownTimer.current); };
  }, [teams.length, games.length]);

  const getIcon = (iconName) => {
    switch(iconName) {
      case 'trophy': return <Trophy className="w-5 h-5" />;
      case 'trending': return <TrendingUp className="w-5 h-5" />;
      case 'users': return <Users className="w-5 h-5" />;
      default: return <Sparkles className="w-5 h-5" />;
    }
  };

  const getColorClass = (type) => {
    switch(type) {
      case 'success': return 'from-green-500 to-emerald-600';
      case 'warning': return 'from-yellow-500 to-orange-600';
      default: return 'from-blue-500 to-indigo-600';
    }
  };

  if (!insights && !loading) return null;

  return (
    <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-950/30 shadow-xl">
      <CardHeader className="border-b-2 border-purple-100 dark:border-purple-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-xl font-black text-gray-900 dark:text-white">
              AI Insights
            </CardTitle>
          </div>
          <Button
            onClick={handleManualRefresh}
            disabled={loading || cooldown}
            size="sm"
            variant="outline"
            className="border-purple-300 dark:border-purple-700"
            title={cooldown ? "Please wait a moment before refreshing" : "Refresh insights"}
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {insights && insights.map((insight, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-900 rounded-xl p-4 border-2 border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 bg-gradient-to-br ${getColorClass(insight.type)} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    {getIcon(insight.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                      {insight.title}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {insight.description}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${
                      insight.type === 'success' ? 'border-green-400 text-green-700 dark:text-green-400' :
                      insight.type === 'warning' ? 'border-yellow-400 text-yellow-700 dark:text-yellow-400' :
                      'border-blue-400 text-blue-700 dark:text-blue-400'
                    } font-bold text-[10px]`}
                  >
                    AI
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}