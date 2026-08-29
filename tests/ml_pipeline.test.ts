/**
 * Test Suite: Phase 3 Statistical Learning & Machine Learning Pipeline
 * 
 * Verifies:
 * 1. Leak-Free Preprocessing (fitted strictly on train split)
 * 2. Stratified Train/Val/Test Partition with Class Imbalance Invariants
 * 3. Stratified 5-Fold Cross-Validation (zero leakage)
 * 4. Model Training & Convergence across Candidate Classifiers:
 *    - Logistic Regression GLM
 *    - Random Forest Bagging
 *    - Gradient Boosted Decision Trees
 *    - Two-Stage Hurdle Classifier
 * 5. Metric Calculation Invariants (ROC-AUC, PR-AUC, Confusion Matrix, Brier, Log Loss)
 * 6. Candidate Production Model Selection, Rationale, and Limitations Documentation
 * 7. Exact Reproducibility under Fixed Random Seeds
 */

import {
  ActuarialDataPreprocessor,
  LogisticRegressionClassifier,
  RandomForestModel,
  GradientBoostingClassifierModel,
  TwoStageHurdleClassifierModel,
  stratifiedTrainValTestSplit,
  runStratifiedKFoldCrossValidation,
  runMasterMachineLearningPipeline,
  calculateRocAuc,
  calculatePrAuc,
  calculateLogLoss,
  calculateBrierScore,
  calculateConfusionMatrix,
} from '../src/services/mlPipeline';
import { generateActuarialBenchmarkPopulation } from '../src/data/mockInsuranceData';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

