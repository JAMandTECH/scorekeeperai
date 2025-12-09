import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Calendar, TrendingUp, Target, Zap, Shield, ArrowRight, Sun, Moon, 
  PlayCircle, Users, BarChart3, Trophy, CheckCircle, Eye, Globe, LogOut, LayoutGrid, Sparkles, Mic, Brain, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AIAssistant from "@/components/AIAssistant";
import LiveScorePreview from "@/components/LiveScorePreview";

export default function PublicLanding() {
  const [darkMode, setDarkMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const checkAuth = async () => {
    try {
      const authenticated = await base44.auth.isAuthenticated();
      setIsAuthenticated(authenticated);
      if (authenticated) {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      }
    } catch (error) {
      console.error("Failed to check authentication or fetch user:", error);
      setIsAuthenticated(false);
      setUser(null);
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

  const goToDashboard = () => {
    navigate(createPageUrl("Dashboard"));
  };

  const handleGetStarted = async () => {
    base44.auth.redirectToLogin(createPageUrl("RoleSelection"));
  };

  const features = [
    {
      icon: PlayCircle,
      title: "Live Scoring",
      description: "Real-time game scoring with instant updates. Track every point, foul, and statistic as it happens.",
      color: "from-blue-500 to-blue-600",
      highlight: "Real-time Updates"
    },
    {
      icon: Users,
      title: "Team Management",
      description: "Organize teams, players, and divisions effortlessly. Upload photos, track rosters, and manage everything in one place.",
      color: "from-orange-500 to-orange-600",
      highlight: "Complete Control"
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Comprehensive statistics and performance metrics. Player rankings, team standings, and historical data at your fingertips.",
      color: "from-green-500 to-green-600",
      highlight: "Deep Insights"
    },
    {
      icon: Calendar,
      title: "Game Scheduling",
      description: "Schedule games, set locations, and manage tournaments. Automated standings updates and playoff brackets.",
      color: "from-purple-500 to-purple-600",
      highlight: "Smart Planning"
    },
    {
      icon: Trophy,
      title: "Multi-Sport Support",
      description: "Built for basketball and volleyball with sport-specific features. Customizable rules and scoring systems.",
      color: "from-red-500 to-red-600",
      highlight: "Versatile Platform"
    },
    {
      icon: Globe,
      title: "Public Access",
      description: "Share standings, schedules, and stats publicly. Fans can follow their favorite teams and players in real-time.",
      color: "from-indigo-500 to-indigo-600",
      highlight: "Fan Engagement"
    }
  ];

  const howItWorks = [
    {
      step: "1",
      title: "Sign Up & Setup",
      description: "Create your organization account and set up your league structure with divisions and teams.",
      icon: Shield
    },
    {
      step: "2",
      title: "Add Teams & Players",
      description: "Register teams, upload logos, and add player rosters with photos and details.",
      icon: Users
    },
    {
      step: "3",
      title: "Schedule Games",
      description: "Create your season schedule, set game times, locations, and tournament brackets.",
      icon: Calendar
    },
    {
      step: "4",
      title: "Score Live",
      description: "Scorekeepers use the live scoring interface to track games in real-time with instant updates.",
      icon: PlayCircle
    },
    {
      step: "5",
      title: "View Analytics",
      description: "Automatic statistics, standings, and rankings updated after every game.",
      icon: BarChart3
    }
  ];

  const useCases = [
    {
      title: "Youth Leagues",
      description: "Perfect for youth sports organizations managing multiple age groups and divisions.",
      icon: "👦",
      benefits: ["Parent access", "Photo galleries", "Season archives"]
    },
    {
      title: "Community Centers",
      description: "Ideal for rec centers running multiple sports leagues and tournaments.",
      icon: "🏢",
      benefits: ["Multi-sport support", "Public schedules", "Easy registration"]
    },
    {
      title: "Schools & Universities",
      description: "Manage intramural leagues, varsity teams, and inter-school competitions.",
      icon: "🎓",
      benefits: ["Academic tracking", "Student profiles", "Team records"]
    },
    {
      title: "Professional Leagues",
      description: "Enterprise-grade features for professional and semi-professional leagues.",
      icon: "⭐",
      benefits: ["Advanced stats", "Media integration", "Sponsor visibility"]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 dark:from-black dark:via-gray-900 dark:to-indigo-950 text-white py-32 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNzeiIHN0cm9rZT0iIzFmMmQzZCIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9nPjwvc3ZnPg==')] opacity-10"></div>
        
        {/* Top Right Controls */}
        <div className="absolute top-6 right-6 flex items-center gap-3 z-50">
          <button
            onClick={toggleDarkMode}
            className="p-3 glass hover:bg-white/20 rounded-xl transition-all duration-300 hover:scale-110 neon-glow-blue"
          >
            {darkMode ? <Sun className="w-6 h-6 text-cyan-300" /> : <Moon className="w-6 h-6 text-white" />}
          </button>
          
          {user && user.role === 'admin' && (
            <button
              onClick={goToDashboard}
              className="flex items-center gap-2 px-4 py-3 bg-blue-600/90 hover:bg-blue-700 backdrop-blur-md rounded-xl transition-all font-bold text-white shadow-lg"
            >
              <LayoutGrid className="w-5 h-5" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          )}
          
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-3 bg-red-600/90 hover:bg-red-700 backdrop-blur-md rounded-xl transition-all font-bold text-white shadow-lg"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
        </div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <Badge className="mb-8 glass text-cyan-300 border border-cyan-400/30 text-sm font-bold px-6 py-3 animate-pulse">
            <Sparkles className="w-4 h-4 inline mr-2" />
            AI-Powered Sports League Management Platform
          </Badge>
          
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-black mb-6" style={{ fontFamily: "'Arial Black', 'Arial Bold', Gadget, sans-serif", letterSpacing: '0.1em' }}>
            <span className="text-white">SCOREKEEPER</span>
            <span 
              className="ml-2 bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-500 bg-clip-text text-transparent" 
              style={{ 
                filter: 'drop-shadow(0 0 30px rgba(34, 211, 238, 0.8)) drop-shadow(0 0 60px rgba(34, 211, 238, 0.5))',
                textShadow: '0 0 80px rgba(34, 211, 238, 0.6)'
              }}
            >
              AI
            </span>
          </h1>
          <p className="text-2xl md:text-3xl text-blue-100 mb-4 max-w-4xl mx-auto font-bold">
            The Complete AI-Powered Solution for Basketball & Volleyball Leagues
          </p>
          <p className="text-lg text-blue-200/80 mb-12 max-w-3xl mx-auto font-medium">
            Live scoring, AI insights, voice commands, and real-time statistics all in one powerful platform.
          </p>
          
          <div className="flex gap-6 justify-center flex-wrap mb-16">
            {!isAuthenticated ? (
              <>
                <Button 
                  onClick={handleGetStarted}
                  className="btn-futuristic bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white text-lg px-14 py-8 font-bold shadow-2xl transform hover:scale-105 transition-all duration-300 rounded-2xl neon-glow-orange"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button 
                  onClick={() => document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' })}
                  variant="outline"
                  className="glass border-2 border-cyan-400/50 text-cyan-100 hover:bg-cyan-500/20 hover:border-cyan-400 text-lg px-14 py-8 font-bold rounded-2xl transition-all duration-300 hover:scale-105 neon-glow-blue"
                >
                  <Eye className="w-5 h-5 mr-2" />
                  View Demo
                  <ChevronDown className="w-5 h-5 ml-2 animate-bounce" />
                </Button>
              </>
            ) : (
              <>
                <Link to={createPageUrl("Dashboard")}>
                  <Button className="btn-futuristic bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white text-lg px-14 py-8 font-bold shadow-2xl transform hover:scale-105 transition-all duration-300 rounded-2xl neon-glow-orange">
                    Go to Dashboard
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link to={createPageUrl("Home")}>
                  <Button 
                    variant="outline"
                    className="glass border-2 border-cyan-400/50 text-cyan-100 hover:bg-cyan-500/20 hover:border-cyan-400 text-lg px-14 py-8 font-bold rounded-2xl transition-all duration-300 hover:scale-105 neon-glow-blue"
                  >
                    <Eye className="w-5 h-5 mr-2" />
                    View Live Scores
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { label: "AI-Powered", value: "Smart", icon: Brain, color: "from-purple-500 to-pink-500" },
              { label: "Voice Commands", value: "Hands-free", icon: Mic, color: "from-cyan-500 to-blue-500" },
              { label: "Live Updates", value: "Real-time", icon: PlayCircle, color: "from-green-500 to-emerald-500" },
              { label: "Easy Setup", value: "Minutes", icon: Zap, color: "from-orange-500 to-red-500" }
            ].map((stat, i) => (
              <div key={i} className="glass-card rounded-2xl p-6 card-hover group cursor-pointer" style={{animationDelay: `${i * 0.1}s`}}>
                <div className={`w-14 h-14 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <stat.icon className="w-7 h-7 text-white" />
                </div>
                <div className="text-3xl font-black text-white mb-1">{stat.value}</div>
                <div className="text-sm text-cyan-200 font-semibold">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent"></div>
      </section>

      {/* LIVE SCORING PREVIEW - Interactive Demo */}
      <section className="py-24 px-4 bg-white dark:bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 mesh-gradient opacity-30"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-gradient-to-r from-red-500 to-pink-500 text-white border-0 text-sm font-bold px-6 py-3 shadow-lg animate-pulse">
              <PlayCircle className="w-4 h-4 inline mr-2 animate-pulse" />
              LIVE SCORING SIMULATION
            </Badge>
            <h2 className="text-5xl font-black text-gray-900 dark:text-white mb-4">
              Watch Real-Time Scoring <span className="text-gradient-primary">In Action</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Experience our live scoring system with this interactive simulation featuring automated score updates and real-time statistics.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <LiveScorePreview />
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 dark:text-gray-400 font-medium mb-6">
              This is a live simulation showing how games are tracked in real-time with instant updates and animations.
            </p>
            {!isAuthenticated && (
              <Button 
                onClick={handleGetStarted}
                className="btn-futuristic bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white text-lg px-12 py-6 font-bold shadow-2xl transform hover:scale-105 transition-all duration-300 rounded-2xl neon-glow-orange"
              >
                Try It With Your League
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* DEMO SECTION - Sample League Data */}
      <section id="demo-section" className="py-24 px-4 bg-gradient-to-br from-gray-900 via-blue-950 to-indigo-950 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-20"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-purple-500/15 to-pink-500/15 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 text-sm font-bold px-6 py-2 shadow-lg">
              🏀 LIVE DEMO DATA
            </Badge>
            <h2 className="text-5xl font-black text-white mb-4">
              Sample League <span className="text-gradient-primary">Dashboard</span>
            </h2>
            <p className="text-xl text-blue-200 max-w-3xl mx-auto">
              See how your league data would look with ScorekeeperAI
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-12">
            {/* Demo Standings */}
            <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl col-span-1">
              <CardHeader className="border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <CardTitle className="text-xl font-black text-white">Division A Standings</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {[
                    { rank: 1, name: "Thunder Hawks", wins: 12, losses: 2, color: "from-yellow-400 to-yellow-500" },
                    { rank: 2, name: "Storm Eagles", wins: 10, losses: 4, color: "from-gray-300 to-gray-400" },
                    { rank: 3, name: "Fire Dragons", wins: 8, losses: 6, color: "from-orange-600 to-orange-700" },
                    { rank: 4, name: "Ice Wolves", wins: 6, losses: 8, color: "from-gray-500 to-gray-600" },
                    { rank: 5, name: "Sky Lions", wins: 4, losses: 10, color: "from-gray-500 to-gray-600" },
                  ].map((team) => (
                    <div key={team.rank} className="flex items-center gap-3 bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors">
                      <div className={`w-8 h-8 bg-gradient-to-br ${team.color} rounded-lg flex items-center justify-center text-xs font-black text-white shadow-md`}>
                        {team.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{team.name}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-green-400 font-bold">{team.wins}</span>
                        <span className="text-gray-400 mx-1">-</span>
                        <span className="text-red-400 font-bold">{team.losses}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Demo Top Scorers */}
            <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl col-span-1">
              <CardHeader className="border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <CardTitle className="text-xl font-black text-white">Top Scorers</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {[
                    { rank: 1, name: "Marcus Chen", team: "Thunder Hawks", pts: 28.5, jersey: "23", color: "from-yellow-400 to-yellow-500" },
                    { rank: 2, name: "James Rivera", team: "Storm Eagles", pts: 24.8, jersey: "11", color: "from-gray-300 to-gray-400" },
                    { rank: 3, name: "David Kim", team: "Fire Dragons", pts: 22.3, jersey: "7", color: "from-orange-600 to-orange-700" },
                    { rank: 4, name: "Chris Santos", team: "Ice Wolves", pts: 20.1, jersey: "15", color: "from-gray-500 to-gray-600" },
                    { rank: 5, name: "Mike Torres", team: "Sky Lions", pts: 18.9, jersey: "32", color: "from-gray-500 to-gray-600" },
                  ].map((player) => (
                    <div key={player.rank} className="flex items-center gap-3 bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors">
                      <div className={`w-8 h-8 bg-gradient-to-br ${player.color} rounded-lg flex items-center justify-center text-xs font-black text-white shadow-md`}>
                        {player.rank}
                      </div>
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-xs font-bold text-white">
                        #{player.jersey}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{player.name}</p>
                        <p className="text-xs text-gray-400">{player.team}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-blue-400">{player.pts}</p>
                        <p className="text-[10px] text-gray-400">PPG</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Demo Live Game */}
            <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl col-span-1">
              <CardHeader className="border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                      <PlayCircle className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-xl font-black text-white">Live Game</CardTitle>
                  </div>
                  <Badge className="bg-red-500 text-white font-bold animate-pulse">
                    LIVE
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center mb-4">
                  <p className="text-xs text-gray-400 font-bold mb-2">Q3 • 8:24</p>
                </div>
                <div className="grid grid-cols-3 gap-4 items-center mb-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg">
                      <span className="text-xl font-black text-white">TH</span>
                    </div>
                    <p className="text-xs font-bold text-white mb-1">Thunder Hawks</p>
                    <p className="text-4xl font-black text-white">67</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-gray-500">VS</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg">
                      <span className="text-xl font-black text-white">SE</span>
                    </div>
                    <p className="text-xs font-bold text-white mb-1">Storm Eagles</p>
                    <p className="text-4xl font-black text-white">62</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs text-gray-400 bg-white/5 rounded-lg p-2">
                  <div><span className="font-bold text-white">Q1:</span> 18-16</div>
                  <div><span className="font-bold text-white">Q2:</span> 22-24</div>
                  <div><span className="font-bold text-white">Q3:</span> 27-22</div>
                  <div><span className="font-bold text-gray-500">Q4:</span> -</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Demo Upcoming Games */}
          <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
            <CardHeader className="border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <CardTitle className="text-xl font-black text-white">Upcoming Games</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { home: "Fire Dragons", away: "Ice Wolves", date: "Nov 29", time: "7:00 PM", court: "Court 1" },
                  { home: "Sky Lions", away: "Thunder Hawks", date: "Nov 30", time: "6:00 PM", court: "Court 2" },
                  { home: "Storm Eagles", away: "Fire Dragons", date: "Dec 1", time: "8:00 PM", court: "Court 1" },
                ].map((game, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
                    <div className="flex justify-between items-center mb-3">
                      <Badge variant="outline" className="text-cyan-400 border-cyan-400/50 text-xs font-bold">
                        {game.date}
                      </Badge>
                      <span className="text-xs text-gray-400">{game.time}</span>
                    </div>
                    <p className="text-sm font-bold text-white mb-1">
                      {game.home} vs {game.away}
                    </p>
                    <p className="text-xs text-gray-400">📍 {game.court}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="text-center mt-12">
            <Button 
              onClick={handleGetStarted}
              className="btn-futuristic bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white text-lg px-12 py-7 font-bold shadow-2xl transform hover:scale-105 transition-all duration-300 rounded-2xl neon-glow-orange"
            >
              Start Your League Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* AI Features Highlight Section - NEW */}
      <section className="py-24 px-4 bg-gradient-to-br from-slate-50 via-purple-50/50 to-cyan-50/50 dark:from-gray-900 dark:via-purple-950/20 dark:to-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-20"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 text-white border-0 text-sm font-bold px-8 py-3 shadow-xl neon-glow-purple">
              <Sparkles className="w-4 h-4 mr-2 inline animate-pulse" />
              AI-POWERED INTELLIGENCE
            </Badge>
            <h2 className="text-5xl md:text-6xl font-black text-gray-900 dark:text-white mb-4">
              Built with Cutting-Edge <span className="text-gradient-primary">AI Technology</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Experience the future of sports management with AI-driven insights, voice commands, and intelligent analytics.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-12">
            {/* Voice Assistant Feature */}
            <Card className="relative overflow-hidden border border-purple-300/50 dark:border-purple-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-futuristic-lg hover:shadow-2xl transition-all duration-500 group card-hover">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <CardHeader className="relative z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg mb-4 transform group-hover:scale-110 transition-transform">
                  <Mic className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                  Voice Assistant Scoring
                </CardTitle>
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  Hands-free live scoring with intelligent voice commands
                </p>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="bg-gradient-to-br from-purple-900 to-pink-900 rounded-xl p-4 mb-4 border-2 border-purple-400">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-white text-xs font-bold">LISTENING...</span>
                  </div>
                  <p className="text-purple-200 text-sm font-mono mb-2">"Number 23, three pointer"</p>
                  <div className="flex items-center gap-2 text-green-300 text-xs font-bold">
                    <CheckCircle className="w-4 h-4" />
                    <span>+3 points recorded for #23</span>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="font-medium">Natural language processing</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="font-medium">Multi-language support</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="font-medium">Instant action recognition</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Insights Feature */}
            <Card className="relative overflow-hidden border border-blue-300/50 dark:border-blue-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-futuristic-lg hover:shadow-2xl transition-all duration-500 group card-hover">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl"></div>
              <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <CardHeader className="relative z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg mb-4 transform group-hover:scale-110 transition-transform">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                  AI-Powered Insights
                </CardTitle>
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  Intelligent analysis of team and player performance
                </p>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="bg-white dark:bg-gray-900 rounded-xl p-4 mb-4 border-2 border-blue-200 dark:border-blue-800 shadow-inner">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">AI ANALYSIS</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                    "Eagles show strong 4th quarter performance with 18% shooting improvement. Key player #23 averaging 28.5 PPG."
                  </p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="font-medium">Performance predictions</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="font-medium">Trend identification</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="font-medium">Strategic recommendations</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Game Summaries Feature */}
            <Card className="relative overflow-hidden border border-orange-300/50 dark:border-orange-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-futuristic-lg hover:shadow-2xl transition-all duration-500 group card-hover">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full blur-3xl"></div>
              <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <CardHeader className="relative z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg mb-4 transform group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                  Automated Game Summaries
                </CardTitle>
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  AI-generated game recaps and highlight insights
                </p>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-950/50 dark:to-red-950/50 rounded-xl p-4 mb-4 border-2 border-orange-300 dark:border-orange-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <span className="text-xs font-bold text-orange-700 dark:text-orange-300">GAME SUMMARY</span>
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 font-medium leading-relaxed">
                    "Thrilling comeback victory! Lions dominated with 34-point 3rd quarter surge. MVP performance by #15."
                  </p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="font-medium">Instant game recaps</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="font-medium">Key moment highlights</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="font-medium">Player performance notes</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center gap-3 glass-card rounded-full px-10 py-5 neon-glow-purple">
              <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
              <span className="text-lg font-black text-gradient-primary">
                Powered by Advanced AI & Machine Learning
              </span>
              <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* Video/Visual Showcase Section */}
      <section className="py-24 px-4 bg-white dark:bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 mesh-gradient opacity-50"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800 text-sm font-bold px-4 py-2">
              🎬 SEE IT IN ACTION
            </Badge>
            <h2 className="text-5xl font-black text-gray-900 dark:text-white mb-4">
              Experience ScorekeeperAI Live
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Watch how our platform transforms sports league management with real-time features and intuitive design.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            {/* Live Scoring Preview */}
            <Card className="relative overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 shadow-2xl group hover:shadow-3xl transition-all">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
              <CardContent className="p-8 relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <PlayCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">Live Scoring</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Real-time game tracking</p>
                  </div>
                </div>
                
                {/* Mock Live Score Display */}
                <div className="bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 rounded-2xl p-6 shadow-2xl mb-4">
                  <div className="text-center mb-4">
                    <Badge className="bg-red-500 text-white font-black px-4 py-1">
                      <PlayCircle className="w-4 h-4 mr-1 inline animate-pulse" />
                      LIVE Q3
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 items-center text-white">
                    <div className="text-center">
                      <div className="text-sm font-bold mb-2 text-blue-300">EAGLES</div>
                      <div className="text-6xl font-black">78</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-black text-gray-400">VS</div>
                      <div className="text-xs text-gray-400 mt-2">12:34</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold mb-2 text-orange-300">LIONS</div>
                      <div className="text-6xl font-black">72</div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs text-gray-400">
                    <div><span className="font-bold text-white">Q1:</span> 22-18</div>
                    <div><span className="font-bold text-white">Q2:</span> 24-21</div>
                    <div><span className="font-bold text-white">Q3:</span> 32-33</div>
                    <div><span className="font-bold text-gray-500">Q4:</span> -</div>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="font-medium">Track scores in real-time</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="font-medium">Record player statistics live</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="font-medium">Instant updates for fans</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics Dashboard Preview */}
            <Card className="relative overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 shadow-2xl group hover:shadow-3xl transition-all">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-full blur-3xl"></div>
              <CardContent className="p-8 relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">Analytics</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Comprehensive insights</p>
                  </div>
                </div>
                
                {/* Mock Player Stats */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-lg mb-4 border-2 border-gray-100 dark:border-gray-700">
                  <h4 className="text-sm font-black text-gray-900 dark:text-white mb-3">TOP SCORERS</h4>
                  <div className="space-y-2">
                    {[
                      { name: "John Smith", team: "Eagles", pts: 28.5, color: "from-yellow-400 to-orange-500" },
                      { name: "Mike Johnson", team: "Lions", pts: 24.3, color: "from-gray-300 to-gray-400" },
                      { name: "Chris Lee", team: "Tigers", pts: 22.8, color: "from-orange-600 to-red-600" }
                    ].map((player, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                        <div className={`w-8 h-8 bg-gradient-to-br ${player.color} rounded-lg flex items-center justify-center text-xs font-black text-white shadow-md`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{player.name}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">{player.team}</p>
                        </div>
                        <div className="text-xl font-black text-blue-600 dark:text-blue-400">{player.pts}</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="font-medium">Detailed player rankings</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="font-medium">Team standings & records</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="font-medium">Historical data tracking</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Platform Screenshots Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all overflow-hidden group">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-8 h-48 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCI xeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNzeiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxIiBvcGFjaXR5PSIwLjIiLz48L2c+PC9zdmc+')] opacity-20"></div>
                <Users className="w-24 h-24 text-white relative z-10 transform group-hover:scale-110 transition-transform" />
              </div>
              <CardContent className="p-6">
                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">Team Management</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Organize teams, players, and rosters with ease</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all overflow-hidden group">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 p-8 h-48 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCI xeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNzeiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxIiBvcGFjaXR5PSIwLjIiLz48L2c+PC9sZz4=')] opacity-20"></div>
                <Calendar className="w-24 h-24 text-white relative z-10 transform group-hover:scale-110 transition-transform" />
              </div>
              <CardContent className="p-6">
                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">Schedule Games</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Manage fixtures, playoffs, and tournaments seamlessly</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all overflow-hidden group">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-8 h-48 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCI xeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNzeiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxIiBvcGFjaXR5PSIwLjIiLz48L2c+PC9zdmc+')] opacity-20"></div>
                <Globe className="w-24 h-24 text-white relative z-10 transform group-hover:scale-110 transition-transform" />
              </div>
              <CardContent className="p-6">
                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">Public Access</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Share live scores and stats with fans worldwide</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-30"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 text-sm font-bold px-4 py-2">
              ⚡ POWERFUL FEATURES
            </Badge>
            <h2 className="text-5xl font-black text-gray-900 dark:text-white mb-4">
              Everything You Need to Run Your League
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              From live scoring to comprehensive analytics, we've built the ultimate platform for sports league management.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <Card key={i} className="relative overflow-hidden border border-gray-200/50 dark:border-gray-700/50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl shadow-futuristic hover:shadow-futuristic-lg transition-all duration-500 group card-hover">
                <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${feature.color} opacity-10 rounded-full blur-3xl group-hover:opacity-30 transition-opacity duration-500`}></div>
                <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <CardHeader className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform`}>
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <Badge variant="outline" className="text-xs font-bold">
                      {feature.highlight}
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl font-black text-gray-900 dark:text-white">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 particles opacity-50"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-green-100 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800 text-sm font-bold px-4 py-2">
              🚀 GET STARTED IN 5 STEPS
            </Badge>
            <h2 className="text-5xl font-black text-gray-900 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Simple setup, powerful features. Get your league up and running in minutes.
            </p>
          </div>

          <div className="relative">
            {/* Connection Line */}
            <div className="hidden lg:block absolute top-32 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-orange-500 opacity-40 rounded-full"></div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8">
              {howItWorks.map((step, i) => (
                <div key={i} className="relative">
                  <Card className="relative overflow-hidden border border-gray-200/50 dark:border-gray-700/50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl shadow-futuristic hover:shadow-futuristic-lg transition-all duration-500 text-center card-hover">
                    <CardContent className="p-6">
                      <div className="relative mb-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-3xl font-black text-white mx-auto shadow-lg pulse-glow">
                          {step.step}
                        </div>
                        <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-lg neon-glow-orange">
                          <step.icon className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white mb-3">
                        {step.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                        {step.description}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 mesh-gradient opacity-30"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800 text-sm font-bold px-4 py-2">
              🎯 PERFECT FOR
            </Badge>
            <h2 className="text-5xl font-black text-gray-900 dark:text-white mb-4">
              Who Uses ScorekeeperAI?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Trusted by leagues and organizations of all sizes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((useCase, i) => (
              <Card key={i} className="relative overflow-hidden border border-gray-200/50 dark:border-gray-700/50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl shadow-futuristic hover:shadow-futuristic-lg transition-all duration-500 group card-hover">
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-full blur-3xl group-hover:opacity-60 transition-opacity"></div>
                <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <CardHeader className="relative z-10">
                  <div className="text-6xl mb-4 text-center">{useCase.icon}</div>
                  <CardTitle className="text-2xl font-black text-gray-900 dark:text-white text-center">
                    {useCase.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10 space-y-4">
                  <p className="text-gray-600 dark:text-gray-400 text-sm text-center">
                    {useCase.description}
                  </p>
                  <div className="space-y-2">
                    {useCase.benefits.map((benefit, j) => (
                      <div key={j} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300 font-medium">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCI xeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNzeiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIwLjUiIG9wYWNpdHk9IjAuMSIvPjwvZz48L252Zz4=')] opacity-20"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-5xl md:text-6xl font-black mb-6 neon-text-blue">
            Ready to Transform Your League?
          </h2>
          <p className="text-2xl text-cyan-100/90 mb-12 max-w-2xl mx-auto font-medium">
            Join hundreds of organizations managing their sports leagues with ScorekeeperAI.
          </p>
          
          <div className="flex gap-6 justify-center flex-wrap">
            {!isAuthenticated ? (
              <>
                <Button 
                  onClick={handleGetStarted}
                  className="btn-futuristic bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 hover:from-cyan-500 hover:via-blue-600 hover:to-purple-600 text-white text-xl px-14 py-8 font-bold shadow-2xl transform hover:scale-105 transition-all duration-300 rounded-2xl neon-glow-blue"
                >
                  Start Free Today
                  <ArrowRight className="w-6 h-6 ml-2" />
                </Button>
                <Link to={createPageUrl("RequestAdminAccess")}>
                  <Button 
                    variant="outline"
                    className="glass border-2 border-white/50 text-white hover:bg-white/10 text-xl px-14 py-8 font-bold rounded-2xl transition-all duration-300 hover:scale-105"
                  >
                    Request Admin Access
                  </Button>
                </Link>
              </>
            ) : (
              <Link to={createPageUrl("Dashboard")}>
                <Button className="btn-futuristic bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 hover:from-cyan-500 hover:via-blue-600 hover:to-purple-600 text-white text-xl px-14 py-8 font-bold shadow-2xl transform hover:scale-105 transition-all duration-300 rounded-2xl neon-glow-blue">
                  Go to Your Dashboard
                  <ArrowRight className="w-6 h-6 ml-2" />
                </Button>
              </Link>
            )}
          </div>

          <p className="text-blue-200 mt-8 text-sm">
            No credit card required • Setup in minutes • Free trial available
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-900 via-gray-900 to-black dark:from-black dark:via-gray-950 dark:to-black text-white py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-10"></div>
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 rounded-xl flex items-center justify-center shadow-xl neon-glow-orange">
                  <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                  </svg>
                </div>
                <span className="text-3xl font-black text-gradient-warm">ScorekeeperAI</span>
              </div>
              <p className="text-blue-200 mb-4 max-w-md">
                Professional sports league management platform for basketball and volleyball leagues.
              </p>
              <p className="text-blue-300 text-sm">
                © 2025 ScorekeeperAI. All rights reserved.
              </p>
            </div>
            
            <div>
              <h3 className="font-black text-lg mb-4">Product</h3>
              <ul className="space-y-2 text-blue-200">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><Link to={createPageUrl("Home")} className="hover:text-white transition-colors">Live Demo</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-black text-lg mb-4">Company</h3>
              <ul className="space-y-2 text-blue-200">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
                <li><Link to={createPageUrl("RequestAdminAccess")} className="hover:text-white transition-colors">Admin Access</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-blue-800 dark:border-blue-900 pt-8 text-center">
            <p className="text-blue-300 text-sm">
              Built with ❤️ for sports leagues everywhere • Basketball 🏀 • Volleyball 🏐
            </p>
          </div>
        </div>
      </footer>
      
      <AIAssistant />
    </div>
  );
}