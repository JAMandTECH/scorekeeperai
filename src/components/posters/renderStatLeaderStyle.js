// Renders the "Best Player of the Game" poster style (bet365-inspired reference).
// Left column: header/date, player name, jersey/team, up to 3 stacked stats (value + label pill).
// Right side: full-bleed player photo. Bottom: final score row + org name + footer tag.
//
// Draws onto an existing 2D context already scaled for the 1080x1350 canvas.
// Returns the composed data URL via canvas.toDataURL by the caller.

const loadImage = (url) =>
  new Promise((resolve) => {
    if (!url) return resolve(null);
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => resolve(i);
    i.onerror = () => resolve(null);
    i.src = url;
  });

// Removes a logo's solid/circular background by sampling the corner color and
// flood-filling from the edges: any pixel connected to the border whose color
// is close to the background is made transparent. This strips both dark boxes
// and circular gradient backgrounds while preserving the central artwork.
// Runs entirely on-canvas (no external service). Returns a canvas, or the
// original image if pixel access is blocked (CORS).
const stripDarkBox = (img) => {
  try {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const cx = c.getContext('2d');
    cx.drawImage(img, 0, 0, w, h);
    // If the image is cross-origin without CORS headers, getImageData throws.
    // Catch it and return the raw <img> so we never taint the main canvas.
    let imgData;
    try {
      imgData = cx.getImageData(0, 0, w, h);
    } catch (_) {
      return img;
    }
    const d = imgData.data;

    // Average the four corners to estimate the background color
    const corners = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + (w - 1)) * 4];
    let br = 0, bg = 0, bb = 0;
    corners.forEach((p) => { br += d[p]; bg += d[p + 1]; bb += d[p + 2]; });
    br /= 4; bg /= 4; bb /= 4;

    const TOL = 90; // color distance tolerance for "background"
    const near = (i) => {
      const dr = d[i] - br, dg = d[i + 1] - bg, db = d[i + 2] - bb;
      return Math.sqrt(dr * dr + dg * dg + db * db) <= TOL;
    };

    // Flood fill from all border pixels inward
    const visited = new Uint8Array(w * h);
    const stack = [];
    const push = (x, y) => {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const idx = y * w + x;
      if (visited[idx]) return;
      visited[idx] = 1;
      stack.push(idx);
    };
    for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
    for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }

    while (stack.length) {
      const idx = stack.pop();
      const i = idx * 4;
      if (!near(i)) continue;
      d[i + 3] = 0; // transparent
      const x = idx % w, y = (idx - x) / w;
      push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
    }

    cx.putImageData(imgData, 0, 0);
    return c;
  } catch (_) {
    return img; // CORS-tainted; draw as-is
  }
};


