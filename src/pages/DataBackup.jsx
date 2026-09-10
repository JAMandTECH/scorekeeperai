import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Upload, AlertTriangle, Database, Trash2, CheckCircle, FileDown, Clock, RefreshCw, Archive, AlertCircle } from "lucide-react";
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
      const res = await base44.functions.invoke('getUserOrganization', {});
      return res?.data?.organization || null;
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

  // Fetch backup schedule
  const { data: backupSchedules = [], refetch: refetchSchedule } = useQuery({
    queryKey: ['backup-schedule'],
    queryFn: () => base44.entities.BackupSchedule.list(),
    enabled: isSuperAdmin,
  });

  const backupSchedule = backupSchedules[0] || null;

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

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async (scheduleData) => {
      if (backupSchedule) {
        return await base44.entities.BackupSchedule.update(backupSchedule.id, scheduleData);
      } else {
        return await base44.entities.BackupSchedule.create(scheduleData);
      }
    },
    onSuccess: () => {
      refetchSchedule();
      setStatusMessage({ type: 'success', text: 'Schedule updated successfully' });
      setTimeout(() => setStatusMessage(null), 3000);
    },
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
              <div>
                <h1 className="font-heading text-3xl font-bold tracking-tight">
                  {isSuperAdmin ? 'Automatic Backup System' : 'Data Backup & Restore'}
                </h1>
                <p className="text-muted-foreground mt-2 font-medium">
                  {isSuperAdmin 
                    ? 'Manage automated backups for Basic and Premium organizations' 
                    : 'Manually export and import your organization\'s data'}
                </p>
              </div>

              {statusMessage && (
                <Alert className={`${
                  statusMessage.type === 'success' ? 'bg-primary/10 border-primary/30' :
                  statusMessage.type === 'error' ? 'bg-destructive/10 border-destructive/30' :
                  statusMessage.type === 'warning' ? 'bg-muted border-border' :
                  'bg-muted border-border'
                } border`}>
                  {statusMessage.type === 'success' && <CheckCircle className="h-5 w-5 text-primary" />}
                  {statusMessage.type === 'error' && <AlertTriangle className="h-5 w-5 text-destructive" />}
                  {statusMessage.type === 'warning' && <AlertTriangle className="h-5 w-5 text-foreground" />}
                  {statusMessage.type === 'loading' && <Database className="h-5 w-5 text-primary animate-pulse" />}
                  <AlertDescription className="text-foreground font-medium">
                    {statusMessage.text}
                  </AlertDescription>
                </Alert>
              )}

              {/* SUPER ADMIN VIEW */}
              {isSuperAdmin ? (
                <Tabs defaultValue="backups" className="space-y-6">
                  <TabsList className="grid grid-cols-4">
                    <TabsTrigger value="backups">History</TabsTrigger>
                    <TabsTrigger value="create">Create</TabsTrigger>
                    <TabsTrigger value="restore">Restore</TabsTrigger>
                    <TabsTrigger value="schedule">Schedule</TabsTrigger>
                  </TabsList>

                  {/* Backup History Tab */}
                  <TabsContent value="backups">
                    <Card className="">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 border border-border flex items-center justify-center">
                              <Archive className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-2xl font-heading font-bold">Backup History</CardTitle>
                              <CardDescription className="font-medium">All automated and manual backups</CardDescription>
                            </div>
                          </div>
                          <Badge variant="outline" className="border-border text-muted-foreground text-lg px-4 py-2 font-medium">
                            {backupHistory.length} Total Backups
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {backupHistory.length === 0 ? (
                          <div className="text-center py-12">
                            <Database className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                            <p className="text-xl font-heading font-bold text-muted-foreground">No backups created yet</p>
                            <p className="text-sm text-muted-foreground mt-2">Create your first backup in the "Create Backup" tab</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {backupHistory.map(backup => (
                              <div key={backup.id} className="p-4 bg-muted border border-border hover:border-foreground/20 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h3 className="font-heading font-bold text-foreground text-lg">{backup.organization_name}</h3>
                                      <Badge variant="outline" className={`${
                                        backup.subscription_tier === 'premium' 
                                          ? 'border-primary text-primary' 
                                          : 'border-border text-muted-foreground'
                                      } font-medium`}>
                                        {backup.subscription_tier.toUpperCase()}
                                      </Badge>
                                      <Badge variant="outline" className={`${
                                        backup.status === 'success' ? 'border-primary text-primary' :
                                        backup.status === 'failed' ? 'border-destructive text-destructive' :
                                        'border-border text-muted-foreground'
                                      } font-medium`}>
                                        {backup.status === 'success' ? '✓ Success' : backup.status === 'failed' ? '✗ Failed' : '⌛ In Progress'}
                                      </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                                      <div>
                                        <span className="text-muted-foreground font-medium">Date:</span>
                                        <p className="font-heading font-bold text-foreground">{new Date(backup.backup_date).toLocaleDateString()}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground font-medium">By:</span>
                                        <p className="font-heading font-bold text-foreground">{backup.backed_up_by}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground font-medium">Size:</span>
                                        <p className="font-heading font-bold text-foreground">{formatFileSize(backup.file_size_bytes)}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground font-medium">Records:</span>
                                        <p className="font-heading font-bold text-foreground">
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
                                      className="font-medium"
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
                    <Card className="">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 border border-border flex items-center justify-center">
                            <Database className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-2xl font-heading font-bold">Create Manual Backup</CardTitle>
                            <CardDescription className="font-medium">Backup data for a specific organization</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Alert className="bg-muted border border-border">
                          <Database className="h-5 w-5 text-primary" />
                          <AlertDescription className="text-foreground font-medium">
                            Manual backups are created instantly and stored securely. Only Basic and Premium organizations can be backed up.
                          </AlertDescription>
                        </Alert>

                        <div>
                          <Label className="font-heading font-bold text-foreground mb-2 block">Select Organization</Label>
                          <Select value={selectedOrgForBackup || ''} onValueChange={setSelectedOrgForBackup}>
                            <SelectTrigger className="font-medium">
                              <SelectValue placeholder="Choose an organization..." />
                            </SelectTrigger>
                            <SelectContent>
                              {backupEligibleOrgs.map(org => (
                                <SelectItem key={org.id} value={org.id}>
                                  {org.name} ({org.subscription_tier?.toUpperCase() || 'FREE'})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          onClick={() => createBackupMutation.mutate(selectedOrgForBackup)}
                          disabled={!selectedOrgForBackup || createBackupMutation.isPending}
                          className="w-full font-heading font-bold py-6 text-lg"
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
                    <Card className="border-destructive/30">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 border border-border flex items-center justify-center">
                            <Upload className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-2xl font-heading font-bold">Restore from Backup</CardTitle>
                            <CardDescription className="font-medium text-destructive">⚠️ Use with extreme caution</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Alert className="bg-destructive/10 border border-destructive/30">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                          <AlertDescription className="text-foreground font-medium">
                            <p className="mb-2">WARNING: Restoring a backup will modify production data!</p>
                            <ul className="text-sm space-y-1">
                              <li>• <strong>Merge Mode:</strong> Adds backup data to existing records (may create duplicates)</li>
                              <li>• <strong>Replace Mode:</strong> Deletes ALL existing organization data and restores from backup</li>
                            </ul>
                          </AlertDescription>
                        </Alert>

                        <div>
                          <Label className="font-heading font-bold text-foreground mb-2 block">Select Backup to Restore</Label>
                          <Select value={selectedBackupToRestore || ''} onValueChange={setSelectedBackupToRestore}>
                            <SelectTrigger className="font-medium">
                              <SelectValue placeholder="Choose a backup..." />
                            </SelectTrigger>
                            <SelectContent>
                              {backupHistory.filter(b => b.status === 'success').map(backup => (
                                <SelectItem key={backup.id} value={backup.id}>
                                  {backup.organization_name} - {new Date(backup.backup_date).toLocaleString()} ({backup.subscription_tier?.toUpperCase() || 'FREE'})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="font-heading font-bold text-foreground mb-2 block">Restore Mode</Label>
                          <Select value={restoreMode} onValueChange={setRestoreMode}>
                            <SelectTrigger className="font-medium">
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
                          variant="destructive"
                          className="w-full font-heading font-bold py-6 text-lg"
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

                  {/* Schedule Tab */}
                  <TabsContent value="schedule">
                    <Card className="">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 border border-border flex items-center justify-center">
                            <Clock className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-2xl font-heading font-bold">Automatic Backup Schedule</CardTitle>
                            <CardDescription className="font-medium">Configure scheduled backups for all eligible organizations</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <Alert className="bg-muted border border-border">
                          <Database className="h-5 w-5 text-primary" />
                          <AlertDescription className="text-foreground font-medium">
                            Configure automatic backups to run on a schedule. The system will automatically backup all Basic and Premium organizations.
                          </AlertDescription>
                        </Alert>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-muted border border-border">
                            <div>
                              <Label className="text-lg font-heading font-bold text-foreground">Enable Automatic Backups</Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                {backupSchedule?.enabled ? 'Automatic backups are currently enabled' : 'Automatic backups are currently disabled'}
                              </p>
                            </div>
                            <Button
                              onClick={() => updateScheduleMutation.mutate({ 
                                enabled: !backupSchedule?.enabled,
                                frequency: backupSchedule?.frequency || 'daily',
                                time_of_day: backupSchedule?.time_of_day || '02:00'
                              })}
                              variant={backupSchedule?.enabled ? "destructive" : "default"}
                              disabled={updateScheduleMutation.isPending}
                            >
                              {updateScheduleMutation.isPending ? (
                                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Updating...</>
                              ) : (
                                backupSchedule?.enabled ? 'Disable' : 'Enable'
                              )}
                            </Button>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <Label className="font-heading font-bold text-foreground mb-2 block">Frequency</Label>
                              <Select 
                                value={backupSchedule?.frequency || 'daily'}
                                onValueChange={(value) => updateScheduleMutation.mutate({
                                  enabled: backupSchedule?.enabled || false,
                                  frequency: value,
                                  time_of_day: backupSchedule?.time_of_day || '02:00'
                                })}
                                disabled={updateScheduleMutation.isPending}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="daily">Daily</SelectItem>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label className="font-heading font-bold text-foreground mb-2 block">Time of Day (24h)</Label>
                              <Input
                                type="time"
                                value={backupSchedule?.time_of_day || '02:00'}
                                onChange={(e) => updateScheduleMutation.mutate({
                                  enabled: backupSchedule?.enabled || false,
                                  frequency: backupSchedule?.frequency || 'daily',
                                  time_of_day: e.target.value
                                })}
                                disabled={updateScheduleMutation.isPending}
                              />
                            </div>
                          </div>

                          {backupSchedule?.last_run && (
                            <div className="p-4 bg-primary/10 border border-primary/30">
                              <p className="text-sm font-heading font-bold text-primary">
                                Last Run: {new Date(backupSchedule.last_run).toLocaleString()}
                              </p>
                            </div>
                          )}

                          {backupSchedule?.next_run && (
                            <div className="p-4 bg-muted border border-border">
                              <p className="text-sm font-heading font-bold text-foreground">
                                Next Scheduled Run: {new Date(backupSchedule.next_run).toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>

                        <Alert className="bg-muted border border-border">
                          <AlertCircle className="h-5 w-5 text-foreground" />
                          <AlertDescription className="text-foreground font-medium">
                            <strong>Important:</strong> You need to set up an external cron service (like cron-job.org) to call the <code className="bg-muted-foreground/20 px-1">scheduledBackup</code> function URL at your configured schedule. Go to Dashboard → Code → Functions → scheduledBackup to get the URL.
                          </AlertDescription>
                        </Alert>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              ) : (
                /* REGULAR ADMIN VIEW - Original Manual Backup */
                <>
                  <Alert className="bg-muted border border-border">
                <AlertTriangle className="h-5 w-5 text-foreground" />
                <AlertDescription className="text-foreground font-medium">
                  <p className="font-heading font-bold mb-2">⚠️ IMPORTANT INFORMATION</p>
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
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 border border-border flex items-center justify-center">
                        <Download className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-heading font-bold">Export Data</CardTitle>
                        <CardDescription className="font-medium">Download backup files to your computer</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {entities.map((entity) => (
                      <div key={entity.key} className="p-4 bg-muted border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{entity.icon}</span>
                            <div>
                              <h3 className="font-heading font-bold text-foreground">{entity.name}</h3>
                              <p className="text-xs text-muted-foreground font-medium">{entity.description}</p>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleExport(entity)}
                          disabled={exportingEntity === entity.key}
                          className="w-full font-medium mt-3"
                        >
                          <FileDown className="w-4 h-4 mr-2" />
                          {exportingEntity === entity.key ? 'Exporting...' : `Export ${entity.name}`}
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 border border-border flex items-center justify-center">
                        <Upload className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-heading font-bold">Import Data</CardTitle>
                        <CardDescription className="font-medium">Restore data from backup files</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-muted border border-border p-4">
                      <Label className="font-heading font-bold text-foreground mb-2 block">Select Backup File</Label>
                      <Input
                        type="file"
                        accept=".json"
                        onChange={(e) => setImportFile(e.target.files[0])}
                        className="font-medium"
                      />
                      {importFile && (
                        <Badge variant="outline" className="mt-2 border-primary text-primary font-medium">
                          ✓ File selected: {importFile.name}
                        </Badge>
                      )}
                    </div>

                    <div className="bg-destructive/10 border border-destructive/30 p-4">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="deleteBeforeImport"
                          checked={deleteBeforeImport}
                          onChange={(e) => setDeleteBeforeImport(e.target.checked)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <Label htmlFor="deleteBeforeImport" className="font-heading font-bold text-foreground cursor-pointer">
                            Delete all existing records before import
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1 font-medium">
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
                          className="w-full font-medium"
                        >
                          <span className="mr-2">{entity.icon}</span>
                          {importingEntity === entity.key ? 'Importing...' : `Import ${entity.name}`}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

                  <Card className="border-destructive/30">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 border border-destructive/30 flex items-center justify-center">
                      <Trash2 className="w-6 h-6 text-destructive" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-heading font-bold">Danger Zone</CardTitle>
                      <CardDescription className="font-medium">Manually delete all records (use with caution)</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Alert className="bg-destructive/10 border border-destructive/30 mb-4">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <AlertDescription className="text-foreground font-medium">
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
                        className="border-destructive/30 text-destructive hover:bg-destructive/10 font-medium"
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-destructive/10 border border-destructive/30 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <AlertDialogTitle className="text-xl font-heading font-bold">
                Confirm Deletion
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-muted-foreground font-medium">
              {deleteBeforeImport ? (
                <>
                  <p className="mb-3">You are about to delete all existing <span className="font-heading font-bold text-foreground">{entityToDelete}</span> records before importing new data.</p>
                  <p className="text-sm font-medium text-destructive">This action cannot be undone. Are you sure you want to continue?</p>
                </>
              ) : (
                <>
                  <p className="mb-3">You are about to permanently delete all <span className="font-heading font-bold text-foreground">{entityToDelete}</span> records for your organization.</p>
                  <p className="text-sm font-medium text-destructive">⚠️ WARNING: This will permanently delete all data and cannot be undone!</p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
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
              className="bg-destructive text-destructive-foreground font-medium"
            >
              Yes, Delete All Records
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}