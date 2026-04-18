/**
 * CSV Data Pipeline — PS-03 (v2)
 * ───────────────────────────────
 * Maps TS-PS3.csv directly into the new schema:
 *
 *  CSV row  →  school_condition_records  (1:1, 50 000 docs)
 *           →  maintenance_decisions     (for rows with issueFlag=true)
 *           →  alerts                   (for rows with failure predictions)
 *           →  district_analytics       (aggregated per district)
 *
 * Run from backend/:
 *   node scripts/loadCSV.js
 */

import 'dotenv/config';
import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

import connectDB from '../config/database.js';
import {
  SchoolConditionRecord,
  MaintenanceDecision,
  Alert,
  DistrictAnalytics,
} from '../models/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH  = path.resolve(__dirname, '../../TS-PS3.csv');

// ─── CSV parser (readline — handles large files efficiently) ─────────────────
async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return reject(new Error(`CSV not found at: ${filePath}`));
    }
    const rows    = [];
    let   headers = null;
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });
    rl.on('line', line => {
      if (!line.trim()) return;
      const values = line.split(',');
      if (!headers) { headers = values.map(h => h.trim()); return; }
      const row = {};
      headers.forEach((h, i) => { row[h] = (values[i] ?? '').trim(); });
      rows.push(row);
    });
    rl.on('close',  () => resolve(rows));
    rl.on('error', reject);
  });
}

// ─── Enum guard — returns value only if it's in the allowed list ─────────────
function enumOrUndef(value, allowed) {
  return allowed.includes(value) ? value : undefined;
}

// ─── Map one CSV row → SchoolConditionRecord document ───────────────────────
// Returns null (+ logs) for rows that are missing required anchor fields.
function rowToRecord(row, rowIndex) {
  try {
    const schoolId   = Number(row.school_id);
    const weekNumber = Number(row.week_number);
    const category   = enumOrUndef(row.category, ['plumbing', 'electrical', 'structural']);

    if (!schoolId || !weekNumber || !category) {
      console.warn(`  [row ${rowIndex}] skip — missing required field(s): ` +
        `school_id=${row.school_id}, week_number=${row.week_number}, category=${row.category}`);
      return null;
    }

    const conditionScore = Number(row.condition_score);
    if (conditionScore < 1 || conditionScore > 5) {
      console.warn(`  [row ${rowIndex}] skip — condition_score out of range: ${row.condition_score}`);
      return null;
    }

    // days_to_failure: blank means no prediction available (not an error)
    const rawDtf          = (row.days_to_failure ?? '').trim();
    const daysToFailure   = rawDtf !== '' && !isNaN(rawDtf) ? parseFloat(rawDtf) : undefined;

    const rawDsr          = (row.days_since_repair ?? '').trim();
    const daysSinceRepair = rawDsr !== '' && !isNaN(rawDsr) ? Number(rawDsr)  : undefined;

    return {
      schoolId,
      district:              row.district,
      block:                 row.block                                        || undefined,
      schoolType:            enumOrUndef(row.school_type, ['Primary', 'Secondary']),
      isGirlsSchool:         row.girls_school              === '1',
      numStudents:           Number(row.num_students)                         || 0,
      buildingAge:           Number(row.building_age)                         || 0,
      materialType:          enumOrUndef(row.material_type,  ['RCC', 'Brick', 'Mixed', 'Temporary']),
      weatherZone:           enumOrUndef(row.weather_zone,   ['Dry', 'Heavy Rain', 'Coastal', 'Tribal']),
      category,
      weekNumber,
      conditionScore,
      issueFlag:             row.issue_flag              === '1',
      waterLeak:             row.water_leak              === '1',
      wiringExposed:         row.wiring_exposed          === '1',
      crackWidthMM:          parseFloat(row.crack_width_mm)             || 0,
      toiletFunctionalRatio: parseFloat(row.toilet_functional_ratio)    || 0,
      powerOutageHours:      parseFloat(row.power_outage_hours_weekly)  || 0,
      roofLeakFlag:          row.roof_leak_flag          === '1',
      photoUploaded:         row.photo_uploaded          === '1',
      // ── Prediction ground-truth signals (TS-PS3 training labels) ──────────
      daysToFailure,
      willFailWithin30Days:  row.failure_within_30_days  === '1',
      willFailWithin60Days:  row.failure_within_60_days  === '1',
      priorityScore:         parseFloat(row.priority_score)             || 0,
      // ── Repair / SLA ──────────────────────────────────────────────────────
      repairDone:            row.repair_done             === '1',
      daysSinceRepair,
      contractorDelayDays:   Number(row.contractor_delay_days)          || 0,
      slaBreach:             row.sla_breach              === '1',
    };
  } catch (err) {
    console.warn(`  [row ${rowIndex}] skip — unexpected parse error: ${err.message}`);
    return null;
  }
}

