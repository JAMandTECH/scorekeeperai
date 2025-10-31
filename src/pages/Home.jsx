import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Trophy, Users, BarChart3, Video, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const handleGetStarted = async () => {
    const isAuth = await base44.auth.isAuthenticated();
    if (isAuth) {
      window.location.href = createPageUrl("Dashboard");
    } else {
      base44.auth.redirectToLogin(createPageUrl("Dashboard"));
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black opacity-90"></div>
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=1080')",
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        ></div>
        
        <div className="relative max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-4 py-2 mb-6">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 text-sm font-medium">Professional Sports Management</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                <span className="text-white">ALAB</span>
                <br />
                <span className="text-yellow-400">Basketball and Volleyball</span>
                <br />
                <span className="text-white">Scoring System</span>
              </h1>
              
              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                Professional basketball and volleyball scoring and statistics management system. 
                Track games, players, and teams in real-time with comprehensive analytics and live streaming integration.
              </p>
              
              <Button 
                onClick={handleGetStarted}
                className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-8 py-6 text-lg rounded-lg"
              >
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
            
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=800" 
                alt="Basketball"
                className="rounded-2xl shadow-2xl border border-gray-800"
              />
              <div className="absolute -bottom-6 -left-6 bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl">
                <p className="text-yellow-400 font-bold text-sm mb-1">Professional scoring system</p>
                <p className="text-gray-300 text-sm">Real-time stats & analytics</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-yellow-400 font-semibold mb-4 uppercase tracking-wider">FEATURES</p>
            <h2 className="text-4xl font-bold text-white mb-4">Everything you need to manage your games</h2>
            <p className="text-gray-400 text-lg">Comprehensive tools for basketball and volleyball organizations, teams, and score keepers.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 hover:border-yellow-400/50 transition-colors">
              <div className="w-12 h-12 bg-yellow-400/10 rounded-lg flex items-center justify-center mb-4">
                <Trophy className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Live Scoring</h3>
              <p className="text-gray-400">Real-time score tracking with quarter-by-quarter breakdowns, set by set breakdown and player statistics.</p>
            </div>
            
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 hover:border-yellow-400/50 transition-colors">
              <div className="w-12 h-12 bg-yellow-400/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Team Management</h3>
              <p className="text-gray-400">Manage teams, players, and track performance across multiple divisions.</p>
            </div>
            
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 hover:border-yellow-400/50 transition-colors">
              <div className="w-12 h-12 bg-yellow-400/10 rounded-lg flex items-center justify-center mb-4">
                <Video className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Live Streaming</h3>
              <p className="text-gray-400">Integrated live streaming support for remote game viewing and sharing.</p>
            </div>
            
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 hover:border-yellow-400/50 transition-colors">
              <div className="w-12 h-12 bg-yellow-400/10 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Advanced Statistics</h3>
              <p className="text-gray-400">Detailed player and team statistics with historical performance tracking.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-24 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Trusted by Teams</h2>
            <p className="text-gray-400 text-lg">Powering Basketball and Volleyball Leagues</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-yellow-400 mb-2">50+</div>
              <p className="text-gray-400">Active Teams</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-yellow-400 mb-2">1000+</div>
              <p className="text-gray-400">Players</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-yellow-400 mb-2">200+</div>
              <p className="text-gray-400">Games Scored</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-yellow-400 mb-2">3</div>
              <p className="text-gray-400">Divisions</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-gray-900">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to get started?</h2>
          <p className="text-xl text-gray-400 mb-8">Join ALAB today and transform how you manage your games.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={handleGetStarted}
              className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-8 py-6 text-lg rounded-lg"
            >
              Sign up now
            </Button>
            <Button 
              variant="outline"
              className="border-gray-700 text-white hover:bg-gray-800 px-8 py-6 text-lg rounded-lg"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Learn more
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-950 border-t border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500">
          <p>&copy; 2025 ALAB Sports Management System. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}