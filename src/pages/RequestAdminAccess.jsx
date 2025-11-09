import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Shield, CheckCircle, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function RequestAdminAccess() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      base44.auth.redirectToLogin(createPageUrl("RequestAdminAccess"));
    }
    setLoading(false);
  };

  const { data: existingRequest } = useQuery({
    queryKey: ['adminRequest', user?.email],
    queryFn: async () => {
      const requests = await base44.entities.AdminRequest.filter({ user_email: user?.email });
      return requests[0] || null;
    },
    enabled: !!user?.email,
  });

  const createRequestMutation = useMutation({
    mutationFn: async (data) => {
      const request = await base44.entities.AdminRequest.create(data);
      
      // Send email notification to super admin
      const superAdmins = await base44.entities.User.list();
      const superAdminEmails = superAdmins
        .filter(u => u.role === 'admin' && u.is_super_admin === true)
        .map(u => u.email);

      for (const email of superAdminEmails) {
        await base44.integrations.Core.SendEmail({
          to: email,
          subject: "New Admin Access Request",
          body: `
            <h2>New Admin Access Request</h2>
            <p><strong>From:</strong> ${data.user_name} (${data.user_email})</p>
            <p><strong>Organization:</strong> ${data.organization_name}</p>
            <p><strong>Phone:</strong> ${data.phone_number}</p>
            <p><strong>Reason:</strong> ${data.reason}</p>
            <br>
            <p>Please review this request in the Admin Approvals section.</p>
          `
        });
      }

      return request;
    },
    onSuccess: () => {
      setShowSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    createRequestMutation.mutate({
      user_email: user.email,
      user_name: user.full_name,
      organization_name: formData.get('organization_name'),
      phone_number: formData.get('phone_number'),
      reason: formData.get('reason'),
      status: 'pending',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (user?.role === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <CardTitle>Already Admin</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">You already have admin access!</p>
            <Button onClick={() => navigate(createPageUrl("Dashboard"))} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (existingRequest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                existingRequest.status === 'approved' ? 'bg-green-100' :
                existingRequest.status === 'rejected' ? 'bg-red-100' : 'bg-yellow-100'
              }`}>
                {existingRequest.status === 'approved' && <CheckCircle className="w-5 h-5 text-green-600" />}
                {existingRequest.status === 'rejected' && <XCircle className="w-5 h-5 text-red-600" />}
                {existingRequest.status === 'pending' && <Clock className="w-5 h-5 text-yellow-600" />}
              </div>
              <CardTitle>Request Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <Badge className={
                  existingRequest.status === 'approved' ? 'bg-green-100 text-green-700' :
                  existingRequest.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }>
                  {existingRequest.status.toUpperCase()}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Organization</span>
                <span className="text-sm font-medium">{existingRequest.organization_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Submitted</span>
                <span className="text-sm font-medium">
                  {new Date(existingRequest.created_date).toLocaleDateString()}
                </span>
              </div>
            </div>

            {existingRequest.status === 'pending' && (
              <p className="text-sm text-gray-600">
                Your request is being reviewed by a Super Admin. You'll receive an email when it's processed.
              </p>
            )}

            {existingRequest.status === 'approved' && !existingRequest.code_used && (
              <div className="space-y-3">
                <p className="text-sm text-green-600 font-medium">
                  ✅ Your request has been approved! Check your email for the access code.
                </p>
                <Button 
                  onClick={() => navigate(createPageUrl("VerifyAdminCode"))}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Enter Access Code
                </Button>
              </div>
            )}

            {existingRequest.status === 'rejected' && (
              <p className="text-sm text-red-600">
                Your request was not approved. Please contact support for more information.
              </p>
            )}

            <Button 
              onClick={() => navigate(createPageUrl("Home"))}
              variant="outline"
              className="w-full"
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <CardTitle>Request Organization Admin Access</CardTitle>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            This form allows you to request administrator access for your organization. 
            Once approved by a Super Admin, you'll be able to manage teams, players, games, 
            and all other aspects of your organization's sports league.
          </p>
        </CardHeader>
        <CardContent>
          {showSuccess && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertDescription className="text-green-800 font-medium">
                ✅ Request submitted successfully! You'll receive an email notification once 
                a Super Admin reviews your request. This page will refresh shortly.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Your Name</span>
                <span className="font-medium">{user?.full_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Your Email</span>
                <span className="font-medium">{user?.email}</span>
              </div>
            </div>

            <div>
              <Label htmlFor="organization_name">Organization Name *</Label>
              <Input
                id="organization_name"
                name="organization_name"
                placeholder="e.g., City Sports League, Regional Basketball Association"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the full name of your organization
              </p>
            </div>

            <div>
              <Label htmlFor="phone_number">Contact Phone Number *</Label>
              <Input
                id="phone_number"
                name="phone_number"
                type="tel"
                placeholder="e.g., +1234567890"
                required
              />
            </div>

            <div>
              <Label htmlFor="reason">Reason for Request *</Label>
              <Textarea
                id="reason"
                name="reason"
                placeholder="Please explain why you need admin access for this organization..."
                rows={4}
                required
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-700">
              <strong>What happens next?</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
                <li>Your request will be reviewed by a Super Admin</li>
                <li>You'll receive an email notification with the decision</li>
                <li>If approved, you'll get an access code to activate your admin account</li>
                <li>Your organization will be automatically created in the system</li>
              </ul>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={createRequestMutation.isLoading || showSuccess}
            >
              {createRequestMutation.isLoading ? 'Submitting Request...' : 'Submit Admin Access Request'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}