export async function renderStatLeaderStyle({
  ctx,
  W,
  H,
  backgroundUrl,
  headshotUrl,
  logoUrl,
  stats, // [{label, value}, ...] already filtered/ordered
  playerName,
  jerseyStr,
  teamName,
  headerStr,
  stageStr,
  dateStr,
  homeName,
  awayName,
  homeScore,
  awayScore,
  orgName,
}) {
  const NAVY = '#12305c';
  const NAVY_DARK = '#0d2444';

  const [bgImg, headImg, logoImg] = await Promise.all([
    loadImage(backgroundUrl),
    loadImage(headshotUrl),
    loadImage(logoUrl),
  ]);

  // Light gradient base (in case background is missing / for a clean sports-graphic look)
  const base = ctx.createLinearGradient(0, 0, W, H);
  base.addColorStop(0, '#eef1f5');
  base.addColorStop(1, '#dfe4ea');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // Background photo (cover), pushed to the right, faded on the left for text legibility
  if (bgImg) {
    const scale = Math.max(W / bgImg.width, H / bgImg.height);
    const dw = bgImg.width * scale;
    const dh = bgImg.height * scale;
    const dx = (W - dw) / 2;
    const dy = (H - dh) / 2;
    ctx.drawImage(bgImg, dx, dy, dw, dh);
  }

  // Left-side white wash — widened so all text is covered
  const wash = ctx.createLinearGradient(0, 0, W * 0.52, 0);
  wash.addColorStop(0, 'rgba(238,241,245,0.96)');
  wash.addColorStop(0.72, 'rgba(238,241,245,0.9)');
  wash.addColorStop(1, 'rgba(238,241,245,0)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);

  // Player photo on the right with margin from edge (reduced 10%, properly positioned)
  if (headImg) {
    const targetH = H * 0.774; // reduced 10% from 0.86
    const ar = targetH / headImg.height;
    const dw = headImg.width * ar;
    const dh = targetH;
    const rightMargin = 60; // 1.5x margin for better positioning
    const dx = W - dw - rightMargin;
    const dy = (H - dh) / 2 + 50; // vertically centered with slight downward bias
    ctx.drawImage(headImg, dx, dy, dw, dh);
  }

  const marginX = 70;

  // Org logo in the upper-right corner
  if (logoImg) {
    const cleaned = stripDarkBox(logoImg);
    const srcW = cleaned.naturalWidth || cleaned.width || logoImg.width;
    const srcH = cleaned.naturalHeight || cleaned.height || logoImg.height;
    const maxH = 169;
    const ar = maxH / srcH;
    const drawW = srcW * ar;
    ctx.drawImage(cleaned, W - drawW - 24, 24, drawW, maxH);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Organization name above the header
  let topY = 76;
  if (orgName) {
    ctx.font = '800 30px Saira, Inter, system-ui, Arial';
    ctx.fillStyle = NAVY;
    ctx.fillText(String(orgName).toUpperCase(), marginX, topY);
    topY += 38;
  }
  // Header (tournament • division)
  if (headerStr) {
    ctx.font = '800 26px Saira, Inter, system-ui, Arial';
    ctx.fillStyle = NAVY_DARK;
    ctx.fillText(headerStr, marginX, topY);
    topY += 34;
  }
  // Season stage (REGULAR SEASON / SEMI-FINALS / FINALS ...)
  if (stageStr) {
    ctx.font = '700 22px Inter, system-ui, Arial';
    ctx.fillStyle = NAVY_DARK;
    ctx.fillText(stageStr, marginX, topY);
    topY += 32;
  }
  // Date line
  if (dateStr) {
    ctx.font = '600 24px Inter, system-ui, Arial';
    ctx.fillStyle = NAVY_DARK;
    ctx.fillText(dateStr, marginX, topY);
    topY += 46;
  } else {
    topY += 12;
  }

  // "BEST PLAYER OF THE GAME" eyebrow tag above the player name
  ctx.font = '800 28px Inter, system-ui, Arial';
  ctx.fillStyle = '#FFD700';
  ctx.fillText('BEST PLAYER OF THE GAME', marginX, topY + 24);
  topY += 44;

  // Player name (two lines: first name light, last name heavy)
  const nameParts = String(playerName || '').trim().split(/\s+/);
  const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0] || '';

  ctx.fillStyle = NAVY;
  if (firstName) {
    ctx.font = '600 58px Saira, Inter, system-ui, Arial';
    ctx.fillText(firstName.toUpperCase(), marginX, topY + 50);
    topY += 62;
  }
  ctx.font = '800 78px Saira, Inter, system-ui, Arial';
  ctx.fillText(lastName.toUpperCase(), marginX, topY + 50);
  topY += 62;

  // Team + jersey line
  const teamLine = [teamName, jerseyStr ? `#${jerseyStr}` : ''].filter(Boolean).join('  ');
  if (teamLine) {
    ctx.font = '700 30px Inter, system-ui, Arial';
    ctx.fillStyle = NAVY_DARK;
    ctx.fillText(teamLine, marginX, topY + 44);
    topY += 44;
  }

  // Stacked stats (up to 3): big navy number + small dark label pill under it
  const list = (stats || []).slice(0, 3);
  let sy = topY + 150;
  const blockGap = 34;

  list.forEach((s) => {
    const valueStr = String(s.value);
    // Big value
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '800 150px Oswald, Saira, Inter, system-ui, Arial';
    ctx.fillStyle = NAVY;
    ctx.fillText(valueStr, marginX, sy);

    // Label pill
    const label = String(s.label || '').toUpperCase();
    ctx.font = '800 32px Inter, system-ui, Arial';
    const padX = 16;
    const textW = ctx.measureText(label).width;
    const pillW = textW + padX * 2;
    const pillH = 44;
    const pillX = marginX;
    const pillY = sy + 14;
    ctx.fillStyle = NAVY_DARK;
    ctx.beginPath();
    const r = 6;
    ctx.moveTo(pillX + r, pillY);
    ctx.lineTo(pillX + pillW - r, pillY);
    ctx.arcTo(pillX + pillW, pillY, pillX + pillW, pillY + r, r);
    ctx.lineTo(pillX + pillW, pillY + pillH - r);
    ctx.arcTo(pillX + pillW, pillY + pillH, pillX + pillW - r, pillY + pillH, r);
    ctx.lineTo(pillX + r, pillY + pillH);
    ctx.arcTo(pillX, pillY + pillH, pillX, pillY + pillH - r, r);
    ctx.lineTo(pillX, pillY + r);
    ctx.arcTo(pillX, pillY, pillX + r, pillY, r);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, pillX + padX, pillY + pillH / 2 + 2);

    sy += 150 + pillH + blockGap;
  });

  // Final Score — left-aligned below the footer heading, at the left edge
  const hs = Number(homeScore || 0);
  const as = Number(awayScore || 0);
  const homeWins = hs >= as;
  const scoreY = H - 130;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const gap = 20;
  let cursor = marginX;

  // Home name
  ctx.font = '700 24px Inter, system-ui, Arial';
  ctx.fillStyle = NAVY_DARK;
  ctx.fillText(String(homeName || 'HOME'), cursor, scoreY);
  cursor += ctx.measureText(String(homeName || 'HOME')).width + gap;

  // Home score
  ctx.font = '800 44px Saira, Inter, system-ui, Arial';
  ctx.fillStyle = homeWins ? '#FFD700' : NAVY;
  ctx.fillText(String(hs), cursor, scoreY);
  cursor += ctx.measureText(String(hs)).width + gap;

  // VS
  ctx.font = '700 26px Inter, system-ui, Arial';
  ctx.fillStyle = NAVY_DARK;
  ctx.fillText('VS', cursor, scoreY);
  cursor += ctx.measureText('VS').width + gap;

  // Away score
  ctx.font = '800 44px Saira, Inter, system-ui, Arial';
  ctx.fillStyle = !homeWins ? '#FFD700' : NAVY;
  ctx.fillText(String(as), cursor, scoreY);
  cursor += ctx.measureText(String(as)).width + gap;

  // Away name
  ctx.font = '700 24px Inter, system-ui, Arial';
  ctx.fillStyle = NAVY_DARK;
  ctx.fillText(String(awayName || 'AWAY'), cursor, scoreY);

  // Footer tag bottom-right
  ctx.textAlign = 'right';
  ctx.font = '600 16px Inter, system-ui, Arial';
  ctx.fillStyle = NAVY_DARK;
  ctx.fillText('Generated with ScorekeeperAI', W - 24, H - 20);
}