/**
 * PDF Report Generator — Saksham PS-03
 *
 * PDFKit layout rules enforced throughout:
 *  • ALWAYS pass explicit (x, y) to every doc.text() call so doc.x never
 *    "drifts" to the right after a table column render.
 *  • After a multi-column table row, manually advance doc.y.
 *  • The working area is x: 50–545 (495 px wide) on A4.
 */
import PDFDocument from 'pdfkit';
import fs          from 'fs';
import path        from 'path';
import { fileURLToPath } from 'url';
import { SchoolConditionRecord, School, User } from '../models/index.js';
import { predictRiskForCategory } from './predictionEngine.js';

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = path.join(__dirname, '..', 'uploads', 'reports');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const L  = 50;          // left margin
const R  = 545;         // right margin
const W  = R - L;       // usable width = 495

const CATEGORIES = ['plumbing', 'electrical', 'structural'];

// ── helpers ──────────────────────────────────────────────────────────────────

function resolveImagePath(src) {
  if (!src) return null;
  if (path.isAbsolute(src)) return fs.existsSync(src) ? src : null;
  const rel = src.startsWith('/uploads/') ? src.slice('/uploads/'.length) : src;
  const abs = path.join(UPLOADS_DIR, rel);
  return fs.existsSync(abs) ? abs : null;
}

/** Write a horizontal rule at the current y, then advance. */
function hr(doc) {
  const y = doc.y;
  doc.moveTo(L, y).lineTo(R, y).strokeColor('#e2e8f0').lineWidth(1).stroke()
    .strokeColor('black').lineWidth(1);
  doc.y = y + 8;
}

/**
 * Write a section heading. Always resets x to L first.
 * Returns the y after the heading so callers can continue from there.
 */
function heading(doc, text, opts = {}) {
  const { color = '#0f172a', size = 12 } = opts;
  doc.y += 6;
  doc
    .fontSize(size)
    .font('Helvetica-Bold')
    .fillColor(color)
    .text(text, L, doc.y, { width: W, lineBreak: false });
  doc.fillColor('black');
  doc.y += 16;
  hr(doc);
}

/**
 * Write a single line of body text, always anchored to x=L.
 */
function body(doc, text, opts = {}) {
  const { size = 9, color = 'black', indent = 0, bold = false } = opts;
  doc
    .fontSize(size)
    .font(bold ? 'Helvetica-Bold' : 'Helvetica')
    .fillColor(color)
    .text(text, L + indent, doc.y, { width: W - indent });
  doc.fillColor('black');
}

/**
 * Render a table row with N columns.
 * Each column: { text, x, width }.
 * Returns the row height used.
 */
function tableRow(doc, cols, rowY, fontSize = 9, bold = false) {
  const ROW_H = fontSize + 8;
  doc.fontSize(fontSize).font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor('black');
  for (const { text, x, w } of cols) {
    doc.text(String(text ?? '—'), x, rowY, { width: w, lineBreak: false });
  }
  // Manually advance to avoid cursor-drift
  doc.y = rowY + ROW_H;
  return ROW_H;
}

/** Ensure there's room for `needed` px; add a page if not. */
function ensureSpace(doc, needed = 80) {
  if (doc.y + needed > 760) {
    doc.addPage();
    doc.y = 60;
  }
}

