/**
 * Seed script — generates realistic demo data for the hackathon demo.
 * Run: node seed.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import School from './models/School.js';
import ConditionReport from './models/ConditionReport.js';
import User from './models/user.model.js';
import WorkOrder from './models/WorkOrder.js';
import { hashPassword } from './Methods/bcryptPassword.js';
import { analyseSchool } from './services/predictionEngine.js';

await mongoose.connect(process.env.MONGODB_URI);
console.log('Connected to MongoDB');

// ─── Clear existing data ─────────────────────────────────────────────────────
await Promise.all([
  School.deleteMany(),
  ConditionReport.deleteMany(),
  User.deleteMany(),
  WorkOrder.deleteMany(),
]);
console.log('Cleared existing data');

// ─── Users ───────────────────────────────────────────────────────────────────
const pwd = await hashPassword('password123');

const [deo, contractor1, contractor2, schoolUser1, schoolUser2, schoolUser3] = await User.insertMany([
  { name: 'Priya Sharma (DEO)', email: 'deo@demo.com', password: pwd, role: 'deo', district: 'Pune' },
  { name: 'Ramesh Contractor', email: 'contractor1@demo.com', password: pwd, role: 'contractor', district: 'Pune', phone: '9876543210' },
  { name: 'Sunil Works', email: 'contractor2@demo.com', password: pwd, role: 'contractor', district: 'Pune', phone: '9876543211' },
  { name: 'School Admin — ZP Primary', email: 'school1@demo.com', password: pwd, role: 'school' },
  { name: 'School Admin — Vidya Mandir', email: 'school2@demo.com', password: pwd, role: 'school' },
  { name: 'School Admin — Central School', email: 'school3@demo.com', password: pwd, role: 'school' },
  { name: 'Admin', email: 'admin@demo.com', password: pwd, role: 'admin' },
]);

// ─── Schools ─────────────────────────────────────────────────────────────────
const schoolsData = [
  { name: 'ZP Primary School, Hadapsar', district: 'Pune', block: 'Haveli', buildingAge: 42, studentCount: 320, teacherCount: 8, totalRooms: 6, udiseCode: 'MH27010001' },
  { name: 'Vidya Mandir High School', district: 'Pune', block: 'Mulshi', buildingAge: 28, studentCount: 580, teacherCount: 22, totalRooms: 14, udiseCode: 'MH27010002' },
  { name: 'Central Government School', district: 'Pune', block: 'Khed', buildingAge: 15, studentCount: 210, teacherCount: 9, totalRooms: 8, udiseCode: 'MH27010003' },
  { name: 'Nagar Palika Shala No. 4', district: 'Pune', block: 'Haveli', buildingAge: 55, studentCount: 450, teacherCount: 14, totalRooms: 9, udiseCode: 'MH27010004' },
  { name: 'St. Mary\'s Primary School', district: 'Pune', block: 'Shirur', buildingAge: 22, studentCount: 380, teacherCount: 16, totalRooms: 11, udiseCode: 'MH27010005' },
];
const schools = await School.insertMany(schoolsData);

// Link school users
await User.findByIdAndUpdate(schoolUser1._id, { schoolId: schools[0]._id });
await User.findByIdAndUpdate(schoolUser2._id, { schoolId: schools[1]._id });
await User.findByIdAndUpdate(schoolUser3._id, { schoolId: schools[2]._id });

// ─── Condition Reports (8 weeks of history per school) ────────────────────────
const categories = ['plumbing', 'electrical', 'structural', 'sanitation', 'furniture'];
const conditions = ['good', 'moderate', 'poor'];

// Realistic scenario templates per school
const schoolScenarios = [
  // School 0: Old building, deteriorating fast — CRITICAL
  [
    [['structural','poor'],['plumbing','poor'],['electrical','moderate'],['sanitation','poor']],
    [['structural','poor'],['plumbing','moderate'],['electrical','moderate'],['sanitation','poor']],
    [['structural','moderate'],['plumbing','moderate'],['electrical','good'],['sanitation','moderate']],
    [['structural','moderate'],['plumbing','good'],['electrical','good'],['sanitation','moderate']],
  ],
  // School 1: Large school, some issues — HIGH
  [
    [['electrical','poor'],['sanitation','moderate'],['plumbing','moderate'],['structural','moderate']],
    [['electrical','moderate'],['sanitation','moderate'],['plumbing','good'],['structural','good']],
    [['electrical','moderate'],['sanitation','good'],['plumbing','good'],['structural','good']],
    [['electrical','good'],['sanitation','good'],['plumbing','good'],['structural','good']],
  ],
  // School 2: Newer building, mostly good — LOW
  [
    [['structural','good'],['plumbing','good'],['electrical','good'],['sanitation','moderate']],
    [['structural','good'],['plumbing','good'],['electrical','good'],['sanitation','good']],
    [['structural','good'],['plumbing','good'],['electrical','good'],['sanitation','good']],
    [['structural','good'],['plumbing','good'],['electrical','good'],['sanitation','good']],
  ],
  // School 3: Very old, multiple failing — CRITICAL
  [
    [['structural','poor'],['plumbing','poor'],['electrical','poor'],['sanitation','poor'],['furniture','poor']],
    [['structural','poor'],['plumbing','poor'],['electrical','moderate'],['sanitation','moderate']],
    [['structural','moderate'],['plumbing','poor'],['electrical','moderate'],['sanitation','moderate']],
    [['structural','moderate'],['plumbing','moderate'],['electrical','moderate'],['sanitation','good']],
  ],
  // School 4: Medium age, stable moderate — MODERATE
  [
    [['plumbing','moderate'],['sanitation','moderate'],['structural','good'],['electrical','good']],
    [['plumbing','moderate'],['sanitation','good'],['structural','good'],['electrical','good']],
    [['plumbing','good'],['sanitation','good'],['structural','good'],['electrical','good']],
    [['plumbing','good'],['sanitation','good'],['structural','good'],['electrical','good']],
  ],
];

const subCategories = {
  structural: ['roof', 'wall crack', 'floor', 'ceiling', 'door/window frames'],
  plumbing: ['water supply pipe', 'drainage', 'tap/faucet', 'overhead tank', 'pipeline leak'],
  electrical: ['main wiring', 'switchboard', 'lights/fans', 'earthing', 'circuit breaker'],
  sanitation: ['boys toilet', 'girls toilet', 'washroom floor', 'water in toilet', 'hygiene'],
  furniture: ['student desks', 'chairs', 'blackboard', 'teacher desk', 'storage'],
};

const notesByCondition = {
  good: ['No issues observed', 'Recently maintained', 'Working well', 'No action needed'],
  moderate: ['Minor wear visible', 'Needs monitoring', 'Some repairs due', 'Partial functionality'],
  poor: ['Urgent attention needed', 'Non-functional', 'Safety hazard', 'Immediate repair required', 'Broken/damaged'],
};

function pickNote(condition) {
  const arr = notesByCondition[condition];
  return arr[Math.floor(Math.random() * arr.length)];
}

function getWeekStart(weeksAgo) {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1 - weeksAgo * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

const allReports = [];
for (let si = 0; si < schools.length; si++) {
  const school = schools[si];
  const scenario = schoolScenarios[si];
  const submitter = [schoolUser1, schoolUser2, schoolUser3, schoolUser1, schoolUser2][si];

  for (let w = 0; w < 4; w++) {
    const weekItems = scenario[w];
    const items = weekItems.map(([cat, cond]) => ({
      category: cat,
      subCategory: subCategories[cat][Math.floor(Math.random() * subCategories[cat].length)],
      condition: cond,
      notes: pickNote(cond),
    }));

    allReports.push({
      schoolId: school._id,
      submittedBy: submitter._id,
      weekOf: getWeekStart(3 - w),
      items,
      overallNotes: w === 0 ? 'Weekly inspection completed' : undefined,
    });
  }
}

const reports = await ConditionReport.insertMany(allReports);

// Update school cached risk scores
const { scoreReportItems, riskLevel } = await import('./services/predictionEngine.js');
for (const report of reports) {
  const score = scoreReportItems(report.items);
  const level = riskLevel(score);
  await ConditionReport.findByIdAndUpdate(report._id, { riskScore: score, riskLevel: level });
}

for (const school of schools) {
  const recentReports = await ConditionReport.find({ schoolId: school._id }).sort({ weekOf: -1 }).limit(4);
  const analysis = analyseSchool(recentReports, school.buildingAge);
  await School.findByIdAndUpdate(school._id, {
    lastRiskScore: analysis.score,
    lastRiskCategory: analysis.level,
    lastAssessedAt: new Date(),
  });
}

// ─── Work Orders ─────────────────────────────────────────────────────────────
const workOrdersData = [
  {
    schoolId: schools[0]._id,
    category: 'structural',
    subCategory: 'roof',
    description: 'Roof leaking in 3 classrooms — urgent repair required before monsoon',
    priority: 'critical',
    riskScore: 88,
    estimatedDays: 5,
    assignedTo: contractor1._id,
    assignedBy: deo._id,
    assignedAt: new Date(),
    status: 'assigned',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
  },
  {
    schoolId: schools[3]._id,
    category: 'electrical',
    subCategory: 'main wiring',
    description: 'Faulty wiring in lab — potential fire hazard',
    priority: 'critical',
    riskScore: 92,
    estimatedDays: 3,
    assignedTo: contractor2._id,
    assignedBy: deo._id,
    assignedAt: new Date(),
    status: 'in_progress',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  },
  {
    schoolId: schools[1]._id,
    category: 'sanitation',
    subCategory: 'girls toilet',
    description: 'Girls toilet not functional — needs plumbing repair',
    priority: 'high',
    riskScore: 71,
    estimatedDays: 7,
    status: 'pending',
  },
  {
    schoolId: schools[0]._id,
    category: 'plumbing',
    subCategory: 'water supply pipe',
    description: 'Main water supply pipe cracked near entry gate',
    priority: 'high',
    riskScore: 76,
    estimatedDays: 4,
    assignedTo: contractor1._id,
    assignedBy: deo._id,
    assignedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    status: 'completed',
    completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    completionNotes: 'Pipe replaced successfully. Water supply restored.',
  },
  {
    schoolId: schools[4]._id,
    category: 'plumbing',
    subCategory: 'drainage',
    description: 'Blocked drainage causing waterlogging in playground',
    priority: 'medium',
    riskScore: 48,
    estimatedDays: 10,
    status: 'pending',
  },
];

await WorkOrder.insertMany(workOrdersData);

console.log('\n✓ Seed complete!\n');
console.log('Demo accounts:');
console.log('  DEO:        deo@demo.com / password123');
console.log('  Contractor: contractor1@demo.com / password123');
console.log('  School:     school1@demo.com / password123');
console.log('  Admin:      admin@demo.com / password123');
console.log(`\n  ${schools.length} schools, ${allReports.length} reports, ${workOrdersData.length} work orders created`);

await mongoose.disconnect();
