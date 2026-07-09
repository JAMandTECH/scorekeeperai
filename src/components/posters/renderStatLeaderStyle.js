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

  // Player photo full-bleed on the right (nudged left so nothing is cut off)
  if (headImg) {
    const targetH = H * 0.9;
    const ar = targetH / headImg.height;
    const dw = headImg.width * ar;
    const dh = targetH;
    const dx = W - dw * 0.94; // pull player toward the left so the edge isn't clipped
    const dy = H - dh; // anchored to bottom
    ctx.drawImage(headImg, dx, dy, dw, dh);
  }

  const marginX = 70;

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

  // Footer: "BEST PLAYER OF THE GAME" with the org logo to its right, bottom-left
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = NAVY;
  ctx.font = '800 42px Saira, Inter, system-ui, Arial';
  const footY = H - 250;
  ctx.fillText('BEST PLAYER', marginX, footY);
  ctx.fillText('OF THE GAME', marginX, footY + 46);

  // Logo sits to the right of the footer heading
  if (logoImg) {
    const maxH = 100;
    const ar = maxH / logoImg.height;
    const line1W = ctx.measureText('BEST PLAYER').width;
    const line2W = ctx.measureText('OF THE GAME').width;
    const logoX = marginX + Math.max(line1W, line2W) + 40;
    // Logo already has its background stripped (transparent PNG) before it reaches here
    ctx.drawImage(logoImg, logoX, footY - 34, logoImg.width * ar, maxH);
  } else if (orgName) {
    ctx.font = '800 30px Inter, system-ui, Arial';
    ctx.fillStyle = NAVY_DARK;
    const line1W = ctx.measureText('BEST PLAYER').width;
    ctx.fillText(String(orgName).toUpperCase(), marginX + line1W + 40, footY + 24);
  }

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
  ctx.fillStyle = homeWins ? '#facc15' : NAVY;
  ctx.fillText(String(hs), cursor, scoreY);
  cursor += ctx.measureText(String(hs)).width + gap;

  // VS
  ctx.font = '700 26px Inter, system-ui, Arial';
  ctx.fillStyle = NAVY_DARK;
  ctx.fillText('VS', cursor, scoreY);
  cursor += ctx.measureText('VS').width + gap;

  // Away score
  ctx.font = '800 44px Saira, Inter, system-ui, Arial';
  ctx.fillStyle = !homeWins ? '#facc15' : NAVY;
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