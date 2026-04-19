import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({}).toArray();
  console.log(users.map(u => ({ email: u.email, role: u.role, schoolId: u.schoolId })));
  mongoose.disconnect();
});
