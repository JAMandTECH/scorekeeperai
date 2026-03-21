import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PosterEditor from '@/components/posters/PosterEditor';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Sparkles } from 'lucide-react';
import PosterCanvas from '@/components/posters/PosterCanvas';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import SocialShare from '@/components/social/SocialShare';

const DEFAULT_TEMPLATES = [
  // 9 Design Variants • Basketball
  { name: 'Angled Slashes', sport: 'basketball', sample_image_url: 'https://media.base44.com/images/public/690476f21c3624553ac82b4f/1ba9a86fc_Gemini_Generated_Image_av7wekav7wekav7w1.png', prompt: 'Modern basketball poster with angled slash panels and bold gold accents on charcoal background, clean negative space for typography, subtle grain and vignette, pro sports editorial look.' },
  { name: 'Editorial Block', sport: 'basketball', sample_image_url: 'https://media.base44.com/images/public/690476f21c3624553ac82b4f/1ba9a86fc_Gemini_Generated_Image_av7wekav7wekav7w1.png', prompt: 'Large stacked bold typography over a subtle court-lines texture, grayscale with high contrast, minimal decorative borders, magazine cover aesthetic.' },
  { name: 'Minimal Gradient Right', sport: 'basketball', sample_image_url: 'https://media.base44.com/images/public/690476f21c3624553ac82b4f/1ba9a86fc_Gemini_Generated_Image_av7wekav7wekav7w1.png', prompt: 'Dark-to-warm gradient background with minimalist top-right content area, elegant small stat pills, premium editorial vibe.' },
  { name: 'Court Blueprint', sport: 'basketball', sample_image_url: 'https://media.base44.com/images/public/690476f21c3624553ac82b4f/1ba9a86fc_Gemini_Generated_Image_av7wekav7wekav7w1.png', prompt: 'Schematic court blueprint lines on deep navy with golden stat panels, technical drawing feel, crisp lines and grid.' },
  { name: 'Radial Arc Meter', sport: 'basketball', sample_image_url: 'https://media.base44.com/images/public/690476f21c3624553ac82b4f/1ba9a86fc_Gemini_Generated_Image_av7wekav7wekav7w1.png', prompt: 'Radial arc of stat badges around a central spotlight on warm gradient, cinematic vignette, clean hero title area.' },
  { name: 'Split Gold Pane', sport: 'basketball', sample_image_url: 'https://media.base44.com/images/public/690476f21c3624553ac82b4f/1ba9a86fc_Gemini_Generated_Image_av7wekav7wekav7w1.png', prompt: 'Two-tone split background with rich gold and deep black, structured stat rows, sleek modern layout.' },
  { name: 'Arena Lights Schematic', sport: 'basketball', sample_image_url: 'https://media.base44.com/images/public/690476f21c3624553ac82b4f/1ba9a86fc_Gemini_Generated_Image_av7wekav7wekav7w1.png', prompt: 'Glowing arena lights over a court diagram with luminous edges, dramatic depth, energetic sports poster mood.' },
  { name: 'Retro Comic', sport: 'basketball', sample_image_url: 'https://media.base44.com/images/public/690476f21c3624553ac82b4f/1ba9a86fc_Gemini_Generated_Image_av7wekav7wekav7w1.png', prompt: 'Vintage comic-book layout with halftone texture, speech bubbles, bold outline panels, playful yet premium retro vibe.' },
  { name: 'Geometric Facets', sport: 'basketball', sample_image_url: 'https://media.base44.com/images/public/690476f21c3624553ac82b4f/1ba9a86fc_Gemini_Generated_Image_av7wekav7wekav7w1.png', prompt: 'Faceted polygonal background with red and gold medallions, luxe sports poster feel, high contrast and depth.' },

  // 9 Design Variants • Volleyball
  { name: 'Angled Slashes', sport: 'volleyball', sample_image_url: 'https://media.base44.com/images/public/690476f21c3624553ac82b4f/1ba9a86fc_Gemini_Generated_Image_av7wekav7wekav7w1.png', prompt: 'Modern volleyball poster with angled slash panels and bold gold accents on charcoal background, clean negative space for typography, subtle grain and vignette, pro sports editorial look.' },
  { name: 'Editorial Block', sport: 'volleyball', sample_image_url: 'https://media.base44.com/images/public/690476f21c3624553ac82b4f/1ba9a86fc_Gemini_Generated_Image_av7wekav7wekav7w1.png', prompt: 'Large stacked bold typography over a subtle court-lines texture (volleyball court hints), grayscale with high contrast, magazine cover aesthetic.' },
  { name: 'Minimal Gradient Right', sport: 'volleyball', sample_image_url: 'https://media.base44.com/images/public/690476f21c3624553ac82b4f/1ba9a86fc_Gemini_Generated_Image_av7wekav7wekav7w1.png', prompt: 'Dark-to-warm gradient background with minimalist top-right content area, elegant small stat pills, premium editorial vibe.' },
  { name: 'Court Blueprint', sport: 'volleyball', sample_image_url: 'https://media.base44.com/images/public/690476f21c3624553ac82b4f/1ba9a86fc_Gemini_Generated_Image_av7wekav7wekav7w1.png', prompt: 'Schematic volleyball court blueprint lines on deep navy with golden stat panels, technical drawing feel, crisp lines and grid.' },
  { name: 'Radial Arc Meter', sport: 'volleyball', sample_image_url: 'https://media.base44.com/images/public/690476f21c3624553ac82b4f/1ba9a86fc_Gemini_Generated_Image_av7wekav7wekav7w1.png', prompt: 'Radial arc of stat badges around a central spotlight on warm gradient, cinematic vignette, clean hero title area.' },
  { name: 'Split Gold Pane', sport: 'volleyball', sample_image_url: 'https://media.base44.com/images/public/690476f21c3624553ac82b4f/1ba9a86fc_Gemini_Generated_Image_av7wekav7wekav7w1.png', prompt: 'Two-tone split background with rich gold and deep black, structured stat rows, sleek modern layout.' },
  { name: 'Arena Lights Schematic', sport: 'volleyball', sample_image_url: 'https://media.base44.com/images/public/690476f21c3624553ac82b4f/1ba9a86fc_Gemini_Generated_Image_av7wekav7wekav7w1.png', prompt: 'Glowing arena lights over a volleyball court diagram with luminous edges, dramatic depth, energetic sports poster mood.' },
  { name: 'Retro Comic', sport: 'volleyball', sample_image_url: 'https://media.base44.com/images/public/690476f21c3624553ac82b4f/1ba9a86fc_Gemini_Generated_Image_av7wekav7wekav7w1.png', prompt: 'Vintage comic-book layout with halftone texture, speech bubbles, bold outline panels, playful yet premium retro vibe.' },
  { name: 'Geometric Facets', sport: 'volleyball', sample_image_url: 'https://media.base44.com/images/public/690476f21c3624553ac82b4f/1ba9a86fc_Gemini_Generated_Image_av7wekav7wekav7w1.png', prompt: 'Faceted polygonal background with red and gold medallions, luxe sports poster feel, high contrast and depth.' },
];

