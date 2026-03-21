import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Sparkles } from 'lucide-react';
import PosterCanvas from '@/components/posters/PosterCanvas';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const DEFAULT_TEMPLATES = [
  // Basketball styles
  { name: 'Electric Court', sport: 'basketball', prompt: 'Vibrant basketball court abstract background with dynamic diagonal streaks, gritty texture, orange and deep navy accents, spotlight center glow, high-contrast shadows, pro sports poster mood.' },
  { name: 'Urban Gameday', sport: 'basketball', prompt: 'Graffiti-inspired urban sports poster background, dark asphalt texture, subtle hoop silhouette, neon rim lighting, orange & black palette, cinematic depth of field.' },
  { name: 'Steel & Fire', sport: 'basketball', prompt: 'Industrial steel textures with fiery orange embers, dramatic smoke, intense lighting, bold geometric shapes framing a central empty area for text overlay.' },
  { name: 'Minimal Court Lines', sport: 'basketball', prompt: 'Clean minimalist basketball court lines on textured paper, bold color blocks, modern editorial design, soft gradients, high-end magazine poster feel.' },
  { name: 'Neon Arena', sport: 'basketball', prompt: 'Futuristic neon arena glow, purple/blue gradients, rim light arcs, subtle bokeh particles, energetic composition with center negative space.' },
  // Volleyball styles
  { name: 'Beach Storm', sport: 'volleyball', prompt: 'Dramatic volleyball background with sandy texture, teal and gold palette, motion blur streaks like a spiked ball, ocean mist, cinematic sports poster look.' },
  { name: 'Net Shadows', sport: 'volleyball', prompt: 'High-contrast shadow of volleyball net across textured surface, bold geometric color panels, clean negative space, premium editorial aesthetic.' },
  { name: 'Aqua Voltage', sport: 'volleyball', prompt: 'Electric turquoise gradients with white energy arcs, subtle ball pattern texture, crisp highlights, dynamic composition for intense volleyball match.' },
  { name: 'Granite & Glow', sport: 'volleyball', prompt: 'Rugged granite texture with glowing cyan accents, foggy atmosphere, spotlight vignettes, center space reserved for text overlay.' },
  { name: 'Sunset Court', sport: 'volleyball', prompt: 'Warm sunset gradient with soft grain, volleyball court line hints, gentle light beams, modern sports social graphic background.' },
];

export default function PosterGenerator() {
  const qc = useQueryClient();
  const [user, setUser] = React.useState(null);
  const [sport, setSport] = React.useState('basketball');
  const [selectedGameId, setSelectedGameId] = React.useState('');
  const [selectedTemplateId, setSelectedTemplateId] = React.useState('');
  const [imageUrl, setImageUrl] = React.useState('');

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
      const list = await base44.entities.PosterTemplate.filter({ sport });
      // Seed defaults if none exist
      if (!list || list.length === 0) {
        const seeds = DEFAULT_TEMPLATES.filter(t => t.sport === sport).map(t => ({ ...t }));
        if (seeds.length) {
          await base44.entities.PosterTemplate.bulkCreate(seeds);
          return await base44.entities.PosterTemplate.filter({ sport });
        }
      }
      return list;
    },
    initialData: [],
    enabled: !!user,
  });

  const topQ = useQuery({
    queryKey: ['topPlayers', selectedGameId],
    queryFn: async () => {
      const res = await base44.functions.invoke('getTopPlayersForGame', { gameId: selectedGameId });
      return res.data;
    },
    enabled: !!user && !!selectedGameId,
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
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Templates</CardTitle>
          </CardHeader>
          <CardContent>
            {templatesQ.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading templates...</div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {templatesQ.data?.map(t => (
                  <button key={t.id} onClick={() => setSelectedTemplateId(t.id)} className={`border rounded-lg text-left overflow-hidden hover:shadow-md transition ${selectedTemplateId === t.id ? 'ring-2 ring-primary' : ''}`}>
                    <div className="aspect-video bg-muted flex items-center justify-center text-muted-foreground">
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
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button
          disabled={!selectedGameId || !selectedTemplateId || genMutation.isPending}
          onClick={() => genMutation.mutate({ gameId: selectedGameId, templateId: selectedTemplateId })}
        >
          {genMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Generate Poster
        </Button>
        {imageUrl && (
          <a href={imageUrl} target="_blank" rel="noreferrer">
            <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Download</Button>
          </a>
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
                <PosterCanvas backgroundUrl={imageUrl} game={topQ.data.game} players={topQ.data.topPlayers} />
              ) : (
                <p className="text-sm text-muted-foreground">Select a game to load best players.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}