/**
 * One-shot cleanup for the GPS_MISMATCH false-positive bug.
 *
 * Background:
 *   Before the fix, every completed work order ran a 5 km radius check
 *   against the school's seeded coordinates. The seed script gives each
 *   school a random ±0.2° jitter around the district centroid (~40 km),
 *   so almost every legitimate completion was flagged as "GPS mismatch".
 *
 * What this script does:
 *   1. Resets `locationMismatch=true` -> `false` on every WorkOrder whose
 *      school's `location.verified` is not true (i.e. the comparison was
 *      never meaningful in the first place).
 *   2. Deletes the matching `GPS_MISMATCH` Alert documents.
 *
 * Usage:
 *   cd backend && node scripts/clearBogusGpsMismatches.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { WorkOrder, School, Alert } from '../models/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');

  const verifiedSchoolIds = (
    await School.find({ 'location.verified': true }).select('schoolId').lean()
  ).map(s => s.schoolId);

  const woFilter = {
    locationMismatch: true,
    schoolId: { $nin: verifiedSchoolIds },
  };

  const woMatches = await WorkOrder.countDocuments(woFilter);
  const woResult  = await WorkOrder.updateMany(woFilter, { $set: { locationMismatch: false } });
  console.log(`Reset ${woResult.modifiedCount}/${woMatches} work-order locationMismatch flags.`);

  const alertFilter = {
    type: 'GPS_MISMATCH',
    schoolId: { $nin: verifiedSchoolIds },
  };
  const alertResult = await Alert.deleteMany(alertFilter);
  console.log(`Deleted ${alertResult.deletedCount} GPS_MISMATCH alerts for unverified schools.`);

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
