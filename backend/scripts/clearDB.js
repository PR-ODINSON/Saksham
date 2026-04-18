/**
 * Clear all collections.
 * Run from backend/: node scripts/clearDB.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;

const collections = await db.listCollections().toArray();

console.log('\nClearing all collections…\n');
for (const col of collections) {
  const result = await db.collection(col.name).deleteMany({});
  console.log(`  ✓ ${col.name.padEnd(30)} — ${result.deletedCount} documents deleted`);
}

await mongoose.disconnect();
console.log('\n✓ Database cleared.\n');
