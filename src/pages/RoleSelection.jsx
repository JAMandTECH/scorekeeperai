import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, User, ArrowRight } from "lucide-react";

export default function RoleSelection() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      console.log("RoleSelection: Checking user...");
      const currentUser = await base44.auth.me();
      console.log("RoleSelection: User loaded", currentUser);
      
      // FIRST PRIORITY: Check for approved admin requests that need code verification
      console.log("RoleSelection: Checking for approved admin requests...");
      const approvedRequests = await base44.entities.AdminRequest.filter({
        user_email: currentUser.email,
        status: 'approved',
        code_used: false,
      });
      
      if (approvedRequests.length > 0) {
        console.log("RoleSelection: Found approved request, redirecting to VerifyAdminCode");
        setLoading(false);
        navigate(createPageUrl("VerifyAdminCode"));
        return;
      }
      
      // If user already completed onboarding, redirect to Home
      if (currentUser?.onboarding_completed === true) {
        console.log("RoleSelection: User already completed onboarding, redirecting to Home");
        setLoading(false);
        navigate(createPageUrl("Home"));
        return;
      }
      
      // If user is a SUPER ADMIN (already fully set up), redirect to Dashboard
      if (currentUser?.role === 'admin' && currentUser?.is_super_admin === true) {
        console.log("RoleSelection: User is super admin, redirecting to Dashboard");
        setLoading(false);
        navigate(createPageUrl("Dashboard"));
        return;
      }
      
      // If user is an admin with organization (already set up), redirect to Dashboard
      if (currentUser?.role === 'admin' && currentUser?.organization_id) {
        console.log("RoleSelection: User is admin with organization, redirecting to Dashboard");
        setLoading(false);
        navigate(createPageUrl("Dashboard"));
        return;
      }
      
      // User needs to select role - show the form
      console.log("RoleSelection: Showing role selection form");
      setUser(currentUser);
      setLoading(false);
      
    } catch (error) {
      console.error("RoleSelection: Error loading user", error);
      setError(error.message);
      setLoading(false);
      
      // Not logged in - redirect to login after a brief moment
      setTimeout(() => {
        base44.auth.redirectToLogin(createPageUrl("RoleSelection"));
      }, 500);
    }
  };

  const handleRegularUser = async () => {
    try {
      console.log("RoleSelection: User selected Regular User - redirecting to AssociateOrganization");
      setLoading(true);
      
      // DO NOT set onboarding_completed here - it will be set after organization association
      // Just redirect to AssociateOrganization page
      navigate(createPageUrl("AssociateOrganization"));
    } catch (error) {
      console.error("Error navigating to organization association:", error);
      setLoading(false);
      alert("There was an error. Please try again.");
    }
  };

  const handleAdminRequest = async () => {
    try {
      console.log("RoleSelection: User selected Admin Access - redirecting to RequestAdminAccess");
      setLoading(true);
      
      // DO NOT set onboarding_completed here - it will be set after the Super Admin approves
      // Just redirect to the request form
      navigate(createPageUrl("RequestAdminAccess"));
    } catch (error) {
      console.error("Error navigating to admin request:", error);
      setLoading(false);
      alert("There was an error. Please try again.");
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-900 dark:via-blue-950/20 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading your profile...</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-900 dark:via-blue-950/20 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">Redirecting to login...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show "no user" state
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-900 dark:via-blue-950/20 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 font-medium">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Show role selection form
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-900 dark:via-blue-950/20 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-2xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
              </svg>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4">
            Welcome to ALAB Sports! 👋
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 font-medium max-w-2xl mx-auto">
            Hi <strong>{user?.full_name || 'there'}</strong>! Let's get you set up. How would you like to use ALAB Sports?
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Regular User Option */}
          <Card className="relative overflow-hidden border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-2xl transition-all duration-300 cursor-pointer group bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-950/30">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-3xl"></div>
            <CardHeader className="relative z-10 pb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                <User className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-black text-gray-900 dark:text-white">
                I'm a Regular User
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 space-y-4">
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Browse league information, view team standings, check player statistics, and follow games from multiple organizations.
              </p>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  View league standings and statistics
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Follow multiple organizations
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Check game schedules and results
                </li>
              </ul>
              <Button 
                onClick={handleRegularUser}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold shadow-lg group-hover:shadow-xl transition-all"
              >
                Continue as Regular User
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Admin Option */}
          <Card className="relative overflow-hidden border-2 border-orange-200 dark:border-orange-800 hover:border-orange-400 dark:hover:border-orange-600 hover:shadow-2xl transition-all duration-300 cursor-pointer group bg-gradient-to-br from-white to-orange-50 dark:from-gray-800 dark:to-orange-950/30">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/20 to-transparent rounded-full blur-3xl"></div>
            <CardHeader className="relative z-10 pb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-black text-gray-900 dark:text-white">
                I Need Admin Access
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 space-y-4">
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Manage your sports organization, create teams, schedule games, and track live scores.
              </p>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                  Manage teams and players
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                  Schedule and manage games
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                  Live game scoring and statistics
                </li>
              </ul>
              <Button 
                onClick={handleAdminRequest}
                className="w-full bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 text-white font-bold shadow-lg group-hover:shadow-xl transition-all"
              >
                Request Admin Access
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Don't worry, you can always change this later!
          </p>
        </div>
      </div>
    </div>
  );
}