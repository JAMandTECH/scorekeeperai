import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, CheckCircle, AlertCircle } from "lucide-react";

export default function SuperAdminSetup() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [alreadySuperAdmin, setAlreadySuperAdmin] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAdmin(currentUser.role === 'admin');
      setAlreadySuperAdmin(currentUser.is_super_admin === true);
    } catch (error) {
      base44.auth.redirectToLogin(createPageUrl("SuperAdminSetup"));
    }
    setLoading(false);
  };

  const handleSetupSuperAdmin = async () => {
    setLoading(true);
    try {
      await base44.auth.updateMe({
        is_super_admin: true
      });
      setSuccess(true);
      setTimeout(() => {
        navigate(createPageUrl("Dashboard"));
        window.location.reload();
      }, 2000);
    } catch (error) {
      alert("Error setting up super admin. Please try again.");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <Card className="bg-gray-900 border-gray-800 max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-8 h-8" />
              <CardTitle className="text-white">Access Denied</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 mb-4">
              Only admin users can access the Super Admin Setup page.
            </p>
            <Button 
              onClick={() => navigate(createPageUrl("Home"))}
              variant="outline"
              className="w-full border-gray-700 text-white"
            >
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (alreadySuperAdmin && !success) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <Card className="bg-gray-900 border-gray-800 max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3 text-yellow-400">
              <Shield className="w-8 h-8" />
              <CardTitle className="text-white">Already Super Admin</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 mb-4">
              You are already set up as a Super Admin and have full access to all organizations.
            </p>
            <Button 
              onClick={() => navigate(createPageUrl("Dashboard"))}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <Card className="bg-gray-900 border-gray-800 max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3 text-green-400">
              <CheckCircle className="w-8 h-8" />
              <CardTitle className="text-white">Setup Complete!</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400">
              You have been successfully set up as Super Admin. Redirecting to dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <Card className="bg-gray-900 border-gray-800 max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-yellow-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-yellow-400" />
          </div>
          <CardTitle className="text-2xl text-white">Super Admin Setup</CardTitle>
          <p className="text-gray-400 text-sm mt-2">
            Set yourself as the Super Admin to manage all organizations
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gray-950 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Name:</span>
              <span className="text-white font-medium">{user?.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Email:</span>
              <span className="text-white font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Role:</span>
              <span className="text-yellow-400 font-medium">{user?.role}</span>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <h4 className="text-blue-400 font-semibold mb-2">Super Admin Privileges:</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <span>Manage all organizations in the system</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <span>View and manage all teams across organizations</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <span>Access system-wide game statistics</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <span>Full administrative control</span>
              </li>
            </ul>
          </div>

          <Button 
            onClick={handleSetupSuperAdmin}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold py-6 text-lg"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                Setting up...
              </span>
            ) : (
              <>
                <Shield className="w-5 h-5 mr-2" />
                Become Super Admin
              </>
            )}
          </Button>

          <Button 
            onClick={() => navigate(createPageUrl("Dashboard"))}
            variant="outline"
            className="w-full border-gray-700 text-gray-300"
          >
            Cancel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}