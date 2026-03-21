import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const W = 1080; const H = 1350;

const defaultLayout = {
  header: { y: 110, fontSize: 32, color: '#ffffff' },
  datePill: { x: 40, y: 132 },
  headshot: { cx: W/2, cy: 680, r: 130 },
  bestTitle: { y: 950, fontSize: 72, color: '#ffffff' },
  scoreRow: { y: 1030 },
  orgBox: { x: W - 260 - 24, y: 24, w: 260, h: 86 },
  stats: { y: 520 },
};

export default function PosterEditor({ backgroundUrl, layout, onChange }) {
  const stageRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const L = { ...defaultLayout, ...(layout || {}),
    header: { ...defaultLayout.header, ...(layout?.header||{}) },
    datePill: { ...defaultLayout.datePill, ...(layout?.datePill||{}) },
    headshot: { ...defaultLayout.headshot, ...(layout?.headshot||{}) },
    bestTitle: { ...defaultLayout.bestTitle, ...(layout?.bestTitle||{}) },
    scoreRow: { ...defaultLayout.scoreRow, ...(layout?.scoreRow||{}) },
    orgBox: { ...defaultLayout.orgBox, ...(layout?.orgBox||{}) },
    stats: { ...defaultLayout.stats, ...(layout?.stats||{}) },
  };

  const stage = { width: 540, height: Math.round(540 * (H/W)) }; // 50% scale
  const scale = stage.width / W;

  const startDrag = (key, mode) => (e) => {
    e.preventDefault();
    setSelected({ key, mode });
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!selected) return;
      const rect = stageRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;
      const upd = { ...L };
      if (selected.key === 'orgBox') {
        if (selected.mode === 'move') { upd.orgBox.x = Math.max(0, Math.min(W - upd.orgBox.w, x - upd.orgBox.w/2)); upd.orgBox.y = Math.max(0, Math.min(H - upd.orgBox.h, y - 20)); }
        if (selected.mode === 'resize') { upd.orgBox.w = Math.max(100, Math.min(W, x - upd.orgBox.x)); upd.orgBox.h = Math.max(50, Math.min(H, y - upd.orgBox.y)); }
      }
      if (selected.key === 'headshot') {
        if (selected.mode === 'move') { upd.headshot.cx = Math.max(80, Math.min(W-80, x)); upd.headshot.cy = Math.max(80, Math.min(H-80, y)); }
        if (selected.mode === 'resize') { upd.headshot.r = Math.max(60, Math.min(240, Math.hypot(x - upd.headshot.cx, y - upd.headshot.cy))); }
      }
      if (selected.key === 'datePill') { upd.datePill.x = Math.max(0, x - 40); upd.datePill.y = Math.max(0, y - 10); }
      if (selected.key === 'header') { upd.header.y = Math.max(40, Math.min(H-40, y)); }
      if (selected.key === 'bestTitle') { upd.bestTitle.y = Math.max(200, Math.min(H-100, y)); }
      if (selected.key === 'stats') { upd.stats.y = Math.max(300, Math.min(H-300, y)); }
      if (selected.key === 'scoreRow') { upd.scoreRow.y = Math.max(600, Math.min(H-100, y)); }
      onChange(upd);
    };
    const onUp = () => setSelected(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [selected, scale]);

  return (
    <div className="flex gap-6">
      <div
        ref={stageRef}
        className="relative border rounded-md overflow-hidden bg-black/5"
        style={{ width: stage.width, height: stage.height }}
      >
        <img src={backgroundUrl} alt="bg" className="absolute inset-0 w-full h-full object-cover" />
        {/* Org Box */}
        <div
          className="absolute bg-white/70 backdrop-blur-sm border border-white/60 text-xs text-slate-800 cursor-move"
          style={{ left: L.orgBox.x * scale, top: L.orgBox.y * scale, width: L.orgBox.w * scale, height: L.orgBox.h * scale }}
          onMouseDown={startDrag('orgBox', 'move')}
        >
          <div className="p-2">Org Logo/Name</div>
          <div
            className="absolute w-3 h-3 bg-slate-700 rounded-sm right-0 bottom-0 cursor-se-resize"
            onMouseDown={startDrag('orgBox', 'resize')}
            style={{ transform: 'translate(-2px,-2px)' }}
          />
        </div>
        {/* Date Pill */}
        <div className="absolute px-3 py-1 bg-yellow-400 text-slate-900 text-xs rounded cursor-move"
          style={{ left: L.datePill.x * scale, top: L.datePill.y * scale }}
          onMouseDown={startDrag('datePill', 'move')}
        >
          DATE
        </div>
        {/* Header line handle */}
        <div className="absolute left-0 right-0 h-1 bg-white/30 cursor-ns-resize" style={{ top: L.header.y * scale }} onMouseDown={startDrag('header', 'move')} />
        {/* Best Title handle */}
        <div className="absolute left-0 right-0 h-1 bg-white/50 cursor-ns-resize" style={{ top: L.bestTitle.y * scale }} onMouseDown={startDrag('bestTitle', 'move')} />
        {/* Stats row handle */}
        <div className="absolute left-0 right-0 h-1 bg-green-400/40 cursor-ns-resize" style={{ top: L.stats.y * scale }} onMouseDown={startDrag('stats', 'move')} />
        {/* Score row handle */}
        <div className="absolute left-0 right-0 h-1 bg-blue-400/40 cursor-ns-resize" style={{ top: L.scoreRow.y * scale }} onMouseDown={startDrag('scoreRow', 'move')} />
        {/* Headshot */}
        <div
          className="absolute rounded-full border-2 border-white/80 cursor-move"
          style={{ left: (L.headshot.cx - L.headshot.r) * scale, top: (L.headshot.cy - L.headshot.r) * scale, width: (L.headshot.r * 2) * scale, height: (L.headshot.r * 2) * scale }}
          onMouseDown={startDrag('headshot', 'move')}
        >
          <div
            className="absolute w-3 h-3 bg-slate-700 rounded-sm right-0 top-1/2 -translate-y-1/2 cursor-ew-resize"
            onMouseDown={startDrag('headshot', 'resize')}
            style={{ transform: 'translate(2px,-50%)' }}
          />
        </div>
      </div>

      <div className="min-w-[260px] space-y-4">
        <div>
          <Label className="text-xs">Header Font Size</Label>
          <Input type="number" value={L.header.fontSize} onChange={(e)=> onChange({ ...L, header: { ...L.header, fontSize: Number(e.target.value)||12 }})} />
        </div>
        <div>
          <Label className="text-xs">Header Color</Label>
          <Input type="color" value={L.header.color} onChange={(e)=> onChange({ ...L, header: { ...L.header, color: e.target.value }})} />
        </div>
        <div>
          <Label className="text-xs">Best Title Size</Label>
          <Input type="number" value={L.bestTitle.fontSize} onChange={(e)=> onChange({ ...L, bestTitle: { ...L.bestTitle, fontSize: Number(e.target.value)||24 }})} />
        </div>
        <div>
          <Label className="text-xs">Best Title Color</Label>
          <Input type="color" value={L.bestTitle.color} onChange={(e)=> onChange({ ...L, bestTitle: { ...L.bestTitle, color: e.target.value }})} />
        </div>
        <div>
          <Label className="text-xs">Stats Row Y</Label>
          <Input type="number" value={L.stats.y} onChange={(e)=> onChange({ ...L, stats: { ...L.stats, y: Number(e.target.value)||520 }})} />
        </div>
        <div>
          <Label className="text-xs">Score Row Y</Label>
          <Input type="number" value={L.scoreRow.y} onChange={(e)=> onChange({ ...L, scoreRow: { ...L.scoreRow, y: Number(e.target.value)||1030 }})} />
        </div>
        <div>
          <Button variant="secondary" onClick={()=> onChange(defaultLayout)}>Reset</Button>
        </div>
      </div>
    </div>
  );
}