import School from '../models/School.js';
import ConditionReport from '../models/ConditionReport.js';
import User from '../models/user.model.js';
import WorkOrder from '../models/WorkOrder.js';
import { hashPassword } from '../Methods/bcryptPassword.js';
import { analyseSchool, scoreReportItems, riskLevel } from '../services/predictionEngine.js';

export const seedDatabase = async (_req, res) => {
  try {
    // ── Clear ────────────────────────────────────────────────────────────
    await Promise.all([
      User.deleteMany({}),
      School.deleteMany({}),
      ConditionReport.deleteMany({}),
      WorkOrder.deleteMany({}),
    ]);

    // ── Users ─────────────────────────────────────────────────────────────
    const pwd = await hashPassword('password123');
    const users = await User.insertMany([
      { name: 'Priya Sharma (DEO)', email: 'deo@demo.com', password: pwd, role: 'deo', district: 'Pune' },
      { name: 'Ramesh Contractor', email: 'contractor1@demo.com', password: pwd, role: 'contractor', district: 'Pune', phone: '9876543210' },
      { name: 'Sunil Works', email: 'contractor2@demo.com', password: pwd, role: 'contractor', district: 'Pune', phone: '9876543211' },
      { name: 'School Admin — ZP Primary', email: 'school1@demo.com', password: pwd, role: 'school' },
      { name: 'School Admin — Vidya Mandir', email: 'school2@demo.com', password: pwd, role: 'school' },
      { name: 'School Admin — Central School', email: 'school3@demo.com', password: pwd, role: 'school' },
      { name: 'Admin', email: 'admin@demo.com', password: pwd, role: 'admin' },
    ]);
    const [deo, contractor1, contractor2, schoolUser1, schoolUser2, schoolUser3] = users;

    // ── Schools ────────────────────────────────────────────────────────────
    const schools = await School.insertMany([
      { name: 'ZP Primary School, Hadapsar', district: 'Pune', block: 'Haveli', buildingAge: 42, studentCount: 320, teacherCount: 8, totalRooms: 6, udiseCode: 'MH27010001' },
      { name: 'Vidya Mandir High School', district: 'Pune', block: 'Mulshi', buildingAge: 28, studentCount: 580, teacherCount: 22, totalRooms: 14, udiseCode: 'MH27010002' },
      { name: 'Central Government School', district: 'Pune', block: 'Khed', buildingAge: 15, studentCount: 210, teacherCount: 9, totalRooms: 8, udiseCode: 'MH27010003' },
      { name: 'Nagar Palika Shala No. 4', district: 'Pune', block: 'Haveli', buildingAge: 55, studentCount: 450, teacherCount: 14, totalRooms: 9, udiseCode: 'MH27010004' },
      { name: "St. Mary's Primary School", district: 'Pune', block: 'Shirur', buildingAge: 22, studentCount: 380, teacherCount: 16, totalRooms: 11, udiseCode: 'MH27010005' },
    ]);

    // Link school users
    await User.findByIdAndUpdate(schoolUser1._id, { schoolId: schools[0]._id });
    await User.findByIdAndUpdate(schoolUser2._id, { schoolId: schools[1]._id });
    await User.findByIdAndUpdate(schoolUser3._id, { schoolId: schools[2]._id });

    // ── Condition Reports ─────────────────────────────────────────────────
    const subCategories = {
      structural: ['roof', 'wall crack', 'floor', 'ceiling', 'door/window frames'],
      plumbing: ['water supply pipe', 'drainage', 'tap/faucet', 'overhead tank', 'pipeline leak'],
      electrical: ['main wiring', 'switchboard', 'lights/fans', 'earthing', 'circuit breaker'],
      sanitation: ['boys toilet', 'girls toilet', 'washroom floor', 'water in toilet', 'hygiene'],
      furniture: ['student desks', 'chairs', 'blackboard', 'teacher desk', 'storage'],
    };
    const notesByCondition = {
      good: ['No issues observed', 'Recently maintained', 'Working well'],
      moderate: ['Minor wear visible', 'Needs monitoring', 'Some repairs due'],
      poor: ['Urgent attention needed', 'Non-functional', 'Safety hazard', 'Immediate repair required'],
    };
    const pickNote = (cond) => {
      const arr = notesByCondition[cond];
      return arr[Math.floor(Math.random() * arr.length)];
    };
    const pickSub = (cat) => {
      const arr = subCategories[cat];
      return arr[Math.floor(Math.random() * arr.length)];
    };
    const getWeekStart = (weeksAgo) => {
      const d = new Date();
      d.setDate(d.getDate() - d.getDay() + 1 - weeksAgo * 7);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    // Realistic scenario per school [week0=latest, week3=oldest]
    const scenarios = [
      // School 0: CRITICAL — old 42y building, structural+plumbing+sanitation poor
      [[['structural','poor'],['plumbing','poor'],['electrical','moderate'],['sanitation','poor']],
       [['structural','poor'],['plumbing','moderate'],['electrical','moderate'],['sanitation','poor']],
       [['structural','moderate'],['plumbing','moderate'],['electrical','good'],['sanitation','moderate']],
       [['structural','moderate'],['plumbing','good'],['electrical','good'],['sanitation','moderate']]],
      // School 1: HIGH — large school, electrical issues
      [[['electrical','poor'],['sanitation','moderate'],['plumbing','moderate'],['structural','moderate']],
       [['electrical','moderate'],['sanitation','moderate'],['plumbing','good'],['structural','good']],
       [['electrical','moderate'],['sanitation','good'],['plumbing','good'],['structural','good']],
       [['electrical','good'],['sanitation','good'],['plumbing','good'],['structural','good']]],
      // School 2: LOW — newer 15y building
      [[['structural','good'],['plumbing','good'],['electrical','good'],['sanitation','moderate']],
       [['structural','good'],['plumbing','good'],['electrical','good'],['sanitation','good']],
       [['structural','good'],['plumbing','good'],['electrical','good'],['sanitation','good']],
       [['structural','good'],['plumbing','good'],['electrical','good'],['sanitation','good']]],
      // School 3: CRITICAL — oldest 55y building, everything poor
      [[['structural','poor'],['plumbing','poor'],['electrical','poor'],['sanitation','poor'],['furniture','poor']],
       [['structural','poor'],['plumbing','poor'],['electrical','moderate'],['sanitation','moderate']],
       [['structural','moderate'],['plumbing','poor'],['electrical','moderate'],['sanitation','moderate']],
       [['structural','moderate'],['plumbing','moderate'],['electrical','moderate'],['sanitation','good']]],
      // School 4: MODERATE — stable issues
      [[['plumbing','moderate'],['sanitation','moderate'],['structural','good'],['electrical','good']],
       [['plumbing','moderate'],['sanitation','good'],['structural','good'],['electrical','good']],
       [['plumbing','good'],['sanitation','good'],['structural','good'],['electrical','good']],
       [['plumbing','good'],['sanitation','good'],['structural','good'],['electrical','good']]],
    ];

    const submitters = [schoolUser1, schoolUser2, schoolUser3, schoolUser1, schoolUser2];
    const reportDocs = [];

    for (let si = 0; si < schools.length; si++) {
      for (let w = 0; w < 4; w++) {
        const rawItems = scenarios[si][w];
        const items = rawItems.map(([cat, cond]) => ({
          category: cat,
          subCategory: pickSub(cat),
          condition: cond,
          notes: pickNote(cond),
        }));
        const score = scoreReportItems(items);
        const level = riskLevel(score);
        reportDocs.push({
          schoolId: schools[si]._id,
          submittedBy: submitters[si]._id,
          weekOf: getWeekStart(3 - w),
          items,
          riskScore: score,
          riskLevel: level,
          overallNotes: w === 0 ? 'Weekly inspection completed' : undefined,
        });
      }
    }
    await ConditionReport.insertMany(reportDocs);

    // Update cached school risk scores
    for (const school of schools) {
      const recent = await ConditionReport.find({ schoolId: school._id }).sort({ weekOf: -1 }).limit(4);
      const analysis = analyseSchool(recent, school.buildingAge);
      await School.findByIdAndUpdate(school._id, {
        lastRiskScore: analysis.score,
        lastRiskCategory: analysis.level,
        lastAssessedAt: new Date(),
      });
    }

    // ── Work Orders ────────────────────────────────────────────────────────
    await WorkOrder.insertMany([
      {
        schoolId: schools[0]._id,
        category: 'structural', subCategory: 'roof',
        description: 'Roof leaking in 3 classrooms — urgent repair required before monsoon',
        priority: 'critical', riskScore: 88, estimatedDays: 5,
        assignedTo: contractor1._id, assignedBy: deo._id,
        assignedAt: new Date(), status: 'assigned',
        dueDate: new Date(Date.now() + 5 * 86400000),
      },
      {
        schoolId: schools[3]._id,
        category: 'electrical', subCategory: 'main wiring',
        description: 'Faulty wiring in lab — potential fire hazard',
        priority: 'critical', riskScore: 92, estimatedDays: 3,
        assignedTo: contractor2._id, assignedBy: deo._id,
        assignedAt: new Date(), status: 'in_progress',
        dueDate: new Date(Date.now() + 3 * 86400000),
      },
      {
        schoolId: schools[1]._id,
        category: 'sanitation', subCategory: 'girls toilet',
        description: 'Girls toilet not functional — needs plumbing repair',
        priority: 'high', riskScore: 71, estimatedDays: 7, status: 'pending',
      },
      {
        schoolId: schools[0]._id,
        category: 'plumbing', subCategory: 'water supply pipe',
        description: 'Main water supply pipe cracked near entry gate',
        priority: 'high', riskScore: 76, estimatedDays: 4,
        assignedTo: contractor1._id, assignedBy: deo._id,
        assignedAt: new Date(Date.now() - 10 * 86400000),
        status: 'completed', completedAt: new Date(Date.now() - 2 * 86400000),
        completionNotes: 'Pipe replaced. Water supply restored.',
      },
      {
        schoolId: schools[4]._id,
        category: 'plumbing', subCategory: 'drainage',
        description: 'Blocked drainage causing waterlogging in playground',
        priority: 'medium', riskScore: 48, estimatedDays: 10, status: 'pending',
      },
    ]);

    res.json({
      success: true,
      message: 'Database seeded successfully',
      summary: {
        users: users.length,
        schools: schools.length,
        reports: reportDocs.length,
        workOrders: 5,
      },
      demoAccounts: {
        deo: 'deo@demo.com / password123',
        contractor: 'contractor1@demo.com / password123',
        school: 'school1@demo.com / password123',
        admin: 'admin@demo.com / password123',
      },
    });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
