/**
 * cleanupCollections.js — drops the dead/duplicate collections that
 * accumulated over the project's evolution.
 *
 * Run from backend/:
 *   node scripts/cleanupCollections.js          (dry run, lists what would change)
 *   node scripts/cleanupCollections.js --apply  (actually drop them)
 *
 * What it drops:
 *   • condition_reports   — superseded by school_condition_records
 *   • conditionreports    — stale mongoose default name (model has explicit collection)
 *   • workorders          — stale mongoose default name (real model writes to work_orders)
 *   • riskpredictions     — never had a model in this codebase
 *
 * What it KEEPS untouched (single source of truth):
 *   school_condition_records, report_images, schools, users, auditlogs,
 *   maintenance_decisions, work_orders, repair_logs, alerts,
 *   district_analytics, priority_config
 *
 * After dropping, recomputes district_analytics so the DEO dashboard
 * has fresh numbers.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import dns from 'dns';
import { recomputeAllDistricts } from '../services/districtAnalytics.js';

try { dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']); } catch (_) {}

const APPLY = process.argv.includes('--apply');

const DEAD_COLLECTIONS = [
  'condition_reports',  // legacy — replaced by school_condition_records
  'conditionreports',   // stale auto-pluralisation
  'workorders',         // stale auto-pluralisation (real one is work_orders)
  'riskpredictions',    // no model in current code base
];

const KEEP_COLLECTIONS = [
  'school_condition_records',
  'report_images',
  'schools',
  'users',
  'auditlogs',
  'maintenance_decisions',
  'work_orders',
  'repair_logs',
  'alerts',
  'district_analytics',
  'priority_config',
];

const c = {
  red:    s => `\x1b[31m${s}\x1b[0m`,
  green:  s => `\x1b[32m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  cyan:   s => `\x1b[36m${s}\x1b[0m`,
  dim:    s => `\x1b[2m${s}\x1b[0m`,
  bold:   s => `\x1b[1m${s}\x1b[0m`,
};

const banner = (txt) => {
  const line = '─'.repeat(Math.max(60, txt.length + 4));
  console.log('\n' + c.cyan(line));
  console.log(c.cyan(`  ${txt}`));
  console.log(c.cyan(line));
};

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error(c.red('✗ MONGODB_URI not set in .env'));
    process.exit(1);
  }

  banner('CONNECTING');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log(c.green(`✓ Connected (db: ${mongoose.connection.name})`));

  const all = await mongoose.connection.db.listCollections().toArray();
  const present = new Set(all.map(c => c.name));

  banner('PLAN');
  if (!APPLY) {
    console.log(c.yellow('DRY RUN — pass --apply to actually drop the collections.\n'));
  }

  let droppedCount = 0;
  for (const name of DEAD_COLLECTIONS) {
    if (!present.has(name)) {
      console.log(c.dim(`  · ${name.padEnd(28)} not present — skip`));
      continue;
    }
    const docs = await mongoose.connection.db.collection(name).countDocuments();
    if (APPLY) {
      try {
        await mongoose.connection.db.dropCollection(name);
        console.log(c.green(`  ✓ dropped ${name.padEnd(24)} (${docs} docs)`));
        droppedCount++;
      } catch (err) {
        console.log(c.red(`  ✗ failed   ${name.padEnd(24)} ${err.message}`));
      }
    } else {
      console.log(c.yellow(`  • would drop ${name.padEnd(22)} (${docs} docs)`));
    }
  }

  banner('SURVIVING COLLECTIONS');
  const survivors = (await mongoose.connection.db.listCollections().toArray())
    .map(x => x.name).sort();
  for (const name of survivors) {
    const docs = await mongoose.connection.db.collection(name).countDocuments();
    const keep = KEEP_COLLECTIONS.includes(name);
    const tag  = keep ? c.green('canonical') : c.yellow('unexpected');
    console.log(`  ${name.padEnd(28)} ${String(docs).padStart(6)} docs  ${tag}`);
  }

  // Recompute district_analytics so the DEO sees fresh numbers immediately.
  if (APPLY) {
    banner('RECOMPUTING district_analytics');
    try {
      const results = await recomputeAllDistricts();
      console.log(c.green(`✓ refreshed ${results.length} district(s)`));
      for (const r of results) console.log(`  · ${r.district}`);
      if (!results.length) console.log(c.dim('  (no districts with reports yet)'));
    } catch (err) {
      console.log(c.red(`✗ recompute failed: ${err.message}`));
    }
  }

  banner('DONE');
  if (APPLY) {
    console.log(c.green(`Removed ${droppedCount} dead collection(s).`));
  } else {
    console.log(c.yellow('Re-run with --apply to perform the drop.'));
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error(c.red('\nUNCAUGHT:'), err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
