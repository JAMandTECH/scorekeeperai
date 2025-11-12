
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, XCircle, Clock, Mail, Phone, Building2, LayoutGrid, Table } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function AdminApprovals() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (currentUser.role !== 'admin' || !currentUser.is_super_admin) {
        navigate(createPageUrl("Dashboard"));
        return;
      }
      setUser(currentUser);
    } catch (error) {
      base44.auth.redirectToLogin(createPageUrl("AdminApprovals"));
    }
    setLoading(false);
  };

  const { data: requests = [] } = useQuery({
    queryKey: ['adminRequests'],
    queryFn: () => base44.entities.AdminRequest.list('-created_date'),
    enabled: !!user,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
  });

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const approveMutation = useMutation({
    mutationFn: async (requestId) => {
      const request = requests.find(r => r.id === requestId);
      const code = generateCode();
      
      console.log("Approving request for:", request.user_email);
      
      // Step 1: Create the organization
      console.log("Creating organization:", request.organization_name);
      const newOrg = await base44.entities.Organization.create({
        name: request.organization_name,
        contact_email: request.user_email,
        contact_phone: request.phone_number,
        status: 'active',
      });
      console.log("Organization created:", newOrg.id);

      // Step 2: Update the AdminRequest record with approval
      console.log("Updating admin request...");
      await base44.entities.AdminRequest.update(requestId, {
        status: 'approved',
        access_code: code,
        organization_id: newOrg.id,
      });
      console.log("Admin request updated with code:", code);

      // Step 3: Update the requesting user's role and organization
      // Find the user in the allUsers list
      const requestingUser = allUsers.find(u => u.email === request.user_email);
      if (!requestingUser) {
        throw new Error(`User not found: ${request.user_email}`);
      }
      
      console.log("Updating user role and organization for user:", requestingUser.id);
      
      // CRITICAL: DO NOT set onboarding_completed here!
      // User must verify their code first before onboarding is complete
      // IMPORTANT: Update the user record directly in the User entity
      // Since we're a super admin, we have permission to update other users
      await base44.entities.User.update(requestingUser.id, {
        role: 'admin',
        organization_id: newOrg.id,
        // onboarding_completed will be set to true in VerifyAdminCode after they enter the code
      });
      console.log("User updated successfully - now admin of organization:", newOrg.id);

      // Step 4: Send confirmation email with access code
      console.log("Sending confirmation email...");
      await base44.integrations.Core.SendEmail({
        to: request.user_email,
        subject: "🎉 Admin Access Approved - Enter Your Code!",
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a; border-bottom: 3px solid #16a34a; padding-bottom: 10px;">
              Your Admin Access Has Been Approved! 🎉
            </h2>
            
            <p style="font-size: 16px; color: #1f2937;">Hello ${request.user_name},</p>
            
            <p style="font-size: 16px; color: #1f2937;">
              Great news! Your request for admin access has been approved.
            </p>

            <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
              <h3 style="margin-top: 0; color: #15803d;">✅ Your Request is Approved!</h3>
              <p style="color: #166534;"><strong>Organization:</strong> ${request.organization_name}</p>
              <p style="color: #166534; margin-top: 10px;">
                Your organization has been created and you've been assigned as its administrator.
              </p>
            </div>

            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1f2937;">🔑 Your Confirmation Code:</h3>
              <p style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 5px; text-align: center; margin: 15px 0; font-family: monospace;">
                ${code}
              </p>
              <p style="color: #6b7280; font-size: 14px; text-align: center;">
                Enter this code to confirm your account when you log in
              </p>
            </div>

            <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1e40af;">📋 What's Next?</h3>
              <ol style="color: #1e3a8a; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Log in to the ALAB Sports system</li>
                <li style="margin-bottom: 8px;">You'll be prompted to enter your confirmation code</li>
                <li style="margin-bottom: 8px;">Enter the code above: <strong>${code}</strong></li>
                <li style="margin-bottom: 8px;">Access your admin dashboard and start managing your organization!</li>
              </ol>
            </div>

            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>⚠️ Important:</strong> This code is valid for one-time use only. Keep it secure!
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${window.location.origin}${createPageUrl('VerifyAdminCode')}" 
                 style="display: inline-block; background: #16a34a; color: white; padding: 14px 35px; 
                        text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Enter Code & Get Started →
              </a>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #1f2937; font-size: 16px;">
                As an organization administrator, you can now:
              </p>
              <ul style="color: #4b5563;">
                <li>Create and manage teams</li>
                <li>Add players to your rosters</li>
                <li>Schedule and manage games</li>
                <li>Track live scores and statistics</li>
                <li>Manage divisions and leagues</li>
              </ul>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
              <p>If you have any questions or need help getting started, don't hesitate to reach out to support.</p>
              <p style="margin-top: 10px;">
                Best regards,<br>
                <strong>ALAB Sports Management Team</strong>
              </p>
            </div>
          </div>
        `
      });
      console.log("Email sent successfully");

      return newOrg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminRequests']);
      queryClient.invalidateQueries(['all-users']);
      setSelectedRequest(null);
    },
    onError: (error) => {
      console.error("Error approving request:", error);
      alert(`Failed to approve request: ${error.message}`);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId) => {
      await base44.entities.AdminRequest.update(requestId, {
        status: 'rejected',
      });

      const request = requests.find(r => r.id === requestId);

      await base44.integrations.Core.SendEmail({
        to: request.user_email,
        subject: "Admin Access Request Update",
        body: `
          <h2>Admin Access Request Update</h2>
          <p>Hello ${request.user_name},</p>
          <p>Thank you for your interest in becoming an administrator.</p>
          <p>After reviewing your request for "${request.organization_name}", we are unable to approve admin access at this time.</p>
          <p>If you have questions or believe this was an error, please contact support.</p>
          <p>Best regards,<br>ALAB Sports Management Team</p>
        `
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminRequests']);
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');

  const RequestCard = ({ request }) => (
    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg text-gray-900 dark:text-white">{request.user_name}</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{request.organization_name}</p>
          </div>
          <Badge className={
            request.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200 dark:border-green-800' :
            request.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800' :
            'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
          }>
            {request.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
            {request.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
            {request.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
            {request.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Mail className="w-4 h-4" />
          {request.user_email}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Phone className="w-4 h-4" />
          {request.phone_number}
        </div>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason:</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{request.reason}</p>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Submitted: {new Date(request.created_date).toLocaleString()}
        </div>

        {request.status === 'pending' && (
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => setSelectedRequest(request)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
            <Button
              onClick={() => rejectMutation.mutate(request.id)}
              variant="outline"
              className="flex-1 border-2 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 font-bold"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </div>
        )}

        {request.status === 'approved' && (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm">
            <p className="font-medium text-green-900 dark:text-green-300">Code: {request.access_code}</p>
            <p className="text-green-700 dark:text-green-400 text-xs mt-1">
              {request.code_used ? '✓ Code has been used' : '○ Code not yet used'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const RequestTable = ({ requests: tableRequests, title }) => (
    <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
      <CardHeader className="border-b border-gray-200 dark:border-gray-700">
        <CardTitle className="text-xl font-black text-gray-900 dark:text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900 border-b-2 border-gray-200 dark:border-gray-700">
                <th className="text-left py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">NAME</th>
                <th className="text-left py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">ORGANIZATION</th>
                <th className="text-left py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">CONTACT</th>
                <th className="text-left py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">DATE</th>
                <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">STATUS</th>
                <th className="text-center py-4 px-4 text-gray-600 dark:text-gray-400 font-bold text-sm">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {tableRequests.map((request) => (
                <tr key={request.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="py-4 px-4">
                    <p className="font-bold text-gray-900 dark:text-white">{request.user_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{request.user_email}</p>
                  </td>
                  <td className="py-4 px-4 text-gray-900 dark:text-white font-semibold">{request.organization_name}</td>
                  <td className="py-4 px-4 text-gray-600 dark:text-gray-400 text-sm">{request.phone_number}</td>
                  <td className="py-4 px-4 text-gray-600 dark:text-gray-400 text-sm">{new Date(request.created_date).toLocaleDateString()}</td>
                  <td className="py-4 px-4 text-center">
                    <Badge className={
                      request.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200 dark:border-green-800 font-bold' :
                      request.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800 font-bold' :
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800 font-bold'
                    }>
                      {request.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-2 justify-center">
                      {request.status === 'pending' && (
                        <>
                          <Button
                            onClick={() => setSelectedRequest(request)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white font-bold"
                          >
                            Approve
                          </Button>
                          <Button
                            onClick={() => rejectMutation.mutate(request.id)}
                            size="sm"
                            variant="outline"
                            className="border-2 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 font-bold"
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {request.status === 'approved' && (
                        <span className="text-xs text-green-600 dark:text-green-400 font-bold">Code: {request.access_code}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 md:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Approvals</h1>
              <p className="text-gray-600 dark:text-gray-400">Review and approve admin access requests</p>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-1 shadow-sm">
            <Button
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('card')}
              className={`font-bold ${viewMode === 'card' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Cards
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className={`font-bold ${viewMode === 'table' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}
            >
              <Table className="w-4 h-4 mr-2" />
              Table
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/30 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">Pending</p>
                  <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-300">{pendingRequests.length}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 dark:text-green-400 font-medium">Approved</p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-300">{approvedRequests.length}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700 dark:text-red-400 font-medium">Rejected</p>
                  <p className="text-3xl font-bold text-red-900 dark:text-red-300">{rejectedRequests.length}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-600 dark:text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {viewMode === 'card' ? (
          <>
            {/* Pending Requests - Cards */}
            {pendingRequests.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Pending Requests</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingRequests.map(request => (
                    <RequestCard key={request.id} request={request} />
                  ))}
                </div>
              </div>
            )}

            {/* Approved Requests - Cards */}
            {approvedRequests.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Approved Requests</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {approvedRequests.map(request => (
                    <RequestCard key={request.id} request={request} />
                  ))}
                </div>
              </div>
            )}

            {/* Rejected Requests - Cards */}
            {rejectedRequests.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Rejected Requests</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rejectedRequests.map(request => (
                    <RequestCard key={request.id} request={request} />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6">
            {/* Pending Requests - Table */}
            {pendingRequests.length > 0 && (
              <RequestTable requests={pendingRequests} title="Pending Requests" />
            )}

            {/* Approved Requests - Table */}
            {approvedRequests.length > 0 && (
              <RequestTable requests={approvedRequests} title="Approved Requests" />
            )}

            {/* Rejected Requests - Table */}
            {rejectedRequests.length > 0 && (
              <RequestTable requests={rejectedRequests} title="Rejected Requests" />
            )}
          </div>
        )}

        {requests.length === 0 && (
          <div className="text-center py-16">
            <Shield className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">No admin requests yet</p>
          </div>
        )}

        {/* Approval Confirmation Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-md bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-white">Approve Admin Access</DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400">
                Review the details and confirm approval. The organization will be created automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-gray-600 dark:text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Organization to be created:</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedRequest?.organization_name}</p>
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                  <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Admin:</strong> {selectedRequest?.user_name}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Email:</strong> {selectedRequest?.user_email}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Phone:</strong> {selectedRequest?.phone_number}</p>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300">
                <strong>What will happen:</strong>
                <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
                  <li>A new organization will be created automatically</li>
                  <li>A unique access code will be generated</li>
                  <li>The requester's user role will be updated to 'admin' for this organization</li>
                  <li>The requester will receive an email with the code</li>
                  <li>They can use the code to confirm their admin account</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => approveMutation.mutate(selectedRequest.id)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
                  disabled={approveMutation.isLoading}
                >
                  {approveMutation.isLoading ? 'Processing...' : 'Approve & Create Organization'}
                </Button>
                <Button
                  onClick={() => setSelectedRequest(null)}
                  variant="outline"
                  className="flex-1 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold"
                  disabled={approveMutation.isLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
