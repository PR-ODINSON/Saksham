/**
 * Saksham PS-03 Integration Smoke Test
 * Run: node backend/scripts/smokeTest.js
 *
 * Requires a running server at BASE_URL and a seeded demo database.
 * Run GET /api/seed-demo first.
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const BASE_URL = process.env.SMOKE_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const results = [];
let cookies = '';
let peonCookies = '';
let deoCookies = '';
let contractorCookies = '';
let adminCookies = '';
let reportId = '';
let taskId = '';

function log(step, pass, reason = '') {
  const mark = pass ? '✅ PASS' : '❌ FAIL';
  const msg = `  Step ${step}: ${mark}${reason ? ' — ' + reason : ''}`;
  console.log(msg);
  results.push({ step, pass, reason });
}

async function req(method, url, body, cookieStr) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookieStr ? { Cookie: cookieStr } : {}),
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${url}`, opts);
  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, body: await res.json().catch(() => ({})), setCookie };
}

function extractCookie(setCookieHeader) {
  if (!setCookieHeader) return '';
  return setCookieHeader.split(';')[0];
}

async function run() {
  console.log(`\n🚀 Saksham Smoke Test — ${BASE_URL}\n`);

  // ── Step 1: Login as peon ───────────────────────────────────────────
  {
    const r = await req('POST', '/api/auth/login', { email: 'peon@demo.com', password: 'password123' });
    const pass = r.status === 200 && r.body.success && !!r.setCookie;
    log(1, pass, pass ? '' : `status=${r.status} body=${JSON.stringify(r.body)}`);
    if (pass) {
      peonCookies = extractCookie(r.setCookie);
      cookies = peonCookies;
    }
  }

  // ── Step 2: Submit condition report ────────────────────────────────
  const currentWeek = Math.ceil((new Date() - new Date(new Date().getFullYear(), 0, 1)) / 604800000);
  {
    const body = {
      schoolId: 2126, district: 'Kutch', block: 'Block A', schoolType: 'Primary',
      isGirlsSchool: false, numStudents: 662, buildingAge: 2,
      materialType: 'RCC', weatherZone: 'Dry',
      category: 'plumbing', weekNumber: currentWeek + 100,
      conditionScore: 2, issueFlag: true, waterLeak: false,
      wiringExposed: false, crackWidthMM: 0, toiletFunctionalRatio: 0.9,
      powerOutageHours: 0, roofLeakFlag: false,
    };
    const r = await req('POST', '/api/condition-report', body, peonCookies);
    const pass = r.status === 201 && r.body.success && r.body.prediction?.evidence?.length > 0;
    log(2, pass, pass ? '' : `status=${r.status} body=${JSON.stringify(r.body).slice(0, 200)}`);
    if (r.body.record?._id) reportId = r.body.record._id;
  }

  if (!reportId) {
    console.log('\n⚠  No reportId — skipping steps 3-4 and step 10.\n');
  }

  // ── Step 3: Review report ───────────────────────────────────────────
  if (reportId) {
    // Login as principal for review
    const loginR = await req('POST', '/api/auth/login', { email: 'principal@demo.com', password: 'password123' });
    const principalCookies = extractCookie(loginR.headers?.get?.('set-cookie') || loginR.setCookie);

    const r = await req('PATCH', `/api/reports/${reportId}/review`, { note: 'Needs attention' }, principalCookies || peonCookies);
    const pass = r.status === 200 && r.body.success && !!r.body.record?.reviewedAt;
    log(3, pass, pass ? '' : `status=${r.status} body=${JSON.stringify(r.body).slice(0, 200)}`);
  } else {
    log(3, false, 'skipped — no reportId');
  }

  // ── Step 4: Forward report ──────────────────────────────────────────
  if (reportId) {
    const loginR = await req('POST', '/api/auth/login', { email: 'principal@demo.com', password: 'password123' });
    const principalCookies = extractCookie(loginR.setCookie);

    const r = await req('POST', `/api/reports/${reportId}/forward`, {}, principalCookies || peonCookies);
    const pass = r.status === 200 && r.body.success && !!r.body.reportId;
    log(4, pass, pass ? '' : `status=${r.status} body=${JSON.stringify(r.body).slice(0, 200)}`);
  } else {
    log(4, false, 'skipped — no reportId');
  }

  // ── Step 5: DEO risk queue ──────────────────────────────────────────
  {
    const loginR = await req('POST', '/api/auth/login', { email: 'deo@demo.com', password: 'password123' });
    deoCookies = extractCookie(loginR.setCookie);

    const r = await req('GET', '/api/risk/queue', null, deoCookies);
    const pass = r.status === 200 && r.body.success && Array.isArray(r.body.queue);
    log(5, pass, pass ? `queue length=${r.body.queue?.length}` : `status=${r.status}`);
  }

  // ── Step 6: Heatmap ─────────────────────────────────────────────────
  {
    const r = await req('GET', '/api/risk/heatmap', null, deoCookies);
    const hasLatLng = Array.isArray(r.body.heatmap) && r.body.heatmap.some(h => h.lat && h.lng && h.maxPriorityScore !== undefined);
    const pass = r.status === 200 && r.body.success && hasLatLng;
    log(6, pass, pass ? `${r.body.heatmap.length} nodes` : `status=${r.status} body=${JSON.stringify(r.body).slice(0, 200)}`);
  }

  // ── Step 7: Assign task ─────────────────────────────────────────────
  {
    // Get contractor id
    const usersR = await req('GET', '/api/users/contractors', null, deoCookies);
    const contractorId = usersR.body.contractors?.[0]?._id;

    const deadline = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const r = await req('POST', '/api/tasks/assign', {
      schoolId: 2126, category: 'plumbing', district: 'Kutch',
      assignedTo: contractorId, deadline,
    }, deoCookies);
    const pass = r.status === 201 && r.body.success && r.body.workOrder?.status === 'assigned';
    log(7, pass, pass ? '' : `status=${r.status} body=${JSON.stringify(r.body).slice(0, 200)}`);
    if (r.body.workOrder?._id) taskId = r.body.workOrder._id;
  }

  // ── Step 8: Contractor accepts task ────────────────────────────────
  if (taskId) {
    const loginR = await req('POST', '/api/auth/login', { email: 'contractor1@demo.com', password: 'password123' });
    contractorCookies = extractCookie(loginR.setCookie);

    const r = await req('PATCH', `/api/tasks/${taskId}/respond`, { decision: 'accepted', scope: 'school' }, contractorCookies);
    const pass = r.status === 200 && r.body.success && r.body.updated >= 1;
    log(8, pass, pass ? '' : `status=${r.status} body=${JSON.stringify(r.body).slice(0, 200)}`);
  } else {
    log(8, false, 'skipped — no taskId');
  }

  // ── Step 9: Complete task ───────────────────────────────────────────
  if (taskId) {
    const r = await req('POST', '/api/tasks/complete', {
      workOrderId: taskId,
      afterConditionScore: 1,
      beforeConditionScore: 4,
      notes: 'Fixed the plumbing issue',
      lat: 23.8, lng: 69.5,
    }, contractorCookies);
    const pass = r.status === 200 && r.body.success &&
      r.body.workOrder?.status === 'completed' && !!r.body.repairLog;
    log(9, pass, pass ? '' : `status=${r.status} body=${JSON.stringify(r.body).slice(0, 200)}`);
  } else {
    log(9, false, 'skipped — no taskId');
  }

  // ── Step 10: Download PDF ───────────────────────────────────────────
  if (reportId) {
    const loginR = await req('POST', '/api/auth/login', { email: 'deo@demo.com', password: 'password123' });
    const localDeoCookies = extractCookie(loginR.setCookie) || deoCookies;

    const res = await fetch(`${BASE_URL}/api/reports/${reportId}/pdf`, {
      headers: { Cookie: localDeoCookies },
    });
    const contentType = res.headers.get('content-type') || '';
    const pass = res.status === 200 && contentType.includes('application/pdf');
    log(10, pass, pass ? '' : `status=${res.status} content-type=${contentType}`);
  } else {
    log(10, false, 'skipped — no reportId');
  }

  // ── Step 11: Audit logs ─────────────────────────────────────────────
  {
    const loginR = await req('POST', '/api/auth/login', { email: 'admin@demo.com', password: 'password123' });
    adminCookies = extractCookie(loginR.setCookie);

    const r = await req('GET', '/api/admin/audit-logs', null, adminCookies);
    const pass = r.status === 200 && r.body.success && r.body.total >= 6;
    log(11, pass, pass ? `total=${r.body.total}` : `status=${r.status} total=${r.body.total}`);
  }

  // ── Summary ─────────────────────────────────────────────────────────
  const passed  = results.filter(r => r.pass).length;
  const failed  = results.filter(r => !r.pass);
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${passed}/11 passed`);
  if (failed.length) {
    console.log('\n  Failures:');
    failed.forEach(f => console.log(`    Step ${f.step}: ${f.reason}`));
  }
  console.log(`${'─'.repeat(50)}\n`);
}

run().catch(err => {
  console.error('Smoke test crashed:', err.message);
  process.exit(1);
});
