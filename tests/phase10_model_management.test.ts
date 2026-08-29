import { modelRegistry } from '../src/server/services/modelRegistry';
import { PredictionService } from '../src/server/services/predictionService';
import { AuditService } from '../src/server/services/auditService';

export async function runPhase10ModelManagementTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  const assert = (condition: boolean, msg: string) => {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(msg);
      console.error(`  FAIL: ${msg}`);
    }
  };

  console.log('--- Phase 10: Model Registry & Metadata Invariants ---');

  // Test 1: Registry initialization and model metadata fields
  const allModels = modelRegistry.listRegistryRecords();
  assert(allModels.length >= 4, `Registry should contain at least 4 registered models (found: ${allModels.length})`);

  const activeVersion = modelRegistry.getActiveVersion();
  const champion = modelRegistry.getRegistryRecordByVersion(activeVersion);
  assert(champion !== undefined, 'Production champion model must be defined in registry');
  assert(champion?.status === 'PRODUCTION', `Champion model status must be 'PRODUCTION' (found: ${champion?.status})`);
  assert(champion?.modelVersion === 'v1.2.0-gbdt-calibrated-platt', `Champion model version must match expected champion (found: ${champion?.modelVersion})`);

  // Verify full metadata structure for all models
  allModels.forEach((m) => {
    assert(!!m.modelName, `Model ${m.modelVersion} must have modelName`);
    assert(!!m.modelVersion, `Model must have modelVersion`);
    assert(!!m.algorithm, `Model ${m.modelVersion} must have algorithm`);
    assert(!!m.trainingDatasetVersion, `Model ${m.modelVersion} must have trainingDatasetVersion`);
    assert(!!m.trainingDate, `Model ${m.modelVersion} must have trainingDate`);
    assert(Array.isArray(m.features) && m.features.length > 0, `Model ${m.modelVersion} must have features list`);
    assert(m.decisionThreshold > 0 && m.decisionThreshold < 1, `Model ${m.modelVersion} must have valid decision threshold`);
    assert(['DEVELOPMENT', 'CANDIDATE', 'PRODUCTION', 'RETIRED'].includes(m.status), `Model ${m.modelVersion} has valid lifecycle status (${m.status})`);
    
    // Evaluation metrics
    const metrics = m.evaluationMetrics;
    assert(metrics.rocAuc > 0.5 && metrics.rocAuc <= 1.0, `Model ${m.modelVersion} ROC-AUC must be > 0.5 and <= 1.0 (found: ${metrics.rocAuc})`);
    assert(metrics.prAuc > 0 && metrics.prAuc <= 1.0, `Model ${m.modelVersion} PR-AUC must be > 0 (found: ${metrics.prAuc})`);
    assert(metrics.f1Score > 0 && metrics.f1Score <= 1.0, `Model ${m.modelVersion} F1 must be > 0`);
    assert(metrics.logLoss > 0, `Model ${m.modelVersion} Log Loss must be positive`);
    assert(metrics.brierScore > 0 && metrics.brierScore < 1.0, `Model ${m.modelVersion} Brier Score must be in (0, 1)`);
    assert(!!m.calibrationInformation?.method, `Model ${m.modelVersion} must specify calibration method`);
  });

  console.log('--- Phase 10: Prediction Traceability ---');

  // Test 2: Prediction response links to modelVersion and records audit log
  const predictionService = new PredictionService();
  const samplePolicyholder = {
    age: 38,
    drivingExperienceYears: 18,
    regionalZone: 'Suburban Moderate',
    annualMileage: 12000,
    creditScore: 720,
    vehicleType: 'Sedan',
    vehicleValue: 28000,
    priorClaims: 0,
    exposure: 1.0,
    deductible: 500,
  };

  const predResult = predictionService.generatePrediction(samplePolicyholder);
  assert(predResult.modelVersion === champion?.modelVersion, `Prediction must reference active production modelVersion (found: ${predResult.modelVersion})`);
  assert(typeof predResult.probability === 'number' && predResult.probability >= 0 && predResult.probability <= 1, 'Claim probability must be valid number between 0 and 1');
  assert(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'].includes(predResult.riskLevel), `Risk level must be standard enum tier (found: ${predResult.riskLevel})`);

  console.log('--- Phase 10: Model Comparison Invariants ---');

  // Test 3: Side-by-side comparison logic
  const comparison = modelRegistry.compareModels('v1.2.0-gbdt-calibrated-platt', 'v1.1.0-hurdle-poisson');
  assert(comparison.modelA.modelVersion === 'v1.2.0-gbdt-calibrated-platt', 'Model A must match requested version A');
  assert(comparison.modelB.modelVersion === 'v1.1.0-hurdle-poisson', 'Model B must match requested version B');
  assert(typeof comparison.metricDeltas.rocAucDelta === 'number', 'ROC-AUC delta must be a computed number');
  assert(typeof comparison.metricDeltas.logLossDelta === 'number', 'Log Loss delta must be a computed number');
  assert(!!comparison.recommendation.championVersion, 'Comparison must output a champion version recommendation');
  assert(comparison.recommendation.championVersion === 'v1.2.0-gbdt-calibrated-platt', 'GBDT model should be recommended champion based on superior metrics');

  console.log('--- Phase 10: Lifecycle Governance & Audit Logging ---');

  // Test 4: Threshold adjustment with audit logging
  const initialAuditLogs = AuditService.getLogs();
  const initialAuditCount = initialAuditLogs.length;

  const configUpdated = modelRegistry.updateModelConfiguration(
    'v1.1.0-hurdle-poisson',
    { decisionThreshold: 0.095 },
    { userId: 'actuary_user_42', userEmail: 'actuary@insurance.internal', userRole: 'ANALYST' },
    'Updating Hurdle threshold to align with Q3 loss ratio target.'
  );
  assert(!!configUpdated, 'updateModelConfiguration should return updated record');
  const updatedHurdle = modelRegistry.getRegistryRecordByVersion('v1.1.0-hurdle-poisson');
  assert(updatedHurdle?.decisionThreshold === 0.095, `Decision threshold should update to 0.095 (found: ${updatedHurdle?.decisionThreshold})`);

  const afterConfigLogs = AuditService.getLogs();
  assert(afterConfigLogs.length > initialAuditCount, 'Audit log count must increase after threshold update');
  const hasConfigLog = afterConfigLogs.some(l => l.action === 'CONFIG_CHANGED');
  assert(hasConfigLog, 'Audit log must record CONFIG_CHANGED');

  // Test 5: Model Retirement with audit logging
  // Register a temporary test model first to test retirement safely
  const customModel = modelRegistry.registerCustomModel(
    {
      modelName: 'Experimental Linear SVM',
      modelVersion: 'v0.9.0-test-svm',
      algorithm: 'Support Vector Machine',
      trainingDatasetVersion: 'cas-auto-2025-v1.4',
      trainingDate: '2026-03-01',
      features: ['driver_age', 'prior_claims', 'vehicle_value'],
      hyperparameters: { c: 1.0, kernel: 'linear' },
      evaluationMetrics: {
        rocAuc: 0.720,
        prAuc: 0.290,
        precision: 0.280,
        recall: 0.350,
        f1Score: 0.311,
        logLoss: 0.2200,
        brierScore: 0.0680,
        expectedCalibrationError: 0.0450,
      },
      calibrationInformation: {
        method: 'None',
        expectedCalibrationError: 0.0450,
      },
      decisionThreshold: 0.10,
      status: 'DEVELOPMENT',
      description: 'Experimental SVM prototype for non-linear boundary testing.',
    },
    { userId: 'admin_lead_1', userEmail: 'admin@insurance.internal', userRole: 'ADMIN' }
  );
  assert(!!customModel, 'Custom model registered successfully');

  const retiredRecord = modelRegistry.retireModel(
    'v0.9.0-test-svm',
    { userId: 'admin_lead_1', userEmail: 'admin@insurance.internal', userRole: 'ADMIN' },
    'Archived candidate after empirical evaluation demonstrated sub-par ROC-AUC.'
  );
  assert(retiredRecord.status === 'RETIRED', `Retired model status must be 'RETIRED' (found: ${retiredRecord.status})`);
  const retiredCheck = modelRegistry.getRegistryRecordByVersion('v0.9.0-test-svm');
  assert(retiredCheck?.status === 'RETIRED', `Registry lookup returns status 'RETIRED' (found: ${retiredCheck?.status})`);

  const afterRetireLogs = AuditService.getLogs();
  const retireLog = afterRetireLogs.find(l => l.action === 'MODEL_RETIRED');
  assert(!!retireLog, 'Audit log must record MODEL_RETIRED');
  assert(retireLog?.details?.rationale?.includes('sub-par ROC-AUC'), 'Retirement rationale must be captured in audit log');

  // Test 6: Model Promotion Governance (No silent replacement; previous champion demoted to candidate)
  // Promote Hurdle model to production
  const promoteRecord = modelRegistry.promoteModel(
    'v1.1.0-hurdle-poisson',
    'PRODUCTION',
    { userId: 'chief_actuary_007', userEmail: 'chief@insurance.internal', userRole: 'ADMIN' },
    'Specialized pricing cycle promotion for catastrophe stress testing.'
  );
  assert(promoteRecord.status === 'PRODUCTION', 'promoteModel should set status to PRODUCTION');
  const newChampionVersion = modelRegistry.getActiveVersion();
  assert(newChampionVersion === 'v1.1.0-hurdle-poisson', `New champion must be Hurdle model (found: ${newChampionVersion})`);

  const prevChampion = modelRegistry.getRegistryRecordByVersion('v1.2.0-gbdt-calibrated-platt');
  assert(prevChampion?.status === 'CANDIDATE', `Previous champion must transition to CANDIDATE (found: ${prevChampion?.status})`);

  // Verify audit log for promotion
  const promotionLogs = AuditService.getLogs();
  const promoteLog = promotionLogs.find(l => l.action === 'MODEL_PROMOTED');
  assert(!!promoteLog, 'Audit log must record MODEL_PROMOTED');

  // Restore GBDT as production champion for system consistency
  modelRegistry.promoteModel(
    'v1.2.0-gbdt-calibrated-platt',
    'PRODUCTION',
    { userId: 'chief_actuary_007', userEmail: 'chief@insurance.internal', userRole: 'ADMIN' },
    'Restoring GBDT Tweedie as primary production champion.'
  );
  assert(modelRegistry.getActiveVersion() === 'v1.2.0-gbdt-calibrated-platt', 'GBDT successfully restored as champion');

  return { passed, failed, errors };
}
