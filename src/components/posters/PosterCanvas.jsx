import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { buildSmartLayout, getSportStatsConfig } from './smartLayout';
import { base44 } from '@/api/base44Client';
import { Save, Loader2 } from 'lucide-react';

// Canvas composer that overlays org logo/info and the single best player's headshot + stats
export default function PosterCanvas({ backgroundUrl, game, players, org, bestPlayerImageUrl, homeName, awayName, layout, onReady }) {
  const canvasRef = useRef(null);
  const [dataUrl, setDataUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);

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

      // date text (no box), 2x size, white
      if (dateStr) {
        const centerX = L.datePill?.x ?? W / 2;
        const dateY = (L.datePill?.y ?? 132) + 18; // align with previous pill center
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '700 40px Inter, system-ui, Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(dateStr, centerX, dateY);
      }

      const p = (players && players.length > 0) ? players[0] : null;

      // Minimal stat row (scaled 2x, centered, gold color)
      const drawStat = (x, y, label, value) => {
        const gold = '#facc15'; // Tailwind amber-300-like gold
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = gold;
        ctx.font = '700 28px Inter, system-ui, Arial';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(label.toUpperCase(), x, y - 16);
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 3;
        ctx.fillStyle = gold;
        ctx.font = '900 76px Inter, system-ui, Arial';
        ctx.fillText(String(value), x, y + 32);
        ctx.shadowBlur = 0;
      };

      // Smart stat layout (evenly spaced across safe width)
      const statsConf = getSportStatsConfig(game.sport, p);
      const safeL = 80; const safeR = 80; const usable = W - safeL - safeR;
      const count = Math.max(1, statsConf.length);
      const spacingFactor = 0.7; // tighter spacing between stats
      const step = count === 1 ? 0 : (usable / (count - 1)) * spacingFactor;

      // Place stats just below the date with clean spacing
      const dateCenterY = (L.datePill?.y ?? 132) + 18; // matches date rendering center
      const defaultOffset = L.stats?.offset ?? 90; // spacing below date
      const y = dateCenterY + defaultOffset;

      const totalSpan = count === 1 ? 0 : (count - 1) * step;
      const startX = (W / 2) - (totalSpan / 2);
      for (let i = 0; i < count; i++) {
        const x = count === 1 ? W / 2 : startX + i * step;
        const s = statsConf[i];
        if (s) drawStat(x, y, s.label, s.value);
      }

      // Position headshot between stats (y) and player name with equal spacing, keeping stats above name
      const bestTitleY = L.bestTitle?.y ?? 950;
      const nameY = L.nameLabel?.y ?? (bestTitleY - 70); // lock player name above BEST PLAYER
      const midY = Math.round((y + nameY) / 2);

      if (headImg) {
        const poly = L.headshot?.polygon;
        if (Array.isArray(poly) && poly.length >= 3) {
          const xs = poly.map(p=>p.x), ys = poly.map(p=>p.y);
          const minX = Math.min(...xs), maxX = Math.max(...xs);
          const minY = Math.min(...ys), maxY = Math.max(...ys);
          const bw = maxX - minX, bh = maxY - minY;
          const curCenterY = minY + bh/2;
          const deltaY = midY - curCenterY;

          // Draw headshot without clipping; fit entire image within polygon bounds (contain)
          ctx.save();
          ctx.translate(0, deltaY);
          const ar = Math.min(bw / headImg.width, bh / headImg.height);
          const dw2 = headImg.width * ar; const dh2 = headImg.height * ar;
          const dx2 = minX + (bw - dw2) / 2; const dy2 = minY + (bh - dh2) / 2;
          ctx.drawImage(headImg, dx2, dy2, dw2, dh2);
          ctx.restore();

          // Player name label at locked nameY
          const midX = minX + bw/2;
          const first = (p?.first_name) || (p?.player?.first_name) || '';
          const last = (p?.last_name) || (p?.player?.last_name) || '';
          const jersey = (p?.jersey_number) || (p?.player?.jersey_number) || '';
          const nameStr = [first, last].filter(Boolean).join(' ');
          const jerseyStr = String(jersey || '').replace(/^#/, '');
          const label = jerseyStr ? `${nameStr} #${jerseyStr}` : nameStr;
          if (label) {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            let size = 56; const maxW = W - 2 * 140;
            while (size >= 18) {
              ctx.font = `800 ${size}px Inter, system-ui, Arial`;
              if (ctx.measureText(label).width <= maxW) break;
              size -= 1;
            }
            ctx.fillText(label, midX, nameY);
          }
        } else {
          const cx = L.headshot?.cx ?? (W / 2); const r = L.headshot?.r ?? 170;
          const cy = midY; // center between stats and name
          // Draw headshot without circular clipping; fit entire image within square box
          ctx.save();
          const box = r * 2;
          const ar = Math.min(box / headImg.width, box / headImg.height);
          const dw2 = headImg.width * ar; const dh2 = headImg.height * ar;
          ctx.drawImage(headImg, cx - dw2 / 2, cy - dh2 / 2, dw2, dh2);
          ctx.restore();

          // Player name label at locked nameY with auto-fit
          const first = (p?.first_name) || (p?.player?.first_name) || '';
          const last = (p?.last_name) || (p?.player?.last_name) || '';
          const jersey = (p?.jersey_number) || (p?.player?.jersey_number) || '';
          const nameStr = [first, last].filter(Boolean).join(' ');
          const jerseyStr = String(jersey || '').replace(/^#/, '');
          const label = jerseyStr ? `${nameStr} #${jerseyStr}` : nameStr;
          if (label) {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            let size = 56; const maxW = W - 2 * 140;
            while (size >= 18) {
              ctx.font = `800 ${size}px Inter, system-ui, Arial`;
              if (ctx.measureText(label).width <= maxW) break;
              size -= 1;
            }
            ctx.fillText(label, cx, nameY);
          }
        }
      }

      // BEST PLAYER heading
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const bestColor = '#facc15';
      let bestSize = L.bestTitle?.fontSize ?? 72;
      const bestY = L.bestTitle?.y ?? 950;
      ctx.fillStyle = bestColor;
      // Auto-fit BEST PLAYER (gold)
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

      // Team indicator moved above player name (16px spacing)
      const bestTeamId = (p?.team_id) || (p?.player?.team_id) || null;
      let bestTeamName = '';
      if (bestTeamId) {
        if (bestTeamId === game.home_team_id) bestTeamName = String(homeName || 'HOME').toUpperCase();
        else if (bestTeamId === game.away_team_id) bestTeamName = String(awayName || 'AWAY').toUpperCase();
      }
      if (!bestTeamName) {
        bestTeamName = (p?.team_name || p?.player?.team_name || p?.team?.name || p?.player?.team?.name || '').toString().toUpperCase();
      }
      if (bestTeamName) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '700 24px Inter, system-ui, Arial';
        ctx.fillStyle = '#ffffff';
        const teamY = (L.nameLabel?.y ?? ((L.bestTitle?.y ?? 950) - 70)) - 56; // extra spacing above name
        ctx.fillText(bestTeamName, W / 2, teamY);
      }

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

      // Auto-fit team names if too long
      const fitText = (text, maxWidth, maxSize = 28, minSize = 14) => {
        let s = maxSize;
        while (s >= minSize) {
          ctx.font = `700 ${s}px Inter, system-ui, Arial`;
          if (ctx.measureText(text).width <= maxWidth) return s;
          s -= 1;
        }
        return minSize;
      };

      // Left name area: from margin 24 to leftX - 30
      const leftMaxWidth = Math.max(40, (leftX - 30) - 24);
      const leftName = String(homeName || 'HOME').toUpperCase();
      const leftSize = fitText(leftName, leftMaxWidth);
      ctx.font = `700 ${leftSize}px Inter, system-ui, Arial`;
      ctx.textAlign = 'right';
      ctx.fillText(leftName, leftX - 20, yScore);

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

      // Right name area: from rightX + 30 to margin 24 from right
      const rightMaxWidth = Math.max(40, (W - 24) - (rightX + 30));
      const rightName = String(awayName || 'AWAY').toUpperCase();
      const rightSize = fitText(rightName, rightMaxWidth);
      ctx.font = `700 ${rightSize}px Inter, system-ui, Arial`;
      ctx.textAlign = 'left'; ctx.fillStyle = '#ffffff';
      ctx.fillText(rightName, rightX + 20, yScore);
      ctx.shadowBlur = 0;


      // Org name bottom-right
      ctx.textAlign = 'right'; ctx.font = '600 16px Inter, system-ui, Arial'; ctx.fillStyle = '#ffffff';
      if (org?.name) ctx.fillText(String(org.name).toUpperCase(), W - 24, H - 24);

      // Footer tag
      ctx.textAlign = 'center';
      ctx.font = '600 20px Inter, system-ui, Arial';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText('Generated with ScorekeeperAI', W / 2, H - 56);

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

  const dataURLtoBlob = (dataURL) => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  };

  const handleSave = async () => {
    if (!dataUrl) return;
    setSaving(true);
    try {
      const blob = dataURLtoBlob(dataUrl);
      const file = new File([blob], `poster-${Date.now()}.png`, { type: 'image/png' });
      const upload = await base44.integrations.Core.UploadFile({ file });
      const image_url = upload.file_url;
      const payload = {
        organization_id: org?.id || null,
        game_id: game?.id || null,
        sport: game?.sport || null,
        player_id: players?.[0]?.id || players?.[0]?.player_id || null,
        team_id: players?.[0]?.team_id || null,
        image_url,
        width: 1080,
        height: 1350,
        title: `${String(homeName||'HOME')} vs ${String(awayName||'AWAY')} - Best Player`
      };
      const rec = await base44.entities.Poster.create(payload);
      setSavedId(rec.id);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-[600px] mx-auto">
      <canvas ref={canvasRef} className="w-full h-auto shadow-futuristic" />
      {dataUrl && (
        <div className="mt-3 flex gap-2">
          <a href={dataUrl} download="poster.png">
            <Button variant="outline">Download Poster</Button>
          </a>
          <Button onClick={handleSave} disabled={saving || !dataUrl} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {savedId ? 'Saved' : 'Save Poster'}
          </Button>
        </div>
      )}
    </div>
  );
  }