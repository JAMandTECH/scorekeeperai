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
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminApprovals() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewMode, setViewMode] = useState('card');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    checkAccess();
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
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

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogout = () => {
    base44.auth.logout(createPageUrl("PublicLanding"));
  };

  const { data: requests = [] } = useQuery({
    queryKey: ['adminRequests'],
    queryFn: async () => {
      try {
        const allRequests = await base44.entities.AdminRequest.list('-created_date');
        console.log("AdminApprovals - All requests fetched:", allRequests);
        return allRequests;
      } catch (error) {
        console.error("AdminApprovals - Error fetching requests:", error);
        return [];
      }
    },
    enabled: !!user,
    refetchInterval: 10000,
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

      const requestingUser = allUsers.find(u => u.email === request.user_email);
      if (!requestingUser) {
        throw new Error(`User not found: ${request.user_email}`);
      }
      
      await base44.entities.User.update(requestingUser.id, {
        role: 'admin',
        organization_id: newOrg.id,
      });

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');

  const RequestCard = ({ request }) => (
    <Card className="hover:border-foreground/20 transition-colors">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-heading font-bold">{request.user_name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{request.organization_name}</p>
          </div>
          <Badge variant="outline" className={
            request.status === 'approved' ? 'border-primary text-primary' :
            request.status === 'rejected' ? 'border-destructive text-destructive' :
            'border-foreground/60 text-foreground'
          }>
            {request.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
            {request.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
            {request.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
            {request.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="w-4 h-4" />
          {request.user_email}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="w-4 h-4" />
          {request.phone_number}
        </div>
        <div className="bg-muted p-3 border border-border">
          <p className="text-sm font-heading font-bold text-foreground mb-1">Reason:</p>
          <p className="text-sm text-muted-foreground">{request.reason}</p>
        </div>
        <div className="text-xs text-muted-foreground">
          Submitted: {new Date(request.created_date).toLocaleString()}
        </div>

        {request.status === 'pending' && (
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => setSelectedRequest(request)}
              className="flex-1 font-medium"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
            <Button
              onClick={() => rejectMutation.mutate(request.id)}
              variant="outline"
              className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 font-medium"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </div>
        )}

        {request.status === 'approved' && (
          <div className="bg-primary/10 border border-primary/30 p-3 text-sm">
            <p className="font-heading font-bold text-primary">Code: {request.access_code}</p>
            <p className="text-primary text-xs mt-1">
              {request.code_used ? 'Code has been used' : 'Code not yet used'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const RequestTable = ({ requests: tableRequests, title }) => (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="text-xl font-heading font-bold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="text-left py-4 px-4 text-muted-foreground font-heading font-bold text-sm">NAME</th>
                <th className="text-left py-4 px-4 text-muted-foreground font-heading font-bold text-sm">ORGANIZATION</th>
                <th className="text-left py-4 px-4 text-muted-foreground font-heading font-bold text-sm">CONTACT</th>
                <th className="text-left py-4 px-4 text-muted-foreground font-heading font-bold text-sm">DATE</th>
                <th className="text-center py-4 px-4 text-muted-foreground font-heading font-bold text-sm">STATUS</th>
                <th className="text-center py-4 px-4 text-muted-foreground font-heading font-bold text-sm">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {tableRequests.map((request) => (
                <tr key={request.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="py-4 px-4">
                    <p className="font-heading font-bold text-foreground">{request.user_name}</p>
                    <p className="text-xs text-muted-foreground">{request.user_email}</p>
                  </td>
                  <td className="py-4 px-4 text-foreground font-medium">{request.organization_name}</td>
                  <td className="py-4 px-4 text-muted-foreground text-sm">{request.phone_number}</td>
                  <td className="py-4 px-4 text-muted-foreground text-sm">{new Date(request.created_date).toLocaleDateString()}</td>
                  <td className="py-4 px-4 text-center">
                    <Badge variant="outline" className={
                      request.status === 'approved' ? 'border-primary text-primary font-medium' :
                      request.status === 'rejected' ? 'border-destructive text-destructive font-medium' :
                      'border-foreground/60 text-foreground font-medium'
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
                            className="font-medium"
                          >
                            Approve
                          </Button>
                          <Button
                            onClick={() => rejectMutation.mutate(request.id)}
                            size="sm"
                            variant="outline"
                            className="border-destructive/30 text-destructive hover:bg-destructive/10 font-medium"
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {request.status === 'approved' && (
                        <span className="text-xs text-primary font-heading font-bold">Code: {request.access_code}</span>
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
    <div className="min-h-screen bg-background text-foreground">
      <AdminHeader 
        user={user}
        organization={null}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        handleLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="flex">
        <AdminSidebar 
          user={user}
          organization={null}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          handleLogout={handleLogout}
        />

        <main className="flex-1 min-w-0">
          <div className="p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 border border-border flex items-center justify-center">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-heading font-bold">Admin Approvals</h1>
                    <p className="text-muted-foreground">Review and approve admin access requests</p>
                  </div>
                </div>

                {/* View Toggle */}
                <div className="flex border border-border p-1">
                  <Button
                    variant={viewMode === 'card' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('card')}
                    className="font-medium"
                  >
                    <LayoutGrid className="w-4 h-4 mr-2" />
                    Cards
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="font-medium"
                  >
                    <Table className="w-4 h-4 mr-2" />
                    Table
                  </Button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground font-medium">Pending</p>
                        <p className="text-3xl font-heading font-bold tabular-nums">{pendingRequests.length}</p>
                      </div>
                      <Clock className="w-8 h-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground font-medium">Approved</p>
                        <p className="text-3xl font-heading font-bold tabular-nums">{approvedRequests.length}</p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground font-medium">Rejected</p>
                        <p className="text-3xl font-heading font-bold tabular-nums">{rejectedRequests.length}</p>
                      </div>
                      <XCircle className="w-8 h-8 text-destructive" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {viewMode === 'card' ? (
                <>
                  {pendingRequests.length > 0 && (
                    <div>
                      <h2 className="text-xl font-heading font-bold mb-4">Pending Requests</h2>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingRequests.map(request => (
                          <RequestCard key={request.id} request={request} />
                        ))}
                      </div>
                    </div>
                  )}

                  {approvedRequests.length > 0 && (
                    <div>
                      <h2 className="text-xl font-heading font-bold mb-4">Approved Requests</h2>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {approvedRequests.map(request => (
                          <RequestCard key={request.id} request={request} />
                        ))}
                      </div>
                    </div>
                  )}

                  {rejectedRequests.length > 0 && (
                    <div>
                      <h2 className="text-xl font-heading font-bold mb-4">Rejected Requests</h2>
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
                  {pendingRequests.length > 0 && (
                    <RequestTable requests={pendingRequests} title="Pending Requests" />
                  )}
                  {approvedRequests.length > 0 && (
                    <RequestTable requests={approvedRequests} title="Approved Requests" />
                  )}
                  {rejectedRequests.length > 0 && (
                    <RequestTable requests={rejectedRequests} title="Rejected Requests" />
                  )}
                </div>
              )}

              {requests.length === 0 && (
                <div className="text-center py-16">
                  <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg">No admin requests yet</p>
                </div>
              )}

              {/* Approval Confirmation Dialog */}
              <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Approve Admin Access</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Review the details and confirm approval. The organization will be created automatically.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="bg-muted p-4 space-y-2 border border-border">
                      <div className="flex items-start gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Organization to be created:</p>
                          <p className="text-sm font-heading font-bold text-foreground">{selectedRequest?.organization_name}</p>
                        </div>
                      </div>
                      <div className="border-t border-border pt-2 mt-2">
                        <p className="text-sm text-foreground"><strong>Admin:</strong> {selectedRequest?.user_name}</p>
                        <p className="text-sm text-foreground"><strong>Email:</strong> {selectedRequest?.user_email}</p>
                        <p className="text-sm text-foreground"><strong>Phone:</strong> {selectedRequest?.phone_number}</p>
                      </div>
                    </div>

                    <div className="bg-primary/10 border border-primary/30 p-3 text-sm text-foreground">
                      <strong>What will happen:</strong>
                      <ul className="mt-2 space-y-1 list-disc list-inside text-xs text-muted-foreground">
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
                        className="flex-1 font-medium"
                        disabled={approveMutation.isLoading}
                      >
                        {approveMutation.isLoading ? 'Processing...' : 'Approve & Create Organization'}
                      </Button>
                      <Button
                        onClick={() => setSelectedRequest(null)}
                        variant="outline"
                        className="flex-1 font-medium"
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
        </main>
      </div>
    </div>
  );
}