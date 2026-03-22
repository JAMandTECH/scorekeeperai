import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Sparkles, Trash2 } from 'lucide-react';
import PosterCanvas from '@/components/posters/PosterCanvas';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import SocialShare from '@/components/social/SocialShare';
import PosterChatPanel from '@/components/posters/PosterChatPanel';



export default function PosterGenerator() {
  const qc = useQueryClient();
  const [user, setUser] = React.useState(null);
  const [sport, setSport] = React.useState('basketball');
  const [selectedGameId, setSelectedGameId] = React.useState('');
  const [selectedTemplateId, setSelectedTemplateId] = React.useState('');
  const [imageUrl, setImageUrl] = React.useState('');
  const [bestPlayerImageUrl, setBestPlayerImageUrl] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const [layout, setLayout] = React.useState({});
  const [posterDataUrl, setPosterDataUrl] = React.useState('');
  // Template upload dialog state
  const [addOpen, setAddOpen] = React.useState(false);
  const [newTplName, setNewTplName] = React.useState('');
  const [newTplSport, setNewTplSport] = React.useState(sport);
  const [newTplDesc, setNewTplDesc] = React.useState('');
  const [newTplLayout, setNewTplLayout] = React.useState('{}');
  const [newTplFile, setNewTplFile] = React.useState(null);
  const [tplUploading, setTplUploading] = React.useState(false);

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
      const res = await base44.functions.invoke('getTopPlayersForGame', { gameId: selectedGameId, topN: 1 });
      return res.data;
    },
    enabled: !!user && !!selectedGameId,
    initialData: null,
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

  const genMutation = useMutation({
    mutationFn: async ({ gameId, templateId }) => {
      const res = await base44.functions.invoke('generatePosterImage', { gameId, templateId });
      return res.data;
    },
    onSuccess: (data) => {
      setImageUrl(data?.url || '');
    }
  });

  const deleteTplMutation = useMutation({
    mutationFn: (id) => base44.entities.PosterTemplate.delete(id),
    onSuccess: (_data, id) => {
      if (selectedTemplateId === id) { setSelectedTemplateId(''); setImageUrl(''); }
      qc.invalidateQueries({ queryKey: ['ptemplates'] });
    },
  });

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
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <div className="mt-6 grid lg:grid-cols-3 gap-6 items-start">
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
                    players={topQ.data.topPlayers ? [topQ.data.topPlayers[0]] : []}
                    org={orgQ.data}
                    bestPlayerImageUrl={bestPlayerImageUrl || (topQ.data.topPlayers?.[0]?.photo_url || '')}
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

          <Card>
            <CardHeader>
              <CardTitle>AI Design Chat</CardTitle>
            </CardHeader>
            <CardContent>
              <PosterChatPanel
                templateId={selectedTemplateId}
                game={gameForPoster}
                org={orgQ.data}
                homeName={teamMap[gameForPoster?.home_team_id] || 'Home Team'}
                awayName={teamMap[gameForPoster?.away_team_id] || 'Away Team'}
                backgroundUrl={imageUrl}
                composedText={`${(teamMap[gameForPoster?.home_team_id] || 'Home')} vs ${(teamMap[gameForPoster?.away_team_id] || 'Away')} • Final ${(gameForPoster?.home_score ?? 0)}-${(gameForPoster?.away_score ?? 0)}`}
                bestPlayerImageUrl={bestPlayerImageUrl}
                onRemoveBg={async () => {
                  if (!bestPlayerImageUrl) return;
                  const res = await base44.functions.invoke('removeBg', { imageUrl: bestPlayerImageUrl });
                  if (res?.data?.dataUrl) {
                    setBestPlayerImageUrl(res.data.dataUrl);
                  }
                }}
                currentLayout={layout}
                onApplyLayout={(newLayout) => setLayout((prev) => ({ ...prev, ...newLayout }))}
                onApplyBackground={(url) => setImageUrl(url)}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}