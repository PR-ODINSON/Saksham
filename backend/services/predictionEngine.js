/**
 * Predictive Maintenance Engine — School Infrastructure (PS-03)
 * v2 — cited evidence, dynamic failure-window, girls' school + student weighting,
 * and runtime PriorityConfig support.
 *
 * Two prediction modes:
 *  1. predictRiskForCategory()  — per-category, fully explainable (primary)
 *  2. analyseSchool()           — composite multi-category (legacy dashboard)
 */

import PriorityConfig from '../models/priorityConfig.model.js';

// ─── Default weights (used when no active PriorityConfig exists in DB) ────────
const DEFAULT_CONFIG = {
  conditionWeights: { good: 10, minor: 30, major: 60, critical: 90 },
  multipliers: {
    girlsSchool:      1.5,
    criticalFacility: 1.6,
    studentImpact:    1.4,
  },
  maxPriorityScore: 100,
};

// Module-level cache — populated on first call, invalidated after config update
let _configCache = null;

/**
 * Return the active PriorityConfig document (DB-cached).
 * Falls back to DEFAULT_CONFIG if none exists.
 */
export async function getActiveConfig() {
  if (_configCache) return _configCache;
  try {
    const doc = await PriorityConfig.findOne({ isActive: true }).lean();
    _configCache = doc ?? DEFAULT_CONFIG;
    if (doc) {
      console.log(`[PredictionEngine] PriorityConfig v${doc.version} loaded`);
    } else {
      console.warn('[PredictionEngine] No active PriorityConfig — using defaults');
    }
  } catch (err) {
    console.warn('[PredictionEngine] DB read failed, using defaults:', err.message);
    _configCache = DEFAULT_CONFIG;
  }
  return _configCache;
}

/** Flush the cache so the next prediction picks up a freshly saved config. */
export function invalidateConfigCache() {
  _configCache = null;
}

// ─── Shared constants ─────────────────────────────────────────────────────────
const CONDITION_MAP = { good: 1, moderate: 2, poor: 3 };

const CATEGORY_WEIGHTS = {
  structural: 1.0,
  electrical: 0.85,
  sanitation: 0.80,
  plumbing:   0.65,
  furniture:  0.35,
};

function ageFactorForRisk(age) {
  if (age < 10) return 0.80;
  if (age < 20) return 0.90;
  if (age < 30) return 1.00;
  if (age < 40) return 1.10;
  return 1.25;
}

const WEATHER_FACTORS = {
  'Dry':        0.90,
  'Heavy Rain': 1.15,
  'Coastal':    1.10,
  'Semi-Arid':  0.95,
  'Tribal':     1.00,
};

// ─── Deterioration-rate helpers ───────────────────────────────────────────────

/**
 * Compute linear-regression slope (condition score per week).
 * weekHistory: [{conditionScore: 1-5, weekNumber: n}] — any order.
 * Returns slope in score-units/week (positive = worsening condition).
 */
function deteriorationSlope(weekHistory) {
  const pts = [...weekHistory].sort((a, b) => a.weekNumber - b.weekNumber);
  const n = pts.length;
  if (n < 2) return 0;

  const sumX  = pts.reduce((s, p) => s + p.weekNumber,                    0);
  const sumY  = pts.reduce((s, p) => s + p.conditionScore,                0);
  const sumXY = pts.reduce((s, p) => s + p.weekNumber * p.conditionScore, 0);
  const sumX2 = pts.reduce((s, p) => s + p.weekNumber ** 2,               0);

  const denom = n * sumX2 - sumX ** 2;
  if (denom === 0) return 0;

  return (n * sumXY - sumX * sumY) / denom;
}

/**
 * Project estimated days to failure.
 * conditionScore 5 = worst (failure threshold).
 * If slope ≤ 0 (stable / improving), returns 90 as a safe default.
 */
function projectDaysToFailure(latestScore, slopePerWeek) {
  if (slopePerWeek <= 0) return 90;
  const weeksLeft = (5 - latestScore) / slopePerWeek;
  return Math.max(0, Math.round(weeksLeft * 7));
}

