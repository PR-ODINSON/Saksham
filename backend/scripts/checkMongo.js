/**
 * checkMongo.js — Atlas connectivity & data sanity check
 *
 * Run from backend/:
 *   node scripts/checkMongo.js          (uses MONGODB_URI from .env)
 *   node scripts/checkMongo.js 2126     (also focuses on a specific schoolId)
 *
 * What it prints:
 *   1. Connection status + cluster name
 *   2. All collections in the active database with document counts
 *   3. Latest 5 SchoolConditionRecord entries (most recent uploads)
 *   4. ReportImage stats (so you can confirm peon photos hit Mongo)
 *   5. Per-school breakdown for an optional schoolId argument
 *   6. Principal/Peon user accounts bound to that school
 *
 * Designed to be safe to run anywhere — read-only, no writes.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import dns from 'dns';

// Force public DNS resolvers — some Windows / corporate setups refuse SRV
// queries on the system resolver, which makes mongodb+srv:// fail with
// `querySrv ECONNREFUSED`. Google + Cloudflare both serve SRV reliably.
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (_) { /* not fatal */ }

const ATLAS_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://saksham-admin:VQZyRIPX40vW3etx@saksham.tyxgmiu.mongodb.net/?appName=Saksham';

const focusSchoolId = process.argv[2] ? Number(process.argv[2]) : null;

const dim    = (s) => `\x1b[2m${s}\x1b[0m`;
const bold   = (s) => `\x1b[1m${s}\x1b[0m`;
const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const red    = (s) => `\x1b[31m${s}\x1b[0m`;
const cyan   = (s) => `\x1b[36m${s}\x1b[0m`;

const banner = (txt) => {
  const line = '─'.repeat(Math.max(60, txt.length + 4));
  console.log('\n' + cyan(line));
  console.log(cyan(`  ${txt}`));
  console.log(cyan(line));
};

