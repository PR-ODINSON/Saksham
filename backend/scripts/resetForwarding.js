/**
 * resetForwarding.js — clears forwardedAt / reviewedAt on a specific week
 * so the principal sees the bundle as pending again. Useful if a peon
 * resubmitted before the new "auto-clear-on-resubmit" rule was deployed.
 *
 * Usage:
 *   node scripts/resetForwarding.js 2126 17        (reset school 2126 week 17)
 *   node scripts/resetForwarding.js 2126           (reset every week for school 2126)
 *   node scripts/resetForwarding.js --all          (reset every record — use with care)
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import dns from 'dns';
import { SchoolConditionRecord } from '../models/index.js';

try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (_) {}

const args = process.argv.slice(2);
if (!args.length) {
  console.error('Usage: node scripts/resetForwarding.js <schoolId> [weekNumber]   |   --all');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });

const filter = {};
if (args[0] === '--all') {
  // empty filter → reset every record
} else {
  filter.schoolId = Number(args[0]);
  if (args[1]) filter.weekNumber = Number(args[1]);
}

const before = await SchoolConditionRecord.countDocuments({
  ...filter,
  forwardedAt: { $ne: null },
});

const result = await SchoolConditionRecord.updateMany(filter, {
  $unset: {
    forwardedAt: '',
    forwardedBy: '',
    reviewedAt: '',
    reviewedBy: '',
    reviewNote: '',
  },
});

console.log(`Reset forwarding on ${result.modifiedCount} record(s) (was forwarded: ${before}).`);
console.log('The principal should now see the affected bundles as PENDING again.');

await mongoose.disconnect();
process.exit(0);
