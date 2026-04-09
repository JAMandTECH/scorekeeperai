import React from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Eraser, Undo2, Check, X } from 'lucide-react';

export default function BackgroundEraser({ imageUrl, onApply, onCancel }) {
  const canvasRef = React.useRef(null);
  const containerRef = React.useRef(null);
  const ctxRef = React.useRef(null);
  const imgRef = React.useRef(null);
  const [loading, setLoading] = React.useState(true);
  const [brush, setBrush] = React.useState(30);
  const [isErasing, setIsErasing] = React.useState(false);
  const historyRef = React.useRef([]);
  const lastPosRef = React.useRef(null);

  const drawImageFit = React.useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !imgRef.current) return;

    const dpr = window.devicePixelRatio || 1;
    const cw = container.clientWidth;
    const ch = container.clientHeight;

    canvas.width = Math.floor(cw * dpr);
    canvas.height = Math.floor(ch * dpr);
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;

    const img = imgRef.current;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    // contain
    const scale = Math.min(cw / iw, ch / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);

    ctxRef.current = { ctx, scale, offsetX: dx, offsetY: dy, imgW: dw, imgH: dh };
  }, []);

  React.useEffect(() => {
    if (!imageUrl) return;
    setLoading(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      setLoading(false);
      drawImageFit();
    };
    img.onerror = () => setLoading(false);
    img.src = imageUrl;
  }, [imageUrl, drawImageFit]);

  React.useEffect(() => {
    const onResize = () => drawImageFit();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [drawImageFit]);

  const getCanvasPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return { x, y };
  };

  const pushHistory = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current?.ctx;
    if (!canvas || !ctx) return;
    try {
      const snapshot = ctx.getImageData(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
      historyRef.current.push(snapshot);
      if (historyRef.current.length > 20) historyRef.current.shift();
    } catch (_) {}
  };

  const undo = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current?.ctx;
    const snap = historyRef.current.pop();
    if (!canvas || !ctx || !snap) return;
    ctx.putImageData(snap, 0, 0);
  };

  const startErase = (e) => {
    if (!ctxRef.current?.ctx) return;
    setIsErasing(true);
    pushHistory();
    lastPosRef.current = getCanvasPos(e);
    eraseAt(lastPosRef.current);
  };

  const endErase = () => {
    setIsErasing(false);
    lastPosRef.current = null;
  };

  const eraseAt = (pos) => {
    const { ctx } = ctxRef.current;
    if (!ctx) return;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, brush / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const onMove = (e) => {
    if (!isErasing) return;
    const cur = getCanvasPos(e);
    const last = lastPosRef.current || cur;
    const steps = Math.max(1, Math.ceil(Math.hypot(cur.x - last.x, cur.y - last.y) / (brush / 4)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = last.x + (cur.x - last.x) * t;
      const y = last.y + (cur.y - last.y) * t;
      eraseAt({ x, y });
    }
    lastPosRef.current = cur;
  };

  const handleApply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onApply?.(dataUrl);
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Eraser className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Brush size</span>
          <div className="w-40">
            <Slider value={[brush]} min={5} max={120} step={1} onValueChange={(v)=>setBrush(v[0])} />
          </div>
          <span className="text-xs text-muted-foreground w-8 text-right">{brush}px</span>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={undo}><Undo2 className="h-4 w-4" /> Undo</Button>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} className="gap-2"><X className="h-4 w-4" /> Cancel</Button>
          <Button size="sm" onClick={handleApply} className="gap-2"><Check className="h-4 w-4" /> Apply</Button>
        </div>
      </div>
      <div ref={containerRef} className="relative flex-1 rounded-md border overflow-hidden bg-muted">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">Loading image...</div>
        ) : (
          <canvas
            ref={canvasRef}
            className="touch-none cursor-crosshair w-full h-full block"
            onMouseDown={startErase}
            onMouseUp={endErase}
            onMouseLeave={endErase}
            onMouseMove={onMove}
            onTouchStart={(e)=>{ e.preventDefault(); startErase(e); }}
            onTouchEnd={(e)=>{ e.preventDefault(); endErase(); }}
            onTouchMove={(e)=>{ e.preventDefault(); onMove(e); }}
          />
        )}
      </div>
    </div>
  );
}