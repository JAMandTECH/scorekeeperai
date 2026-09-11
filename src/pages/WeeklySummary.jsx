import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Sparkles, Upload, Image as ImageIcon, Video, Share2, Trophy, Calendar, Zap, Facebook, Twitter, Instagram, MessageCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { usePermissions } from "@/components/hooks/usePermissions";

export default function WeeklySummary() {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [aiSummary, setAiSummary] = useState("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [bestPlayerPhoto, setBestPlayerPhoto] = useState(null);
  const [bestPlayerPhotoUrl, setBestPlayerPhotoUrl] = useState("");
  const [uploadingPlayerPhoto, setUploadingPlayerPhoto] = useState(false);
  const [highlightMedia, setHighlightMedia] = useState([]);
  const [uploadingHighlight, setUploadingHighlight] = useState(false);
  const [generatedPosterUrl, setGeneratedPosterUrl] = useState("");
  const [selectedBestPlayer, setSelectedBestPlayer] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
      base44.auth.redirectToLogin(createPageUrl("WeeklySummary"));
    }
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogout = () => {
    base44.auth.logout(createPageUrl("PublicLanding"));
  };

  const { data: organization } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      const res = await base44.functions.invoke('getUserOrganization', {});
      return res?.data?.organization || null;
    },
    enabled: !!user?.organization_id,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams', user?.organization_id],
    queryFn: () => base44.entities.Team.filter({ organization_id: user?.organization_id }),
    enabled: !!user?.organization_id,
  });

  const { data: games = [] } = useQuery({
    queryKey: ['games', user?.organization_id],
    queryFn: () => base44.entities.Game.filter({ organization_id: user?.organization_id }),
    enabled: !!user?.organization_id,
  });

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['all-players', user?.organization_id],
    queryFn: async () => {
      const orgTeams = await base44.entities.Team.filter({ organization_id: user?.organization_id });
      const teamIds = orgTeams.map(t => t.id);
      if (teamIds.length === 0) return [];
      const players = await base44.entities.Player.list();
      return players.filter(p => teamIds.includes(p.team_id));
    },
    enabled: !!user?.organization_id,
  });

  const { data: allPlayerStats = [] } = useQuery({
    queryKey: ['all-player-stats', user?.organization_id],
    queryFn: () => base44.entities.PlayerGameStats.list(),
    enabled: !!user?.organization_id,
  });

  const weekGames = games.filter(g => g.week_number === selectedWeek && g.status === 'completed');

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Unknown';
  };

  const getBestPlayerForGame = (game) => {
    const gameStats = allPlayerStats.filter(s => s.game_id === game.id);
    
    if (game.sport === 'basketball') {
      const bestStat = gameStats.reduce((best, current) => {
        const currentPoints = current.points || 0;
        const bestPoints = best?.points || 0;
        return currentPoints > bestPoints ? current : best;
      }, null);
      
      if (bestStat) {
        const player = allPlayers.find(p => p.id === bestStat.player_id);
        return player ? {
          ...player,
          stats: `${bestStat.points} PTS • ${bestStat.rebounds || 0} REB • ${bestStat.assists || 0} AST`
        } : null;
      }
    } else if (game.sport === 'volleyball') {
      const bestStat = gameStats.reduce((best, current) => {
        const currentScore = (current.field_goals_made || 0) + (current.blocks || 0) + (current.three_pointers || 0);
        const bestScore = best ? ((best.field_goals_made || 0) + (best.blocks || 0) + (best.three_pointers || 0)) : 0;
        return currentScore > bestScore ? current : best;
      }, null);
      
      if (bestStat) {
        const player = allPlayers.find(p => p.id === bestStat.player_id);
        return player ? {
          ...player,
          stats: `${bestStat.field_goals_made || 0} ATK • ${bestStat.blocks || 0} BLK • ${bestStat.three_pointers || 0} ACE`
        } : null;
      }
    }
    
    return null;
  };

  const generateAISummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const gamesByDivisionAndSport = {};
      
      weekGames.forEach(game => {
        const homeTeam = teams.find(t => t.id === game.home_team_id);
        const division = homeTeam?.division || 'No Division';
        const sport = game.sport;
        const key = `${sport}_${division}`;
        
        if (!gamesByDivisionAndSport[key]) {
          gamesByDivisionAndSport[key] = { sport, division, games: [] };
        }
        
        const bestPlayer = getBestPlayerForGame(game);
        
        let result;
        if (sport === 'basketball') {
          result = `${getTeamName(game.home_team_id)} ${game.home_score} - ${game.away_score} ${getTeamName(game.away_team_id)}`;
        } else {
          const homeSetsWon = (game.quarter_scores || []).filter(s => s.home > s.away).length;
          const awaySetsWon = (game.quarter_scores || []).filter(s => s.away > s.home).length;
          result = `${getTeamName(game.home_team_id)} (${homeSetsWon} sets) vs ${getTeamName(game.away_team_id)} (${awaySetsWon} sets)`;
        }
        
        gamesByDivisionAndSport[key].games.push({
          result,
          bestPlayer: bestPlayer ? `${bestPlayer.first_name} ${bestPlayer.last_name} - ${bestPlayer.stats}` : null,
          date: new Date(game.game_date).toLocaleDateString()
        });
      });

      let prompt = `Generate an engaging and professional weekly sports summary for Week ${selectedWeek} of ${organization?.tournament_name || organization?.name || 'the league'}.\n\n`;
      
      Object.values(gamesByDivisionAndSport).forEach(({ sport, division, games }) => {
        prompt += `\n## ${sport.toUpperCase()} - ${division}\n`;
        games.forEach((game, idx) => {
          prompt += `Game ${idx + 1} (${game.date}): ${game.result}\n`;
          if (game.bestPlayer) {
            prompt += `  ⭐ Best Player: ${game.bestPlayer}\n`;
          }
        });
      });

      prompt += `\n\nWrite a comprehensive, exciting summary that:\n`;
      prompt += `1. Highlights the most exciting games and upsets\n`;
      prompt += `2. Celebrates standout player performances\n`;
      prompt += `3. Notes any significant milestones or achievements\n`;
      prompt += `4. Builds excitement for upcoming games\n`;
      prompt += `5. Uses engaging sports language and emoji where appropriate\n\n`;
      prompt += `Make it shareable and fan-friendly, around 300-400 words.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false,
      });

      setAiSummary(response);
    } catch (error) {
      console.error("Error generating AI summary:", error);
      alert("Failed to generate AI summary. Please try again.");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handlePlayerPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPlayerPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setBestPlayerPhotoUrl(file_url);
      setBestPlayerPhoto(file);
    } catch (error) {
      console.error("Error uploading player photo:", error);
      alert("Failed to upload photo. Please try again.");
    } finally {
      setUploadingPlayerPhoto(false);
    }
  };

  const handleHighlightUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingHighlight(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return {
          url: file_url,
          type: file.type.startsWith('video') ? 'video' : 'image',
          name: file.name
        };
      });

      const uploadedMedia = await Promise.all(uploadPromises);
      setHighlightMedia(prev => [...prev, ...uploadedMedia]);
    } catch (error) {
      console.error("Error uploading highlights:", error);
      alert("Failed to upload media. Please try again.");
    } finally {
      setUploadingHighlight(false);
    }
  };

  const generateBestPlayerPoster = async () => {
    if (!selectedBestPlayer || !bestPlayerPhotoUrl) {
      alert("Please select a best player and upload their photo first.");
      return;
    }

    setIsGeneratingPoster(true);
    try {
      const team = teams.find(t => t.id === selectedBestPlayer.team_id);
      const playerName = `${selectedBestPlayer.first_name} ${selectedBestPlayer.last_name}`;
      
      const prompt = `Create a professional sports poster design for "PLAYER OF THE WEEK" featuring:
