/**
 * trainLR.js — fit linear-regression models on TS-PS3.csv and persist
 * coefficients to backend/data/lr-models.json (read by services/lrModel.js).
 *
 * Run from backend/:
 *   node scripts/trainLR.js
 *
 * No external ML deps: the coefficients are computed via the normal-equation
 * closed form  β = (XᵀX + λI)⁻¹ Xᵀ y  with a tiny ridge λ = 1e-3 for stability.
 *
 * We fit four sub-models that share the same feature matrix X:
 *   1. priority_score          (regression, target ∈ [0, 100])
 *   2. days_to_failure         (regression, target ∈ ℝ)
 *   3. failure_within_30_days  (linear regression on 0/1 — use logistic at inference)
 *   4. failure_within_60_days  (same)
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { FEATURE_KEYS, buildFeatureVector } from '../services/lrModel.js';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH   = path.resolve(__dirname, '..', '..', 'TS-PS3.csv');
const OUT_PATH   = path.resolve(__dirname, '..', 'data', 'lr-models.json');

// ── Streamed CSV reader (the file is ~6MB / 50k rows) ────────────────────────
async function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return reject(new Error(`CSV not found: ${filePath}`));
    }
    const rows = [];
    let headers = null;
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });
    rl.on('line', line => {
      if (!line.trim()) return;
      const values = line.split(',');
      if (!headers) { headers = values.map(h => h.trim()); return; }
      const row = {};
      headers.forEach((h, i) => { row[h] = (values[i] ?? '').trim(); });
      rows.push(row);
    });
    rl.on('close', () => resolve(rows));
    rl.on('error', reject);
  });
}

// ── Map a CSV row → feature vector + targets ─────────────────────────────────
function rowToTraining(row) {
  const conditionScore = Number(row.condition_score);
  const priorityScore  = Number(row.priority_score);
  const daysToFailure  = Number(row.days_to_failure);
  const fail30         = Number(row.failure_within_30_days);
  const fail60         = Number(row.failure_within_60_days);

  if (
    !Number.isFinite(conditionScore) ||
    !Number.isFinite(priorityScore)  ||
    !Number.isFinite(daysToFailure)
  ) return null;

  const x = buildFeatureVector({
    conditionScore,
    buildingAge:           Number(row.building_age),
    numStudents:           Number(row.num_students),
    isGirlsSchool:         row.girls_school === '1' || row.girls_school === 'true',
    waterLeak:             row.water_leak === '1',
    wiringExposed:         row.wiring_exposed === '1',
    roofLeakFlag:          row.roof_leak_flag === '1',
    issueFlag:             row.issue_flag === '1',
    crackWidthMM:          Number(row.crack_width_mm)            || 0,
    toiletFunctionalRatio: Number(row.toilet_functional_ratio)   || 0,
    powerOutageHours:      Number(row.power_outage_hours_weekly) || 0,
    weatherZone:           row.weather_zone,
    category:              row.category,
  });

  return {
    x,
    y: {
      priority:      priorityScore,
      daysToFailure: daysToFailure,
      fail30:        Number.isFinite(fail30) ? fail30 : 0,
      fail60:        Number.isFinite(fail60) ? fail60 : 0,
    },
  };
}

// ── Linear algebra helpers (small p × p matrices, p ≈ 18) ────────────────────

/** Build a fresh p×p zero matrix. */
const zeros = (n) => Array.from({ length: n }, () => new Array(n).fill(0));

/** Gauss-Jordan inversion of a (small) square matrix.  Returns null if singular. */
function invert(M) {
  const n = M.length;
  // Augment [M | I]
  const A = M.map((row, i) => {
    const r = row.slice();
    for (let j = 0; j < n; j++) r.push(i === j ? 1 : 0);
    return r;
  });

  for (let i = 0; i < n; i++) {
    // Partial pivot
    let pivot = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[pivot][i])) pivot = k;
    }
    if (Math.abs(A[pivot][i]) < 1e-12) return null;
    if (pivot !== i) [A[i], A[pivot]] = [A[pivot], A[i]];

    const div = A[i][i];
    for (let j = 0; j < 2 * n; j++) A[i][j] /= div;

    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const f = A[k][i];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) A[k][j] -= f * A[i][j];
    }
  }
  return A.map(row => row.slice(n));
}

/**
 * Closed-form OLS with intercept and ridge regularisation.
 *   X is N × p (rows of features, no intercept column — we add it internally)
 *   y is length N.
 * Returns { coefs:[p], intercept }.
 */
