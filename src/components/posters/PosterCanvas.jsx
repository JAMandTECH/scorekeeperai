import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { buildSmartLayout, getSportStatsConfig } from './smartLayout';

// Canvas composer that overlays org logo/info and the single best player's headshot + stats
export default function PosterCanvas({ backgroundUrl, game, players, org, bestPlayerImageUrl, homeName, awayName, layout, onReady }) {
  const canvasRef = useRef(null);
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    if (!backgroundUrl || !game) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const W = 1080;
    const H = 1350;
    const baseMeta = layout || {};
    const smart = buildSmartLayout({ sport: game.sport, meta: baseMeta });
    // Smart layout takes precedence; template metadata can still override unique fields
    const L = { ...baseMeta, ...smart };
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';

    const ctx = canvas.getContext('2d');
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const loadImage = (url) => new Promise((resolve) => {
      if (!url) return resolve(null);
      const i = new Image();
      i.crossOrigin = 'anonymous';
      i.onload = () => resolve(i);
      i.onerror = () => resolve(null);
      i.src = url;
    });

    (async () => {
      const headSrc = (L?.headshot?.processedImageUrl) || (bestPlayerImageUrl || players?.[0]?.photo_url);
      const [bgImg, logoImg, headImg] = await Promise.all([
        loadImage(backgroundUrl),
        loadImage(org?.logo_url),
        loadImage(headSrc)
      ]);
      if (!bgImg) return;

      // Draw background (cover)
      const iw = bgImg.width;
      const ih = bgImg.height;
      const scale = Math.max(W / iw, H / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (W - dw) / 2;
      const dy = (H - dh) / 2;
      ctx.drawImage(bgImg, dx, dy, dw, dh);

      // Stronger vignette for readability
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, 'rgba(0,0,0,0.35)');
      grad.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Org logo only (no background or text)
      {
        const maxH = L.orgLogo?.h ?? 64;
        const maxW = L.orgLogo?.w ?? 200;
        const x = L.orgLogo?.x ?? (W - maxW - 24);
        const y = L.orgLogo?.y ?? 24;
        if (logoImg) {
          const scale = Math.min(maxW / logoImg.width, maxH / logoImg.height);
          const dw = logoImg.width * scale;
          const dh = logoImg.height * scale;
          const drawX = Math.round((W - dw) / 2); // center horizontally
          ctx.drawImage(logoImg, drawX, y, dw, dh);
        }
      }

      // Header (tournament/division) + date pill with auto-fit
      const dateObj = game.game_date ? new Date(game.game_date) : null;
      const dateStr = dateObj ? dateObj.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase() : '';
      const header = [org?.tournament_name || org?.name || '', game.division || '']
        .filter(Boolean).join(' • ').toUpperCase();
      const headerColor = L.header?.color ?? '#ffffff';
      let headerSize = L.header?.fontSize ?? 34;
      const headerY = L.header?.y ?? 110;
      ctx.fillStyle = headerColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Auto-fit header text to safe width
      const maxHeaderWidth = W - 2 * 80;
      let trySize = headerSize;
      while (header && trySize >= 18) {
        ctx.font = `800 ${trySize}px Inter, system-ui, Arial`;
        if (ctx.measureText(header).width <= maxHeaderWidth) break;
        trySize -= 2;
      }
      ctx.font = `800 ${trySize}px Inter, system-ui, Arial`;
      if (header) ctx.fillText(header, W / 2, headerY);

      // date pill (center aligned)
      if (dateStr) {
        const padX = 18; const bh = 36; const r = 10;
        ctx.font = '700 20px Inter, system-ui, Arial';
        const tw = ctx.measureText(dateStr).width;
        const bw = tw + padX * 2;
        const centerX = L.datePill?.x ?? W / 2; const dateY = L.datePill?.y ?? 132;
        const dateX = Math.round(centerX - bw / 2);
        ctx.fillStyle = '#f59e0b'; // amber-500
        ctx.beginPath();
        ctx.moveTo(dateX + r, dateY);
        ctx.arcTo(dateX + bw, dateY, dateX + bw, dateY + bh, r);
        ctx.arcTo(dateX + bw, dateY + bh, dateX, dateY + bh, r);
        ctx.arcTo(dateX, dateY + bh, dateX, dateY, r);
        ctx.arcTo(dateX, dateY, dateX + bw, dateY, r);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#111827'; ctx.textAlign = 'left';
        ctx.fillText(dateStr, dateX + padX, dateY + bh - 10);
      }

      const p = (players && players.length > 0) ? players[0] : null;

      // Minimal stat row
      const drawStat = (x, y, label, value) => {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(226,232,240,0.95)'; // slate-200
        ctx.font = '700 14px Inter, system-ui, Arial';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(label.toUpperCase(), x, y - 8);
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 3;
        ctx.font = '900 38px Inter, system-ui, Arial';
        ctx.fillText(String(value), x, y + 16);
        ctx.shadowBlur = 0;
      };

      // Smart stat layout (evenly spaced across safe width)
      const statsConf = getSportStatsConfig(game.sport, p);
      const safeL = 80; const safeR = 80; const usable = W - safeL - safeR;
      const count = Math.max(1, statsConf.length);
      const step = count === 1 ? 0 : usable / (count - 1);
      const y = (L.stats?.y ?? 520);
      for (let i = 0; i < count; i++) {
        const x = count === 1 ? W / 2 : safeL + i * step;
        const s = statsConf[i];
        if (s) drawStat(x, y, s.label, s.value);
      }

      // Headshot with optional polygon crop
      if (headImg) {
        const poly = L.headshot?.polygon;
        if (Array.isArray(poly) && poly.length >= 3) {
          const xs = poly.map(p=>p.x), ys = poly.map(p=>p.y);
          const minX = Math.min(...xs), maxX = Math.max(...xs);
          const minY = Math.min(...ys), maxY = Math.max(...ys);
          const bw = maxX - minX, bh = maxY - minY;

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(poly[0].x, poly[0].y);
          for (let i=1;i<poly.length;i++) ctx.lineTo(poly[i].x, poly[i].y);
          ctx.closePath();
          ctx.clip();

          const ar = Math.max(bw / headImg.width, bh / headImg.height);
          const dw2 = headImg.width * ar; const dh2 = headImg.height * ar;
          const dx2 = minX + (bw - dw2)/2; const dy2 = minY + (bh - dh2)/2;
          ctx.drawImage(headImg, dx2, dy2, dw2, dh2);
          ctx.restore();

          // Label below polygon bbox
          const midX = minX + bw/2; const labelY = maxY + 30;
          const first = (p?.first_name) || (p?.player?.first_name) || '';
          const last = (p?.last_name) || (p?.player?.last_name) || '';
          const jersey = (p?.jersey_number) || (p?.player?.jersey_number) || '';
          const nameStr = [first, last].filter(Boolean).join(' ');
          const jerseyStr = String(jersey || '').replace(/^#/, '');
          const label = jerseyStr ? `${nameStr} #${jerseyStr}` : nameStr;
          if (label) {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.font = '800 28px Inter, system-ui, Arial';
            ctx.fillText(label, midX, labelY);
          }
        } else {
          const cx = L.headshot?.cx ?? (W / 2); const cy = L.headshot?.cy ?? 680; const r = L.headshot?.r ?? 170;
          ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
          const ar = Math.max((r * 2) / headImg.width, (r * 2) / headImg.height);
          const dw2 = headImg.width * ar; const dh2 = headImg.height * ar;
          ctx.drawImage(headImg, cx - dw2 / 2, cy - dh2 / 2, dw2, dh2);
          ctx.restore();

          // Label below circle with auto-fit
          const first = (p?.first_name) || (p?.player?.first_name) || '';
          const last = (p?.last_name) || (p?.player?.last_name) || '';
          const jersey = (p?.jersey_number) || (p?.player?.jersey_number) || '';
          const nameStr = [first, last].filter(Boolean).join(' ');
          const jerseyStr = String(jersey || '').replace(/^#/, '');
          const label = jerseyStr ? `${nameStr} #${jerseyStr}` : nameStr;
          if (label) {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            let size = 28; const maxW = W - 2 * 140;
            while (size >= 18) {
              ctx.font = `800 ${size}px Inter, system-ui, Arial`;
              if (ctx.measureText(label).width <= maxW) break;
              size -= 1;
            }
            ctx.fillText(label, cx, cy + r + 30);
          }
        }
      }

      // BEST PLAYER heading
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const bestColor = L.bestTitle?.color ?? '#ffffff';
      let bestSize = L.bestTitle?.fontSize ?? 72;
      const bestY = L.bestTitle?.y ?? 950;
      ctx.fillStyle = bestColor;
      // Auto-fit BEST PLAYER
      const bestText = 'BEST PLAYER';
      let s = bestSize; const maxBestW = W - 2 * 120;
      while (s >= 28) {
        ctx.font = `900 ${s}px Inter, system-ui, Arial`;
        if (ctx.measureText(bestText).width <= maxBestW) break;
        s -= 2;
      }
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 6;
      ctx.fillText(bestText, W / 2, bestY);
      ctx.shadowBlur = 0;

      // Render custom editable elements (text boxes)
      if (Array.isArray(L.elements)) {
        L.elements.forEach((el) => {
          if (el.type === 'text' && el.text) {
            ctx.save();
            const x = el.x ?? W/2;
            const y = el.y ?? H/2;
            const rot = (el.rotation || 0) * Math.PI / 180;
            ctx.translate(x, y);
            ctx.rotate(rot);
            ctx.fillStyle = el.color || '#ffffff';
            const weight = el.bold ? 800 : 600;
            const size = el.fontSize || 32;
            const ff = el.fontFamily || 'Inter, system-ui, Arial';
            ctx.font = `${weight} ${size}px ${ff}`;
            ctx.textAlign = (el.align || 'left');
            const lines = String(el.text).split('\n');
            const lh = size * 1.2;
            lines.forEach((line, i) => {
              ctx.fillText(line, 0, i * lh);
            });
            ctx.restore();
          }
        });
      }

      // Final Score row (center the score cluster precisely)
      const hs = Number(game.home_score || 0), as = Number(game.away_score || 0);
      const homeWins = hs >= as;
      const yScore = L.scoreRow?.y ?? 1030;
      const center = W / 2;

      // Measure elements
      ctx.font = '800 22px Inter, system-ui, Arial';
      const pad = 12;
      const homeScoreText = String(hs);
      const awayScoreText = String(as);
      const bw1 = ctx.measureText(homeScoreText).width + pad * 2;
      const bw2 = ctx.measureText(awayScoreText).width + pad * 2;

      ctx.font = '800 18px Inter, system-ui, Arial';
      const vsText = 'VS';
      const vsWidth = ctx.measureText(vsText).width;

      const gap = 24;
      const total = bw1 + gap + vsWidth + gap + bw2;
      const leftX = Math.round(center - total / 2);
      const rightX = leftX + total;

      // Draw names flanking the score cluster
      ctx.font = '700 28px Inter, system-ui, Arial';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 4;

      ctx.textAlign = 'right';
      ctx.fillText(String(homeName || 'HOME').toUpperCase(), leftX - 20, yScore);

      // Draw scores and VS centered cluster
      const drawScoreBox = (x, y, text, highlight) => {
        ctx.font = '800 22px Inter, system-ui, Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = highlight ? '#facc15' : '#ffffff';
        const w = ctx.measureText(text).width + pad * 2;
        ctx.fillText(text, x + w / 2, y);
        return w;
      };

      let cursor = leftX;
      const w1 = drawScoreBox(cursor, yScore, homeScoreText, homeWins);
      cursor += w1 + gap;

      ctx.font = '800 18px Inter, system-ui, Arial';
      ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff';
      ctx.fillText(vsText, cursor + vsWidth / 2, yScore);
      cursor += vsWidth + gap;

      const w2 = drawScoreBox(cursor, yScore, awayScoreText, !homeWins);

      ctx.textAlign = 'left'; ctx.font = '700 28px Inter, system-ui, Arial'; ctx.fillStyle = '#ffffff';
      ctx.fillText(String(awayName || 'AWAY').toUpperCase(), rightX + 20, yScore);
      ctx.shadowBlur = 0;


      // Org name bottom-right
      ctx.textAlign = 'right'; ctx.font = '600 16px Inter, system-ui, Arial'; ctx.fillStyle = '#ffffff';
      if (org?.name) ctx.fillText(String(org.name).toUpperCase(), W - 24, H - 24);

      // Footer tag
      ctx.textAlign = 'center';
      ctx.font = '600 24px Inter, system-ui, Arial';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText('Generated with ScorekeeperAI', W / 2, H - 30);

      try {
        const url = canvas.toDataURL('image/png');
        setDataUrl(url);
        onReady && onReady(url);
      } catch (e) {
        setDataUrl('');
        onReady && onReady('');
      }
    })();
  }, [backgroundUrl, game, players, org, bestPlayerImageUrl, homeName, awayName, layout, onReady]);

  return (
    <div className="w-full max-w-[600px] mx-auto">
      <canvas ref={canvasRef} className="w-full h-auto rounded-md shadow-futuristic" />
      {dataUrl && (
        <div className="mt-3 flex gap-2">
          <a href={dataUrl} download="poster.png">
            <Button variant="outline">Download Poster</Button>
          </a>
        </div>
      )}
    </div>
  );
  }