// Renders the "Championship Matchup" poster style:
// dual-tone arena lighting, a metallic gold title, a central trophy with a VS
// badge over it, one portrait per team flanking the trophy, and a details bar
// (date / time / venue) across the bottom.
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

// Brand colors that are too dark kill the screen-blended light wash, so fall back.
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

const whiteGradient = (ctx, y0, y1) => {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#FFFFFF');
  g.addColorStop(0.55, '#EDEDF2');
  g.addColorStop(1, '#B4B4BE');
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

// Soft radial feather so a plain rectangular headshot blends into the arena
// instead of reading as a pasted box.
const featherPortrait = (img, boxW, boxH) => {
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
  const r = Math.max(c.width, c.height);
  const rg = g.createRadialGradient(c.width / 2, c.height * 0.46, Math.min(c.width, c.height) * 0.16, c.width / 2, c.height * 0.52, r * 0.72);
  rg.addColorStop(0, 'rgba(0,0,0,1)');
  rg.addColorStop(0.55, 'rgba(0,0,0,0.98)');
  rg.addColorStop(0.84, 'rgba(0,0,0,0.5)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, c.width, c.height);
  return c;
};

export async function renderChampionshipMatchup({
  ctx,
  W,
  H,
  backgroundUrl,
  homePhotoUrl,
  awayPhotoUrl,
  homeName,
  awayName,
  homePlayerName,
  awayPlayerName,
  homeJersey,
  awayJersey,
  logoUrl,
  orgName,
  headerStr,
  stageStr,
  dateStr,
  timeStr,
  locationStr,
  accentLeft,
  accentRight,
}) {
  const LEFT = safeAccent(accentLeft, '#00f2ff');
  const RIGHT = safeAccent(accentRight, '#ff007f');

  const [bgImg, logoImg, homeImg, awayImg] = await Promise.all([
    loadImage(backgroundUrl),
    loadImage(logoUrl),
    loadImage(homePhotoUrl),
    loadImage(awayPhotoUrl),
  ]);

  const cx = W / 2;

  // ── base + arena photo ────────────────────────────────────────────────
  ctx.fillStyle = '#08080c';
  ctx.fillRect(0, 0, W, H);
  if (bgImg) {
    const s = Math.max(W / bgImg.width, H / bgImg.height);
    ctx.drawImage(bgImg, (W - bgImg.width * s) / 2, (H - bgImg.height * s) / 2, bgImg.width * s, bgImg.height * s);
  }

  // ── dual-tone lighting ────────────────────────────────────────────────
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const wash = ctx.createLinearGradient(0, 0, W, 0);
  wash.addColorStop(0, rgbaOf(LEFT, 0.62));
  wash.addColorStop(0.40, rgbaOf(LEFT, 0.04));
  wash.addColorStop(0.60, rgbaOf(RIGHT, 0.04));
  wash.addColorStop(1, rgbaOf(RIGHT, 0.62));
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // Vertical vignette + darker outer edges frame the composition
  const vig = ctx.createLinearGradient(0, 0, 0, H);
  vig.addColorStop(0, 'rgba(4,4,8,0.80)');
  vig.addColorStop(0.30, 'rgba(4,4,8,0.16)');
  vig.addColorStop(0.66, 'rgba(4,4,8,0.14)');
  vig.addColorStop(1, 'rgba(4,4,8,0.88)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  const edge = ctx.createLinearGradient(0, 0, W, 0);
  edge.addColorStop(0, 'rgba(0,0,0,0.5)');
  edge.addColorStop(0.42, 'rgba(0,0,0,0)');
  edge.addColorStop(0.58, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, W, H);

  // ── layout ────────────────────────────────────────────────────────────
  const logoBandY = H * 0.069;
  const logoMaxH = H * 0.082;
  const logoMaxW = W * 0.34;
  const yOrg = H * 0.132;
  const yHeader = H * 0.168;
  const yTitle = H * 0.219;
  const titleSize = Math.round(H * 0.050);

  const trophyTop = H * 0.285;
  const trophyH = H * 0.30;
  const trophyW = Math.min(W * 0.26, trophyH * 0.78);
  const yTrophyCenter = trophyTop + trophyH * 0.46;
  const badgeR = W * 0.072;
  const yBadge = H * 0.428;

  const sideX = W * 0.205;
  const rightX = W - sideX;
  const playerCenterY = H * 0.487;
  const playerBoxW = W * 0.335;
  const playerBoxH = H * 0.395;

  const yPlate = H * 0.742;
  const plateH = H * 0.052;
  const plateW = W * 0.395;

  const yPlayerName = H * 0.808;
  const barH = H * 0.098;
  const barTop = H - barH;

  const sideGlow = (x, y, radius, color, alpha) => {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, rgbaOf(color, alpha));
    g.addColorStop(0.55, rgbaOf(color, alpha * 0.35));
    g.addColorStop(1, rgbaOf(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const streak = (x, y, length, thickness, rotation, color) => {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.translate(x, y);
    ctx.rotate(rotation);
    const g = ctx.createLinearGradient(-length / 2, 0, length / 2, 0);
    g.addColorStop(0, rgbaOf(color, 0));
    g.addColorStop(0.5, rgbaOf(color, 0.75));
    g.addColorStop(1, rgbaOf(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, length / 2, thickness / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // ── header lockup ─────────────────────────────────────────────────────
  ctx.save();
  ctx.textBaseline = 'middle';
  if (logoImg) {
    const s = Math.min(logoMaxW / logoImg.width, logoMaxH / logoImg.height);
    const dw = logoImg.width * s;
    const dh = logoImg.height * s;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = 18;
    ctx.drawImage(logoImg, cx - dw / 2, logoBandY - dh / 2, dw, dh);
    ctx.restore();
  }
  if (orgName) {
    const size = Math.round(H * 0.018);
    const fitted = fitTracked(ctx, String(orgName).toUpperCase(), (sz) => `800 ${sz}px Saira, Inter, system-ui, Arial`, size, 2, W * 0.82);
    ctx.font = `800 ${fitted}px Saira, Inter, system-ui, Arial`;
    ctx.fillStyle = whiteGradient(ctx, yOrg - fitted * 0.6, yOrg + fitted * 0.6);
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 8;
    drawTracked(ctx, String(orgName).toUpperCase(), cx, yOrg, 2);
    ctx.shadowBlur = 0;
  }
  if (headerStr) {
    const size = Math.round(H * 0.0175);
    const fitted = fitTracked(ctx, headerStr, (sz) => `700 ${sz}px Saira, Inter, system-ui, Arial`, size, 3, W * 0.82);
    ctx.font = `700 ${fitted}px Saira, Inter, system-ui, Arial`;
    ctx.fillStyle = goldGradient(ctx, yHeader - fitted * 0.7, yHeader + fitted * 0.7);
    drawTracked(ctx, headerStr, cx, yHeader, 3);
  }
  ctx.restore();

  // ── metallic title ────────────────────────────────────────────────────
  if (stageStr) {
    ctx.save();
    ctx.textBaseline = 'middle';
    const tracking = Math.round(titleSize * 0.06);
    const size = fitTracked(ctx, stageStr, (sz) => `800 ${sz}px Saira, Oswald, Inter, system-ui, Arial`, titleSize, tracking, W * 0.86);
    ctx.font = `800 ${size}px Saira, Oswald, Inter, system-ui, Arial`;

    // extruded depth
    const depth = Math.max(8, Math.round(size * 0.22));
    for (let d = depth; d >= 1; d--) {
      const t = d / depth;
      ctx.fillStyle = `rgb(${Math.round(120 - 70 * t)},${Math.round(88 - 55 * t)},${Math.round(18 - 12 * t)})`;
      drawTracked(ctx, stageStr, cx + d * 1.35, yTitle + d * 1.7, tracking);
    }
    // front face
    ctx.fillStyle = goldGradient(ctx, yTitle - size * 0.52, yTitle + size * 0.58);
    drawTracked(ctx, stageStr, cx, yTitle, tracking);
    // top bevel sheen
    ctx.fillStyle = (() => {
      const g = ctx.createLinearGradient(0, yTitle - size * 0.52, 0, yTitle - size * 0.05);
      g.addColorStop(0, 'rgba(255,255,255,0.85)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      return g;
    })();
    drawTracked(ctx, stageStr, cx, yTitle - size * 0.035, tracking);
    // crisp outline
    ctx.lineWidth = Math.max(2, size * 0.035);
    ctx.strokeStyle = 'rgba(60,38,0,0.8)';
    drawTracked(ctx, stageStr, cx, yTitle, tracking, 'stroke');
    ctx.restore();
  }

  // ── center cluster: trophy, portraits, VS badge ───────────────────────
  sideGlow(cx, yTrophyCenter, Math.max(W, H) * 0.38, '#ffd76a', 0.26);
  sideGlow(sideX, playerCenterY, W * 0.32, LEFT, 0.4);
  sideGlow(rightX, playerCenterY, W * 0.32, RIGHT, 0.4);
  streak(sideX - W * 0.04, playerCenterY + H * 0.06, W * 0.42, 16, -0.22, LEFT);
  streak(rightX + W * 0.04, playerCenterY + H * 0.06, W * 0.42, 16, 0.22, RIGHT);

  // Trophy
  (() => {
    ctx.save();
    const top = trophyTop;
    const h = trophyH;
    const w = trophyW;
    const rimY = top + h * 0.055;
    const bowlBottom = top + h * 0.50;
    const stemBottom = top + h * 0.80;
    const half = w / 2;
    const grad = goldGradient(ctx, top, top + h);
    const outline = '#6B4705';

    ctx.shadowColor = 'rgba(255,205,90,0.5)';
    ctx.shadowBlur = Math.round(h * 0.07);

    // bowl
    const bowl = new Path2D();
    bowl.moveTo(cx - half, rimY);
    bowl.bezierCurveTo(cx - half * 0.86, bowlBottom - h * 0.10, cx - half * 0.42, bowlBottom, cx, bowlBottom);
    bowl.bezierCurveTo(cx + half * 0.42, bowlBottom, cx + half * 0.86, bowlBottom - h * 0.10, cx + half, rimY);
    bowl.closePath();
    ctx.fillStyle = grad;
    ctx.fill(bowl);
    ctx.lineWidth = Math.max(2, w * 0.016);
    ctx.strokeStyle = outline;
    ctx.stroke(bowl);

    // rim band
    ctx.beginPath();
    ctx.moveTo(cx - half * 1.07, rimY - h * 0.032);
    ctx.lineTo(cx + half * 1.07, rimY - h * 0.032);
    ctx.lineTo(cx + half, rimY + h * 0.012);
    ctx.lineTo(cx - half, rimY + h * 0.012);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.stroke();

    // handles
    [-1, 1].forEach((dir) => {
      ctx.beginPath();
      ctx.moveTo(cx + dir * half * 0.94, rimY + h * 0.035);
      ctx.bezierCurveTo(cx + dir * half * 1.78, rimY + h * 0.06, cx + dir * half * 1.6, bowlBottom - h * 0.05, cx + dir * half * 0.72, bowlBottom - h * 0.09);
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(4, w * 0.055);
      ctx.stroke();
    });

    // stem
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.085, bowlBottom - h * 0.008);
    ctx.lineTo(cx + w * 0.085, bowlBottom - h * 0.008);
    ctx.lineTo(cx + w * 0.128, stemBottom);
    ctx.lineTo(cx - w * 0.128, stemBottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = Math.max(2, w * 0.014);
    ctx.stroke();

    // base tiers
    const tier = (topW, botW, yTop, height) => {
      ctx.beginPath();
      ctx.moveTo(cx - topW / 2, yTop);
      ctx.lineTo(cx + topW / 2, yTop);
      ctx.lineTo(cx + botW / 2, yTop + height);
      ctx.lineTo(cx - botW / 2, yTop + height);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.stroke();
    };
    tier(w * 0.52, w * 0.60, stemBottom, h * 0.055);
    tier(w * 0.60, w * 0.78, stemBottom + h * 0.055, h * 0.070);

    // specular sheen on the bowl
    ctx.save();
    ctx.clip(bowl);
    const spec = ctx.createLinearGradient(cx - half, 0, cx + half * 0.2, 0);
    spec.addColorStop(0, 'rgba(255,255,255,0)');
    spec.addColorStop(0.6, 'rgba(255,255,255,0.42)');
    spec.addColorStop(0.82, 'rgba(255,255,255,0)');
    ctx.fillStyle = spec;
    ctx.fillRect(cx - half, rimY, half * 1.2, bowlBottom - rimY + 4);
    ctx.restore();

    ctx.restore();
  })();

  // Portraits
  const drawPortrait = (img, x, y, color) => {
    if (!img) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = rgbaOf(color, 0.8);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, Math.min(playerBoxW * 0.34, playerBoxH * 0.26), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }
    const feathered = featherPortrait(img, playerBoxW, playerBoxH);
    ctx.save();
    ctx.drawImage(feathered, x - playerBoxW / 2, y - playerBoxH / 2, playerBoxW, playerBoxH);
    ctx.restore();
    // ground reflection
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const g = ctx.createRadialGradient(x, y + playerBoxH * 0.46, 0, x, y + playerBoxH * 0.46, playerBoxW * 0.5);
    g.addColorStop(0, rgbaOf(color, 0.5));
    g.addColorStop(1, rgbaOf(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y + playerBoxH * 0.46, playerBoxW * 0.5, H * 0.018, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawPortrait(homeImg, sideX, playerCenterY, LEFT);
  drawPortrait(awayImg, rightX, playerCenterY, RIGHT);

  // VS badge over the trophy
  (() => {
    ctx.save();
    ctx.shadowColor = 'rgba(255,210,90,0.8)';
    ctx.shadowBlur = badgeR * 0.9;
    const g = ctx.createRadialGradient(cx - badgeR * 0.35, yBadge - badgeR * 0.45, badgeR * 0.05, cx, yBadge, badgeR * 1.05);
    g.addColorStop(0, '#FFFAE0');
    g.addColorStop(0.42, '#EFC24C');
    g.addColorStop(0.78, '#B8860B');
    g.addColorStop(1, '#7A5205');
    ctx.beginPath();
    ctx.arc(cx, yBadge, badgeR, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, yBadge, badgeR, 0, Math.PI * 2);
    ctx.lineWidth = badgeR * 0.10;
    ctx.strokeStyle = '#5A3D04';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, yBadge, badgeR * 0.80, 0, Math.PI * 2);
    ctx.lineWidth = badgeR * 0.045;
    ctx.strokeStyle = 'rgba(255,240,180,0.85)';
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const size = Math.round(badgeR * 0.92);
    ctx.font = `800 ${size}px Saira, Oswald, Inter, system-ui, Arial`;
    ctx.fillStyle = '#3A2606';
    ctx.fillText('VS', cx, yBadge + badgeR * 0.05);
    ctx.fillStyle = 'rgba(255,245,205,0.5)';
    ctx.fillText('VS', cx, yBadge + badgeR * 0.02);
    ctx.restore();
  })();

  // ── team plates + player names ────────────────────────────────────────
  const drawPlate = (x, label, color) => {
    const skew = plateH * 0.34;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - plateW / 2 + skew, yPlate - plateH / 2);
    ctx.lineTo(x + plateW / 2, yPlate - plateH / 2);
    ctx.lineTo(x + plateW / 2 - skew, yPlate + plateH / 2);
    ctx.lineTo(x - plateW / 2, yPlate + plateH / 2);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, yPlate - plateH / 2, 0, yPlate + plateH / 2);
    g.addColorStop(0, 'rgba(60,60,70,0.95)');
    g.addColorStop(0.5, 'rgba(20,20,25,0.96)');
    g.addColorStop(1, 'rgba(6,6,9,0.98)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = rgbaOf(color, 0.95);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const maxTextW = plateW - Math.abs(skew) * 2 - 28;
    const size = fitTracked(ctx, label, (sz) => `800 ${sz}px Saira, Inter, system-ui, Arial`, Math.round(plateH * 0.62), 2, maxTextW);
    ctx.font = `800 ${size}px Saira, Inter, system-ui, Arial`;
    ctx.fillStyle = whiteGradient(ctx, yPlate - size * 0.6, yPlate + size * 0.6);
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 6;
    drawTracked(ctx, label, x, yPlate, 2);
    ctx.restore();
  };

  const nameLine = (playerName, jersey) => {
    const base = String(playerName || '').toUpperCase();
    const num = String(jersey || '').replace(/^#/, '');
    return num ? `${base}  #${num}`.trim() : base;
  };

  const homeLabel = String(homeName || 'HOME').toUpperCase();
  const awayLabel = String(awayName || 'AWAY').toUpperCase();
  drawPlate(sideX, homeLabel, LEFT);
  drawPlate(rightX, awayLabel, RIGHT);

  ctx.save();
  ctx.textBaseline = 'middle';
  [{
    x: sideX,
    text: nameLine(homePlayerName, homeJersey),
  }, {
    x: rightX,
    text: nameLine(awayPlayerName, awayJersey),
  }].forEach(({ x, text }) => {
    if (!text) return;
    const size = fitTracked(ctx, text, (sz) => `700 ${sz}px Saira, Inter, system-ui, Arial`, Math.round(H * 0.019), 2, plateW - 20);
    ctx.font = `700 ${size}px Saira, Inter, system-ui, Arial`;
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    drawTracked(ctx, text, x, yPlayerName, 2);
  });
  ctx.restore();

  // ── details bar ───────────────────────────────────────────────────────
  const barG = ctx.createLinearGradient(0, barTop, 0, H);
  barG.addColorStop(0, 'rgba(30,30,36,0.97)');
  barG.addColorStop(0.16, 'rgba(14,14,18,0.985)');
  barG.addColorStop(1, 'rgba(5,5,7,1)');
  ctx.fillStyle = barG;
  ctx.fillRect(0, barTop, W, barH);
  ctx.fillStyle = goldGradient(ctx, barTop - 3, barTop + 4);
  ctx.fillRect(0, barTop - 3, W, 4);

  const drawIcon = (type, x, y, s) => {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(1.6, s * 0.1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (type === 'calendar') {
      ctx.strokeRect(x - s * 0.42, y - s * 0.32, s * 0.84, s * 0.68);
      ctx.beginPath();
      ctx.moveTo(x - s * 0.42, y - s * 0.10);
      ctx.lineTo(x + s * 0.42, y - s * 0.10);
      ctx.moveTo(x - s * 0.22, y - s * 0.44);
      ctx.lineTo(x - s * 0.22, y - s * 0.22);
      ctx.moveTo(x + s * 0.22, y - s * 0.44);
      ctx.lineTo(x + s * 0.22, y - s * 0.22);
      ctx.stroke();
    } else if (type === 'clock') {
      ctx.beginPath();
      ctx.arc(x, y, s * 0.42, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - s * 0.25);
      ctx.moveTo(x, y);
      ctx.lineTo(x + s * 0.19, y + s * 0.06);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y - s * 0.16, s * 0.28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - s * 0.20, y + s * 0.06);
      ctx.lineTo(x, y + s * 0.44);
      ctx.lineTo(x + s * 0.20, y + s * 0.06);
      ctx.stroke();
    }
    ctx.restore();
  };

  const items = [];
  if (dateStr) items.push({ icon: 'calendar', text: dateStr });
  if (timeStr) items.push({ icon: 'clock', text: timeStr });
  if (locationStr) items.push({ icon: 'pin', text: String(locationStr) });

  if (items.length) {
    const pad = W * 0.05;
    const slot = (W - pad * 2) / items.length;
    const ic = barH * 0.30;
    const gap = 14;
    const centerY = barTop + barH * 0.55;

    items.forEach((item, i) => {
      const slotX = pad + slot * i;
      const maxTextW = slot - ic - gap - 16;
      const size = fitTracked(ctx, item.text, (sz) => `600 ${sz}px Inter, system-ui, Arial`, Math.round(barH * 0.26), 0, maxTextW, 10);
      ctx.save();
      ctx.font = `600 ${size}px Inter, system-ui, Arial`;
      const textW = ctx.measureText(item.text).width;
      const groupW = ic + gap + textW;
      const gx = slotX + (slot - groupW) / 2;
      drawIcon(item.icon, gx + ic / 2, centerY, ic);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.94)';
      ctx.fillText(item.text, gx + ic + gap, centerY + 1);
      ctx.restore();
    });
  }

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 ${Math.round(H * 0.0135)}px Inter, system-ui, Arial`;
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  drawTracked(ctx, 'GENERATED WITH SCOREKEEPERAI', cx, H * 0.868, 2);
  ctx.restore();
}