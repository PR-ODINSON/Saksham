/**
 * CSV Data Pipeline — PS-03
 * ─────────────────────────
 * Reads TS-PS3.csv from the project root and populates:
 *   1. schools            (unique schools from CSV)
 *   2. condition_reports  (grouped by school + week)
 *   3. risk_predictions   (per-category predictions for every school)
 *
 * Run from the backend/ directory:
 *   node scripts/loadCSV.js
 *
 * Run via npm script (add to package.json):
 *   "load-csv": "node scripts/loadCSV.js"
 */

import 'dotenv/config';
import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

import connectDB from '../config/database.js';
import School from '../models/School.js';
import ConditionReport from '../models/ConditionReport.js';
import RiskPrediction from '../models/RiskPrediction.js';
import { predictRiskForCategory } from '../services/predictionEngine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// TS-PS3.csv sits at the repo root (one level above backend/)
const CSV_PATH = path.resolve(__dirname, '../../TS-PS3.csv');

// ─── Condition score → condition label ───────────────────────────────────────
// condition_score 1-2 → good | 3 → moderate | 4-5 → poor
function mapConditionScore(score) {
  const s = Number(score);
  if (s <= 2) return 'good';
  if (s === 3) return 'moderate';
  return 'poor';
}

// ─── Week number → Date ───────────────────────────────────────────────────────
// Week 1 = Jan 1, 2024 (Monday reference)
function weekToDate(weekNum) {
  const base = new Date(2024, 0, 1); // Jan 1, 2024
  base.setDate(base.getDate() + (Number(weekNum) - 1) * 7);
  return base;
}

// ─── Batch upsert helper ──────────────────────────────────────────────────────
async function batchUpsert(Model, documents, filterFn, batchSize = 200) {
  let inserted = 0;
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    await Promise.all(
      batch.map(doc =>
        Model.findOneAndUpdate(filterFn(doc), doc, { upsert: true, new: true }).catch(() => null),
      ),
    );
    inserted += batch.length;
    process.stdout.write(`\r  ${inserted}/${documents.length}`);
  }
  process.stdout.write('\n');
}

// ─── Parse CSV via readline (handles large files without buffering all lines) ─
async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return reject(new Error(`CSV file not found: ${filePath}`));
    }

    const rows = [];
    let headers = null;

    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });

    rl.on('line', line => {
      if (!line.trim()) return;
      const values = line.split(',');
      if (!headers) {
        headers = values.map(h => h.trim());
        return;
      }
      const row = {};
      headers.forEach((h, i) => { row[h] = (values[i] || '').trim(); });
      rows.push(row);
    });

    rl.on('close', () => resolve(rows));
    rl.on('error', reject);
  });
}

