
import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Trophy, Users, BarChart3, Calendar, ArrowRight, Shield, CheckCircle } from "lucide-react";
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

  const handleRequestAccess = () => {
    window.location.href = createPageUrl("RequestAdminAccess");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-gray-900">ALAB</span>
            </div>
            <div className="flex items-center gap-3">
              <Link to={createPageUrl("RequestAdminAccess")}>
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                  <Shield className="w-4 h-4 mr-2" />
                  Request Admin Access
                </Button>
              </Link>
              <Link to={createPageUrl("SuperAdminSetup")}>
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                  <Shield className="w-4 h-4 mr-2" />
                  Super Admin Setup
                </Button>
              </Link>
              <Button onClick={handleGetStarted} className="bg-blue-600 hover:bg-blue-700">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-4 py-2 rounded-full mb-6">
              <Trophy className="w-4 h-4" />
              Sports Management Platform
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Professional Sports
              <span className="text-blue-600"> Scoring & Management</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Complete basketball and volleyball management system. Track games, players, and teams with real-time scoring and comprehensive analytics.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleGetStarted}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12"
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button 
                onClick={handleRequestAccess}
                size="lg"
                variant="outline"
                className="border-gray-300 hover:bg-gray-50 px-8 h-12"
              >
                <Shield className="w-4 h-4 mr-2" />
                Request Admin Access
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-sm transition-all">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Live Scoring</h3>
              <p className="text-gray-600 text-sm">Real-time game scoring with detailed statistics tracking</p>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-sm transition-all">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Team Management</h3>
              <p className="text-gray-600 text-sm">Organize teams, players, and coaching staff efficiently</p>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-sm transition-all">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics</h3>
              <p className="text-gray-600 text-sm">Comprehensive statistics and performance insights</p>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-sm transition-all">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                <Trophy className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Multi-Sport</h3>
              <p className="text-gray-600 text-sm">Support for basketball and volleyball leagues</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Everything you need to manage your league
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Built for sports organizations, teams, and administrators who need professional-grade tools for game management and player tracking.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Real-time Updates</h4>
                    <p className="text-gray-600 text-sm">Live score updates and instant statistics for all games</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Multi-Organization</h4>
                    <p className="text-gray-600 text-sm">Manage multiple organizations from a single dashboard</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Easy to Use</h4>
                    <p className="text-gray-600 text-sm">Intuitive interface designed for quick score entry</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-gray-100 rounded-2xl p-12 border border-gray-200">
              <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-600">LIVE GAME</span>
                  <span className="bg-red-100 text-red-600 text-xs font-semibold px-3 py-1 rounded-full">Q3 • 5:23</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg"></div>
                      <span className="font-semibold text-gray-900">Team Alpha</span>
                    </div>
                    <span className="text-3xl font-bold text-gray-900">78</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-300 rounded-lg"></div>
                      <span className="font-semibold text-gray-900">Team Beta</span>
                    </div>
                    <span className="text-3xl font-bold text-gray-900">72</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">24</div>
                  <div className="text-xs text-gray-600 mt-1">Teams</div>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">156</div>
                  <div className="text-xs text-gray-600 mt-1">Players</div>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">89</div>
                  <div className="text-xs text-gray-600 mt-1">Games</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">Ready to get started?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Join ALAB today and streamline your sports management
          </p>
          <Button 
            onClick={handleGetStarted}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900">ALAB</span>
            </div>
            <p className="text-gray-600 text-sm">&copy; 2025 ALAB Sports Management. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
