import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { UserPlus, Clock, CheckCircle, XCircle, Mail, MessageSquare, Shield } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";

export default function OrganizationJoinRequests() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (currentUser.role !== 'admin') {
        navigate(createPageUrl("Home"));
        return;
      }
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
      base44.auth.redirectToLogin(createPageUrl("OrganizationJoinRequests"));
    } finally {
      setLoading(false);
    }
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
    base44.auth.logout(createPageUrl("Home"));
  };

  // Fetch organization
  const { data: organization } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      const orgs = await base44.entities.Organization.list();
      return orgs.find(o => o.id === user?.organization_id);
    },
    enabled: !!user?.organization_id,
  });

  // Fetch join requests for this organization
  const { data: joinRequests = [] } = useQuery({
    queryKey: ['join-requests', user?.organization_id],
    queryFn: () => base44.entities.OrganizationJoinRequest.filter({ organization_id: user?.organization_id }),
    enabled: !!user?.organization_id,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (request) => {
      // Create UserOrganization entry
      await base44.entities.UserOrganization.create({
        user_id: request.user_id,
        user_email: request.user_email,
        organization_id: request.organization_id,
        role_in_org: request.requested_role_in_org,
        status: "active"
      });
      
      // Update request status
      await base44.entities.OrganizationJoinRequest.update(request.id, { status: "approved" });
      
      // Create in-app notification for the user
      await base44.entities.Notification.create({
        organization_id: request.organization_id,
        type: 'join_approved',
        title: 'Join Request Approved!',
        message: `You are now a ${request.requested_role_in_org} of ${request.organization_name}`,
        data: {
          organization_name: request.organization_name,
          role: request.requested_role_in_org,
          user_id: request.user_id
        }
      });
      
      // Send notification email
      await base44.integrations.Core.SendEmail({
        to: request.user_email,
        subject: `Welcome to ${request.organization_name}!`,
        body: `Your request to join ${request.organization_name} as a ${request.requested_role_in_org} has been approved! You can now access the organization.`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-requests'] });
      setSelectedRequest(null);
      setActionType(null);
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (request) => {
      await base44.entities.OrganizationJoinRequest.update(request.id, { status: "rejected" });
      
      // Create in-app notification for the user
      await base44.entities.Notification.create({
        organization_id: request.organization_id,
        type: 'join_rejected',
        title: 'Join Request Update',
        message: `Your request to join ${request.organization_name} was not approved`,
        data: {
          organization_name: request.organization_name,
          user_id: request.user_id
        }
      });
      
      // Send notification email
      await base44.integrations.Core.SendEmail({
        to: request.user_email,
        subject: `Update on your request to join ${request.organization_name}`,
        body: `We regret to inform you that your request to join ${request.organization_name} was not approved at this time. Please contact the organization for more details.`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-requests'] });
      setSelectedRequest(null);
      setActionType(null);
    },
  });

  const handleAction = (request, action) => {
    setSelectedRequest(request);
    setActionType(action);
  };

  const confirmAction = () => {
    if (!selectedRequest) return;
    
    if (actionType === 'approve') {
      approveMutation.mutate(selectedRequest);
    } else if (actionType === 'reject') {
      rejectMutation.mutate(selectedRequest);
    }
  };

  const pendingRequests = joinRequests.filter(r => r.status === 'pending');
  const approvedRequests = joinRequests.filter(r => r.status === 'approved');
  const rejectedRequests = joinRequests.filter(r => r.status === 'rejected');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const RequestCard = ({ request, showActions = false }) => (
    <Card className="border-2 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-700 shadow-md">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-bold">
                {request.user_name?.substring(0, 2).toUpperCase() || request.user_email?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 dark:text-white text-lg">
                {request.user_name || request.user_email}
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                <Mail className="w-4 h-4" />
                <span>{request.user_email}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800">
                  <Shield className="w-3 h-3 mr-1" />
                  {request.requested_role_in_org}
                </Badge>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(request.created_date).toLocaleDateString()}
                </span>
              </div>
              {request.message && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                      "{request.message}"
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {showActions && (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold"
                onClick={() => handleAction(request, 'approve')}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                onClick={() => handleAction(request, 'reject')}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </div>
          )}
          
          {!showActions && (
            <Badge className={
              request.status === 'approved' ? 'bg-green-100 text-green-700 border-green-300' :
              'bg-red-100 text-red-700 border-red-300'
            }>
              {request.status === 'approved' ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-900 dark:via-blue-950/10 dark:to-gray-900">
      <AdminHeader 
        user={user}
        organization={organization}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        handleLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="flex">
        <AdminSidebar 
          user={user}
          organization={organization}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          handleLogout={handleLogout}
        />

        <main className="flex-1 min-w-0">
          <div className="p-6 lg:p-8">
            <div className="max-w-5xl mx-auto space-y-8">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-black text-gray-900 dark:text-white">
                    Join Requests
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">
                    Manage requests from users who want to join your organization
                  </p>
                </div>
                {pendingRequests.length > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-lg px-4 py-2">
                    <Clock className="w-4 h-4 mr-2" />
                    {pendingRequests.length} Pending
                  </Badge>
                )}
              </div>

              <Tabs defaultValue="pending" className="space-y-6">
                <TabsList className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 p-1 rounded-xl">
                  <TabsTrigger 
                    value="pending" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500 data-[state=active]:text-white font-bold rounded-lg px-6"
                  >
                    Pending ({pendingRequests.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="approved" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white font-bold rounded-lg px-6"
                  >
                    Approved ({approvedRequests.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="rejected" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-pink-500 data-[state=active]:text-white font-bold rounded-lg px-6"
                  >
                    Rejected ({rejectedRequests.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="space-y-4">
                  {pendingRequests.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <UserPlus className="w-10 h-10 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Pending Requests</h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        All join requests have been processed
                      </p>
                    </div>
                  ) : (
                    pendingRequests.map(request => (
                      <RequestCard key={request.id} request={request} showActions={true} />
                    ))
                  )}
                </TabsContent>

                <TabsContent value="approved" className="space-y-4">
                  {approvedRequests.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-10 h-10 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Approved Requests</h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        No requests have been approved yet
                      </p>
                    </div>
                  ) : (
                    approvedRequests.map(request => (
                      <RequestCard key={request.id} request={request} />
                    ))
                  )}
                </TabsContent>

                <TabsContent value="rejected" className="space-y-4">
                  {rejectedRequests.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <XCircle className="w-10 h-10 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Rejected Requests</h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        No requests have been rejected
                      </p>
                    </div>
                  ) : (
                    rejectedRequests.map(request => (
                      <RequestCard key={request.id} request={request} />
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!selectedRequest && !!actionType} onOpenChange={() => { setSelectedRequest(null); setActionType(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'approve' ? 'Approve Join Request?' : 'Reject Join Request?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'approve' 
                ? `This will add ${selectedRequest?.user_name || selectedRequest?.user_email} to your organization as a ${selectedRequest?.requested_role_in_org}. They will receive an email notification.`
                : `This will reject the request from ${selectedRequest?.user_name || selectedRequest?.user_email}. They will receive an email notification.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={actionType === 'approve' 
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600' 
                : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'
              }
              onClick={confirmAction}
              disabled={approveMutation.isPending || rejectMutation.isPending}
            >
              {(approveMutation.isPending || rejectMutation.isPending) ? 'Processing...' : 
                actionType === 'approve' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}