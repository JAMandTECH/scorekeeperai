import React, { useEffect, useRef, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, Upload } from 'lucide-react';
import { buildSmartLayout } from './smartLayout';

// Canvas coordinate space (matches PosterCanvas spotlight renderer)
const CW = 1080;
const CH = 1350;

// Core repositionable elements. Each maps to a smartLayout metadata key.
// All elements are horizontally centered by the renderer, so the editor
// controls vertical position (plus size for logo/headshot).
const DEFAULT_META = buildSmartLayout({ sport: 'basketball', meta: {} });

const ZONE_DEFS = [
  { key: 'orgLogo', label: 'Org Logo', kind: 'box' },
  { key: 'header', label: 'Game Header', kind: 'band' },
  { key: 'datePill', label: 'Date', kind: 'band' },
  { key: 'stats', label: 'Stats', kind: 'band' },
  { key: 'headshot', label: 'Player Headshot', kind: 'circle' },
  { key: 'nameLabel', label: 'Player Name', kind: 'band' },
  { key: 'bestTitle', label: 'Best Player Title', kind: 'band' },
  { key: 'scoreRow', label: 'Final Score', kind: 'band' },
];

function getY(meta, key) {
  switch (key) {
    case 'orgLogo': return meta?.orgLogo?.y ?? DEFAULT_META.orgLogo.y;
    case 'header': return meta?.header?.y ?? DEFAULT_META.header.y;
    case 'datePill': return meta?.datePill?.y ?? DEFAULT_META.datePill.y;
    case 'stats': return meta?.stats?.y ?? DEFAULT_META.stats.y;
    case 'headshot': return meta?.headshot?.cy ?? DEFAULT_META.headshot.cy;
    case 'nameLabel': return meta?.nameLabel?.y ?? (DEFAULT_META.bestTitle.y - 70);
    case 'bestTitle': return meta?.bestTitle?.y ?? DEFAULT_META.bestTitle.y;
    case 'scoreRow': return meta?.scoreRow?.y ?? DEFAULT_META.scoreRow.y;
    default: return 0;
  }
}

