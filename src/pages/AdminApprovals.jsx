import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, XCircle, Clock, Mail, Phone, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function AdminApprovals() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
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

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const approveMutation = useMutation({
    mutationFn: async (requestId) => {
      const request = requests.find(r => r.id === requestId);
      const code = generateCode();
      
      // Step 1: Create the Organization automatically from request details
      const newOrg = await base44.entities.Organization.create({
        name: request.organization_name,
        contact_email: request.user_email,
        contact_phone: request.phone_number,
        status: 'active',
      });

      // Step 2: Update request with code, approval, and organization_id
      await base44.entities.AdminRequest.update(requestId, {
        status: 'approved',
        access_code: code,
        organization_id: newOrg.id,
      });

      // Step 3: Send email with code to requester
      await base44.integrations.Core.SendEmail({
        to: request.user_email,
        subject: "Admin Access Approved - Access Code Inside",
        body: `
          <h2>Your Admin Access Request Has Been Approved!</h2>
          <p>Hello ${request.user_name},</p>
          <p>Great news! Your request for admin access has been approved.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Your Access Code:</h3>
            <p style="font-size: 24px; font-weight: bold; color: #2563eb; letter-spacing: 3px;">
              ${code}
            </p>
          </div>

          <p><strong>Organization:</strong> ${request.organization_name}</p>
          <p><strong>What's Next?</strong></p>
          <ol>
            <li>Log in to the ALAB Sports system</li>
            <li>You'll be redirected to enter your access code</li>
            <li>Enter the code above to activate your admin access</li>
            <li>Start managing your organization!</li>
          </ol>
          
          <p><strong>Important:</strong> This code is valid for one-time use only.</p>
          
          <p>Your organization has been automatically created in the system. Once you activate 
          your access, you'll be able to create teams, add players, schedule games, and manage 
          all aspects of your sports league.</p>
          
          <p>Best regards,<br>ALAB Sports Management Team</p>
        `
      });

      return newOrg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminRequests']);
      setSelectedRequest(null);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');

  const RequestCard = ({ request }) => (
    <Card className="border-gray-200">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{request.user_name}</CardTitle>
            <p className="text-sm text-gray-500 mt-1">{request.organization_name}</p>
          </div>
          <Badge className={
            request.status === 'approved' ? 'bg-green-100 text-green-700' :
            request.status === 'rejected' ? 'bg-red-100 text-red-700' :
            'bg-yellow-100 text-yellow-700'
          }>
            {request.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
            {request.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
            {request.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
            {request.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Mail className="w-4 h-4" />
          {request.user_email}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Phone className="w-4 h-4" />
          {request.phone_number}
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm font-medium text-gray-700 mb-1">Reason:</p>
          <p className="text-sm text-gray-600">{request.reason}</p>
        </div>
        <div className="text-xs text-gray-500">
          Submitted: {new Date(request.created_date).toLocaleString()}
        </div>

        {request.status === 'pending' && (
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => setSelectedRequest(request)}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
            <Button
              onClick={() => rejectMutation.mutate(request.id)}
              variant="outline"
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </div>
        )}

        {request.status === 'approved' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
            <p className="font-medium text-green-900">Code: {request.access_code}</p>
            <p className="text-green-700 text-xs mt-1">
              {request.code_used ? '✓ Code has been used' : '○ Code not yet used'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Approvals</h1>
          </div>
          <p className="text-gray-600">Review and approve admin access requests. Organizations will be created automatically upon approval.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-700 font-medium">Pending</p>
                  <p className="text-3xl font-bold text-yellow-900">{pendingRequests.length}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">Approved</p>
                  <p className="text-3xl font-bold text-green-900">{approvedRequests.length}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700 font-medium">Rejected</p>
                  <p className="text-3xl font-bold text-red-900">{rejectedRequests.length}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Pending Requests</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingRequests.map(request => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          </div>
        )}

        {/* Approved Requests */}
        {approvedRequests.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Approved Requests</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {approvedRequests.map(request => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          </div>
        )}

        {/* Rejected Requests */}
        {rejectedRequests.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Rejected Requests</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rejectedRequests.map(request => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          </div>
        )}

        {requests.length === 0 && (
          <div className="text-center py-16">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No admin requests yet</p>
          </div>
        )}

        {/* Approval Confirmation Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Approve Admin Access</DialogTitle>
              <DialogDescription>
                Review the details and confirm approval. The organization will be created automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-gray-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-600">Organization to be created:</p>
                    <p className="text-sm font-bold text-gray-900">{selectedRequest?.organization_name}</p>
                  </div>
                </div>
                <div className="border-t pt-2 mt-2">
                  <p className="text-sm"><strong>Admin:</strong> {selectedRequest?.user_name}</p>
                  <p className="text-sm"><strong>Email:</strong> {selectedRequest?.user_email}</p>
                  <p className="text-sm"><strong>Phone:</strong> {selectedRequest?.phone_number}</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-gray-700">
                <strong>What will happen:</strong>
                <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
                  <li>A new organization will be created automatically</li>
                  <li>A unique access code will be generated</li>
                  <li>The requester will receive an email with the code</li>
                  <li>They can use the code to activate their admin account</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => approveMutation.mutate(selectedRequest.id)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={approveMutation.isLoading}
                >
                  {approveMutation.isLoading ? 'Processing...' : 'Approve & Create Organization'}
                </Button>
                <Button
                  onClick={() => setSelectedRequest(null)}
                  variant="outline"
                  className="flex-1"
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