export default function PosterGenerator() {
  const qc = useQueryClient();
  const [user, setUser] = React.useState(null);
  const [sport, setSport] = React.useState('basketball');
  const [selectedGameId, setSelectedGameId] = React.useState('');
  const [selectedTemplateId, setSelectedTemplateId] = React.useState('');
  const [imageUrl, setImageUrl] = React.useState('');
  const [bestPlayerImageUrl, setBestPlayerImageUrl] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [layout, setLayout] = React.useState({});
  const [posterDataUrl, setPosterDataUrl] = React.useState('');

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
      let list = await base44.entities.PosterTemplate.filter({ sport });
      const desired = DEFAULT_TEMPLATES.filter(t => t.sport === sport).map(t => ({ ...t }));
      if (!list || list.length === 0) {
        if (desired.length) {
          await base44.entities.PosterTemplate.bulkCreate(desired);
          list = await base44.entities.PosterTemplate.filter({ sport });
        }
      } else {
        const existingNames = new Set((list || []).map(t => t.name));
        const missing = desired.filter(t => !existingNames.has(t.name));
        if (missing.length) {
          await base44.entities.PosterTemplate.bulkCreate(missing);
          list = await base44.entities.PosterTemplate.filter({ sport });
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
      const res = await base44.functions.invoke('getTopPlayersForGame', { gameId: selectedGameId, topN: 1 });
      return res.data;
    },
    enabled: !!user && !!selectedGameId,
    initialData: null,
  });

  const orgQ = useQuery({
    queryKey: ['orgForGame', topQ.data?.game?.organization_id],
    queryFn: async () => {
      const arr = await base44.entities.Organization.filter({ id: topQ.data.game.organization_id });
      return arr?.[0] || null;
    },
    enabled: !!user && !!topQ.data?.game?.organization_id,
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

      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <Button
          disabled={!selectedGameId || !selectedTemplateId || genMutation.isPending}
          onClick={() => genMutation.mutate({ gameId: selectedGameId, templateId: selectedTemplateId })}
        >
          {genMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Generate Background
        </Button>
        {imageUrl && (
          <>
            <a href={imageUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Download Background</Button>
            </a>
            <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary">Edit Poster</Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl">
                <DialogHeader>
                  <DialogTitle>Poster Editor</DialogTitle>
                </DialogHeader>
                <PosterEditor backgroundUrl={imageUrl} layout={layout} onChange={setLayout} />
                <DialogFooter>
                  <Button onClick={() => setEditorOpen(false)}>Done</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                    game={topQ.data.game}
                    players={topQ.data.topPlayers ? [topQ.data.topPlayers[0]] : []}
                    org={orgQ.data}
                    bestPlayerImageUrl={bestPlayerImageUrl || (topQ.data.topPlayers?.[0]?.photo_url || '')}
                    homeName={teamMap[topQ.data.game.home_team_id] || 'Home Team'}
                    awayName={teamMap[topQ.data.game.away_team_id] || 'Away Team'}
                    layout={layout}
                    onReady={setPosterDataUrl}
                  />
                  <div className="mt-4">
                    <SocialShare
                      imageUrl={posterDataUrl || imageUrl}
                      text={`${(teamMap[topQ.data.game.home_team_id] || 'Home')} vs ${(teamMap[topQ.data.game.away_team_id] || 'Away')} • Final ${(topQ.data.game.home_score ?? 0)}-${(topQ.data.game.away_score ?? 0)}`}
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
    </div>
  );
}