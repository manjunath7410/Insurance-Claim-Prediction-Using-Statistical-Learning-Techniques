/**
 * Actuarial Probability Calibration and Decision Thresholds Test Suite
 * Phase 4: Verification of Probability Validity, Sigmoid/Isotonic Calibration,
 * Validation-Derived Thresholding, and Untouched Test Partition Invariants.
 */

import {
  PlattScaler,
  IsotonicCalibrator,
  computeCalibrationBins,
  computeCalibrationSlope,
  computeProbabilityDistributionStats,
  performThresholdSweep,
  optimizeValidationThreshold,
  runPhase4ProbabilityCalibrationAndThresholdPipeline,
  DEFAULT_UNDERWRITING_COSTS,
} from '../src/services/calibrationService';
import { generateActuarialBenchmarkPopulation } from '../src/data/mockInsuranceData';
import { calculateBrierScore, calculateLogLoss, calculateConfusionMatrix } from '../src/services/mlPipeline';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function runPhase4CalibrationTests(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;
  const benchmarkData = generateActuarialBenchmarkPopulation(300, 42);

  function test(name: string, fn: () => void) {
    try {
      fn();
      passed++;
    } catch (err: any) {
      failed++;
      console.error(`  - FAIL: ${name}\n    ${err.message}`);
    }
  }

  // 1. Probability Output Bounds & Validity Tests
  test('Probability outputs from Platt Scaler must strictly reside in [0, 1] without NaN/Infinity', () => {
    const rawProbs = [0.01, 0.05, 0.12, 0.25, 0.60, 0.85, 0.99];
    const labels = [0, 0, 0, 1, 0, 1, 1];
    const platt = new PlattScaler().fit(rawProbs, labels);
    const calProbs = platt.predictProbabilities(rawProbs);

    assert(calProbs.length === rawProbs.length, 'Calibrated probabilities length must match input');
    for (let i = 0; i < calProbs.length; i++) {
      const p = calProbs[i];
      assert(!isNaN(p) && isFinite(p), `Probability at index ${i} must be a finite number`);
      assert(p >= 0 && p <= 1, `Probability ${p} must be bounded in [0, 1]`);
    }
  });

  test('Probability distribution statistics must compute valid percentiles and non-empty histogram', () => {
    const probs = [0.02, 0.04, 0.08, 0.10, 0.15, 0.22, 0.35, 0.65];
    const stats = computeProbabilityDistributionStats(probs);

    assert(stats.min === 0.02, 'Min probability must match smallest element');
    assert(stats.max === 0.65, 'Max probability must match largest element');
    assert(stats.mean > stats.min && stats.mean < stats.max, 'Mean must lie strictly between min and max');
    assert(stats.p10 <= stats.p50 && stats.p50 <= stats.p90, 'Percentiles must be monotonically ordered');
    assert(stats.histogram.length === 10, 'Histogram must generate 10 bins');
    const totalCount = stats.histogram.reduce((acc, h) => acc + h.count, 0);
    assert(totalCount === probs.length, 'Histogram count sum must equal total samples');
  });

  // 2. Probability Calibration Algorithms Tests
  test('Platt Sigmoid Calibration must maintain monotonic ranking of raw prediction scores', () => {
    const rawProbs = [0.02, 0.05, 0.09, 0.15, 0.30, 0.55, 0.80];
    const labels = [0, 0, 0, 1, 0, 1, 1];
    const platt = new PlattScaler().fit(rawProbs, labels);
    const calProbs = platt.predictProbabilities(rawProbs);

    for (let i = 0; i < calProbs.length - 1; i++) {
      assert(
        calProbs[i] <= calProbs[i + 1],
        `Monotonicity violation: calProbs[${i}] (${calProbs[i]}) > calProbs[${i + 1}] (${calProbs[i + 1]})`
      );
    }
  });

  test('Isotonic Regression (PAVA) must produce monotonically non-decreasing calibrated values', () => {
    const rawProbs = [0.03, 0.07, 0.12, 0.18, 0.25, 0.40, 0.70];
    const labels = [0, 0, 1, 0, 1, 1, 1];
    const iso = new IsotonicCalibrator().fit(rawProbs, labels);
    const calProbs = iso.predictProbabilities(rawProbs);

    for (let i = 0; i < calProbs.length - 1; i++) {
      assert(
        calProbs[i] <= calProbs[i + 1] + 1e-6,
        `Isotonic monotonicity violation at index ${i}`
      );
    }
  });

  test('Reliability Curve & Calibration Bins must evaluate Expected Calibration Error (ECE) and MCE', () => {
    const probs = [0.05, 0.08, 0.12, 0.15, 0.22, 0.35, 0.50, 0.85];
    const labels = [0, 0, 0, 1, 0, 1, 1, 1];
    const { bins, ece, mce } = computeCalibrationBins(probs, labels, 5);

    assert(bins.length === 5, 'Calibration curve must produce requested 5 bins');
    assert(ece >= 0 && ece <= 1, `ECE (${ece}) must be in [0, 1]`);
    assert(mce >= 0 && mce <= 1, `MCE (${mce}) must be in [0, 1]`);
    assert(mce >= ece, `Max Calibration Error (${mce}) must be >= Expected Calibration Error (${ece})`);

    const totalBinnedSamples = bins.reduce((acc, b) => acc + b.sampleCount, 0);
    assert(totalBinnedSamples === probs.length, 'Total binned samples must equal input sample count');
  });

  test('Calibration Slope calculation must return valid slope and intercept', () => {
    const probs = [0.05, 0.10, 0.15, 0.25, 0.40, 0.60, 0.80];
    const labels = [0, 0, 0, 1, 0, 1, 1];
    const { slope, intercept } = computeCalibrationSlope(probs, labels);

    assert(!isNaN(slope) && isFinite(slope), 'Calibration slope must be a finite number');
    assert(!isNaN(intercept) && isFinite(intercept), 'Calibration intercept must be a finite number');
  });

  // 3. Decision Threshold Analysis & Underwriting Utility Tests
  test('Decision Threshold Sweep must calculate trade-offs across 0.01 to 0.60', () => {
    const probs = [0.02, 0.05, 0.09, 0.14, 0.22, 0.38, 0.75];
    const labels = [0, 0, 0, 0, 1, 1, 1];
    const sweep = performThresholdSweep(probs, labels, DEFAULT_UNDERWRITING_COSTS);

    assert(sweep.length === 60, 'Threshold sweep must evaluate 60 threshold intervals');
    assert(sweep[0].threshold === 0.01, 'First threshold point must be 0.01');
    assert(sweep[sweep.length - 1].threshold === 0.60, 'Last threshold point must be 0.60');

    // As threshold increases, recall should be non-increasing and specificity should be non-decreasing
    for (let i = 0; i < sweep.length - 1; i++) {
      assert(sweep[i].recall >= sweep[i + 1].recall, 'Recall must be non-increasing with threshold');
      assert(sweep[i].specificity <= sweep[i + 1].specificity, 'Specificity must be non-decreasing with threshold');
    }
  });

  test('Validation Threshold Optimization must derive defensible threshold without using test set', () => {
    const valProbs = [0.02, 0.04, 0.07, 0.11, 0.16, 0.25, 0.40, 0.70];
    const valLabels = [0, 0, 0, 0, 1, 0, 1, 1];
    const strategy = optimizeValidationThreshold(valProbs, valLabels, 'Maximize Validation F1');

    assert(
      strategy.validationOptimalThreshold > 0 && strategy.validationOptimalThreshold < 0.50,
      `Optimal threshold (${strategy.validationOptimalThreshold}) under zero-inflation must be < 0.50`
    );
    assert(strategy.validationMetricsAtThreshold.f1Score > 0, 'Validation optimal F1 must be > 0');
    assert(strategy.costAssumptions.costRatio === 10, 'Cost ratio must reflect 10x FN vs FP penalty');
  });

  test('Underwriting Expected Cost model must penalize false negatives higher than false positives', () => {
    const probs = [0.05, 0.20];
    const labels = [1, 0]; // Index 0 is FN if threshold 0.10, Index 1 is FP if threshold 0.10
    const cm = calculateConfusionMatrix(labels, probs, 0.10);
    assert(cm.falseNegatives === 1, 'Index 0 (prob 0.05, label 1) should be FN at threshold 0.10');
    assert(cm.falsePositives === 1, 'Index 1 (prob 0.20, label 0) should be FP at threshold 0.10');

    const expectedCost = cm.falseNegatives * 4500 + cm.falsePositives * 450;
    assert(expectedCost === 4950, 'Underwriting expected cost must equal 4500 + 450 = 4950');
  });

  // 4. Master Phase 4 Pipeline Execution & Invariants
  test('Master Phase 4 Pipeline must calibrate best GBDT model, sweep validation threshold, and evaluate test set', () => {
    const report = runPhase4ProbabilityCalibrationAndThresholdPipeline(benchmarkData, 42);

    assert(report.selectedModel.modelId === 'gradient_boosting_deviance', 'Must select best GBDT candidate');
    assert(report.calibrationMethod.includes('Platt Scaling'), 'Calibration method must be Platt Scaling');
    assert(report.selectedThreshold > 0 && report.selectedThreshold <= 0.30, 'Selected threshold must be actuarially sound (< 0.30)');

    // Metrics before vs after calibration
    assert(report.uncalibratedMetrics.brierScore > 0, 'Uncalibrated Brier score must be positive');
    assert(report.calibratedMetrics.brierScore > 0, 'Calibrated Brier score must be positive');
    assert(report.calibratedMetrics.expectedCalibrationError >= 0, 'Calibrated ECE must be non-negative');

    // Test set evaluation
    assert(report.testSetEvaluation.sampleCount > 0, 'Test partition must contain evaluated samples');
    assert(
      report.testSetEvaluation.confusionMatrixAtSelectedThreshold.f1Score >=
        report.testSetEvaluation.confusionMatrixAtDefault05Threshold.f1Score,
      'Validation-derived threshold must achieve equal or superior F1 on test set compared to naive 0.50 threshold'
    );

    // Distribution stats
    assert(report.probabilityDistributionCalibrated.histogram.length === 10, 'Must include probability histogram');
    assert(report.documentedLimitations.length >= 3, 'Must document at least 3 model and calibration limitations');
  });

  // 5. Prediction Consistency & Reproducibility Test
  test('Phase 4 Pipeline execution must be deterministically reproducible under fixed seed', () => {
    const rep1 = runPhase4ProbabilityCalibrationAndThresholdPipeline(benchmarkData, 42);
    const rep2 = runPhase4ProbabilityCalibrationAndThresholdPipeline(benchmarkData, 42);

    assert(
      rep1.selectedThreshold === rep2.selectedThreshold,
      'Selected threshold must match identically across reproducible runs'
    );
    assert(
      rep1.calibratedMetrics.brierScore === rep2.calibratedMetrics.brierScore,
      'Calibrated Brier score must be identical across reproducible runs'
    );
    assert(
      rep1.testSetEvaluation.confusionMatrixAtSelectedThreshold.truePositives ===
        rep2.testSetEvaluation.confusionMatrixAtSelectedThreshold.truePositives,
      'Test confusion matrix must match identically'
    );
  });

  return { passed, failed };
}
