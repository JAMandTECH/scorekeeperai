// Renders the "Best Player" (MVP award) poster style:
// golden arena spotlight, a metallic MVP headline with a crown, a division plaque,
// one central hero cutout over ghosted action layers, gold-bordered stat modules
// stacked down the right side, and a metallic name plate across the bottom.
//
// Draws onto an existing 2D context already scaled for the logical W x H canvas.

const loadImage = (url) =>
  new Promise((resolve) => {
    if (!url) return resolve(null);
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => resolve(i);
    i.onerror = () => resolve(null);
    i.src = url;
  });

const hexToRgb = (hex) => {
  const m = /^#?([a-f\d]{6}|[a-f\d]{3})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const rgbaOf = (hex, alpha) => {
  const c = hexToRgb(hex);
  return c ? `rgba(${c[0]},${c[1]},${c[2]},${alpha})` : `rgba(255,255,255,${alpha})`;
};

// Brand colours that are too dark kill the screen-blended light wash, so fall back.
const safeAccent = (value, fallback) => {
  const c = hexToRgb(value);
  if (!c) return fallback;
  const lum = (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
  return lum < 0.35 ? fallback : String(value);
};

const goldGradient = (ctx, y0, y1) => {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#FFF7D2');
  g.addColorStop(0.30, '#FFD24A');
  g.addColorStop(0.55, '#E0A521');
  g.addColorStop(0.80, '#9A6B0C');
  g.addColorStop(1, '#6B4705');
  return g;
};

const silverGradient = (ctx, y0, y1) => {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#FFFFFF');
  g.addColorStop(0.26, '#F3F4F8');
  g.addColorStop(0.50, '#C0C1CD');
  g.addColorStop(0.72, '#7C7D8A');
  g.addColorStop(1, '#3C3D48');
  return g;
};

const trackedWidth = (widths, tracking) =>
  widths.reduce((sum, w) => sum + w, 0) + tracking * Math.max(0, widths.length - 1);

const drawTracked = (ctx, text, cx, y, tracking, mode = 'fill') => {
  const chars = Array.from(String(text || ''));
  if (!chars.length) return;
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = trackedWidth(widths, tracking);
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  let x = cx - total / 2;
  chars.forEach((ch, i) => {
    if (mode === 'stroke') ctx.strokeText(ch, x, y);
    else ctx.fillText(ch, x, y);
    x += widths[i] + tracking;
  });
  ctx.textAlign = prevAlign;
};

// Shrinks a size until the tracked text fits maxWidth; returns the fitted size.
const fitTracked = (ctx, text, fontFor, size, tracking, maxWidth, minSize = 12) => {
  let s = size;
  const chars = Array.from(String(text || ''));
  ctx.font = fontFor(s);
  let widths = chars.map((ch) => ctx.measureText(ch).width);
  while (s > minSize && trackedWidth(widths, tracking) > maxWidth) {
    s -= 1;
    ctx.font = fontFor(s);
    widths = chars.map((ch) => ctx.measureText(ch).width);
  }
  return s;
};

// Fits a cutout into the box and dissolves its bottom edge so it sits on the stage
// instead of reading as a pasted rectangle.
const fadeBottom = (img, boxW, boxH, fadeFrom = 0.74) => {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(boxW));
  c.height = Math.max(2, Math.round(boxH));
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  const s = Math.min(c.width / img.width, c.height / img.height);
  const dw = img.width * s;
  const dh = img.height * s;
  g.drawImage(img, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh);
  g.globalCompositeOperation = 'destination-in';
  const lg = g.createLinearGradient(0, 0, 0, c.height);
  lg.addColorStop(0, 'rgba(0,0,0,1)');
  lg.addColorStop(fadeFrom, 'rgba(0,0,0,1)');
  lg.addColorStop(0.93, 'rgba(0,0,0,0.55)');
  lg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = lg;
  g.fillRect(0, 0, c.width, c.height);
  return c;
};

