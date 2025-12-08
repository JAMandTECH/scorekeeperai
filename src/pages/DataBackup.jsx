import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Upload, AlertTriangle, Database, Trash2, CheckCircle, FileDown, Clock, RefreshCw, Archive } from "lucide-react";
import { createPageUrl } from "@/utils";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function DataBackup() {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [exportingEntity, setExportingEntity] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importingEntity, setImportingEntity] = useState(null);
  const [deleteBeforeImport, setDeleteBeforeImport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [selectedOrgForBackup, setSelectedOrgForBackup] = useState(null);
  const [selectedBackupToRestore, setSelectedBackupToRestore] = useState(null);
  const [restoreMode, setRestoreMode] = useState('merge');
  const queryClient = useQueryClient();

  const isSuperAdmin = user?.role === 'admin' && user?.is_super_admin === true;

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
    const currentUser = await base44.auth.me();
    setUser(currentUser);
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

  const { data: teams = [] } = useQuery({
    queryKey: ['teams', user?.organization_id],
    queryFn: () => base44.entities.Team.filter({ organization_id: user?.organization_id }),
    enabled: !!user?.organization_id,
  });

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions', user?.organization_id],
    queryFn: () => base44.entities.Division.filter({ organization_id: user?.organization_id }),
    enabled: !!user?.organization_id,
  });

  const { data: games = [] } = useQuery({
    queryKey: ['games', user?.organization_id],
    queryFn: () => base44.entities.Game.filter({ organization_id: user?.organization_id }),
    enabled: !!user?.organization_id && !isSuperAdmin,
  });

  // Super Admin: Fetch ALL organizations for backup management
  const { data: allOrganizations = [] } = useQuery({
    queryKey: ['all-organizations-backup'],
    queryFn: () => base44.entities.Organization.list(),
    enabled: isSuperAdmin,
  });

  const backupEligibleOrgs = allOrganizations.filter(
    org => org.subscription_tier === 'basic' || org.subscription_tier === 'premium'
  );

  // Fetch backup history
  const { data: backupHistory = [] } = useQuery({
    queryKey: ['backup-history'],
    queryFn: () => base44.entities.BackupHistory.list('-backup_date'),
    enabled: isSuperAdmin,
    refetchInterval: 30000,
  });

  const entities = [
    {
      name: 'Divisions',
      key: 'Division',
      description: 'All divisions in your organization',
      icon: '📁',
      color: 'blue',
      getData: () => divisions,
    },
    {
      name: 'Teams',
      key: 'Team',
      description: 'All teams and their details',
      icon: '👥',
      color: 'green',
      getData: () => teams,
    },
    {
      name: 'Players',
      key: 'Player',
      description: 'All players across all teams',
      icon: '🏃',
      color: 'purple',
      getData: async () => {
        const teamIds = teams.map(t => t.id);
        if (teamIds.length === 0) return [];
        const allPlayers = await base44.entities.Player.list();
        return allPlayers.filter(p => teamIds.includes(p.team_id));
      },
    },
    {
      name: 'Games',
      key: 'Game',
      description: 'All scheduled and completed games',
      icon: '🏀',
      color: 'orange',
      getData: () => games,
    },
    {
      name: 'Player Statistics',
      key: 'PlayerGameStats',
      description: 'All player game statistics',
      icon: '📊',
      color: 'red',
      getData: async () => {
        const gameIds = games.map(g => g.id);
        if (gameIds.length === 0) return [];
        const allStats = await base44.entities.PlayerGameStats.list();
        return allStats.filter(s => gameIds.includes(s.game_id));
      },
    },
  ];

  const handleExport = async (entity) => {
    try {
      setExportingEntity(entity.key);
      setStatusMessage({ type: 'loading', text: `Exporting ${entity.name}...` });

      const data = await entity.getData();
      
      const exportData = {
        entity: entity.key,
        organization_id: user?.organization_id,
        organization_name: organization?.name,
        exported_at: new Date().toISOString(),
        record_count: data.length,
        data: data,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${entity.key}_${organization?.name}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatusMessage({ type: 'success', text: `Successfully exported ${data.length} ${entity.name} records` });
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (error) {
      setStatusMessage({ type: 'error', text: `Failed to export ${entity.name}: ${error.message}` });
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setExportingEntity(null);
    }
  };

  const handleDeleteAllRecords = async (entityKey) => {
    try {
      setStatusMessage({ type: 'loading', text: `Deleting all ${entityKey} records...` });

      if (entityKey === 'Division') {
        for (const division of divisions) {
          await base44.entities.Division.delete(division.id);
        }
      } else if (entityKey === 'Team') {
        for (const team of teams) {
          await base44.entities.Team.delete(team.id);
        }
      } else if (entityKey === 'Player') {
        const teamIds = teams.map(t => t.id);
        const allPlayers = await base44.entities.Player.list();
        const orgPlayers = allPlayers.filter(p => teamIds.includes(p.team_id));
        for (const player of orgPlayers) {
          await base44.entities.Player.delete(player.id);
        }
      } else if (entityKey === 'Game') {
        for (const game of games) {
          await base44.entities.Game.delete(game.id);
        }
      } else if (entityKey === 'PlayerGameStats') {
        const gameIds = games.map(g => g.id);
        const allStats = await base44.entities.PlayerGameStats.list();
        const orgStats = allStats.filter(s => gameIds.includes(s.game_id));
        for (const stat of orgStats) {
          await base44.entities.PlayerGameStats.delete(stat.id);
        }
      }

      queryClient.invalidateQueries();
      setStatusMessage({ type: 'success', text: `Successfully deleted all ${entityKey} records` });
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (error) {
      setStatusMessage({ type: 'error', text: `Failed to delete records: ${error.message}` });
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const handleImport = async (entity) => {
    if (!importFile) {
      setStatusMessage({ type: 'error', text: 'Please select a file to import' });
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    try {
      setImportingEntity(entity.key);
      setStatusMessage({ type: 'loading', text: `Importing ${entity.name}...` });

      if (deleteBeforeImport) {
        setEntityToDelete(entity.key);
        setShowDeleteConfirm(true);
        return;
      }

      await processImport(entity);
    } catch (error) {
      setStatusMessage({ type: 'error', text: `Failed to import: ${error.message}` });
      setTimeout(() => setStatusMessage(null), 5000);
      setImportingEntity(null);
    }
  };

  const processImport = async (entity) => {
    try {
      const fileContent = await importFile.text();
      const importData = JSON.parse(fileContent);

      if (importData.entity !== entity.key) {
        throw new Error(`File contains ${importData.entity} data, but trying to import as ${entity.key}`);
      }

      const records = importData.data;

      if (records.length === 0) {
        setStatusMessage({ type: 'warning', text: 'No records found in the file' });
        setTimeout(() => setStatusMessage(null), 3000);
        setImportingEntity(null);
        return;
      }

      const cleanedRecords = records.map(record => {
        const { id, created_date, updated_date, created_by, ...rest } = record;
        return rest;
      });

      for (const record of cleanedRecords) {
        await base44.entities[entity.key].create(record);
      }

      queryClient.invalidateQueries();
      setStatusMessage({ type: 'success', text: `Successfully imported ${records.length} ${entity.name} records` });
      setTimeout(() => setStatusMessage(null), 5000);
      setImportFile(null);
      setDeleteBeforeImport(false);
    } catch (error) {
      setStatusMessage({ type: 'error', text: `Import failed: ${error.message}` });
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setImportingEntity(null);
    }
  };

  const confirmDeleteAndImport = async () => {
    setShowDeleteConfirm(false);
    const entity = entities.find(e => e.key === entityToDelete);
    
    await handleDeleteAllRecords(entityToDelete);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await processImport(entity);
    
    setEntityToDelete(null);
  };

  // Super Admin: Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: async (organizationId) => {
      const response = await base44.functions.invoke('createBackup', { organization_id: organizationId });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['backup-history']);
      setStatusMessage({ type: 'success', text: data.message || 'Backup created successfully' });
      setTimeout(() => setStatusMessage(null), 5000);
      setSelectedOrgForBackup(null);
    },
    onError: (error) => {
      setStatusMessage({ type: 'error', text: `Backup failed: ${error.message}` });
      setTimeout(() => setStatusMessage(null), 5000);
    }
  });

  // Super Admin: Restore backup mutation
  const restoreBackupMutation = useMutation({
    mutationFn: async ({ backup_id, restore_mode }) => {
      const response = await base44.functions.invoke('restoreBackup', { backup_id, restore_mode });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      setStatusMessage({ type: 'success', text: data.message || 'Backup restored successfully' });
      setTimeout(() => setStatusMessage(null), 5000);
      setSelectedBackupToRestore(null);
    },
    onError: (error) => {
      setStatusMessage({ type: 'error', text: `Restore failed: ${error.message}` });
      setTimeout(() => setStatusMessage(null), 5000);
    }
  });

  // Download backup file
  const handleDownloadBackup = async (backup) => {
    try {
      setStatusMessage({ type: 'loading', text: 'Generating download link...' });
      
      const signedUrlResponse = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri: backup.file_uri,
        expires_in: 300
      });

      window.open(signedUrlResponse.signed_url, '_blank');
      
      setStatusMessage({ type: 'success', text: 'Download started' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      setStatusMessage({ type: 'error', text: `Download failed: ${error.message}` });
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

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
                <h1 className="text-4xl font-black text-gray-900 dark:text-white">
                  {isSuperAdmin ? 'Automatic Backup System' : 'Data Backup & Restore'}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">
                  {isSuperAdmin 
                    ? 'Manage automated backups for Basic and Premium organizations' 
                    : 'Manually export and import your organization\'s data'}
                </p>
              </div>

              {statusMessage && (
                <Alert className={`${
                  statusMessage.type === 'success' ? 'bg-green-50 dark:bg-green-950/30 border-green-500' :
                  statusMessage.type === 'error' ? 'bg-red-50 dark:bg-red-950/30 border-red-500' :
                  statusMessage.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-500' :
                  'bg-blue-50 dark:bg-blue-950/30 border-blue-500'
                } border-2`}>
                  {statusMessage.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />}
                  {statusMessage.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />}
                  {statusMessage.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />}
                  {statusMessage.type === 'loading' && <Database className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-pulse" />}
                  <AlertDescription className={`${
                    statusMessage.type === 'success' ? 'text-green-800 dark:text-green-300' :
                    statusMessage.type === 'error' ? 'text-red-800 dark:text-red-300' :
                    statusMessage.type === 'warning' ? 'text-yellow-800 dark:text-yellow-300' :
                    'text-blue-800 dark:text-blue-300'
                  } font-bold`}>
                    {statusMessage.text}
                  </AlertDescription>
                </Alert>
              )}

              {/* SUPER ADMIN VIEW */}
              {isSuperAdmin ? (
                <Tabs defaultValue="backups" className="space-y-6">
                  <TabsList className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 p-1 rounded-xl">
                    <TabsTrigger value="backups" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white font-bold rounded-lg px-6">
                      Backup History
                    </TabsTrigger>
                    <TabsTrigger value="create" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white font-bold rounded-lg px-6">
                      Create Backup
                    </TabsTrigger>
                    <TabsTrigger value="restore" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white font-bold rounded-lg px-6">
                      Restore Backup
                    </TabsTrigger>
                  </TabsList>

                  {/* Backup History Tab */}
                  <TabsContent value="backups">
                    <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                              <Archive className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-2xl font-black text-gray-900 dark:text-white">Backup History</CardTitle>
                              <CardDescription className="font-medium">All automated and manual backups</CardDescription>
                            </div>
                          </div>
                          <Badge className="bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 text-lg px-4 py-2">
                            {backupHistory.length} Total Backups
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {backupHistory.length === 0 ? (
                          <div className="text-center py-12">
                            <Database className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <p className="text-xl font-bold text-gray-500 dark:text-gray-400">No backups created yet</p>
                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Create your first backup in the "Create Backup" tab</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {backupHistory.map(backup => (
                              <div key={backup.id} className="p-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-lg transition-all">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h3 className="font-black text-gray-900 dark:text-white text-lg">{backup.organization_name}</h3>
                                      <Badge className={`${
                                        backup.subscription_tier === 'premium' 
                                          ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300' 
                                          : 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300'
                                      } font-bold`}>
                                        {backup.subscription_tier.toUpperCase()}
                                      </Badge>
                                      <Badge className={`${
                                        backup.status === 'success' ? 'bg-green-100 text-green-700 border-green-300' :
                                        backup.status === 'failed' ? 'bg-red-100 text-red-700 border-red-300' :
                                        'bg-yellow-100 text-yellow-700 border-yellow-300'
                                      } font-bold`}>
                                        {backup.status === 'success' ? '✓ Success' : backup.status === 'failed' ? '✗ Failed' : '⌛ In Progress'}
                                      </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                                      <div>
                                        <span className="text-gray-500 dark:text-gray-400 font-semibold">Date:</span>
                                        <p className="font-bold text-gray-900 dark:text-white">{new Date(backup.backup_date).toLocaleDateString()}</p>
                                      </div>
                                      <div>
                                        <span className="text-gray-500 dark:text-gray-400 font-semibold">By:</span>
                                        <p className="font-bold text-gray-900 dark:text-white">{backup.backed_up_by}</p>
                                      </div>
                                      <div>
                                        <span className="text-gray-500 dark:text-gray-400 font-semibold">Size:</span>
                                        <p className="font-bold text-gray-900 dark:text-white">{formatFileSize(backup.file_size_bytes)}</p>
                                      </div>
                                      <div>
                                        <span className="text-gray-500 dark:text-gray-400 font-semibold">Records:</span>
                                        <p className="font-bold text-gray-900 dark:text-white">
                                          {(backup.data_summary?.teams_count || 0) + (backup.data_summary?.players_count || 0) + (backup.data_summary?.games_count || 0)}
                                        </p>
                                      </div>
                                    </div>
                                    {backup.data_summary && (
                                      <div className="flex gap-2 flex-wrap text-xs">
                                        <Badge variant="outline" className="font-semibold">👥 {backup.data_summary.teams_count} Teams</Badge>
                                        <Badge variant="outline" className="font-semibold">🏃 {backup.data_summary.players_count} Players</Badge>
                                        <Badge variant="outline" className="font-semibold">🏀 {backup.data_summary.games_count} Games</Badge>
                                        <Badge variant="outline" className="font-semibold">📊 {backup.data_summary.stats_count} Stats</Badge>
                                      </div>
                                    )}
                                    {backup.error_message && (
                                      <Alert className="bg-red-50 dark:bg-red-950/30 border-red-300 mt-2">
                                        <AlertDescription className="text-red-700 dark:text-red-300 text-sm font-semibold">
                                          Error: {backup.error_message}
                                        </AlertDescription>
                                      </Alert>
                                    )}
                                  </div>
                                  {backup.status === 'success' && (
                                    <Button
                                      onClick={() => handleDownloadBackup(backup)}
                                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold"
                                    >
                                      <Download className="w-4 h-4 mr-2" />
                                      Download
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Create Backup Tab */}
                  <TabsContent value="create">
                    <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Database className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-2xl font-black text-gray-900 dark:text-white">Create Manual Backup</CardTitle>
                            <CardDescription className="font-medium">Backup data for a specific organization</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Alert className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-500">
                          <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <AlertDescription className="text-blue-800 dark:text-blue-300 font-medium">
                            Manual backups are created instantly and stored securely. Only Basic and Premium organizations can be backed up.
                          </AlertDescription>
                        </Alert>

                        <div>
                          <Label className="font-bold text-gray-900 dark:text-white mb-2 block">Select Organization</Label>
                          <Select value={selectedOrgForBackup || ''} onValueChange={setSelectedOrgForBackup}>
                            <SelectTrigger className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 font-medium">
                              <SelectValue placeholder="Choose an organization..." />
                            </SelectTrigger>
                            <SelectContent>
                              {backupEligibleOrgs.map(org => (
                                <SelectItem key={org.id} value={org.id}>
                                  {org.name} ({org.subscription_tier.toUpperCase()})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          onClick={() => createBackupMutation.mutate(selectedOrgForBackup)}
                          disabled={!selectedOrgForBackup || createBackupMutation.isPending}
                          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-6 text-lg shadow-lg"
                        >
                          {createBackupMutation.isPending ? (
                            <>
                              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                              Creating Backup...
                            </>
                          ) : (
                            <>
                              <Database className="w-5 h-5 mr-2" />
                              Create Backup Now
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Restore Backup Tab */}
                  <TabsContent value="restore">
                    <Card className="bg-white dark:bg-gray-800 border-2 border-red-200 dark:border-red-800 shadow-lg">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Upload className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-2xl font-black text-gray-900 dark:text-white">Restore from Backup</CardTitle>
                            <CardDescription className="font-medium text-red-600 dark:text-red-400">⚠️ Use with extreme caution</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Alert className="bg-red-50 dark:bg-red-950/30 border-2 border-red-500">
                          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                          <AlertDescription className="text-red-800 dark:text-red-300 font-bold">
                            <p className="mb-2">WARNING: Restoring a backup will modify production data!</p>
                            <ul className="text-sm space-y-1">
                              <li>• <strong>Merge Mode:</strong> Adds backup data to existing records (may create duplicates)</li>
                              <li>• <strong>Replace Mode:</strong> Deletes ALL existing organization data and restores from backup</li>
                            </ul>
                          </AlertDescription>
                        </Alert>

                        <div>
                          <Label className="font-bold text-gray-900 dark:text-white mb-2 block">Select Backup to Restore</Label>
                          <Select value={selectedBackupToRestore || ''} onValueChange={setSelectedBackupToRestore}>
                            <SelectTrigger className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 font-medium">
                              <SelectValue placeholder="Choose a backup..." />
                            </SelectTrigger>
                            <SelectContent>
                              {backupHistory.filter(b => b.status === 'success').map(backup => (
                                <SelectItem key={backup.id} value={backup.id}>
                                  {backup.organization_name} - {new Date(backup.backup_date).toLocaleString()} ({backup.subscription_tier})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="font-bold text-gray-900 dark:text-white mb-2 block">Restore Mode</Label>
                          <Select value={restoreMode} onValueChange={setRestoreMode}>
                            <SelectTrigger className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="merge">Merge (Add to Existing Data)</SelectItem>
                              <SelectItem value="replace">Replace (Delete All & Restore)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          onClick={() => restoreBackupMutation.mutate({ backup_id: selectedBackupToRestore, restore_mode: restoreMode })}
                          disabled={!selectedBackupToRestore || restoreBackupMutation.isPending}
                          className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold py-6 text-lg shadow-lg"
                        >
                          {restoreBackupMutation.isPending ? (
                            <>
                              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                              Restoring...
                            </>
                          ) : (
                            <>
                              <Upload className="w-5 h-5 mr-2" />
                              Restore Backup ({restoreMode === 'merge' ? 'Merge' : 'Replace'})
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              ) : (
                /* REGULAR ADMIN VIEW - Original Manual Backup */
                <>
                  <Alert className="bg-yellow-50 dark:bg-yellow-950/30 border-2 border-yellow-500">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-300 font-medium">
                  <p className="font-black mb-2">⚠️ IMPORTANT INFORMATION</p>
                  <ul className="space-y-1 text-sm">
                    <li>• <strong>Manual Process:</strong> You are responsible for storing and managing backup files on your computer.</li>
                    <li>• <strong>Export Each Type:</strong> You must export each data type individually (Teams, Players, etc.).</li>
                    <li>• <strong>Import Order Matters:</strong> When restoring, import in this order: Divisions → Teams → Players → Games → Statistics.</li>
                    <li>• <strong>Delete Before Import:</strong> Check "Delete all existing records" to avoid duplicates when restoring.</li>
                    <li>• <strong>No Version Control:</strong> There's no automatic versioning. Name your backup files with dates to track versions.</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Download className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-black text-gray-900 dark:text-white">Export Data</CardTitle>
                        <CardDescription className="font-medium">Download backup files to your computer</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {entities.map((entity) => (
                      <div key={entity.key} className={`p-4 bg-gradient-to-br from-${entity.color}-50 to-white dark:from-${entity.color}-950/20 dark:to-gray-800 border-2 border-${entity.color}-200 dark:border-${entity.color}-800 rounded-xl`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{entity.icon}</span>
                            <div>
                              <h3 className="font-black text-gray-900 dark:text-white">{entity.name}</h3>
                              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">{entity.description}</p>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleExport(entity)}
                          disabled={exportingEntity === entity.key}
                          className={`w-full bg-gradient-to-r from-${entity.color}-600 to-${entity.color}-700 hover:from-${entity.color}-700 hover:to-${entity.color}-800 text-white font-bold shadow-lg mt-3`}
                        >
                          <FileDown className="w-4 h-4 mr-2" />
                          {exportingEntity === entity.key ? 'Exporting...' : `Export ${entity.name}`}
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Upload className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-black text-gray-900 dark:text-white">Import Data</CardTitle>
                        <CardDescription className="font-medium">Restore data from backup files</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
                      <Label className="font-bold text-gray-900 dark:text-white mb-2 block">Select Backup File</Label>
                      <Input
                        type="file"
                        accept=".json"
                        onChange={(e) => setImportFile(e.target.files[0])}
                        className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 font-medium"
                      />
                      {importFile && (
                        <Badge className="mt-2 bg-green-100 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800 font-bold">
                          ✓ File selected: {importFile.name}
                        </Badge>
                      )}
                    </div>

                    <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="deleteBeforeImport"
                          checked={deleteBeforeImport}
                          onChange={(e) => setDeleteBeforeImport(e.target.checked)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <Label htmlFor="deleteBeforeImport" className="font-bold text-gray-900 dark:text-white cursor-pointer">
                            Delete all existing records before import
                          </Label>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-medium">
                            ⚠️ This will permanently delete all current records of the selected type before importing the backup data.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {entities.map((entity) => (
                        <Button
                          key={entity.key}
                          onClick={() => handleImport(entity)}
                          disabled={!importFile || importingEntity === entity.key}
                          variant="outline"
                          className={`w-full border-2 border-${entity.color}-300 dark:border-${entity.color}-700 hover:bg-${entity.color}-50 dark:hover:bg-${entity.color}-950/30 font-bold`}
                        >
                          <span className="mr-2">{entity.icon}</span>
                          {importingEntity === entity.key ? 'Importing...' : `Import ${entity.name}`}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

                  <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-2 border-red-200 dark:border-red-800 shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Trash2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-black text-gray-900 dark:text-white">Danger Zone</CardTitle>
                      <CardDescription className="font-medium">Manually delete all records (use with caution)</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Alert className="bg-red-100 dark:bg-red-950/50 border-2 border-red-400 dark:border-red-700 mb-4">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <AlertDescription className="text-red-800 dark:text-red-300 font-bold">
                      These actions will permanently delete data and cannot be undone. Use only if you need to clear all data before importing a backup.
                    </AlertDescription>
                  </Alert>
                  <div className="grid md:grid-cols-2 gap-3">
                    {entities.map((entity) => (
                      <Button
                        key={entity.key}
                        onClick={() => {
                          setEntityToDelete(entity.key);
                          setShowDeleteConfirm(true);
                        }}
                        variant="outline"
                        className="border-2 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 font-bold"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete All {entity.name}
                      </Button>
                    ))}
                  </div>
                  </CardContent>
                </Card>
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-950/30 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <AlertDialogTitle className="text-xl font-black text-gray-900 dark:text-white">
                Confirm Deletion
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400 font-medium">
              {deleteBeforeImport ? (
                <>
                  <p className="mb-3">You are about to delete all existing <span className="font-bold text-gray-900 dark:text-white">{entityToDelete}</span> records before importing new data.</p>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">This action cannot be undone. Are you sure you want to continue?</p>
                </>
              ) : (
                <>
                  <p className="mb-3">You are about to permanently delete all <span className="font-bold text-gray-900 dark:text-white">{entityToDelete}</span> records for your organization.</p>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">⚠️ WARNING: This will permanently delete all data and cannot be undone!</p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-2 border-gray-300 dark:border-gray-600 font-bold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteBeforeImport) {
                  confirmDeleteAndImport();
                } else {
                  setShowDeleteConfirm(false);
                  handleDeleteAllRecords(entityToDelete);
                  setEntityToDelete(null);
                }
              }}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold"
            >
              Yes, Delete All Records
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}