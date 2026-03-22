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
  const headPos = meta.headshotPosition || 'center'; // 'left' | 'center' | 'right'
  const statsPos = meta.statsPosition || 'middle'; // 'top' | 'middle' | 'bottom'

  // Compute headshot center
  const cx = headPos === 'left' ? W * 0.28 : headPos === 'right' ? W * 0.72 : W * 0.5;
  const cy = headshot.cy ?? (H * 0.50);
  const r = headshot.r ?? 150;

  // Stats row Y based on preference
  const statsY = stats.y ?? (statsPos === 'top' ? H * 0.40 : statsPos === 'bottom' ? H * 0.64 : H * 0.52);

  // Score row slightly above footer
  const scoreY = scoreRow.y ?? Math.round(H * 0.78);

  // Header and title
  const headerY = header.y ?? 110;
  const headerFontSize = header.fontSize ?? 34;
  const bestY = bestTitle.y ?? 930;
  const bestFontSize = bestTitle.fontSize ?? 72;

  // Org logo box (kept within safe area)
  const logoW = Math.min(logo.w ?? 220, 320);
  const logoH = Math.min(logo.h ?? 72, 120);
  const logoX = logo.x ?? (W - logoW - margin);
  const logoY = logo.y ?? margin;

  // Date pill near top-left by default
  const dateX = datePill.x ?? margin;
  const dateY = datePill.y ?? headerY + 16;

  return {
    orgLogo: { x: logoX, y: logoY, w: logoW, h: logoH },
    header: { y: headerY, fontSize: headerFontSize, color: header.color || '#ffffff' },
    bestTitle: { y: bestY, fontSize: bestFontSize, color: bestTitle.color || '#ffffff' },
    stats: { y: statsY },
    scoreRow: { y: scoreY },
    headshot: { cx, cy, r, polygon: headshot.polygon },
    datePill: { x: dateX, y: dateY },
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
  // default basketball
  return [
    { label: 'Points', value: p.points ?? 0 },
    { label: 'Rebounds', value: p.rebounds ?? 0 },
    { label: 'Assists', value: p.assists ?? 0 },
    { label: 'Blocks', value: p.blocks ?? 0 },
  ];
}