- Large bold text: "PLAYER OF THE WEEK - WEEK ${selectedWeek}"
- Player name: "${playerName}"
- Team: "${team?.name || 'Unknown Team'}"
- Jersey number: #${selectedBestPlayer.jersey_number}
- Sport: ${team?.sport || 'Basketball'}
- Organization: "${organization?.name || 'ALAB Sports'}"
- Use vibrant sports colors (orange, blue, gold)
- Modern, dynamic design with action-themed graphics
- Include trophy and star elements
- Professional typography
- High energy aesthetic`;

      const { url } = await base44.integrations.Core.GenerateImage({ prompt });
      setGeneratedPosterUrl(url);
    } catch (error) {
      console.error("Error generating poster:", error);
      alert("Failed to generate poster. Please try again.");
    } finally {
      setIsGeneratingPoster(false);
    }
  };

  const shareToInternalFeed = async () => {
    if (!aiSummary) {
      alert("Please generate AI summary first.");
      return;
    }

    setIsSharing(true);
    try {
      const currentUser = await base44.auth.me();
      const mediaUrls = [];
      const mediaTypes = [];

      if (generatedPosterUrl) {
        mediaUrls.push(generatedPosterUrl);
        mediaTypes.push('image');
      }

      highlightMedia.forEach(media => {
        mediaUrls.push(media.url);
        mediaTypes.push(media.type);
      });

      await base44.entities.SocialPost.create({
        organization_id: user.organization_id,
        user_id: currentUser.id,
        user_name: currentUser.full_name,
        user_email: currentUser.email,
        content: `🏆 WEEK ${selectedWeek} RECAP 🏆\n\n${aiSummary}`,
        media_urls: mediaUrls,
        media_types: mediaTypes,
      });

      alert("Successfully shared to internal social feed!");
      queryClient.invalidateQueries(['social-posts']);
    } catch (error) {
      console.error("Error sharing to feed:", error);
      alert("Failed to share. Please try again.");
    } finally {
      setIsSharing(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Summary copied to clipboard! You can now paste it on external social media.");
  };

  const downloadPoster = () => {
    if (generatedPosterUrl) {
      window.open(generatedPosterUrl, '_blank');
    }
  };

  const removeHighlight = (index) => {
    setHighlightMedia(prev => prev.filter((_, i) => i !== index));
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const gamesByDivision = {};
  weekGames.forEach(game => {
    const homeTeam = teams.find(t => t.id === game.home_team_id);
    const division = homeTeam?.division || 'No Division';
    const sport = game.sport;
    const key = `${sport}_${division}`;
    
    if (!gamesByDivision[key]) {
      gamesByDivision[key] = { sport, division, games: [] };
    }
    gamesByDivision[key].games.push(game);
  });

  // Get all best players for selection
  const allBestPlayers = weekGames.map(game => {
    const bestPlayer = getBestPlayerForGame(game);
    if (bestPlayer) {
      const team = teams.find(t => t.id === bestPlayer.team_id);
      return {
        ...bestPlayer,
        teamName: team?.name,
        gameId: game.id,
        gameInfo: `${getTeamName(game.home_team_id)} vs ${getTeamName(game.away_team_id)}`
      };
    }
    return null;
  }).filter(Boolean);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminHeader 
        user={user}
        organization={organization}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        handleLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="flex">
        <AdminSidebar 
          user={user}
          organization={organization}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          handleLogout={handleLogout}
        />

        <main className="flex-1 min-w-0">
          <div className="p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
              {/* Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="font-heading text-3xl font-bold tracking-tight">Weekly Game Summary</h1>
                  <p className="text-muted-foreground mt-2 font-medium">AI-powered weekly recaps with highlights and best players</p>
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor="week-select" className="font-heading font-bold text-foreground">Week:</Label>
                  <Input
                    id="week-select"
                    type="number"
                    min="1"
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(parseInt(e.target.value) || 1)}
                    className="w-24 font-heading font-bold"
                  />
                </div>
              </div>

              {/* Week Games Overview */}
              <Card className="">
                <CardHeader className="border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 border border-border flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-heading font-bold">
                      Week {selectedWeek} - Game Results
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {weekGames.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground font-heading font-bold">No completed games found for Week {selectedWeek}</p>
                      <p className="text-sm text-muted-foreground mt-2">Select a different week or complete some games first.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {Object.values(gamesByDivision).map(({ sport, division, games: divGames }) => (
                        <div key={`${sport}_${division}`} className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="border-border text-muted-foreground font-heading font-bold px-4 py-1.5 uppercase">
                               {sport.toUpperCase()}
                             </Badge>
                            <h3 className="text-xl font-heading font-bold text-foreground">{division}</h3>
                          </div>
                          <div className="space-y-2">
                            {divGames.map(game => {
                              const bestPlayer = getBestPlayerForGame(game);
                              const homeTeamData = teams.find(t => t.id === game.home_team_id);
                              const awayTeamData = teams.find(t => t.id === game.away_team_id);
                              
                              return (
                                <div key={game.id} className="bg-muted border border-border p-4">
                                  <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs text-muted-foreground font-medium">
                                      {new Date(game.game_date).toLocaleDateString()}
                                    </span>
                                    <Badge variant="outline" className="border-primary text-primary font-medium">
                                      FINAL
                                    </Badge>
                                  </div>
                                  
                                  {sport === 'basketball' ? (
                                    <div className="flex justify-between items-center mb-3">
                                      <div className="flex items-center gap-2 flex-1">
                                        <Avatar className="w-10 h-10 border border-border">
                                          <AvatarImage src={homeTeamData?.logo_url} />
                                          <AvatarFallback className="bg-secondary text-foreground text-xs font-heading font-bold">
                                            {homeTeamData?.name?.substring(0, 2).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                          <div className="text-sm font-heading font-bold text-foreground">{getTeamName(game.home_team_id)}</div>
                                          <div className="text-3xl font-heading font-bold text-foreground tabular-nums">{game.home_score}</div>
                                        </div>
                                      </div>
                                      <div className="text-muted-foreground text-2xl font-heading font-bold px-4">-</div>
                                      <div className="flex items-center gap-2 flex-1 justify-end">
                                        <div className="flex-1 text-right">
                                          <div className="text-sm font-heading font-bold text-foreground">{getTeamName(game.away_team_id)}</div>
                                          <div className="text-3xl font-heading font-bold text-foreground tabular-nums">{game.away_score}</div>
                                        </div>
                                        <Avatar className="w-10 h-10 border border-border">
                                          <AvatarImage src={awayTeamData?.logo_url} />
                                          <AvatarFallback className="bg-secondary text-foreground text-xs font-heading font-bold">
                                            {awayTeamData?.name?.substring(0, 2).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <Avatar className="w-10 h-10 border border-border">
                                            <AvatarImage src={homeTeamData?.logo_url} />
                                            <AvatarFallback className="bg-secondary text-foreground text-xs font-heading font-bold">
                                              {homeTeamData?.name?.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span className="text-sm font-heading font-bold text-foreground">{getTeamName(game.home_team_id)}</span>
                                        </div>
                                        <span className="text-lg font-heading font-bold text-foreground tabular-nums">
                                          {(game.quarter_scores || []).filter(s => s.home > s.away).length} sets
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <Avatar className="w-10 h-10 border border-border">
                                            <AvatarImage src={awayTeamData?.logo_url} />
                                            <AvatarFallback className="bg-secondary text-foreground text-xs font-heading font-bold">
                                              {awayTeamData?.name?.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span className="text-sm font-heading font-bold text-foreground">{getTeamName(game.away_team_id)}</span>
                                        </div>
                                        <span className="text-lg font-heading font-bold text-foreground tabular-nums">
                                          {(game.quarter_scores || []).filter(s => s.away > s.home).length} sets
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {bestPlayer && (
                                    <div className="mt-3 pt-3 border-t border-border">
                                      <p className="text-xs text-muted-foreground font-medium mb-2">⭐ Best Player:</p>
                                      <div className="flex items-center gap-2 bg-muted border border-border p-2">
                                        <Avatar className="w-8 h-8 border border-border">
                                          <AvatarImage src={bestPlayer.photo_url} />
                                          <AvatarFallback className="bg-secondary text-foreground text-xs font-heading font-bold">
                                            {bestPlayer.jersey_number}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                          <p className="text-xs font-heading font-bold text-foreground">
                                            #{bestPlayer.jersey_number} {bestPlayer.first_name} {bestPlayer.last_name}
                                          </p>
                                          <p className="text-[10px] text-muted-foreground font-medium">
                                            {bestPlayer.stats}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AI Summary Generation */}
              {weekGames.length > 0 && (
                <Card className="bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-800 shadow-lg">
                  <CardHeader className="border-b border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 border border-border flex items-center justify-center">
                          <Sparkles className="w-6 h-6 text-primary" />
                        </div>
                        <CardTitle className="text-2xl font-heading font-bold">
                          AI-Generated Summary
                        </CardTitle>
                      </div>
                      <Button
                        onClick={generateAISummary}
                        disabled={isGeneratingSummary}
                        className="font-medium"
                      >
                        {isGeneratingSummary ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate AI Summary
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {aiSummary ? (
                      <div className="bg-muted border border-border p-6">
                        <div className="prose dark:prose-invert max-w-none">
                          <p className="text-foreground leading-relaxed whitespace-pre-wrap font-medium">
                            {aiSummary}
                          </p>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <Button
                            onClick={() => copyToClipboard(aiSummary)}
                            variant="outline"
                            size="sm"
                          >
                            Copy Text
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Sparkles className="w-12 h-12 mx-auto mb-3 text-primary" />
                        <p className="font-medium">Click "Generate AI Summary" to create an engaging recap of Week {selectedWeek}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Best Player Poster */}
              {weekGames.length > 0 && (
                <Card className="bg-white dark:bg-gray-800 border-2 border-orange-200 dark:border-orange-800 shadow-lg">
                  <CardHeader className="border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 border border-border flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-2xl font-heading font-bold">
                        Best Player of the Week Poster
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {/* Select Best Player */}
                    <div>
                      <Label className="font-heading font-bold text-foreground mb-2 block">Select Best Player:</Label>
                      <select
                        value={selectedBestPlayer?.id || ""}
                        onChange={(e) => {
                          const player = allBestPlayers.find(p => p.id === e.target.value);
                          setSelectedBestPlayer(player);
                        }}
                        className="w-full bg-background border border-border text-foreground px-3 py-2 font-medium"
                      >
                        <option value="">Choose a player...</option>
                        {allBestPlayers.map(player => (
                          <option key={player.id} value={player.id}>
                            #{player.jersey_number} {player.first_name} {player.last_name} - {player.teamName} ({player.stats})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Upload Player Photo */}
                    <div>
                      <Label className="font-heading font-bold text-foreground mb-2 block">Upload Player Photo:</Label>
                      <div className="flex gap-3">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handlePlayerPhotoUpload}
                          disabled={uploadingPlayerPhoto}
                          className="flex-1"
                        />
                        {uploadingPlayerPhoto && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
                      </div>
                      {bestPlayerPhotoUrl && (
                        <div className="mt-3">
                          <img src={bestPlayerPhotoUrl} alt="Player" className="w-32 h-32 object-cover border border-border" />
                        </div>
                      )}
                    </div>

                    {/* Generate Poster Button */}
                    <Button
                      onClick={generateBestPlayerPoster}
                      disabled={!selectedBestPlayer || !bestPlayerPhotoUrl || isGeneratingPoster}
                      className="w-full font-medium"
                    >
                      {isGeneratingPoster ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating Poster...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Generate AI Poster
                        </>
                      )}
                    </Button>

                    {/* Display Generated Poster */}
                    {generatedPosterUrl && (
                      <div className="mt-4">
                        <p className="text-sm font-heading font-bold text-foreground mb-2">Generated Poster:</p>
                        <img src={generatedPosterUrl} alt="Best Player Poster" className="w-full border border-border" />
                        <Button
                          onClick={downloadPoster}
                          variant="outline"
                          size="sm"
                          className="mt-3 font-medium"
                        >
                          Download Poster
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Game Highlights Upload */}
              {weekGames.length > 0 && (
                <Card className="bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-800 shadow-lg">
                  <CardHeader className="border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 border border-border flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-2xl font-heading font-bold">
                        Game Highlights (Photos & Videos)
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <Label className="font-heading font-bold text-foreground mb-2 block">Upload Highlights:</Label>
                      <div className="flex gap-3">
                        <Input
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          onChange={handleHighlightUpload}
                          disabled={uploadingHighlight}
                          className="flex-1"
                        />
                        {uploadingHighlight && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
                      </div>
                    </div>

                    {/* Display Uploaded Highlights */}
                    {highlightMedia.length > 0 && (
                      <div>
                        <p className="text-sm font-heading font-bold text-foreground mb-3">Uploaded Media ({highlightMedia.length}):</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {highlightMedia.map((media, idx) => (
                            <div key={idx} className="relative group">
                              {media.type === 'image' ? (
                                <img src={media.url} alt={media.name} className="w-full h-40 object-cover border border-border" />
                              ) : (
                                <div className="relative w-full h-40 bg-muted border border-border overflow-hidden">
                                  <video src={media.url} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                    <Video className="w-12 h-12 text-white" />
                                  </div>
                                </div>
                              )}
                              <Button
                                onClick={() => removeHighlight(idx)}
                                size="sm"
                                variant="destructive"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ✕
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Share Section */}
              {weekGames.length > 0 && (aiSummary || generatedPosterUrl || highlightMedia.length > 0) && (
                <Card className="bg-white dark:bg-gray-800 border-2 border-green-200 dark:border-green-800 shadow-lg">
                  <CardHeader className="border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 border border-border flex items-center justify-center">
                        <Share2 className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-2xl font-heading font-bold">
                        Share Week {selectedWeek} Summary
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {/* Internal Social Feed */}
                    <div>
                      <h3 className="text-lg font-heading font-bold text-foreground mb-3">Share to Internal Social Feed</h3>
                      <Button
                        onClick={shareToInternalFeed}
                        disabled={isSharing}
                        className="w-full font-medium"
                      >
                        {isSharing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sharing...
                          </>
                        ) : (
                          <>
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Post to Social Feed
                          </>
                        )}
                      </Button>
                    </div>

                    {/* External Social Media */}
                    <div>
                      <h3 className="text-lg font-heading font-bold text-foreground mb-3">Share to External Social Media</h3>
                      <p className="text-sm text-muted-foreground mb-3 font-medium">
                        Copy the summary and download media to share on your social platforms:
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Button
                          onClick={() => copyToClipboard(aiSummary)}
                          variant="outline"
                          className="font-medium"
                        >
                          <Facebook className="w-4 h-4 mr-2" />
                          Facebook
                        </Button>
                        <Button
                          onClick={() => copyToClipboard(aiSummary)}
                          variant="outline"
                          className="font-medium"
                        >
                          <Twitter className="w-4 h-4 mr-2" />
                          Twitter
                        </Button>
                        <Button
                          onClick={() => copyToClipboard(aiSummary)}
                          variant="outline"
                          className="font-medium"
                        >
                          <Instagram className="w-4 h-4 mr-2" />
                          Instagram
                        </Button>
                        {generatedPosterUrl && (
                          <Button
                            onClick={downloadPoster}
                            variant="outline"
                            className="font-medium"
                          >
                            <ImageIcon className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        )}
                      </div>
                      <Alert className="mt-4 bg-muted border border-border">
                        <AlertDescription className="text-foreground font-medium text-sm">
                          💡 Tip: Download the poster and upload it along with the copied text when posting to external social media for maximum engagement!
                        </AlertDescription>
                      </Alert>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}