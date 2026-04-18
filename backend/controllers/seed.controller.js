/**
 * Demo seed — populates a small set of test records using the new schema.
 * GET /api/seed-demo
 */
import User from '../models/user.model.js';
import { SchoolConditionRecord, MaintenanceDecision, WorkOrder, Alert, DistrictAnalytics, School } from '../models/index.js';
import { hashPassword } from '../Methods/bcryptPassword.js';

export const seedDatabase = async (_req, res) => {
  try {
    // Clear all collections
    await Promise.all([
      User.deleteMany({}),
      SchoolConditionRecord.deleteMany({}),
      MaintenanceDecision.deleteMany({}),
      WorkOrder.deleteMany({}),
      Alert.deleteMany({}),
      DistrictAnalytics.deleteMany({}),
    ]);

    // ── Users ────────────────────────────────────────────────────────────────
    const pwd = await hashPassword('password123');
    const users = await User.insertMany([
      { name: 'Priya Sharma (DEO)',   email: 'deo@demo.com',         password: pwd, role: 'deo',        district: 'Kutch' },
      { name: 'School Principal',     email: 'principal@demo.com',   password: pwd, role: 'principal',  district: 'Kutch', schoolId: 2126 },
      { name: 'Ramesh Contractor',    email: 'contractor1@demo.com', password: pwd, role: 'contractor', district: 'Kutch', phone: '9876543210' },
      { name: 'School Peon #2126',    email: 'peon@demo.com',        password: pwd, role: 'peon',       schoolId: 2126 },
      { name: 'Admin',                email: 'admin@demo.com',        password: pwd, role: 'admin' },
    ]);
    const [deo, contractor] = users;

    // ── Schools metadata ─────────────────────────────────────────────────────
    const schools = await School.insertMany([
      { schoolId: 2126, name: 'Kutch Primary School', district: 'Kutch', location: { lat: 23.8, lng: 69.5 } },
      { schoolId: 2459, name: 'Surat secondary School', district: 'Surat', location: { lat: 21.17, lng: 72.83 } },
    ]);

    // ── School Condition Records (sample rows matching CSV structure) ─────────
    const records = await SchoolConditionRecord.insertMany([
      {
        schoolId: 2126, district: 'Kutch', block: 'Block A', schoolType: 'Primary',
        isGirlsSchool: false, numStudents: 662, buildingAge: 2,
        materialType: 'RCC', weatherZone: 'Dry',
        category: 'plumbing', weekNumber: 7,
        conditionScore: 5, issueFlag: true, waterLeak: true,
        wiringExposed: false, crackWidthMM: 0, toiletFunctionalRatio: 0.96,
        powerOutageHours: 13, roofLeakFlag: true, photoUploaded: true,
        daysToFailure: -9.95, willFailWithin30Days: true, willFailWithin60Days: true,
        priorityScore: 56.62, repairDone: false, contractorDelayDays: 6, slaBreach: false,
      },
      {
        schoolId: 2126, district: 'Kutch', block: 'Block A', schoolType: 'Primary',
        isGirlsSchool: false, numStudents: 662, buildingAge: 2,
        materialType: 'RCC', weatherZone: 'Dry',
        category: 'electrical', weekNumber: 7,
        conditionScore: 3, issueFlag: true, waterLeak: false,
        wiringExposed: true, crackWidthMM: 0, toiletFunctionalRatio: 0.96,
        powerOutageHours: 13, roofLeakFlag: false, photoUploaded: false,
        daysToFailure: 25.0, willFailWithin30Days: false, willFailWithin60Days: true,
        priorityScore: 38.5, repairDone: false, contractorDelayDays: 0, slaBreach: false,
      },
      {
        schoolId: 2459, district: 'Surat', block: 'Block B', schoolType: 'Primary',
        isGirlsSchool: true, numStudents: 1021, buildingAge: 50,
        materialType: 'Temporary', weatherZone: 'Heavy Rain',
        category: 'structural', weekNumber: 7,
        conditionScore: 5, issueFlag: true, waterLeak: false,
        wiringExposed: true, crackWidthMM: 14.83, toiletFunctionalRatio: 0.36,
        powerOutageHours: 26, roofLeakFlag: true, photoUploaded: true,
        daysToFailure: -2.70, willFailWithin30Days: true, willFailWithin60Days: true,
        priorityScore: 60.21, repairDone: false, contractorDelayDays: 7, slaBreach: false,
      },
    ]);

    // ── Maintenance Decisions ─────────────────────────────────────────────────
    const decisions = await MaintenanceDecision.insertMany([
      {
        recordId: records[0]._id,
        schoolId: 2126, district: 'Kutch', category: 'plumbing', weekNumber: 7,
        decision: { computedPriorityScore: 57, priorityLevel: 'medium' },
        impact: { studentsAffected: 662, isGirlsSchool: false, criticalFacility: true },
        explainability: { reasons: ['Condition score 5/5 — poor', 'Active water leak', 'Failure predicted within 30 days'] },
        status: 'pending',
      },
      {
        recordId: records[2]._id,
        schoolId: 2459, district: 'Surat', category: 'structural', weekNumber: 7,
        decision: { computedPriorityScore: 75, priorityLevel: 'high' },
        impact: { studentsAffected: 1021, isGirlsSchool: true, criticalFacility: true },
        explainability: { reasons: ['Condition score 5/5 — poor', 'Building age 50 years', 'Heavy Rain weather zone', 'Failure predicted within 30 days'] },
        status: 'pending',
      },
    ]);

    // ── Work Order ────────────────────────────────────────────────────────────
    await WorkOrder.insertMany([
      {
        decisionId: decisions[1]._id,
        schoolId: 2459, district: 'Surat', category: 'structural',
        assignment: { assignedTo: contractor._id, assignedBy: deo._id },
        priorityScore: 75,
        status: 'assigned',
        deadline: new Date(Date.now() + 30 * 86400000),
      },
    ]);

    // ── Alert ─────────────────────────────────────────────────────────────────
    await Alert.insertMany([
      {
        schoolId: 2126, district: 'Kutch', category: 'plumbing',
        type: 'FAILURE_30_DAYS',
        message: 'School #2126 (Kutch) — plumbing condition poor in week 7. Failure expected within 30 days.',
        isResolved: false,
      },
      {
        schoolId: 2459, district: 'Surat', category: 'structural',
        type: 'FAILURE_30_DAYS',
        message: 'School #2459 (Surat) — structural condition poor in week 7. Failure expected within 30 days.',
        isResolved: false,
      },
    ]);

    res.json({
      success: true,
      message: 'Demo data seeded with new schema',
      demoAccounts: {
        deo:        'deo@demo.com / password123',
        principal:  'principal@demo.com / password123',
        peon:       'peon@demo.com / password123',
        contractor: 'contractor1@demo.com / password123',
        admin:      'admin@demo.com / password123',
      },
    });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
