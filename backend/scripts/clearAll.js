/**
 * clearAll.js — wipe ALL operational collections except Users and Schools.
 *
 *   node scripts/clearAll.js          → wipe reports / decisions / orders / alerts
 *   node scripts/clearAll.js --hard   → also wipe uploaded photos & generated PDFs
 *
 * Useful when verifying the end-to-end pipeline on a clean slate.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../config/database.js';
import {
  SchoolConditionRecord,
  MaintenanceDecision,
  WorkOrder,
  RepairLog,
  Alert,
  DistrictAnalytics,
  AuditLog,
} from '../models/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARD = process.argv.includes('--hard');

(async () => {
  try {
    await connectDB();

    const [recs, decs, orders, repairs, alerts, analytics, audits] = await Promise.all([
      SchoolConditionRecord.deleteMany({}),
      MaintenanceDecision.deleteMany({}),
      WorkOrder.deleteMany({}),
      RepairLog.deleteMany({}),
      Alert.deleteMany({}),
      DistrictAnalytics.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);

    console.log('\n✓ Cleared operational collections (Users + Schools retained):');
    console.log(`  · SchoolConditionRecord ${recs.deletedCount}`);
    console.log(`  · MaintenanceDecision   ${decs.deletedCount}`);
    console.log(`  · WorkOrder             ${orders.deletedCount}`);
    console.log(`  · RepairLog             ${repairs.deletedCount}`);
    console.log(`  · Alert                 ${alerts.deletedCount}`);
    console.log(`  · DistrictAnalytics     ${analytics.deletedCount}`);
    console.log(`  · AuditLog              ${audits.deletedCount}`);

    if (HARD) {
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      const reportsDir = path.join(uploadsDir, 'reports');
      let removedImages = 0, removedPDFs = 0;

      if (fs.existsSync(uploadsDir)) {
        for (const f of fs.readdirSync(uploadsDir)) {
          const p = path.join(uploadsDir, f);
          if (fs.statSync(p).isFile() && /\.(png|jpe?g|webp|gif|bmp)$/i.test(f)) {
            fs.unlinkSync(p); removedImages++;
          }
        }
      }
      if (fs.existsSync(reportsDir)) {
        for (const f of fs.readdirSync(reportsDir)) {
          if (f.toLowerCase().endsWith('.pdf')) {
            fs.unlinkSync(path.join(reportsDir, f)); removedPDFs++;
          }
        }
      }
      console.log(`\n✓ Hard-wipe assets:`);
      console.log(`  · Uploaded photos       ${removedImages}`);
      console.log(`  · Generated PDFs        ${removedPDFs}`);
    }

    await mongoose.disconnect();
    console.log('\n✓ Done.\n');
    process.exit(0);
  } catch (err) {
    console.error('✗ clearAll failed:', err.message);
    process.exit(1);
  }
})();
