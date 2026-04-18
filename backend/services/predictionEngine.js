/**
 * Predictive Maintenance Engine — School Infrastructure
 *
 * Rule-based deterioration scoring with weighted history analysis.
 * Fully explainable — no black-box ML.
 *
 * Score range: 0–100
 * Risk levels: low (0–25), moderate (26–50), high (51–75), critical (76–100)
 */

// ─── Category weights (student safety impact) ──────────────────────────────
const CATEGORY_WEIGHTS = {
  structural: 1.0,   // Highest — collapse risk
  electrical: 0.85,  // Fire / shock hazard
  sanitation: 0.80,  // Health / compliance (toilets)
  plumbing:   0.65,  // Water supply
  furniture:  0.35,  // Low safety impact
};

// ─── Condition scores ───────────────────────────────────────────────────────
const CONDITION_SCORES = { good: 1, moderate: 2, poor: 3 };

// ─── Building age multiplier (older = higher risk baseline) ────────────────
function buildingAgeMultiplier(ageYears) {
  if (ageYears < 5)  return 0.80;
  if (ageYears < 10) return 0.90;
  if (ageYears < 20) return 1.00;
  if (ageYears < 30) return 1.10;
  if (ageYears < 40) return 1.20;
  return 1.35;
}

// ─── Time decay for historical reports (recent = higher weight) ────────────
function timeWeight(weekIndex, totalWeeks) {
  // weekIndex 0 = most recent; exponential decay
  return Math.exp(-0.3 * weekIndex) / totalWeeks;
}

/**
 * Compute a normalised risk score for a single report's items.
 * Returns 0–100.
 */
function scoreReportItems(items) {
  if (!items || items.length === 0) return 0;

  let weightedSum = 0;
  let weightTotal = 0;

  for (const item of items) {
    const catWeight = CATEGORY_WEIGHTS[item.category] ?? 0.5;
    const condScore = CONDITION_SCORES[item.condition] ?? 1;
    weightedSum += condScore * catWeight;
    weightTotal += catWeight;
  }

  if (weightTotal === 0) return 0;
  // Raw: 1–3 range → normalise to 0–100
  const rawAvg = weightedSum / weightTotal;
  return Math.min(100, Math.round(((rawAvg - 1) / 2) * 100));
}

/**
 * Predict time-to-failure (days) from score.
 *
 * Logic:
 *   score 76–100 (critical) → 0–15 days
 *   score 51–75  (high)     → 16–30 days
 *   score 26–50  (moderate) → 31–60 days
 *   score 0–25   (low)      → 61–120 days
 */
function predictTimeToFailure(score) {
  if (score >= 76) return Math.round(15 - ((score - 76) / 24) * 15);
  if (score >= 51) return Math.round(30 - ((score - 51) / 24) * 14);
  if (score >= 26) return Math.round(60 - ((score - 26) / 24) * 29);
  return Math.round(120 - (score / 25) * 59);
}

/**
 * Determine risk level label from score.
 */
function riskLevel(score) {
  if (score >= 76) return 'critical';
  if (score >= 51) return 'high';
  if (score >= 26) return 'moderate';
  return 'low';
}

/**
 * Main export: analyse an array of historical reports for a school.
 *
 * @param {object[]} reports   Array of ConditionReport docs, newest first.
 * @param {number}   buildingAge  School building age in years.
 * @returns {object} Full prediction result with explanation.
 */
export function analyseSchool(reports, buildingAge = 20) {
  if (!reports || reports.length === 0) {
    return {
      score: 0,
      level: 'low',
      timeToFailureDays: 120,
      trend: 'stable',
      worstCategory: null,
      breakdown: {},
      explanation: 'No reports submitted yet.',
    };
  }

  const ageMultiplier = buildingAgeMultiplier(buildingAge);

  // ── Per-report scores ──────────────────────────────────────────────────
  const reportScores = reports.map((r, i) => ({
    score: scoreReportItems(r.items),
    weight: timeWeight(i, reports.length),
    weekOf: r.weekOf,
  }));

  // ── Time-weighted composite score ─────────────────────────────────────
  const rawScore = reportScores.reduce((acc, r) => acc + r.score * r.weight, 0);
  const compositeScore = Math.min(100, Math.round(rawScore * ageMultiplier));

  // ── Trend detection (last vs previous) ────────────────────────────────
  let trend = 'stable';
  if (reports.length >= 2) {
    const latest = scoreReportItems(reports[0].items);
    const prev   = scoreReportItems(reports[1].items);
    if (latest - prev > 8)  trend = 'deteriorating';
    else if (prev - latest > 8) trend = 'improving';
  }

  // ── Per-category breakdown (use most recent report) ───────────────────
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

  // ── Worst category ─────────────────────────────────────────────────────
  let worstCategory = null;
  let worstScore = -1;
  for (const [cat, data] of Object.entries(breakdown)) {
    if (data.score > worstScore) {
      worstScore = data.score;
      worstCategory = cat;
    }
  }

  const timeToFailure = predictTimeToFailure(compositeScore);
  const level = riskLevel(compositeScore);

  // ── Human-readable explanation ─────────────────────────────────────────
  const explanationParts = [
    `Building age (${buildingAge}y) multiplier: ×${ageMultiplier.toFixed(2)}.`,
    `Composite score ${compositeScore}/100 (${level} risk).`,
    worstCategory ? `Worst category: ${worstCategory} (score ${worstScore}).` : '',
    trend !== 'stable' ? `Trend: ${trend} over last 2 weeks.` : 'Condition is stable.',
    `Estimated time to failure: ${timeToFailure} days.`,
  ].filter(Boolean);

  return {
    score: compositeScore,
    level,
    timeToFailureDays: timeToFailure,
    trend,
    worstCategory,
    breakdown,
    explanation: explanationParts.join(' '),
    reportCount: reports.length,
    ageMultiplier,
  };
}

/**
 * Generate a prioritised maintenance queue from multiple school analyses.
 * Returns array sorted by composite priority score (descending).
 *
 * Priority factors:
 *   - risk score (60% weight)
 *   - student count (20% — higher impact)
 *   - trend (20% — deteriorating gets boost)
 */
export function prioritiseQueue(schoolAnalyses) {
  return schoolAnalyses
    .map(({ school, analysis }) => {
      const trendBonus = analysis.trend === 'deteriorating' ? 15 : 0;
      const studentBonus = Math.min(20, Math.round((school.studentCount / 500) * 20));
      const priority = Math.min(100, Math.round(
        analysis.score * 0.6 + trendBonus + studentBonus
      ));

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

export { riskLevel, predictTimeToFailure, scoreReportItems };
