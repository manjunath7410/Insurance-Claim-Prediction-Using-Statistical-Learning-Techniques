export type VehicleCategory = 'Economy Sedan' | 'Compact SUV' | 'Luxury / Sports' | 'Commercial Van' | 'Heavy Truck / Electric';
export type RegionalRiskZone = 'Rural Low-Risk (Zone A)' | 'Suburban Moderate (Zone B)' | 'Urban Dense (Zone C)' | 'Metro High-Congestion (Zone D)';
export type CreditTier = 'Exceptional (800+)' | 'Very Good (740-799)' | 'Good (670-739)' | 'Fair (580-669)' | 'Poor (<580)';
export type CoverageTier = 'Basic Third-Party' | 'Standard Comprehensive' | 'Full Comprehensive + Zero-Dep' | 'Executive Platinum';

export interface PolicyholderInput {
  id?: string;
  age: number;
  drivingExperienceYears: number;
  creditScore: number;
  creditTier: CreditTier;
  annualMileage: number;
  vehicleCategory: VehicleCategory;
  vehicleAge: number;
  vehicleValue: number;
  regionalZone: RegionalRiskZone;
  coverageTier: CoverageTier;
  deductible: number;
  priorClaimsLast5Years: number;
  trafficViolationsCount: number;
  antiTheftDevice: boolean;
  policyTenureYears: number;
  driverGender: 'Male' | 'Female' | 'Other';
  maritalStatus: 'Single' | 'Married' | 'Divorced';
  annualExposure: number; // in years (e.g. 1.0)
}

export type ModelType = 'glm_logistic_gamma' | 'random_forest' | 'gradient_boosting_tweedie' | 'two_stage_hurdle';

export interface SHAPFeatureContribution {
  feature: string;
  displayName: string;
  value: string | number;
  impactPercent: number; // positive = increases risk, negative = lowers risk
  direction: 'increases_risk' | 'decreases_risk';
  description: string;
}

export interface ModelPrediction {
  modelId: ModelType;
  modelName: string;
  claimProbability: number; // 0 to 1
  claimProbabilityPercent: number; // 0 to 100
  confidenceInterval: [number, number]; // 95% CI
  expectedSeverityUSD: number; // Expected cost if claim occurs
  purePremiumUSD: number; // Expected Loss = P(Claim) * E(Severity)
  recommendedGrossPremiumUSD: number; // Pure Premium + Loading + Profit Margin
  riskTier: 'Low Risk' | 'Standard' | 'Elevated' | 'High Risk' | 'Critical Review';
  riskScore: number; // 0 to 100
  devianceScore: number;
  inferenceTimeMs: number;
  underwritingRecommendation: 'Accept Standard Rate' | 'Accept with Discount' | 'Accept with Surcharge' | 'Require Higher Deductible' | 'Escalate to Senior Actuary';
}

export interface PredictionResponse {
  timestamp: string;
  policyId: string;
  input: PolicyholderInput;
  primaryPrediction: ModelPrediction;
  allModels: Record<ModelType, ModelPrediction>;
  shapAttributions: SHAPFeatureContribution[];
  baseClaimRatePercent: number;
  actuarialNotes: string[];
}

export interface BenchmarkModelMetrics {
  modelId: ModelType;
  modelName: string;
  techniqueCategory: 'Generalized Linear Model' | 'Ensemble Bagging' | 'Gradient Boosting' | 'Two-Stage Actuarial';
  rocAuc: number;
  giniCoefficient: number;
  prAuc: number;
  brierScore: number;
  tweedieDeviance: number;
  rmseSeverity: number;
  logLoss: number;
  calibrationSlope: number;
  trainingTimeSec: number;
  inferenceLatencyMs: number;
  interpretabilityScore: number; // 1 to 10
  academicNotes: string;
}

export interface CurveDataPoint {
  x: number;
  y: number;
  baseline?: number;
  [key: string]: number | undefined;
}

export interface CalibrationBin {
  bin: string;
  meanPredicted: number;
  observedFrequency: number;
  sampleCount: number;
  binIndex?: number;
  binMin?: number;
  binMax?: number;
  meanPredictedProb?: number;
  empiricalTrueFrequency?: number;
  absoluteCalibrationError?: number;
}

export type IngestedPolicyRecord = ActuarialDatasetRecord;


export interface AuditLogItem {
  id: string;
  timestamp: string;
  policyId: string;
  driverAge: number;
  vehicleCategory: string;
  modelUsed: string;
  claimProbability: number;
  expectedSeverity: number;
  purePremium: number;
  grossPremium: number;
  riskTier: string;
  decision: string;
  underwriterName: string;
  status: 'Approved' | 'Flagged' | 'Modified' | 'Declined';
}

