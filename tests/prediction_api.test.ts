/**
 * Phase 5 Backend and Prediction API Automated Test Suite
 * 
 * Tests:
 * 1. Request Input Normalization & Multi-field Aliasing
 * 2. Boundary Value & Type Validation
 * 3. Versioned Model Registry Abstraction
 * 4. Calibrated Prediction & Risk Threshold Application
 * 5. Feature Attribution & Top Contributing Factors
 * 6. Error Handling & Security Isolation
 */

import { predictionService, ValidationError } from '../src/server/services/predictionService';
import { modelRegistry } from '../src/server/services/modelRegistry';

export function runPhase5PredictionApiTests() {
  console.log('\n======================================================');
  console.log('⚡ RUNNING PHASE 5: BACKEND & PREDICTION API TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${detail ? `-> ${detail}` : ''}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Test 1: Model Registry Initialization & Version Catalog
  // -------------------------------------------------------------
  console.log('--- Test Suite 1: Model Registry Abstraction ---');
  assert(modelRegistry.isReady(), 'Model registry is successfully initialized and ready');
  
  const models = modelRegistry.listModels();
  assert(models.length >= 3, `Registry exposes multiple versioned models (found ${models.length})`);
  
  const activeVersion = modelRegistry.getActiveVersion();
  assert(activeVersion === 'v1.2.0-gbdt-calibrated-platt', `Active production champion is ${activeVersion}`);

  const championModel = models.find((m) => m.version === activeVersion);
  assert(championModel !== undefined, 'Champion model metadata is present in registry');
  assert(championModel?.calibrationMethod.includes('Platt'), 'Champion model specifies Platt calibration method');
  assert(championModel?.decisionThreshold === 0.08, 'Champion model applies validation-derived threshold of 0.08');

  // Test non-existent model version lookup
  let caughtNotFound = false;
  try {
    modelRegistry.getModel('v9.9.9-non-existent');
  } catch (err: any) {
    caughtNotFound = true;
    assert(err.message.includes('not found in registry'), 'Registry throws informative error on unknown model version');
  }
  assert(caughtNotFound, 'Registry rejects unversioned/unknown model requests');

  // -------------------------------------------------------------
  // Test 2: Input Normalization & Aliasing (camelCase & snake_case)
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 2: Request Input Normalization & Aliasing ---');
  const camelCaseInput = {
    age: 32,
    annualMileage: 14500,
    vehicleValue: 28000,
    creditScore: 720,
    drivingExperienceYears: 14,
    priorClaims: 1,
    vehicleType: 'SUV',
    regionalZone: 'Urban',
    exposure: 1.0,
  };

  const norm1 = predictionService.normalizeAndValidateInput(camelCaseInput);
  assert(norm1.age === 32, 'Normalized standard camelCase age');
  assert(norm1.annualMileage === 14500, 'Normalized standard camelCase annualMileage');
  assert(norm1.vehicleType === 'Compact SUV', 'Normalized vehicle type SUV -> Compact SUV');
  assert(norm1.regionalZone === 'Urban Dense', 'Normalized regional zone Urban -> Urban Dense');

  const snakeCaseInput = {
    driver_age: 45,
    annual_mileage: 9500,
    vehicle_value: 35000,
    credit_score: 810,
    driving_experience_years: 25,
    prior_claims: 0,
    vehicle_type: 'Sedan',
    zone: 'Rural Low-Risk (Zone A)',
    annual_exposure: 0.8,
  };

  const norm2 = predictionService.normalizeAndValidateInput(snakeCaseInput);
  assert(norm2.age === 45, 'Normalized snake_case driver_age -> age');
  assert(norm2.annualMileage === 9500, 'Normalized snake_case annual_mileage -> annualMileage');
  assert(norm2.creditScore === 810, 'Normalized snake_case credit_score -> creditScore');
  assert(norm2.vehicleType === 'Economy Sedan', 'Normalized Sedan -> Economy Sedan');
  assert(norm2.regionalZone === 'Rural Low-Risk', 'Normalized Zone A alias -> Rural Low-Risk');
  assert(norm2.exposure === 0.8, 'Normalized snake_case annual_exposure -> exposure');

  // -------------------------------------------------------------
  // Test 3: Validation Boundary Enforcement & Error Structuring
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 3: Validation Boundaries & Structured Errors ---');

  // Missing required fields
  let caughtMissing = false;
  try {
    predictionService.normalizeAndValidateInput({ age: 30 });
  } catch (err: any) {
    if (err instanceof ValidationError) {
      caughtMissing = true;
      const fields = err.fieldErrors.map((f) => f.field);
      assert(fields.includes('annualMileage'), 'Flags missing annualMileage');
      assert(fields.includes('vehicleValue'), 'Flags missing vehicleValue');
    }
  }
  assert(caughtMissing, 'Rejects payload missing mandatory features');

  // Underage driver boundary (age < 16)
  let caughtUnderage = false;
  try {
    predictionService.normalizeAndValidateInput({
      age: 14,
      annualMileage: 10000,
      vehicleValue: 20000,
    });
  } catch (err: any) {
    caughtUnderage = err instanceof ValidationError && err.fieldErrors.some((f) => f.field === 'age');
  }
  assert(caughtUnderage, 'Rejects underage driver (< 16 years)');

  // Overage driver boundary (age > 100)
  let caughtOverage = false;
  try {
    predictionService.normalizeAndValidateInput({
      age: 105,
      annualMileage: 10000,
      vehicleValue: 20000,
    });
  } catch (err: any) {
    caughtOverage = err instanceof ValidationError && err.fieldErrors.some((f) => f.field === 'age');
  }
  assert(caughtOverage, 'Rejects invalid senior driver age (> 100 years)');

  // Impossible driving experience (experience > age - 16)
  let caughtExp = false;
  try {
    predictionService.normalizeAndValidateInput({
      age: 20,
      drivingExperienceYears: 10, // Max possible is 4 (20 - 16)
      annualMileage: 10000,
      vehicleValue: 20000,
    });
  } catch (err: any) {
    caughtExp = err instanceof ValidationError && err.fieldErrors.some((f) => f.field === 'drivingExperienceYears');
  }
  assert(caughtExp, 'Rejects impossible driving experience exceeding age - 16');

  // Invalid credit score boundary (< 300 or > 850)
  let caughtCredit = false;
  try {
    predictionService.normalizeAndValidateInput({
      age: 30,
      annualMileage: 10000,
      vehicleValue: 20000,
      creditScore: 250,
    });
  } catch (err: any) {
    caughtCredit = err instanceof ValidationError && err.fieldErrors.some((f) => f.field === 'creditScore');
  }
  assert(caughtCredit, 'Rejects out-of-range credit score (< 300)');

  // Non-numeric / boolean values
  let caughtType = false;
  try {
    predictionService.normalizeAndValidateInput({
      age: true as any,
      annualMileage: 'ten-thousand' as any,
      vehicleValue: 20000,
    });
  } catch (err: any) {
    caughtType = err instanceof ValidationError;
  }
  assert(caughtType, 'Rejects boolean/string types for numeric parameters');

  // -------------------------------------------------------------
  // Test 4: End-to-End Prediction Generation & Risk Classification
  // -------------------------------------------------------------
  console.log('\n--- Test Suite 4: End-to-End Prediction Execution ---');
  const lowRiskProfile = {
    age: 48,
    drivingExperienceYears: 28,
    creditScore: 820,
    annualMileage: 6000,
    vehicleValue: 22000,
    vehicleType: 'Sedan',
    regionalZone: 'Rural',
    priorClaims: 0,
    exposure: 1.0,
  };

  const pred1 = predictionService.generatePrediction(lowRiskProfile);
  assert(typeof pred1.predictionId === 'string' && pred1.predictionId.startsWith('pred_act_'), 'Generates unique predictionId with prefix pred_act_');
  assert(pred1.probability >= 0 && pred1.probability <= 1, `Probability is strictly bounded in [0, 1] (${pred1.probability})`);
  assert(pred1.modelVersion === 'v1.2.0-gbdt-calibrated-platt', `Uses active champion model version (${pred1.modelVersion})`);
  assert(pred1.thresholdApplied === 0.08, 'Applies configured decision threshold 0.08');
  assert(pred1.probability < 0.08 && !pred1.isClaimPredicted, `Low risk profile correctly evaluated below threshold (p=${pred1.probability}, isClaimPredicted=${pred1.isClaimPredicted})`);
  assert(pred1.topContributingFactors.length >= 3, `Returns structured attribution factors (count: ${pred1.topContributingFactors.length})`);

  const highRiskProfile = {
    age: 19,
    drivingExperienceYears: 1,
    creditScore: 540,
    annualMileage: 25000,
    vehicleValue: 45000,
    vehicleType: 'Sports',
    regionalZone: 'Urban',
    priorClaims: 3,
    exposure: 1.0,
  };

  const pred2 = predictionService.generatePrediction(highRiskProfile);
  assert(pred2.probability > pred1.probability, `High risk profile probability (${pred2.probability}) > low risk profile (${pred1.probability})`);
  assert(pred2.probability >= 0.08 && pred2.isClaimPredicted, `High risk profile triggers claim alert (p=${pred2.probability}, isClaimPredicted=${pred2.isClaimPredicted})`);
  assert(pred2.riskLevel === 'HIGH' || pred2.riskLevel === 'VERY_HIGH', `High risk profile assigned elevated risk level (${pred2.riskLevel})`);

  // Verify feature explanation structure
  const youthFactor = pred2.topContributingFactors.find((f) => f.feature === 'driver_age');
  assert(youthFactor !== undefined && youthFactor.impact === 'INCREASES_RISK', 'Identifies youth age as risk-increasing factor');
  
  const claimsFactor = pred2.topContributingFactors.find((f) => f.feature === 'prior_claims');
  assert(claimsFactor !== undefined && claimsFactor.impact === 'INCREASES_RISK', 'Identifies prior claims history as risk-increasing factor');

  // Model version switching support
  const candidatePred = predictionService.generatePrediction(lowRiskProfile, 'v1.1.0-hurdle-poisson');
  assert(candidatePred.modelVersion === 'v1.1.0-hurdle-poisson', `Can target specific version in registry (${candidatePred.modelVersion})`);
  assert(candidatePred.thresholdApplied === 0.10, 'Candidate model uses its configured threshold (0.10)');

  // -------------------------------------------------------------
  // Test Summary
  // -------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`PHASE 5 TEST RESULTS: Passed: ${passed} | Failed: ${failed}`);
  console.log('======================================================\n');

  if (failed > 0) {
    throw new Error(`Phase 5 Prediction API tests failed (${failed} errors).`);
  }

  return { passed, failed };
}
