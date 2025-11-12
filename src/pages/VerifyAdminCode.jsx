
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, CheckCircle, AlertCircle } from "lucide-react";

export default function VerifyAdminCode() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      console.log("VerifyAdminCode: User loaded", currentUser);
      setUser(currentUser);
      
      // IMPORTANT: Check if user is already admin with organization AND has used their code
      // If code_used is true for all their approved requests, they've already verified
      if (currentUser.role === 'admin' && currentUser.organization_id) {
        const approvedRequests = await base44.entities.AdminRequest.filter({ 
          user_email: currentUser.email,
          status: 'approved',
        });
        
        // If all approved requests have been used, redirect to dashboard
        const hasUnusedCode = approvedRequests.some(req => !req.code_used);
        if (!hasUnusedCode && currentUser.onboarding_completed) { // Also check onboarding_completed
          console.log("VerifyAdminCode: User already admin with org and code used, and onboarding complete. Redirecting to Dashboard");
          navigate(createPageUrl("Dashboard"));
        } else if (!currentUser.onboarding_completed && !hasUnusedCode) {
           // If user is admin, code used, but onboarding not completed, means they are on the last step of onboarding
           // We allow them to proceed here to complete onboarding.
           console.log("VerifyAdminCode: User is admin, code used, but onboarding not complete. Allowing to proceed to complete onboarding.");
        }
      }
    } catch (error) {
      console.error("VerifyAdminCode: Error loading user", error);
      base44.auth.redirectToLogin(createPageUrl("VerifyAdminCode"));
    }
    setLoading(false);
  };

  const { data: approvedRequest } = useQuery({
    queryKey: ['approvedRequest', user?.email],
    queryFn: async () => {
      const requests = await base44.entities.AdminRequest.filter({ 
        user_email: user?.email,
        status: 'approved',
        code_used: false,
      });
      return requests[0] || null;
    },
    enabled: !!user?.email,
  });

  const verifyMutation = useMutation({
    mutationFn: async (enteredCode) => {
      if (!approvedRequest) {
        throw new Error('No approved request found for your account');
      }

      if (enteredCode.toUpperCase() !== approvedRequest.access_code.toUpperCase()) {
        throw new Error('Invalid access code');
      }

      console.log("VerifyAdminCode: Code is valid, marking as used");

      // Mark code as used
      await base44.entities.AdminRequest.update(approvedRequest.id, {
        code_used: true,
      });

      console.log("VerifyAdminCode: Code marked as used");

      // CRITICAL: Now mark onboarding as completed
      // This allows the user to access the Dashboard
      console.log("VerifyAdminCode: Setting onboarding_completed to true");
      await base44.auth.updateMe({
        onboarding_completed: true,
      });
      
      console.log("VerifyAdminCode: User fully verified and onboarding complete");

      return true;
    },
    onSuccess: () => {
      console.log("VerifyAdminCode: Success, redirecting to Dashboard");
      window.location.href = createPageUrl("Dashboard");
    },
    onError: (error) => {
      console.error("VerifyAdminCode: Error", error);
      setError(error.message || 'Verification failed');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (!code.trim()) {
      setError('Please enter an access code');
      return;
    }

    verifyMutation.mutate(code.trim());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!approvedRequest) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-gray-900 dark:text-white">No Approved Request</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              You don't have any approved admin access requests. Please request admin access first.
            </p>
            <div className="flex gap-3">
              <Button 
                onClick={() => navigate(createPageUrl("RequestAdminAccess"))}
                className="flex-1"
              >
                Request Access
              </Button>
              <Button 
                onClick={() => navigate(createPageUrl("Home"))}
                variant="outline"
                className="flex-1"
              >
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/30 to-gray-50 dark:from-gray-900 dark:via-green-950/10 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-2 border-green-200 dark:border-green-800 shadow-2xl">
        <CardHeader className="border-b-2 border-green-100 dark:border-green-900 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl font-black text-gray-900 dark:text-white">Verify Admin Access Code</CardTitle>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            Enter the access code sent to your email to confirm your admin access
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-200 dark:border-green-800 rounded-xl p-5">
              <p className="text-sm text-green-900 dark:text-green-300 font-bold mb-2">✓ Request Approved!</p>
              <p className="text-sm text-green-800 dark:text-green-400 font-medium">
                Organization: <strong>{approvedRequest.organization_name}</strong>
              </p>
              <p className="text-xs text-green-700 dark:text-green-500 mt-2">
                Your admin role has been activated. Enter the code to confirm.
              </p>
            </div>

            <div>
              <Label htmlFor="code" className="text-base font-bold text-gray-700 dark:text-gray-300 mb-2">Access Code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Enter your access code"
                className="text-center text-2xl font-mono tracking-wider border-2 border-gray-300 dark:border-gray-600 focus:border-green-500 dark:focus:border-green-400 font-bold"
                maxLength={20}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
                📧 Check your email for the access code
              </p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-400 font-medium">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-lg py-6 font-black shadow-xl"
              disabled={verifyMutation.isLoading}
            >
              {verifyMutation.isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Verifying...
                </span>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Verify & Access Dashboard
                </>
              )}
            </Button>

            <Button 
              type="button"
              onClick={() => navigate(createPageUrl("Home"))}
              variant="outline"
              className="w-full border-2 border-gray-300 dark:border-gray-600 font-bold"
            >
              Cancel
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
