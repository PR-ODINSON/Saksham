/**
 * clearReports.js — wipes all report-pipeline data so you can test from scratch.
 *
 * DELETES:
 *   • school_condition_records  (peon reports)
 *   • report_images             (peon photos saved in Mongo)
 *   • maintenance_decisions     (LR predictions per record)
 *   • work_orders               (DEO → contractor assignments)
 *   • repair_logs               (contractor work updates)
 *   • alerts                    (notifications)
 *   • auditlogs                 (action history)
 *   • district_analytics        (will be empty until next submit)
 *
 * KEEPS:
 *   • users                     (peon / principal / DEO / contractor accounts)
 *   • schools                   (school catalogue)
 *   • priority_config           (LR / scoring config)
 *
 * Safety:
 *   - Dry-run by default. Pass --apply to actually delete.
 *
 * Usage:
 *   node scripts/clearReports.js            (dry run — shows counts)
 *   node scripts/clearReports.js --apply    (actually wipes)
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import dns from 'dns';

try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (_) {}

const APPLY = process.argv.includes('--apply');

const TO_WIPE = [
  'school_condition_records',
  'report_images',
  'maintenance_decisions',
  'work_orders',
  'repair_logs',
  'alerts',
  'auditlogs',
  'district_analytics',
];

const TO_KEEP = ['users', 'schools', 'priority_config'];

const c = {
  green:  s => `\x1b[32m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  red:    s => `\x1b[31m${s}\x1b[0m`,
  cyan:   s => `\x1b[36m${s}\x1b[0m`,
  dim:    s => `\x1b[2m${s}\x1b[0m`,
  bold:   s => `\x1b[1m${s}\x1b[0m`,
};

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
const db = mongoose.connection.db;

console.log('\n' + c.cyan('─'.repeat(64)));
console.log(c.cyan('  CLEAR REPORTS') + c.dim(`   db=${mongoose.connection.name}   mode=${APPLY ? c.red('APPLY') : c.yellow('DRY RUN')}`));
console.log(c.cyan('─'.repeat(64)));

const existing = (await db.listCollections().toArray()).map(x => x.name);

console.log('\n' + c.bold('Will WIPE:'));
let totalDeleted = 0;
for (const name of TO_WIPE) {
  if (!existing.includes(name)) {
    console.log(`  ${c.dim('· skipped — not present —')} ${name}`);
    continue;
  }
  const count = await db.collection(name).countDocuments();
  totalDeleted += count;
  if (APPLY && count > 0) {
    const r = await db.collection(name).deleteMany({});
    console.log(`  ${c.red('✗')} ${name.padEnd(28)} deleted ${r.deletedCount}`);
  } else {
    console.log(`  ${c.yellow('·')} ${name.padEnd(28)} ${count} doc(s)${APPLY ? ' (already empty)' : ' would delete'}`);
  }
}

console.log('\n' + c.bold('Will KEEP (untouched):'));
for (const name of TO_KEEP) {
  const count = existing.includes(name) ? await db.collection(name).countDocuments() : 0;
  console.log(`  ${c.green('✓')} ${name.padEnd(28)} ${count} doc(s)`);
}

console.log('\n' + (APPLY
  ? c.green(`Done. Removed ${totalDeleted} document(s) total. The pipeline is now empty.`)
  : c.yellow(`Dry run only. Re-run with --apply to actually delete.`)));

await mongoose.disconnect();
process.exit(0);
