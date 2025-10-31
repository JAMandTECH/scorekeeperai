import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Trophy, TrendingUp, Users, BarChart3, Play, CheckCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Home() {
  const navigate = useNavigate();
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // If user exists but doesn't have user_type set, show setup dialog
      if (currentUser && !currentUser.user_type) {
        setShowSetupDialog(true);
      } else if (currentUser) {
        // Redirect based on user type
        if (currentUser.user_type === "super_admin") {
          navigate(createPageUrl("SuperAdminDashboard"));
        } else if (currentUser.organization_id) {
          navigate(createPageUrl("Dashboard"));
        } else {
          // User is logged in but not assigned
          setShowSetupDialog(true);
        }
      }
    } catch (error) {
      // User not authenticated, stay on landing page
    }
  };

  const handleGetStarted = () => {
    base44.auth.redirectToLogin(createPageUrl("Home"));
  };

  const setupAsSuperAdmin = async () => {
    try {
      await base44.auth.updateMe({
        user_type: "super_admin"
      });
      setShowSetupDialog(false);
      navigate(createPageUrl("SuperAdminDashboard"));
    } catch (error) {
      console.error("Error setting up user:", error);
    }
  };

  const setupAsOrgAdmin = async () => {
    try {
      await base44.auth.updateMe({
        user_type: "org_admin"
      });
      setShowSetupDialog(false);
      alert("You've been set as Organization Admin. A Super Admin needs to assign you to an organization.");
    } catch (error) {
      console.error("Error setting up user:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="container mx-auto px-6 py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-white">
              <div className="inline-block mb-4">
                <span className="bg-yellow-400 text-slate-900 px-4 py-2 rounded-full text-sm font-semibold">
                  Professional Sports Management
                </span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                ALAB <span className="text-yellow-400">Basketball</span> and{" "}
                <span className="text-yellow-400">Volleyball</span> System
              </h1>
              <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                Professional basketball and volleyball scoring and statistics management system.
                Track games, players, and teams in real-time with comprehensive analytics and live streaming integration.
              </p>
              <div className="flex gap-4">
                <Button
                  onClick={handleGetStarted}
                  size="lg"
                  className="bg-yellow-400 text-slate-900 hover:bg-yellow-500 font-semibold px-8 py-6 text-lg"
                >
                  Get Started
                  <Play className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white text-white hover:bg-white/10 px-8 py-6 text-lg"
                >
                  Learn More
                </Button>
              </div>
            </div>

            {/* Right Image */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-3xl transform rotate-6 opacity-20" />
              <img
                src="https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=1080"
                alt="Basketball game"
                className="rounded-3xl shadow-2xl relative z-10 w-full"
              />
              <div className="absolute bottom-8 right-8 bg-white rounded-2xl p-6 shadow-xl z-20">
                <p className="text-sm text-slate-600 mb-1">Professional scoring system</p>
                <p className="text-3xl font-bold text-slate-900">Live Stats</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Everything you need to manage your games
            </h2>
            <p className="text-xl text-slate-600">
              Comprehensive tools for basketball and volleyball organizations, teams, and score keepers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<TrendingUp className="w-8 h-8" />}
              title="Live Scoring"
              description="Real-time score tracking with quarter-by-quarter breakdowns, set by set breakdown and player statistics."
              color="bg-blue-500"
            />
            <FeatureCard
              icon={<Users className="w-8 h-8" />}
              title="Team Management"
              description="Manage teams, players, and track performance across multiple divisions."
              color="bg-green-500"
            />
            <FeatureCard
              icon={<Play className="w-8 h-8" />}
              title="Live Streaming"
              description="Integrated live streaming support for remote game viewing and sharing."
              color="bg-purple-500"
            />
            <FeatureCard
              icon={<BarChart3 className="w-8 h-8" />}
              title="Advanced Statistics"
              description="Detailed player and team statistics with historical performance tracking."
              color="bg-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Trusted by Teams
            </h2>
            <p className="text-xl text-slate-800">
              Powering Basketball and Volleyball Leagues
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <StatCard number="50+" label="Active Teams" />
            <StatCard number="1000+" label="Players" />
            <StatCard number="200+" label="Games Scored" />
            <StatCard number="3" label="Divisions" />
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-slate-900 py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to get started?
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Join ALAB today and take your sports management to the next level
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="bg-yellow-400 text-slate-900 hover:bg-yellow-500 font-semibold px-8 py-6 text-lg"
            >
              Sign up now
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-white text-white hover:bg-white/10 px-8 py-6 text-lg"
            >
              Learn more
            </Button>
          </div>
        </div>
      </div>

      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Welcome to ALAB Sports! 🏀🏐</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-600">
              Choose your role to get started:
            </p>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-orange-500" onClick={setupAsSuperAdmin}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-xl flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">Super Administrator</h3>
                    <p className="text-sm text-slate-600">
                      Manage multiple organizations, create admins, and oversee all games system-wide.
                    </p>
                    <div className="mt-3">
                      <Button className="w-full bg-orange-500 hover:bg-orange-600">
                        Set as Super Admin
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-500" onClick={setupAsOrgAdmin}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">Organization Admin</h3>
                    <p className="text-sm text-slate-600">
                      Manage teams, players, and games for your organization.
                    </p>
                    <div className="mt-3">
                      <Button variant="outline" className="w-full">
                        Set as Org Admin
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FeatureCard({ icon, title, description, color }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
      <div className={`${color} w-16 h-16 rounded-xl flex items-center justify-center text-white mb-4`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}

function StatCard({ number, label }) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 text-center">
      <div className="text-5xl font-bold text-white mb-2">{number}</div>
      <div className="text-lg text-slate-900 font-medium">{label}</div>
    </div>
  );
}