// ─── Batch insert ─────────────────────────────────────────────────────────────
// ordered:false lets MongoDB skip duplicate-key violations and continue.
// Bulk-write errors (validation, cast) are logged at batch level.
async function batchInsert(Model, docs, batchSize = 500) {
  if (docs.length === 0) { console.log('  (nothing to insert)'); return; }
  let done = 0;
  let skipped = 0;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    try {
      await Model.insertMany(batch, { ordered: false });
    } catch (err) {
      // BulkWriteError: some docs were inserted, some skipped (dup-key / validation)
      const inserted = err.result?.nInserted ?? 0;
      const failed   = batch.length - inserted;
      skipped += failed;
      if (process.env.CSV_VERBOSE === '1' && err.writeErrors?.length) {
        err.writeErrors.slice(0, 5).forEach(we =>
          console.warn(`    batch error [idx ${we.index}]: ${we.errmsg}`),
        );
      }
    }
    done += Math.min(batchSize, docs.length - i);
    process.stdout.write(`\r  ${done.toLocaleString()} / ${docs.length.toLocaleString()}`);
  }
  process.stdout.write('\n');
  if (skipped > 0) console.log(`  ⚠  ${skipped} documents skipped (dup-key or validation errors)`);
}

// ─── Priority level from numeric score ──────────────────────────────────────
function toPriorityLevel(score) {
  if (score >= 80) return 'urgent';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

// ─── Explainability reasons ──────────────────────────────────────────────────
function buildReasons(r, computedScore) {
  const reasons = [];
  if (r.conditionScore >= 4)   reasons.push(`Condition score ${r.conditionScore}/5 — poor`);
  else if (r.conditionScore === 3) reasons.push(`Condition score ${r.conditionScore}/5 — moderate`);
  if (r.willFailWithin30Days)  reasons.push('Failure predicted within 30 days');
  else if (r.willFailWithin60Days) reasons.push('Failure predicted within 60 days');
  if (r.buildingAge > 20)      reasons.push(`Building age ${r.buildingAge} years`);
  if (r.weatherZone && r.weatherZone !== 'Dry') reasons.push(`${r.weatherZone} weather zone`);
  if (r.waterLeak)             reasons.push('Active water leak');
  if (r.wiringExposed)         reasons.push('Exposed wiring');
  if (r.roofLeakFlag)          reasons.push('Roof leak present');
  if (r.slaBreach)             reasons.push('SLA breach on record');
  if (r.isGirlsSchool && r.category === 'plumbing') {
    reasons.push("Girls' school — plumbing priority boost (+15)");
  }
  return reasons;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  PS-03 CSV Pipeline (v2) — TS-PS3.csv → MongoDB');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await connectDB();

  // ── 1. Parse CSV ────────────────────────────────────────────────────────
  console.log(`[1/5] Reading CSV…`);
  const rows = await parseCSV(CSV_PATH);
  console.log(`      → ${rows.length.toLocaleString()} rows\n`);

  // ── 2. Load school_condition_records (1 row = 1 doc) ─────────────────────
  console.log('[2/5] Loading → school_condition_records');
  const records = rows
    .map((row, i) => rowToRecord(row, i + 2)) // +2 → 1-indexed + header row
    .filter(Boolean);
  await batchInsert(SchoolConditionRecord, records);
  const totalRecords = await SchoolConditionRecord.countDocuments();
  console.log(`      ✓ ${totalRecords.toLocaleString()} documents\n`);

  // ── 3. Generate maintenance_decisions ────────────────────────────────────
  console.log('[3/5] Generating → maintenance_decisions');
  // Decisions are created for every record that has an issue flag set
  const decisionSources = await SchoolConditionRecord.find({ issueFlag: true })
    .select('_id schoolId district category weekNumber conditionScore priorityScore numStudents isGirlsSchool buildingAge weatherZone waterLeak wiringExposed roofLeakFlag slaBreach willFailWithin30Days willFailWithin60Days repairDone')
    .lean();

  const decisions = decisionSources.map(r => {
    // Girls' school plumbing gets a +15 priority boost
    let computedScore = r.priorityScore;
    if (r.category === 'plumbing' && r.isGirlsSchool) {
      computedScore = Math.min(100, computedScore + 15);
    }
    return {
      recordId:  r._id,
      schoolId:  r.schoolId,
      district:  r.district,
      category:  r.category,
      weekNumber: r.weekNumber,
      decision: {
        computedPriorityScore: Math.round(computedScore),
        priorityLevel:         toPriorityLevel(computedScore),
      },
      impact: {
        studentsAffected: r.numStudents || 0,
        isGirlsSchool:    r.isGirlsSchool || false,
        criticalFacility: r.conditionScore >= 4,
      },
      explainability: {
        reasons: buildReasons(r, computedScore),
      },
      status: 'pending',
    };
  });

  await batchInsert(MaintenanceDecision, decisions);
  console.log(`      ✓ ${(await MaintenanceDecision.countDocuments()).toLocaleString()} documents\n`);

  // ── 4. Generate alerts ───────────────────────────────────────────────────
  console.log('[4/5] Generating → alerts');
  const alertSources = await SchoolConditionRecord.find({
    $or: [
      { willFailWithin30Days: true },
      { willFailWithin60Days: true },
      { priorityScore: { $gte: 80 } },
    ],
  })
    .select('schoolId district category weekNumber conditionScore willFailWithin30Days willFailWithin60Days priorityScore repairDone')
    .lean();

  const alerts = alertSources.map(r => {
    let type;
    if (r.willFailWithin30Days)    type = 'FAILURE_30_DAYS';
    else if (r.willFailWithin60Days) type = 'FAILURE_60_DAYS';
    else                            type = 'HIGH_PRIORITY';

    const condLabel = r.conditionScore >= 4 ? 'poor' : r.conditionScore === 3 ? 'moderate' : 'good';
    const action    = type === 'FAILURE_30_DAYS'  ? 'Failure predicted within 30 days — urgent action needed.'
                    : type === 'FAILURE_60_DAYS'  ? 'Failure predicted within 60 days.'
                    :                               'High priority maintenance required.';
    return {
      schoolId:   r.schoolId,
      district:   r.district,
      category:   r.category,
      type,
      message:    `School #${r.schoolId} (${r.district}) — ${r.category} is ${condLabel} in week ${r.weekNumber}. ${action}`,
      isResolved: r.repairDone || false,
    };
  });

  await batchInsert(Alert, alerts);
  console.log(`      ✓ ${(await Alert.countDocuments()).toLocaleString()} documents\n`);

  // ── 5. Generate district_analytics ──────────────────────────────────────
  console.log('[5/5] Computing → district_analytics');
  const districtGroups = await SchoolConditionRecord.aggregate([
    {
      $group: {
        _id:    '$district',
        uniqueSchools:    { $addToSet: '$schoolId' },
        avgCondScore:     { $avg: '$conditionScore' },
        highPriority:     { $sum: { $cond: [{ $gte: ['$priorityScore', 60] }, 1, 0] } },
        fail30:           { $sum: { $cond: ['$willFailWithin30Days', 1, 0] } },
        fail60:           { $sum: { $cond: ['$willFailWithin60Days', 1, 0] } },
        plumbingHigh:     { $sum: { $cond: [{ $and: [{ $eq: ['$category', 'plumbing'] },   { $gte: ['$priorityScore', 60] }] }, 1, 0] } },
        electricalHigh:   { $sum: { $cond: [{ $and: [{ $eq: ['$category', 'electrical'] }, { $gte: ['$priorityScore', 60] }] }, 1, 0] } },
        structuralHigh:   { $sum: { $cond: [{ $and: [{ $eq: ['$category', 'structural'] }, { $gte: ['$priorityScore', 60] }] }, 1, 0] } },
        slaBreach:        { $sum: { $cond: ['$slaBreach', 1, 0] } },
      },
    },
  ]);

  const analyticsRows = districtGroups.map(d => ({
    district:                d._id,
    totalSchools:            d.uniqueSchools.length,
    avgConditionScore:       Math.round(d.avgCondScore * 100) / 100,
    highPriorityCount:       d.highPriority,
    failureWithin30DaysCount: d.fail30,
    failureWithin60DaysCount: d.fail60,
    categoryBreakdown: {
      plumbing:   d.plumbingHigh,
      electrical: d.electricalHigh,
      structural: d.structuralHigh,
    },
    slaBreachCount: d.slaBreach,
    generatedAt:    new Date(),
  }));

  await batchInsert(DistrictAnalytics, analyticsRows, 100);
  const totalDistricts = await DistrictAnalytics.countDocuments();
  console.log(`      ✓ ${totalDistricts} district analytics entries\n`);

  // ── Summary ──────────────────────────────────────────────────────────────
  const [r, d, a, da] = await Promise.all([
    SchoolConditionRecord.countDocuments(),
    MaintenanceDecision.countDocuments(),
    Alert.countDocuments(),
    DistrictAnalytics.countDocuments(),
  ]);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Collection                   Documents');
  console.log('  ─────────────────────────────────────────');
  console.log(`  school_condition_records     ${r.toLocaleString()}`);
  console.log(`  maintenance_decisions        ${d.toLocaleString()}`);
  console.log(`  alerts                       ${a.toLocaleString()}`);
  console.log(`  district_analytics           ${da}`);
  console.log(`  work_orders                  0   (created via API)`);
  console.log(`  repair_logs                  0   (created via API)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('\n✗ Pipeline failed:', err.message);
  process.exit(1);
});
