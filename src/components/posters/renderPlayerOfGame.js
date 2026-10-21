// Renders the "Player of the Game" poster style (004).
// Split screen: full-bleed player portrait on the left, near-black textured panel
// on the right, separated by an angled blue strip flush against the diagonal cut
// of the photo. Gold headlines, tracked uppercase labels, three stat rows and a
// "PLAYER OF THE GAME / PRESENTED BY" footer block.
//
// All geometry is relative to W/H, so print-mode paper sizes scale correctly.

const loadImage = (url) =>
  new Promise((resolve) => {
    if (!url) return resolve(null);
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => resolve(i);
    i.onerror = () => resolve(null);
    i.src = url;
  });

const GOLD = '#FFC72C';
const BLUE = '#006BB6';
const PANEL = '#121212';
const WHITE = '#ffffff';
const PANEL_FONT = 'Saira, Inter, system-ui, Arial';
const NUMBER_FONT = 'Oswald, Saira, Inter, system-ui, Arial';
const LABEL_FONT = 'Inter, system-ui, Arial';

// Width of a character-tracked string at the ctx's current font.
function measureTracked(ctx, text, spacing) {
  let w = 0;
  const s = String(text ?? '');
  for (const ch of s) w += ctx.measureText(ch).width + spacing;
  return Math.max(0, w - spacing);
}

// Draws character-tracked text left-aligned on an alphabetic baseline.
function drawTracked(ctx, text, x, y, spacing) {
  let cx = x;
  for (const ch of String(text ?? '')) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
}

// Shrinks the font until the tracked string fits maxWidth; returns the size used.
function fitTracked(ctx, text, weight, family, size, minSize, spacing, maxWidth) {
  let s = size;
  while (s > minSize) {
    ctx.font = `${weight} ${s}px ${family}`;
    if (measureTracked(ctx, text, spacing) <= maxWidth) break;
    s -= 2;
  }
  ctx.font = `${weight} ${s}px ${family}`;
  return s;
}

