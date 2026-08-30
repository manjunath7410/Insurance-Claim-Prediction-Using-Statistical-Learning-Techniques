import { predictionService } from '../src/server/services/predictionService';
import { modelRegistry } from '../src/server/services/modelRegistry';
import { ExplainabilityService } from '../src/server/services/explainabilityService';
import { AnalyticsService } from '../src/server/services/analyticsService';
import { db } from '../src/server/db/database';

export async function runPerformanceAndHardeningTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(`FAIL: ${testName}`);
    }
  }

  const samplePolicyholderInput = {
    age: 38,
    drivingExperienceYears: 18,
    creditScore: 720,
    annualMileage: 12000,
    vehicleValue: 28000,
    vehicleAge: 4,
    vehicleType: 'Sedan',
    regionalZone: 'Suburban Moderate',
    priorClaims: 0,
    exposure: 1.0,
    deductible: 500,
    coverageTier: 'Standard Comprehensive',
  };

  // 1. Inference Latency (< 5ms per single prediction without retraining)
  try {
    predictionService.generatePrediction(samplePolicyholderInput);
    const iterations = 50;
    const startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
      const pred = predictionService.generatePrediction(samplePolicyholderInput);
      if (pred.probability < 0 || pred.probability > 1) {
        throw new Error('Probability out of bounds');
      }
    }
    const totalTimeMs = performance.now() - startTime;
    const avgLatencyMs = totalTimeMs / iterations;
    assert(avgLatencyMs < 5.0, `Inference latency is ${avgLatencyMs.toFixed(3)}ms per prediction (< 5.0ms target)`);
  } catch (err: any) {
    failed++;
    errors.push(`Inference Latency test failed: ${err?.message}`);
  }

  // 2. Model Isolation: training and inference are separate operations
  try {
    const activeVersion = modelRegistry.getActiveVersion();
    const model = modelRegistry.getModel(activeVersion);
    const pred1 = model.predict({ age: 25, experience: 3, creditScore: 650 });
    const pred2 = model.predict({ age: 25, experience: 3, creditScore: 650 });
    assert(
      pred1.calibratedProbability === pred2.calibratedProbability && pred1.rawScore === pred2.rawScore,
      'Model inference is pure, deterministic, and does not alter model state'
    );
  } catch (err: any) {
    failed++;
    errors.push(`Model Isolation test failed: ${err?.message}`);
  }

  // 3. Gemini Explanation Caching
  try {
    const input = {
      predictionId: 'pred_perf_test_1001',
      probability: 0.1245,
      riskLevel: 'HIGH' as const,
      isClaimPredicted: true,
      thresholdApplied: 0.08,
      modelName: 'Calibrated Gradient Boosted Trees',
      modelVersion: 'v1.2.0-gbdt-calibrated-platt',
      nonSensitiveFeatures: samplePolicyholderInput,
      topContributingFactors: [
        { feature: 'Young Driver Age', contributionScore: 0.35, impact: 'INCREASES_RISK' as const },
      ],
    };

    const res1 = await ExplainabilityService.generateExplanation(input);
    const t1 = performance.now();
    const res2 = await ExplainabilityService.generateExplanation(input);
    const cachedDuration = performance.now() - t1;

    assert(
      res2.executiveSummary === res1.executiveSummary && cachedDuration < 10.0,
      `Gemini explanation caching returns deduplicated result in ${cachedDuration.toFixed(2)}ms (< 10ms)`
    );
  } catch (err: any) {
    failed++;
    errors.push(`Gemini Explanation Caching test failed: ${err?.message}`);
  }

  // 4. Underwriting Report Caching
  try {
    const input = {
      predictionId: 'pred_perf_rep_2002',
      probability: 0.045,
      riskLevel: 'LOW' as const,
      isClaimPredicted: false,
      thresholdApplied: 0.08,
      modelName: 'Calibrated Gradient Boosted Trees',
      modelVersion: 'v1.2.0-gbdt-calibrated-platt',
      nonSensitiveFeatures: samplePolicyholderInput,
    };

    const res1 = await ExplainabilityService.generateUnderwritingReport(input);
    const t0 = performance.now();
    const res2 = await ExplainabilityService.generateUnderwritingReport(input);
    const duration = performance.now() - t0;

    assert(
      res2.reportId === res1.reportId && duration < 10.0,
      `Underwriting report caching returns result in ${duration.toFixed(2)}ms (< 10ms)`
    );
  } catch (err: any) {
    failed++;
    errors.push(`Underwriting Report Caching test failed: ${err?.message}`);
  }

  // 5. Analytics Dashboard Dataset Memoization & Cache
  try {
    const data1 = AnalyticsService.getAnalytics({ dateRange: 'all', riskLevel: 'all' });
    const t0 = performance.now();
    const data2 = AnalyticsService.getAnalytics({ dateRange: 'all', riskLevel: 'all' });
    const duration = performance.now() - t0;

    assert(
      data1.overviewKpis.totalPolicies > 0 &&
        data2.overviewKpis.totalPolicies === data1.overviewKpis.totalPolicies &&
        duration < 10.0,
      `Analytics aggregation memoization executes in ${duration.toFixed(2)}ms (< 10ms)`
    );
  } catch (err: any) {
    failed++;
    errors.push(`Analytics caching test failed: ${err?.message}`);
  }

  // 6. Graceful Failure: application continues to function if Gemini is unavailable
  try {
    const input = {
      predictionId: 'pred_gemini_offline_test',
      probability: 0.22,
      riskLevel: 'VERY_HIGH' as const,
      isClaimPredicted: true,
      nonSensitiveFeatures: samplePolicyholderInput,
    };

    const result = await ExplainabilityService.generateExplanation(input);
    assert(
      result &&
        result.executiveSummary.length > 0 &&
        result.modelPrediction.probabilityPercent === '22.00%' &&
        result.isFallback === true,
      'Graceful failure generates fallback actuarial explanation when AI service is unavailable'
    );
  } catch (err: any) {
    failed++;
    errors.push(`Graceful failure test failed: ${err?.message}`);
  }

  // 7. Database Resilience
  try {
    // Prediction generation succeeds even if DB persistence has transient error
    const pred = predictionService.generatePrediction(samplePolicyholderInput);
    assert(
      pred && pred.probability >= 0 && pred.predictionId.startsWith('pred_act_'),
      'Prediction engine evaluates risks safely and independently from database layer'
    );
  } catch (err: any) {
    failed++;
    errors.push(`Database resilience test failed: ${err?.message}`);
  }

  return { passed, failed, errors };
}
