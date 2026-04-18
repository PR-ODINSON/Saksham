/**
 * Quick DB inspection — lists all collections and sample documents.
 * Run from backend/: node scripts/listCollections.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;

console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║     Saksham PS-03 — MongoDB Collections              ║');
console.log('╠══════════════════════════════════════════════════════╣');

const collections = await db.listCollections().toArray();
const sorted = collections.sort((a, b) => a.name.localeCompare(b.name));

for (const col of sorted) {
  const count = await db.collection(col.name).countDocuments();
  const bar   = '▓'.repeat(Math.min(20, Math.ceil(count / 1500)));
  console.log(`║  ${col.name.padEnd(22)} ${String(count).padStart(7).padEnd(10)} ${bar}`);
}
console.log('╚══════════════════════════════════════════════════════╝');

// ── Sample: one RiskPrediction ───────────────────────────────────────────────
const pred = await db.collection('riskpredictions').findOne();
if (pred) {
  const { _id, __v, schoolId, createdAt, updatedAt, ...rest } = pred;
  console.log('\n── Sample: riskpredictions ─────────────────────────────');
  console.log(JSON.stringify({ schoolId: schoolId?.toString(), ...rest }, null, 2));
}

// ── Sample: one School from CSV ──────────────────────────────────────────────
const school = await db.collection('schools').findOne({ csvSchoolId: { $exists: true } });
if (school) {
  const { _id, __v, createdAt, updatedAt, ...rest } = school;
  console.log('\n── Sample: schools (CSV-imported) ──────────────────────');
  console.log(JSON.stringify(rest, null, 2));
}

// ── Sample: one ConditionReport ──────────────────────────────────────────────
const report = await db.collection('conditionreports').findOne();
if (report) {
  const { _id, __v, schoolId, createdAt, updatedAt, ...rest } = report;
  console.log('\n── Sample: conditionreports ────────────────────────────');
  console.log(JSON.stringify({ schoolId: schoolId?.toString(), ...rest }, null, 2));
}

await mongoose.disconnect();
console.log('\n✓ Done\n');
