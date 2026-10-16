import React from "react";
import { Button } from "@/components/ui/button";
import { Printer, FileDown, Loader2 } from "lucide-react";
import { jsPDF } from "jspdf";

/**
 * Builds the full report (all candidates, all award categories) from the
 * unfiltered candidate set returned by getAwardCandidates. Each section is
 * { title, subtitle, columns: [{key,label}], rows: [{...}] }.
 */
function buildReportSections(candidates, organization, award) {
  const byScore = (key) => (a, b) => (b[key] || 0) - (a[key] || 0);
  const LIMITS = { season_mvp: 10, finals_mvp: 10, mythical: 20 };

  const bbCols = [
    { key: "gp", label: "GP" },
    { key: "pts", label: "PTS" },
    { key: "reb", label: "REB" },
    { key: "ast", label: "AST" },
    { key: "stl", label: "STL" },
    { key: "blk", label: "BLK" },
    { key: "tp", label: "3PT" },
    { key: "ppg", label: "PPG" },
  ];
  const vbCols = [
    { key: "gp", label: "GP" },
    { key: "pts", label: "PTS" },
    { key: "aces", label: "ACES" },
    { key: "att", label: "ATT" },
    { key: "blk", label: "BLK" },
    { key: "ppg", label: "PPG" },
  ];

  const rowFrom = (c, stats, score) => {
    const gp = stats?.gamesPlayed || 0;
    const pts = stats?.points || 0;
    const isVb = c.sport === "volleyball";
    const ppg = gp > 0 ? (pts / gp).toFixed(1) : "0.0";
    return {
      rank: 0,
      player: c.player_name,
      team: c.team_name,
      division: c.division,
      jersey: c.jersey_number ? `#${c.jersey_number}` : "",
      gp,
      pts,
      reb: stats?.rebounds || 0,
      ast: stats?.assists || 0,
      stl: stats?.steals || 0,
      blk: stats?.blocks || 0,
      tp: stats?.three_pointers || 0,
      aces: stats?.aces || 0,
      att: stats?.attacks || 0,
      ppg,
      _isVb: isVb,
      _score: score,
    };
  };

  // Season MVP — all players by season score
  const seasonRows = [...candidates]
    .sort(byScore("season_score"))
    .slice(0, LIMITS.season_mvp)
    .map((c, i) => rowFrom(c, c.season_stats, c.season_score))
    .map((r, i) => ({ ...r, rank: i + 1 }));

  // Finals MVP — only players with finals stats
  const finalsRows = candidates
    .filter((c) => c.finals_stats)
    .sort(byScore("finals_score"))
    .slice(0, LIMITS.finals_mvp)
    .map((c, i) => rowFrom(c, c.finals_stats, c.finals_score))
    .map((r, i) => ({ ...r, rank: i + 1 }));

  // Mythical — full pool by season score, suggested lineup flagged
  const mythicalRows = [...candidates]
    .sort(byScore("season_score"))
    .slice(0, LIMITS.mythical)
    .map((c, i) => {
      const r = rowFrom(c, c.season_stats, c.season_score);
      r.rank = i + 1;
      return r;
    });

  const colsFor = (rows) =>
    rows.length && rows[0]._isVb ? vbCols : bbCols;

  const all = [
    {
      award: "season_mvp",
      title: "Season MVP",
      subtitle: "All players ranked by composite season score across completed games.",
      columns: colsFor(seasonRows),
      rows: seasonRows,
    },
    {
      award: "finals_mvp",
      title: "Finals MVP",
      subtitle: "Players from finals games only, ranked by composite finals score.",
      columns: finalsRows.length && colsFor(finalsRows),
      rows: finalsRows,
    },
    {
      award: "mythical",
      title: "Mythical Team",
      subtitle: "Full candidate pool. Suggested lineup: top 5 (basketball) / top 6 (volleyball) by score.",
      columns: colsFor(mythicalRows),
      rows: mythicalRows,
      mythical: true,
    },
  ].filter((s) => s.rows.length > 0);

  return award ? all.filter((s) => s.award === award) : all;
}

