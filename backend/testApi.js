import { getWeeklyBundles } from './controllers/report.controller.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const req = { query: { schoolId: '2126' } };
  const res = {
    json: (data) => console.log(JSON.stringify(data, null, 2)),
    status: (code) => ({ json: (d) => console.log(code, d) })
  };
  await getWeeklyBundles(req, res);
  mongoose.disconnect();
});
