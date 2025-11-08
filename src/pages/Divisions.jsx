
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FolderOpen, Edit, Trash2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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

export default function Divisions() {
  const [showForm, setShowForm] = useState(false);
  const [editingDivision, setEditingDivision] = useState(null);
  const [deletingDivision, setDeletingDivision] = useState(null);
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  const { data: divisions = [], isLoading } = useQuery({
    queryKey: ['divisions', user?.organization_id],
    queryFn: async () => {
      // First try to get divisions by organization_id
      if (user?.organization_id) {
        const orgDivisions = await base44.entities.Division.filter({ organization_id: user?.organization_id }, '-created_date');
        
        // If no divisions found with organization_id, get all divisions and assign them
        if (orgDivisions.length === 0) {
          const allDivisions = await base44.entities.Division.list('-created_date');
          
          // Update divisions without organization_id
          for (const division of allDivisions) {
            if (!division.organization_id) {
              await base44.entities.Division.update(division.id, {
                organization_id: user.organization_id,
                ...division, // Keep existing fields
              });
            }
          }
          
          // Fetch again after updates to get the correct list for the organization
          return base44.entities.Division.filter({ organization_id: user?.organization_id }, '-created_date');
        }
        
        return orgDivisions;
      }
      return [];
    },
    enabled: !!user?.organization_id,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams', user?.organization_id],
    queryFn: () => base44.entities.Team.filter({ organization_id: user?.organization_id }),
    enabled: !!user?.organization_id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Division.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['divisions']);
      setShowForm(false);
      setEditingDivision(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Division.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['divisions']);
      setShowForm(false);
      setEditingDivision(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Division.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['divisions']);
      setDeletingDivision(null);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      organization_id: user?.organization_id,
      name: formData.get('name'),
      sport: formData.get('sport'),
      description: formData.get('description'),
    };

    if (editingDivision) {
      updateMutation.mutate({ id: editingDivision.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (division) => {
    setEditingDivision(division);
    setShowForm(true);
  };

  const handleDeleteClick = (division) => {
    // Check if any teams use this division
    const teamsInDivision = teams.filter(t => t.division === division.name && t.sport === division.sport);
    setDeletingDivision({ ...division, teamsCount: teamsInDivision.length });
  };

  const handleDeleteConfirm = () => {
    if (deletingDivision) {
      deleteMutation.mutate(deletingDivision.id);
    }
  };

  const basketballDivisions = divisions.filter(d => d.sport === 'basketball');
  const volleyballDivisions = divisions.filter(d => d.sport === 'volleyball');

  const getTeamsCount = (divisionName, sport) => {
    return teams.filter(t => t.division === divisionName && t.sport === sport).length;
  };

  const DivisionCard = ({ division, sportColor }) => {
    const teamsCount = getTeamsCount(division.name, division.sport);

    return (
      <Card className={`relative overflow-hidden border-2 border-${sportColor}-100 dark:border-${sportColor}-900 bg-gradient-to-br from-white to-${sportColor}-50 dark:from-gray-800 dark:to-${sportColor}-950/30 shadow-lg hover:shadow-2xl transition-all`}>
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-${sportColor}-500/20 to-transparent rounded-full blur-3xl`}></div>
        <CardHeader className="relative z-10">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3 flex-1">
              <div className={`w-14 h-14 bg-gradient-to-br from-${sportColor}-500 to-${sportColor}-600 rounded-xl flex items-center justify-center shadow-xl`}>
                <FolderOpen className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg font-black text-gray-900 dark:text-white truncate">{division.name}</CardTitle>
                <Badge className={`mt-2 bg-${sportColor}-100 text-${sportColor}-700 border-${sportColor}-200 dark:bg-${sportColor}-950 dark:text-${sportColor}-300 dark:border-${sportColor}-800 font-bold`}>
                  {division.sport}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleEdit(division)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleDeleteClick(division)}
                className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 relative z-10">
          {division.description && (
            <div className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{division.description}</p>
            </div>
          )}
          <div className="flex justify-between text-sm bg-white/60 dark:bg-gray-900/60 rounded-xl p-3">
            <span className="text-gray-600 dark:text-gray-400 font-bold">Teams in Division</span>
            <span className={`font-black text-${sportColor}-600 dark:text-${sportColor}-400`}>{teamsCount}</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-gray-50 dark:from-gray-900 dark:via-purple-950/10 dark:to-gray-900">
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-black text-gray-900 dark:text-white">Divisions</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Manage league divisions</p>
            </div>
            <Button 
              onClick={() => {
                setEditingDivision(null);
                setShowForm(true);
              }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-xl"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Division
            </Button>
          </div>

          {/* Basketball Divisions */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                  <path d="M2 12h20"/>
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">Basketball Divisions</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{basketballDivisions.length} divisions</p>
              </div>
            </div>
            
            {basketballDivisions.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {basketballDivisions.map((division) => (
                  <DivisionCard key={division.id} division={division} sportColor="orange" />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700">
                <FolderOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No basketball divisions yet</p>
              </div>
            )}
          </div>

          {/* Volleyball Divisions */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                  <path d="M2 12h20"/>
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">Volleyball Divisions</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{volleyballDivisions.length} divisions</p>
              </div>
            </div>
            
            {volleyballDivisions.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {volleyballDivisions.map((division) => (
                  <DivisionCard key={division.id} division={division} sportColor="blue" />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700">
                <FolderOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No volleyball divisions yet</p>
              </div>
            )}
          </div>

          {/* Add/Edit Dialog */}
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-gray-900 dark:text-white">
                  {editingDivision ? 'Edit Division' : 'Add New Division'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="font-bold text-gray-700 dark:text-gray-300">Division Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingDivision?.name}
                    placeholder="e.g., Division A, Youth League"
                    required
                    className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                  />
                </div>
                
                <div>
                  <Label htmlFor="sport" className="font-bold text-gray-700 dark:text-gray-300">Sport</Label>
                  <select
                    id="sport"
                    name="sport"
                    defaultValue={editingDivision?.sport || 'basketball'}
                    required
                    className="w-full bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-3 py-2 font-medium"
                  >
                    <option value="basketball">Basketball</option>
                    <option value="volleyball">Volleyball</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="description" className="font-bold text-gray-700 dark:text-gray-300">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={editingDivision?.description}
                    placeholder="Add division details or rules..."
                    rows={3}
                    className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowForm(false)}
                    className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold"
                  >
                    {editingDivision ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={!!deletingDivision} onOpenChange={() => setDeletingDivision(null)}>
            <AlertDialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
              <AlertDialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-950/30 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <AlertDialogTitle className="text-xl font-black text-gray-900 dark:text-white">
                    Delete Division?
                  </AlertDialogTitle>
                </div>
                <AlertDialogDescription className="text-gray-600 dark:text-gray-400 font-medium">
                  Are you sure you want to delete <span className="font-bold text-gray-900 dark:text-white">"{deletingDivision?.name}"</span>?
                  {deletingDivision?.teamsCount > 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm text-yellow-800 dark:text-yellow-300 font-semibold">
                        ⚠️ Warning: {deletingDivision.teamsCount} team(s) are currently in this division.
                      </p>
                    </div>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-2 border-gray-300 dark:border-gray-600 font-bold">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteConfirm}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold"
                >
                  Delete Division
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
