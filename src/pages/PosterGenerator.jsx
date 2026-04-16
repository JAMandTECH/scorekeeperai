import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Download, Sparkles, Trash2, FolderOpen, RefreshCcw, ArrowLeft, LayoutGrid, List } from 'lucide-react'; // cleaned: removed AI chat; kept background remover
import PosterCanvas from '@/components/posters/PosterCanvas';
import { format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import SocialShare from '@/components/social/SocialShare';
import 'onnxruntime-web';



export default function PosterGenerator() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = React.useState(null);
  const [sport, setSport] = React.useState('basketball');
  const [selectedGameId, setSelectedGameId] = React.useState('');
  const [selectedTemplateId, setSelectedTemplateId] = React.useState('');
  const [imageUrl, setImageUrl] = React.useState('');
  const [bestPlayerImageUrl, setBestPlayerImageUrl] = React.useState('');
  const [bestPlayerFile, setBestPlayerFile] = React.useState(null);
  const [uploading, setUploading] = React.useState(false);
  const [removeBgLoading, setRemoveBgLoading] = React.useState(false);
  const [layout, setLayout] = React.useState({});
  const [posterDataUrl, setPosterDataUrl] = React.useState('');
  const [savedOpen, setSavedOpen] = React.useState(false);
  // Template upload dialog state
  const [addOpen, setAddOpen] = React.useState(false);
  const [newTplName, setNewTplName] = React.useState('');
  const [newTplSport, setNewTplSport] = React.useState(sport);
  const [newTplDesc, setNewTplDesc] = React.useState('');
  const [newTplLayout, setNewTplLayout] = React.useState('{}');
  const [newTplFile, setNewTplFile] = React.useState(null);
  const [tplUploading, setTplUploading] = React.useState(false);
  // Saved posters view/filter state
  const [viewMode, setViewMode] = React.useState('cards'); // 'cards' | 'table'
  const [filterSport, setFilterSport] = React.useState('all');
  const [filterDivision, setFilterDivision] = React.useState('all');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');

  React.useEffect(() => {
    (async () => {
      try { const me = await base44.auth.me(); setUser(me); } catch (_) { setUser(null); }
    })();
  }, []);

  const gamesQ = useQuery({
    queryKey: ['pgames', sport],
    queryFn: async () => {
      return await base44.entities.Game.filter({ status: 'completed', sport }, '-game_date', 100);
    },
    initialData: [],
    enabled: !!user,
  });

  const teamsQ = useQuery({
    queryKey: ['pteams', sport],
    queryFn: async () => {
      return await base44.entities.Team.filter({ sport });
    },
    initialData: [],
    enabled: !!user,
  });

  const teamMap = React.useMemo(() => {
    const m = {};
    (teamsQ.data || []).forEach(t => { m[t.id] = t.name; });
    return m;
  }, [teamsQ.data]);

  const templatesQ = useQuery({
    queryKey: ['ptemplates', sport],
    queryFn: async () => {
      return await base44.entities.PosterTemplate.filter({ sport });
    },
    initialData: [],
    enabled: !!user,
  });

  React.useEffect(() => {
    setNewTplSport(sport);
  }, [sport]);

  const gameQ = useQuery({
    queryKey: ['gameById', selectedGameId],
    queryFn: async () => {
      const arr = await base44.entities.Game.filter({ id: selectedGameId });
      return arr?.[0] || null;
    },
    enabled: !!user && !!selectedGameId,
    initialData: null,
  });

  const topQ = useQuery({
    queryKey: ['topPlayers', selectedGameId],
    queryFn: async () => {
      const res = await base44.functions.invoke('getTopPlayersForGame', { gameId: selectedGameId, topN: 10 });
      return res.data;
    },
    enabled: !!user && !!selectedGameId,
    initialData: null,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const gameForPoster = gameQ.data || topQ.data?.game || null;

  const orgQ = useQuery({
    queryKey: ['orgForGame', gameForPoster?.organization_id],
    queryFn: async () => {
      if (!gameForPoster?.organization_id) return null;
      const arr = await base44.entities.Organization.filter({ id: gameForPoster.organization_id });
      return arr?.[0] || null;
    },
    enabled: !!user && !!gameForPoster?.organization_id,
    initialData: null,
  });

  const postersQ = useQuery({
    queryKey: ['posters'],
    queryFn: async () => {
      return await base44.entities.Poster.list('-created_date', 50);
    },
    initialData: [],
    enabled: !!user,
  });

  // Load related games for the saved posters to enable division/sport/date filtering
  const posterGamesQ = useQuery({
    queryKey: ['posterGames', (postersQ.data || []).map(p => p.game_id || '').join(',')],
    queryFn: async () => {
      const ids = Array.from(new Set((postersQ.data || []).map(p => p.game_id).filter(Boolean)));
      const results = await Promise.all(ids.map(async (id) => {
        const arr = await base44.entities.Game.filter({ id });
        return arr?.[0] || null;
      }));
      const map = {};
      results.forEach(g => { if (g) map[g.id] = g; });
      return map;
    },
    enabled: !!user && !!postersQ.data && postersQ.data.length > 0,
    initialData: {},
  });

  const gameById = posterGamesQ.data || {};
  const divisionOptions = React.useMemo(() => {
    const set = new Set();
    Object.values(gameById).forEach((g) => { if (g?.division) set.add(g.division); });
    return Array.from(set);
  }, [posterGamesQ.data]);

  const filteredPosters = React.useMemo(() => {
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;
    return (postersQ.data || []).filter((p) => {
      const g = p.game_id ? gameById[p.game_id] : null;
      const sportVal = (p.sport || g?.sport || '').toLowerCase();
      const divVal = g?.division || '';
      const dateStr = g?.game_date || p.created_date;
      const d = dateStr ? new Date(dateStr) : null;
      if (filterSport !== 'all' && sportVal !== filterSport) return false;
      if (filterDivision !== 'all' && divVal !== filterDivision) return false;
      if (from && d && d < from) return false;
      if (to && d && d > new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999)) return false;
      return true;
    });
  }, [postersQ.data, gameById, filterSport, filterDivision, dateFrom, dateTo]);

  const genMutation = useMutation({
    mutationFn: async ({ gameId, templateId }) => {
      const res = await base44.functions.invoke('generatePosterImage', { gameId, templateId });
      return res.data;
    },
    onSuccess: (data) => {
      setImageUrl(data?.url || '');
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || err?.message || 'Please try again later.';
      toast({ variant: 'destructive', title: 'Generation failed', description: String(msg).slice(0, 300) });
    }
  });

  const deleteTplMutation = useMutation({
    mutationFn: (id) => base44.entities.PosterTemplate.delete(id),
    onSuccess: (_data, id) => {
      if (selectedTemplateId === id) { setSelectedTemplateId(''); setImageUrl(''); }
      qc.invalidateQueries({ queryKey: ['ptemplates'] });
    },
  });

  const deletePosterMutation = useMutation({
      mutationFn: (id) => base44.entities.Poster.delete(id),
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['posters'] });
      },
    });

  const handlePosterDownload = async (poster) => {
    if (!poster?.image_url) return;
    const url = poster.image_url;
    try {
      const res = await fetch(url, { mode: 'cors' });
      const blob = await res.blob();
      const type = blob.type || 'image/jpeg';
      const ext = (type.split('/')?.[1] || 'jpg').split(';')[0];
      const safeTitle = (poster.title || 'poster')
        .toString()
        .replace(/[^a-z0-9-_ ]/gi, '')
        .trim()
        .replace(/\s+/g, '_')
        .toLowerCase();
      const datePart = poster.created_date ? new Date(poster.created_date).toISOString().slice(0, 10) : '';
      const filename = [safeTitle || 'poster', datePart].filter(Boolean).join('_') + '.' + ext;

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (_) {
      // Fallback: open in new tab if direct download is blocked
      window.open(url, '_blank');
    }
  };

  if (user && user.role !== 'admin') {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Admins only</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">This tool is available to organization admins.</p>
            <div className="mt-4"><Link to="/Dashboard"><Button variant="outline">Back to Dashboard</Button></Link></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Poster Generator</h1>
          <div className="flex gap-2">
            <Button variant="ghost" className="gap-2" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setSavedOpen(true)}>
              <FolderOpen className="h-4 w-4" /> Saved
            </Button>
          </div>
        </div>

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Sport</label>
              <Select value={sport} onValueChange={(v) => { setSport(v); setSelectedGameId(''); setSelectedTemplateId(''); setImageUrl(''); qc.invalidateQueries({ queryKey: ['pgames'] }); qc.invalidateQueries({ queryKey: ['ptemplates'] }); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select sport" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basketball">Basketball</SelectItem>
                  <SelectItem value="volleyball">Volleyball</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Completed Game</label>
              <Select value={selectedGameId} onValueChange={(v) => setSelectedGameId(v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={gamesQ.isLoading ? 'Loading games...' : 'Select a game'} /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {gamesQ.data?.map(g => (
                    <SelectItem key={g.id} value={g.id}>
                      {(() => {
                        const home = teamMap[g.home_team_id] || 'Home';
                        const away = teamMap[g.away_team_id] || 'Away';
                        const date = g.game_date ? format(new Date(g.game_date), 'MMM d') : '';
                        return `${home} vs ${away} • ${g.division || 'N/A'} • ${date}`;
                      })()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Best Player Photo</label>
              <div className="mt-1 flex items-center gap-3">
                <Input type="file" accept="image/*" onChange={async (e) => {
                 const file = e.target.files?.[0];
                 if (!file) return;
                 setBestPlayerFile(file);
                 setUploading(true);
                 try {
                   const { file_url } = await base44.integrations.Core.UploadFile({ file });
                   setBestPlayerImageUrl(file_url);
                 } finally {
                   setUploading(false);
                 }
                }} />
                {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {bestPlayerImageUrl && <img src={bestPlayerImageUrl} alt="Best player" className="w-12 h-12 rounded-full border object-cover" />}
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={(!bestPlayerFile && !bestPlayerImageUrl) || removeBgLoading}
                  onClick={async () => {
                    setRemoveBgLoading(true);
                    try {
                      let file = bestPlayerFile;
                      if (!file && bestPlayerImageUrl) {
                        const r = await fetch(bestPlayerImageUrl);
                        const b = await r.blob();
                        file = new File([b], 'player.png', { type: b.type || 'image/png' });
                      }
                      if (!file) throw new Error('No image selected');

                      try {
                        const mod = await import('@imgly/background-removal');
                        const blob = await mod.removeBackground(file, {
                          model: 'isnet_fp16',
                          progress: (key, current, total) => {
                            console.log(`Downloading ${key}: ${Math.round((current/total)*100)}%`);
                          }
                        });
                        const processedFile = new File([blob], `player-nobg-${Date.now()}.png`, { type: 'image/png' });
                        const upload = await base44.integrations.Core.UploadFile({ file: processedFile });
                        setBestPlayerImageUrl(upload.file_url);
                        setBestPlayerFile(processedFile);
                      } catch (localErr) {
                        console.warn('Local background removal failed; falling back to server', localErr);
                        const srcUrl = bestPlayerImageUrl;
                        const res = await base44.functions.invoke('removeBg', { imageUrl: srcUrl });
                        if (res?.data?.dataUrl) {
                          setBestPlayerImageUrl(res.data.dataUrl);
                        } else {
                          throw new Error('Fallback service did not return an image');
                        }
                      }
                    } catch (err) {
                      const status = err?.response?.status;
                      const details = err?.response?.data?.error || err?.response?.data?.details;
                      const msg = status === 402
                        ? 'Background removal credits are exhausted. Please try again later or contact support.'
                        : (details || err?.message || 'Background removal failed.');
                      toast({ variant: 'destructive', title: 'Background removal failed', description: String(msg).slice(0, 300) });
                    } finally {
                      setRemoveBgLoading(false);
                    }
                  }}
                >
                  {removeBgLoading && <Loader2 className="h-4 w-4 animate-spin" />} Remove Background
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Optional: overrides player profile photo for this poster.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Templates</CardTitle>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm">Add Template</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Template</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-muted-foreground">Name</label>
                    <Input className="mt-1" value={newTplName} onChange={(e)=>setNewTplName(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Sport</label>
                    <Select value={newTplSport} onValueChange={setNewTplSport}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select sport" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basketball">Basketball</SelectItem>
                        <SelectItem value="volleyball">Volleyball</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Background Image</label>
                    <Input className="mt-1" type="file" accept="image/*" onChange={(e)=>setNewTplFile(e.target.files?.[0] || null)} />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Description (optional)</label>
                    <Input className="mt-1" value={newTplDesc} onChange={(e)=>setNewTplDesc(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Layout JSON (optional)</label>
                    <textarea className="mt-1 w-full border rounded-md p-2 text-sm" rows="4" value={newTplLayout} onChange={(e)=>setNewTplLayout(e.target.value)} />
                    <p className="text-xs text-muted-foreground mt-1">Define text/element positions for this template.</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={()=>setAddOpen(false)}>Cancel</Button>
                  <Button
                    onClick={async ()=>{
                      if (!newTplName || !newTplFile) return;
                      setTplUploading(true);
                      try {
                        const { file_url } = await base44.integrations.Core.UploadFile({ file: newTplFile });
                        let meta = {};
                        try { meta = newTplLayout ? JSON.parse(newTplLayout) : {}; } catch (_) {}
                        await base44.entities.PosterTemplate.create({
                          name: newTplName,
                          sport: newTplSport,
                          description: newTplDesc || undefined,
                          sample_image_url: file_url,
                          metadata: meta
                        });
                        setAddOpen(false);
                        setNewTplName(''); setNewTplDesc(''); setNewTplLayout('{}'); setNewTplFile(null);
                        qc.invalidateQueries({ queryKey: ['ptemplates'] });
                      } finally {
                        setTplUploading(false);
                      }
                    }}
                    disabled={tplUploading || !newTplName || !newTplFile}
                  >
                    {tplUploading && <Loader2 className="h-4 w-4 animate-spin" />} Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {templatesQ.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading templates...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {templatesQ.data?.map(t => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={`relative border rounded-lg text-left overflow-hidden hover:shadow-md transition ${selectedTemplateId === t.id ? 'ring-2 ring-primary' : ''}`}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="absolute top-2 right-2 z-10" onClick={(e)=>e.stopPropagation()}>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => { if (window.confirm('Delete this template?')) deleteTplMutation.mutate(t.id); }}
                        disabled={deleteTplMutation.isPending}
                        title="Delete Template"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="relative aspect-video bg-muted flex items-center justify-center text-muted-foreground">
                      {t.sample_image_url ? (
                        <img src={t.sample_image_url} alt={t.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs px-3 py-2">{t.name}</span>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium truncate">{t.name}</div>
                        <Badge variant="secondary">{t.sport}</Badge>
                      </div>
                      {t.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <Button
          disabled={!selectedTemplateId}
          onClick={() => {
                        const t = (templatesQ.data || []).find(x => x.id === selectedTemplateId);
                        if (t?.sample_image_url) setImageUrl(t.sample_image_url);
                        if (t?.metadata) setLayout(t.metadata);
                        // Ensure freshest top player stats after backend change
                        qc.invalidateQueries({ queryKey: ['topPlayers', selectedGameId] });
                      }}
        >
          Use Template
        </Button>
        <Button
          variant="secondary"
          disabled={!selectedTemplateId || !selectedGameId || genMutation.isPending}
          onClick={() => genMutation.mutate({ gameId: selectedGameId, templateId: selectedTemplateId })}
          className="gap-2"
        >
          {genMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Generate Background
        </Button>
        {imageUrl && (
          <>
            <a href={imageUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Download Background</Button>
            </a>

          </>
        )}
      </div>

      {imageUrl && (
        <div className="mt-6 grid lg:grid-cols-2 gap-6 items-start">
          <Card>
            <CardHeader>
              <CardTitle>Background</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full max-w-xl">
                <img src={imageUrl} alt="Generated Poster" className="w-full h-auto rounded-md border" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Composed Poster (with stats)</CardTitle>
            </CardHeader>
            <CardContent>
              {topQ.isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading top players...</div>
              ) : topQ.data ? (
                <>
                  <PosterCanvas
                    backgroundUrl={imageUrl}
                    game={gameForPoster}
                    players={[(() => { const gp = gameForPoster; const tops = topQ.data?.topPlayers || []; if (!gp || tops.length === 0) return null; const winTeamId = gp.winning_team_id || (() => { if (gp.sport === 'volleyball' && Array.isArray(gp.quarter_scores)) { let hw=0, aw=0; gp.quarter_scores.forEach(s=>{ const h=(s?.home ?? 0), a=(s?.away ?? 0); if (h>a) hw++; else if (a>h) aw++; }); if (hw !== aw) return hw>aw ? gp.home_team_id : gp.away_team_id; } return ( (gp.home_score ?? 0) > (gp.away_score ?? 0) ) ? gp.home_team_id : gp.away_team_id; })(); const winnerTop = tops.find(p => p.team_id === winTeamId) || tops[0]; return winnerTop; })()].filter(Boolean)}
                    org={orgQ.data}
                    bestPlayerImageUrl={(() => { if (bestPlayerImageUrl) return bestPlayerImageUrl; const gp = gameForPoster; const tops = topQ.data?.topPlayers || []; if (!gp || tops.length === 0) return ''; const winTeamId = gp.winning_team_id || (() => { if (gp.sport === 'volleyball' && Array.isArray(gp.quarter_scores)) { let hw=0, aw=0; gp.quarter_scores.forEach(s=>{ const h=(s?.home ?? 0), a=(s?.away ?? 0); if (h>a) hw++; else if (a>h) aw++; }); if (hw !== aw) return hw>aw ? gp.home_team_id : gp.away_team_id; } return ( (gp.home_score ?? 0) > (gp.away_score ?? 0) ) ? gp.home_team_id : gp.away_team_id; })(); const winnerTop = tops.find(p => p.team_id === winTeamId) || tops[0]; return winnerTop?.photo_url || ''; })()}
                    homeName={teamMap[gameForPoster?.home_team_id] || 'Home Team'}
                    awayName={teamMap[gameForPoster?.away_team_id] || 'Away Team'}
                    layout={layout}
                    onReady={setPosterDataUrl}
                  />
                  <div className="mt-4">
                    <SocialShare
                      imageUrl={posterDataUrl || imageUrl}
                      text={`${(teamMap[gameForPoster?.home_team_id] || 'Home')} vs ${(teamMap[gameForPoster?.away_team_id] || 'Away')} • Final ${(gameForPoster?.home_score ?? 0)}-${(gameForPoster?.away_score ?? 0)}`}
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Select a game to load best players.</p>
              )}
            </CardContent>
            </Card>
        </div>
      )}
      <Dialog open={savedOpen} onOpenChange={setSavedOpen}>
        <DialogContent className="w-[95vw] max-w-5xl h-[85vh] grid grid-rows-[auto,auto,1fr,auto] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Saved Posters</DialogTitle>
          </DialogHeader>
          <div className="mb-3 space-y-3 shrink-0 row-start-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">{filteredPosters.length} shown</div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant={viewMode === 'cards' ? 'default' : 'outline'} className="gap-2" onClick={() => setViewMode('cards')}>
                  <LayoutGrid className="h-4 w-4" /> Cards
                </Button>
                <Button size="sm" variant={viewMode === 'table' ? 'default' : 'outline'} className="gap-2" onClick={() => setViewMode('table')}>
                  <List className="h-4 w-4" /> Table
                </Button>
                <Button size="sm" variant="outline" className="gap-2" onClick={() => qc.invalidateQueries({ queryKey: ['posters'] })}>
                  <RefreshCcw className="h-4 w-4" /> Refresh
                </Button>
              </div>
            </div>
            <div className="grid md:grid-cols-4 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Sport</label>
                <Select value={filterSport} onValueChange={setFilterSport}>
                  <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="All sports" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="basketball">Basketball</SelectItem>
                    <SelectItem value="volleyball">Volleyball</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Division</label>
                <Select value={filterDivision} onValueChange={setFilterDivision}>
                  <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="All divisions" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all">All</SelectItem>
                    {divisionOptions.map((d) => (
                      <SelectItem key={String(d)} value={String(d)}>{String(d)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">From date</label>
                <Input type="date" className="mt-1 h-9" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">To date</label>
                <Input type="date" className="mt-1 h-9" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="row-start-3 min-h-0 overflow-y-auto overflow-x-hidden pr-2 pb-4">
          {postersQ.isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading saved posters...</div>
          ) : (
            viewMode === 'cards' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPosters.map(p => (
                  <div key={p.id} className="border rounded-lg overflow-hidden">
                    <div className="relative aspect-[4/5] bg-muted">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.title || 'Saved poster'} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</div>
                      )}
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{p.title || 'Poster'}</div>
                        <div className="text-xs text-muted-foreground truncate">{new Date(p.created_date).toLocaleString()}</div>
                      </div>
                      <div className="shrink-0 flex gap-2">
                        {p.image_url && (
                          <>
                            <a href={p.image_url} target="_blank" rel="noreferrer">
                              <Button size="sm" variant="outline">Open</Button>
                            </a>
                            <Button size="sm" className="gap-2" onClick={() => handlePosterDownload(p)}><Download className="h-3 w-3" /> Download</Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => { if (window.confirm('Delete this poster?')) deletePosterMutation.mutate(p.id); }}
                          disabled={deletePosterMutation.isPending}
                          title="Delete Poster"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredPosters.length === 0 && (
                  <div className="text-sm text-muted-foreground">No posters match filters.</div>
                )}
              </div>
            ) : (
              <div className="min-w-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Preview</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Sport</TableHead>
                      <TableHead>Division</TableHead>
                      <TableHead>Game date</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPosters.map((p) => {
                      const g = (posterGamesQ.data || {})[p.game_id] || null;
                      const div = g?.division || '-';
                      const gameDate = g?.game_date ? format(new Date(g.game_date), 'PP') : '-';
                      const sportVal = (p.sport || g?.sport || '-');
                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            {p.image_url ? (
                              <img src={p.image_url} alt="preview" className="h-14 w-11 rounded object-cover" />
                            ) : (
                              <span className="text-xs text-muted-foreground">No image</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[240px] truncate">{p.title || 'Poster'}</TableCell>
                          <TableCell className="capitalize">{sportVal}</TableCell>
                          <TableCell>{div}</TableCell>
                          <TableCell>{gameDate}</TableCell>
                          <TableCell className="whitespace-nowrap">{new Date(p.created_date).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {p.image_url && (
                                <>
                                  <a href={p.image_url} target="_blank" rel="noreferrer">
                                    <Button size="sm" variant="outline">Open</Button>
                                  </a>
                                  <Button size="sm" className="gap-2" onClick={() => handlePosterDownload(p)}><Download className="h-3 w-3" /> Download</Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => { if (window.confirm('Delete this poster?')) deletePosterMutation.mutate(p.id); }}
                                disabled={deletePosterMutation.isPending}
                                title="Delete Poster"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {filteredPosters.length === 0 && (
                  <div className="text-sm text-muted-foreground mt-2">No posters match filters.</div>
                )}
              </div>
            )
          )}
          </div>
          <DialogFooter className="mt-3">
            <Button variant="outline" onClick={() => setSavedOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}