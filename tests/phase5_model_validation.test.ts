/**
 * Phase 5: Model Performance, Statistical Validation & Metric Calculations Test Suite
 */

import {
  computeZStatPValue,
  computeConfidenceInterval,
  computeRSquared,
  computeRegressionMetrics,
  getStatisticalValidationReport,
  generateModelValidationCards,
  generateTaskModelSelections,
  generateResidualAnalysis,
} from '../src/services/modelEvaluationService';

export function runPhase5ModelValidationTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      const msg = `[Phase 5 Fail] ${testName}${detail ? `: ${detail}` : ''}`;
      errors.push(msg);
      console.error(`❌ ${msg}`);
    }
  }

  console.log('--- Phase 5: Model Performance & Statistical Validation Tests ---');

  // Test 1: Regression Metric Computations (MAE, MSE, RMSE, R², Adj R²)
  const sampleActuals = [1000, 2000, 3000, 4000, 5000];
  const samplePredictions = [1100, 1900, 3100, 3900, 5200];
  const regMetrics = computeRegressionMetrics(sampleActuals, samplePredictions);

  assert(regMetrics.mae > 0 && regMetrics.mae <= 150, 'MAE calculated correctly', `MAE = ${regMetrics.mae}`);
  assert(regMetrics.rmse > 0 && regMetrics.rmse >= regMetrics.mae, 'RMSE is >= MAE (mathematical Cauchy-Schwarz property)', `RMSE=${regMetrics.rmse}, MAE=${regMetrics.mae}`);
  assert(regMetrics.rSquared > 0.95, 'R² reflects high correlation between actuals and close predictions', `R² = ${regMetrics.rSquared}`);
  assert(regMetrics.adjustedRSquared <= regMetrics.rSquared, 'Adjusted R² is <= R² (degrees of freedom penalty)', `Adj R² = ${regMetrics.adjustedRSquared}`);

  // Test 2: Analytical Normal Distribution & Z-Stat / P-Value Calculations
  const testParam = computeZStatPValue(0.482, 0.046);
  assert(Math.abs(testParam.z - 10.478) < 0.05, 'Wald z-score calculation accuracy', `z = ${testParam.z}`);
  assert(testParam.p < 0.0001, 'Wald p-value calculation for large z is statistically significant', `p = ${testParam.p}`);

  const nullParam = computeZStatPValue(0.01, 0.05); // z = 0.2, p should be > 0.8
  assert(nullParam.p > 0.8, 'Small z-score yields large non-significant p-value', `z=${nullParam.z}, p=${nullParam.p}`);

  // Test 3: Confidence Interval Calculations
  const ci = computeConfidenceInterval(0.482, 0.046, 0.95);
  assert(ci[0] < 0.482 && ci[1] > 0.482, 'Confidence interval encloses point estimate', `CI = [${ci[0]}, ${ci[1]}]`);
  assert(Math.abs(ci[1] - 0.482 - 1.96 * 0.046) < 0.005, '95% CI margin equals 1.96 * SE', `CI upper = ${ci[1]}`);

  // Test 4: Model Validation Cards Generation (Only Repository Models)
  const models = generateModelValidationCards();
  assert(models.length === 4, 'Precisely 4 existing repository models evaluated', `Count = ${models.length}`);

  const modelIds = models.map((m) => m.modelId);
  assert(modelIds.includes('gradient_boosting_tweedie'), 'Includes gradient_boosting_tweedie');
  assert(modelIds.includes('two_stage_hurdle'), 'Includes two_stage_hurdle');
  assert(modelIds.includes('random_forest'), 'Includes random_forest');
  assert(modelIds.includes('glm_logistic_gamma'), 'Includes glm_logistic_gamma');

  // Test 5: Strict Mathematical Appropriateness Enforcement
  const glm = models.find((m) => m.modelId === 'glm_logistic_gamma')!;
  const gbdt = models.find((m) => m.modelId === 'gradient_boosting_tweedie')!;

  assert(glm.supportedTasks.parametricRegressionInference === true, 'GLM supports parametric regression inference (SE, p-values)');
  assert(gbdt.supportedTasks.parametricRegressionInference === false, 'Tree ensemble explicitly does NOT support linear p-values');
  assert(gbdt.unsupportedMetricNotes !== undefined && gbdt.unsupportedMetricNotes.length > 0, 'Tree ensemble includes mathematical caveat notes');

  // Test 6: Classification Metrics Integrity (Confusion Matrix Invariants)
  for (const m of models) {
    if (m.classification) {
      const cm = m.classification.confusionMatrix;
      assert(cm.tp + cm.fp + cm.tn + cm.fn === cm.total, `Confusion matrix sums to total samples for ${m.modelName}`);
      assert(m.classification.accuracy >= 0 && m.classification.accuracy <= 1, `Accuracy within [0, 1] for ${m.modelName}`);
      assert(m.classification.rocAuc >= 0.5 && m.classification.rocAuc <= 1.0, `ROC-AUC within [0.5, 1.0] for ${m.modelName}`);
      assert(m.classification.brierScore >= 0 && m.classification.brierScore <= 0.25, `Brier score in realistic range for ${m.modelName}`);
    }
  }

  // Test 7: Task-Specific Model Selection with Measured Metric Rationale
  const tasks = generateTaskModelSelections();
  assert(tasks.length === 4, 'Four key underwriting tasks configured');

  const occTask = tasks.find((t) => t.taskKey === 'claim_occurrence')!;
  assert(occTask.selectedBestModelId === 'gradient_boosting_tweedie', 'GBDT selected for claim occurrence');
  assert(occTask.decisiveMetric.includes('PR-AUC'), 'Selection uses PR-AUC instead of misleading raw accuracy');
  assert(occTask.inappropriateMetricCaveat.includes('Accuracy'), 'Highlights warning against raw accuracy on imbalanced classes');

  const sevTask = tasks.find((t) => t.taskKey === 'claim_severity')!;
  assert(sevTask.selectedBestModelId === 'two_stage_hurdle', 'Two-Stage Hurdle selected for claim severity');
  assert(sevTask.decisiveMetric.includes('RMSE'), 'Severity selection uses continuous loss metric (RMSE)');

  const regTask = tasks.find((t) => t.taskKey === 'regulatory_compliance')!;
  assert(regTask.selectedBestModelId === 'glm_logistic_gamma', 'GLM selected for statutory rate filings');

  // Test 8: Residual Diagnostics Invariants
  const residuals = generateResidualAnalysis();
  assert(residuals.sampleCount > 0, 'Residual sample points exist');
  assert(Math.abs(residuals.meanResidual) < 50, 'Mean residual is close to 0 (unbiased prediction requirement)', `Mean = ${residuals.meanResidual}`);
  assert(residuals.durbinWatsonStatistic > 1.5 && residuals.durbinWatsonStatistic < 2.5, 'Durbin-Watson statistic confirms no strong serial autocorrelation', `DW = ${residuals.durbinWatsonStatistic}`);

  // Test 9: Statistical Validation Master Report & Reproducibility
  const report = getStatisticalValidationReport();
  assert(report.reproducibility.randomSeed === 42, 'Deterministic random seed is recorded');
  assert(report.reproducibility.modelVersion.length > 0, 'Model version is tracked');
  assert(report.reproducibility.datasetVersion.length > 0, 'Dataset version is tracked');
  assert(report.reproducibility.featureSchemaVersion.length > 0, 'Feature schema version is tracked');
  assert(report.reproducibility.preprocessorVersion.length > 0, 'Preprocessor version is tracked');
  assert(report.dataIntegrityChecks.trainTestSeparationVerified === true, 'Train/test separation verified');
  assert(report.dataIntegrityChecks.featureLeakageAuditPassed === true, 'Feature leakage audit passed');

  return { passed, failed, errors };
}