export default function StyleLayoutEditor({ template, open, onOpenChange, onSaved }) {
  const [meta, setMeta] = useState({});
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [bgUrl, setBgUrl] = useState('');
  const [bgFile, setBgFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [scale, setScale] = useState(0.4);
  const [drag, setDrag] = useState(null); // { key, startY, origY, resizing }
  const previewRef = useRef(null);

  // Initialize from template
  useEffect(() => {
    if (!open || !template) return;
    setMeta(template.metadata ? JSON.parse(JSON.stringify(template.metadata)) : {});
    setName(template.name || '');
    setDescription(template.description || '');
    setBgUrl(template.sample_image_url || '');
    setBgFile(null);
    setImgLoaded(false);
  }, [open, template]);

  // Compute scale to fit preview height
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const update = () => {
      const h = el.clientHeight;
      if (h > 0) setScale(Math.min(1, h / CH));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  const onPointerMove = useCallback((e) => {
    if (!drag) return;
    const dy = e.clientY - drag.startY;
    let ny = drag.origY + dy / scale;
    // Snap to other zones' y
    const others = ZONE_DEFS.filter(z => z.key !== drag.key).map(z => getY(meta, z.key));
    for (const oy of others) {
      if (Math.abs(ny - oy) < 12) { ny = oy; break; }
    }
    ny = Math.max(20, Math.min(CH - 20, ny));
    setMeta(prev => {
      const next = { ...prev };
      if (drag.key === 'orgLogo') {
        next.orgLogo = { ...(next.orgLogo || {}), y: Math.round(ny) };
      } else if (drag.key === 'headshot') {
        if (drag.resizing) {
          const r = Math.max(60, Math.min(260, Math.round(drag.origR + dy / scale)));
          next.headshot = { ...(next.headshot || {}), r };
        } else {
          next.headshot = { ...(next.headshot || {}), cy: Math.round(ny) };
        }
      } else {
        next[drag.key] = { ...(next[drag.key] || {}), y: Math.round(ny) };
      }
      return next;
    });
  }, [drag, meta, scale]);

  const onPointerUp = useCallback(() => {
    setDrag(null);
  }, []);

  useEffect(() => {
    if (!drag) return;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [drag, onPointerMove, onPointerUp]);

  if (!open || !template) return null;

  const startDrag = (e, key, resizing = false) => {
    e.preventDefault();
    e.stopPropagation();
    const y = getY(meta, key);
    const origR = meta?.headshot?.r ?? DEFAULT_META.headshot.r;
    setDrag({ key, startY: e.clientY, origY: y, origR, resizing });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let finalBg = bgUrl;
      if (bgFile) {
        setUploading(true);
        const { file_url } = await base44.integrations.Core.UploadFile({ file: bgFile });
        finalBg = file_url;
        setUploading(false);
      }
      const updates = {
        name,
        description: description || undefined,
        sample_image_url: finalBg,
        metadata: meta,
      };
      await base44.entities.PosterTemplate.update(template.id, updates);
      onSaved && onSaved({ id: template.id, sample_image_url: finalBg, metadata: meta });
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to save style', err);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="bg-card border rounded-lg w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="text-lg font-heading font-bold">Edit Style — {template.name}</h2>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
        </div>

        <Tabs defaultValue="layout" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 pt-3">
            <TabsList>
              <TabsTrigger value="layout">Visual Layout</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="layout" className="flex-1 overflow-hidden m-0 p-0">
            <div className="h-full grid md:grid-cols-[1fr_280px] overflow-hidden">
              {/* Preview / drag area */}
              <div ref={previewRef} className="relative h-[60vh] md:h-full flex items-center justify-center bg-muted/40 overflow-hidden p-4">
                {bgUrl ? (
                  <div className="relative" style={{ width: CW * scale, height: CH * scale }}>
                    <img
                      src={bgUrl}
                      alt="Background preview"
                      onLoad={() => setImgLoaded(true)}
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      draggable={false}
                    />
                    {/* center snap guide */}
                    <div className="absolute left-0 right-0 border-t border-dashed border-primary/30 pointer-events-none" style={{ top: '50%' }} />
                    {ZONE_DEFS.map(z => {
                      const y = getY(meta, z.key);
                      const top = y * scale;
                      if (z.kind === 'circle') {
                        const r = (meta?.headshot?.r ?? DEFAULT_META.headshot.r) * scale;
                        return (
                          <div
                            key={z.key}
                            className="absolute rounded-full border-2 border-primary bg-primary/10 cursor-ns-resize touch-none select-none"
                            style={{
                              left: `calc(50% - ${r}px)`,
                              top: top - r,
                              width: r * 2,
                              height: r * 2,
                            }}
                            onPointerDown={(e) => startDrag(e, z.key)}
                          >
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-medium bg-primary text-primary-foreground px-1.5 rounded whitespace-nowrap">{z.label}</span>
                            <div
                              className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary rounded-full cursor-nwse-resize border border-white"
                              onPointerDown={(e) => startDrag(e, z.key, true)}
                            />
                          </div>
                        );
                      }
                      if (z.kind === 'box') {
                        const w = (meta?.orgLogo?.w ?? DEFAULT_META.orgLogo.w) * scale;
                        const h = (meta?.orgLogo?.h ?? DEFAULT_META.orgLogo.h) * scale;
                        return (
                          <div
                            key={z.key}
                            className="absolute border-2 border-primary bg-primary/10 cursor-ns-resize touch-none select-none rounded"
                            style={{
                              left: `calc(50% - ${w / 2}px)`,
                              top,
                              width: w,
                              height: h,
                            }}
                            onPointerDown={(e) => startDrag(e, z.key)}
                          >
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-medium bg-primary text-primary-foreground px-1.5 rounded whitespace-nowrap">{z.label}</span>
                          </div>
                        );
                      }
                      // band
                      return (
                        <div
                          key={z.key}
                          className="absolute left-0 right-0 h-8 -mt-4 border border-dashed border-primary/70 bg-primary/5 cursor-ns-resize touch-none select-none flex items-center justify-center"
                          style={{ top }}
                          onPointerDown={(e) => startDrag(e, z.key)}
                        >
                          <span className="text-[10px] font-medium text-primary">{z.label}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Upload a background in the Metadata tab first.</p>
                )}
              </div>

              {/* Side panel: position readout + tips */}
              <div className="border-l overflow-y-auto p-4 space-y-3 bg-card">
                <p className="text-sm font-medium">Element Positions</p>
                <p className="text-xs text-muted-foreground">Drag zones vertically on the preview. Elements stay horizontally centered. Snap aligns to other elements.</p>
                {ZONE_DEFS.map(z => (
                  <div key={z.key} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{z.label}</span>
                    <span className="tabular-nums font-medium">{Math.round(getY(meta, z.key))}px</span>
                  </div>
                ))}
                {drag?.key === 'headshot' && (
                  <div className="flex items-center justify-between text-xs pt-2 border-t">
                    <span className="text-muted-foreground">Headshot radius</span>
                    <span className="tabular-nums font-medium">{Math.round(meta?.headshot?.r ?? DEFAULT_META.headshot.r)}px</span>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="metadata" className="flex-1 overflow-y-auto m-0 p-5 space-y-4">
            <div>
              <Label>Name</Label>
              <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input className="mt-1" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <Label>Background Image</Label>
              <div className="mt-1 flex items-center gap-3">
                {bgUrl && <img src={bgUrl} alt="Background" className="w-20 h-20 rounded border object-cover" />}
                <Input type="file" accept="image/*" onChange={(e) => setBgFile(e.target.files?.[0] || null)} />
                {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Upload a new image to replace the background.</p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t bg-card">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || uploading || !name} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Style
          </Button>
        </div>
      </div>
    </div>
  );
}