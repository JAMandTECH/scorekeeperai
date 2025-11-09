
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Calendar, TrendingUp, Target, Zap, Shield, ArrowRight, Sun, Moon,
  PlayCircle, Users, BarChart3, Trophy, CheckCircle, Eye, Globe
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  // Removed: user, organization, viewMode states from the previous Home component's functionality

  useEffect(() => {
    checkAuth();
    // Load dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark'); // Ensure it's removed if not dark
    }
  }, []);

  const checkAuth = async () => {
    const authenticated = await base44.auth.isAuthenticated();
    setIsAuthenticated(authenticated);
    // Note: The previous Home component redirected to PublicLanding if not authenticated.
    // This file is now designed to *be* the PublicLanding, so no redirect is needed here.
  };

  // Dark mode toggle function
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

  // Removed: loadUser, handleLogout functions
  // Removed: All useQuery hooks and related data processing logic (allTeams, allPlayers, allGames, allPlayerStats, getTeamStandings, getTopPlayers, getTeamName, etc.)
  // These were part of the previous Home component's dashboard functionality.

  // --- Start of data arrays for the Public Landing Page ---
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
  // --- End of data arrays for the Public Landing Page ---

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 dark:from-black dark:via-gray-900 dark:to-indigo-950 text-white py-32 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iIzFmMmQzZCIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9nPjwvc3ZnPg==')] opacity-10"></div>

        <button
          onClick={toggleDarkMode}
          className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl transition-all z-50"
        >
          {darkMode ? <Sun className="w-6 h-6 text-white" /> : <Moon className="w-6 h-6 text-white" />}
        </button>

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
                  onClick={() => base44.auth.redirectToLogin(createPageUrl("Dashboard"))}
                  className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white text-lg px-12 py-8 font-bold shadow-2xl transform hover:scale-105 transition-all"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Link to={createPageUrl("Scores")}>
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
                <Link to={createPageUrl("Scores")}>
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
                {<stat.icon className="w-8 h-8 text-orange-400 mx-auto mb-2" />}
                <div className="text-3xl font-black text-white">{stat.value}</div>
                <div className="text-sm text-blue-200 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-50 dark:from-gray-900 to-transparent"></div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto text-center">
          <Badge className="mb-4 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-sm font-bold px-4 py-2">
            POWERFUL FEATURES
          </Badge>
          <h2 className="text-5xl font-black text-gray-900 dark:text-white mb-6 leading-tight">
            Designed to Elevate Your League
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-16">
            From seamless game management to engaging fan experiences, ALAB Sports provides everything you need.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg transition-all hover:shadow-xl hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br ${feature.color}`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {feature.highlight}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-left">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-left">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto text-center">
          <Badge className="mb-4 bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 text-sm font-bold px-4 py-2">
            GET STARTED QUICKLY
          </Badge>
          <h2 className="text-5xl font-black text-gray-900 dark:text-white mb-6 leading-tight">
            Your League, Streamlined in 5 Steps
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-16">
            Follow our simple process to bring your sports league online and unlock its full potential.
          </p>

          <div className="relative grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Vertical line connector - for larger screens */}
            <div className="absolute hidden lg:block inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-gradient-to-b from-orange-400/50 via-red-400/50 to-blue-400/50 rounded-full my-12"></div>
            <div className="absolute hidden md:block lg:hidden inset-y-0 left-[25%] -translate-x-1/2 w-0.5 bg-gradient-to-b from-orange-400/50 via-red-400/50 to-blue-400/50 rounded-full my-12"></div>
            <div className="absolute hidden md:block lg:hidden inset-y-0 left-[75%] -translate-x-1/2 w-0.5 bg-gradient-to-b from-orange-400/50 via-red-400/50 to-blue-400/50 rounded-full my-12"></div>


            {howItWorks.map((step, index) => (
              <Card key={index} className="relative z-10 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg p-6 text-center transition-all hover:shadow-xl hover:-translate-y-1">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-3xl font-black text-white mx-auto -mt-10 mb-4 shadow-lg border-4 border-white dark:border-gray-800">
                  {step.step}
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 mx-auto mb-4`}>
                    {<step.icon className="w-6 h-6 text-white" />}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{step.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="use-cases" className="py-20 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto text-center">
          <Badge className="mb-4 bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 text-sm font-bold px-4 py-2">
            WHO BENEFITS?
          </Badge>
          <h2 className="text-5xl font-black text-gray-900 dark:text-white mb-6 leading-tight">
            Solutions for Every Type of League
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-16">
            Whether you're a small community league or a large professional organization, ALAB Sports is adaptable to your needs.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {useCases.map((useCase, index) => (
              <Card key={index} className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 shadow-lg p-6 text-center transition-all hover:shadow-xl hover:-translate-y-1">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-md">
                  {useCase.icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{useCase.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{useCase.description}</p>
                <div className="space-y-2">
                  {useCase.benefits.map((benefit, i) => (
                    <div key={i} className="flex items-center text-gray-700 dark:text-gray-300 justify-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      <span className="text-sm font-medium">{benefit}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-700 to-indigo-800 dark:from-blue-900 dark:to-indigo-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9IkM2IDM2YzMuMzE0IDAgNiAyLjY4NiA2IDZzLTIuNjg2IDYtNiA2LTYtMi42ODYtNi02IDIuNjg2LTYgNi02eiIgc3Ryb2tlPSIjMjk0NzkzIiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+')] opacity-20"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-5xl font-black mb-6 leading-tight">
            Ready to Transform Your League?
          </h2>
          <p className="text-xl text-blue-100 mb-10">
            Join hundreds of sports organizations that trust ALAB Sports for seamless management and engaging fan experiences.
          </p>
          {!isAuthenticated ? (
            <Button
              onClick={() => base44.auth.redirectToLogin(createPageUrl("Dashboard"))}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white text-xl px-12 py-8 font-bold shadow-2xl transform hover:scale-105 transition-all"
            >
              Get Started Now
              <ArrowRight className="w-6 h-6 ml-3" />
            </Button>
          ) : (
            <Link to={createPageUrl("Dashboard")}>
              <Button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white text-xl px-12 py-8 font-bold shadow-2xl transform hover:scale-105 transition-all">
                Go to Dashboard
                <ArrowRight className="w-6 h-6 ml-3" />
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 dark:from-black dark:via-gray-950 dark:to-indigo-950 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-2xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
              </svg>
            </div>
            <span className="text-3xl font-black tracking-tight">ALAB SPORTS</span>
          </div>
          <p className="text-blue-200 dark:text-blue-300 text-lg mb-2 font-medium">
            Professional League Management System
          </p>
          <p className="text-blue-300 dark:text-blue-400 text-sm">
            Basketball • Volleyball • Real-time Scoring
          </p>
          <p className="text-blue-400 dark:text-blue-500 text-sm mt-8">
            © 2025 ALAB Sports. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
