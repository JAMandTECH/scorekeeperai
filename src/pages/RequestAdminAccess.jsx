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
import { Shield, CheckCircle, Clock, XCircle, Info, Building2, Mail, Phone, MessageSquare, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function RequestAdminAccess() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
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
      console.log("Creating admin request with data:", data);
      
      // Step 1: Create the admin request
      const request = await base44.entities.AdminRequest.create(data);
      console.log("Admin request created:", request);
      
      // Step 2: Fetch super admin emails
      console.log("Fetching super admins...");
      const allUsers = await base44.entities.User.list();
      const superAdmins = allUsers.filter(u => u.role === 'admin' && u.is_super_admin === true);
      console.log("Found super admins:", superAdmins.length);

      if (superAdmins.length === 0) {
        console.warn("No super admins found to send email notification");
        return request; // Still return the request as created
      }

      // Step 3: Send email to each super admin
      const superAdminEmails = superAdmins.map(u => u.email);
      console.log("Sending emails to:", superAdminEmails);
      
      for (const email of superAdminEmails) {
        try {
          await base44.integrations.Core.SendEmail({
            to: email,
            subject: "🔔 New Admin Access Request - Action Required",
            body: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px;">
                  New Admin Access Request
                </h2>
                
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #1f2937;">👤 Requester Information</h3>
                  <p><strong>Name:</strong> ${data.user_name}</p>
                  <p><strong>Email:</strong> ${data.user_email}</p>
                  <p><strong>Phone:</strong> ${data.phone_number}</p>
                </div>

                <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #92400e;">🏢 Organization Details</h3>
                  <p><strong>Organization Name:</strong> ${data.organization_name}</p>
                </div>

                <div style="background: #e0e7ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #3730a3;">📝 Reason for Request</h3>
                  <p style="white-space: pre-wrap;">${data.reason}</p>
                </div>

                <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
                  <h3 style="margin-top: 0; color: #1e40af;">✅ What Happens When You Approve:</h3>
                  <ul style="color: #1e3a8a;">
                    <li>A new organization "${data.organization_name}" will be <strong>automatically created</strong></li>
                    <li>The requester will be granted admin role and assigned to this organization</li>
                    <li>A unique access code will be generated</li>
                    <li>The requester will receive an email with the code to confirm their access</li>
                  </ul>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <p style="color: #6b7280; font-size: 14px; margin-bottom: 10px;">
                    Review this request in the Admin Approvals section
                  </p>
                  <a href="${window.location.origin}${createPageUrl('AdminApprovals')}" 
                     style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; 
                            text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Go to Admin Approvals →
                  </a>
                </div>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
                  <p><strong>Note:</strong> The organization will be created automatically when you approve this request. 
                     The requester's user account will be upgraded to admin with the new organization assigned.</p>
                </div>
              </div>
            `
          });
          console.log("Email sent successfully to:", email);
        } catch (emailError) {
          console.error("Failed to send email to:", email, emailError);
          // Continue to next email even if one fails
        }
      }

      return request;
    },
    onSuccess: () => {
      console.log("Request creation successful, showing success message");
      setShowSuccess(true);
      setErrorMessage('');
      // Redirect to PublicLanding after 4 seconds
      setTimeout(() => {
        navigate(createPageUrl("PublicLanding"));
      }, 4000);
    },
    onError: (error) => {
      console.error("Request creation failed:", error);
      setErrorMessage(error.message || 'Failed to submit request. Please try again.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage(''); // Clear any previous errors
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (user?.role === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-2 border-green-200 dark:border-green-800">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-gray-900 dark:text-white">Already Admin</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">You already have admin access!</p>
            <Button onClick={() => navigate(createPageUrl("Dashboard"))} className="w-full bg-green-600 hover:bg-green-700 font-bold">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (existingRequest) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-2 border-gray-200 dark:border-gray-700 shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                existingRequest.status === 'approved' ? 'bg-green-100 dark:bg-green-900' :
                existingRequest.status === 'rejected' ? 'bg-red-100 dark:bg-red-900' : 'bg-yellow-100 dark:bg-yellow-900'
              }`}>
                {existingRequest.status === 'approved' && <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />}
                {existingRequest.status === 'rejected' && <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />}
                {existingRequest.status === 'pending' && <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />}
              </div>
              <CardTitle className="text-gray-900 dark:text-white">Request Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Status</span>
                <Badge className={
                  existingRequest.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200 dark:border-green-800 font-bold' :
                  existingRequest.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800 font-bold' :
                  'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800 font-bold'
                }>
                  {existingRequest.status.toUpperCase()}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Organization</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{existingRequest.organization_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Submitted</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(existingRequest.created_date).toLocaleDateString()}
                </span>
              </div>
            </div>

            {existingRequest.status === 'pending' && (
              <Alert className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-300 font-medium">
                  ⏳ Your request is being reviewed by a Super Admin. You'll receive an email when it's processed.
                </AlertDescription>
              </Alert>
            )}

            {existingRequest.status === 'approved' && !existingRequest.code_used && (
              <div className="space-y-3">
                <Alert className="bg-green-50 dark:bg-green-950/30 border-2 border-green-200 dark:border-green-800">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-800 dark:text-green-300 font-bold">
                    ✅ Your request has been approved! Check your email for the access code.
                  </AlertDescription>
                </Alert>
                <Button 
                  onClick={() => navigate(createPageUrl("VerifyAdminCode"))}
                  className="w-full bg-green-600 hover:bg-green-700 font-bold shadow-lg"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Enter Access Code
                </Button>
              </div>
            )}

            {existingRequest.status === 'rejected' && (
              <Alert className="bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-red-800 dark:text-red-300 font-medium">
                  Your request was not approved. Please contact support for more information.
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={() => navigate(createPageUrl("Home"))}
              variant="outline"
              className="w-full border-2 border-gray-300 dark:border-gray-600 font-bold"
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-green-950/20 dark:to-purple-950/20 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full border-2 border-green-300 dark:border-green-700 shadow-2xl animate-in fade-in zoom-in duration-500">
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl animate-bounce">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-3xl font-black text-gray-900 dark:text-white mb-2">
              Request Sent Successfully! 🎉
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              Your admin access request has been submitted
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="bg-green-100 dark:bg-green-950/50 border-2 border-green-300 dark:border-green-700">
              <Info className="h-5 w-5 text-green-700 dark:text-green-400" />
              <AlertDescription className="text-green-900 dark:text-green-300 font-medium">
                <strong>✅ Your request is now pending review</strong>
                <ul className="mt-2 ml-4 space-y-1 list-disc text-sm">
                  <li>A Super Admin will review your request shortly</li>
                  <li>You'll receive an email notification with their decision</li>
                  <li>If approved, you'll get an access code to activate your admin account</li>
                  <li>Your organization will be automatically created upon approval</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-5 text-center">
              <Mail className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
              <p className="text-sm text-blue-900 dark:text-blue-300 font-bold mb-2">
                📧 Check your email for updates
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400">
                We'll notify you at: <strong>{user?.email}</strong>
              </p>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Redirecting you to the home page in a moment...
              </p>
              <Button 
                onClick={() => navigate(createPageUrl("PublicLanding"))}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-bold shadow-lg"
              >
                Continue to Home Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-900 dark:via-blue-950/10 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full border-2 border-blue-200 dark:border-blue-800 shadow-2xl">
        <CardHeader className="border-b-2 border-blue-100 dark:border-blue-900 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-3xl font-black text-gray-900 dark:text-white">Request Organization Admin Access</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-1">
                Become an administrator for your sports organization
              </p>
            </div>
          </div>
          
          <Alert className="bg-blue-100 dark:bg-blue-950/50 border-2 border-blue-300 dark:border-blue-700">
            <Info className="h-5 w-5 text-blue-700 dark:text-blue-400" />
            <AlertDescription className="text-blue-900 dark:text-blue-300 text-sm font-medium">
              <strong>What is Organization Admin Access?</strong>
              <p className="mt-1">
                As an organization admin, you'll be able to manage teams, players, games, and all aspects of your sports league. 
                Your organization will be automatically created in the system upon approval.
              </p>
            </AlertDescription>
          </Alert>
        </CardHeader>
        
        <CardContent className="p-8">
          {errorMessage && (
            <Alert className="mb-6 bg-red-50 dark:bg-red-950/30 border-2 border-red-300 dark:border-red-800">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-800 dark:text-red-300 font-medium">
                <strong>Error submitting request:</strong>
                <p className="mt-1">{errorMessage}</p>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current User Info */}
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-950/30 rounded-xl p-5 border-2 border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-black text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Your Account Information
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 font-semibold">Name:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{user?.full_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 font-semibold">Email:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{user?.email}</span>
                </div>
              </div>
            </div>

            {/* Organization Name */}
            <div>
              <Label htmlFor="organization_name" className="text-base font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Organization Name *
              </Label>
              <Input
                id="organization_name"
                name="organization_name"
                placeholder="e.g., City Sports League, Regional Basketball Association"
                required
                className="text-base border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 font-medium"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
                💡 This organization will be automatically created when your request is approved
              </p>
            </div>

            {/* Contact Phone */}
            <div>
              <Label htmlFor="phone_number" className="text-base font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
                Contact Phone Number *
              </Label>
              <Input
                id="phone_number"
                name="phone_number"
                type="tel"
                placeholder="e.g., +1234567890"
                required
                className="text-base border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 font-medium"
              />
            </div>

            {/* Reason */}
            <div>
              <Label htmlFor="reason" className="text-base font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Reason for Request *
              </Label>
              <Textarea
                id="reason"
                name="reason"
                placeholder="Please explain why you need admin access for this organization. For example: 'I am the league director and need to manage teams and schedule games for the upcoming season.'"
                rows={5}
                required
                className="text-base border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 font-medium"
              />
            </div>

            {/* What Happens Next */}
            <Alert className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-2 border-indigo-200 dark:border-indigo-800">
              <CheckCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <AlertDescription className="text-indigo-900 dark:text-indigo-300 text-sm font-medium">
                <strong>What happens after you submit:</strong>
                <ul className="mt-2 ml-4 space-y-1 list-disc">
                  <li>Your request will be reviewed by a Super Admin</li>
                  <li>You'll receive an email notification with the decision</li>
                  <li>If approved, you'll get an access code to activate your admin account</li>
                  <li><strong>Your organization will be automatically created</strong> - no manual setup needed!</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg py-6 font-black shadow-xl"
              disabled={createRequestMutation.isLoading}
            >
              {createRequestMutation.isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                  Submitting Request...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5 mr-2" />
                  Submit Admin Access Request
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}