
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Calendar, TrendingUp, Target, Zap, Shield, ArrowRight, Sun, Moon, 
  PlayCircle, Users, BarChart3, Trophy, CheckCircle, Eye, Globe, LogOut, LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    // Redirect to RoleSelection instead of Dashboard
    // This ensures new users go through onboarding
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
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iIzFmMmQzZCIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9nPjwvc3ZnPg==')] opacity-10"></div>
        
        {/* Top Right Controls - Dark Mode + Dashboard + Logout */}
        <div className="absolute top-6 right-6 flex items-center gap-3 z-50">
          <button
            onClick={toggleDarkMode}
            className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl transition-all"
          >
            {darkMode ? <Sun className="w-6 h-6 text-white" /> : <Moon className="w-6 h-6 text-white" />}
          </button>
          
          {/* Show Dashboard button for admin users */}
          {user && user.role === 'admin' && (
            <button
              onClick={goToDashboard}
              className="flex items-center gap-2 px-4 py-3 bg-blue-600/90 hover:bg-blue-700 backdrop-blur-md rounded-xl transition-all font-bold text-white shadow-lg"
            >
              <LayoutGrid className="w-5 h-5" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          )}
          
          {/* Show Logout button if authenticated */}
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
          <Badge className="mb-8 bg-orange-500/20 text-orange-300 border border-orange-400/30 text-sm font-bold px-4 py-2 backdrop-blur-sm">
            🎉 Professional Sports League Management Platform
          </Badge>
          
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-black mb-6 tracking-tight">
            ALAB <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">SPORTS</span>
          </h1>
          <p className="text-2xl md:text-3xl text-blue-100 mb-4 max-w-4xl mx-auto font-bold">
            The Complete Solution for Basketball & Volleyball Leagues
          </p>
          <p className="text-lg text-blue-200 mb-12 max-w-3xl mx-auto">
            Live scoring, real-time statistics, team management, and public engagement all in one powerful platform.
          </p>
          
          <div className="flex gap-4 justify-center flex-wrap mb-16">
            {!isAuthenticated ? (
              <>
                <Button 
                  onClick={handleGetStarted}
                  className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white text-lg px-12 py-8 font-bold shadow-2xl transform hover:scale-105 transition-all"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Link to={createPageUrl("Home")}>
                  <Button 
                    variant="outline"
                    className="border-2 border-white text-white hover:bg-white hover:text-blue-900 text-lg px-12 py-8 font-bold backdrop-blur-sm"
                  >
                    <Eye className="w-5 h-5 mr-2" />
                    View Live Demo
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to={createPageUrl("Dashboard")}>
                  <Button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white text-lg px-12 py-8 font-bold shadow-2xl transform hover:scale-105 transition-all">
                    Go to Dashboard
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link to={createPageUrl("Home")}>
                  <Button 
                    variant="outline"
                    className="border-2 border-white text-white hover:bg-white hover:text-blue-900 text-lg px-12 py-8 font-bold backdrop-blur-sm"
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
              { label: "Live Games", value: "Real-time", icon: PlayCircle },
              { label: "Statistics", value: "Detailed", icon: BarChart3 },
              { label: "Public Access", value: "Always", icon: Globe },
              { label: "Easy Setup", value: "Minutes", icon: Zap }
            ].map((stat, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                <stat.icon className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                <div className="text-3xl font-black text-white">{stat.value}</div>
                <div className="text-sm text-blue-200 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-50 dark:from-gray-900 to-transparent"></div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
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
              <Card key={i} className="relative overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl hover:shadow-2xl transition-all group hover:-translate-y-1">
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${feature.color} opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity`}></div>
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
      <section className="py-24 px-4 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
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
            <div className="hidden lg:block absolute top-32 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 opacity-20"></div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8">
              {howItWorks.map((step, i) => (
                <div key={i} className="relative">
                  <Card className="relative overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-xl hover:shadow-2xl transition-all text-center">
                    <CardContent className="p-6">
                      <div className="relative mb-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-3xl font-black text-white mx-auto shadow-lg">
                          {step.step}
                        </div>
                        <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
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
      <section className="py-24 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800 text-sm font-bold px-4 py-2">
              🎯 PERFECT FOR
            </Badge>
            <h2 className="text-5xl font-black text-gray-900 dark:text-white mb-4">
              Who Uses ALAB Sports?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Trusted by leagues and organizations of all sizes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((useCase, i) => (
              <Card key={i} className="relative overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl hover:shadow-2xl transition-all group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl"></div>
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
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCI xeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNzeiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIwLjUiIG9wYWNpdHk9IjAuMSIvPjwvZz48L3N2Zz4=')] opacity-20"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-5xl md:text-6xl font-black mb-6">
            Ready to Transform Your League?
          </h2>
          <p className="text-2xl text-blue-100 mb-12 max-w-2xl mx-auto">
            Join hundreds of organizations managing their sports leagues with ALAB Sports.
          </p>
          
          <div className="flex gap-4 justify-center flex-wrap">
            {!isAuthenticated ? (
              <>
                <Button 
                  onClick={handleGetStarted}
                  className="bg-white text-blue-900 hover:bg-gray-100 text-xl px-12 py-8 font-bold shadow-2xl transform hover:scale-105 transition-all"
                >
                  Start Free Today
                  <ArrowRight className="w-6 h-6 ml-2" />
                </Button>
                <Link to={createPageUrl("RequestAdminAccess")}>
                  <Button 
                    variant="outline"
                    className="border-2 border-white text-white hover:bg-white/10 text-xl px-12 py-8 font-bold backdrop-blur-sm"
                  >
                    Request Admin Access
                  </Button>
                </Link>
              </>
            ) : (
              <Link to={createPageUrl("Dashboard")}>
                <Button className="bg-white text-blue-900 hover:bg-gray-100 text-xl px-12 py-8 font-bold shadow-2xl transform hover:scale-105 transition-all">
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
      <footer className="bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 dark:from-black dark:via-gray-950 dark:to-indigo-950 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                  </svg>
                </div>
                <span className="text-2xl font-black">ALAB SPORTS</span>
              </div>
              <p className="text-blue-200 mb-4 max-w-md">
                Professional sports league management platform for basketball and volleyball leagues.
              </p>
              <p className="text-blue-300 text-sm">
                © 2025 ALAB Sports. All rights reserved.
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
    </div>
  );
}
