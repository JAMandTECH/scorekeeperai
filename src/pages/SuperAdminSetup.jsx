import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-gray-200">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <CardTitle className="text-gray-900">Access Denied</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Only admin users can access the Super Admin Setup page.
            </p>
            <Button 
              onClick={() => navigate(createPageUrl("Home"))}
              className="w-full"
              variant="outline"
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-gray-200">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <CardTitle className="text-gray-900">Already Super Admin</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              You are already set up as a Super Admin with full system access.
            </p>
            <Button 
              onClick={() => navigate(createPageUrl("Dashboard"))}
              className="w-full bg-blue-600 hover:bg-blue-700"
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-gray-200">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <CardTitle className="text-gray-900">Setup Complete!</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              You have been successfully set up as Super Admin. Redirecting...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full border-gray-200">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl text-gray-900">Super Admin Setup</CardTitle>
          <p className="text-gray-600 text-sm mt-2">
            Upgrade your account to manage all organizations
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Name</span>
              <span className="text-gray-900 font-medium">{user?.full_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Email</span>
              <span className="text-gray-900 font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Role</span>
              <span className="text-blue-600 font-medium">{user?.role}</span>
            </div>
          </div>

          {/* Privileges */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">What you'll get:</h4>
            <div className="space-y-2">
              {[
                'Manage all organizations',
                'View all teams and players',
                'Access system-wide statistics',
                'Full administrative control'
              ].map((privilege, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{privilege}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button 
              onClick={handleSetupSuperAdmin}
              className="w-full bg-blue-600 hover:bg-blue-700 h-11"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Setting up...
                </span>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Become Super Admin
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            <Button 
              onClick={() => navigate(createPageUrl("Dashboard"))}
              variant="outline"
              className="w-full h-11"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}