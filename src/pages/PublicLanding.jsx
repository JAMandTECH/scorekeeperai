import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { 
  Calendar, Target, Zap, Shield, ArrowRight, Sun, Moon, 
  PlayCircle, Users, BarChart3, Trophy, CheckCircle, Globe, LogOut, LayoutGrid, Sparkles, Mic, Brain, Menu, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AIAssistant from "@/components/AIAssistant";
import LiveScorePreview from "@/components/LiveScorePreview";
import ReviewsSection from "@/components/landing/ReviewsSection";

export default function PublicLanding() {
  const [darkMode, setDarkMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    base44.auth.logout("/");
  };

  const goToDashboard = () => {
    navigate("/Dashboard");
  };

  const handleGetStarted = async () => {
    base44.auth.redirectToLogin("/RoleSelection");
  };

  const features = [
    { icon: PlayCircle, title: "Live Scoring", description: "Real-time game scoring with instant updates. Track every point, foul, and statistic as it happens." },
    { icon: Users, title: "Team Management", description: "Organize teams, players, and divisions effortlessly. Upload photos, track rosters, and manage everything in one place." },
    { icon: BarChart3, title: "Advanced Analytics", description: "Comprehensive statistics and performance metrics. Player rankings, team standings, and historical data at your fingertips." },
    { icon: Calendar, title: "Game Scheduling", description: "Schedule games, set locations, and manage tournaments. Automated standings updates and playoff brackets." },
    { icon: Trophy, title: "Multi-Sport Support", description: "Built for basketball and volleyball with sport-specific features. Customizable rules and scoring systems." },
    { icon: Globe, title: "Public Access", description: "Share standings, schedules, and stats publicly. Fans can follow their favorite teams and players in real-time." }
  ];

  const howItWorks = [
    { step: "01", title: "Sign Up & Setup", description: "Create your organization account and set up your league structure with divisions and teams.", icon: Shield },
    { step: "02", title: "Add Teams & Players", description: "Register teams, upload logos, and add player rosters with photos and details.", icon: Users },
    { step: "03", title: "Schedule Games", description: "Create your season schedule, set game times, locations, and tournament brackets.", icon: Calendar },
    { step: "04", title: "Score Live", description: "Scorekeepers use the live scoring interface to track games in real-time with instant updates.", icon: PlayCircle },
    { step: "05", title: "View Analytics", description: "Automatic statistics, standings, and rankings updated after every game.", icon: BarChart3 }
  ];

  const useCases = [
    { title: "Youth Leagues", description: "Perfect for youth sports organizations managing multiple age groups and divisions.", benefits: ["Parent access", "Photo galleries", "Season archives"] },
    { title: "Community Centers", description: "Ideal for rec centers running multiple sports leagues and tournaments.", benefits: ["Multi-sport support", "Public schedules", "Easy registration"] },
    { title: "Schools & Universities", description: "Manage intramural leagues, varsity teams, and inter-school competitions.", benefits: ["Academic tracking", "Student profiles", "Team records"] },
    { title: "Professional Leagues", description: "Enterprise-grade features for professional and semi-professional leagues.", benefits: ["Advanced stats", "Media integration", "Sponsor visibility"] }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Top Nav ── */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-heading text-xl font-bold tracking-tight">ScorekeeperAI</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
            <a href="#use-cases" className="hover:text-foreground transition-colors">Use Cases</a>
            <a href="#demo" className="hover:text-foreground transition-colors">Demo</a>
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={toggleDarkMode} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {isAuthenticated ? (
              <Button size="sm" onClick={() => navigate(user?.role === 'admin' ? '/Dashboard' : '/Home')}>
                Dashboard
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleGetStarted}>Get Started</Button>
            )}
            <button className="md:hidden p-2 text-muted-foreground" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-border px-6 py-4 flex flex-col gap-3 text-sm">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-muted-foreground hover:text-foreground">Features</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="text-muted-foreground hover:text-foreground">How It Works</a>
            <a href="#use-cases" onClick={() => setMobileMenuOpen(false)} className="text-muted-foreground hover:text-foreground">Use Cases</a>
            <a href="#demo" onClick={() => setMobileMenuOpen(false)} className="text-muted-foreground hover:text-foreground">Demo</a>
          </nav>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="border-b border-border">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16 lg:py-24">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7">
              <p className="text-sm text-muted-foreground mb-6 tracking-wide">AI-Powered Sports League Management</p>
              <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold leading-[0.95] tracking-tight mb-6">
                Run your league<br />
                with <span className="text-primary">precision</span>.
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mb-10 leading-relaxed">
                The complete platform for basketball and volleyball leagues. Live scoring, AI insights, voice commands, and real-time statistics — all in one place.
              </p>
              <div className="flex flex-wrap gap-4">
                {!isAuthenticated ? (
                  <>
                    <Button size="lg" onClick={handleGetStarted}>
                      Get Started Free
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}>
                      View Demo
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="lg" onClick={() => navigate(user?.role === 'admin' ? '/Dashboard' : '/Home')}>
                      {user?.role === 'admin' ? 'Go to Dashboard' : 'Go to Home'}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                    <Button size="lg" variant="outline" onClick={handleLogout}>
                      <LogOut className="w-4 h-4" />
                      Logout
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="lg:col-span-5 relative">
              <img
                src="https://media.base44.com/images/public/690476f21c3624553ac82b4f/7a585ce84_70StunningBasketWallpapersFreeDownloadNow.jpg"
                alt="Basketball player dribbling"
                className="w-full h-full object-cover"
              />
              <div className="absolute -bottom-4 -left-4 bg-primary text-primary-foreground px-4 py-2">
                <span className="font-heading text-sm font-bold">LIVE SCORING</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Strip ── */}
      <section className="border-b border-border">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: "AI-Powered", value: "Smart", icon: Brain },
              { label: "Voice Commands", value: "Hands-free", icon: Mic },
              { label: "Live Updates", value: "Real-time", icon: PlayCircle },
              { label: "Easy Setup", value: "Minutes", icon: Zap }
            ].map((stat, i) => (
              <div key={i} className="flex flex-col gap-1">
                <stat.icon className="w-5 h-5 text-muted-foreground mb-2" />
                <span className="font-heading text-2xl font-bold tabular-nums">{stat.value}</span>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live Scoring Preview ── */}
      <section id="demo" className="border-b border-border">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16 lg:py-24">
          <div className="mb-12">
            <p className="text-sm text-muted-foreground mb-3">Live Scoring Simulation</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Watch real-time scoring <span className="text-primary">in action</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Experience our live scoring system with this interactive simulation featuring automated score updates and real-time statistics.
            </p>
          </div>
          <div className="max-w-3xl">
            <LiveScorePreview />
          </div>
          <div className="mt-10">
            {!isAuthenticated && (
              <Button variant="outline" onClick={handleGetStarted}>
                Try it with your league
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ── Demo Dashboard ── */}
      <section className="border-b border-border bg-secondary/30">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16 lg:py-24">
          <div className="mb-12">
            <p className="text-sm text-muted-foreground mb-3">Sample League Data</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight mb-4">
              See your league on ScorekeeperAI
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-px bg-border border border-border mb-8">
            {/* Standings */}
            <div className="bg-card p-6">
              <h3 className="font-heading text-lg font-bold mb-6 pb-4 border-b border-border">Division A Standings</h3>
              <div className="space-y-0">
                {[
                  { rank: 1, name: "Thunder Hawks", wins: 12, losses: 2 },
                  { rank: 2, name: "Storm Eagles", wins: 10, losses: 4 },
                  { rank: 3, name: "Fire Dragons", wins: 8, losses: 6, active: true },
                  { rank: 4, name: "Ice Wolves", wins: 6, losses: 8 },
                  { rank: 5, name: "Sky Lions", wins: 4, losses: 10 },
                ].map((team) => (
                  <div key={team.rank} className={`flex items-center gap-4 py-3 border-b border-border last:border-0 ${team.active ? 'bg-secondary/50 -mx-6 px-6' : ''}`}>
                    <span className={`font-heading text-sm font-bold tabular-nums w-6 ${team.active ? 'text-primary' : 'text-muted-foreground'}`}>{team.rank}</span>
                    {team.active && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    <span className="flex-1 text-sm font-medium">{team.name}</span>
                    <span className="text-sm tabular-nums text-muted-foreground">{team.wins}-{team.losses}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Scorers */}
            <div className="bg-card p-6">
              <h3 className="font-heading text-lg font-bold mb-6 pb-4 border-b border-border">Top Scorers</h3>
              <div className="space-y-0">
                {[
                  { rank: 1, name: "Marcus Chen", team: "Thunder Hawks", pts: 28.5 },
                  { rank: 2, name: "James Rivera", team: "Storm Eagles", pts: 24.8 },
                  { rank: 3, name: "David Kim", team: "Fire Dragons", pts: 22.3 },
                  { rank: 4, name: "Chris Santos", team: "Ice Wolves", pts: 20.1 },
                  { rank: 5, name: "Mike Torres", team: "Sky Lions", pts: 18.9 },
                ].map((player) => (
                  <div key={player.rank} className="flex items-center gap-4 py-3 border-b border-border last:border-0">
                    <span className="font-heading text-sm font-bold tabular-nums w-6 text-muted-foreground">{player.rank}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{player.name}</p>
                      <p className="text-xs text-muted-foreground">{player.team}</p>
                    </div>
                    <span className="font-heading text-lg font-bold tabular-nums">{player.pts}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Game */}
            <div className="bg-card p-6">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                <h3 className="font-heading text-lg font-bold">Live Game</h3>
                <span className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                  <span className="live-dot" /> LIVE
                </span>
              </div>
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground mb-4 tabular-nums">Q3 • 08:24</p>
                <div className="flex items-center justify-center gap-8 mb-6">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Thunder Hawks</p>
                    <p className="font-heading text-4xl font-bold tabular-nums">67</p>
                  </div>
                  <span className="text-muted-foreground text-sm">vs</span>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Storm Eagles</p>
                    <p className="font-heading text-4xl font-bold tabular-nums">62</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground tabular-nums pt-4 border-t border-border">
                  <div>Q1: 18-16</div>
                  <div>Q2: 22-24</div>
                  <div className="text-foreground font-medium">Q3: 27-22</div>
                  <div>Q4: —</div>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Games */}
          <div className="bg-card border border-border p-6">
            <h3 className="font-heading text-lg font-bold mb-6 pb-4 border-b border-border">Upcoming Games</h3>
            <div className="grid md:grid-cols-3 gap-px bg-border">
              {[
                { home: "Fire Dragons", away: "Ice Wolves", date: "Nov 29", time: "7:00 PM", court: "Court 1" },
                { home: "Sky Lions", away: "Thunder Hawks", date: "Nov 30", time: "6:00 PM", court: "Court 2" },
                { home: "Storm Eagles", away: "Fire Dragons", date: "Dec 1", time: "8:00 PM", court: "Court 1" },
              ].map((game, i) => (
                <div key={i} className="bg-card p-4">
                  <div className="flex justify-between items-center mb-3 text-xs text-muted-foreground">
                    <span className="font-medium text-primary">{game.date}</span>
                    <span className="tabular-nums">{game.time}</span>
                  </div>
                  <p className="text-sm font-medium mb-1">{game.home} vs {game.away}</p>
                  <p className="text-xs text-muted-foreground">{game.court}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── AI Features ── */}
      <section className="border-b border-border">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16 lg:py-24">
          <div className="mb-12">
            <p className="text-sm text-muted-foreground mb-3">AI-Powered Intelligence</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Built with cutting-edge <span className="text-primary">AI technology</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Experience the future of sports management with AI-driven insights, voice commands, and intelligent analytics.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-px bg-border border border-border">
            {/* Voice Assistant */}
            <div className="bg-card p-8">
              <Mic className="w-8 h-8 text-primary mb-6" />
              <h3 className="font-heading text-xl font-bold mb-2">Voice Assistant Scoring</h3>
              <p className="text-sm text-muted-foreground mb-6">Hands-free live scoring with intelligent voice commands</p>
              <div className="border border-border p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="live-dot" />
                  <span className="text-xs font-medium">LISTENING</span>
                </div>
                <p className="text-sm text-muted-foreground italic mb-2">"Number 23, three pointer"</p>
                <div className="flex items-center gap-2 text-xs text-primary font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>+3 points recorded for #23</span>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary" /> Natural language processing</li>
                <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary" /> Multi-language support</li>
                <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary" /> Instant action recognition</li>
              </ul>
            </div>

            {/* AI Insights */}
            <div className="bg-card p-8">
              <Brain className="w-8 h-8 text-primary mb-6" />
              <h3 className="font-heading text-xl font-bold mb-2">AI-Powered Insights</h3>
              <p className="text-sm text-muted-foreground mb-6">Intelligent analysis of team and player performance</p>
              <div className="border border-border p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium">AI ANALYSIS</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  "Eagles show strong 4th quarter performance with 18% shooting improvement. Key player #23 averaging 28.5 PPG."
                </p>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary" /> Performance predictions</li>
                <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary" /> Trend identification</li>
                <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary" /> Strategic recommendations</li>
              </ul>
            </div>

            {/* Game Summaries */}
            <div className="bg-card p-8">
              <BarChart3 className="w-8 h-8 text-primary mb-6" />
              <h3 className="font-heading text-xl font-bold mb-2">Automated Game Summaries</h3>
              <p className="text-sm text-muted-foreground mb-6">AI-generated game recaps and highlight insights</p>
              <div className="border border-border p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium">GAME SUMMARY</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  "Thrilling comeback victory! Lions dominated with 34-point 3rd quarter surge. MVP performance by #15."
                </p>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary" /> Instant game recaps</li>
                <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary" /> Key moment highlights</li>
                <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary" /> Player performance notes</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="border-b border-border">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16 lg:py-24">
          <div className="mb-12">
            <p className="text-sm text-muted-foreground mb-3">Powerful Features</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Everything you need to run your league
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              From live scoring to comprehensive analytics, we've built the ultimate platform for sports league management.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
            {features.map((feature, i) => (
              <div key={i} className="bg-card p-8">
                <feature.icon className="w-7 h-7 text-primary mb-6" />
                <h3 className="font-heading text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="border-b border-border bg-secondary/30">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16 lg:py-24">
          <div className="mb-12">
            <p className="text-sm text-muted-foreground mb-3">Get Started in 5 Steps</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight mb-4">
              How it works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Simple setup, powerful features. Get your league up and running in minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-px bg-border border border-border">
            {howItWorks.map((step, i) => (
              <div key={i} className="bg-card p-8">
                <span className="font-heading text-3xl font-bold text-primary tabular-nums block mb-4">{step.step}</span>
                <step.icon className="w-6 h-6 text-muted-foreground mb-4" />
                <h3 className="font-heading text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Use Cases ── */}
      <section id="use-cases" className="border-b border-border">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16 lg:py-24">
          <div className="mb-12">
            <p className="text-sm text-muted-foreground mb-3">Perfect For</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Who uses ScorekeeperAI?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Trusted by leagues and organizations of all sizes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
            {useCases.map((useCase, i) => (
              <div key={i} className="bg-card p-8">
                <h3 className="font-heading text-lg font-bold mb-3">{useCase.title}</h3>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{useCase.description}</p>
                <ul className="space-y-2">
                  {useCase.benefits.map((benefit, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Reviews ── */}
      <ReviewsSection />

      {/* ── CTA ── */}
      <section className="border-b border-border bg-secondary/30">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16 lg:py-24 text-center">
          <h2 className="font-heading text-3xl md:text-5xl font-bold tracking-tight mb-6">
            Ready to transform <br className="hidden md:block" />your league?
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
            Join hundreds of organizations managing their sports leagues with ScorekeeperAI.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            {!isAuthenticated ? (
              <>
                <Button size="lg" onClick={handleGetStarted}>
                  Start Free Today
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Link to="/requestadminaccess">
                  <Button size="lg" variant="outline">Request Admin Access</Button>
                </Link>
              </>
            ) : (
              <Button size="lg" onClick={() => navigate(user?.role === 'admin' ? '/Dashboard' : '/Home')}>
                {user?.role === 'admin' ? 'Go to Your Dashboard' : 'Go to Home'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-8">No credit card required • Setup in minutes • Free trial available</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-background">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <span className="font-heading text-xl font-bold tracking-tight mb-4 block">ScorekeeperAI</span>
              <p className="text-sm text-muted-foreground max-w-md mb-4">
                Professional sports league management platform for basketball and volleyball leagues.
              </p>
              <p className="text-xs text-muted-foreground">© 2025 ScorekeeperAI. All rights reserved.</p>
            </div>
            <div>
              <h3 className="font-heading text-sm font-bold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><Link to="/" className="hover:text-foreground transition-colors">Live Demo</Link></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-heading text-sm font-bold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Support</a></li>
                <li><Link to="/requestadminaccess" className="hover:text-foreground transition-colors">Admin Access</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8">
            <p className="text-xs text-muted-foreground text-center">Built for sports leagues everywhere — Basketball · Volleyball</p>
          </div>
        </div>
      </footer>

      <AIAssistant />
    </div>
  );
}