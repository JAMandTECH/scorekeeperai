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

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const approveMutation = useMutation({
    mutationFn: async (requestId) => {
      const request = requests.find(r => r.id === requestId);
      const code = generateCode();
      
      const newOrg = await base44.entities.Organization.create({
        name: request.organization_name,
        contact_email: request.user_email,
        contact_phone: request.phone_number,
        status: 'active',
      });

      await base44.entities.AdminRequest.update(requestId, {
        status: 'approved',
        access_code: code,
        organization_id: newOrg.id,
      });

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
                  <li>The requester will receive an email with the code</li>
                  <li>They can use the code to activate their admin account</li>
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