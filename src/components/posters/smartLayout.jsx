// Smart Layout Engine for poster overlays
// Computes dynamic positions and sizes for text, stats, logos, and headshots

const W = 1080;
const H = 1350;

export function buildSmartLayout({ sport = 'basketball', meta = {} } = {}) {
  // Safe margins and defaults
  const margin = 48;
  const logo = meta.orgLogo || {};
  const header = meta.header || {};
  const bestTitle = meta.bestTitle || {};
  const stats = meta.stats || {};
  const scoreRow = meta.scoreRow || {};
  const headshot = meta.headshot || {};
  const datePill = meta.datePill || {};

  // Optional hints from template metadata
  const headPos = 'center';
  const cx = W * 0.5;

  // Bigger logo (2x default), centered
  const logoW = Math.min(logo.w ?? 400, 440);
  const logoH = Math.min(logo.h ?? 128, 160);
  const logoX = Math.max(margin, Math.min(W - margin - logoW, (W - logoW) / 2));
  const logoY = logo.y ?? margin;

  // Header below logo
  const headerY = header.y ?? (logoY + logoH + 36);
  const headerFontSize = header.fontSize ?? 36;

  // Date pill below header (centered in draw)
  const dateY = datePill.y ?? (headerY + 42);

  // Headshot roughly middle, ensure spacing from header
  const r = headshot.r ?? 170;
  let cy = headshot.cy ?? Math.round(H * 0.56);
  const minCy = headerY + 140 + r; // keep away from header/date
  if (cy < minCy) cy = minCy;

  // Stats above headshot
  let statsY = stats.y ?? Math.round(cy - r - 70);
  if (statsY < headerY + 80) statsY = headerY + 80;

  // BEST PLAYER below headshot (more spacing below name)
  let bestY = bestTitle.y ?? Math.round(cy + r + 110);
  const bestFontSize = bestTitle.fontSize ?? 72;

  // Score row below title, but above bottom
  let scoreY = scoreRow.y ?? Math.round(bestY + 110);
  if (scoreY > H - 120) scoreY = H - 120;

  return {
    orgLogo: { x: logoX, y: logoY, w: logoW, h: logoH },
    header: { y: headerY, fontSize: headerFontSize, color: header.color || '#ffffff' },
    bestTitle: { y: bestY, fontSize: bestFontSize, color: bestTitle.color || '#ffffff' },
    stats: { y: statsY },
    scoreRow: { y: scoreY },
    headshot: { cx, cy, r, polygon: headshot.polygon },
    datePill: { x: cx, y: dateY },
    sport,
  };
}

export function getSportStatsConfig(sport, p = {}) {
  if (sport === 'volleyball') {
    return [
      { label: 'Attacks', value: p.attacks ?? 0 },
      { label: 'Blocks', value: p.blocks ?? 0 },
      { label: 'Aces', value: p.aces ?? 0 },
    ];
  }
  // default basketball - derive points from 2s/3s/FTs when available
  const three = Number(p.three_pointers || 0);
  const fgm = Number(p.field_goals_made || 0);
  const ftm = Number(p.free_throws_made || 0);
  let derivedPoints = null;
  if (fgm || three || ftm) {
    const twos = Math.max(0, fgm - three);
    derivedPoints = twos * 2 + three * 3 + ftm;
  }
  const points = (derivedPoints !== null) ? derivedPoints : (p.points ?? p.total_points ?? 0);
  return [
    { label: 'Points', value: points },
    { label: 'Rebounds', value: p.rebounds ?? 0 },
    { label: 'Assists', value: p.assists ?? 0 },
    { label: 'Blocks', value: p.blocks ?? 0 },
  ];
}