// Simple three-peak crown, used above the MVP headline and above the name plate.
const drawCrown = (ctx, cx, cy, w) => {
  const h = w * 0.70;
  const left = cx - w / 2;
  const baseTop = cy + h * 0.06;
  const baseH = h * 0.32;
  const peakTop = cy - h * 0.46;
  const valley = baseTop - h * 0.14;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(left, baseTop);
  ctx.lineTo(left + w * 0.18, peakTop);
  ctx.lineTo(left + w * 0.33, valley);
  ctx.lineTo(cx, peakTop - h * 0.10);
  ctx.lineTo(left + w * 0.67, valley);
  ctx.lineTo(left + w * 0.82, peakTop);
  ctx.lineTo(left + w, baseTop);
  ctx.lineTo(left + w, baseTop + baseH);
  ctx.lineTo(left, baseTop + baseH);
  ctx.closePath();
  ctx.fillStyle = goldGradient(ctx, cy - h * 0.6, cy + h * 0.5);
  ctx.fill();
  ctx.lineWidth = Math.max(1.4, w * 0.014);
  ctx.strokeStyle = '#5A3D04';
  ctx.stroke();
  // tip jewels
  [[left + w * 0.18, peakTop], [cx, peakTop - h * 0.10], [left + w * 0.82, peakTop]].forEach(([px, py]) => {
    ctx.beginPath();
    ctx.arc(px, py, Math.max(1.6, w * 0.028), 0, Math.PI * 2);
    ctx.fillStyle = '#FFF3C4';
    ctx.fill();
  });
  ctx.restore();
};

// Extruded metallic text: dark depth stack, gradient front face, top bevel, outline.
const drawMetalText = (ctx, text, cx, y, size, tracking, gradient) => {
  const depth = Math.max(6, Math.round(size * 0.20));
  for (let d = depth; d >= 1; d--) {
    const t = d / depth;
    ctx.fillStyle = `rgb(${Math.round(140 - 96 * t)},${Math.round(142 - 96 * t)},${Math.round(156 - 104 * t)})`;
    drawTracked(ctx, text, cx + d * 1.25, y + d * 1.6, tracking);
  }
  ctx.fillStyle = gradient;
  drawTracked(ctx, text, cx, y, tracking);
  const bevel = ctx.createLinearGradient(0, y - size * 0.52, 0, y - size * 0.04);
  bevel.addColorStop(0, 'rgba(255,255,255,0.85)');
  bevel.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = bevel;
  drawTracked(ctx, text, cx, y - size * 0.035, tracking);
  ctx.lineWidth = Math.max(2, size * 0.032);
  ctx.strokeStyle = 'rgba(22,22,30,0.85)';
  drawTracked(ctx, text, cx, y, tracking, 'stroke');
};

