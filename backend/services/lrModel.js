/**
 * Linear-Regression Predictor (PS-03)
 * ────────────────────────────────────
 * Loads coefficients trained from TS-PS3.csv (see scripts/trainLR.js) and
 * exposes a single `predictWithLR(features)` call that every peon submission
 * is run through before the report is shown to the principal.
 *
 * Trained targets:
 *   • priority_score       (0 – 100)            → urgency factor
 *   • days_to_failure      (real, can be < 0)
 *   • failure_within_30    (probability via logistic on linear output)
 *   • failure_within_60    (probability via logistic on linear output)
 *
 * Feature schema (must match scripts/trainLR.js):
 *   conditionScore, buildingAge, numStudents, isGirlsSchool,
 *   waterLeak, wiringExposed, roofLeakFlag, issueFlag,
 *   crackWidthMM, toiletFunctionalRatio, powerOutageHours,
 *   weather_one_hot[Dry, Heavy Rain, Coastal, Semi-Arid, Tribal],
 *   category_one_hot[plumbing, electrical, structural]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const MODEL_PATH = path.join(__dirname, '..', 'data', 'lr-models.json');

// ── Feature schema (order matters — must match trainer) ──────────────────────
export const FEATURE_KEYS = [
  'conditionScore',
  'buildingAge',
  'numStudents',
  'isGirlsSchool',
  'waterLeak',
  'wiringExposed',
  'roofLeakFlag',
  'issueFlag',
  'crackWidthMM',
  'toiletFunctionalRatio',
  'powerOutageHours',
  // Weather one-hot (Dry is the reference / dropped)
  'weather_HeavyRain',
  'weather_Coastal',
  'weather_SemiArid',
  'weather_Tribal',
  // Category one-hot (plumbing is the reference / dropped)
  'cat_electrical',
  'cat_structural',
];

let _cachedModel = null;

/** Loads the trained coefficients from disk. Cached after first call. */
export function loadLRModel() {
  if (_cachedModel) return _cachedModel;
  if (!fs.existsSync(MODEL_PATH)) {
    console.warn(`[LR] Model file not found at ${MODEL_PATH} — run "npm run train-lr"`);
    return null;
  }
  try {
    _cachedModel = JSON.parse(fs.readFileSync(MODEL_PATH, 'utf-8'));
    console.log(`[LR] Loaded LR model trained on ${_cachedModel.meta?.rows ?? '?'} rows`);
  } catch (err) {
    console.error('[LR] Failed to load model:', err.message);
    _cachedModel = null;
  }
  return _cachedModel;
}

/** Force the cache to be flushed (used after re-train). */
export function invalidateLRCache() { _cachedModel = null; }

// ── Feature engineering ─────────────────────────────────────────────────────

const WEATHER_ZONES = ['Heavy Rain', 'Coastal', 'Semi-Arid', 'Tribal']; // Dry = reference
const CATEGORIES    = ['electrical', 'structural'];                     // plumbing = reference

/**
 * Convert a raw input record into the fixed-length feature vector used at
 * training time. Every value is coerced to a Number so that the dot-product
 * never NaNs.
 */
export function buildFeatureVector(input = {}) {
  const b = (v) => (v === true || v === 1 || v === '1' || v === 'true') ? 1 : 0;
  const n = (v, d = 0) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : d;
  };

  const vec = {
    conditionScore:        n(input.conditionScore, 3),
    buildingAge:           n(input.buildingAge,    20),
    numStudents:           n(input.numStudents,    0),
    isGirlsSchool:         b(input.isGirlsSchool),
    waterLeak:             b(input.waterLeak),
    wiringExposed:         b(input.wiringExposed),
    roofLeakFlag:          b(input.roofLeakFlag),
    issueFlag:             b(input.issueFlag),
    crackWidthMM:          n(input.crackWidthMM,         0),
    toiletFunctionalRatio: n(input.toiletFunctionalRatio, 1),
    powerOutageHours:      n(input.powerOutageHours,     0),
  };

  for (const z of WEATHER_ZONES) {
    vec[`weather_${z.replace(/\s|-/g, '')}`] = (input.weatherZone === z) ? 1 : 0;
  }
  for (const c of CATEGORIES) {
    vec[`cat_${c}`] = (input.category === c) ? 1 : 0;
  }

  // Return as ordered numeric array
  return FEATURE_KEYS.map(k => vec[k] ?? 0);
}

/** Logistic activation, used on top of the linear failure-class outputs. */
const sigmoid = (z) => 1 / (1 + Math.exp(-z));

/** Linear dot-product β·x + intercept. */
function dot(coefs, intercept, x) {
  let s = intercept;
  for (let i = 0; i < x.length; i++) s += coefs[i] * x[i];
  return s;
}

/**
 * Run ALL trained sub-models on a single input.
 * Returns null if the model is not available — callers should then fall back
 * to the heuristic engine.
 */
export function predictWithLR(input) {
  const model = loadLRModel();
  if (!model) return null;

  const x = buildFeatureVector(input);

  const rawPriority = dot(model.priority.coefs, model.priority.intercept, x);
  const rawDtf      = dot(model.daysToFailure.coefs, model.daysToFailure.intercept, x);
  const rawFail30   = dot(model.fail30.coefs, model.fail30.intercept, x);
  const rawFail60   = dot(model.fail60.coefs, model.fail60.intercept, x);

  // Clamp priorityScore to [0, 100]
  const priorityScore = Math.max(0, Math.min(100, Math.round(rawPriority)));
  const daysToFailure = Math.round(rawDtf);

  const prob30 = sigmoid(rawFail30);
  const prob60 = sigmoid(rawFail60);
  const willFailWithin30Days = prob30 >= 0.5 || daysToFailure <= 30;
  const willFailWithin60Days = prob60 >= 0.5 || daysToFailure <= 60;

  // Urgency factor: blends priority (0-100) with imminent-failure boost so the
  // DEO queue sorts the most urgent items first.
  let urgencyFactor = priorityScore;
  if (willFailWithin30Days) urgencyFactor += 20;
  else if (willFailWithin60Days) urgencyFactor += 10;
  if (daysToFailure < 0) urgencyFactor += 10;            // already failed
  urgencyFactor = Math.max(0, Math.min(100, urgencyFactor));

  let urgencyLabel;
  if (urgencyFactor >= 75)      urgencyLabel = 'critical';
  else if (urgencyFactor >= 55) urgencyLabel = 'high';
  else if (urgencyFactor >= 30) urgencyLabel = 'medium';
  else                          urgencyLabel = 'low';

  return {
    source: 'LR',
    modelVersion: model.meta?.version ?? '1.0',
    trainedOnRows: model.meta?.rows,
    priorityScore,
    daysToFailure,
    willFailWithin30Days,
    willFailWithin60Days,
    fail30Probability: Number(prob30.toFixed(3)),
    fail60Probability: Number(prob60.toFixed(3)),
    urgencyFactor,
    urgencyLabel,
  };
}
