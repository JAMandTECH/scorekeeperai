// Renders the "Bold Dark" poster style (NBA-social-graphic reference).
// Black background, huge gold stat numbers stacked down the left with light
// uppercase labels beneath each, player photo full-bleed on the right.
// Header/date/name/team on top-left, final score along the bottom.
//
// Draws onto an existing 2D context already scaled for the 1080x1350 canvas.

const loadImage = (url) =>
  new Promise((resolve) => {
    if (!url) return resolve(null);
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => resolve(i);
    i.onerror = () => resolve(null);
    i.src = url;
  });

export async function renderBoldDarkStyle({
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
  const GOLD = '#f5a623';
  const WHITE = '#ffffff';

  const [bgImg, headImg, logoImg] = await Promise.all([
    loadImage(backgroundUrl),
    loadImage(headshotUrl),
    loadImage(logoUrl),
  ]);

  // Solid black base
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);

  // Background photo (cover) faded/darkened for atmosphere
  if (bgImg) {
    const scale = Math.max(W / bgImg.width, H / bgImg.height);
    const dw = bgImg.width * scale;
    const dh = bgImg.height * scale;
    const dx = (W - dw) / 2;
    const dy = (H - dh) / 2;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.drawImage(bgImg, dx, dy, dw, dh);
    ctx.restore();
    // Darken overlay
    ctx.fillStyle = 'rgba(10,10,10,0.55)';
    ctx.fillRect(0, 0, W, H);
  }

  // Player photo full-bleed on the right, anchored to bottom
  if (headImg) {
    const targetH = H * 0.92;
    const ar = targetH / headImg.height;
    const dw = headImg.width * ar;
    const dh = targetH;
    const dx = W - dw * 0.92; // pull toward the right edge
    const dy = H - dh;
    ctx.drawImage(headImg, dx, dy, dw, dh);
  }

  // Left-side black wash so the big gold numbers stay legible over the photo
  const wash = ctx.createLinearGradient(0, 0, W * 0.6, 0);
  wash.addColorStop(0, 'rgba(10,10,10,0.95)');
  wash.addColorStop(0.6, 'rgba(10,10,10,0.75)');
  wash.addColorStop(1, 'rgba(10,10,10,0)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);

  const marginX = 70;

  // Org logo top-right
  if (logoImg) {
    const srcW = logoImg.width;
    const srcH = logoImg.height;
    const maxH = 120;
    const ar = maxH / srcH;
    const drawW = srcW * ar;
    ctx.drawImage(logoImg, W - drawW - 24, 24, drawW, maxH);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Organization name / header / stage / date (top-left, white)
  let topY = 76;
  if (orgName) {
    ctx.font = '800 30px Saira, Inter, system-ui, Arial';
    ctx.fillStyle = WHITE;
    ctx.fillText(String(orgName).toUpperCase(), marginX, topY);
    topY += 36;
  }
  if (headerStr) {
    ctx.font = '700 24px Inter, system-ui, Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(headerStr, marginX, topY);
    topY += 32;
  }
  if (stageStr) {
    ctx.font = '700 20px Inter, system-ui, Arial';
    ctx.fillStyle = GOLD;
    ctx.fillText(stageStr, marginX, topY);
    topY += 28;
  }
  if (dateStr) {
    ctx.font = '600 22px Inter, system-ui, Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(dateStr, marginX, topY);
    topY += 34;
  }

  // Stacked stats: huge gold number + light uppercase label beneath
  const list = (stats || []).slice(0, 3);
  let sy = topY + 150;
  const blockGap = 30;

  list.forEach((s) => {
    const valueStr = String(s.value);
    // Big gold value
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '800 170px Oswald, Saira, Inter, system-ui, Arial';
    ctx.fillStyle = GOLD;
    ctx.fillText(valueStr, marginX, sy);

    // Label under the number (white, spaced uppercase)
    const label = String(s.label || '').toUpperCase();
    ctx.font = '700 34px Inter, system-ui, Arial';
    ctx.fillStyle = WHITE;
    ctx.fillText(label, marginX, sy + 44);

    sy += 170 + 44 + blockGap;
  });

  // Player name + team/jersey near the bottom-left
  const nameParts = String(playerName || '').trim().split(/\s+/);
  const nameStr = nameParts.join(' ');
  const teamLine = [teamName, jerseyStr ? `#${jerseyStr}` : ''].filter(Boolean).join('  ');

  const scoreY = H - 60;
  let infoY = H - 150;

  // "BEST PLAYER OF THE GAME" eyebrow tag above the player name
  ctx.font = '800 22px Inter, system-ui, Arial';
  ctx.fillStyle = GOLD;
  ctx.fillText('BEST PLAYER OF THE GAME', marginX, infoY - 40);

  if (nameStr) {
    ctx.font = '800 40px Saira, Inter, system-ui, Arial';
    ctx.fillStyle = WHITE;
    ctx.fillText(nameStr.toUpperCase(), marginX, infoY);
    infoY += 36;
  }
  if (teamLine) {
    ctx.font = '700 24px Inter, system-ui, Arial';
    ctx.fillStyle = GOLD;
    ctx.fillText(teamLine, marginX, infoY);
  }

  // Final Score row along the bottom-left
  const hs = Number(homeScore || 0);
  const as = Number(awayScore || 0);
  const homeWins = hs >= as;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const gap = 18;
  let cursor = marginX;

  ctx.font = '700 22px Inter, system-ui, Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(String(homeName || 'HOME'), cursor, scoreY);
  cursor += ctx.measureText(String(homeName || 'HOME')).width + gap;

  ctx.font = '800 40px Saira, Inter, system-ui, Arial';
  ctx.fillStyle = homeWins ? GOLD : WHITE;
  ctx.fillText(String(hs), cursor, scoreY);
  cursor += ctx.measureText(String(hs)).width + gap;

  ctx.font = '700 24px Inter, system-ui, Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('VS', cursor, scoreY);
  cursor += ctx.measureText('VS').width + gap;

  ctx.font = '800 40px Saira, Inter, system-ui, Arial';
  ctx.fillStyle = !homeWins ? GOLD : WHITE;
  ctx.fillText(String(as), cursor, scoreY);
  cursor += ctx.measureText(String(as)).width + gap;

  ctx.font = '700 22px Inter, system-ui, Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(String(awayName || 'AWAY'), cursor, scoreY);

  // Footer tag bottom-right
  ctx.textAlign = 'right';
  ctx.font = '600 16px Inter, system-ui, Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('Generated with ScorekeeperAI', W - 24, H - 20);
}