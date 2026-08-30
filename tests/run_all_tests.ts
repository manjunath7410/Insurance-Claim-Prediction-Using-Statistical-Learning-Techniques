import { runStatisticalInvariantTests } from './statistical_invariants.test';
import { runApiContractTests } from './api_contracts.test';
import { runDataPipelineTests } from './data_pipeline.test';
import { runMlPipelineTests } from './ml_pipeline.test';
import { runPhase4CalibrationTests } from './calibration_pipeline.test';
import { runPhase5PredictionApiTests } from './prediction_api.test';
import { runPhase6AuthAndDbTests } from './auth_and_db.test';
import { runPhase7Tests } from './phase7_prediction_app.test';
import { runPhase8AnalyticsDashboardTests } from './phase8_analytics_dashboard.test';
import { runPhase9ExplainabilityTests } from './phase9_explainability.test';
import { runPhase10ModelManagementTests } from './phase10_model_management.test';
import { runPerformanceAndHardeningTests } from './performance.test';
import { runPhase15DeploymentTests } from './phase15_deployment.test';

console.log('===========================================================');
console.log('INSURANCE RISK INTELLIGENCE PLATFORM - TEST SUITE RUNNER');
console.log('===========================================================\n');

let totalPassed = 0;
let totalFailed = 0;
const allErrors: string[] = [];

console.log('[1/11] Running Statistical Invariant Tests...');
const statResults = runStatisticalInvariantTests();
totalPassed += statResults.passed;
totalFailed += statResults.failed;
allErrors.push(...statResults.errors);
console.log(`      Passed: ${statResults.passed} | Failed: ${statResults.failed}`);

console.log('\n[2/11] Running API Contracts & Input Validation Tests...');
const apiResults = runApiContractTests();
totalPassed += apiResults.passed;
totalFailed += apiResults.failed;
allErrors.push(...apiResults.errors);
console.log(`      Passed: ${apiResults.passed} | Failed: ${apiResults.failed}`);

console.log('\n[3/11] Running Phase 2 Data Engineering & Quality Pipeline Tests...');
const pipelineResults = runDataPipelineTests();
totalPassed += pipelineResults.passed;
totalFailed += pipelineResults.failed;
allErrors.push(...pipelineResults.errors);
console.log(`      Passed: ${pipelineResults.passed} | Failed: ${pipelineResults.failed}`);

console.log('\n[4/11] Running Phase 3 ML Pipeline & Model Invariant Tests...');
const mlResults = runMlPipelineTests();
totalPassed += mlResults.passed;
totalFailed += mlResults.failed;
console.log(`      Passed: ${mlResults.passed} | Failed: ${mlResults.failed}`);

console.log('\n[5/11] Running Phase 4 Probability Calibration & Threshold Tests...');
const calResults = runPhase4CalibrationTests();
totalPassed += calResults.passed;
totalFailed += calResults.failed;
console.log(`      Passed: ${calResults.passed} | Failed: ${calResults.failed}`);

console.log('\n[6/11] Running Phase 5 Backend & Prediction API Tests...');
const predResults = runPhase5PredictionApiTests();
totalPassed += predResults.passed;
totalFailed += predResults.failed;
console.log(`      Passed: ${predResults.passed} | Failed: ${predResults.failed}`);

console.log('\n[7/11] Running Phase 6 Database, Auth & Authorization Tests...');
const authDbResults = runPhase6AuthAndDbTests();
totalPassed += authDbResults.passed;
totalFailed += authDbResults.failed;
allErrors.push(...authDbResults.errors);
console.log(`      Passed: ${authDbResults.passed} | Failed: ${authDbResults.failed}`);

console.log('\n[8/11] Running Phase 7 Prediction Application & Form Validation Tests...');
const phase7Success = runPhase7Tests();
if (!phase7Success) {
  totalFailed += 1;
  allErrors.push('Phase 7 prediction application test suite failed');
} else {
  totalPassed += 1;
}

console.log('\n[9/11] Running Phase 8 Analytics Dashboard & Actuarial Calculation Tests...');
try {
  await runPhase8AnalyticsDashboardTests();
  totalPassed += 9;
} catch (err: any) {
  totalFailed += 1;
  allErrors.push(`Phase 8 Analytics Dashboard tests failed: ${err?.message}`);
}

console.log('\n[10/11] Running Phase 9 Explainability, Gemini AI & Guardrails Tests...');
try {
  const p9Results = await runPhase9ExplainabilityTests();
  totalPassed += p9Results.passed;
  totalFailed += p9Results.failed;
  allErrors.push(...p9Results.errors);
  console.log(`      Passed: ${p9Results.passed} | Failed: ${p9Results.failed}`);
} catch (err: any) {
  totalFailed += 1;
  allErrors.push(`Phase 9 Explainability tests failed: ${err?.message}`);
}

console.log('\n[11/12] Running Phase 10 Model Management, Registry & Traceability Tests...');
try {
  const p10Results = await runPhase10ModelManagementTests();
  totalPassed += p10Results.passed;
  totalFailed += p10Results.failed;
  allErrors.push(...p10Results.errors);
  console.log(`      Passed: ${p10Results.passed} | Failed: ${p10Results.failed}`);
} catch (err: any) {
  totalFailed += 1;
  allErrors.push(`Phase 10 Model Management tests failed: ${err?.message}`);
}

console.log('\n[12/13] Running Phase 12 Performance, Caching & Production Hardening Tests...');
try {
  const p12Results = await runPerformanceAndHardeningTests();
  totalPassed += p12Results.passed;
  totalFailed += p12Results.failed;
  allErrors.push(...p12Results.errors);
  console.log(`      Passed: ${p12Results.passed} | Failed: ${p12Results.failed}`);
} catch (err: any) {
  totalFailed += 1;
  allErrors.push(`Phase 12 Performance & Hardening tests failed: ${err?.message}`);
}

console.log('\n[13/13] Running Phase 15 Production Deployment, Configuration & Health-Check Tests...');
try {
  const p15Results = await runPhase15DeploymentTests();
  totalPassed += p15Results.passed;
  totalFailed += p15Results.failed;
  allErrors.push(...p15Results.errors);
  console.log(`      Passed: ${p15Results.passed} | Failed: ${p15Results.failed}`);
} catch (err: any) {
  totalFailed += 1;
  allErrors.push(`Phase 15 Production Deployment tests failed: ${err?.message}`);
}

console.log('\n===========================================================');
console.log(`TEST SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED`);
console.log('===========================================================');

if (totalFailed > 0) {
  console.error('\nFAILURE DETAILS:');
  allErrors.forEach((err) => console.error(`  - ${err}`));
  process.exit(1);
} else {
  console.log('All statistical invariants, API contracts, persistence, auth security, analytics dashboard metrics, explainability guardrails, and model registry governance verified successfully.\n');
  process.exit(0);
}
