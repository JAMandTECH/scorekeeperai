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
      setUser(currentUser);
      
      if (currentUser.role === 'admin') {
        navigate(createPageUrl("Dashboard"));
      }
    } catch (error) {
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

      // Mark code as used
      await base44.entities.AdminRequest.update(approvedRequest.id, {
        code_used: true,
      });

      // Update user to admin with organization
      await base44.auth.updateMe({
        role: 'admin',
        organization_id: approvedRequest.organization_id,
      });

      return true;
    },
    onSuccess: () => {
      window.location.href = createPageUrl("Dashboard");
    },
    onError: (error) => {
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!approvedRequest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <CardTitle>No Approved Request</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <CardTitle>Verify Admin Access Code</CardTitle>
          </div>
          <p className="text-sm text-gray-600">
            Enter the access code sent to your email to activate admin access
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-900 font-medium mb-1">✓ Request Approved!</p>
              <p className="text-sm text-green-700">
                Organization: <strong>{approvedRequest.organization_name}</strong>
              </p>
            </div>

            <div>
              <Label htmlFor="code">Access Code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Enter your access code"
                className="text-center text-lg font-mono tracking-wider"
                maxLength={20}
              />
              <p className="text-xs text-gray-500 mt-1">
                Check your email for the access code
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={verifyMutation.isLoading}
            >
              {verifyMutation.isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Verifying...
                </span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Verify & Activate Admin Access
                </>
              )}
            </Button>

            <Button 
              type="button"
              onClick={() => navigate(createPageUrl("Home"))}
              variant="outline"
              className="w-full"
            >
              Cancel
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}