// ─────────────────────────────────────────────────────────────────────────────
//  PS-03 SPEC: Per-category prediction with full cited evidence
// ─────────────────────────────────────────────────────────────────────────────

/**
 * predictRiskForCategory — fully explainable per-category risk scoring.
 *
 * Every input flag from the CSV schema generates a named evidence item.
 * No silent adjustments.
 *
 * @param {object}  params
 * @param {Array}   params.weekHistory     [{conditionScore:1-5, weekNumber:n}]
 *                                         Multiple weeks enable trend + slope calc.
 * @param {number}  params.buildingAge     Building age in years
 * @param {string}  params.weatherZone     'Dry'|'Heavy Rain'|'Coastal'|'Semi-Arid'|'Tribal'
 * @param {string}  params.category        'plumbing'|'electrical'|'structural'|…
 * @param {boolean} params.isGirlsSchool   PS-03 girls' school flag
 * @param {number}  params.numStudents     Enrollment count
 * @param {object}  params.flags           Individual CSV issue flags:
 *                                         {waterLeak, wiringExposed, roofLeakFlag,
 *                                          issueFlag, crackWidthMM,
 *                                          toiletFunctionalRatio, powerOutageHours}
 * @param {object}  [params.config]        PriorityConfig doc (null = auto-fetch from DB)
 *
 * @returns {Promise<{
 *   riskScore: number,
 *   failureWindow: number,
 *   riskLevel: string,
 *   reason: string,
 *   evidence: string[],
 *   estimated_days_to_failure: number,
 *   within_30_days: boolean,
 *   within_60_days: boolean,
 *   deterioration_rate: number
 * }>}
 */