export interface ActuarialDatasetRecord {
  id: string;
  age: number;
  experience: number;
  creditScore: number;
  annualMileage: number;
  vehicleType: string;
  vehicleValue: number;
  zone: string;
  priorClaims: number;
  exposure: number;
  claimOccurred: 0 | 1;
  claimAmount: number;
  predictedProb?: number;
}

export interface ConfusionMatrixMetrics {
  threshold: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  totalSamples: number;
  accuracy: number;
  precision: number;
  recall: number;
  specificity: number;
  f1Score: number;
  balancedAccuracy: number;
}

export interface MLModelEvaluationResult {
  modelId: string;
  modelName: string;
  modelCategory: 'Linear/GLM' | 'Bagging Ensemble' | 'Gradient Boosting' | 'Two-Stage Hurdle';
  rocAuc: number;
  prAuc: number;
  precision: number;
  recall: number;
  f1Score: number;
  logLoss: number;
  brierScore: number;
  giniCoefficient: number;
  confusionMatrix: ConfusionMatrixMetrics;
  optimalThreshold: number;
  cvMeanRocAuc: number;
  cvStdRocAuc: number;
  cvFoldScores: number[];
  featureImportances: Record<string, number>;
  trainingTimeMs: number;
  inferenceLatencyMs: number;
  calibrationSlope: number;
}

export interface ModelComparisonReport {
  timestamp: string;
  datasetSize: {
    total: number;
    train: number;
    validation: number;
    test: number;
  };
  classDistribution: {
    zeroClaimsCount: number;
    positiveClaimsCount: number;
    claimOccurrenceRatePct: number;
    imbalanceRatio: string;
  };
  models: Record<string, MLModelEvaluationResult>;
  productionCandidate: {
    modelId: string;
    modelName: string;
    selectionRationale: string;
    keyStrengths: string[];
    documentedLimitations: string[];
  };
  reproducibilityConfig: {
    randomSeed: number;
    cvFolds: number;
    testRatio: number;
    validationRatio: number;
    featureCount: number;
  };
}

export interface ProbabilityDistributionStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  histogram: { binStart: number; binEnd: number; count: number; percentage: number }[];
}

export interface CalibrationEvaluationMetrics {
  brierScore: number;
  logLoss: number;
  expectedCalibrationError: number; // ECE
  maxCalibrationError: number; // MCE
  calibrationSlope: number; // Logistic calibration curve slope (ideal = 1.0)
  calibrationIntercept: number; // Logistic calibration curve intercept (ideal = 0.0)
  rocAuc: number;
  prAuc: number;
  giniCoefficient: number;
}

export interface ThresholdSweepPoint {
  threshold: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  specificity: number;
  f1Score: number;
  balancedAccuracy: number;
  expectedUnderwritingCostUSD: number; // Cost = FN * Cost_FN + FP * Cost_FP
}

export interface ThresholdOptimizationStrategy {
  selectionObjective: 'Maximize Validation F1' | 'Minimize Underwriting Expected Cost' | 'Youden J Index';
  costAssumptions: {
    falseNegativeCostUSD: number; // Cost of undetected claim
    falsePositiveCostUSD: number; // Cost of customer friction / quote abandonment
    costRatio: number;
  };
  validationOptimalThreshold: number;
  validationMetricsAtThreshold: {
    precision: number;
    recall: number;
    f1Score: number;
    expectedCostUSD: number;
  };
  defaultThresholdMetrics: {
    threshold: number;
    precision: number;
    recall: number;
    f1Score: number;
    expectedCostUSD: number;
  };
  thresholdSweep: ThresholdSweepPoint[];
}

export interface ApiPredictionFactor {
  feature: string;
  label: string;
  impact: 'INCREASES_RISK' | 'DECREASES_RISK' | 'NEUTRAL';
  value: string | number;
  contributionScore: number;
  explanation: string;
}

export interface ApiPredictionResponse {
  predictionId: string;
  probability: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  isClaimPredicted: boolean;
  thresholdApplied: number;
  modelName: string;
  modelVersion: string;
  timestamp: string;
  topContributingFactors: ApiPredictionFactor[];
  metadata?: {
    latencyMs?: number;
    calibrationMethod?: string;
    normalizedInput?: Record<string, any>;
  };
}

export type ModelLifecycleStatus = 'DEVELOPMENT' | 'CANDIDATE' | 'PRODUCTION' | 'RETIRED' | 'active' | 'candidate' | 'deprecated';
export type ModelStatus = ModelLifecycleStatus;

export interface ModelEvaluationMetrics {
  rocAuc: number;
  prAuc: number;
  precision: number;
  recall: number;
  f1Score: number;
  logLoss: number;
  brierScore: number;
  expectedCalibrationError: number;
  maxCalibrationError?: number;
  giniCoefficient?: number;
  accuracy?: number;
  specificity?: number;
}

