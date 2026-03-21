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

export default function PosterEditor({ backgroundUrl, layout, onChange, headshotImageUrl, orgLogoUrl, headerText, dateStr, playerName, stats, homeName, awayName, homeScore, awayScore }) {
  const stageRef = useRef(null);
  const [drag, setDrag] = useState(null); // {type: 'fixed'|'element'|'pan', ...}
  // selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [showVGuide, setShowVGuide] = useState(false);
  const [showHGuide, setShowHGuide] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [originalValue, setOriginalValue] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  // zoom/pan/grid/guides
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [gridVisible, setGridVisible] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  const [vGuides, setVGuides] = useState([]);
  const [hGuides, setHGuides] = useState([]);
  // crop
  const [cropMode, setCropMode] = useState(false);
  const [polyPoints, setPolyPoints] = useState([]);
  // history for undo/redo
  const historyRef = useRef([]);
  const historyIdxRef = useRef(-1);

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

  const stage = { width: Math.round(540 * zoom), height: Math.round((540 * zoom) * (H/W)) };
  const scale = stage.width / W;
  const centerX = W/2, centerY = H/2;

  // derived sizes for logo to help drag bounds
  const logoW = (L.orgLogo?.w||200); const logoH = (L.orgLogo?.h||64);

  const s = stats || {};
  const playerDisplayName = (playerName && String(playerName).trim()) || [s.first_name, s.last_name].filter(Boolean).join(' ').trim();
  const O = L.overrides || {};
  const effectiveHeaderText = O.headerText ?? headerText;
  const effectiveDateStr = O.dateStr ?? dateStr;
  const effectivePlayerName = O.playerName ?? (playerDisplayName ? String(playerDisplayName).toUpperCase() : '');
  const effectiveScoreLine = O.scoreLine ?? `${(homeName || 'HOME')} ${(homeScore ?? '0')} - ${(awayScore ?? '0')} ${(awayName || 'AWAY')}`;

  const commit = (next) => {
    const merged = { ...L, ...next };
    onChange(merged);
    try {
      const snapshot = JSON.parse(JSON.stringify(merged));
      const upto = historyRef.current.slice(0, historyIdxRef.current + 1);
      upto.push(snapshot);
      if (upto.length > 50) upto.shift();
      historyRef.current = upto;
      historyIdxRef.current = upto.length - 1;
    } catch (_) {}
  };
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
    setSelectedIds([el.id]);
  };

  const startDragFixed = (key, mode) => (e) => { if (editingId || editingField) return;
    e.preventDefault();
    const rect = stageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale + pan.x;
    const y = (e.clientY - rect.top) / scale + pan.y;
    setDrag({ type: 'fixed', key, mode, startX: x, startY: y });
  };

  const startDragElement = (el, mode) => (e) => { if (editingId || editingField) return;
    if (el.locked) return;
    e.preventDefault(); e.stopPropagation();
    const rect = stageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale + pan.x;
    const y = (e.clientY - rect.top) / scale + pan.y;
    const ids = (selectedIds.includes(el.id) ? selectedIds : [el.id]);
    const starts = {};
    (L.elements||[]).forEach(it => { if (ids.includes(it.id)) starts[it.id] = { x: it.x||0, y: it.y||0, fontSize: it.fontSize||32 }; });
    setDrag({ type: 'element', keys: ids, mode, startX: x, startY: y, starts });
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!drag) return;
      const rect = stageRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale + pan.x;
      const y = (e.clientY - rect.top) / scale + pan.y;

      const snapAxis = (val, axis) => {
        let r = val;
        if (snapToGrid) r = Math.round(r / gridSize) * gridSize;
        const guides = axis === 'x' ? vGuides : hGuides;
        for (const g of guides) { if (Math.abs(r - g) <= 6) { r = g; break; } }
        return r;
      };

      if (drag.type === 'pan') {
        const dx = (e.clientX - drag.startX) / scale;
        const dy = (e.clientY - drag.startY) / scale;
        setPan({ x: drag.panStart.x - dx, y: drag.panStart.y - dy });
        return;
      }

      if (drag.type === 'fixed') {
        const upd = { ...L };
        if (drag.key === 'orgLogo') {
          if (drag.mode === 'move') { upd.orgLogo.x = Math.max(0, Math.min(W - upd.orgLogo.w, snapAxis(x - upd.orgLogo.w/2, 'x'))); upd.orgLogo.y = Math.max(0, Math.min(H - upd.orgLogo.h, snapAxis(y - 20, 'y'))); }
          if (drag.mode === 'resize') { upd.orgLogo.w = Math.max(60, Math.min(W, snapAxis(x - upd.orgLogo.x, 'x'))); upd.orgLogo.h = Math.max(40, Math.min(H, snapAxis(y - upd.orgLogo.y, 'y'))); }
        }
        if (drag.key === 'headshot') {
          if (drag.mode === 'move') { upd.headshot.cx = Math.max(80, Math.min(W-80, snapAxis(x,'x'))); upd.headshot.cy = Math.max(80, Math.min(H-80, snapAxis(y,'y'))); }
          if (drag.mode === 'resize') { upd.headshot.r = Math.max(60, Math.min(240, Math.hypot(x - upd.headshot.cx, y - upd.headshot.cy))); }
        }
        if (drag.key === 'datePill') { upd.datePill.x = Math.max(0, snapAxis(x - 40,'x')); upd.datePill.y = Math.max(0, snapAxis(y - 10,'y')); }
        if (drag.key === 'header') { const ny = Math.max(40, Math.min(H-40, snapAxis(y,'y'))); upd.header.y = ny; setShowHGuide(Math.abs(ny - centerY) <= 10); }
        if (drag.key === 'bestTitle') { upd.bestTitle.y = Math.max(200, Math.min(H-100, snapAxis(y,'y'))); }
        if (drag.key === 'stats') { upd.stats.y = Math.max(300, Math.min(H-300, snapAxis(y,'y'))); }
        if (drag.key === 'scoreRow') { upd.scoreRow.y = Math.max(600, Math.min(H-100, snapAxis(y,'y'))); }
        commit(upd);
      } else if (drag.type === 'element') {
        const els = (L.elements||[]).map(e => ({...e}));
        const keys = drag.keys || [];
        if (drag.mode === 'move') {
          const dx = x - drag.startX; const dy = y - drag.startY;
          let vSnap = false, hSnap = false;
          els.forEach(e => {
            if (!keys.includes(e.id)) return;
            let nx = (drag.starts[e.id]?.x || 0) + dx;
            let ny = (drag.starts[e.id]?.y || 0) + dy;
            if (Math.abs(nx - centerX) <= 10) { nx = centerX; vSnap = true; }
            if (Math.abs(ny - centerY) <= 10) { ny = centerY; hSnap = true; }
            nx = snapAxis(nx,'x'); ny = snapAxis(ny,'y');
            e.x = nx; e.y = ny;
          });
          setShowVGuide(vSnap); setShowHGuide(hSnap);
        }
        if (drag.mode === 'resize') {
          const dy = y - drag.startY;
          els.forEach(e => {
            if (!keys.includes(e.id)) return;
            const base = drag.starts[e.id]?.fontSize || 32;
            e.fontSize = Math.max(8, Math.min(200, Math.round(base + dy)));
          });
        }
        setElements(els);
      }
    };
    const onUp = () => { setDrag(null); setShowVGuide(false); setShowHGuide(false); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [drag, scale, L, pan, snapToGrid, gridSize, vGuides, hGuides]);

  const selectedEl = useMemo(() => {
    const ids = selectedIds || [];
    if (ids.length !== 1) return null;
    return (L.elements||[]).find(e => e.id === ids[0]) || null;
  }, [L.elements, selectedIds]);

  // preload images to avoid flicker
  useEffect(()=>{ if (headshotImageUrl) { const i=new Image(); i.src=headshotImageUrl; } if (orgLogoUrl) { const i2=new Image(); i2.src=orgLogoUrl; } }, [headshotImageUrl, orgLogoUrl]);
  // init history once
  useEffect(()=>{ try { const snap = JSON.parse(JSON.stringify(L)); historyRef.current=[snap]; historyIdxRef.current=0; } catch(_){} }, []);
  // keyboard shortcuts
  useEffect(()=>{
    const onKey = (e) => { const ae = document.activeElement; if (ae && ((ae.tagName==='INPUT')||(ae.tagName==='TEXTAREA')||ae.isContentEditable)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (historyIdxRef.current < historyRef.current.length - 1) {
            historyIdxRef.current += 1;
            onChange(historyRef.current[historyIdxRef.current]);
          }
        } else {
          if (historyIdxRef.current > 0) {
            historyIdxRef.current -= 1;
            onChange(historyRef.current[historyIdxRef.current]);
          }
        }
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length) {
        e.preventDefault();
        const els = (L.elements||[]).filter(x => !selectedIds.includes(x.id));
        commit({ elements: els });
        setSelectedIds([]);
        return;
      }
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key) && selectedIds.length) {
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        const els = (L.elements||[]).map(el => selectedIds.includes(el.id) ? { ...el, x: el.x + (e.key==='ArrowRight'?d:(e.key==='ArrowLeft'?-d:0)), y: el.y + (e.key==='ArrowDown'?d:(e.key==='ArrowUp'?-d:0)) } : el);
        commit({ elements: els });
      }
    };
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  }, [L, selectedIds]);

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
  const alignSelected = (mode) => {
    const ids = selectedIds;
    if (!ids || ids.length < 2) return;
    const els = [...(L.elements||[])];
    const picks = els.filter(e => ids.includes(e.id));
    const xs = picks.map(e=>e.x||0), ys = picks.map(e=>e.y||0);
    const minX = Math.min(...xs), maxX = Math.max(...xs), midX = (minX+maxX)/2;
    const minY = Math.min(...ys), maxY = Math.max(...ys), midY = (minY+maxY)/2;
    picks.forEach(e => {
      if (mode==='left') e.x = minX;
      if (mode==='right') e.x = maxX;
      if (mode==='hcenter') e.x = midX;
      if (mode==='top') e.y = minY;
      if (mode==='bottom') e.y = maxY;
      if (mode==='vcenter') e.y = midY;
    });
    commit({ elements: els });
  };
  const distributeSelected = (axis) => {
    const ids = selectedIds;
    if (!ids || ids.length < 3) return;
    const els = [...(L.elements||[])];
    const picks = els.filter(e => ids.includes(e.id)).sort((a,b)=> (axis==='h' ? (a.x||0)-(b.x||0) : (a.y||0)-(b.y||0)));
    const first = picks[0], last = picks[picks.length-1];
    const start = axis==='h' ? (first.x||0) : (first.y||0);
    const end = axis==='h' ? (last.x||0) : (last.y||0);
    const gap = (end - start) / (picks.length - 1);
    picks.forEach((e, i) => { if (axis==='h') e.x = start + gap * i; else e.y = start + gap * i; });
    commit({ elements: els });
  };
  const toggleLock = (id) => setElements((L.elements||[]).map(e => e.id===id?{...e, locked:!e.locked}:e));
  const duplicate = (id) => {
    const els = [...(L.elements||[])];
    const i = els.findIndex(e => e.id === id);
    if (i < 0) return; const src = els[i];
    const copy = { ...src, id: uid(), x: (src.x||0)+20, y: (src.y||0)+20 };
    els.splice(i+1, 0, copy);
    setElements(els.map((e, idx) => ({...e, zIndex: idx})));
    setSelectedIds([copy.id]);
  };
  const removeEl = (id) => {
    const els = (L.elements||[]).filter(e => e.id !== id);
    setElements(els.map((e, idx) => ({...e, zIndex: idx})));
    setSelectedIds(prev => prev.filter(x => x !== id));
  };
  const saveEditingField = () => {
    let overrides = { ...(L.overrides||{}) };
    if (editingField === 'headerText') overrides.headerText = editingValue;
    else if (editingField === 'dateStr') overrides.dateStr = editingValue;
    else if (editingField === 'playerName') overrides.playerName = editingValue;
    else if (editingField === 'scoreLine') overrides.scoreLine = editingValue;
    else if (editingField && editingField.startsWith('stat_')) {
      const key = editingField.split('_')[1];
      overrides.stats = { ...(overrides.stats||{}), [key]: editingValue };
    }
    commit({ overrides });
    setEditingField(null);
    setShowConfirm(false);
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
          {/* Grid/Snap & Zoom */}
          <Button size="sm" variant={gridVisible?'default':'outline'} onClick={()=>setGridVisible(!gridVisible)}>Grid</Button>
          <Button size="sm" variant={snapToGrid?'default':'outline'} onClick={()=>setSnapToGrid(!snapToGrid)}>Snap</Button>
          <div className="inline-flex gap-1">
            <Button size="sm" onClick={()=>setZoom(z=>Math.max(0.5, z-0.1))}>-</Button>
            <Button size="sm" onClick={()=>setZoom(1)}>100%</Button>
            <Button size="sm" onClick={()=>setZoom(z=>Math.min(3, z+0.1))}>+</Button>
          </div>
        </div>
        <div
          ref={stageRef}
          className="relative border rounded-md overflow-hidden bg-black/5"
          style={{ width: stage.width, height: stage.height, cursor: drag?.type==='pan' ? 'grabbing' : 'default' }}
          onContextMenu={(e)=> e.preventDefault()}
          onWheel={(e)=>{ if (e.ctrlKey){ e.preventDefault(); const rect = stageRef.current.getBoundingClientRect(); const mx = (e.clientX - rect.left)/scale + pan.x; const my = (e.clientY - rect.top)/scale + pan.y; const next = Math.min(3, Math.max(0.5, zoom + (e.deltaY<0?0.1:-0.1))); const k = next/zoom; setZoom(next); setPan(p => ({ x: mx - (mx - p.x)*k, y: my - (my - p.y)*k })); } }}
          onMouseDown={(e)=>{ if (e.button!==0){ setDrag({ type:'pan', startX:e.clientX, startY:e.clientY, panStart:{...pan} }); return; } if (editingId || editingField) { if (!(e.target && ((e.target.tagName==='TEXTAREA')||(e.target.tagName==='INPUT')))) { setShowConfirm(true); } } else { setSelectedIds([]); } }}
          onClick={(e)=>{
            if(!cropMode) return;
            const rect = stageRef.current.getBoundingClientRect();
            const x = (e.clientX - rect.left) / scale + pan.x;
            const y = (e.clientY - rect.top) / scale + pan.y;
            setPolyPoints(prev=>[...prev, {x, y}]);
          }}
>
          {/* Rulers */}
          <div className="absolute left-0 top-0 h-5 w-full bg-slate-100/80 border-b border-slate-200 text-[10px] select-none z-20" onMouseDown={(e)=>{ const rect = e.currentTarget.getBoundingClientRect(); const x = (e.clientX - rect.left)/scale + pan.x; setVGuides(g=>[...g, Math.round(x)]); }} />
          <div className="absolute left-0 top-0 w-5 h-full bg-slate-100/80 border-r border-slate-200 text-[10px] select-none z-20" onMouseDown={(e)=>{ const rect = e.currentTarget.getBoundingClientRect(); const y = (e.clientY - rect.top)/scale + pan.y; setHGuides(g=>[...g, Math.round(y)]); }} />

          {/* Inner movable/zoomed canvas */}
          <div className="absolute inset-0" style={{ transform: `translate(${-pan.x*scale}px, ${-pan.y*scale}px)` }}>
            <img src={backgroundUrl} alt="bg" className="absolute inset-0 w-full h-full object-cover" />
            {gridVisible && (
              <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0, rgba(255,255,255,0.08) 1px, transparent 1px, transparent ${gridSize*scale}px), repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0, rgba(255,255,255,0.08) 1px, transparent 1px, transparent ${gridSize*scale}px)` }} />
            )}
            {vGuides.map((gx,i)=>(<div key={`vg${i}`} className="absolute top-0 bottom-0 w-px bg-sky-400/70" style={{ left: gx*scale }} />))}
            {hGuides.map((gy,i)=>(<div key={`hg${i}`} className="absolute left-0 right-0 h-px bg-sky-400/70" style={{ top: gy*scale }} />))}

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
            <div className="p-1 w-full h-full flex items-center justify-center select-none pointer-events-none">
              {orgLogoUrl ? (
                <img src={orgLogoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-[10px] text-slate-600">Org Logo</span>
              )}
            </div>
            <div title="Drag to resize" className="absolute w-4 h-4 bg-emerald-500 border-2 border-white rounded-sm right-0 bottom-0 cursor-se-resize z-10" onMouseDown={startDragFixed('orgLogo', 'resize')} style={{ transform: 'translate(-2px,-2px)' }} />
          </div>
          <div className="absolute px-3 py-1 bg-yellow-400 text-slate-900 text-xs rounded cursor-move"
            style={{ left: L.datePill.x * scale, top: L.datePill.y * scale }}
            onMouseDown={startDragFixed('datePill', 'move')}
>\n            {dateStr || 'DATE'}\n          </div>
          <div className="absolute left-0 right-0 h-1 bg-white/30 cursor-ns-resize" style={{ top: L.header.y * scale }} onMouseDown={startDragFixed('header', 'move')} />
          {effectiveHeaderText !== undefined && effectiveHeaderText !== null && (
            <div className="absolute w-full text-center select-none pointer-events-auto" style={{ top: (L.header.y * scale) - ((L.header.fontSize||32)*scale/1.8) }}>
              {editingField==='headerText' ? (
                <textarea
                  autoFocus
                  className="bg-white/90 text-slate-900 rounded px-1 py-0.5"
                  value={editingValue}
                  onChange={(e)=> setEditingValue(e.target.value)}
                  onKeyDown={(e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); saveEditingField(); } if(e.key==='Escape'){ e.preventDefault(); setEditingField(null); } }}
                  onBlur={()=> setShowConfirm(true)}
                  style={{ fontSize: (L.header.fontSize||32)*scale, fontFamily: 'Inter, system-ui, Arial', lineHeight: 1.1 }} rows={1}
                />
              ) : (
                <span className="font-extrabold text-white" style={{ fontSize: (L.header.fontSize||32)*scale }} onDoubleClick={(e)=>{ e.stopPropagation(); setEditingField('headerText'); setOriginalValue(String(effectiveHeaderText||'')); setEditingValue(String(effectiveHeaderText||'')); setShowConfirm(false); }}>{effectiveHeaderText}</span>
              )}
            </div>
          )}
          <div className="absolute left-0 right-0 h-1 bg-white/50 cursor-ns-resize" style={{ top: L.bestTitle.y * scale }} onMouseDown={startDragFixed('bestTitle', 'move')} />
          <div className="absolute w-full text-center pointer-events-none select-none" style={{ top: (L.bestTitle.y * scale) - ((L.bestTitle.fontSize||72)*scale/2) }}>
            <span className="font-black text-white" style={{ fontSize: (L.bestTitle.fontSize||72)*scale }}>BEST PLAYER</span>
          </div>
          {effectivePlayerName && (
            <div className="absolute w-full text-center pointer-events-auto select-none" style={{ top: (L.bestTitle.y * scale) + 20 }}>
              {editingField==='playerName' ? (
                <textarea autoFocus className="bg-white/90 text-slate-900 rounded px-1 py-0.5"
                  value={editingValue}
                  onChange={(e)=> setEditingValue(e.target.value)}
                  onKeyDown={(e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); saveEditingField(); } if(e.key==='Escape'){ e.preventDefault(); setEditingField(null);} }}
                  onBlur={()=> setShowConfirm(true)}
                  style={{ fontSize: 24*scale, lineHeight: 1.1 }} rows={1}
                />
              ) : (
                <span className="font-extrabold text-white tracking-wide" style={{ fontSize: 24*scale }} onDoubleClick={(e)=>{ e.stopPropagation(); setEditingField('playerName'); setOriginalValue(String(effectivePlayerName||'')); setEditingValue(String(effectivePlayerName||'')); setShowConfirm(false); }}>{effectivePlayerName}</span>
              )}
            </div>
          )}
          <div className="absolute left-0 right-0 h-1 bg-green-400/40 cursor-ns-resize" style={{ top: L.stats.y * scale }} onMouseDown={startDragFixed('stats', 'move')} />
          <div className="absolute w-full flex items-center justify-center gap-3 select-none pointer-events-auto" style={{ top: (L.stats.y * scale) - 18 }}>
            {['PTS','REB','AST','BLK'].map((k)=>{
              const map = { PTS: s.points ?? s.pts, REB: s.rebounds, AST: s.assists, BLK: s.blocks };
              const current = (O.stats && O.stats[k] !== undefined) ? O.stats[k] : map[k];
              return (
                <div key={k} className="px-2 py-0.5 rounded bg-white/80 text-slate-900 text-xs font-semibold min-w-[44px] text-center">
                  {k}{' '}
                  {editingField===`stat_${k}` ? (
                    <input autoFocus className="w-10 bg-white/90 rounded px-1"
                      value={editingValue}
                      onChange={(e)=> setEditingValue(e.target.value)}
                      onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); saveEditingField(); } if(e.key==='Escape'){ e.preventDefault(); setEditingField(null);} }}
                      onBlur={()=> setShowConfirm(true)}
                    />
                  ) : (
                    <span className="ml-1 font-bold" onDoubleClick={(e)=>{ e.stopPropagation(); setEditingField(`stat_${k}`); setOriginalValue(String(current ?? '')); setEditingValue(String(current ?? '')); setShowConfirm(false); }}>{String(current ?? '-')}</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="absolute left-0 right-0 h-1 bg-blue-400/40 cursor-ns-resize" style={{ top: L.scoreRow.y * scale }} onMouseDown={startDragFixed('scoreRow', 'move')} />
          <div className="absolute w-full text-center pointer-events-auto select-none" style={{ top: (L.scoreRow.y * scale) - 10 }}>
            {editingField==='scoreLine' ? (
              <input autoFocus className="bg-white/90 rounded px-2 py-0.5 text-center"
                value={editingValue}
                onChange={(e)=> setEditingValue(e.target.value)}
                onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); saveEditingField(); } if(e.key==='Escape'){ e.preventDefault(); setEditingField(null);} }}
                onBlur={()=> setShowConfirm(true)}
                style={{ fontSize: 28*scale }}
              />
            ) : (
              <span className="font-black text-white" style={{ fontSize: 28*scale }} onDoubleClick={(e)=>{ e.stopPropagation(); setEditingField('scoreLine'); setOriginalValue(String(effectiveScoreLine||'')); setEditingValue(String(effectiveScoreLine||'')); setShowConfirm(false); }}>
                {effectiveScoreLine}
              </span>
            )}
          </div>
          <div
            className="absolute rounded-full border-2 border-white/80 cursor-move overflow-hidden"
            style={{ left: (L.headshot.cx - L.headshot.r) * scale, top: (L.headshot.cy - L.headshot.r) * scale, width: (L.headshot.r * 2) * scale, height: (L.headshot.r * 2) * scale }}
            onMouseDown={startDragFixed('headshot', 'move')}
          >
            {(L.headshot?.processedImageUrl || headshotImageUrl) && (
              <img src={(L.headshot?.processedImageUrl || headshotImageUrl)} alt="Headshot" className="absolute inset-0 w-full h-full object-cover rounded-full pointer-events-none select-none" />
            )}
            <div title="Drag to resize" className="absolute w-4 h-4 bg-emerald-500 border-2 border-white rounded-sm right-0 top-1/2 -translate-y-1/2 cursor-ew-resize z-10" onMouseDown={startDragFixed('headshot', 'resize')} style={{ transform: 'translate(2px,-50%)' }} />
          </div>

          {/* Alignment guides */}
          {showVGuide && <div className="absolute top-0 bottom-0 w-px bg-pink-500/60" style={{ left: (centerX*scale) }} />}
          {showHGuide && <div className="absolute left-0 right-0 h-px bg-pink-500/60" style={{ top: (centerY*scale) }} />}

          {/* Editable text elements */}
          {(L.elements||[]).map((el) => (
            <div
              key={el.id}
              className={`absolute select-none ${selectedIds.includes(el.id)?'ring-2 ring-primary':''}`}
              style={{
                left: 0, top: 0,
                transform: `translate(${(el.x||0)*scale}px, ${(el.y||0)*scale}px) rotate(${el.rotation||0}deg)`
              }}
              onMouseDown={(e)=>{ if (el.locked) return; e.stopPropagation(); if (e.shiftKey||e.metaKey||e.ctrlKey){ setSelectedIds(prev=> prev.includes(el.id)? prev.filter(id=>id!==el.id): [...prev, el.id]); } else { setSelectedIds([el.id]); } }}
            >
              {editingId===el.id ? (
                <textarea
                  autoFocus
                  className="bg-white/90 text-slate-900 rounded px-1 py-0.5"
                  value={editingValue}
                  onChange={(e)=> setEditingValue(e.target.value)}
                  onKeyDown={(e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); setElements((L.elements||[]).map(x=> x.id===el.id?{...x, text: editingValue}:x)); setEditingId(null);} if(e.key==='Escape'){ e.preventDefault(); setEditingId(null); setEditingValue(originalValue);} }}
                  onBlur={()=> setShowConfirm(true)}
                  style={{
                    color: el.color || '#fff',
                    fontWeight: el.bold ? 800 : 600,
                    fontSize: (el.fontSize||32) * scale,
                    fontFamily: el.fontFamily || 'Inter, system-ui, Arial',
                    textAlign: el.align || 'left',
                    lineHeight: 1.1,
                    minWidth: 120,
                  }}
                  rows={Math.max(1, String(editingValue||'').split('\n').length)}
                />
              ) : (
                <div
                  className="cursor-move"
                  onMouseDown={startDragElement(el, 'move')}
                  onDoubleClick={(e)=>{ e.stopPropagation(); setEditingId(el.id); setOriginalValue(String(el.text||'')); setEditingValue(el.text||''); setShowConfirm(false); }}
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
              )}
              {!el.locked && selectedIds.includes(el.id) && (
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
        {/* close inner canvas wrapper */}
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
              <div key={el.id} className={`flex items-center justify-between gap-2 p-2 rounded border ${selectedIds.includes(el.id)?'bg-accent':'bg-card'}`}
                onClick={(e)=>{ if (e.shiftKey||e.metaKey||e.ctrlKey){ setSelectedIds(prev=> prev.includes(el.id)? prev.filter(id=>id!==el.id): [...prev, el.id]); } else { setSelectedIds([el.id]); } }}
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

        {/* Arrange tools */}
        <div className="space-y-2">
          <div className="font-semibold mb-1">Arrange</div>
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant="outline" onClick={()=>alignSelected('left')}>Align L</Button>
            <Button size="sm" variant="outline" onClick={()=>alignSelected('hcenter')}>Align C</Button>
            <Button size="sm" variant="outline" onClick={()=>alignSelected('right')}>Align R</Button>
            <Button size="sm" variant="outline" onClick={()=>alignSelected('top')}>Align T</Button>
            <Button size="sm" variant="outline" onClick={()=>alignSelected('vcenter')}>Align M</Button>
            <Button size="sm" variant="outline" onClick={()=>alignSelected('bottom')}>Align B</Button>
            <Button size="sm" variant="outline" onClick={()=>distributeSelected('h')}>Distribute H</Button>
            <Button size="sm" variant="outline" onClick={()=>distributeSelected('v')}>Distribute V</Button>
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