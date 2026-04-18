/**
 * latestActivity.js — show the most recent writes to Mongo so we can
 * pinpoint exactly what the last peon submission did (or why it didn't).
 *
 * Run: node scripts/latestActivity.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import dns from 'dns';

try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (_) {}

const c = {
  green: s => `\x1b[32m${s}\x1b[0m`,
  yellow:s => `\x1b[33m${s}\x1b[0m`,
  cyan:  s => `\x1b[36m${s}\x1b[0m`,
  dim:   s => `\x1b[2m${s}\x1b[0m`,
  red:   s => `\x1b[31m${s}\x1b[0m`,
};

const banner = (t) => console.log('\n' + c.cyan('─'.repeat(70)) + '\n' + c.cyan('  ' + t) + '\n' + c.cyan('─'.repeat(70)));

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
const db = mongoose.connection.db;

banner('MOST RECENT 15 AUDIT LOG ENTRIES');
const logs = await db.collection('auditlogs').find({}).sort({ createdAt: -1 }).limit(15).toArray();
if (!logs.length) console.log(c.red('  (none)'));
for (const l of logs) {
  console.log(
    `  ${c.dim(new Date(l.createdAt || l._id.getTimestamp()).toLocaleString().padEnd(22))}` +
    ` ${l.action.padEnd(28)}` +
    ` user=${(l.userRole || '?').padEnd(10)}` +
    ` ${l.entityType || ''}` +
    (l.metadata?.schoolId ? ` school=${l.metadata.schoolId}` : '') +
    (l.metadata?.weekNumber ? ` week=${l.metadata.weekNumber}` : '') +
    (l.metadata?.category ? ` cat=${l.metadata.category}` : '')
  );
}

banner('MOST RECENT 10 SchoolConditionRecord (sorted by updatedAt)');
const recs = await db.collection('school_condition_records').find({}).sort({ updatedAt: -1 }).limit(10).toArray();
for (const r of recs) {
  const created = new Date(r.createdAt || r._id.getTimestamp());
  const updated = r.updatedAt ? new Date(r.updatedAt) : created;
  const isNew = updated.getTime() === created.getTime();
  console.log(
    `  school=${r.schoolId} week=${r.weekNumber} cat=${r.category.padEnd(11)}` +
    ` cond=${r.conditionScore} urg=${r.lrUrgencyFactor ?? r.priorityScore ?? '?'}` +
    ` fwd=${r.forwardedAt ? c.green('yes') : c.yellow('NO ')} ` +
    `imgs=${(r.images || []).length} ` +
    c.dim(`(updated ${updated.toLocaleString()}${isNew ? ' [NEW]' : ' [UPDATED]'})`)
  );
}

banner('MOST RECENT 10 ReportImage (peon photos)');
const imgs = await db.collection('report_images').find({}, { projection: { data: 0 } })
  .sort({ _id: -1 }).limit(10).toArray();
for (const i of imgs) {
  console.log(
    `  ${c.dim(i._id.getTimestamp().toLocaleString().padEnd(22))}` +
    ` school=${i.schoolId} cat=${i.category} ${(i.sizeBytes/1024).toFixed(0)}KB ${i.mimeType}`
  );
}

banner('MOST RECENT 10 WorkOrder');
const wos = await db.collection('work_orders').find({}).sort({ createdAt: -1 }).limit(10).toArray();
if (!wos.length) console.log(c.red('  (none)'));
for (const w of wos) {
  console.log(
    `  ${c.dim(new Date(w.createdAt).toLocaleString().padEnd(22))}` +
    ` school=${w.schoolId} cat=${w.category.padEnd(11)}` +
    ` status=${(w.status || '?').padEnd(10)}` +
    ` assignedTo=${w.assignment?.assignedTo || c.yellow('—')}`
  );
}

await mongoose.disconnect();
process.exit(0);
