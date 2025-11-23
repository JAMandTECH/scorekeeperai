import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, UserCheck, Ban, Play, Trash2, Pause, AlertTriangle, RotateCcw } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function OrganizationMembers() {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [actionDialog, setActionDialog] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

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

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (currentUser.role !== 'admin') {
        window.location.href = createPageUrl("Home");
        return;
      }
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
      window.location.href = createPageUrl("Home");
    }
  };

  const handleLogout = () => {
    base44.auth.logout(createPageUrl("PublicLanding"));
  };

  const { data: organization } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      const orgs = await base44.entities.Organization.list();
      return orgs.find(o => o.id === user?.organization_id);
    },
    enabled: !!user?.organization_id,
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: ['org-members', user?.organization_id],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => 
        u.organization_id === user?.organization_id || 
        u.active_organization_id === user?.organization_id
      );
    },
    enabled: !!user?.organization_id,
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({ userId, data }) => base44.entities.User.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['org-members']);
      queryClient.invalidateQueries(['all-users']);
      setActionDialog(null);
      showSuccess("Member updated successfully");
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (userId) => base44.entities.User.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries(['org-members']);
      queryClient.invalidateQueries(['all-users']);
      setActionDialog(null);
      showSuccess("Member deleted successfully");
    },
  });

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const handleBlockMember = (member) => {
    setActionDialog({
      type: 'block',
      member,
      title: 'Block Member?',
      description: `Block ${member.full_name} from accessing the organization? They will not be able to log in or access any features.`,
      action: () => updateMemberMutation.mutate({ 
        userId: member.id, 
        data: { member_status: 'blocked' } 
      })
    });
  };

  const handleUnblockMember = (member) => {
    updateMemberMutation.mutate({ 
      userId: member.id, 
      data: { member_status: 'active' } 
    });
    showSuccess(`${member.full_name} has been unblocked`);
  };

  const handlePauseMember = (member) => {
    setActionDialog({
      type: 'pause',
      member,
      title: 'Pause Membership?',
      description: `Temporarily pause ${member.full_name}'s membership? They can be reactivated later.`,
      action: () => updateMemberMutation.mutate({ 
        userId: member.id, 
        data: { member_status: 'paused' } 
      })
    });
  };

  const handleActivateMember = (member) => {
    updateMemberMutation.mutate({ 
      userId: member.id, 
      data: { member_status: 'active' } 
    });
    showSuccess(`${member.full_name} has been activated`);
  };

  const handleDeleteMember = (member) => {
    setActionDialog({
      type: 'delete',
      member,
      title: 'Delete Member Permanently?',
      description: `Are you sure you want to permanently delete ${member.full_name}? This action cannot be undone. All their data will be removed from the system.`,
      action: () => deleteMemberMutation.mutate(member.id)
    });
  };

  const getMemberStatus = (member) => {
    return member.member_status || 'active';
  };

  const activeMembers = allMembers.filter(m => getMemberStatus(m) === 'active');
  const blockedMembers = allMembers.filter(m => getMemberStatus(m) === 'blocked');
  const pausedMembers = allMembers.filter(m => getMemberStatus(m) === 'paused');

  const MemberCard = ({ member }) => {
    const status = getMemberStatus(member);
    const isCurrentUser = member.id === user?.id;
    
    return (
      <div className={`p-4 rounded-xl border-2 transition-all ${
        status === 'blocked' 
          ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
          : status === 'paused'
          ? 'bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
          : 'bg-gradient-to-r from-gray-50 to-blue-50/30 dark:from-gray-900 dark:to-blue-950/20 border-gray-200 dark:border-gray-700 hover:shadow-md'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-600 shadow-md">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold">
                {member.full_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-900 dark:text-white">{member.full_name}</p>
                {isCurrentUser && (
                  <Badge variant="outline" className="text-xs font-bold">You</Badge>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {member.role === 'admin' && member.is_super_admin && (
                  <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-0 font-bold text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    Super Admin
                  </Badge>
                )}
                {member.role === 'admin' && !member.is_super_admin && (
                  <Badge className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800 font-bold text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    Admin
                  </Badge>
                )}
                {member.is_scorekeeper && (
                  <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800 font-bold text-xs">
                    <UserCheck className="w-3 h-3 mr-1" />
                    Scorekeeper
                  </Badge>
                )}
                {status === 'blocked' && (
                  <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800 font-bold text-xs">
                    <Ban className="w-3 h-3 mr-1" />
                    Blocked
                  </Badge>
                )}
                {status === 'paused' && (
                  <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800 font-bold text-xs">
                    <Pause className="w-3 h-3 mr-1" />
                    Paused
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {!isCurrentUser && (
            <div className="flex gap-2">
              {status === 'active' && (
                <>
                  <Button
                    onClick={() => handlePauseMember(member)}
                    variant="outline"
                    size="sm"
                    className="border-2 border-yellow-300 dark:border-yellow-700 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-950/30 font-bold"
                  >
                    <Pause className="w-4 h-4 mr-1" />
                    Pause
                  </Button>
                  <Button
                    onClick={() => handleBlockMember(member)}
                    variant="outline"
                    size="sm"
                    className="border-2 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold"
                  >
                    <Ban className="w-4 h-4 mr-1" />
                    Block
                  </Button>
                </>
              )}
              {status === 'blocked' && (
                <Button
                  onClick={() => handleUnblockMember(member)}
                  variant="outline"
                  size="sm"
                  className="border-2 border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 font-bold"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Unblock
                </Button>
              )}
              {status === 'paused' && (
                <Button
                  onClick={() => handleActivateMember(member)}
                  variant="outline"
                  size="sm"
                  className="border-2 border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 font-bold"
                >
                  <Play className="w-4 h-4 mr-1" />
                  Activate
                </Button>
              )}
              <Button
                onClick={() => handleDeleteMember(member)}
                variant="outline"
                size="sm"
                className="border-2 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-950/30 font-bold"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!user || !organization) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

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
            <div className="max-w-7xl mx-auto space-y-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white">Members Management</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1 font-medium">
                      Manage organization members and their access
                    </p>
                  </div>
                </div>
              </div>

              {successMessage && (
                <Alert className="bg-green-50 dark:bg-green-950/30 border-2 border-green-200 dark:border-green-800">
                  <AlertDescription className="text-green-800 dark:text-green-300 font-bold flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {successMessage}
                  </AlertDescription>
                </Alert>
              )}

              <Tabs defaultValue="active" className="space-y-6">
                <TabsList className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 p-1 rounded-xl shadow-lg">
                  <TabsTrigger 
                    value="active" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-green-700 data-[state=active]:text-white dark:text-gray-300 font-bold rounded-lg"
                  >
                    Active ({activeMembers.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="paused" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-600 data-[state=active]:to-yellow-700 data-[state=active]:text-white dark:text-gray-300 font-bold rounded-lg"
                  >
                    Paused ({pausedMembers.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="blocked" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-red-700 data-[state=active]:text-white dark:text-gray-300 font-bold rounded-lg"
                  >
                    Blocked ({blockedMembers.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-4">
                  <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-xl">
                    <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700">
                      <CardTitle className="text-xl font-black text-gray-900 dark:text-white">
                        Active Members
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      {activeMembers.length === 0 ? (
                        <div className="text-center py-8">
                          <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                          <p className="text-gray-500 dark:text-gray-400 font-medium">No active members</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {activeMembers.map(member => <MemberCard key={member.id} member={member} />)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="paused" className="space-y-4">
                  <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-xl">
                    <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700">
                      <CardTitle className="text-xl font-black text-gray-900 dark:text-white">
                        Paused Members
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      {pausedMembers.length === 0 ? (
                        <div className="text-center py-8">
                          <Pause className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                          <p className="text-gray-500 dark:text-gray-400 font-medium">No paused members</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {pausedMembers.map(member => <MemberCard key={member.id} member={member} />)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="blocked" className="space-y-4">
                  <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-xl">
                    <CardHeader className="border-b-2 border-gray-100 dark:border-gray-700">
                      <CardTitle className="text-xl font-black text-gray-900 dark:text-white">
                        Blocked Members
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      {blockedMembers.length === 0 ? (
                        <div className="text-center py-8">
                          <Ban className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                          <p className="text-gray-500 dark:text-gray-400 font-medium">No blocked members</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {blockedMembers.map(member => <MemberCard key={member.id} member={member} />)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>

      <AlertDialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <AlertDialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                actionDialog?.type === 'delete' 
                  ? 'bg-red-100 dark:bg-red-950/30'
                  : actionDialog?.type === 'block'
                  ? 'bg-red-100 dark:bg-red-950/30'
                  : 'bg-yellow-100 dark:bg-yellow-950/30'
              }`}>
                <AlertTriangle className={`w-6 h-6 ${
                  actionDialog?.type === 'delete' || actionDialog?.type === 'block'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-yellow-600 dark:text-yellow-400'
                }`} />
              </div>
              <AlertDialogTitle className="text-xl font-black text-gray-900 dark:text-white">
                {actionDialog?.title}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400 font-medium">
              {actionDialog?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-2 border-gray-300 dark:border-gray-600 font-bold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => actionDialog?.action()}
              className={`font-bold ${
                actionDialog?.type === 'delete' || actionDialog?.type === 'block'
                  ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                  : 'bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800'
              } text-white`}
            >
              {actionDialog?.type === 'delete' ? 'Delete' : actionDialog?.type === 'block' ? 'Block' : 'Pause'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}