import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Plus, Mail, Phone, MapPin, Edit, UserPlus } from "lucide-react";

export default function Organizations() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [showAdminDialog, setShowAdminDialog] = useState(false);

  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => base44.entities.Organization.list("-created_date"),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const createOrgMutation = useMutation({
    mutationFn: (data) => base44.entities.Organization.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["organizations"]);
      setIsDialogOpen(false);
      setEditingOrg(null);
    },
  });

  const updateOrgMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Organization.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["organizations"]);
      setIsDialogOpen(false);
      setEditingOrg(null);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get("name"),
      sport_type: formData.get("sport_type"),
      contact_email: formData.get("contact_email"),
      contact_phone: formData.get("contact_phone"),
      address: formData.get("address"),
      status: formData.get("status"),
    };

    if (editingOrg) {
      updateOrgMutation.mutate({ id: editingOrg.id, data });
    } else {
      createOrgMutation.mutate(data);
    }
  };

  const getOrgAdmins = (orgId) => {
    return users.filter(
      (u) => u.user_type === "org_admin" && u.organization_id === orgId
    );
  };

  return (
    <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Organizations</h1>
            <p className="text-slate-600 mt-1">
              Manage all organizations and their administrators
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingOrg(null);
              setIsDialogOpen(true);
            }}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Organization
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map((org) => {
            const admins = getOrgAdmins(org.id);
            return (
              <Card key={org.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {org.logo_url ? (
                        <img
                          src={org.logo_url}
                          alt={org.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-lg flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-lg">{org.name}</CardTitle>
                        <Badge
                          variant="secondary"
                          className={`mt-1 ${
                            org.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {org.status}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingOrg(org);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="font-medium capitalize">
                        {org.sport_type}
                      </span>
                    </div>
                    {org.contact_email && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="w-4 h-4" />
                        {org.contact_email}
                      </div>
                    )}
                    {org.contact_phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="w-4 h-4" />
                        {org.contact_phone}
                      </div>
                    )}
                    {org.address && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="w-4 h-4" />
                        {org.address}
                      </div>
                    )}
                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">
                          {admins.length} Administrator{admins.length !== 1 ? "s" : ""}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedOrg(org);
                            setShowAdminDialog(true);
                          }}
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          Manage
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {organizations.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-4">No organizations yet</p>
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add First Organization
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Organization Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingOrg ? "Edit Organization" : "Add New Organization"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editingOrg?.name}
                required
                placeholder="Enter organization name"
              />
            </div>
            <div>
              <Label htmlFor="sport_type">Sport Type *</Label>
              <Select
                name="sport_type"
                defaultValue={editingOrg?.sport_type || "basketball"}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basketball">Basketball</SelectItem>
                  <SelectItem value="volleyball">Volleyball</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  name="contact_email"
                  type="email"
                  defaultValue={editingOrg?.contact_email}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  name="contact_phone"
                  defaultValue={editingOrg?.contact_phone}
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                defaultValue={editingOrg?.address}
                placeholder="Organization address"
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                name="status"
                defaultValue={editingOrg?.status || "active"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600"
              >
                {editingOrg ? "Update" : "Create"} Organization
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Admins Dialog */}
      <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Administrators - {selectedOrg?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {getOrgAdmins(selectedOrg?.id).map((admin) => (
              <div
                key={admin.id}
                className="flex items-center gap-3 p-3 border rounded-lg"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {admin.full_name?.[0] || admin.email[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{admin.full_name || "User"}</p>
                  <p className="text-sm text-slate-600">{admin.email}</p>
                </div>
              </div>
            ))}
            {getOrgAdmins(selectedOrg?.id).length === 0 && (
              <p className="text-center text-slate-500 py-4">
                No administrators assigned yet. Invite users and assign them to this organization.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}