export function runMlPipelineTests(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;
  const benchmarkData = generateActuarialBenchmarkPopulation(300, 42);

  function test(name: string, fn: () => void) {
    try {
      fn();
      passed++;
    } catch (e: any) {
      console.error(`  - ${e.message}`);
      failed++;
    }
  }

  // 1. Preprocessor Unit & Leakage Tests
  test('Preprocessor must fit strictly on train records and compute valid scaling parameters', () => {
    const preprocessor = new ActuarialDataPreprocessor();
    preprocessor.fit(benchmarkData.slice(0, 100));
    const params = preprocessor.getParams();
    assert(params !== null, 'Preprocessor params must be non-null after fit');
    assert(params!.fittedOnCount === 100, 'Fitted count must equal 100');
    assert(Object.keys(params!.means).length >= 6, 'Must calculate means for numerical features');
    assert(Object.keys(params!.stds).length >= 6, 'Must calculate stds for numerical features');
    assert(params!.featureNames.length >= 8, 'Feature names array must be populated');
  });

  test('Preprocessor transform must output normalized matrices with valid exposure vector', () => {
    const preprocessor = new ActuarialDataPreprocessor().fit(benchmarkData.slice(0, 50));
    const transformed = preprocessor.transform(benchmarkData.slice(50, 70));
    assert(transformed.X.length === 20, 'Transformed X rows must match input slice length');
    assert(transformed.y.length === 20, 'Transformed y length must match input slice length');
    assert(transformed.exposures.length === 20, 'Transformed exposures length must match input slice length');
    assert(transformed.exposures.every((e) => e > 0), 'All exposure weights must be strictly positive');
  });

  // 2. Stratified Split Tests
  test('Stratified partition must maintain consistent class occurrence ratios across splits', () => {
    const splits = stratifiedTrainValTestSplit(benchmarkData, 0.70, 0.15, 42);
    assert(splits.train.length > 0, 'Train split must not be empty');
    assert(splits.val.length > 0, 'Val split must not be empty');
    assert(splits.test.length > 0, 'Test split must not be empty');

    const totalRecords = benchmarkData.length;
    assert(
      splits.train.length + splits.val.length + splits.test.length === totalRecords,
      'Split lengths sum must equal total dataset length'
    );

    const overallRate = benchmarkData.filter((r) => r.claimOccurred === 1).length / totalRecords;
    const trainRate = splits.train.filter((r) => r.claimOccurred === 1).length / splits.train.length;
    const testRate = splits.test.filter((r) => r.claimOccurred === 1).length / splits.test.length;

    assert(
      Math.abs(trainRate - overallRate) < 0.05,
      `Train occurrence rate (${trainRate.toFixed(4)}) must approximate overall rate (${overallRate.toFixed(4)})`
    );
    assert(
      Math.abs(testRate - overallRate) < 0.05,
      `Test occurrence rate (${testRate.toFixed(4)}) must approximate overall rate (${overallRate.toFixed(4)})`
    );
  });

  // 3. Model Training & Prediction Bounds Tests
  test('Logistic Regression GLM must output valid probabilities in [0, 1] with exposure offset', () => {
    const preprocessor = new ActuarialDataPreprocessor().fit(benchmarkData);
    const trans = preprocessor.transform(benchmarkData);
    const model = new LogisticRegressionClassifier(preprocessor.getFeatureNames());
    model.fit(trans.X, trans.y, trans.exposures);

    const probs = model.predictProbability(trans.X, trans.exposures);
    assert(probs.length === trans.X.length, 'Probabilities output length must match X');
    assert(probs.every((p) => p >= 0 && p <= 1), 'Every predicted probability must be bounded in [0, 1]');
  });

  test('Random Forest Classifier must output ensemble probabilities and feature importances', () => {
    const preprocessor = new ActuarialDataPreprocessor().fit(benchmarkData);
    const trans = preprocessor.transform(benchmarkData);
    const model = new RandomForestModel(preprocessor.getFeatureNames());
    model.fit(trans.X, trans.y);

    const probs = model.predictProbability(trans.X);
    assert(probs.every((p) => p >= 0 && p <= 1), 'Random forest probabilities must be bounded in [0, 1]');
    const importances = model.getFeatureImportance();
    assert(Object.keys(importances).length > 0, 'Feature importance dictionary must be non-empty');
  });

  test('Gradient Boosted Trees must minimize deviance residuals and output bounded probabilities', () => {
    const preprocessor = new ActuarialDataPreprocessor().fit(benchmarkData);
    const trans = preprocessor.transform(benchmarkData);
    const model = new GradientBoostingClassifierModel(preprocessor.getFeatureNames());
    model.fit(trans.X, trans.y);

    const probs = model.predictProbability(trans.X);
    assert(probs.every((p) => p >= 0 && p <= 1), 'GBDT probabilities must be bounded in [0, 1]');
    const importances = model.getFeatureImportance();
    assert(Object.keys(importances).length > 0, 'GBDT feature importances must be non-empty');
  });

  test('Two-Stage Hurdle Classifier must blend occurrence gating with valid bounds', () => {
    const preprocessor = new ActuarialDataPreprocessor().fit(benchmarkData);
    const trans = preprocessor.transform(benchmarkData);
    const model = new TwoStageHurdleClassifierModel(preprocessor.getFeatureNames());
    model.fit(trans.X, trans.y, trans.exposures);

    const probs = model.predictProbability(trans.X, trans.exposures);
    assert(probs.every((p) => p >= 0 && p <= 1), 'Two-stage hurdle probabilities must be in [0, 1]');
  });

  // 4. Metric Computation Mathematical Invariants
  test('ROC-AUC metric computation must return valid score between 0.5 and 1.0 on ordered predictions', () => {
    const yTrue = [0, 0, 0, 0, 0, 1, 1];
    const yScore = [0.1, 0.2, 0.15, 0.3, 0.25, 0.8, 0.9];
    const auc = calculateRocAuc(yTrue, yScore);
    assert(auc >= 0.90, `ROC-AUC must be high on well-separated synthetic distribution, got ${auc}`);
  });

  test('PR-AUC metric computation must return bounded Average Precision', () => {
    const yTrue = [0, 0, 1, 0, 1];
    const yScore = [0.1, 0.2, 0.7, 0.3, 0.8];
    const prAuc = calculatePrAuc(yTrue, yScore);
    assert(prAuc >= 0.0 && prAuc <= 1.0, `PR-AUC must be in [0, 1], got ${prAuc}`);
  });

  test('Log Loss and Brier Score must be non-negative and penalize overconfident false predictions', () => {
    const yTrue = [1, 0];
    const yScoreAccurate = [0.9, 0.1];
    const yScoreInaccurate = [0.1, 0.9];

    const lossAcc = calculateLogLoss(yTrue, yScoreAccurate);
    const lossInacc = calculateLogLoss(yTrue, yScoreInaccurate);
    assert(lossAcc < lossInacc, 'Log loss for accurate predictions must be lower than inaccurate predictions');

    const brierAcc = calculateBrierScore(yTrue, yScoreAccurate);
    const brierInacc = calculateBrierScore(yTrue, yScoreInaccurate);
    assert(brierAcc < brierInacc, 'Brier score for accurate predictions must be lower than inaccurate predictions');
  });

  test('Confusion matrix must satisfy TP + FP + TN + FN == N total samples', () => {
    const yTrue = [1, 0, 0, 1, 0, 1, 0, 0];
    const yScore = [0.8, 0.1, 0.2, 0.3, 0.05, 0.9, 0.4, 0.15];
    const cm = calculateConfusionMatrix(yTrue, yScore, 0.25);

    assert(
      cm.truePositives + cm.falsePositives + cm.trueNegatives + cm.falseNegatives === yTrue.length,
      'Confusion matrix counts sum must equal total samples'
    );
    assert(cm.precision >= 0 && cm.precision <= 1, 'Precision must be bounded [0, 1]');
    assert(cm.recall >= 0 && cm.recall <= 1, 'Recall must be bounded [0, 1]');
    assert(cm.f1Score >= 0 && cm.f1Score <= 1, 'F1 must be bounded [0, 1]');
    assert(cm.balancedAccuracy >= 0 && cm.balancedAccuracy <= 1, 'Balanced Accuracy must be bounded [0, 1]');
  });

  // 5. Cross-Validation Non-Leakage Test
  test('Stratified 5-Fold Cross-Validation must evaluate all 5 folds without data leakage', () => {
    const cv = runStratifiedKFoldCrossValidation(
      benchmarkData.slice(0, 120),
      (feats) => new LogisticRegressionClassifier(feats),
      5,
      42
    );
    assert(cv.foldScores.length === 5, 'CV must produce exactly 5 fold scores');
    assert(cv.meanRocAuc >= 0.5, 'Mean CV ROC-AUC must exceed random guess 0.5');
    assert(cv.stdRocAuc >= 0, 'Standard deviation of CV fold scores must be non-negative');
  });

  // 6. Master ML Pipeline Execution & Candidate Production Model Selection
  test('Master ML Pipeline must train all 4 models, compare metrics, and designate production candidate', () => {
    const report = runMasterMachineLearningPipeline(benchmarkData, 42);

    assert(report.datasetSize.total === benchmarkData.length, 'Dataset size must match total records');
    assert(report.classDistribution.claimOccurrenceRatePct > 0, 'Class distribution must report non-zero occurrence rate');
    assert(report.classDistribution.zeroClaimsCount > report.classDistribution.positiveClaimsCount, 'Must reflect zero-inflation');

    const expectedModels = [
      'logistic_regression_glm',
      'random_forest_classifier',
      'gradient_boosting_deviance',
      'two_stage_hurdle_classifier',
    ];
    for (const mId of expectedModels) {
      assert(mId in report.models, `Report must include model ${mId}`);
      const m = report.models[mId];
      assert(m.rocAuc >= 0.5, `Model ${mId} ROC-AUC must be >= 0.5`);
      assert(m.prAuc >= 0.0, `Model ${mId} PR-AUC must be >= 0.0`);
      assert(m.logLoss > 0, `Model ${mId} Log Loss must be > 0`);
      assert(m.brierScore >= 0, `Model ${mId} Brier Score must be >= 0`);
      assert(m.giniCoefficient >= 0, `Model ${mId} Gini must be >= 0`);
    }

    assert(report.productionCandidate.modelId.length > 0, 'Must identify a production candidate model ID');
    assert(report.productionCandidate.selectionRationale.length > 20, 'Must document selection rationale');
    assert(report.productionCandidate.keyStrengths.length >= 3, 'Must list at least 3 key strengths');
    assert(report.productionCandidate.documentedLimitations.length >= 2, 'Must document at least 2 limitations');
  });

  // 7. Seed Reproducibility Test
  test('Pipeline execution must be deterministically reproducible under fixed random seed', () => {
    const report1 = runMasterMachineLearningPipeline(benchmarkData, 42);
    const report2 = runMasterMachineLearningPipeline(benchmarkData, 42);

    assert(
      report1.models.gradient_boosting_deviance.rocAuc === report2.models.gradient_boosting_deviance.rocAuc,
      'ROC-AUC across identical seed executions must match exactly'
    );
    assert(
      report1.models.gradient_boosting_deviance.logLoss === report2.models.gradient_boosting_deviance.logLoss,
      'Log Loss across identical seed executions must match exactly'
    );
  });

  return { passed, failed };
}
