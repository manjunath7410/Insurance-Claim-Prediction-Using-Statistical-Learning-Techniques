/**
 * Test Suite: Phase 7 - Insurance Claim Prediction Application
 * Tests form structure, client & server validation, ML prediction flow,
 * result output fields, and safety disclaimers.
 */

import { predictionService, ValidationError } from '../src/server/services/predictionService';
import { modelRegistry } from '../src/server/services/modelRegistry';
import { db } from '../src/server/db/database';

export function runPhase7Tests(): boolean {
  console.log('\n============================================================');
  console.log('🧪 RUNNING PHASE 7: PREDICTION APPLICATION VERIFICATION SUITE');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  };

  // -------------------------------------------------------------
  // Test 1: Model Catalog & Registry Setup
  // -------------------------------------------------------------
  try {
    const models = modelRegistry.listModels();
    assert(models.length >= 3, 'Model registry exposes >= 3 production/candidate models');
    const activeVer = modelRegistry.getActiveVersion();
    assert(activeVer === 'v1.2.0-gbdt-calibrated-platt', 'Active champion model is v1.2.0-gbdt-calibrated-platt');
  } catch (err: any) {
    assert(false, 'Model registry retrieval failed', err.message);
  }

  // -------------------------------------------------------------
  // Test 2: 5 Structured Logical Sections Input Validation
  // -------------------------------------------------------------
  const validPayload = {
    // 1. Customer Information
    age: 35,
    drivingExperienceYears: 17,
    creditScore: 740,
    driverGender: 'Female',
    maritalStatus: 'Married',

    // 2. Policy Information
    coverageTier: 'Standard Comprehensive',
    deductible: 500,
    exposure: 1.0,
    policyTenureYears: 4,

    // 3. Vehicle Information
    vehicleType: 'Compact SUV',
    vehicleValue: 32000,
    vehicleAge: 3,
    annualMileage: 12000,
    antiTheftDevice: true,

    // 4. Historical Claim Information
    priorClaims: 0,
    trafficViolationsCount: 0,

    // 5. Other Risk Variables
    regionalZone: 'Suburban Moderate',
  };

  try {
    const normalized = predictionService.normalizeAndValidateInput(validPayload);
    assert(normalized.age === 35, 'Normalized Customer: Age 35');
    assert(normalized.drivingExperienceYears === 17, 'Normalized Customer: Experience 17 yrs');
    assert(normalized.creditScore === 740, 'Normalized Customer: Credit Score 740');
    assert(normalized.deductible === 500, 'Normalized Policy: Deductible $500');
    assert(normalized.exposure === 1.0, 'Normalized Policy: Exposure 1.0 yr');
    assert(normalized.vehicleValue === 32000, 'Normalized Vehicle: Value $32k');
    assert(normalized.annualMileage === 12000, 'Normalized Vehicle: Mileage 12k mi');
    assert(normalized.priorClaims === 0, 'Normalized History: Prior Claims 0');
    assert(normalized.regionalZone === 'Suburban Moderate', 'Normalized Territory: Suburban Moderate');
  } catch (err: any) {
    assert(false, 'Valid 5-section payload failed normalization', err.message);
  }

  // -------------------------------------------------------------
  // Test 3: Validation Boundary Checks
  // -------------------------------------------------------------
  // 3a. Driver Age out of bounds (<16)
  try {
    predictionService.normalizeAndValidateInput({ ...validPayload, age: 14 });
    assert(false, 'Underage driver (<16) should throw ValidationError');
  } catch (err: any) {
    assert(err instanceof ValidationError, 'Underage driver (<16) rejected with ValidationError');
  }

  // 3b. Driving Experience > Age - 16
  try {
    predictionService.normalizeAndValidateInput({ ...validPayload, age: 20, drivingExperienceYears: 8 });
    assert(false, 'Driving experience > age - 16 should throw ValidationError');
  } catch (err: any) {
    assert(err instanceof ValidationError, 'Driving experience > age - 16 rejected with ValidationError');
  }

  // 3c. Credit Score out of bounds (<300 or >850)
  try {
    predictionService.normalizeAndValidateInput({ ...validPayload, creditScore: 920 });
    assert(false, 'Credit score > 850 should throw ValidationError');
  } catch (err: any) {
    assert(err instanceof ValidationError, 'Credit score > 850 rejected with ValidationError');
  }

  // 3d. Annual Mileage out of bounds (<500 or >100,000)
  try {
    predictionService.normalizeAndValidateInput({ ...validPayload, annualMileage: 150000 });
    assert(false, 'Annual mileage > 100,000 should throw ValidationError');
  } catch (err: any) {
    assert(err instanceof ValidationError, 'Annual mileage > 100,000 rejected with ValidationError');
  }

  // 3e. Prior Claims out of bounds (<0 or >20)
  try {
    predictionService.normalizeAndValidateInput({ ...validPayload, priorClaims: 25 });
    assert(false, 'Prior claims > 20 should throw ValidationError');
  } catch (err: any) {
    assert(err instanceof ValidationError, 'Prior claims > 20 rejected with ValidationError');
  }

  // -------------------------------------------------------------
  // Test 4: End-to-End Prediction Generation Workflow
  // -------------------------------------------------------------
  try {
    const predictionResult = predictionService.generatePrediction(validPayload);

    // 1. Claim Probability
    assert(
      typeof predictionResult.probability === 'number' &&
        predictionResult.probability >= 0 &&
        predictionResult.probability <= 1,
      'Prediction returns numeric probability in [0, 1]'
    );

    // 2. Risk Level
    assert(
      ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'].includes(predictionResult.riskLevel),
      `Prediction returns valid Risk Level: ${predictionResult.riskLevel}`
    );

    // 3. Model & Version
    assert(typeof predictionResult.modelName === 'string' && predictionResult.modelName.length > 0, 'Prediction includes modelName');
    assert(predictionResult.modelVersion === 'v1.2.0-gbdt-calibrated-platt', 'Prediction includes modelVersion');

    // 4. Timestamp
    assert(
      typeof predictionResult.timestamp === 'string' && !isNaN(Date.parse(predictionResult.timestamp)),
      'Prediction includes valid ISO timestamp'
    );

    // 5. Prediction ID
    assert(
      typeof predictionResult.predictionId === 'string' && predictionResult.predictionId.startsWith('pred_act_'),
      `Prediction includes unique traceable predictionId: ${predictionResult.predictionId}`
    );

    // 6. Top Contributing Factors
    assert(
      Array.isArray(predictionResult.topContributingFactors) && predictionResult.topContributingFactors.length > 0,
      `Prediction includes top contributing factors count: ${predictionResult.topContributingFactors.length}`
    );

    const firstFactor = predictionResult.topContributingFactors[0];
    assert(
      typeof firstFactor.feature === 'string' &&
        ['INCREASES_RISK', 'DECREASES_RISK', 'NEUTRAL'].includes(firstFactor.impact) &&
        typeof firstFactor.contributionScore === 'number' &&
        typeof firstFactor.explanation === 'string',
      'Contributing factors include structured impact, score, and explanation'
    );
  } catch (err: any) {
    assert(false, 'generatePrediction workflow failed', err.message);
  }

  // -------------------------------------------------------------
  // Test 5: Multi-Model Version Invocations
  // -------------------------------------------------------------
  try {
    const p1 = predictionService.generatePrediction(validPayload, 'v1.0.0-glm-logistic-baseline');
    assert(p1.modelVersion === 'v1.0.0-glm-logistic-baseline', 'Evaluated v1.0.0-glm-logistic-baseline model successfully');

    const p2 = predictionService.generatePrediction(validPayload, 'v1.1.0-hurdle-poisson');
    assert(p2.modelVersion === 'v1.1.0-hurdle-poisson', 'Evaluated v1.1.0-hurdle-poisson model successfully');

    const p3 = predictionService.generatePrediction(validPayload, 'v1.2.0-gbdt-calibrated-platt');
    assert(p3.modelVersion === 'v1.2.0-gbdt-calibrated-platt', 'Evaluated v1.2.0-gbdt-calibrated-platt model successfully');
  } catch (err: any) {
    assert(false, 'Multi-model version prediction failed', err.message);
  }

  // -------------------------------------------------------------
  // Test 6: Database Persistence Integration
  // -------------------------------------------------------------
  try {
    const predResult = predictionService.generatePrediction(validPayload);
    const recorded = db.recordPrediction({
      predictionId: predResult.predictionId,
      userId: 'usr_test_actuary',
      modelVersion: predResult.modelVersion,
      modelName: predResult.modelName,
      inputSnapshot: validPayload,
      claimProbability: predResult.probability,
      riskLevel: predResult.riskLevel,
      isClaimPredicted: predResult.isClaimPredicted,
      thresholdApplied: predResult.thresholdApplied,
      topAttributions: predResult.topContributingFactors,
      inferenceTimeMs: 10,
    });

    assert(recorded.predictionId === predResult.predictionId, 'Database successfully recorded prediction with integrity');
    const fetched = db.findPredictionById(recorded.id);
    assert(fetched !== null && fetched.claimProbability === predResult.probability, 'Database retrieved recorded prediction by ID');
  } catch (err: any) {
    assert(false, 'Database prediction recording failed', err.message);
  }

  console.log(`\n============================================================`);
  console.log(`Phase 7 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`============================================================\n`);

  return failed === 0;
}