// ─── Main pipeline ────────────────────────────────────────────────────────────
async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  PS-03 CSV Data Pipeline — TS-PS3.csv');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await connectDB();

  // ── Step 1: Parse CSV ────────────────────────────────────────────────────
  console.log(`[1/5] Reading CSV: ${CSV_PATH}`);
  const rows = await parseCSV(CSV_PATH);
  console.log(`      → ${rows.length.toLocaleString()} rows loaded\n`);

  // ── Step 2: Build unique school records ──────────────────────────────────
  console.log('[2/5] Building school records…');
  const schoolMap = {};
  for (const row of rows) {
    const id = row.school_id;
    if (!id) continue;
    if (!schoolMap[id]) {
      schoolMap[id] = {
        csvSchoolId: Number(id),
        name:        `${row.district} Govt School #${id}`,
        district:    row.district    || 'Unknown',
        block:       row.block       || '',
        buildingAge: Number(row.building_age) || 10,
        studentCount: Number(row.num_students) || 0,
        material:    row.material_type || 'Other',
        weatherZone: row.weather_zone  || 'Dry',
        isGirlsSchool: row.girls_school === '1',
      };
    }
  }

  const schoolDefs = Object.values(schoolMap);
  console.log(`      → ${schoolDefs.length} unique schools`);

  // Upsert schools (match on csvSchoolId)
  await batchUpsert(School, schoolDefs, doc => ({ csvSchoolId: doc.csvSchoolId }));
  console.log('      ✓ Schools upserted\n');

  // Build csvSchoolId → MongoDB _id lookup
  const dbSchools = await School.find({ csvSchoolId: { $in: Object.keys(schoolMap).map(Number) } })
    .select('_id csvSchoolId buildingAge weatherZone isGirlsSchool')
    .lean();
  const schoolIdLookup = {};
  for (const s of dbSchools) { schoolIdLookup[s.csvSchoolId] = s; }

  // ── Step 3: Group rows into per-(school, week) condition reports ──────────
  console.log('[3/5] Grouping into weekly condition reports…');
  const reportMap = {};

  for (const row of rows) {
    const csvId = Number(row.school_id);
    const week  = Number(row.week_number);
    if (!csvId || !week) continue;

    const school = schoolIdLookup[csvId];
    if (!school) continue;

    const cat = row.category;
    if (!['plumbing', 'electrical', 'structural'].includes(cat)) continue;

    const key = `${school._id}-${week}`;
    if (!reportMap[key]) {
      reportMap[key] = {
        schoolId: school._id,
        weekOf:   weekToDate(week),
        items:    [],
        _scoreSum: 0, _scoreCount: 0,
      };
    }

    const condition = mapConditionScore(row.condition_score);
    reportMap[key].items.push({ category: cat, condition });
    reportMap[key]._scoreSum   += Number(row.condition_score) || 3;
    reportMap[key]._scoreCount += 1;
  }

  // Convert to plain report documents (drop helper fields)
  const reportDocs = Object.values(reportMap).map(r => {
    const avgScore = r._scoreCount ? r._scoreSum / r._scoreCount : 3;
    // Simple risk label based on avg condition_score
    const riskLabel = avgScore <= 2 ? 'low' : avgScore <= 3 ? 'moderate' : avgScore <= 4 ? 'high' : 'critical';
    return {
      schoolId:  r.schoolId,
      weekOf:    r.weekOf,
      items:     r.items,
      riskScore: Math.round(((avgScore - 1) / 4) * 100),
      riskLevel: riskLabel,
    };
  });

  console.log(`      → ${reportDocs.length} weekly reports`);

  // Upsert reports (match on schoolId + weekOf)
  await batchUpsert(
    ConditionReport,
    reportDocs,
    doc => ({ schoolId: doc.schoolId, weekOf: doc.weekOf }),
  );
  console.log('      ✓ Reports upserted\n');

  // ── Step 4: Compute per-category risk predictions ─────────────────────────
  console.log('[4/5] Computing per-category risk predictions…');
  const PS03_CATEGORIES = ['plumbing', 'electrical', 'structural'];
  const uniqueSchoolIds = [...new Set(reportDocs.map(r => r.schoolId.toString()))];

  let predCount = 0;
  for (const schoolIdStr of uniqueSchoolIds) {
    const school = dbSchools.find(s => s._id.toString() === schoolIdStr);
    if (!school) continue;

    for (const category of PS03_CATEGORIES) {
      // Fetch last 3 reports for this school and extract the category condition
      const reports = await ConditionReport.find({ schoolId: school._id })
        .sort({ weekOf: -1 })
        .limit(3)
        .lean();

      const conditionHistory = reports.reduce((acc, report) => {
        const item = (report.items || []).find(i => i.category === category);
        if (item) acc.push({ condition: item.condition, weekOf: report.weekOf });
        return acc;
      }, []);

      const { riskScore, failureWindow, riskLevel, reason } = predictRiskForCategory(
        conditionHistory,
        school.buildingAge,
        school.weatherZone,
      );

      await RiskPrediction.findOneAndUpdate(
        { schoolId: school._id, category },
        { riskScore, failureWindow, riskLevel, reason, predictedAt: new Date() },
        { upsert: true, new: true },
      );

      predCount++;
    }

    // Update school cached score
    const preds = await RiskPrediction.find({ schoolId: school._id }).lean();
    if (preds.length > 0) {
      const maxScore = Math.max(...preds.map(p => p.riskScore));
      const maxLevel = maxScore > 66 ? 'high' : maxScore > 33 ? 'medium' : 'low';
      await School.findByIdAndUpdate(school._id, {
        lastRiskScore: maxScore, lastRiskCategory: maxLevel, lastAssessedAt: new Date(),
      });
    }

    process.stdout.write(`\r  ${predCount} predictions computed`);
  }
  process.stdout.write('\n');
  console.log('      ✓ Predictions stored\n');

  // ── Step 5: Summary ───────────────────────────────────────────────────────
  const [schoolCount, reportCount, predTotal] = await Promise.all([
    School.countDocuments(),
    ConditionReport.countDocuments(),
    RiskPrediction.countDocuments(),
  ]);

  console.log('[5/5] Pipeline complete ✓');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Schools in DB:      ${schoolCount}`);
  console.log(`  Reports in DB:      ${reportCount}`);
  console.log(`  Predictions in DB:  ${predTotal}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('\n✗ Pipeline failed:', err.message);
  process.exit(1);
});