export async function renderBestPlayer({
  ctx,
  W,
  H,
  backgroundUrl,
  playerPhotoUrl,
  logoUrl,
  orgName,
  titleStr,
  plaqueStr,
  playerName,
  jerseyStr,
  teamName,
  stats = [],
  dateStr,
  locationStr,
  accent,
}) {
  const ACCENT = safeAccent(accent, '#d4af37');

  const [bgImg, logoImg, playerImg] = await Promise.all([
    loadImage(backgroundUrl),
    loadImage(logoUrl),
    loadImage(playerPhotoUrl),
  ]);

  const cx = W / 2;

  // ── base + arena photo ────────────────────────────────────────────────
  ctx.fillStyle = '#07070b';
  ctx.fillRect(0, 0, W, H);
  if (bgImg) {
    const s = Math.max(W / bgImg.width, H / bgImg.height);
    ctx.drawImage(bgImg, (W - bgImg.width * s) / 2, (H - bgImg.height * s) / 2, bgImg.width * s, bgImg.height * s);
  }

  // ── golden stage lighting ─────────────────────────────────────────────
  const flare = (x, y, radius, color, alpha) => {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, rgbaOf(color, alpha));
    g.addColorStop(0.55, rgbaOf(color, alpha * 0.34));
    g.addColorStop(1, rgbaOf(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const streak = (x, y, length, thickness, rotation, color, alpha) => {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.translate(x, y);
    ctx.rotate(rotation);
    const g = ctx.createLinearGradient(-length / 2, 0, length / 2, 0);
    g.addColorStop(0, rgbaOf(color, 0));
    g.addColorStop(0.5, rgbaOf(color, alpha));
    g.addColorStop(1, rgbaOf(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, length / 2, thickness / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  flare(W * 0.46, H * 0.44, Math.max(W, H) * 0.60, '#ffd76a', 0.30);
  flare(W * 0.46, H * 0.79, W * 0.56, ACCENT, 0.13);
  streak(W * 0.28, H * 0.19, W * 0.74, 26, -0.34, '#ffe9a8', 0.5);
  streak(W * 0.76, H * 0.23, W * 0.62, 20, 0.30, ACCENT, 0.45);

  // Frame: darken top for the header band and the outer edges
  const vig = ctx.createLinearGradient(0, 0, 0, H);
  vig.addColorStop(0, 'rgba(4,4,8,0.86)');
  vig.addColorStop(0.24, 'rgba(4,4,8,0.20)');
  vig.addColorStop(0.60, 'rgba(4,4,8,0.14)');
  vig.addColorStop(1, 'rgba(4,4,8,0.72)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  const edge = ctx.createLinearGradient(0, 0, W, 0);
  edge.addColorStop(0, 'rgba(0,0,0,0.52)');
  edge.addColorStop(0.40, 'rgba(0,0,0,0)');
  edge.addColorStop(0.60, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(0,0,0,0.52)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, W, H);

  // ── header lockup ─────────────────────────────────────────────────────
  const logoY = H * 0.048;
  const logoMaxH = H * 0.058;
  const logoMaxW = W * 0.28;
  const yOrg = H * 0.095;

  ctx.save();
  ctx.textBaseline = 'middle';
  if (logoImg) {
    const s = Math.min(logoMaxW / logoImg.width, logoMaxH / logoImg.height);
    const dw = logoImg.width * s;
    const dh = logoImg.height * s;
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = 16;
    ctx.drawImage(logoImg, cx - dw / 2, logoY - dh / 2, dw, dh);
    ctx.shadowBlur = 0;
  }
  if (orgName) {
    const upper = String(orgName).toUpperCase();
    const size = Math.round(H * 0.016);
    const fitted = fitTracked(ctx, upper, (sz) => `800 ${sz}px Saira, Inter, system-ui, Arial`, size, 3, W * 0.80);
    ctx.font = `800 ${fitted}px Saira, Inter, system-ui, Arial`;
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 8;
    drawTracked(ctx, upper, cx, yOrg, 3);
    ctx.shadowBlur = 0;
  }
  ctx.restore();

  // ── MVP headline (left) + division plaque (right) ─────────────────────
  const headY = H * 0.155;
  ctx.save();
  ctx.textBaseline = 'middle';
  if (titleStr) {
    const size = Math.round(H * 0.050);
    const tracking = Math.round(size * 0.05);
    const titleCx = W * 0.255;
    const fitted = fitTracked(ctx, titleStr, (sz) => `800 ${sz}px Saira, Oswald, Inter, system-ui, Arial`, size, tracking, W * 0.47);
    ctx.font = `800 ${fitted}px Saira, Oswald, Inter, system-ui, Arial`;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 14;
    drawCrown(ctx, titleCx, headY - fitted * 0.80, fitted * 1.02);
    drawMetalText(ctx, titleStr, titleCx, headY, fitted, tracking, silverGradient(ctx, headY - fitted * 0.52, headY + fitted * 0.58));
  }
  ctx.restore();

  if (plaqueStr) {
    const plaqueCx = W * 0.790;
    const plaqueW = W * 0.345;
    const plaqueH = H * 0.044;
    const skew = plaqueH * 0.30;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(plaqueCx - plaqueW / 2 + skew, headY - plaqueH / 2);
    ctx.lineTo(plaqueCx + plaqueW / 2, headY - plaqueH / 2);
    ctx.lineTo(plaqueCx + plaqueW / 2 - skew, headY + plaqueH / 2);
    ctx.lineTo(plaqueCx - plaqueW / 2, headY + plaqueH / 2);
    ctx.closePath();
    ctx.shadowColor = 'rgba(255,205,90,0.45)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = goldGradient(ctx, headY - plaqueH / 2, headY + plaqueH / 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(2, plaqueH * 0.07);
    ctx.strokeStyle = '#5A3D04';
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const maxTextW = plaqueW - Math.abs(skew) * 2 - 24;
    const size = fitTracked(ctx, plaqueStr, (sz) => `800 ${sz}px Saira, Inter, system-ui, Arial`, Math.round(plaqueH * 0.52), 2, maxTextW, 10);
    ctx.font = `800 ${size}px Saira, Inter, system-ui, Arial`;
    ctx.fillStyle = '#26190A';
    drawTracked(ctx, plaqueStr, plaqueCx - skew / 2, headY, 2);
    ctx.restore();
  }

  // ── ghosted action layers behind the hero ─────────────────────────────
  const drawGhost = (img, x, y, boxW, boxH, alpha, blur) => {
    if (!img) return;
    const s = Math.min(boxW / img.width, boxH / img.height);
    const dw = img.width * s;
    const dh = img.height * s;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.filter = `grayscale(0.55) blur(${blur}px)`;
    ctx.drawImage(img, x - dw / 2, y - dh / 2, dw, dh);
    ctx.filter = 'none';
    ctx.restore();
  };

  const ghostW = W * 0.30;
  const ghostH = H * 0.33;
  drawGhost(playerImg, W * 0.185, H * 0.600, ghostW, ghostH, 0.22, 5);
  drawGhost(playerImg, W * 0.825, H * 0.570, ghostW, ghostH, 0.17, 7);

  // ── hero cutout ───────────────────────────────────────────────────────
  const heroBoxW = W * 0.52;
  const heroBoxH = H * 0.585;
  const heroCx = W * 0.455;
  const heroBottom = H * 0.782;
  const heroCy = heroBottom - heroBoxH / 2;

  // stage floor glow under the hero
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const floor = ctx.createRadialGradient(heroCx, heroBottom, 0, heroCx, heroBottom, heroBoxW * 0.55);
  floor.addColorStop(0, rgbaOf(ACCENT, 0.5));
  floor.addColorStop(0.6, rgbaOf(ACCENT, 0.18));
  floor.addColorStop(1, rgbaOf(ACCENT, 0));
  ctx.fillStyle = floor;
  ctx.beginPath();
  ctx.ellipse(heroCx, heroBottom, heroBoxW * 0.55, H * 0.026, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (playerImg) {
    const faded = fadeBottom(playerImg, heroBoxW, heroBoxH);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 28;
    ctx.drawImage(faded, heroCx - heroBoxW / 2, heroCy - heroBoxH / 2, heroBoxW, heroBoxH);
    ctx.restore();
  } else {
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(heroCx, heroCy, Math.min(heroBoxW, heroBoxH) * 0.28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(H * 0.018)}px Inter, system-ui, Arial`;
    drawTracked(ctx, 'PLAYER PHOTO', heroCx, heroCy, 3);
    ctx.restore();
  }

  // ── bottom scrim for the name plate ───────────────────────────────────
  const scrim = ctx.createLinearGradient(0, H * 0.66, 0, H);
  scrim.addColorStop(0, 'rgba(5,5,8,0)');
  scrim.addColorStop(0.36, 'rgba(5,5,8,0.62)');
  scrim.addColorStop(0.72, 'rgba(4,4,6,0.92)');
  scrim.addColorStop(1, 'rgba(3,3,5,0.98)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, H * 0.66, W, H * 0.34);

  // ── stat modules (right, in front of the hero) ────────────────────────
  const cardCx = W * 0.815;
  const cardW = W * 0.245;
  const cardH = H * 0.074;
  const cardGap = H * 0.026;
  const cardsTop = H * 0.398;

  (stats || []).slice(0, 3).forEach((stat, i) => {
    const cyCard = cardsTop + cardH / 2 + i * (cardH + cardGap);
    const top = cyCard - cardH / 2;
    const left = cardCx - cardW / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 18;
    const g = ctx.createLinearGradient(0, top, 0, top + cardH);
    g.addColorStop(0, 'rgba(16,16,20,0.94)');
    g.addColorStop(1, 'rgba(4,4,6,0.96)');
    ctx.fillStyle = g;
    ctx.fillRect(left, top, cardW, cardH);
    ctx.restore();

    ctx.save();
    ctx.lineWidth = Math.max(5, cardH * 0.085);
    ctx.strokeStyle = goldGradient(ctx, top, top + cardH);
    ctx.strokeRect(left + ctx.lineWidth / 2, top + ctx.lineWidth / 2, cardW - ctx.lineWidth, cardH - ctx.lineWidth);
    ctx.lineWidth = Math.max(1, cardH * 0.018);
    ctx.strokeStyle = 'rgba(255,240,190,0.45)';
    ctx.strokeRect(left + cardH * 0.14, top + cardH * 0.14, cardW - cardH * 0.28, cardH - cardH * 0.28);
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const valueSize = Math.round(cardH * 0.46);
    ctx.font = `800 ${valueSize}px Saira, Oswald, Inter, system-ui, Arial`;
    ctx.shadowColor = 'rgba(255,200,80,0.55)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = goldGradient(ctx, cyCard - cardH * 0.36, cyCard + cardH * 0.06);
    ctx.fillText(String(stat?.value ?? 0), cardCx, cyCard - cardH * 0.14);
    ctx.shadowBlur = 0;
    const label = String(stat?.label || '').toUpperCase();
    if (label) {
      const labelSize = Math.round(cardH * 0.19);
      const fitted = fitTracked(ctx, label, (sz) => `700 ${sz}px Inter, system-ui, Arial`, labelSize, 2, cardW - cardH * 0.4, 8);
      ctx.font = `700 ${fitted}px Inter, system-ui, Arial`;
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      drawTracked(ctx, label, cardCx, cyCard + cardH * 0.28, 2);
    }
    ctx.restore();
  });

  // ── name plate ────────────────────────────────────────────────────────
  const nameY = H * 0.798;
  const nameText = String(playerName || '').toUpperCase();

  if (nameText) {
    ctx.save();
    ctx.textBaseline = 'middle';
    const size = Math.round(H * 0.058);
    const tracking = Math.round(size * 0.04);
    const fitted = fitTracked(ctx, nameText, (sz) => `800 ${sz}px Saira, Oswald, Inter, system-ui, Arial`, size, tracking, W * 0.86);
    ctx.font = `800 ${fitted}px Saira, Oswald, Inter, system-ui, Arial`;
    drawCrown(ctx, cx, nameY - fitted * 0.86, fitted * 0.92);
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 18;
    drawMetalText(ctx, nameText, cx, nameY, fitted, tracking, silverGradient(ctx, nameY - fitted * 0.52, nameY + fitted * 0.58));
    ctx.restore();
  }

  const teamLine = [String(teamName || '').toUpperCase(), jerseyStr ? `#${jerseyStr}` : ''].filter(Boolean).join('   ');
  if (teamLine) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const size = Math.round(H * 0.019);
    const fitted = fitTracked(ctx, teamLine, (sz) => `700 ${sz}px Saira, Inter, system-ui, Arial`, size, 4, W * 0.70);
    ctx.font = `700 ${fitted}px Saira, Inter, system-ui, Arial`;
    ctx.fillStyle = goldGradient(ctx, H * 0.845, H * 0.865);
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 8;
    drawTracked(ctx, teamLine, cx, H * 0.853, 4);
    ctx.restore();
  }

  // gold hairline divider
  ctx.save();
  ctx.fillStyle = goldGradient(ctx, H * 0.876, H * 0.880);
  ctx.fillRect(cx - W * 0.16, H * 0.878, W * 0.32, 3);
  ctx.restore();

  const metaLine = [dateStr, locationStr].filter(Boolean).join('   •   ');
  if (metaLine) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const size = Math.round(H * 0.0155);
    const fitted = fitTracked(ctx, metaLine, (sz) => `600 ${sz}px Inter, system-ui, Arial`, size, 2, W * 0.84, 10);
    ctx.font = `600 ${fitted}px Inter, system-ui, Arial`;
    ctx.fillStyle = 'rgba(255,255,255,0.86)';
    drawTracked(ctx, metaLine, cx, H * 0.902, 2);
    ctx.restore();
  }

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(H * 0.0125)}px Inter, system-ui, Arial`;
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  drawTracked(ctx, 'GENERATED WITH SCOREKEEPERAI', cx, H * 0.945, 2);
  ctx.restore();
}