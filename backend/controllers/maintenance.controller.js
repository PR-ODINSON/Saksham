import { MaintenanceDecision, WorkOrder, RepairLog, SchoolConditionRecord } from '../models/index.js';
import { predictRiskForCategory } from '../services/predictionEngine.js';

// ─── Maintenance Decisions ────────────────────────────────────────────────────
export const getDecisions = async (req, res) => {
  try {
    const { schoolId, status, category } = req.query;
    const filter = {};
    if (schoolId) filter.schoolId = Number(schoolId);
    if (status)   filter.status   = status;
    if (category) filter.category = category;

    const decisions = await MaintenanceDecision.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: decisions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createDecision = async (req, res) => {
  try {
    const decision = await MaintenanceDecision.create(req.body);
    res.status(201).json({ success: true, data: decision });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const updateDecisionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const decision = await MaintenanceDecision.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!decision) {
      return res.status(404).json({ success: false, message: 'Decision not found' });
    }

    res.json({ success: true, data: decision });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ─── Work Orders ──────────────────────────────────────────────────────────────
export const createWorkOrder = async (req, res) => {
  try {
    const workOrder = await WorkOrder.create(req.body);
    res.status(201).json({ success: true, data: workOrder });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ─── Repair Logs ──────────────────────────────────────────────────────────────
/**
 * POST /api/maintenance/repair-logs
 *
 * In addition to persisting the log, this handler:
 *  1. Fetches the full condition history for the school+category.
 *  2. Runs predictRiskForCategory() to capture the pre-repair model snapshot.
 *  3. Computes predictionError (conditionDelta, riskScoreDelta, accuracy label).
 *
 * This satisfies the "learns from repairs" requirement: every completed repair
 * stores a measurable delta between what the model predicted and what actually
 * happened, enabling GET /api/analytics/model-accuracy to surface these deltas.
 */
export const createRepairLog = async (req, res) => {
  try {
    const { schoolId, category } = req.body;

    // ── 1. Fetch historical condition records for this school+category ────────
    let predictionSnapshot   = undefined;
    let predictionError      = undefined;

    if (schoolId && category) {
      const historyRecords = await SchoolConditionRecord.find({ schoolId, category })
        .sort({ weekNumber: 1 })
        .lean();

      if (historyRecords.length > 0) {
        const latestRecord = historyRecords[historyRecords.length - 1];

        const weekHistory = historyRecords.map(r => ({
          conditionScore: r.conditionScore,
          weekNumber:     r.weekNumber,
        }));

        // ── 2. Run the engine to get the pre-repair prediction ────────────────
        const prediction = await predictRiskForCategory({
          weekHistory,
          buildingAge:   latestRecord.buildingAge   ?? 20,
          weatherZone:   latestRecord.weatherZone   ?? 'Dry',
          category,
          isGirlsSchool: latestRecord.isGirlsSchool ?? false,
          numStudents:   latestRecord.numStudents    ?? 0,
          flags: {
            waterLeak:             latestRecord.waterLeak,
            wiringExposed:         latestRecord.wiringExposed,
            roofLeakFlag:          latestRecord.roofLeakFlag,
            issueFlag:             latestRecord.issueFlag,
            crackWidthMM:          latestRecord.crackWidthMM,
            toiletFunctionalRatio: latestRecord.toiletFunctionalRatio,
            powerOutageHours:      latestRecord.powerOutageHours,
          },
        });

        predictionSnapshot = {
          riskScore:              prediction.riskScore,
          riskLevel:              prediction.riskLevel,
          estimatedDaysToFailure: prediction.estimated_days_to_failure,
          within30Days:           prediction.within_30_days,
          within60Days:           prediction.within_60_days,
          deteriorationRate:      prediction.deterioration_rate,
          evidence:               prediction.evidence,
        };

        // ── 3. Compute prediction error ───────────────────────────────────────
        const beforeScore = req.body.before?.conditionScore ?? latestRecord.conditionScore;
        const afterScore  = req.body.after?.conditionScore;

        if (afterScore !== undefined) {
          const conditionDelta = beforeScore - afterScore; // positive = improved

          // Convert after-repair conditionScore to an implied risk score (0-100)
          // so we can compare directly with the engine's riskScore.
          // conditionScore 1 = 0% risk, 5 = 100% risk (linear).
          const impliedAfterRisk = Math.round(((afterScore - 1) / 4) * 100);
          const riskScoreDelta   = prediction.riskScore - impliedAfterRisk;

          // Accuracy label: within ±15 points = accurate
          let accuracy;
          if (riskScoreDelta > 15)       accuracy = 'overestimated';
          else if (riskScoreDelta < -15) accuracy = 'underestimated';
          else                           accuracy = 'accurate';

          predictionError = {
            beforeConditionScore: beforeScore,
            afterConditionScore:  afterScore,
            conditionDelta,
            riskScoreDelta,
            accuracy,
          };
        }
      }
    }

    // ── 4. Persist the repair log with the feedback data ──────────────────────
    const log = await RepairLog.create({
      ...req.body,
      ...(predictionSnapshot && { predictionSnapshot }),
      ...(predictionError    && { predictionError }),
    });

    res.status(201).json({ success: true, data: log });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