export async function predictRiskForCategory({
  weekHistory   = [],
  buildingAge   = 20,
  weatherZone   = 'Dry',
  category      = '',
  isGirlsSchool = false,
  numStudents   = 0,
  flags         = {},
  config        = null,
} = {}) {

  if (!weekHistory || weekHistory.length === 0) {
    return {
      riskScore: 0,
      failureWindow: 60,
      riskLevel: 'low',
      reason: 'No condition reports available',
      evidence: ['No condition records available — score defaulted to 0'],
      estimated_days_to_failure: 90,
      within_30_days: false,
      within_60_days: false,
      deterioration_rate: 0,
    };
  }

  // Load runtime config (DB-cached; falls back to defaults)
  const cfg = config ?? (await getActiveConfig());
  const girlsMultiplier   = cfg.multipliers?.girlsSchool   ?? DEFAULT_CONFIG.multipliers.girlsSchool;
  const studentMultiplier = cfg.multipliers?.studentImpact ?? DEFAULT_CONFIG.multipliers.studentImpact;

  const evidence = [];

  // Sort newest first for scoring, ascending for slope
  const newestFirst = [...weekHistory].sort((a, b) => b.weekNumber - a.weekNumber);
  const history3    = newestFirst.slice(0, 3); // at most 3 recent entries for base score

  // ── 1. Condition base (0–50) ───────────────────────────────────────────────
  const avgCondition = history3.reduce((s, r) => s + r.conditionScore, 0) / history3.length;
  const conditionBase = ((avgCondition - 1) / 4) * 50;
  evidence.push(
    `condition_score avg = ${avgCondition.toFixed(1)}/5 across last ${history3.length} week(s)` +
    ` (week ${history3[history3.length - 1].weekNumber}` +
    ` → week ${history3[0].weekNumber})` +
    ` → base score ${conditionBase.toFixed(1)}/50`
  );

  // ── 2. Poor-reading bonus (0–20) ──────────────────────────────────────────
  const poorCount = history3.filter(r => r.conditionScore >= 4).length;
  const poorBonus = (poorCount / 3) * 20;
  if (poorCount > 0) {
    evidence.push(
      `condition_score ≥ 4 (poor/critical) in ${poorCount}/3 recent week(s)` +
      ` → +${poorBonus.toFixed(1)} poor-count bonus`
    );
  }

  // ── 3. Trend bonus (0–15) ─────────────────────────────────────────────────
  const latestScore = newestFirst[0].conditionScore;
  const oldestScore = newestFirst[newestFirst.length - 1].conditionScore;
  let trendBonus = 0;
  let trendLabel = 'stable';

  if (latestScore > oldestScore) {
    trendBonus = 15;
    trendLabel = 'worsening';
    evidence.push(
      `trend: condition_score rose from ${oldestScore}` +
      ` (week ${newestFirst[newestFirst.length - 1].weekNumber})` +
      ` to ${latestScore} (week ${newestFirst[0].weekNumber})` +
      ` → worsening trend +15 penalty`
    );
  } else if (latestScore < oldestScore) {
    trendLabel = 'improving';
    evidence.push(
      `trend: condition_score fell from ${oldestScore}` +
      ` (week ${newestFirst[newestFirst.length - 1].weekNumber})` +
      ` to ${latestScore} (week ${newestFirst[0].weekNumber})` +
      ` → improving trend (no penalty)`
    );
  } else {
    evidence.push(
      `trend: condition_score stable at ${latestScore}` +
      ` across ${newestFirst.length} week(s)`
    );
  }

  // ── 4. Building-age multiplier ────────────────────────────────────────────
  const ageFactor = ageFactorForRisk(buildingAge);
  evidence.push(
    `building_age = ${buildingAge} years → age multiplier ×${ageFactor.toFixed(2)}`
  );

  // ── 5. Weather-zone multiplier ────────────────────────────────────────────
  const weatherFactor = WEATHER_FACTORS[weatherZone] ?? 1.0;
  evidence.push(
    `weather_zone = ${weatherZone || 'unknown'} → zone multiplier ×${weatherFactor.toFixed(2)}`
  );

  // ── 6. Issue flags (named, from CSV schema) ───────────────────────────────
  const {
    waterLeak            = false,
    wiringExposed        = false,
    roofLeakFlag         = false,
    issueFlag            = false,
    crackWidthMM         = 0,
    toiletFunctionalRatio = null,
    powerOutageHours     = 0,
  } = flags;

  if (waterLeak) {
    evidence.push('water_leak = true → active water leak detected');
  }
  if (wiringExposed) {
    evidence.push('wiring_exposed = true → exposed electrical hazard present');
  }
  if (roofLeakFlag) {
    evidence.push('roof_leak_flag = true → roof integrity compromised');
  }
  if (issueFlag && !waterLeak && !wiringExposed && !roofLeakFlag) {
    evidence.push('issue_flag = true → general infrastructure issue logged');
  }
  if (crackWidthMM > 0) {
    evidence.push(`crack_width_mm = ${crackWidthMM} mm → structural crack recorded`);
  }
  if (toiletFunctionalRatio !== null && toiletFunctionalRatio < 0.7) {
    evidence.push(
      `toilet_functional_ratio = ${(toiletFunctionalRatio * 100).toFixed(0)}%` +
      ` (below 70% threshold) → sanitation concern flagged`
    );
  }
  if (powerOutageHours > 10) {
    evidence.push(
      `power_outage_hours_weekly = ${powerOutageHours}h` +
      ` → significant recurring power disruption`
    );
  }

  // ── 7. Girls' school + category multiplier (PS-03 rule) ──────────────────
  // Plumbing failure in a girls' school gets a 1.5× priority multiplier per spec.
  let girlsMult = 1.0;
  if (isGirlsSchool && category === 'plumbing') {
    girlsMult = girlsMultiplier;
    evidence.push(
      `girls_school = true + category = plumbing` +
      ` → PS-03 priority multiplier ×${girlsMult.toFixed(2)}` +
      ` (sanitation access for female students)`
    );
  } else if (isGirlsSchool) {
    evidence.push(
      `girls_school = true` +
      ` (×${girlsMultiplier.toFixed(2)} multiplier applies to plumbing only;` +
      ` current category = ${category || 'unspecified'})`
    );
  }

  // ── 8. Student-count impact multiplier (capped at 1.3×) ──────────────────
  let studentMult = 1.0;
  if (numStudents > 0) {
    // 0 students → ×1.0, 1000+ students → capped at ×1.30
    const rawMult = 1.0 + (numStudents / 1000) * (studentMultiplier - 1.0);
    studentMult = Math.min(1.3, rawMult);
    evidence.push(
      `num_students = ${numStudents}` +
      ` → impact multiplier ×${studentMult.toFixed(2)} (capped at ×1.30)`
    );
  }

  // ── Final risk score ───────────────────────────────────────────────────────
  const rawScore  = conditionBase + poorBonus + trendBonus; // 0–85
  const riskScore = Math.min(100, Math.round(
    rawScore * ageFactor * weatherFactor * girlsMult * studentMult
  ));

  // ── Deterioration rate & projected failure window ─────────────────────────
  const slope = deteriorationSlope(weekHistory);
  const estimated_days_to_failure = weekHistory.length >= 2
    ? projectDaysToFailure(latestScore, slope)
    : (riskScore > 66 ? 30 : riskScore > 33 ? 45 : 60);

  const within_30_days = estimated_days_to_failure <= 30;
  const within_60_days = estimated_days_to_failure <= 60;

  evidence.push(
    slope > 0
      ? `deterioration_rate = ${slope.toFixed(3)} score/week` +
        ` → estimated failure in ${estimated_days_to_failure} days` +
        (within_30_days ? ' [WITHIN 30 DAYS]' : within_60_days ? ' [WITHIN 60 DAYS]' : '')
      : `deterioration_rate = ${slope.toFixed(3)} score/week (stable or improving)` +
        ` → no imminent failure projected (≥90 days)`
  );

  // ── Risk level & legacy failure window ────────────────────────────────────
  let failureWindow, riskLevel;
  if (riskScore > 66) {
    failureWindow = 30;
    riskLevel = 'high';
  } else if (riskScore > 33) {
    failureWindow = 45;
    riskLevel = 'medium';
  } else {
    failureWindow = 60;
    riskLevel = 'low';
  }

  // ── Legacy reason string (kept for backward compatibility) ────────────────
  const legacyParts = [];
  if (poorCount > 0) legacyParts.push(`${poorCount} poor report(s)`);
  if (trendLabel !== 'stable') legacyParts.push(`${trendLabel} trend`);
  if (buildingAge >= 20) legacyParts.push(`building age ${buildingAge}y`);
  if (weatherZone && weatherZone !== 'Dry') legacyParts.push(`${weatherZone} zone`);
  if (isGirlsSchool && category === 'plumbing') legacyParts.push("girls' school plumbing boost");
  if (legacyParts.length === 0) legacyParts.push('within acceptable range');

  return {
    riskScore,
    failureWindow,
    riskLevel,
    reason: legacyParts.join(' + '),
    evidence,
    estimated_days_to_failure,
    within_30_days,
    within_60_days,
    deterioration_rate: Math.round(slope * 1000) / 1000,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  LEGACY: Multi-category composite analysis (used by old dashboard endpoints)
// ─────────────────────────────────────────────────────────────────────────────

function buildingAgeMultiplier(ageYears) {
  if (ageYears < 5)  return 0.80;
  if (ageYears < 10) return 0.90;
  if (ageYears < 20) return 1.00;
  if (ageYears < 30) return 1.10;
  if (ageYears < 40) return 1.20;
  return 1.35;
}

function timeWeight(weekIndex, totalWeeks) {
  return Math.exp(-0.3 * weekIndex) / totalWeeks;
}

export function scoreReportItems(items) {
  if (!items || items.length === 0) return 0;
  let weightedSum = 0;
  let weightTotal = 0;
  for (const item of items) {
    const catWeight  = CATEGORY_WEIGHTS[item.category] ?? 0.5;
    const condScore  = CONDITION_MAP[item.condition] ?? 1;
    weightedSum += condScore * catWeight;
    weightTotal += catWeight;
  }
  if (weightTotal === 0) return 0;
  const rawAvg = weightedSum / weightTotal;
  return Math.min(100, Math.round(((rawAvg - 1) / 2) * 100));
}

export function predictTimeToFailure(score) {
  if (score >= 76) return Math.round(15 - ((score - 76) / 24) * 15);
  if (score >= 51) return Math.round(30 - ((score - 51) / 24) * 14);
  if (score >= 26) return Math.round(60 - ((score - 26) / 24) * 29);
  return Math.round(120 - (score / 25) * 59);
}

export function riskLevel(score) {
  if (score >= 76) return 'critical';
  if (score >= 51) return 'high';
  if (score >= 26) return 'moderate';
  return 'low';
}

export function analyseSchool(reports, buildingAge = 20) {
  if (!reports || reports.length === 0) {
    return {
      score: 0, level: 'low', timeToFailureDays: 120,
      trend: 'stable', worstCategory: null, breakdown: {},
      explanation: 'No reports submitted yet.',
    };
  }

  const ageMultiplier = buildingAgeMultiplier(buildingAge);

  const reportScores = reports.map((r, i) => ({
    score:  scoreReportItems(r.items),
    weight: timeWeight(i, reports.length),
    weekOf: r.weekOf,
  }));

  const rawScore       = reportScores.reduce((acc, r) => acc + r.score * r.weight, 0);
  const compositeScore = Math.min(100, Math.round(rawScore * ageMultiplier));

  let trend = 'stable';
  if (reports.length >= 2) {
    const latest = scoreReportItems(reports[0].items);
    const prev   = scoreReportItems(reports[1].items);
    if (latest - prev > 8)  trend = 'deteriorating';
    else if (prev - latest > 8) trend = 'improving';
  }

  const breakdown = {};
  const latestItems = reports[0].items || [];
  for (const [cat] of Object.entries(CATEGORY_WEIGHTS)) {
    const catItems = latestItems.filter(i => i.category === cat);
    if (catItems.length > 0) {
      const catScore = scoreReportItems(catItems);
      breakdown[cat] = {
        score: catScore,
        level: riskLevel(catScore),
        items: catItems.map(i => ({
          subCategory: i.subCategory || cat,
          condition:   i.condition,
          notes:       i.notes || '',
        })),
      };
    }
  }

  let worstCategory = null, worstScore = -1;
  for (const [cat, data] of Object.entries(breakdown)) {
    if (data.score > worstScore) { worstScore = data.score; worstCategory = cat; }
  }

  const timeToFailure = predictTimeToFailure(compositeScore);
  const level         = riskLevel(compositeScore);

  const explanationParts = [
    `Building age (${buildingAge}y) multiplier: ×${ageMultiplier.toFixed(2)}.`,
    `Composite score ${compositeScore}/100 (${level} risk).`,
    worstCategory ? `Worst category: ${worstCategory} (score ${worstScore}).` : '',
    trend !== 'stable' ? `Trend: ${trend} over last 2 weeks.` : 'Condition is stable.',
    `Estimated time to failure: ${timeToFailure} days.`,
  ].filter(Boolean);

  return {
    score: compositeScore, level, timeToFailureDays: timeToFailure,
    trend, worstCategory, breakdown,
    explanation: explanationParts.join(' '),
    reportCount: reports.length, ageMultiplier,
  };
}

export function prioritiseQueue(schoolAnalyses) {
  return schoolAnalyses
    .map(({ school, analysis }) => {
      const trendBonus   = analysis.trend === 'deteriorating' ? 15 : 0;
      const studentBonus = Math.min(20, Math.round((school.studentCount / 500) * 20));
      const priority     = Math.min(100, Math.round(analysis.score * 0.6 + trendBonus + studentBonus));

      return {
        schoolId:          school._id,
        schoolName:        school.name,
        district:          school.district,
        studentCount:      school.studentCount,
        riskScore:         analysis.score,
        riskLevel:         analysis.level,
        priorityScore:     priority,
        timeToFailureDays: analysis.timeToFailureDays,
        worstCategory:     analysis.worstCategory,
        trend:             analysis.trend,
        explanation:       analysis.explanation,
        breakdown:         analysis.breakdown,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
}
