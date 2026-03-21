import React, { useEffect, useRef, useState } from 'react';

// Canvas composer that overlays org logo/info and the single best player's headshot + stats
export default function PosterCanvas({ backgroundUrl, game, players, org, bestPlayerImageUrl, homeName, awayName, onReady }) {
  const canvasRef = useRef(null);
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    if (!backgroundUrl || !game || !players?.length) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const W = 1080;
    const H = 1350;
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
      const [bgImg, logoImg, headImg] = await Promise.all([
        loadImage(backgroundUrl),
        loadImage(org?.logo_url),
        loadImage(bestPlayerImageUrl || players?.[0]?.photo_url)
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

      // Vignette
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, 'rgba(0,0,0,0.25)');
      grad.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Org logo/info box top-left (always show org info)
      {
        const boxW = 260; const boxH = 86; const pad = 14; const r = 14;
        const x = W - boxW - 24; const y = 24;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + boxW, y, x + boxW, y + boxH, r);
        ctx.arcTo(x + boxW, y + boxH, x, y + boxH, r);
        ctx.arcTo(x, y + boxH, x, y, r);
        ctx.arcTo(x, y, x + boxW, y, r);
        ctx.closePath();
        ctx.fill();
        const lh = boxH - pad * 2;
        const lw = logoImg ? lh : 0;
        if (logoImg) ctx.drawImage(logoImg, x + pad, y + pad, lw, lh);
        ctx.fillStyle = '#0f172a';
        ctx.font = '700 20px Inter, system-ui, Arial';
        const name = org?.name || '';
        ctx.fillText(name, x + pad + lw + 10, y + 34);
        ctx.font = '500 14px Inter, system-ui, Arial';
        const tname = org?.tournament_name || '';
        if (tname) ctx.fillText(tname, x + pad + lw + 10, y + 58);
      }

      // Header (tournament/division) + date pill
      const dateObj = game.game_date ? new Date(game.game_date) : null;
      const dateStr = dateObj ? dateObj.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase() : '';
      const header = [org?.tournament_name || org?.name || '', game.division || '']
        .filter(Boolean).join(' • ').toUpperCase();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = '800 32px Inter, system-ui, Arial';
      if (header) ctx.fillText(header, W / 2, 110);
      // date pill
      if (dateStr) {
        const padX = 16, padY = 8; ctx.font = '700 20px Inter, system-ui, Arial';
        const tw = ctx.measureText(dateStr).width;
        const bw = tw + padX * 2, bh = 36; const x = 40, y = 132, r = 8;
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + bw, y, x + bw, y + bh, r);
        ctx.arcTo(x + bw, y + bh, x, y + bh, r);
        ctx.arcTo(x, y + bh, x, y, r);
        ctx.arcTo(x, y, x + bw, y, r);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#111827'; ctx.textAlign = 'left';
        ctx.fillText(dateStr, x + padX, y + bh - 10);
      }

      const p = players[0];

      // Minimal stat row
      const drawStat = (x, y, label, value) => {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#e5e7eb';
        ctx.font = '600 14px Inter, system-ui, Arial';
        ctx.fillText(label.toUpperCase(), x, y);
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 36px Inter, system-ui, Arial';
        ctx.fillText(String(value), x, y + 34);
      };

      if (game.sport === 'basketball') {
        const stats = [
          ['Points', p.points || 0],
          ['Rebounds', p.rebounds || 0],
          ['Assists', p.assists || 0],
        ];
        const startX = 80, gapX = 260, y = 520;
        stats.forEach((s, i) => drawStat(startX + i * gapX, y, s[0], s[1]));
      } else {
        const stats = [
          ['Attacks', p.attacks || 0],
          ['Blocks', p.blocks || 0],
          ['Aces', p.aces || 0],
        ];
        const startX = 80, gapX = 260, y = 520;
        stats.forEach((s, i) => drawStat(startX + i * gapX, y, s[0], s[1]));
      }

      // Headshot centered
      if (headImg) {
        const cx = W / 2; const cy = 680; const r = 130;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
        const ar = Math.max((r * 2) / headImg.width, (r * 2) / headImg.height);
        const dw2 = headImg.width * ar; const dh2 = headImg.height * ar;
        ctx.drawImage(headImg, cx - dw2 / 2, cy - dh2 / 2, dw2, dh2);
        ctx.restore();
      }

      // BEST PLAYER heading
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 72px Inter, system-ui, Arial';
      ctx.fillText('BEST PLAYER', W / 2, 950);

      // Final Score row
      const hs = Number(game.home_score || 0), as = Number(game.away_score || 0);
      const homeWins = hs >= as;
      const center = W / 2; const yScore = 1030;
      ctx.font = '700 28px Inter, system-ui, Arial'; ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(String(homeName || 'HOME').toUpperCase(), center - 140, yScore);
      const drawScoreBox = (x, y, text, highlight) => {
        const h = 44; const r = 8; ctx.font = '800 22px Inter, system-ui, Arial';
        const tw = ctx.measureText(text).width + 24; const bh = h; const bw = tw; const yy = y - h + 6;
        if (highlight) {
          ctx.fillStyle = '#facc15';
          ctx.beginPath(); ctx.moveTo(x, yy); ctx.arcTo(x + bw, yy, x + bw, yy + bh, r);
          ctx.arcTo(x + bw, yy + bh, x, yy + bh, r); ctx.arcTo(x, yy + bh, x, yy, r); ctx.arcTo(x, yy, x + bw, yy, r);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#111827'; ctx.textAlign = 'center';
        } else {
          ctx.beginPath(); ctx.moveTo(x, yy); ctx.arcTo(x + bw, yy, x + bw, yy + bh, r);
          ctx.arcTo(x + bw, yy + bh, x, yy + bh, r); ctx.arcTo(x, yy + bh, x, yy, r); ctx.arcTo(x, yy, x + bw, yy, r);
          ctx.closePath();
          ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
        }
        ctx.fillText(text, x + bw / 2, yScore);
        return bw;
      };
      const bw1 = drawScoreBox(center - 110, yScore, String(hs), homeWins);
      ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.font = '800 18px Inter, system-ui, Arial';
      ctx.fillText('VS', center, yScore);
      const bw2 = drawScoreBox(center + 20, yScore, String(as), !homeWins);
      ctx.textAlign = 'left'; ctx.font = '700 28px Inter, system-ui, Arial'; ctx.fillStyle = '#ffffff';
      ctx.fillText(String(awayName || 'AWAY').toUpperCase(), center + 140, yScore);
      // Final score label
      ctx.textAlign = 'left'; ctx.font = '600 16px Inter, system-ui, Arial'; ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText('FINAL SCORE', 40, yScore - 28);

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
  }, [backgroundUrl, game, players, org, bestPlayerImageUrl, homeName, awayName, onReady]);

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', borderRadius: 12 }} />
      {dataUrl && (
        <a href={dataUrl} download={`poster_${game?.id || 'game'}.png`} className="inline-block">
          <button className="px-4 py-2 rounded-md border">Download Final Poster</button>
        </a>
      )}
    </div>
  );
}