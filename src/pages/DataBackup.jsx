import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Upload, AlertTriangle, Database, Trash2, CheckCircle, FileDown } from "lucide-react";
import { createPageUrl } from "@/utils";
import AdminHeader from "@/components/AdminHeader";
import AdminSidebar from "@/components/AdminSidebar";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
    enabled: !!user?.organization_id,
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
                <h1 className="text-4xl font-black text-gray-900 dark:text-white">Data Backup & Restore</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">Manually export and import your organization's data</p>
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