// ── Table column layout (fits in 495 px) ─────────────────────────────────────
const T_COLS = [
  { key: 'category',   label: 'Category',       x: L,        w: 90  },
  { key: 'rating',     label: 'Rating (1–5)',    x: L + 95,   w: 55  },
  { key: 'trend',      label: '8-wk Trend',      x: L + 155,  w: 95  },
  { key: 'flags',      label: 'Issue Flags',      x: L + 255,  w: 125 },
  { key: 'risk',       label: 'Risk Score',       x: L + 385,  w: 60  },
];

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateAndSendPDF(reportId) {
  const anchor = await SchoolConditionRecord.findById(reportId).lean();
  if (!anchor) throw new Error('Report record not found');

  const { schoolId, weekNumber } = anchor;

  const weekRecords = await SchoolConditionRecord.find({ schoolId, weekNumber })
    .sort({ category: 1 }).lean();

  const school = await School.findOne({ schoolId }).lean();

  const historyByCat = {};
  for (const cat of CATEGORIES) {
    historyByCat[cat] = await SchoolConditionRecord.find({ schoolId, category: cat })
      .sort({ weekNumber: 1 }).lean();
  }

  const predictions = {};
  for (const cat of CATEGORIES) {
    const catHistory = historyByCat[cat];
    if (!catHistory.length) continue;
    const wh     = catHistory.map(r => ({ conditionScore: r.conditionScore, weekNumber: r.weekNumber }));
    const latest = catHistory[catHistory.length - 1];
    predictions[cat] = await predictRiskForCategory({
      weekHistory: wh,
      buildingAge:   latest.buildingAge   ?? 20,
      weatherZone:   latest.weatherZone   ?? 'Dry',
      category:      cat,
      isGirlsSchool: latest.isGirlsSchool ?? false,
      numStudents:   latest.numStudents   ?? 0,
      flags: {
        waterLeak:             latest.waterLeak,
        wiringExposed:         latest.wiringExposed,
        roofLeakFlag:          latest.roofLeakFlag,
        issueFlag:             latest.issueFlag,
        crackWidthMM:          latest.crackWidthMM,
        toiletFunctionalRatio: latest.toiletFunctionalRatio,
        powerOutageHours:      latest.powerOutageHours,
      },
    });
  }

  let reviewerName  = 'N/A';
  let forwarderName = 'N/A';
  if (anchor.reviewedBy) {
    const u = await User.findById(anchor.reviewedBy).select('name').lean();
    if (u) reviewerName = u.name;
  }
  if (anchor.forwardedBy) {
    const u = await User.findById(anchor.forwardedBy).select('name').lean();
    if (u) forwarderName = u.name;
  }

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const filePath = path.join(REPORTS_DIR, `school-${schoolId}-w${weekNumber}-report.pdf`);

  await new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ margin: 50, size: 'A4', autoFirstPage: true });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    stream.on('finish', resolve);
    stream.on('error',  reject);

    const now        = new Date();
    const schoolName = school?.name || `School ${schoolId}`;
    const district   = anchor.district || school?.district || 'N/A';

    // ── Cover header block ────────────────────────────────────────────────────
    doc.rect(L, 40, W, 75).fill('#0f172a');
    doc
      .fillColor('white')
      .fontSize(15).font('Helvetica-Bold')
      .text('SAKSHAM — SCHOOL INFRASTRUCTURE REPORT', L + 10, 52, { width: W - 20, align: 'center' });
    doc
      .fontSize(9).font('Helvetica')
      .text(
        `${schoolName}  ·  District: ${district}  ·  Block: ${anchor.block || 'N/A'}  ·  Week ${weekNumber}`,
        L + 10, 75, { width: W - 20, align: 'center' }
      );
    doc.fillColor('black');
    doc.y = 130;

    doc
      .fontSize(8).font('Helvetica').fillColor('#64748b')
      .text(
        `Generated: ${now.toLocaleString()}  ·  ${weekRecords.length} categor${weekRecords.length !== 1 ? 'ies' : 'y'} submitted`,
        L, doc.y, { width: W, align: 'right' }
      );
    doc.fillColor('black');
    doc.y += 6;
    hr(doc);

    // ── Section 1 — Condition Summary ────────────────────────────────────────
    heading(doc, 'Section 1 — Condition Summary (All Categories)', { color: '#1d4ed8' });

    // Table header row
    const hdrY = doc.y;
    tableRow(doc,
      T_COLS.map(c => ({ text: c.label, x: c.x, w: c.w })),
      hdrY, 9, true
    );
    doc.y += 2;
    hr(doc);

    // Data rows
    for (const cat of CATEGORIES) {
      const r  = weekRecords.find(wr => wr.category === cat);
      const ch = historyByCat[cat];
      ensureSpace(doc, 20);
      const latestRec = r || (ch?.length ? ch[ch.length - 1] : null);
      if (!latestRec) {
        const rowY = doc.y;
        tableRow(doc, [
          { text: cat.charAt(0).toUpperCase() + cat.slice(1), x: T_COLS[0].x, w: T_COLS[0].w },
          { text: '—', x: T_COLS[1].x, w: T_COLS[1].w },
          { text: 'No data', x: T_COLS[2].x, w: T_COLS[2].w },
          { text: '—', x: T_COLS[3].x, w: T_COLS[3].w },
          { text: '—', x: T_COLS[4].x, w: T_COLS[4].w },
        ], rowY, 9);
        continue;
      }
      const trend = ch?.length >= 2
        ? (ch[ch.length - 1].conditionScore > ch[ch.length - 2].conditionScore ? '↑ Worsening' : '↓ Improving')
        : 'Stable';
      const flagArr = [
        latestRec.waterLeak     && 'Water Leak',
        latestRec.wiringExposed && 'Wiring',
        latestRec.roofLeakFlag  && 'Roof Leak',
        latestRec.issueFlag     && 'Issue',
      ].filter(Boolean);
      const flagText = flagArr.join(', ') || 'None';
      const risk     = predictions[cat]?.riskScore ?? latestRec.priorityScore ?? 0;

      const rowY = doc.y;
      tableRow(doc, [
        { text: cat.charAt(0).toUpperCase() + cat.slice(1), x: T_COLS[0].x, w: T_COLS[0].w },
        { text: String(latestRec.conditionScore ?? '—'),    x: T_COLS[1].x, w: T_COLS[1].w },
        { text: trend,                                       x: T_COLS[2].x, w: T_COLS[2].w },
        { text: flagText,                                    x: T_COLS[3].x, w: T_COLS[3].w },
        { text: String(Math.round(risk)),                    x: T_COLS[4].x, w: T_COLS[4].w },
      ], rowY, 9);
    }
    doc.y += 4;

    // ── Section 2 — ML Predictions ───────────────────────────────────────────
    ensureSpace(doc, 60);
    const hasAlert = Object.values(predictions).some(p => p?.within_60_days);
    heading(doc, `Section 2 — ML Prediction${hasAlert ? ' ⚠ Alert' : ''}`,
      { color: hasAlert ? '#dc2626' : '#0f172a' });

    if (!hasAlert) {
      body(doc, 'No categories predicted to fail within 60 days. Infrastructure is stable.');
    } else {
      for (const [cat, pred] of Object.entries(predictions)) {
        if (!pred?.within_60_days) continue;
        ensureSpace(doc, 50);
        body(doc, cat.toUpperCase(), { bold: true, size: 10 });
        body(doc,
          `  Risk Score: ${pred.riskScore}/100  ·  Level: ${pred.riskLevel?.toUpperCase()}  ·  Days to Failure: ${pred.estimated_days_to_failure}`,
          { indent: 4 }
        );
        if (pred.estimated_days_to_failure != null) {
          const fd = new Date(now.getTime() + Number(pred.estimated_days_to_failure) * 86400000);
          body(doc, `  Predicted Failure Date: ${fd.toLocaleDateString()}`, { indent: 4 });
        }
        if (pred.evidence?.length) {
          body(doc, '  Evidence:', { bold: true, indent: 4 });
          for (const ev of pred.evidence.slice(0, 5)) {
            body(doc, `    • ${ev}`, { indent: 8 });
          }
        }
        doc.y += 4;
      }
    }

    // ── Section 3 — Per-category details & photos ─────────────────────────────
    ensureSpace(doc, 60);
    heading(doc, 'Section 3 — Category Details & Evidence Photos');

    for (const cat of CATEGORIES) {
      const r = weekRecords.find(wr => wr.category === cat);
      ensureSpace(doc, 30);
      if (!r) {
        body(doc, `${cat.charAt(0).toUpperCase() + cat.slice(1)}: No submission for this week.`,
          { color: '#94a3b8' });
        doc.y += 4;
        continue;
      }

      body(doc, cat.toUpperCase(), { bold: true, size: 10 });

      const details = [
        `Condition: ${r.conditionScore}/5`,
        `Issue: ${r.issueFlag ? 'Yes' : 'No'}`,
        r.waterLeak     ? 'Water Leak'        : null,
        r.wiringExposed ? 'Exposed wiring'    : null,
        r.roofLeakFlag  ? 'Roof leak'         : null,
        r.crackWidthMM  ? `Crack: ${r.crackWidthMM} mm` : null,
        r.toiletFunctionalRatio != null
          ? `Toilet: ${(r.toiletFunctionalRatio * 100).toFixed(0)}%` : null,
        r.powerOutageHours ? `Outage: ${r.powerOutageHours} hrs/wk` : null,
      ].filter(Boolean).join('  ·  ');
      body(doc, details, { indent: 4 });

      if (r.reviewNote) {
        body(doc, `Review note: ${r.reviewNote}`, { indent: 4, color: '#1d4ed8' });
      }

      // Evidence photos — render in a wrapping grid that advances rowY on each new row
      const imgPaths = (r.images || []).map(resolveImagePath).filter(Boolean);
      if (imgPaths.length) {
        ensureSpace(doc, 140);
        body(doc, 'Evidence Photos:', { bold: true, indent: 4 });
        doc.y += 4;

        const IMG_W = 120, IMG_H = 90, IMG_GAP = 10;
        let imgX = L + 4;
        let rowY = doc.y;
        for (const imgPath of imgPaths) {
          if (imgX + IMG_W > R) {
            // wrap to next row
            imgX  = L + 4;
            rowY += IMG_H + IMG_GAP;
            // ensure new row fits, otherwise add a page
            if (rowY + IMG_H > 770) {
              doc.addPage();
              rowY = 60;
            }
          }
          try {
            doc.image(imgPath, imgX, rowY, { fit: [IMG_W, IMG_H], align: 'center', valign: 'center' });
          } catch (_) { /* skip unembeddable images */ }
          imgX += IMG_W + IMG_GAP;
        }
        doc.y = rowY + IMG_H + IMG_GAP;
      } else if (r.photoUploaded === false || (!r.images || r.images.length === 0)) {
        body(doc, 'Evidence Photos: None attached', { color: '#94a3b8', indent: 4 });
      }
      doc.y += 6;
    }

    // ── Section 4 — Principal Notes ───────────────────────────────────────────
    ensureSpace(doc, 40);
    heading(doc, 'Section 4 — Principal Notes');
    const hasNote = weekRecords.some(r => r.reviewNote);
    if (!hasNote) {
      body(doc, 'No review notes provided for this week.');
    } else {
      for (const r of weekRecords) {
        if (r.reviewNote) {
          body(doc, `${r.category.toUpperCase()}: ${r.reviewNote}`, { indent: 4 });
        }
      }
    }

    // ── Section 5 — Audit Trail ────────────────────────────────────────────────
    ensureSpace(doc, 50);
    heading(doc, 'Section 5 — Audit Trail');
    body(doc, `Submitted at:    ${anchor.createdAt ? new Date(anchor.createdAt).toLocaleString() : 'N/A'}`);
    if (anchor.reviewedAt) {
      body(doc, `Reviewed by:     ${reviewerName} at ${new Date(anchor.reviewedAt).toLocaleString()}`);
    }
    const fwdRecs = weekRecords.filter(r => r.forwardedAt);
    if (fwdRecs.length) {
      body(doc, `Forwarded:       ${fwdRecs.length}/${weekRecords.length} categor${fwdRecs.length !== 1 ? 'ies' : 'y'} sent to DEO`);
      body(doc, `                 by ${forwarderName} at ${new Date(fwdRecs[0].forwardedAt).toLocaleString()}`);
    }
    const totalPhotos = weekRecords.reduce((s, r) => s + (r.images?.length || 0), 0);
    body(doc, `Photos attached: ${totalPhotos} image${totalPhotos !== 1 ? 's' : ''}`);

    doc.end();
  });

  return filePath;
}
