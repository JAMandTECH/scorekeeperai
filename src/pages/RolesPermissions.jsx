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
      const res = await base44.functions.invoke('getUserOrganization', {});
      return res?.data?.organization || null;
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
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
                    <div className="w-12 h-12 border border-border flex items-center justify-center">
                      <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h1 className="font-heading text-3xl font-bold tracking-tight">Roles & Permissions</h1>
                      <p className="text-muted-foreground mt-1 font-medium">Define custom roles and control access</p>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={() => {
                    setEditingRole(null);
                    setPermissions({ view_statistics: true });
                    setShowForm(true);
                  }}
                  className="font-medium shadow-xl"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Role
                </Button>
              </div>

              {successMessage && (
                <Alert className="bg-primary/10 border border-primary/30">
                  <AlertDescription className="text-foreground font-medium flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    {successMessage}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map((role) => {
                  const membersCount = allMembers.filter(m => m.role_id === role.id).length;
                  const permCount = getPermissionsCount(role);
                  
                  return (
                    <Card key={role.id} className="relative overflow-hidden border border-border hover:border-foreground/20 transition-colors">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-xl font-heading font-bold mb-2">
                              {role.name}
                              {role.is_system_role && (
                                <Badge variant="outline" className="ml-2 border-border text-muted-foreground font-medium text-xs">
                                  System
                                </Badge>
                              )}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground font-medium">
                              {role.description || 'No description'}
                            </p>
                          </div>
                          {!role.is_system_role && (
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleEdit(role)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeleteClick(role)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-muted">
                          <span className="text-sm text-muted-foreground font-medium">Members</span>
                          <Badge variant="outline" className="border-border text-muted-foreground font-medium">
                            {membersCount}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted">
                          <span className="text-sm text-muted-foreground font-medium">Permissions</span>
                          <Badge variant="outline" className="border-primary text-primary font-medium">
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
                  <div className="w-24 h-24 border border-border flex items-center justify-center mx-auto mb-6">
                    <Shield className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-xl font-heading font-bold">No roles created yet</p>
                  <p className="text-muted-foreground text-sm mt-2">Create your first role to manage permissions</p>
                </div>
              )}

              <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-heading font-bold">
                      {editingRole ? 'Edit Role' : 'Create New Role'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <Label htmlFor="name" className="font-heading font-bold text-foreground">Role Name</Label>
                      <Input
                        id="name"
                        name="name"
                        defaultValue={editingRole?.name}
                        placeholder="e.g., Coach, Viewer, Team Manager"
                        required
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description" className="font-heading font-bold text-foreground">Description</Label>
                      <Textarea
                        id="description"
                        name="description"
                        defaultValue={editingRole?.description}
                        placeholder="Brief description of this role's purpose"
                        className="mt-2"
                      />
                    </div>
                    
                    <div>
                      <Label className="font-heading font-bold text-foreground text-lg mb-4 block">Permissions</Label>
                      <div className="bg-muted border border-border p-4 space-y-3">
                        {permissionsList.map((perm) => (
                          <div key={perm.key} className="flex items-center justify-between p-3 bg-card border border-border">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 border flex items-center justify-center ${
                                permissions[perm.key] 
                                  ? 'border-primary bg-primary/10' 
                                  : 'border-border bg-muted'
                              }`}>
                                <perm.icon className={`w-5 h-5 ${
                                  permissions[perm.key] ? 'text-primary' : 'text-muted-foreground'
                                }`} />
                              </div>
                              <div>
                                <p className="font-heading font-bold text-foreground text-sm">{perm.label}</p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              onClick={() => togglePermission(perm.key)}
                              variant={permissions[perm.key] ? "default" : "outline"}
                              size="sm"
                            >
                              {permissions[perm.key] ? 'Enabled' : 'Disabled'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setShowForm(false);
                          setEditingRole(null);
                          setPermissions({});
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                      >
                        {editingRole ? 'Update Role' : 'Create Role'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <AlertDialog open={!!deletingRole} onOpenChange={() => setDeletingRole(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-destructive/10 border border-destructive/30 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-destructive" />
                      </div>
                      <AlertDialogTitle className="text-xl font-heading font-bold">
                        Delete Role?
                      </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-muted-foreground font-medium">
                      Are you sure you want to delete the role <span className="font-heading font-bold text-foreground">"{deletingRole?.name}"</span>?
                      {deletingRole?.membersCount > 0 && (
                        <div className="mt-3 p-3 bg-muted border border-border">
                          <p className="text-sm text-foreground font-medium">
                            ⚠️ Warning: {deletingRole.membersCount} member(s) currently have this role. They will lose their role permissions.
                          </p>
                        </div>
                      )}
                      <p className="mt-3 font-medium text-destructive">This action cannot be undone.</p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate(deletingRole.id)}
                      className="bg-destructive text-destructive-foreground font-medium"
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