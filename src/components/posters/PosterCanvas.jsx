import React, { useEffect, useRef, useState } from 'react';

// Simple canvas composer that overlays game info and top player stats on the background
export default function PosterCanvas({ backgroundUrl, game, players, onReady }) {
  const canvasRef = useRef(null);
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    if (!backgroundUrl || !game || !players?.length) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Target IG portrait size; scale by DPR for sharpness
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const W = 1080;
    const H = 1350;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(DPR, DPR);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Cover background
      const iw = img.width;
      const ih = img.height;
      const scale = Math.max(W / iw, H / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (W - dw) / 2;
      const dy = (H - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);

      // Dark vignette for readability
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, 'rgba(0,0,0,0.35)');
      grad.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Header: Teams vs, division, date
      const dateStr = game.game_date ? new Date(game.game_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';

      // Title
      ctx.font = 'bold 64px Inter, system-ui, Arial';
      ctx.fillText(`${game.home_team_name} vs ${game.away_team_name}`, W / 2, 140);

      // Subheader line
      ctx.font = '500 28px Inter, system-ui, Arial';
      const sub = [game.division || null, dateStr || null, game.location || null].filter(Boolean).join(' • ');
      if (sub) ctx.fillText(sub, W / 2, 185);

      // Divider
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W * 0.2, 210);
      ctx.lineTo(W * 0.8, 210);
      ctx.stroke();

      // Featured players panel
      const panelX = 90;
      const panelY = 260;
      const panelW = W - 180;
      const rowH = 56;
      const maxShow = Math.min(players.length, 5);

      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(panelX - 20, panelY - 50, panelW + 40, maxShow * rowH + 110);

      ctx.fillStyle = '#ffffff';
      ctx.font = '600 36px Inter, system-ui, Arial';
      ctx.textAlign = 'left';
      ctx.fillText('Featured Players', panelX, panelY - 10);

      ctx.font = '500 28px Inter, system-ui, Arial';
      for (let i = 0; i < maxShow; i++) {
        const p = players[i];
        const y = panelY + i * rowH + 40;
        const name = `${p.first_name || ''} ${p.last_name || ''}`.trim();
        const jersey = p.jersey_number ? `#${p.jersey_number}` : '';
        let line = `${name} ${jersey}`.trim();
        if (game.sport === 'basketball') {
          line += ` • ${p.points || 0} PTS  ${p.rebounds || 0} REB  ${p.assists || 0} AST`;
        } else {
          line += ` • ${p.attacks || 0} ATK  ${p.blocks || 0} BLK  ${p.aces || 0} ACE`;
        }
        ctx.fillText(line, panelX, y);
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
        // Likely CORS taint; still render on-screen
        setDataUrl('');
        onReady && onReady('');
      }
    };
    img.onerror = () => {
      onReady && onReady('');
    };
    img.src = backgroundUrl;
  }, [backgroundUrl, game, players, onReady]);

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