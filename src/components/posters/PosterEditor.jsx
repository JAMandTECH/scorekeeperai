import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';

const W = 1080; const H = 1350;

const defaultLayout = {
  header: { y: 110, fontSize: 32, color: '#ffffff' },
  datePill: { x: 40, y: 132 },
  headshot: { cx: W/2, cy: 680, r: 130 },
  bestTitle: { y: 950, fontSize: 72, color: '#ffffff' },
  scoreRow: { y: 1030 },
  orgLogo: { x: W - 200 - 24, y: 24, w: 200, h: 64 },
  stats: { y: 520 },
  elements: [] // PowerPoint-like editable elements (text boxes etc.)
};

function uid() { return 'el_' + Math.random().toString(36).slice(2, 9); }

export default function PosterEditor({ backgroundUrl, layout, onChange }) {
  const stageRef = useRef(null);
  const [drag, setDrag] = useState(null); // {type: 'fixed'|'element', key, mode, dx, dy}
  const [selectedId, setSelectedId] = useState(null);
  const [showVGuide, setShowVGuide] = useState(false);
  const [showHGuide, setShowHGuide] = useState(false);
  const [cropMode, setCropMode] = useState(false);
  const [polyPoints, setPolyPoints] = useState([]);

  const L = useMemo(() => {
    const base = { ...defaultLayout, ...(layout || {}) };
    base.header = { ...defaultLayout.header, ...(layout?.header||{}) };
    base.datePill = { ...defaultLayout.datePill, ...(layout?.datePill||{}) };
    base.headshot = { ...defaultLayout.headshot, ...(layout?.headshot||{}) };
    base.bestTitle = { ...defaultLayout.bestTitle, ...(layout?.bestTitle||{}) };
    base.scoreRow = { ...defaultLayout.scoreRow, ...(layout?.scoreRow||{}) };
    base.orgLogo = { ...defaultLayout.orgLogo, ...(layout?.orgLogo||{}) };
    base.stats = { ...defaultLayout.stats, ...(layout?.stats||{}) };
    base.elements = Array.isArray(layout?.elements) ? layout.elements : [];
    return base;
  }, [layout]);

  const stage = { width: 540, height: Math.round(540 * (H/W)) }; // 50% scale
  const scale = stage.width / W;
  const centerX = W/2, centerY = H/2;

  const commit = (next) => onChange({ ...L, ...next });
  const setElements = (els) => commit({ elements: els });

  const addTextBox = () => {
    const el = {
      id: uid(), type: 'text', text: 'New Text',
      x: W/2, y: H/2,
      fontFamily: 'Inter, system-ui, Arial', fontSize: 40, color: '#ffffff', bold: false,
      align: 'center', rotation: 0, zIndex: (Math.max(-1, ...L.elements.map(e=>e.zIndex||0)) + 1),
      locked: false
    };
    setElements([...(L.elements||[]), el]);
    setSelectedId(el.id);
  };

  const startDragFixed = (key, mode) => (e) => {
    e.preventDefault();
    const rect = stageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    setDrag({ type: 'fixed', key, mode, startX: x, startY: y });
  };

  const startDragElement = (el, mode) => (e) => {
    if (el.locked) return;
    e.preventDefault(); e.stopPropagation();
    const rect = stageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    setSelectedId(el.id);
    setDrag({ type: 'element', key: el.id, mode, startX: x, startY: y, startEl: { ...el } });
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!drag) return;
      const rect = stageRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;

      if (drag.type === 'fixed') {
        const upd = { ...L };
        if (drag.key === 'orgLogo') {
          if (drag.mode === 'move') { upd.orgLogo.x = Math.max(0, Math.min(W - upd.orgLogo.w, x - upd.orgLogo.w/2)); upd.orgLogo.y = Math.max(0, Math.min(H - upd.orgLogo.h, y - 20)); }
          if (drag.mode === 'resize') { upd.orgLogo.w = Math.max(60, Math.min(W, x - upd.orgLogo.x)); upd.orgLogo.h = Math.max(40, Math.min(H, y - upd.orgLogo.y)); }
        }
        if (drag.key === 'headshot') {
          if (drag.mode === 'move') { upd.headshot.cx = Math.max(80, Math.min(W-80, x)); upd.headshot.cy = Math.max(80, Math.min(H-80, y)); }
          if (drag.mode === 'resize') { upd.headshot.r = Math.max(60, Math.min(240, Math.hypot(x - upd.headshot.cx, y - upd.headshot.cy))); }
        }
        if (drag.key === 'datePill') { upd.datePill.x = Math.max(0, x - 40); upd.datePill.y = Math.max(0, y - 10); }
        if (drag.key === 'header') { upd.header.y = Math.max(40, Math.min(H-40, y)); }
        if (drag.key === 'bestTitle') { upd.bestTitle.y = Math.max(200, Math.min(H-100, y)); }
        if (drag.key === 'stats') { upd.stats.y = Math.max(300, Math.min(H-300, y)); }
        if (drag.key === 'scoreRow') { upd.scoreRow.y = Math.max(600, Math.min(H-100, y)); }
        onChange(upd);
      } else if (drag.type === 'element') {
        const els = (L.elements||[]).map(e => ({...e}));
        const idx = els.findIndex(e => e.id === drag.key);
        if (idx >= 0) {
          const el = els[idx];
          if (drag.mode === 'move') {
            let nx = x, ny = y;
            // Snap to center lines within 10px
            const sx = Math.abs(nx - centerX) <= 10 ? centerX : nx;
            const sy = Math.abs(ny - centerY) <= 10 ? centerY : ny;
            setShowVGuide(Math.abs(nx - centerX) <= 10);
            setShowHGuide(Math.abs(ny - centerY) <= 10);
            el.x = sx; el.y = sy;
          }
          if (drag.mode === 'resize') {
            const dy = y - drag.startY;
            const base = drag.startEl.fontSize || 32;
            el.fontSize = Math.max(8, Math.min(200, Math.round(base + dy)));
          }
        }
        setElements(els);
      }
    };
    const onUp = () => { setDrag(null); setShowVGuide(false); setShowHGuide(false); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [drag, scale, L]);

  const selectedEl = useMemo(() => (L.elements||[]).find(e => e.id === selectedId) || null, [L.elements, selectedId]);

  // Layers operations
  const reorder = (id, dir) => {
    const els = [...(L.elements||[])];
    const i = els.findIndex(e => e.id === id);
    if (i < 0) return;
    if (dir === 'up' && i < els.length - 1) { [els[i], els[i+1]] = [els[i+1], els[i]]; }
    if (dir === 'down' && i > 0) { [els[i], els[i-1]] = [els[i-1], els[i]]; }
    setElements(els.map((e, idx) => ({...e, zIndex: idx})));
  };
  const toFront = (id) => {
    const els = [...(L.elements||[])];
    const i = els.findIndex(e => e.id === id);
    if (i < 0) return; const [it] = els.splice(i, 1); els.push(it);
    setElements(els.map((e, idx) => ({...e, zIndex: idx})));
  };
  const toBack = (id) => {
    const els = [...(L.elements||[])];
    const i = els.findIndex(e => e.id === id);
    if (i < 0) return; const [it] = els.splice(i, 1); els.unshift(it);
    setElements(els.map((e, idx) => ({...e, zIndex: idx})));
  };
  const toggleLock = (id) => setElements((L.elements||[]).map(e => e.id===id?{...e, locked:!e.locked}:e));
  const duplicate = (id) => {
    const els = [...(L.elements||[])];
    const i = els.findIndex(e => e.id === id);
    if (i < 0) return; const src = els[i];
    const copy = { ...src, id: uid(), x: (src.x||0)+20, y: (src.y||0)+20 };
    els.splice(i+1, 0, copy);
    setElements(els.map((e, idx) => ({...e, zIndex: idx})));
    setSelectedId(copy.id);
  };
  const removeEl = (id) => {
    const els = (L.elements||[]).filter(e => e.id !== id);
    setElements(els.map((e, idx) => ({...e, zIndex: idx})));
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <div className="flex gap-6">
      <div>
        <div className="mb-3 flex gap-2 flex-wrap">
          <Button size="sm" onClick={addTextBox}>Add Text</Button>
          <Button size="sm" variant="secondary" onClick={()=> onChange(defaultLayout)}>Reset</Button>
          <Button size="sm" variant="outline" disabled={!headshotImageUrl} onClick={async()=>{
            if(!headshotImageUrl) return;
            const res = await base44.functions.invoke('removeBg', { imageUrl: headshotImageUrl });
            const dataUrl = res?.data?.dataUrl;
            if (dataUrl) {
              onChange({ ...L, headshot: { ...L.headshot, processedImageUrl: dataUrl } });
            }
          }}>Remove BG</Button>
          <Button size="sm" variant={cropMode?'default':'outline'} onClick={()=>{ setCropMode(!cropMode); if(!cropMode){ setPolyPoints([]);} }}>
            {cropMode? 'Finish Crop' : 'Polygon Crop'}
          </Button>
          <Button size="sm" variant="outline" onClick={()=>{ setPolyPoints([]); onChange({ ...L, headshot: { ...L.headshot, polygon: [] } }); }}>Clear Crop</Button>
          {cropMode && polyPoints.length>=3 && (
            <Button size="sm" onClick={()=>{ onChange({ ...L, headshot: { ...L.headshot, polygon: polyPoints } }); setCropMode(false); }}>Apply Crop</Button>
          )}
        </div>
        <div
          ref={stageRef}
          className="relative border rounded-md overflow-hidden bg-black/5"
          style={{ width: stage.width, height: stage.height }}
          onMouseDown={()=> setSelectedId(null)}
          onClick={(e)=>{
            if(!cropMode) return;
            const rect = stageRef.current.getBoundingClientRect();
            const x = (e.clientX - rect.left) / scale;
            const y = (e.clientY - rect.top) / scale;
            setPolyPoints(prev=>[...prev, {x, y}]);
          }}
        >
          <img src={backgroundUrl} alt="bg" className="absolute inset-0 w-full h-full object-cover" />

          {/* Fixed handles (existing positions) */} 
          {/* Polygon overlay */}
          {cropMode && (
            <svg className="absolute inset-0" width={stage.width} height={stage.height} style={{pointerEvents:'none'}}>
              <polyline
                points={polyPoints.map(p=>`${p.x*scale},${p.y*scale}`).join(' ')}
                fill="rgba(0,0,0,0.15)"
                stroke="#22d3ee"
                strokeWidth="2"
              />
              {polyPoints.map((p,i)=> (
                <circle key={i} cx={p.x*scale} cy={p.y*scale} r="3" fill="#22d3ee" />
              ))}
            </svg>
          )}
          <div
            className="absolute bg-white/70 backdrop-blur-sm border border-white/60 text-xs text-slate-800 cursor-move"
            style={{ left: L.orgLogo.x * scale, top: L.orgLogo.y * scale, width: L.orgLogo.w * scale, height: L.orgLogo.h * scale }}
            onMouseDown={startDragFixed('orgLogo', 'move')}
          >
            <div className="p-2">Org Logo</div>
            <div className="absolute w-3 h-3 bg-slate-700 rounded-sm right-0 bottom-0 cursor-se-resize" onMouseDown={startDragFixed('orgLogo', 'resize')} style={{ transform: 'translate(-2px,-2px)' }} />
          </div>
          <div className="absolute px-3 py-1 bg-yellow-400 text-slate-900 text-xs rounded cursor-move"
            style={{ left: L.datePill.x * scale, top: L.datePill.y * scale }}
            onMouseDown={startDragFixed('datePill', 'move')}
          >
            DATE
          </div>
          <div className="absolute left-0 right-0 h-1 bg-white/30 cursor-ns-resize" style={{ top: L.header.y * scale }} onMouseDown={startDragFixed('header', 'move')} />
          <div className="absolute left-0 right-0 h-1 bg-white/50 cursor-ns-resize" style={{ top: L.bestTitle.y * scale }} onMouseDown={startDragFixed('bestTitle', 'move')} />
          <div className="absolute left-0 right-0 h-1 bg-green-400/40 cursor-ns-resize" style={{ top: L.stats.y * scale }} onMouseDown={startDragFixed('stats', 'move')} />
          <div className="absolute left-0 right-0 h-1 bg-blue-400/40 cursor-ns-resize" style={{ top: L.scoreRow.y * scale }} onMouseDown={startDragFixed('scoreRow', 'move')} />
          <div
            className="absolute rounded-full border-2 border-white/80 cursor-move"
            style={{ left: (L.headshot.cx - L.headshot.r) * scale, top: (L.headshot.cy - L.headshot.r) * scale, width: (L.headshot.r * 2) * scale, height: (L.headshot.r * 2) * scale }}
            onMouseDown={startDragFixed('headshot', 'move')}
          >
            <div className="absolute w-3 h-3 bg-slate-700 rounded-sm right-0 top-1/2 -translate-y-1/2 cursor-ew-resize" onMouseDown={startDragFixed('headshot', 'resize')} style={{ transform: 'translate(2px,-50%)' }} />
          </div>

          {/* Alignment guides */}
          {showVGuide && <div className="absolute top-0 bottom-0 w-px bg-pink-500/60" style={{ left: (centerX*scale) }} />}
          {showHGuide && <div className="absolute left-0 right-0 h-px bg-pink-500/60" style={{ top: (centerY*scale) }} />}

          {/* Editable text elements */}
          {(L.elements||[]).map((el) => (
            <div
              key={el.id}
              className={`absolute select-none ${selectedId===el.id?'ring-2 ring-primary':''}`}
              style={{
                left: 0, top: 0,
                transform: `translate(${(el.x||0)*scale}px, ${(el.y||0)*scale}px) rotate(${el.rotation||0}deg)`
              }}
              onMouseDown={(e)=>{ if (el.locked) return; e.stopPropagation(); setSelectedId(el.id); }}
            >
              <div
                className="cursor-move"
                onMouseDown={startDragElement(el, 'move')}
                style={{
                  color: el.color || '#fff',
                  fontWeight: el.bold ? 800 : 600,
                  fontSize: (el.fontSize||32) * scale,
                  fontFamily: el.fontFamily || 'Inter, system-ui, Arial',
                  textAlign: el.align || 'left',
                  whiteSpace: 'pre',
                }}
              >
                {el.text || 'Text'}
              </div>
              {!el.locked && selectedId===el.id && (
                <div
                  title="Resize (changes font size)"
                  className="absolute w-3 h-3 bg-slate-700 rounded-sm right-0 bottom-0 cursor-ns-resize"
                  style={{ transform: 'translate(6px,6px)' }}
                  onMouseDown={startDragElement(el, 'resize')}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="min-w-[280px] space-y-5">
        {/* Text toolbox */}
        <div>
          <div className="font-semibold mb-2">Text Toolbox</div>
          {selectedEl ? (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Text</Label>
                <textarea className="mt-1 w-full border rounded-md p-2 text-sm" rows={3} value={selectedEl.text||''}
                  onChange={(e)=> setElements((L.elements||[]).map(el=> el.id===selectedEl.id?{...el, text:e.target.value}:el))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Font Size</Label>
                  <Input type="number" value={selectedEl.fontSize||32}
                    onChange={(e)=> setElements((L.elements||[]).map(el=> el.id===selectedEl.id?{...el, fontSize: Number(e.target.value)||12}:el))} />
                </div>
                <div>
                  <Label className="text-xs">Color</Label>
                  <Input type="color" value={selectedEl.color||'#ffffff'}
                    onChange={(e)=> setElements((L.elements||[]).map(el=> el.id===selectedEl.id?{...el, color:e.target.value}:el))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Rotation (deg)</Label>
                  <Input type="number" value={selectedEl.rotation||0}
                    onChange={(e)=> setElements((L.elements||[]).map(el=> el.id===selectedEl.id?{...el, rotation: Number(e.target.value)||0}:el))} />
                </div>
                <div>
                  <Label className="text-xs">Align</Label>
                  <div className="mt-1 flex gap-1">
                    {['left','center','right'].map(a => (
                      <Button key={a} size="sm" variant={(selectedEl.align||'left')===a?'default':'outline'}
                        onClick={()=> setElements((L.elements||[]).map(el=> el.id===selectedEl.id?{...el, align:a}:el))}
                      >{a[0].toUpperCase()}</Button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Bold</Label>
                  <div className="mt-1"><Button size="sm" variant={selectedEl.bold?'default':'outline'} onClick={()=> setElements((L.elements||[]).map(el=> el.id===selectedEl.id?{...el, bold:!el.bold}:el))}>{selectedEl.bold?'On':'Off'}</Button></div>
                </div>
                <div>
                  <Label className="text-xs">Font Family</Label>
                  <Input value={selectedEl.fontFamily||'Inter, system-ui, Arial'} onChange={(e)=> setElements((L.elements||[]).map(el=> el.id===selectedEl.id?{...el, fontFamily:e.target.value}:el))} />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Select a text element to edit its properties.</p>
          )}
        </div>

        {/* Layers panel */}
        <div>
          <div className="font-semibold mb-2">Layers</div>
          <div className="space-y-1">
            {(L.elements||[]).map((el, idx) => (
              <div key={el.id} className={`flex items-center justify-between gap-2 p-2 rounded border ${selectedId===el.id?'bg-accent':'bg-card'}`}
                onClick={()=> setSelectedId(el.id)}
              >
                <div className="text-sm truncate">{el.type==='text'? (el.text||'Text') : el.type}</div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={(e)=>{e.stopPropagation(); reorder(el.id,'down');}}>↓</Button>
                  <Button size="sm" variant="ghost" onClick={(e)=>{e.stopPropagation(); reorder(el.id,'up');}}>↑</Button>
                  <Button size="sm" variant="ghost" onClick={(e)=>{e.stopPropagation(); toBack(el.id);}}>Back</Button>
                  <Button size="sm" variant="ghost" onClick={(e)=>{e.stopPropagation(); toFront(el.id);}}>Front</Button>
                  <Button size="sm" variant={el.locked?'default':'outline'} onClick={(e)=>{e.stopPropagation(); toggleLock(el.id);}}>{el.locked?'Unlock':'Lock'}</Button>
                  <Button size="sm" variant="outline" onClick={(e)=>{e.stopPropagation(); duplicate(el.id);}}>Dup</Button>
                  <Button size="sm" variant="destructive" onClick={(e)=>{e.stopPropagation(); removeEl(el.id);}}>Del</Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fixed controls (legacy) */}
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Header Font Size</Label>
            <Input type="number" value={L.header.fontSize} onChange={(e)=> commit({ header: { ...L.header, fontSize: Number(e.target.value)||12 }})} />
          </div>
          <div>
            <Label className="text-xs">Header Color</Label>
            <Input type="color" value={L.header.color} onChange={(e)=> commit({ header: { ...L.header, color: e.target.value }})} />
          </div>
          <div>
            <Label className="text-xs">Best Title Size</Label>
            <Input type="number" value={L.bestTitle.fontSize} onChange={(e)=> commit({ bestTitle: { ...L.bestTitle, fontSize: Number(e.target.value)||24 }})} />
          </div>
          <div>
            <Label className="text-xs">Best Title Color</Label>
            <Input type="color" value={L.bestTitle.color} onChange={(e)=> commit({ bestTitle: { ...L.bestTitle, color: e.target.value }})} />
          </div>
          <div>
            <Label className="text-xs">Stats Row Y</Label>
            <Input type="number" value={L.stats.y} onChange={(e)=> commit({ stats: { ...L.stats, y: Number(e.target.value)||520 }})} />
          </div>
          <div>
            <Label className="text-xs">Score Row Y</Label>
            <Input type="number" value={L.scoreRow.y} onChange={(e)=> commit({ scoreRow: { ...L.scoreRow, y: Number(e.target.value)||1030 }})} />
          </div>
        </div>
      </div>
    </div>
  );
}