const ORG = "ScorekeeperAI";

function reportMeta(organization) {
  const now = new Date();
  const stamp = now.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
  return {
    orgName: organization?.name || "Organization",
    tournament: organization?.tournament_name || "",
    generated: stamp,
  };
}

/* ---------------- Print (HTML window) ---------------- */

function openPrintWindow(sections, meta) {
  const css = `
    * { box-sizing: border-box; }
    body { font-family: 'Inter', Arial, sans-serif; color: #111; background: #fff; margin: 0; padding: 32px; }
    h1 { font-family: 'Space Grotesk', Arial, sans-serif; font-size: 26px; margin: 0 0 4px; letter-spacing: -0.02em; }
    .meta { color: #555; font-size: 12px; margin-bottom: 24px; }
    .meta span { margin-right: 16px; }
    h2 { font-family: 'Space Grotesk', Arial, sans-serif; font-size: 16px; margin: 28px 0 4px; text-transform: uppercase; letter-spacing: 0.04em; }
    .sub { color: #666; font-size: 11px; margin: 0 0 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { text-align: left; background: #f4f4f4; border-bottom: 2px solid #111; padding: 6px 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; }
    td { padding: 6px 8px; border-bottom: 1px solid #e5e5e5; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    tr.mythical td { background: #ecfdf5; font-weight: 700; }
    .footer { margin-top: 32px; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
    @media print { body { padding: 0; } }
  `;

  const sectionHtml = sections.map((s) => {
    const head = `<tr><th>#</th><th>Player</th><th>Team</th><th>Div</th>` +
      s.columns.map((c) => `<th class="num">${c.label}</th>`).join("") + `</tr>`;
    const body = s.rows.map((r) => {
      const cls = s.mythical && r.rank <= (r._isVb ? 6 : 5) ? ' class="mythical"' : "";
      const cells = `<td>${r.rank}</td><td>${escapeHtml(r.player)} ${r.jersey ? `<span style="color:#888">${r.jersey}</span>` : ""}</td><td>${escapeHtml(r.team)}</td><td>${escapeHtml(r.division)}</td>` +
        s.columns.map((c) => `<td class="num">${r[c.key]}</td>`).join("");
      return `<tr${cls}>${cells}</tr>`;
    }).join("");
    return `<h2>${s.title}</h2><p class="sub">${s.subtitle}</p><table><thead>${head}</thead><tbody>${body}</tbody></table>`;
  }).join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Award Candidates — ${escapeHtml(meta.orgName)}</title><style>${css}</style></head>
    <body>
      <h1>Award Candidates Report</h1>
      <div class="meta"><span><strong>${escapeHtml(meta.orgName)}</strong></span>${meta.tournament ? `<span>${escapeHtml(meta.tournament)}</span>` : ""}<span>Generated ${meta.generated}</span></div>
      ${sectionHtml}
      <div class="footer">${ORG} · Award Candidates Report</div>
    </body></html>`;

  const w = window.open("", "_blank");
  if (!w) throw new Error("Allow popups to open the print report.");
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 350);
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

/* ---------------- PDF (jsPDF) ---------------- */

function downloadPdf(sections, meta) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;
  let y = margin;

  const ensure = (need) => {
    if (y + need > pageH - margin) { doc.addPage(); y = margin; }
  };

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Award Candidates Report", margin, y + 14);
  y += 24;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(`${meta.orgName}${meta.tournament ? "  ·  " + meta.tournament : ""}`, margin, y);
  doc.text(`Generated ${meta.generated}`, pageW - margin, y, { align: "right" });
  y += 10;
  doc.setDrawColor(200);
  doc.line(margin, y, pageW - margin, y);
  y += 16;
  doc.setTextColor(0);

  sections.forEach((s, si) => {
    ensure(60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(s.title, margin, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(s.subtitle, margin, y);
    y += 12;
    doc.setTextColor(0);

    // Table
    const rankW = 28, playerW = 120, teamW = 110, divW = 70;
    const statCols = s.columns;
    const statArea = pageW - margin - (margin + rankW + playerW + teamW + divW);
    const statW = statArea / statCols.length;
    const headers = ["#", "Player", "Team", "Div", ...statCols.map((c) => c.label)];

    const rowH = 16;
    // header row
    doc.setFillColor(244, 244, 244);
    doc.rect(margin, y, pageW - margin * 2, rowH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    let x = margin + 6;
    doc.text(headers[0], x, y + 11); x += rankW;
    doc.text(headers[1], x, y + 11); x += playerW;
    doc.text(headers[2], x, y + 11); x += teamW;
    doc.text(headers[3], x, y + 11); x += divW;
    statCols.forEach((c) => { doc.text(c.label, x + statW - 6, y + 11, { align: "right" }); x += statW; });
    doc.setDrawColor(180);
    doc.line(margin, y + rowH, pageW - margin, y + rowH);
    y += rowH;

    // body
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    s.rows.forEach((r, i) => {
      ensure(rowH);
      const isMyth = s.mythical && r.rank <= (r._isVb ? 6 : 5);
      if (isMyth) { doc.setFillColor(236, 253, 245); doc.rect(margin, y, pageW - margin * 2, rowH, "F"); }
      if (i % 2 === 0 && !isMyth) { doc.setFillColor(250, 250, 250); doc.rect(margin, y, pageW - margin * 2, rowH, "F"); }

      let xx = margin + 6;
      doc.text(String(r.rank), xx, y + 11); xx += rankW;
      const pname = truncate(doc, r.player, playerW - 10);
      doc.text(pname + (r.jersey ? " " + r.jersey : ""), xx, y + 11); xx += playerW;
      doc.text(truncate(doc, r.team, teamW - 10), xx, y + 11); xx += teamW;
      doc.text(truncate(doc, r.division, divW - 10), xx, y + 11); xx += divW;
      statCols.forEach((c) => { doc.text(String(r[c.key]), xx + statW - 6, y + 11, { align: "right" }); xx += statW; });

      y += rowH;
      doc.setDrawColor(232, 232, 232);
      doc.line(margin, y, pageW - margin, y);
    });
    y += 14;
  });

  // footer page numbers
  const pages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`${ORG} · Award Candidates Report`, margin, pageH - 16);
    doc.text(`Page ${p} of ${pages}`, pageW - margin, pageH - 16, { align: "right" });
  }

  const safe = (meta.orgName || "award-candidates").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const blobUrl = doc.output("bloburl");
  // Open in a new top-level tab so the browser download isn't blocked by the
  // builder preview iframe. Fallback to save() when no new tab is available.
  const win = window.open("", "_blank");
  if (win) {
    win.opener = null;
    win.location.replace(blobUrl);
  } else {
    doc.save(`${safe}-award-candidates.pdf`);
  }
}

function truncate(doc, str, maxW) {
  str = String(str ?? "");
  if (doc.getTextWidth(str) <= maxW) return str;
  let lo = 0, hi = str.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (doc.getTextWidth(str.slice(0, mid) + "…") <= maxW) lo = mid; else hi = mid - 1;
  }
  return str.slice(0, lo) + "…";
}

/* ---------------- Component ---------------- */

export default function AwardReportExport({ candidates, organization, disabled }) {
  const [busy, setBusy] = React.useState(null);

  const run = async (mode) => {
    if (!candidates || candidates.length === 0) return;
    setBusy(mode);
    try {
      const sections = buildReportSections(candidates, organization);
      const meta = reportMeta(organization);
      if (mode === "print") openPrintWindow(sections, meta);
      else downloadPdf(sections, meta);
    } catch (e) {
      console.error(e);
      alert(e.message || "Could not generate report.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" disabled={disabled || !candidates?.length || busy !== null} onClick={() => run("print")}>
        {busy === "print" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
        Print
      </Button>
      <Button size="sm" disabled={disabled || !candidates?.length || busy !== null} onClick={() => run("pdf")}>
        {busy === "pdf" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
        Download PDF
      </Button>
    </div>
  );
}