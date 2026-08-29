import {
  runStatisticalLearningInference,
  calculateStatisticalRiskIndices,
  BENCHMARK_METRICS,
} from '../src/services/statisticalModels';
import { PolicyholderInput, ModelType } from '../src/types';

export function runStatisticalInvariantTests(): { passed: number; failed: number; errors: string[] } {
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

  const sampleBaseInput: PolicyholderInput = {
    age: 34,
    drivingExperienceYears: 16,
    creditScore: 720,
    creditTier: 'Good (670-739)',
    annualMileage: 12000,
    vehicleCategory: 'Economy Sedan',
    vehicleValue: 28000,
    vehicleAge: 4,
    priorClaimsLast5Years: 0,
    trafficViolationsCount: 0,
    antiTheftDevice: true,
    regionalZone: 'Suburban Moderate (Zone B)',
    coverageTier: 'Standard Comprehensive',
    driverGender: 'Female',
    maritalStatus: 'Married',
    deductible: 500,
    policyTenureYears: 4,
    annualExposure: 1.0,
  };

  const models: ModelType[] = [
    'glm_logistic_gamma',
    'random_forest',
    'gradient_boosting_tweedie',
    'two_stage_hurdle',
  ];

  // Test 1: Probability Boundedness [0, 100]% & Positive Severity across all models
  models.forEach((model) => {
    const res = runStatisticalLearningInference(sampleBaseInput, model);
    const pred = res.primaryPrediction;
    assert(
      pred.claimProbabilityPercent >= 0 && pred.claimProbabilityPercent <= 100,
      `[${model}] Claim probability ${pred.claimProbabilityPercent}% must be strictly within [0, 100]%`
    );
    assert(
      pred.expectedSeverityUSD > 0,
      `[${model}] Expected severity $${pred.expectedSeverityUSD} must be strictly positive`
    );
    assert(
      pred.purePremiumUSD > 0,
      `[${model}] Pure premium $${pred.purePremiumUSD} must be strictly positive`
    );
    assert(
      pred.recommendedGrossPremiumUSD >= pred.purePremiumUSD,
      `[${model}] Recommended gross premium ($${pred.recommendedGrossPremiumUSD}) must exceed pure premium ($${pred.purePremiumUSD})`
    );
  });

  // Test 2: Confidence Interval Logical Consistency
  models.forEach((model) => {
    const res = runStatisticalLearningInference(sampleBaseInput, model);
    const pred = res.primaryPrediction;
    const [lower, upper] = pred.confidenceInterval;
    assert(
      lower <= pred.claimProbabilityPercent && pred.claimProbabilityPercent <= upper,
      `[${model}] Confidence interval [${lower}, ${upper}] must enclose point estimate ${pred.claimProbabilityPercent}%`
    );
    assert(
      lower >= 0 && upper <= 100,
      `[${model}] Confidence interval [${lower}, ${upper}] must remain within [0, 100]%`
    );
  });

  // Test 3: Monotonicity with respect to Prior Claims
  const zeroClaimsRes = runStatisticalLearningInference({ ...sampleBaseInput, priorClaimsLast5Years: 0 });
  const oneClaimRes = runStatisticalLearningInference({ ...sampleBaseInput, priorClaimsLast5Years: 1 });
  const twoClaimsRes = runStatisticalLearningInference({ ...sampleBaseInput, priorClaimsLast5Years: 2 });

  assert(
    oneClaimRes.primaryPrediction.claimProbabilityPercent >= zeroClaimsRes.primaryPrediction.claimProbabilityPercent,
    `Monotonicity: 1 prior claim (${oneClaimRes.primaryPrediction.claimProbabilityPercent}%) >= 0 prior claims (${zeroClaimsRes.primaryPrediction.claimProbabilityPercent}%)`
  );
  assert(
    twoClaimsRes.primaryPrediction.claimProbabilityPercent >= oneClaimRes.primaryPrediction.claimProbabilityPercent,
    `Monotonicity: 2 prior claims (${twoClaimsRes.primaryPrediction.claimProbabilityPercent}%) >= 1 prior claim (${oneClaimRes.primaryPrediction.claimProbabilityPercent}%)`
  );

  // Test 4: Monotonicity with respect to Traffic Violations
  const zeroViolationsRes = runStatisticalLearningInference({ ...sampleBaseInput, trafficViolationsCount: 0 });
  const twoViolationsRes = runStatisticalLearningInference({ ...sampleBaseInput, trafficViolationsCount: 2 });
  assert(
    twoViolationsRes.primaryPrediction.claimProbabilityPercent > zeroViolationsRes.primaryPrediction.claimProbabilityPercent,
    `Monotonicity: 2 traffic violations (${twoViolationsRes.primaryPrediction.claimProbabilityPercent}%) > 0 violations (${zeroViolationsRes.primaryPrediction.claimProbabilityPercent}%)`
  );

  // Test 5: TreeSHAP Additive Attribution Generation
  const riskIndices = calculateStatisticalRiskIndices(sampleBaseInput);
  assert(riskIndices.shapAttributions.length > 0, 'TreeSHAP must produce non-empty attribution list');
  
  const sumAttributions = riskIndices.shapAttributions.reduce((acc, item) => acc + item.impactPercent, 0);
  assert(
    !isNaN(sumAttributions) && isFinite(sumAttributions),
    'TreeSHAP attribution sum must be finite'
  );

  // Test 6: Benchmark Metrics Gini & Brier ordering
  assert(
    BENCHMARK_METRICS.every((b) => b.giniCoefficient > 0 && b.giniCoefficient < 1),
    'All benchmark models must have normalized Gini coefficients in (0, 1)'
  );
  assert(
    BENCHMARK_METRICS.every((b) => b.brierScore > 0 && b.brierScore < 0.25),
    'All benchmark models must have valid Brier scores < 0.25'
  );

  return { passed, failed, errors };
}
