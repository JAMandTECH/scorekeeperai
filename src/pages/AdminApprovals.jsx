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

  const approveMutation = useMutation({
    mutationFn: async (requestId) => {
      const response = await base44.functions.invoke('approveAdminRequest', { request_id: requestId });
      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Failed to approve request');
      }
      return response.data;
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
      const response = await base44.functions.invoke('rejectAdminRequest', { request_id: requestId });
      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Failed to reject request');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminRequests']);
    },
  });

  if (loading) {
    return (
      <div className="arena-command min-h-screen bg-background flex items-center justify-center">
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
            <p className="font-heading font-bold text-primary">
              {request.code_used ? 'Code used' : 'Code sent — awaiting verification'}
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
                        <span className="text-xs text-primary font-heading font-bold">
                          {request.code_used ? 'Verified' : 'Awaiting verification'}
                        </span>
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
    <div className="arena-command min-h-screen bg-background text-foreground">
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