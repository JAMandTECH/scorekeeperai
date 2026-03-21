import React, { useEffect, useRef, useState } from 'react';

// Canvas composer that overlays org logo/info and the single best player's headshot + stats
export default function PosterCanvas({ backgroundUrl, game, players, org, bestPlayerImageUrl, onReady }) {
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
      grad.addColorStop(0, 'rgba(0,0,0,0.35)');
      grad.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Org logo/info box top-left (always show org info)
      {
        const boxW = 260; const boxH = 86; const pad = 14; const r = 14;
        const x = 24; const y = 24;
        // rounded rect
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + boxW, y, x + boxW, y + boxH, r);
        ctx.arcTo(x + boxW, y + boxH, x, y + boxH, r);
        ctx.arcTo(x, y + boxH, x, y, r);
        ctx.arcTo(x, y, x + boxW, y, r);
        ctx.closePath();
        ctx.fill();
        // logo (optional)
        const lh = boxH - pad * 2;
        const lw = logoImg ? lh : 0;
        if (logoImg) ctx.drawImage(logoImg, x + pad, y + pad, lw, lh);
        // org text
        ctx.fillStyle = '#0f172a';
        ctx.font = '700 20px Inter, system-ui, Arial';
        const name = org?.name || '';
        ctx.fillText(name, x + pad + lw + 10, y + 34);
        ctx.font = '500 14px Inter, system-ui, Arial';
        const tname = org?.tournament_name || '';
        if (tname) ctx.fillText(tname, x + pad + lw + 10, y + 58);
      }

      // Header title
      const dateStr = game.game_date ? new Date(game.game_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 64px Inter, system-ui, Arial';
      ctx.fillText(`${game.home_team_name} vs ${game.away_team_name}`, W / 2, 160);
      ctx.font = '500 28px Inter, system-ui, Arial';
      const sub = [game.division || null, dateStr || null, game.location || null].filter(Boolean).join(' • ');
      if (sub) ctx.fillText(sub, W / 2, 205);

      // Best Player section (left text + right headshot)
      const p = players[0];
      // Panel
      const panelX = 70; const panelY = 280; const panelW = W - 140; const panelH = 360;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(panelX, panelY, panelW, panelH);

      // Text
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 40px Inter, system-ui, Arial';
      ctx.fillText('Best Player', panelX + 24, panelY + 64);
      ctx.font = '800 56px Inter, system-ui, Arial';
      const name = `${p.first_name || ''} ${p.last_name || ''}`.trim();
      ctx.fillText(name, panelX + 24, panelY + 130);
      ctx.font = '600 28px Inter, system-ui, Arial';
      const jersey = p.jersey_number ? `#${p.jersey_number}` : '';
      let stats = '';
      if (game.sport === 'basketball') {
        stats = `${p.points || 0} PTS   ${p.rebounds || 0} REB   ${p.assists || 0} AST`;
      } else {
        stats = `${p.attacks || 0} ATK   ${p.blocks || 0} BLK   ${p.aces || 0} ACE`;
      }
      ctx.fillText(`${jersey}  •  ${stats}`.trim(), panelX + 24, panelY + 175);

      // Headshot on right
      if (headImg) {
        const cx = panelX + panelW - 170; // center x of circle
        const cy = panelY + panelH / 2;
        const r = 120;
        // Outer ring
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath(); ctx.arc(cx, cy, r + 8, 0, Math.PI * 2); ctx.fill();
        // Masked image
        ctx.save();
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
        const ar = Math.max((r * 2) / headImg.width, (r * 2) / headImg.height);
        const dw2 = headImg.width * ar;
        const dh2 = headImg.height * ar;
        ctx.drawImage(headImg, cx - dw2 / 2, cy - dh2 / 2, dw2, dh2);
        ctx.restore();
      }

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
  }, [backgroundUrl, game, players, org, bestPlayerImageUrl, onReady]);

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