function fitOLS(X, y, lambda = 1e-3) {
  const N = X.length;
  if (N === 0) throw new Error('No samples');
  const p = X[0].length;

  // Build design matrix with intercept column at position 0  → p+1 cols
  const dim = p + 1;
  // XtX (dim × dim) and Xty (dim)
  const XtX = zeros(dim);
  const Xty = new Array(dim).fill(0);

  for (let i = 0; i < N; i++) {
    const xi = X[i];
    const yi = y[i];
    // intercept row/col contributions
    XtX[0][0] += 1;
    Xty[0]    += yi;
    for (let j = 0; j < p; j++) {
      const xij = xi[j];
      XtX[0][j + 1] += xij;
      XtX[j + 1][0] += xij;
      Xty[j + 1]    += xij * yi;
      for (let k = 0; k < p; k++) {
        XtX[j + 1][k + 1] += xij * xi[k];
      }
    }
  }

  // Add ridge λI (skip the intercept dimension)
  for (let j = 1; j < dim; j++) XtX[j][j] += lambda;

  const inv = invert(XtX);
  if (!inv) throw new Error('XᵀX is singular — model cannot be fitted');

  const beta = new Array(dim).fill(0);
  for (let i = 0; i < dim; i++) {
    let s = 0;
    for (let j = 0; j < dim; j++) s += inv[i][j] * Xty[j];
    beta[i] = s;
  }

  return { intercept: beta[0], coefs: beta.slice(1) };
}

/** Mean absolute error — quick goodness-of-fit indicator printed to console. */
function mae(y, yhat) {
  let s = 0;
  for (let i = 0; i < y.length; i++) s += Math.abs(y[i] - yhat[i]);
  return s / y.length;
}

function predictAll(X, model) {
  return X.map(x => {
    let s = model.intercept;
    for (let i = 0; i < x.length; i++) s += model.coefs[i] * x[i];
    return s;
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async function main() {
  console.log(`[trainLR] Reading ${CSV_PATH}...`);
  const rows = await readCSV(CSV_PATH);
  console.log(`[trainLR] CSV rows = ${rows.length}`);

  const samples = [];
  for (const r of rows) {
    const t = rowToTraining(r);
    if (t) samples.push(t);
  }
  console.log(`[trainLR] Usable samples = ${samples.length} / ${rows.length}`);

  const X        = samples.map(s => s.x);
  const yPrio    = samples.map(s => s.y.priority);
  const yDtf     = samples.map(s => s.y.daysToFailure);
  const yFail30  = samples.map(s => s.y.fail30);
  const yFail60  = samples.map(s => s.y.fail60);

  console.log(`[trainLR] Feature dim = ${X[0].length} (${FEATURE_KEYS.length} expected)`);
  if (X[0].length !== FEATURE_KEYS.length) {
    throw new Error('Feature dimension mismatch with FEATURE_KEYS — fix lrModel.js');
  }

  console.log('[trainLR] Fitting priority_score ...');
  const priority = fitOLS(X, yPrio);
  console.log(`             MAE = ${mae(yPrio,   predictAll(X, priority)).toFixed(2)}`);

  console.log('[trainLR] Fitting days_to_failure ...');
  const daysToFailure = fitOLS(X, yDtf);
  console.log(`             MAE = ${mae(yDtf,    predictAll(X, daysToFailure)).toFixed(2)}`);

  console.log('[trainLR] Fitting failure_within_30_days ...');
  const fail30 = fitOLS(X, yFail30);
  console.log(`             MAE = ${mae(yFail30, predictAll(X, fail30)).toFixed(3)}`);

  console.log('[trainLR] Fitting failure_within_60_days ...');
  const fail60 = fitOLS(X, yFail60);
  console.log(`             MAE = ${mae(yFail60, predictAll(X, fail60)).toFixed(3)}`);

  const output = {
    meta: {
      version: '1.0',
      trainedAt: new Date().toISOString(),
      rows: samples.length,
      featureKeys: FEATURE_KEYS,
      lambda: 1e-3,
      method: 'closed-form OLS with ridge',
    },
    priority,
    daysToFailure,
    fail30,
    fail60,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
  console.log(`[trainLR] ✓ Saved coefficients to ${OUT_PATH}`);
  process.exit(0);
})().catch(err => {
  console.error('[trainLR] FAILED:', err);
  process.exit(1);
});
