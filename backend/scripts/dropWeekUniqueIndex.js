/**
 * dropWeekUniqueIndex.js — one-shot maintenance script.
 *
 * The SchoolConditionRecord collection used to have a UNIQUE compound index
 * on { schoolId: 1, category: 1, weekNumber: 1 } that limited peons to a
 * single submission per (school, category, week). For testing mode we relaxed
 * the schema to a non-unique index, but Mongo keeps the *existing* unique
 * index in the collection until it is explicitly dropped — otherwise every
 * second submission for the same week would fail with a duplicate-key error.
 *
 * This script:
 *   1. Lists current indexes on `school_condition_records`.
 *   2. Drops the unique compound index (whatever it is named).
 *   3. Re-syncs the model so the new non-unique index is created.
 *
 * Usage:
 *   node scripts/dropWeekUniqueIndex.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import dns from 'dns';
import { SchoolConditionRecord } from '../models/index.js';

try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (_) {}

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });

const coll = SchoolConditionRecord.collection;

console.log('Existing indexes on', coll.collectionName);
const indexes = await coll.indexes();
for (const idx of indexes) {
  console.log(' -', idx.name, JSON.stringify(idx.key), idx.unique ? '(UNIQUE)' : '');
}

const target = indexes.find(i =>
  i.unique &&
  i.key &&
  i.key.schoolId === 1 &&
  i.key.category === 1 &&
  i.key.weekNumber === 1
);

if (!target) {
  console.log('\nNo unique { schoolId, category, weekNumber } index found — nothing to drop.');
} else {
  console.log(`\nDropping unique index "${target.name}" ...`);
  await coll.dropIndex(target.name);
  console.log('Dropped.');
}

console.log('\nRebuilding indexes from current schema (non-unique compound) ...');
await SchoolConditionRecord.syncIndexes();

console.log('\nFinal indexes:');
for (const idx of await coll.indexes()) {
  console.log(' -', idx.name, JSON.stringify(idx.key), idx.unique ? '(UNIQUE)' : '');
}

await mongoose.disconnect();
process.exit(0);
