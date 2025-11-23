import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Plus, Edit, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

export default function RolesPermissions() {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [deletingRole, setDeletingRole] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [permissions, setPermissions] = useState({});
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

  const { data: roles = [] } = useQuery({
    queryKey: ['roles', user?.organization_id],
    queryFn: () => base44.entities.Role.filter({ organization_id: user?.organization_id }, '-created_date'),
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

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Role.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      setShowForm(false);
      setEditingRole(null);
      setPermissions({});
      showSuccess("Role created successfully");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Role.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      setShowForm(false);
      setEditingRole(null);
      setPermissions({});
      showSuccess("Role updated successfully");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Role.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      setDeletingRole(null);
      showSuccess("Role deleted successfully");
    },
  });

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      organization_id: user?.organization_id,
      name: formData.get('name'),
      description: formData.get('description'),
      permissions: permissions,
    };

    if (editingRole) {
      updateMutation.mutate({ id: editingRole.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (role) => {
    setEditingRole(role);
    setPermissions(role.permissions || {});
    setShowForm(true);
  };

  const handleDeleteClick = (role) => {
    const membersWithRole = allMembers.filter(m => m.role_id === role.id);
    setDeletingRole({ ...role, membersCount: membersWithRole.length });
  };

  const togglePermission = (key) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const permissionsList = [
    { key: 'manage_organization', label: 'Manage Organization Settings', icon: Shield },
    { key: 'manage_divisions', label: 'Manage Divisions', icon: Shield },
    { key: 'manage_teams', label: 'Manage Teams', icon: Shield },
    { key: 'manage_players', label: 'Manage Players', icon: Shield },
    { key: 'manage_games', label: 'Manage Games & Schedule', icon: Shield },
    { key: 'manage_scorekeepers', label: 'Manage Scorekeepers', icon: Shield },
    { key: 'live_scoring', label: 'Live Scoring Access', icon: Shield },
    { key: 'view_statistics', label: 'View Statistics & Reports', icon: Shield },
    { key: 'manage_members', label: 'Manage Members', icon: Shield },
    { key: 'manage_roles', label: 'Manage Roles & Permissions', icon: Shield },
    { key: 'manage_social', label: 'Manage Social Feed', icon: Shield },
    { key: 'manage_tournaments', label: 'Manage Tournaments', icon: Shield },
    { key: 'data_backup', label: 'Data Backup & Export', icon: Shield },
  ];

  const getPermissionsCount = (role) => {
    const perms = role.permissions || {};
    return Object.values(perms).filter(v => v === true).length;
  };

  if (!user || !organization) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-gray-50 dark:from-gray-900 dark:via-indigo-950/10 dark:to-gray-900">
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
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-black text-gray-900 dark:text-white">Roles & Permissions</h1>
                      <p className="text-gray-600 dark:text-gray-400 mt-1 font-medium">Define custom roles and control access</p>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={() => {
                    setEditingRole(null);
                    setPermissions({ view_statistics: true });
                    setShowForm(true);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-xl"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Role
                </Button>
              </div>

              {successMessage && (
                <Alert className="bg-green-50 dark:bg-green-950/30 border-2 border-green-200 dark:border-green-800">
                  <AlertDescription className="text-green-800 dark:text-green-300 font-bold flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    {successMessage}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map((role) => {
                  const membersCount = allMembers.filter(m => m.role_id === role.id).length;
                  const permCount = getPermissionsCount(role);
                  
                  return (
                    <Card key={role.id} className="relative overflow-hidden border-2 border-indigo-100 dark:border-indigo-900 bg-gradient-to-br from-white to-indigo-50 dark:from-gray-800 dark:to-indigo-950/30 shadow-lg hover:shadow-2xl transition-all group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/20 to-transparent rounded-full blur-3xl"></div>
                      <CardHeader className="relative z-10">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-xl font-black text-gray-900 dark:text-white mb-2">
                              {role.name}
                              {role.is_system_role && (
                                <Badge className="ml-2 bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 font-bold text-xs">
                                  System
                                </Badge>
                              )}
                            </CardTitle>
                            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                              {role.description || 'No description'}
                            </p>
                          </div>
                          {!role.is_system_role && (
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleEdit(role)}
                                className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeleteClick(role)}
                                className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="relative z-10 space-y-4">
                        <div className="flex justify-between items-center p-3 bg-white/60 dark:bg-gray-900/60 rounded-xl">
                          <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Members</span>
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 font-bold">
                            {membersCount}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/60 dark:bg-gray-900/60 rounded-xl">
                          <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">Permissions</span>
                          <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800 font-bold">
                            {permCount} / {permissionsList.length}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {roles.length === 0 && (
                <div className="text-center py-20">
                  <div className="w-24 h-24 bg-gradient-to-br from-indigo-200 to-indigo-300 dark:from-indigo-800 dark:to-indigo-700 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Shield className="w-12 h-12 text-indigo-600 dark:text-indigo-300" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-xl font-bold">No roles created yet</p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Create your first role to manage permissions</p>
                </div>
              )}

              <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-gray-900 dark:text-white">
                      {editingRole ? 'Edit Role' : 'Create New Role'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <Label htmlFor="name" className="font-bold text-gray-700 dark:text-gray-300">Role Name</Label>
                      <Input
                        id="name"
                        name="name"
                        defaultValue={editingRole?.name}
                        placeholder="e.g., Coach, Viewer, Team Manager"
                        required
                        className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description" className="font-bold text-gray-700 dark:text-gray-300">Description</Label>
                      <Textarea
                        id="description"
                        name="description"
                        defaultValue={editingRole?.description}
                        placeholder="Brief description of this role's purpose"
                        className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium mt-2"
                      />
                    </div>
                    
                    <div>
                      <Label className="font-bold text-gray-700 dark:text-gray-300 text-lg mb-4 block">Permissions</Label>
                      <div className="bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                        {permissionsList.map((perm) => (
                          <div key={perm.key} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                permissions[perm.key] 
                                  ? 'bg-gradient-to-br from-green-500 to-green-600' 
                                  : 'bg-gray-200 dark:bg-gray-700'
                              }`}>
                                <perm.icon className={`w-5 h-5 ${
                                  permissions[perm.key] ? 'text-white' : 'text-gray-400 dark:text-gray-500'
                                }`} />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 dark:text-white text-sm">{perm.label}</p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              onClick={() => togglePermission(perm.key)}
                              className={`font-bold ${
                                permissions[perm.key]
                                  ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white'
                                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                              }`}
                              size="sm"
                            >
                              {permissions[perm.key] ? 'Enabled' : 'Disabled'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setShowForm(false);
                          setEditingRole(null);
                          setPermissions({});
                        }}
                        className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold"
                      >
                        {editingRole ? 'Update Role' : 'Create Role'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <AlertDialog open={!!deletingRole} onOpenChange={() => setDeletingRole(null)}>
                <AlertDialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
                  <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-red-100 dark:bg-red-950/30 rounded-xl flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                      </div>
                      <AlertDialogTitle className="text-xl font-black text-gray-900 dark:text-white">
                        Delete Role?
                      </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-gray-600 dark:text-gray-400 font-medium">
                      Are you sure you want to delete the role <span className="font-bold text-gray-900 dark:text-white">"{deletingRole?.name}"</span>?
                      {deletingRole?.membersCount > 0 && (
                        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <p className="text-sm text-yellow-800 dark:text-yellow-300 font-semibold">
                            ⚠️ Warning: {deletingRole.membersCount} member(s) currently have this role. They will lose their role permissions.
                          </p>
                        </div>
                      )}
                      <p className="mt-3 font-semibold text-red-600 dark:text-red-400">This action cannot be undone.</p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-2 border-gray-300 dark:border-gray-600 font-bold">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate(deletingRole.id)}
                      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold"
                    >
                      Delete Role
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}