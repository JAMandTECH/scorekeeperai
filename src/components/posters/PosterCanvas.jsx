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

  // Ensure the Jost font (ITC Avant Garde Gothic-style) is available for canvas rendering
  useEffect(() => {
    const id = 'jost-font-link';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Jost:wght@200;300;400;500&family=Oswald:wght@600;700&family=Saira:ital,wght@0,600;0,700;0,800;1,600;1,700;1,800&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    if (!backgroundUrl || !game) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = 1080;
    const H = 1350;
    const SCALE = 4; // Render at 4x for 4K-quality output
    const baseMeta = layout || {};
    const smart = buildSmartLayout({ sport: game.sport, meta: baseMeta });
    // Smart layout takes precedence; template metadata can still override unique fields
    const L = { ...baseMeta, ...smart };
    canvas.width = W * SCALE;
    canvas.height = H * SCALE;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';

    const ctx = canvas.getContext('2d');
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);

    // Gold gradient utilities to mimic poster style
    const makeGoldGradient = (yTop, yBottom) => {
      const g = ctx.createLinearGradient(0, yTop, 0, yBottom);
      g.addColorStop(0, '#F9E6A1');   // light highlight
      g.addColorStop(0.35, '#F2C14E'); // mid gold
      g.addColorStop(0.7, '#D79A1E');  // deep gold
      g.addColorStop(1, '#8C5A00');    // shadow
      return g;
    };
    const goldStroke = '#6E4300';

    // Swirl/Halo effect behind best player – mimics animated light trails
    const drawSwirlHalo = (cx, cy, baseR = 220) => {
      ctx.save();
      const prevComp = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = 'lighter';

      // Soft radial glow
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 1.25);
      rg.addColorStop(0, 'rgba(255,230,160,0.45)');
      rg.addColorStop(0.5, 'rgba(240,180,60,0.18)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(cx, cy, baseR * 1.25, 0, Math.PI * 2);
      ctx.fill();

      // Gold elliptical rings (dashed for motion feel)
      const strokeGrad = makeGoldGradient(cy - baseR, cy + baseR);
      const rings = [
        { rx: baseR * 1.2,  ry: baseR * 0.55, rot: -0.2, width: 5, alpha: 0.8,  dash: [18, 14], offset: 0 },
        { rx: baseR * 1.45, ry: baseR * 0.70, rot:  0.15, width: 4, alpha: 0.55, dash: [14, 16], offset: 10 },
        { rx: baseR * 1.70, ry: baseR * 0.85, rot:  0.00, width: 3, alpha: 0.35, dash: [10, 18], offset: 20 },
      ];
      rings.forEach(r => {
        ctx.save();
        ctx.strokeStyle = strokeGrad;
        ctx.globalAlpha = r.alpha;
        ctx.lineWidth = r.width;
        ctx.setLineDash(r.dash);
        ctx.lineDashOffset = r.offset;
        ctx.shadowColor = 'rgba(255,200,80,0.45)';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r.rx, r.ry, r.rot, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // Sparkles along inner ring
      const sparkle = (ang) => {
        const x = cx + Math.cos(ang) * baseR * 1.2;
        const y = cy + Math.sin(ang) * baseR * 0.55;
        ctx.fillStyle = 'rgba(255,240,200,0.95)';
        ctx.shadowColor = 'rgba(255,210,120,0.95)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      };
      [-0.9, -0.2, 0.35, 1.1].forEach(sparkle);

      ctx.globalCompositeOperation = prevComp;
      ctx.restore();
    };

    // Soft floor glow ellipse under player
    const drawFloorGlow = (cx, y, rx, ry = 14) => {
      ctx.save();
      const prevComp = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = 'screen';
      ctx.translate(cx, y);
      ctx.scale(1, Math.max(0.0001, ry / rx));
      const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      grd.addColorStop(0, 'rgba(255,230,160,0.42)');
      grd.addColorStop(0.55, 'rgba(240,180,60,0.22)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = prevComp;
      ctx.restore();
    };

    // Bright waist ring (partial arcs) around the player
    const drawWaistRing = (cx, cy, rx, ry, thickness = 5) => {
      ctx.save();
      const prevComp = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = 'screen';
      ctx.lineWidth = thickness;
      ctx.shadowColor = 'rgba(255,200,90,0.55)';
      ctx.shadowBlur = 14;
      const grad = makeGoldGradient(cy - ry, cy + ry);
      ctx.strokeStyle = grad;
      // Two partial arcs for a broken-ring look
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0.0, -1.2, -0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0.0, 0.3, 1.2);
      ctx.stroke();
      ctx.globalCompositeOperation = prevComp;
      ctx.restore();
    };

    // Foreground gold swoosh in front of player (rounded capsule)
    const drawFrontStreak = (cx, cy, length = 300, thickness = 12, rotation = 0) => {
      ctx.save();
      const prevComp = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = 'screen';
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      const w = length, h = thickness;
      const r = h / 2;
      const grad = ctx.createLinearGradient(-w/2, 0, w/2, 0);
      grad.addColorStop(0.0, 'rgba(255,220,120,0.0)');
      grad.addColorStop(0.15, 'rgba(255,220,120,0.25)');
      grad.addColorStop(0.5, 'rgba(255,210,90,0.85)');
      grad.addColorStop(0.85, 'rgba(255,220,120,0.25)');
      grad.addColorStop(1.0, 'rgba(255,220,120,0.0)');
      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(255,200,90,0.6)';
      ctx.shadowBlur = 16;
      // Rounded capsule path
      ctx.beginPath();
      ctx.moveTo(-w/2 + r, -h/2);
      ctx.lineTo(w/2 - r, -h/2);
      ctx.arc(w/2 - r, 0, r, -Math.PI/2, Math.PI/2);
      ctx.lineTo(-w/2 + r, h/2);
      ctx.arc(-w/2 + r, 0, r, Math.PI/2, -Math.PI/2);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = prevComp;
      ctx.restore();
    };

    const loadImage = (url) => new Promise((resolve) => {
      if (!url) return resolve(null);
      const i = new Image();
      i.crossOrigin = 'anonymous';
      i.onload = () => resolve(i);
      i.onerror = () => resolve(null);
      i.src = url;
    });

    (async () => {
      // Make sure the Jost font is loaded before drawing the PTS label
      try {
        if (document.fonts && document.fonts.load) {
          await Promise.all([
            document.fonts.load('200 65px Jost'),
            document.fonts.load('300 65px Jost'),
            document.fonts.load('700 600px Oswald'),
            document.fonts.load('800 40px Saira'),
            document.fonts.load('italic 800 40px Saira'),
            document.fonts.load('700 40px Saira'),
            document.fonts.load('italic 700 40px Saira'),
          ]);
        }
      } catch (_) { /* ignore font load issues */ }

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
        ctx.font = `italic 800 ${trySize}px Saira, Inter, system-ui, Arial`;
        if (ctx.measureText(header).width <= maxHeaderWidth) break;
        trySize -= 2;
      }
      ctx.font = `italic 800 ${trySize}px Saira, Inter, system-ui, Arial`;
      if (header) {
        ctx.fillText(header, W / 2, headerY);
        // Decorative gold divider lines
        const hw = ctx.measureText(header).width;
        const lineLen = 70; const gap = 18;
        ctx.strokeStyle = '#D9B24C';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo((W/2) - hw/2 - gap, headerY);
        ctx.lineTo((W/2) - hw/2 - gap - lineLen, headerY);
        ctx.moveTo((W/2) + hw/2 + gap, headerY);
        ctx.lineTo((W/2) + hw/2 + gap + lineLen, headerY);
        ctx.stroke();
      }

      // date text (no box), 2x size, white
      if (dateStr) {
        const centerX = L.datePill?.x ?? W / 2;
        const dateY = (L.datePill?.y ?? 132) + 18; // align with previous pill center
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'italic 700 40px Saira, Inter, system-ui, Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(dateStr, centerX, dateY);
      }

      const p = (players && players.length > 0) ? players[0] : null;

      // Minimal stat row (scaled 2x, centered, gold color)
      const drawStat = (x, y, label, value, big = false) => {
        ctx.textAlign = 'center';

        if (big) {
          // Huge centered value (gold gradient) with the label stacked vertically to its right
          const valueSize = 600;
          const valueStr = String(value);
          ctx.textBaseline = 'middle';
          ctx.font = `700 ${valueSize}px Oswald, Inter, system-ui, Arial`;

          // Flat shiny red number
          const grad = ctx.createLinearGradient(0, y - valueSize * 0.5, 0, y + valueSize * 0.55);
          grad.addColorStop(0, '#c5161a');
          grad.addColorStop(0.42, '#7e0608');
          grad.addColorStop(0.5, '#b51519');
          grad.addColorStop(0.58, '#5e0204');
          grad.addColorStop(1, '#3d0102');
          ctx.fillStyle = grad;
          ctx.fillText(valueStr, x, y);

          // Vertical label (always "PTS") to the right of the number — ITC Avant Garde Gothic Extra Light style
          const valueWidth = ctx.measureText(valueStr).width;
          const letters = 'PTS'.split('');
          const letterSize = 65;
          ctx.font = `200 ${letterSize}px Jost, "Century Gothic", system-ui, Arial`;
          ctx.textAlign = 'left';
          const lx = x + valueWidth / 2 + 24;
          const lh = letterSize * 0.92;
          const startY = y - ((letters.length - 1) * lh) / 2;
          const lgrad = makeGoldGradient(startY - letterSize, startY + letters.length * lh);
          letters.forEach((ch, i) => {
            ctx.fillStyle = lgrad;
            ctx.strokeStyle = goldStroke;
            ctx.lineWidth = 5;
            ctx.strokeText(ch, lx, startY + i * lh);
            ctx.fillText(ch, lx, startY + i * lh);
          });
          ctx.textAlign = 'center';
          return;
        }

        // Label (white with subtle stroke)
        ctx.textBaseline = 'alphabetic';
        ctx.font = '800 30px Inter, system-ui, Arial';
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 2;
        ctx.strokeText(label.toUpperCase(), x, y - 28);
        ctx.fillText(label.toUpperCase(), x, y - 28);

        // Value (gold gradient with stroke and glow)
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 6;
        ctx.font = 'italic 900 86px Inter, system-ui, Arial';
        const grad = makeGoldGradient(y - 40, y + 60);
        ctx.fillStyle = grad;
        ctx.strokeStyle = goldStroke;
        ctx.lineWidth = 3;
        ctx.strokeText(String(value), x, y + 40);
        ctx.fillText(String(value), x, y + 40);
        ctx.shadowBlur = 0;
      };

      // Smart stat layout (evenly spaced across safe width) - hide zero values and center remaining
      const rawStats = getSportStatsConfig(game.sport, p) || [];
      const statsConf = rawStats.filter(s => s && Number(s.value) !== 0);

      // Place stats just below the date with clean spacing
      const dateCenterY = (L.datePill?.y ?? 132) + 18; // matches date rendering center
      const defaultOffset = L.stats?.offset ?? 90; // spacing below date
      const y = dateCenterY + defaultOffset;

      // Big PTS mode: when points is the only non-zero stat, render it huge behind the player
      const bigPts = statsConf.length === 1 && /^(PTS|POINTS|PTS\.)$/i.test(String(statsConf[0]?.label || '').trim());

      if (bigPts) {
        // Draw the oversized number vertically centered on the player image; headshot is drawn afterwards on top of it
        drawStat(W / 2, H * 0.52, statsConf[0].label, statsConf[0].value, true);
      } else if (statsConf.length > 0) {
        const safeL = 80; const safeR = 80; const usable = W - safeL - safeR;
        const count = statsConf.length;
        const spacingFactor = 0.7; // tighter spacing between stats
        const step = count === 1 ? 0 : (usable / (count - 1)) * spacingFactor;

        const totalSpan = count === 1 ? 0 : (count - 1) * step;
        const startX = (W / 2) - (totalSpan / 2);
        for (let i = 0; i < count; i++) {
          const x = count === 1 ? W / 2 : startX + i * step;
          const s = statsConf[i];
          if (s) drawStat(x, y, s.label, s.value);
        }
      }

      // Position headshot closer to stats while keeping comfortable spacing
      const bestTitleY = L.bestTitle?.y ?? 950;
      const nameY = L.nameLabel?.y ?? (bestTitleY - 70); // player name stays above BEST PLAYER
      const teamLabelY = (L.nameLabel?.y ?? ((L.bestTitle?.y ?? 950) - 70)) - 56; // team label sits above name
      const anchorTopY = y; // stats row center
      const anchorBottomY = teamLabelY; // team name center
      const HEADSHOT_BIAS_TOWARDS_STATS = L.headshot?.biasTowardsStats ?? 0.35; // 0 (at stats) .. 1 (at team label) — pushed further down
      const midY = Math.round(anchorTopY + (anchorBottomY - anchorTopY) * HEADSHOT_BIAS_TOWARDS_STATS);

      if (headImg) {
        const HEAD_SCALE = ((L.headshot?.scale ?? 2) * 1.4175 * 1.3 * 0.8 * 0.85); // additional 15% reduction
        const MIN_GAP_FROM_STATS = L.headshot?.minGapFromStats ?? 56; // even larger safe gap below stats to avoid overlap
        const freeMove = L.headshot?.freeMove ?? true;
        const poly = freeMove ? null : L.headshot?.polygon;
        if (Array.isArray(poly) && poly.length >= 3) {
          const xs = poly.map(p=>p.x), ys = poly.map(p=>p.y);
          const minX = Math.min(...xs), maxX = Math.max(...xs);
          const minY = Math.min(...ys), maxY = Math.max(...ys);
          const bw = maxX - minX, bh = maxY - minY;
          const curCenterY = minY + bh/2;
          const deltaY = midY - curCenterY;
          const curCenterX = minX + bw / 2;
          const deltaX = (W / 2) - curCenterX;
          // Halo behind headshot (polygon mode)
          const swirlX = W / 2;
          drawSwirlHalo(W / 2, midY, Math.max(bw, bh) * 0.65);

          // Draw headshot without clipping; fit entire image within polygon bounds (contain)
          ctx.save();
          const ar = Math.min(bw / headImg.width, bh / headImg.height) * HEAD_SCALE;
          const dw2 = headImg.width * ar; const dh2 = headImg.height * ar;
          const dx2 = minX + (bw - dw2) / 2; const dy2 = minY + (bh - dh2) / 2;
          const drawTop = dy2 + deltaY;
          const extraShift = Math.max(0, (y + MIN_GAP_FROM_STATS) - drawTop);
          ctx.translate(deltaX, deltaY + extraShift);
          // Floor glow and waist ring behind player (polygon mode)
          drawFloorGlow(minX + bw / 2, maxY + extraShift - 8, Math.max(60, bw * 0.55), 14);
          drawWaistRing(minX + bw / 2, minY + bh * 0.46 + extraShift, Math.max(80, bw * 0.62), 18, 6);
          // Ghost blur clones behind main (aligned upward like reference)
          {
            const clones = [
              { dx: 10, dy: -8,  blur: 7,  alpha: 0.25, scale: 1.03 },
              { dx: 20, dy: -16, blur: 11, alpha: 0.18, scale: 1.06 },
              { dx: 32, dy: -24, blur: 16, alpha: 0.12, scale: 1.10 },
            ];
            const prevAlpha = ctx.globalAlpha;
            const prevFilter = ctx.filter || 'none';
            clones.forEach(c => {
              ctx.globalAlpha = c.alpha;
              ctx.filter = `blur(${c.blur}px)`;
              const w = dw2 * c.scale, h = dh2 * c.scale;
              const x = dx2 - (w - dw2) / 2 + c.dx;
              const yClone = dy2 - (h - dh2) / 2 + c.dy;
              ctx.drawImage(headImg, x, yClone, w, h);
            });
            ctx.globalAlpha = 1;
            ctx.filter = prevFilter;
          }
          // Main headshot
          ctx.drawImage(headImg, dx2, dy2, dw2, dh2);
          // Foreground swoosh across waist (polygon mode)
          drawFrontStreak(minX + bw / 2, minY + bh * 0.46 + deltaY + extraShift, Math.max(180, bw * 0.95), 14, -0.1);
          ctx.restore();

          // Player name label at locked nameY
          const midX = W / 2;
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
              ctx.font = `italic 800 ${size}px Saira, Inter, system-ui, Arial`;
              if (ctx.measureText(label).width <= maxW) break;
              size -= 1;
            }
            ctx.fillText(label, midX, nameY);
          }
        } else {
          const cx = L.headshot?.cx ?? (W / 2); const r = L.headshot?.r ?? 170;
          let cy = L.headshot?.cy ?? midY; // allow free vertical movement (and horizontal via cx)
          // Draw headshot without circular clipping; fit entire image within square box
          ctx.save();
          const box = r * 2;
          const ar = Math.min(box / headImg.width, box / headImg.height) * HEAD_SCALE;
          const dw2 = headImg.width * ar; const dh2 = headImg.height * ar;
          // Prefer head top close to stats with a safe gap (matches reference)
          const desiredGap = L.headshot?.gapFromStats ?? MIN_GAP_FROM_STATS; // px below stats center (defaults ~14px)
          const cyDesired = (y + desiredGap) + dh2 / 2; // center needed to place top at desired gap
          const cyPre = Math.min(cy, cyDesired); // pull upward toward target (never push down)
          const topY = cyPre - dh2 / 2; // compute from adjusted cy
          const minTop = y + MIN_GAP_FROM_STATS; // keep enough space so stats remain readable
          const cyAdjusted = topY < minTop ? (minTop + dh2 / 2) : cyPre; // snap to safe min gap if overlapping
          // Halo behind headshot (circle mode)
          drawSwirlHalo(cx, cyAdjusted, box * 0.6);
          // Ghost blur clones behind main (circle mode)
          {
            const centerX = cx, centerY = cyAdjusted;
            // Floor glow and waist ring behind player (circle mode)
            drawFloorGlow(centerX, centerY + dh2 / 2 - 10, Math.max(60, dw2 * 0.45), 14);
            drawWaistRing(centerX, centerY + dh2 * 0.05, Math.max(80, dw2 * 0.50), 16, 6);
            const clones = [
              { dx: -12, dy: -10, blur: 6,  alpha: 0.25, scale: 1.03 },
              { dx:  14, dy:  -6, blur: 10, alpha: 0.18, scale: 1.06 },
              { dx:  -6, dy:  12, blur: 14, alpha: 0.12, scale: 1.10 },
            ];
            const prevAlpha = ctx.globalAlpha;
            const prevFilter = ctx.filter || 'none';
            clones.forEach(c => {
              ctx.globalAlpha = c.alpha;
              ctx.filter = `blur(${c.blur}px)`;
              const w = dw2 * c.scale, h = dh2 * c.scale;
              const x = centerX - w / 2 + c.dx;
              const yClone = centerY - h / 2 + c.dy;
              ctx.drawImage(headImg, x, yClone, w, h);
            });
            ctx.globalAlpha = 1;
            ctx.filter = prevFilter;
          }
          // Main headshot (no clipping boundary — free to move within canvas)
          ctx.drawImage(headImg, cx - dw2 / 2, cyAdjusted - dh2 / 2, dw2, dh2);
          // Foreground swoosh across waist (circle mode)
          drawFrontStreak(cx, cyAdjusted + dh2 * 0.05, Math.max(180, dw2 * 0.95), 14, 0.08);
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
              ctx.font = `italic 800 ${size}px Saira, Inter, system-ui, Arial`;
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
      let bestSize = L.bestTitle?.fontSize ?? 72;
      const bestY = L.bestTitle?.y ?? 950;
      // Auto-fit BEST PLAYER with italic heavy font and gold gradient
      const bestText = 'BEST PLAYER';
      let s = bestSize; const maxBestW = W - 2 * 120;
      while (s >= 28) {
        ctx.font = `italic 800 ${s}px Saira, Inter, system-ui, Arial`;
        if (ctx.measureText(bestText).width <= maxBestW) break;
        s -= 2;
      }
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 8;
      const gradBest = makeGoldGradient(bestY - s, bestY + s/2);
      ctx.strokeStyle = goldStroke; ctx.lineWidth = 4;
      ctx.strokeText(bestText, W / 2, bestY);
      ctx.fillStyle = gradBest;
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
        ctx.font = 'italic 700 24px Saira, Inter, system-ui, Arial';
        ctx.fillStyle = '#ffffff';
        const teamY = teamLabelY; // keep equal spacing reference
        ctx.fillText(bestTeamName, W / 2, teamY);
      }

      // Render custom editable elements (text boxes)
      if (Array.isArray(L.elements)) {
        L.elements.forEach((el) => {
          if (el.type === 'text' && el.text) {
            ctx.save();
            const x = el.x ?? W/2;
            const yEl = el.y ?? H/2;
            const rot = (el.rotation || 0) * Math.PI / 180;
            ctx.translate(x, yEl);
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
          ctx.font = `italic 700 ${s}px Saira, Inter, system-ui, Arial`;
          if (ctx.measureText(text).width <= maxWidth) return s;
          s -= 1;
        }
        return minSize;
      };

      // Left name area: from margin 24 to leftX - 30
      const leftMaxWidth = Math.max(40, (leftX - 30) - 24);
      const leftName = String(homeName || 'HOME').toUpperCase();
      const leftSize = fitText(leftName, leftMaxWidth);
      ctx.font = `italic 700 ${leftSize}px Saira, Inter, system-ui, Arial`;
      ctx.textAlign = 'right';
      ctx.fillText(leftName, leftX - 20, yScore);

      // Draw scores and VS centered cluster
      const drawScoreBox = (x, yVal, text, highlight) => {
        ctx.font = 'italic 800 22px Saira, Inter, system-ui, Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = highlight ? '#facc15' : '#ffffff';
        const wBox = ctx.measureText(text).width + pad * 2;
        ctx.fillText(text, x + wBox / 2, yVal);
        return wBox;
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
      ctx.font = `italic 700 ${rightSize}px Saira, Inter, system-ui, Arial`;
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