export interface ModelCalibrationInfo {
  method: string;
  slope?: number;
  intercept?: number;
  expectedCalibrationError: number;
  maxCalibrationError?: number;
  calibrationBins?: Array<{
    bin: string;
    meanPredicted: number;
    observedFrequency: number;
    sampleCount: number;
  }>;
}

export interface RegistryModelRecord {
  modelId: string;
  modelName: string;
  modelVersion: string;
  algorithm: string;
  trainingDatasetVersion: string;
  trainingDate: string;
  features: string[];
  hyperparameters: Record<string, any>;
  evaluationMetrics: ModelEvaluationMetrics;
  calibrationInformation: ModelCalibrationInfo;
  decisionThreshold: number;
  status: 'DEVELOPMENT' | 'CANDIDATE' | 'PRODUCTION' | 'RETIRED';
  description: string;
  promotedAt?: string;
  promotedBy?: string;
  promotionRationale?: string;
  retiredAt?: string;
  retiredBy?: string;
  retirementRationale?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModelComparisonSideBySide {
  modelA: RegistryModelRecord;
  modelB: RegistryModelRecord;
  metricDeltas: {
    rocAucDelta: number;
    prAucDelta: number;
    precisionDelta: number;
    recallDelta: number;
    f1ScoreDelta: number;
    logLossDelta: number;
    brierScoreDelta: number;
    eceDelta: number;
  };
  recommendation: {
    championVersion: string;
    selectionRationale: string;
    statisticallySuperiorMetrics: string[];
  };
}

export interface VersionedModelInfo {
  modelId: string;
  modelName: string;
  version: string;
  status: 'active' | 'candidate' | 'deprecated' | 'DEVELOPMENT' | 'CANDIDATE' | 'PRODUCTION' | 'RETIRED';
  algorithm: string;
  calibrationMethod: string;
  decisionThreshold: number;
  trainingDate: string;
  trainingDatasetVersion?: string;
  features?: string[];
  hyperparameters?: Record<string, any>;
  evaluationMetrics?: ModelEvaluationMetrics;
  calibrationInformation?: ModelCalibrationInfo;
  metrics: {
    brierScore: number;
    logLoss: number;
    rocAuc: number;
    prAuc: number;
    expectedCalibrationError: number;
    f1Score: number;
    precision?: number;
    recall?: number;
  };
  description: string;
}

export interface Phase4CalibrationAndThresholdReport {
  timestamp: string;
  selectedModel: {
    modelId: string;
    modelName: string;
    category: string;
  };
  calibrationMethod: 'Platt Scaling (Sigmoid Logistic Calibration)' | 'Isotonic Regression (PAVA)';
  uncalibratedMetrics: CalibrationEvaluationMetrics;
  calibratedMetrics: CalibrationEvaluationMetrics;
  calibrationBinsUncalibrated: CalibrationBin[];
  calibrationBinsCalibrated: CalibrationBin[];
  probabilityDistributionUncalibrated: ProbabilityDistributionStats;
  probabilityDistributionCalibrated: ProbabilityDistributionStats;
  thresholdStrategy: ThresholdOptimizationStrategy;
  selectedThreshold: number;
  thresholdSelectionRationale: string;
  testSetEvaluation: {
    sampleCount: number;
    claimOccurredCount: number;
    claimRatePct: number;
    uncalibratedBrier: number;
    calibratedBrier: number;
    uncalibratedLogLoss: number;
    calibratedLogLoss: number;
    uncalibratedECE: number;
    calibratedECE: number;
    confusionMatrixAtSelectedThreshold: ConfusionMatrixMetrics;
    confusionMatrixAtDefault05Threshold: ConfusionMatrixMetrics;
  };
  documentedLimitations: string[];
}

// =========================================================================
// PHASE 8: ANALYTICS DASHBOARD TYPES & SCHEMAS
// =========================================================================

export interface AnalyticsFilterParams {
  dateRange?: '7d' | '30d' | '90d' | 'all';
  riskLevel?: 'all' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  coverageTier?: string;
  customerSegment?: string;
  regionalZone?: string;
  modelVersion?: string;
}

export interface AnalyticsOverviewKpis {
  totalPredictions: number;
  totalPolicies: number;
  totalClaims: number;
  portfolioClaimFrequencyPercent: number;
  averageProbabilityPercent: number;
  expectedPurePremiumUSD: number;
  portfolioLossRatioPercent: number;
  highRiskAlertCount: number;
  activeModelVersion: string;
  activeModelName: string;
  activeThreshold: number;
  calibrationScoreECE: number;
  totalExposureYears: number;
}

export interface ClaimDistributionData {
  claimsOccurredCount: number;
  noClaimsCount: number;
  claimFrequencyRatePercent: number;
  totalLossAmountUSD: number;
  meanClaimSeverityUSD: number;
  byVehicleCategory: Array<{
    category: string;
    total: number;
    claimCount: number;
    claimRatePercent: number;
    avgSeverityUSD: number;
  }>;
  byCoverageTier: Array<{
    tier: string;
    total: number;
    claimCount: number;
    claimRatePercent: number;
    avgPremiumUSD: number;
  }>;
  byRegionalZone: Array<{
    zone: string;
    total: number;
    claimCount: number;
    claimRatePercent: number;
    riskMultiplier: number;
  }>;
  byDriverAgeGroup: Array<{
    ageGroup: string;
    total: number;
    claimCount: number;
    claimRatePercent: number;
  }>;
}

export interface RiskDistributionItem {
  tier: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  label: string;
  count: number;
  percentage: number;
  avgProbabilityPercent: number;
  avgPurePremiumUSD: number;
  color: string;
}

export interface PredictionVolumeData {
  timeline: Array<{
    date: string;
    count: number;
    lowRisk: number;
    mediumRisk: number;
    highRisk: number;
    avgProbabilityPercent: number;
  }>;
  byModelVersion: Array<{
    modelVersion: string;
    modelName: string;
    count: number;
    percentage: number;
    avgProbabilityPercent: number;
  }>;
  hourlyDistribution: Array<{
    hour: string;
    count: number;
  }>;
}

export interface ProbabilityHistogramBin {
  bin: string;
  rangeLabel: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
  isAboveThreshold: boolean;
}

export interface ProbabilityDistributionData {
  bins: ProbabilityHistogramBin[];
  decisionThresholdPercent: number;
  benchmarkBaseRatePercent: number;
  summary: {
    mean: number;
    median: number;
    p90: number;
    p95: number;
    max: number;
    stdDev: number;
  };
}

export interface FeatureNumericStat {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  p25: number;
  p75: number;
}

export interface FeatureStatisticsData {
  driverAge: FeatureNumericStat & {
    youngDriversPct: number;
    seniorDriversPct: number;
  };
  creditScore: FeatureNumericStat & {
    tierBreakdown: {
      exceptionalPct: number;
      veryGoodPct: number;
      goodPct: number;
      fairPct: number;
      poorPct: number;
    };
  };
  vehicleValue: FeatureNumericStat;
  annualMileage: FeatureNumericStat & {
    highMileagePct: number;
  };
  priorClaims: {
    zeroClaimsPct: number;
    oneClaimPct: number;
    twoPlusClaimsPct: number;
    meanClaims: number;
  };
  drivingExperience: {
    min: number;
    max: number;
    mean: number;
    median: number;
  };
}

export interface ModelPerformanceMetricItem {
  modelId: string;
  modelVersion: string;
  modelName: string;
  status: ModelStatus | 'active' | 'candidate' | 'deprecated' | string;
  brierScore: number;
  logLoss: number;
  rocAuc: number;
  gini: number;
  prAuc: number;
  ece: number;
  ksStat: number;
  decisionThreshold: number;
  calibrationMethod: string;
  avgInferenceTimeMs: number;
}

export interface RecentPredictionItem {
  id: string;
  predictionId: string;
  timestamp: string;
  modelVersion: string;
  driverAge: number;
  vehicleCategory: string;
  zone: string;
  creditScore: number;
  probability: number;
  probabilityPercent: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  isClaimPredicted: boolean;
  userRole?: string;
  topFactor?: string;
}

export interface DataQualitySummaryData {
  totalRecords: number;
  completenessRatePercent: number;
  missingValuesImputed: number;
  targetLeakageAudit: {
    status: 'CLEAN' | 'WARNING' | 'FAILED';
    forbiddenFeaturesDetected: number;
  };
  zeroInflationRatePercent: number;
  schemaValidationPassRatePercent: number;
  outOfDistributionAnomalyRatePercent: number;
  provenance: string;
  lastPipelineExecution: string;
}

export interface AnalyticsDashboardResponse {
  overviewKpis: AnalyticsOverviewKpis;
  claimDistribution: ClaimDistributionData;
  riskDistribution: RiskDistributionItem[];
  predictionVolume: PredictionVolumeData;
  probabilityDistribution: ProbabilityDistributionData;
  featureStatistics: FeatureStatisticsData;
  modelPerformance: ModelPerformanceMetricItem[];
  recentPredictions: RecentPredictionItem[];
  dataQualitySummary: DataQualitySummaryData;
  activeFilters: AnalyticsFilterParams;
  calculatedAt: string;
  isDemoData: boolean;
  dataProvenanceNote: string;
  userRoleScope: string;
}




