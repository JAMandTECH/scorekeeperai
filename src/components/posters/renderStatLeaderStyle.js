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
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.drawImage(bgImg, dx, dy, dw, dh);
    ctx.restore();
  }

  // Left-side white-to-transparent wash so the stat column stays readable
  const wash = ctx.createLinearGradient(0, 0, W * 0.75, 0);
  wash.addColorStop(0, 'rgba(238,241,245,0.96)');
  wash.addColorStop(0.55, 'rgba(238,241,245,0.7)');
  wash.addColorStop(1, 'rgba(238,241,245,0)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);

  // Player photo full-bleed on the right
  if (headImg) {
    const targetH = H * 0.9;
    const ar = targetH / headImg.height;
    const dw = headImg.width * ar;
    const dh = targetH;
    const dx = W - dw * 0.82; // let the player sit toward the right edge
    const dy = H - dh; // anchored to bottom
    ctx.drawImage(headImg, dx, dy, dw, dh);
  }

  const marginX = 70;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Header (tournament • division) at top-left
  let topY = 90;
  if (headerStr) {
    ctx.font = '800 26px Saira, Inter, system-ui, Arial';
    ctx.fillStyle = NAVY_DARK;
    ctx.fillText(headerStr, marginX, topY);
    topY += 34;
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

  // Footer: "BEST PLAYER OF THE GAME" + org logo/name, bottom-left
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = NAVY;
  ctx.font = '800 42px Saira, Inter, system-ui, Arial';
  const footY = H - 190;
  ctx.fillText('BEST PLAYER', marginX, footY);
  ctx.fillText('OF THE GAME', marginX, footY + 46);

  if (logoImg) {
    const maxH = 125; // 2.5x larger
    const ar = maxH / logoImg.height;
    ctx.drawImage(logoImg, marginX, footY + 64, logoImg.width * ar, maxH);
  } else if (orgName) {
    ctx.font = '800 34px Inter, system-ui, Arial';
    ctx.fillStyle = NAVY_DARK;
    ctx.fillText(String(orgName).toUpperCase(), marginX, footY + 96);
  }

  // Final Score row — anchored to the bottom, full-width band (fixed placement)
  const hs = Number(homeScore || 0);
  const as = Number(awayScore || 0);
  const homeWins = hs >= as;
  const scoreY = H - 56;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const center = W / 2;

  const gap = 26;
  ctx.font = '800 44px Saira, Inter, system-ui, Arial';
  const hsW = ctx.measureText(String(hs)).width;
  const asW = ctx.measureText(String(as)).width;
  ctx.font = '700 26px Inter, system-ui, Arial';
  const vsW = ctx.measureText('VS').width;

  // Draw the score cluster centered
  const total = hsW + gap + vsW + gap + asW;
  let cursor = center - total / 2;

  ctx.textAlign = 'left';
  ctx.font = '800 44px Saira, Inter, system-ui, Arial';
  ctx.fillStyle = homeWins ? '#facc15' : NAVY;
  ctx.fillText(String(hs), cursor, scoreY);
  cursor += hsW + gap;

  ctx.font = '700 26px Inter, system-ui, Arial';
  ctx.fillStyle = NAVY_DARK;
  ctx.fillText('VS', cursor, scoreY);
  cursor += vsW + gap;

  ctx.font = '800 44px Saira, Inter, system-ui, Arial';
  ctx.fillStyle = !homeWins ? '#facc15' : NAVY;
  ctx.fillText(String(as), cursor, scoreY);

  // Team names flanking the cluster
  ctx.font = '700 24px Inter, system-ui, Arial';
  ctx.fillStyle = NAVY_DARK;
  ctx.textAlign = 'right';
  ctx.fillText(String(homeName || 'HOME'), center - total / 2 - 20, scoreY);
  ctx.textAlign = 'left';
  ctx.fillText(String(awayName || 'AWAY'), center + total / 2 + 20, scoreY);

  // Footer tag bottom-right
  ctx.textAlign = 'right';
  ctx.font = '600 16px Inter, system-ui, Arial';
  ctx.fillStyle = NAVY_DARK;
  ctx.fillText('Generated with ScorekeeperAI', W - 24, H - 20);
}