async function main() {
  banner('1. CONNECTING TO MONGODB ATLAS');
  console.log(dim(`URI host: ${ATLAS_URI.replace(/\/\/.*@/, '//<user>:<pass>@')}`));

  const t0 = Date.now();
  try {
    await mongoose.connect(ATLAS_URI, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 30000,
    });
  } catch (err) {
    console.log(red(`✗ Connection failed: ${err.message}`));
    process.exit(1);
  }
  const conn = mongoose.connection;
  console.log(green(`✓ Connected in ${Date.now() - t0} ms`));
  console.log(`  host:     ${conn.host}`);
  console.log(`  database: ${bold(conn.name || '(default — none specified in URI)')}`);
  console.log(`  readyState: ${conn.readyState} (1 = connected)`);

  // Only warn when the URI omits the db name. If the URI explicitly chooses
  // a database (even "test"), the operator made that call deliberately.
  const uriHasDbName = /mongodb(\+srv)?:\/\/[^/]+\/[^?]+/.test(ATLAS_URI);
  if (!uriHasDbName) {
    console.log(yellow(
      '\n⚠ The connection URI does NOT specify a database name. Mongoose ' +
      'defaults to "test". Add an explicit db name to MONGODB_URI, e.g.\n' +
      '  mongodb+srv://…@saksham.tyxgmiu.mongodb.net/saksham?appName=Saksham'
    ));
  }

  // ── 2. Collections + counts ────────────────────────────────────────────────
  banner('2. COLLECTIONS IN THIS DATABASE');
  const collections = await conn.db.listCollections().toArray();
  if (!collections.length) {
    console.log(red('✗ No collections found — the database is empty.'));
    return finish();
  }
  for (const c of collections) {
    const count = await conn.db.collection(c.name).countDocuments();
    const flag  = count === 0 ? red('  (empty)') : '';
    console.log(`  • ${c.name.padEnd(32)} ${String(count).padStart(6)} docs${flag}`);
  }

  // ── 3. Latest reports ──────────────────────────────────────────────────────
  banner('3. LATEST 5 SchoolConditionRecord ENTRIES (most recent uploads)');
  // The schema explicitly sets collection: 'school_condition_records'
  const SCR = conn.db.collection('school_condition_records');
  const exists = collections.find(c => c.name === 'school_condition_records');
  if (!exists) {
    console.log(red(
      '✗ Collection "schoolconditionrecords" does not exist in this database.\n' +
      '  → Either no peon has ever submitted, OR the backend is connected to a ' +
      'different DB than this script.'
    ));
  } else {
    const total = await SCR.countDocuments();
    console.log(`Total reports stored: ${bold(total)}`);
    const latest = await SCR.find({}).sort({ createdAt: -1, _id: -1 }).limit(5).toArray();
    if (!latest.length) {
      console.log(red('✗ Collection is empty — peon submissions are NOT reaching Mongo.'));
    } else {
      for (const r of latest) {
        console.log(
          `  - ${dim(String(r._id))}  school=${r.schoolId}  week=${r.weekNumber}` +
          `  cat=${r.category}  cond=${r.conditionScore}` +
          `  forwarded=${r.forwardedAt ? green('yes') : 'no'}` +
          `  imgs=${(r.images || []).length}` +
          `  ${dim(`(${new Date(r.createdAt || r._id.getTimestamp()).toLocaleString()})`)}`
        );
      }
    }
  }

  // ── 4. ReportImage check ───────────────────────────────────────────────────
  banner('4. ReportImage (peon photos stored in MongoDB)');
  const RI = conn.db.collection('report_images');
  if (!collections.find(c => c.name === 'report_images')) {
    console.log(yellow(
      '⚠ Collection "report_images" does not exist yet — that is OK if no ' +
      'photo has been uploaded since the Mongo-image migration. Old photos ' +
      'still live on the backend\'s local /uploads folder.'
    ));
  } else {
    const total = await RI.countDocuments();
    console.log(`Total images stored in Mongo: ${bold(total)}`);
    const sample = await RI.find({}, { projection: { data: 0 } })
      .sort({ _id: -1 }).limit(3).toArray();
    for (const img of sample) {
      console.log(
        `  - ${dim(String(img._id))}  school=${img.schoolId}  cat=${img.category}` +
        `  size=${img.sizeBytes} B  type=${img.mimeType}`
      );
    }
  }

  // ── 5. Focus school ────────────────────────────────────────────────────────
  if (focusSchoolId !== null && !Number.isNaN(focusSchoolId)) {
    banner(`5. FOCUS — schoolId = ${focusSchoolId}`);
    const schoolDoc = await conn.db.collection('schools').findOne({ schoolId: focusSchoolId });
    if (!schoolDoc) {
      console.log(red(`✗ No "schools" document with schoolId=${focusSchoolId}.`));
    } else {
      console.log('School document:');
      console.log(`  name:     ${schoolDoc.name}`);
      console.log(`  district: ${schoolDoc.district}`);
      console.log(`  block:    ${schoolDoc.block}`);
      console.log(`  _id:      ${schoolDoc._id}`);
    }

    const reports = await SCR.find({ schoolId: focusSchoolId }).sort({ weekNumber: -1, category: 1 }).toArray();
    console.log(`\nReports for this school: ${bold(reports.length)}`);
    const byWeek = reports.reduce((acc, r) => {
      acc[r.weekNumber] ||= [];
      acc[r.weekNumber].push(r);
      return acc;
    }, {});
    for (const [wk, list] of Object.entries(byWeek)) {
      const fwd = list.some(r => r.forwardedAt) ? green('FORWARDED') : yellow('PENDING');
      console.log(`  Week ${wk} → ${list.length} categories  [${fwd}]`);
      for (const r of list) {
        console.log(
          `      ${r.category.padEnd(10)} cond=${r.conditionScore}` +
          `  urgency=${r.lrUrgencyFactor ?? r.priorityScore ?? '?'}` +
          `  images=${(r.images || []).length}` +
          `  forwardedAt=${r.forwardedAt ? new Date(r.forwardedAt).toLocaleString() : '—'}`
        );
      }
    }

    banner(`6. USERS BOUND TO schoolId = ${focusSchoolId}`);
    const users = await conn.db.collection('users').find({
      $or: [
        { schoolId: focusSchoolId },
        { schoolId: String(focusSchoolId) },
      ],
    }).project({ password: 0, passwordHash: 0 }).toArray();
    if (!users.length) {
      console.log(red(
        `✗ No user has schoolId=${focusSchoolId} stored on their profile.\n` +
        `  → If the principal account is not bound to this schoolId, the ` +
        `dashboard call /api/reports/weekly/bundles?schoolId=…  uses a ` +
        `different number and the report appears "missing".`
      ));
    } else {
      for (const u of users) {
        console.log(`  • ${u.role.padEnd(10)} ${u.name || u.email || u.phone}` +
          `   schoolId=${u.schoolId}  district=${u.district || '—'}`);
      }
    }

    // Final cross-check
    banner('7. CROSS-CHECK — does the principal\'s API call return this bundle?');
    const principalBundle = await SCR.find({ schoolId: focusSchoolId }).toArray();
    console.log(
      principalBundle.length
        ? green(`✓ getWeeklyBundles?schoolId=${focusSchoolId} would return ${principalBundle.length} record(s).`)
        : red(`✗ getWeeklyBundles?schoolId=${focusSchoolId} returns NOTHING. The principal's user.schoolId likely does not equal ${focusSchoolId}.`)
    );
  } else {
    console.log(dim('\n(Tip: re-run with a schoolId, e.g. `node scripts/checkMongo.js 2126`, to inspect a specific school.)'));
  }

  await finish();
}

async function finish() {
  await mongoose.disconnect();
  console.log(dim('\nDisconnected.\n'));
  process.exit(0);
}

main().catch(async (err) => {
  console.error(red('\nUNCAUGHT ERROR:'), err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