export async function renderPlayerOfGame({
  ctx,
  W,
  H,
  backgroundUrl,
  headshotUrl,
  logoUrl,
  stats, // [{ label, value }] already filtered/ordered
  playerName,
  jerseyStr,
  orgName,
  seriesStr,
}) {
  const [bgImg, headImg, logoImg] = await Promise.all([
    loadImage(backgroundUrl),
    loadImage(headshotUrl),
    loadImage(logoUrl),
  ]);

  // Divider: the photo is widest at the top, so its bottom-right corner is cut
  // away diagonally and merges into the dark panel.
  const xTop = W * 0.685;
  const xBot = W * 0.6;
  const strip = Math.max(14, W * 0.024);
  const gutter = W * 0.042;
  const xAt = (y) => xTop + (xBot - xTop) * (y / H);
  const panelLeft = (y) => xAt(y) + strip;
  const textX = (y) => panelLeft(y) + gutter;
  const rightSafe = W * 0.045;
  const availAt = (y) => Math.max(W * 0.12, W - textX(y) - rightSafe);

  const photoPath = () => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(xTop, 0);
    ctx.lineTo(xBot, H);
    ctx.lineTo(0, H);
    ctx.closePath();
  };
  const panelPath = () => {
    ctx.beginPath();
    ctx.moveTo(xTop + strip, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, H);
    ctx.lineTo(xBot + strip, H);
    ctx.closePath();
  };

  // Base
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  // Ambient stadium background behind everything
  if (bgImg) {
    const scale = Math.max(W / bgImg.width, H / bgImg.height);
    const dw = bgImg.width * scale;
    const dh = bgImg.height * scale;
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.drawImage(bgImg, (W - dw) / 2, (H - dh) / 2, dw, dh);
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, W, H);
  }

  // Player portrait, clipped to the diagonal
  if (headImg) {
    ctx.save();
    photoPath();
    ctx.clip();
    const boxW = xTop - W * 0.02;
    const boxH = H * 0.94;
    const scale = Math.min(boxW / headImg.width, boxH / headImg.height);
    const dw = headImg.width * scale;
    const dh = headImg.height * scale;
    const dx = Math.max(0, (xTop - dw) / 2);
    const dy = (H - dh) / 2 + H * 0.04;
    ctx.drawImage(headImg, dx, dy, dw, dh);

    // Soften the right edge of the portrait into the panel
    const fade = ctx.createLinearGradient(xTop - W * 0.3, 0, xTop, 0);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Dark textured panel
  ctx.save();
  panelPath();
  ctx.clip();
  ctx.fillStyle = 'rgba(18,18,18,0.94)';
  ctx.fillRect(0, 0, W, H);

  // Fabric / carbon-fibre weave
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = 1;
  const step = Math.max(9, W * 0.011);
  for (let i = -H; i < W + H; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + H, H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i - H, H);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Lighter top-left corner inside the panel for depth
  const sheen = ctx.createLinearGradient(xTop + strip, 0, W, H * 0.9);
  sheen.addColorStop(0, 'rgba(255,255,255,0.07)');
  sheen.addColorStop(0.55, 'rgba(255,255,255,0.015)');
  sheen.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // Blue strip flush against the diagonal cut
  ctx.beginPath();
  ctx.moveTo(xTop, 0);
  ctx.lineTo(xTop + strip, 0);
  ctx.lineTo(xBot + strip, H);
  ctx.lineTo(xBot, H);
  ctx.closePath();
  ctx.fillStyle = BLUE;
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Top-left diamond mark (org logo, or jersey number when no logo exists)
  {
    const size = W * 0.108;
    const cx = W * 0.098;
    const cy = H * 0.082;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = Math.max(3, W * 0.004);
    ctx.strokeRect(-size / 2, -size / 2, size, size);
    ctx.restore();

    if (logoImg) {
      const max = size * 0.56;
      const s = Math.min(max / logoImg.width, max / logoImg.height);
      const dw = logoImg.width * s;
      const dh = logoImg.height * s;
      ctx.drawImage(logoImg, cx - dw / 2, cy - dh / 2, dw, dh);
    } else if (jerseyStr) {
      ctx.fillStyle = GOLD;
      ctx.font = `700 ${Math.round(size * 0.5)}px ${NUMBER_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(jerseyStr), cx, cy);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }
  }

  // Player name: first name above, surname large and bold
  const parts = String(playerName || '').trim().split(/\s+/).filter(Boolean);
  const first = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
  const last = parts.length ? parts[parts.length - 1] : '';
  const lastY = H * 0.335;

  if (first) {
    const y = lastY - H * 0.058;
    ctx.fillStyle = GOLD;
    ctx.globalAlpha = 0.85;
    fitTracked(ctx, first.toUpperCase(), 600, PANEL_FONT, W * 0.036, W * 0.018, 3, availAt(y));
    drawTracked(ctx, first.toUpperCase(), textX(y), y, 3);
    ctx.globalAlpha = 1;
  }

  if (last) {
    ctx.fillStyle = GOLD;
    const lastStr = last.toUpperCase();
    const size = fitTracked(ctx, lastStr, 800, PANEL_FONT, W * 0.078, W * 0.032, 2, availAt(lastY));
    drawTracked(ctx, lastStr, textX(lastY), lastY, 2);

    // Thin gold rule under the name
    ctx.fillStyle = GOLD;
    ctx.fillRect(textX(lastY), lastY + size * 0.3, Math.min(W * 0.16, availAt(lastY) * 0.6), Math.max(3, W * 0.0035));
  }

  // Three stat rows: huge gold number followed by a tracked uppercase label
  const list = (stats || []).slice(0, 3).filter(Boolean);
  const rowY = H * 0.47;
  const rowGap = H * 0.108;
  ctx.textBaseline = 'alphabetic';

  list.forEach((s, i) => {
    const y = rowY + i * rowGap;
    const valueStr = String(s.value ?? 0);
    const label = String(s.label || '').toUpperCase();

    ctx.fillStyle = GOLD;
    ctx.font = `700 ${Math.round(W * 0.064)}px ${NUMBER_FONT}`;
    ctx.fillText(valueStr, textX(y), y);
    const valueW = ctx.measureText(valueStr).width;

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = `700 ${Math.round(W * 0.0205)}px ${LABEL_FONT}`;
    drawTracked(ctx, label, textX(y) + valueW + W * 0.018, y, 3);
  });

  // Footer block
  const headY = H * 0.80;
  const presentedY = H * 0.858;
  const sponsorY = H * 0.898;
  const seriesY = H * 0.94;

  ctx.fillStyle = GOLD;
  fitTracked(ctx, 'PLAYER OF THE GAME', 700, NUMBER_FONT, W * 0.040, W * 0.020, 2, availAt(headY));
  drawTracked(ctx, 'PLAYER OF THE GAME', textX(headY), headY, 2);

  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.font = `600 ${Math.round(W * 0.019)}px ${LABEL_FONT}`;
  drawTracked(ctx, 'PRESENTED BY', textX(presentedY), presentedY, 3);

  // Organisation name (the presenter) in white, series/season line beneath it
  const sponsor = orgName ? String(orgName).toUpperCase() : '';
  if (sponsor) {
    ctx.fillStyle = WHITE;
    fitTracked(ctx, sponsor, 700, PANEL_FONT, W * 0.030, W * 0.015, 1, availAt(sponsorY));
    drawTracked(ctx, sponsor, textX(sponsorY), sponsorY, 1);
  }

  const series = seriesStr ? String(seriesStr).toUpperCase() : '';
  if (series && series !== sponsor) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `600 ${Math.round(W * 0.019)}px ${LABEL_FONT}`;
    drawTracked(ctx, series, textX(seriesY), seriesY, 2);
  }

  // Footer tag kept out of the panel, over the portrait's dark lower corner
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `600 ${Math.round(W * 0.015)}px ${LABEL_FONT}`;
  ctx.fillText('Generated with ScorekeeperAI', W * 0.04, H - H * 0.018);
  ctx.textAlign = 'left';
}