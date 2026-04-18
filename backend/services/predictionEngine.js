/**
 * Predictive Maintenance Engine — School Infrastructure (PS-03)
 *
 * Two prediction modes:
 *  1. predictRiskForCategory()  — per-category, per-spec (stored in risk_predictions)
 *  2. analyseSchool()           — composite multi-category (legacy, used by old dashboard)
 *
 * All logic is rule-based and fully explainable.
 * Score range: 0–100.
 */

// ─── Shared constants ────────────────────────────────────────────────────────

const CONDITION_MAP = { good: 1, moderate: 2, poor: 3 };

const CATEGORY_WEIGHTS = {
  structural: 1.0,
  electrical: 0.85,
  sanitation: 0.80,
  plumbing: 0.65,
  furniture: 0.35,
};

// ─────────────────────────────────────────────────────────────────────────────
//  PS-03 SPEC: Per-category prediction  (predictRiskForCategory)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Building-age multiplier for the category-level prediction.
 * Older buildings have a higher base risk.
 */
function ageFactorForRisk(age) {
  if (age < 10) return 0.80;
  if (age < 20) return 0.90;
  if (age < 30) return 1.00;
  if (age < 40) return 1.10;
  return 1.25;
}

/**
 * Weather-zone risk multiplier.
 * Heavy rain and coastal zones accelerate deterioration.
 */
const WEATHER_FACTORS = {
  Dry: 0.90,
  'Heavy Rain': 1.15,
  Coastal: 1.10,
  'Semi-Arid': 0.95,
};

/**
 * Pure, category-specific risk prediction.
 *
 * Inputs
 * ------
 * conditionHistory : [{condition: 'good'|'moderate'|'poor', weekOf: Date}]
 *                    Newest first; max 3 entries used per spec.
 * buildingAge      : number  (years)
 * weatherZone      : string  ('Dry' | 'Heavy Rain' | 'Coastal' | ...)
 *
 * Scoring breakdown
 * -----------------
 *   conditionBase  0–50   (avg condition value, normalised)
 *   poorBonus      0–20   (proportion of "poor" reports)
 *   trendBonus     0–15   (worsening trend in last 3 weeks)
 *   × ageFactor           (0.80 – 1.25)
 *   × weatherFactor       (0.90 – 1.15)
 *   = riskScore    0–100
 *
 * Failure window
 * --------------
 *   riskScore > 66  → HIGH   → 30 days
 *   riskScore > 33  → MEDIUM → 45 days
 *   riskScore ≤ 33  → LOW    → 60 days
 *
 * @returns {{ riskScore, failureWindow, riskLevel, reason }}
 */
export function predictRiskForCategory(
  conditionHistory,
  buildingAge = 20,
  weatherZone = 'Dry',
) {
  if (!conditionHistory || conditionHistory.length === 0) {
    return {
      riskScore: 0,
      failureWindow: 60,
      riskLevel: 'low',
      reason: 'No condition reports available',
    };
  }

  // Use at most last 3 entries (per spec)
  const history = conditionHistory.slice(0, 3);
  const values = history.map(h => CONDITION_MAP[h.condition] ?? 1);

  // ── Condition base (0–50) ──────────────────────────────────────────────
  const avgCondition = values.reduce((a, b) => a + b, 0) / values.length;
  const conditionBase = ((avgCondition - 1) / 2) * 50;

  // ── Poor count bonus (0–20) ───────────────────────────────────────────
  const poorCount = history.filter(h => h.condition === 'poor').length;
  const poorBonus = (poorCount / 3) * 20;

  // ── Trend bonus (0–15) ────────────────────────────────────────────────
  // values[0] = newest; if it's worse than the oldest, trend is worsening
  let trendBonus = 0;
  let trendLabel = 'stable';
  if (values.length >= 2) {
    const newest = values[0];
    const oldest = values[values.length - 1];
    if (newest > oldest) {
      trendBonus = 15;
      trendLabel = 'worsening';
    } else if (newest < oldest) {
      trendLabel = 'improving';
    }
  }

  // ── Multipliers ────────────────────────────────────────────────────────
  const ageFactor     = ageFactorForRisk(buildingAge);
  const weatherFactor = WEATHER_FACTORS[weatherZone] ?? 1.0;

  // ── Final score ────────────────────────────────────────────────────────
  const rawScore  = conditionBase + poorBonus + trendBonus; // 0–85
  const riskScore = Math.min(100, Math.round(rawScore * ageFactor * weatherFactor));

  // ── Failure window & level ─────────────────────────────────────────────
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

  // ── Explainable reason ─────────────────────────────────────────────────
  const parts = [];
  if (poorCount > 0) {
    parts.push(`${poorCount} consecutive poor report${poorCount > 1 ? 's' : ''}`);
  }
  if (trendLabel !== 'stable') parts.push(`${trendLabel} trend`);
  if (buildingAge >= 20) parts.push(`building age > ${buildingAge} years`);
  if (weatherZone && weatherZone !== 'Dry') {
    parts.push(`${weatherZone.toLowerCase()} zone`);
  }
  if (parts.length === 0) parts.push('condition is within acceptable range');

  return {
    riskScore,
    failureWindow,
    riskLevel,
    reason: parts.join(' + '),
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
    score: scoreReportItems(r.items),
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
          condition: i.condition,
          notes: i.notes || '',
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
        schoolId: school._id,
        schoolName: school.name,
        district: school.district,
        studentCount: school.studentCount,
        riskScore: analysis.score,
        riskLevel: analysis.level,
        priorityScore: priority,
        timeToFailureDays: analysis.timeToFailureDays,
        worstCategory: analysis.worstCategory,
        trend: analysis.trend,
        explanation: analysis.explanation,
        breakdown: analysis.breakdown,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
}
