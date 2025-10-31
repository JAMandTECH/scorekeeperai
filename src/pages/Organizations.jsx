import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Building2, Mail, Phone, MapPin, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function Organizations() {
  const [showForm, setShowForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const queryClient = useQueryClient();

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Organization.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['organizations']);
      setShowForm(false);
      setEditingOrg(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Organization.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['organizations']);
      setShowForm(false);
      setEditingOrg(null);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      contact_email: formData.get('contact_email'),
      contact_phone: formData.get('contact_phone'),
      address: formData.get('address'),
      status: formData.get('status') || 'active',
    };

    if (editingOrg) {
      updateMutation.mutate({ id: editingOrg.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (org) => {
    setEditingOrg(org);
    setShowForm(true);
  };

  return (
    <div className="p-4 md:p-8 bg-gray-950 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Organizations</h1>
            <p className="text-gray-400 mt-1">Manage all registered organizations</p>
          </div>
          <Button 
            onClick={() => {
              setEditingOrg(null);
              setShowForm(true);
            }}
            className="bg-yellow-400 hover:bg-yellow-500 text-gray-900"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Organization
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map((org) => (
            <Card key={org.id} className="bg-gray-900 border-gray-800">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-yellow-400/10 rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div>
                      <CardTitle className="text-white">{org.name}</CardTitle>
                      <Badge variant={org.status === 'active' ? 'default' : 'secondary'} className="mt-1">
                        {org.status}
                      </Badge>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleEdit(org)}
                    className="text-gray-400 hover:text-white"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Mail className="w-4 h-4" />
                  {org.contact_email}
                </div>
                {org.contact_phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Phone className="w-4 h-4" />
                    {org.contact_phone}
                  </div>
                )}
                {org.address && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <MapPin className="w-4 h-4" />
                    {org.address}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="bg-gray-900 border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle>{editingOrg ? 'Edit Organization' : 'Add New Organization'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingOrg?.name}
                  required
                  className="bg-gray-950 border-gray-800 text-white"
                />
              </div>
              <div>
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  name="contact_email"
                  type="email"
                  defaultValue={editingOrg?.contact_email}
                  required
                  className="bg-gray-950 border-gray-800 text-white"
                />
              </div>
              <div>
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  name="contact_phone"
                  defaultValue={editingOrg?.contact_phone}
                  className="bg-gray-950 border-gray-800 text-white"
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  defaultValue={editingOrg?.address}
                  className="bg-gray-950 border-gray-800 text-white"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-gray-700 text-white">
                  Cancel
                </Button>
                <Button type="submit" className="bg-yellow-400 hover:bg-yellow-500 text-gray-900">
                  {editingOrg ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}