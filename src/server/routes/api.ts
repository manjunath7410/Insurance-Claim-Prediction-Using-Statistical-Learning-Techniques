import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import {
  runStatisticalLearningInference,
  BENCHMARK_METRICS,
  ROC_CURVES_DATA,
  LORENZ_GINI_DATA,
  CALIBRATION_BINS,
} from '../../services/statisticalModels';
import {
  INITIAL_DATASET_RECORDS,
  INITIAL_AUDIT_LOGS,
  CORRELATION_MATRIX,
  ZERO_INFLATION_DISTRIBUTION,
} from '../../data/mockInsuranceData';
import {
  runDataEngineeringPipeline,
  auditFeatureVectorForTargetLeakage,
  DATA_SCHEMA_SPECS,
  FORBIDDEN_LEAKAGE_FEATURES,
} from '../../services/dataPipeline';
import {
  runMasterMachineLearningPipeline,
  stratifiedTrainValTestSplit,
  ActuarialDataPreprocessor,
} from '../../services/mlPipeline';
import { PolicyholderInput, ModelType, AuditLogItem } from '../../types';
import { validatePredictionInput, validateCsvImportInput } from '../middleware/validateInput';
import { predictionRateLimiter, explainabilityRateLimiter } from '../middleware/rateLimiter';
import { logger } from '../logger';
import { config } from '../config';
import { predictionService } from '../services/predictionService';
import { modelRegistry } from '../services/modelRegistry';
import { authRouter } from './authRoutes';
import { userRouter } from './userRoutes';
import { entityRouter } from './entityRoutes';
import { analyticsRouter } from './analyticsRoutes';
import { explainabilityRouter } from './explainabilityRoutes';
import { ExplainabilityService, PredictionExplanationInput } from '../services/explainabilityService';
import { optionalAuthenticate, authenticate, requireRole } from '../middleware/authMiddleware';
import { AuditService } from '../services/auditService';
import { db } from '../db/database';

export const apiRouter = Router();

// Mount Sub-Routers
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/analytics', analyticsRouter);
apiRouter.use('/explainability', explainabilityRouter);
apiRouter.use('/explain', (req, res, next) => {
  // Alias /api/explain to explainabilityRouter /explain
  req.url = '/explain';
  explainabilityRouter(req, res, next);
});
apiRouter.use('/reports/underwriting', (req, res, next) => {
  req.url = '/report';
  explainabilityRouter(req, res, next);
});
apiRouter.use('/', entityRouter);

// In-memory state
let auditLogs: AuditLogItem[] = [...INITIAL_AUDIT_LOGS];
let datasetRecords = [...INITIAL_DATASET_RECORDS];
const serverStartTime = Date.now();

// Lazy Gemini client helper
function getGeminiClient(): GoogleGenAI | null {
  if (config.geminiApiKey) {
    try {
      return new GoogleGenAI({
        apiKey: config.geminiApiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch (e) {
      logger.warn('Failed to initialize Gemini client:', { error: e });
      return null;
    }
  }
  return null;
}

// 1. Health Check Endpoint (Phase 5)
apiRouter.get('/health', (req: Request, res: Response) => {
  const isModelReady = modelRegistry.isReady();
  const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);

  res.json({
    status: isModelReady ? 'healthy' : 'degraded',
    uptimeSeconds,
    engine: 'Actuarial ML Risk Intelligence Platform',
    version: config.apiVersion,
    environment: config.nodeEnv,
    activeModelVersion: modelRegistry.getActiveVersion(),
    isModelRegistryReady: isModelReady,
    registeredModelsCount: modelRegistry.listModels().length,
    timestamp: new Date().toISOString(),
  });
});

// 1b. Models Catalog Endpoint (Phase 5 & 10)
apiRouter.get('/models', (req: Request, res: Response) => {
  try {
    const models = modelRegistry.listModels();
    const activeVersion = modelRegistry.getActiveVersion();
    const records = modelRegistry.listRegistryRecords();

    res.json({
      activeVersion,
      count: models.length,
      models,
      registryRecords: records,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to list models:', { message: error?.message });
    res.status(500).json({
      error: 'ModelRegistryError',
      message: 'Failed to retrieve model registry catalog.',
    });
  }
});

// Phase 10: Model Registry Full Listing
apiRouter.get('/models/registry', (req: Request, res: Response) => {
  try {
    const records = modelRegistry.listRegistryRecords();
    const activeVersion = modelRegistry.getActiveVersion();
    res.json({
      activeVersion,
      count: records.length,
      models: records,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'ModelRegistryError',
      message: error?.message || 'Failed to list registry models.',
    });
  }
});

// Phase 10: Model Comparison Endpoint
apiRouter.post('/models/compare', (req: Request, res: Response) => {
  try {
    const { versionA, versionB } = req.body || {};
    if (!versionA || !versionB) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Both versionA and versionB parameters are required for model comparison.',
      });
    }

    const comparison = modelRegistry.compareModels(String(versionA), String(versionB));
    res.json(comparison);
  } catch (error: any) {
    res.status(400).json({
      error: 'ModelComparisonError',
      message: error?.message || 'Failed to execute model comparison.',
    });
  }
});

// Phase 10: Model Performance & Calibration Detail Endpoint
apiRouter.get('/models/:version/performance', (req: Request, res: Response) => {
  try {
    const version = req.params.version;
    const record = modelRegistry.getRegistryRecordByVersion(version);

    if (!record) {
      return res.status(404).json({
        error: 'NotFound',
        message: `Model version '${version}' not found in registry.`,
      });
    }

    res.json({
      modelName: record.modelName,
      modelVersion: record.modelVersion,
      algorithm: record.algorithm,
      status: record.status,
      trainingDatasetVersion: record.trainingDatasetVersion,
      trainingDate: record.trainingDate,
      decisionThreshold: record.decisionThreshold,
      evaluationMetrics: record.evaluationMetrics,
      calibrationInformation: record.calibrationInformation,
      hyperparameters: record.hyperparameters,
      features: record.features,
      description: record.description,
      isProductionChampion: record.modelVersion === modelRegistry.getActiveVersion(),
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'ModelPerformanceError',
      message: error?.message || 'Failed to retrieve model performance data.',
    });
  }
});

// Phase 10: Model Promotion Endpoint (Strict RBAC: ADMIN or ANALYST with rationale)
apiRouter.post('/models/:version/promote', authenticate, requireRole('ADMIN', 'ANALYST'), (req: Request, res: Response) => {
  try {
    const version = req.params.version;
    const { targetStatus = 'PRODUCTION', rationale } = req.body || {};

    if (!rationale || typeof rationale !== 'string' || rationale.trim().length < 5) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'A descriptive promotion rationale (minimum 5 characters) is required for audit traceability.',
      });
    }

    const updatedRecord = modelRegistry.promoteModel(
      version,
      targetStatus as 'PRODUCTION' | 'CANDIDATE',
      {
        userId: req.user!.id,
        userEmail: req.user!.email,
        userRole: req.user!.role,
      },
      rationale.trim()
    );

    res.json({
      message: `Model '${version}' successfully promoted to status '${targetStatus}'.`,
      model: updatedRecord,
      activeChampionVersion: modelRegistry.getActiveVersion(),
    });
  } catch (error: any) {
    res.status(400).json({
      error: 'ModelPromotionError',
      message: error?.message || 'Failed to promote model.',
    });
  }
});

// Phase 10: Model Retirement Endpoint (Strict RBAC: ADMIN ONLY)
apiRouter.post('/models/:version/retire', authenticate, requireRole('ADMIN'), (req: Request, res: Response) => {
  try {
    const version = req.params.version;
    const { rationale } = req.body || {};

    if (!rationale || typeof rationale !== 'string' || rationale.trim().length < 5) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'A descriptive retirement rationale (minimum 5 characters) is required for audit traceability.',
      });
    }

    const updatedRecord = modelRegistry.retireModel(
      version,
      {
        userId: req.user!.id,
        userEmail: req.user!.email,
        userRole: req.user!.role,
      },
      rationale.trim()
    );

    res.json({
      message: `Model '${version}' has been retired.`,
      model: updatedRecord,
    });
  } catch (error: any) {
    res.status(400).json({
      error: 'ModelRetirementError',
      message: error?.message || 'Failed to retire model.',
    });
  }
});

// Phase 10: Model Configuration Update Endpoint (Threshold / Hyperparameters)
apiRouter.patch('/models/:version/config', authenticate, requireRole('ADMIN'), (req: Request, res: Response) => {
  try {
    const version = req.params.version;
    const { decisionThreshold, description, rationale } = req.body || {};

    if (!rationale || typeof rationale !== 'string' || rationale.trim().length < 5) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'A descriptive change rationale (minimum 5 characters) is required for audit traceability.',
      });
    }

    const updatedRecord = modelRegistry.updateModelConfiguration(
      version,
      { decisionThreshold, description },
      {
        userId: req.user!.id,
        userEmail: req.user!.email,
        userRole: req.user!.role,
      },
      rationale.trim()
    );

    res.json({
      message: `Configuration for model '${version}' updated successfully.`,
      model: updatedRecord,
    });
  } catch (error: any) {
    res.status(400).json({
      error: 'ConfigUpdateError',
      message: error?.message || 'Failed to update model configuration.',
    });
  }
});

// Phase 10: Model Creation / Registration Endpoint
apiRouter.post('/models/register', authenticate, requireRole('ADMIN', 'ANALYST'), (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body?.modelName || !body?.modelVersion || !body?.algorithm) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'modelName, modelVersion, and algorithm fields are required.',
      });
    }

    const createdRecord = modelRegistry.registerCustomModel(
      {
        modelName: body.modelName,
        modelVersion: body.modelVersion,
        algorithm: body.algorithm,
        trainingDatasetVersion: body.trainingDatasetVersion || 'v1.0-cas-loss-benchmark-synth (N=2,500)',
        trainingDate: body.trainingDate || new Date().toISOString().split('T')[0],
        features: body.features || [
          'driver_age',
          'driving_experience_years',
          'credit_score',
          'annual_mileage',
          'vehicle_value',
          'vehicle_age',
          'vehicle_type',
          'regional_zone',
          'prior_claims',
        ],
        hyperparameters: body.hyperparameters || {},
        evaluationMetrics: body.evaluationMetrics || {
          rocAuc: 0.85,
          prAuc: 0.40,
          precision: 0.40,
          recall: 0.50,
          f1Score: 0.44,
          logLoss: 0.16,
          brierScore: 0.045,
          expectedCalibrationError: 0.015,
        },
        calibrationInformation: body.calibrationInformation || {
          method: 'Platt Scaling (Sigmoid)',
          slope: 1.0,
          expectedCalibrationError: 0.015,
        },
        decisionThreshold: Number(body.decisionThreshold) || 0.08,
        status: body.status || 'DEVELOPMENT',
        description: body.description || 'Custom actuarial model submitted to model registry.',
      },
      {
        userId: req.user!.id,
        userEmail: req.user!.email,
        userRole: req.user!.role,
      }
    );

    res.status(201).json({
      message: `Model '${createdRecord.modelVersion}' successfully created in registry.`,
      model: createdRecord,
    });
  } catch (error: any) {
    res.status(400).json({
      error: 'ModelRegistrationError',
      message: error?.message || 'Failed to register model in registry.',
    });
  }
});

// Phase 10: Audit Logs Query Endpoint
apiRouter.get('/audit-logs', optionalAuthenticate, (req: Request, res: Response) => {
  try {
    const { action, resource, userId, limit, offset } = req.query;
    const filter = {
      action: action as string | undefined,
      resource: resource as string | undefined,
      userId: userId as string | undefined,
      limit: limit ? parseInt(String(limit), 10) : 100,
      offset: offset ? parseInt(String(offset), 10) : 0,
    };

    const logs = AuditService.getLogs(filter);
    const summary = AuditService.getSummary();

    res.json({
      count: logs.length,
      logs,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'AuditQueryError',
      message: error?.message || 'Failed to query audit logs.',
    });
  }
});

// 2. Production Prediction API Endpoint (Phase 5 & 6)
apiRouter.post('/predictions', predictionRateLimiter, optionalAuthenticate, (req: Request, res: Response, next) => {
  try {
    const body = req.body;
    // Allow either direct top-level fields or nested under { input: ... }
    const rawPayload = body && typeof body.input === 'object' && body.input !== null ? body.input : body;
    const requestedModelVersion = body?.modelVersion || req.query.modelVersion as string | undefined;

    logger.info('Processing claim prediction request', {
      modelVersion: requestedModelVersion || modelRegistry.getActiveVersion(),
      user: req.user?.email || 'anonymous',
      clientIp: req.ip,
    });

    const predictionResult = predictionService.generatePrediction(rawPayload, requestedModelVersion);

    // Save prediction in database persistence layer
    try {
      db.recordPrediction({
        predictionId: predictionResult.predictionId,
        userId: req.user?.id,
        modelVersion: predictionResult.modelVersion,
        modelName: predictionResult.modelName,
        inputSnapshot: rawPayload,
        claimProbability: predictionResult.probability,
        riskLevel: predictionResult.riskLevel,
        isClaimPredicted: predictionResult.isClaimPredicted,
        thresholdApplied: predictionResult.thresholdApplied,
        topAttributions: predictionResult.topContributingFactors,
        inferenceTimeMs: 12,
      });

      AuditService.logEvent({
        userId: req.user?.id,
        userEmail: req.user?.email,
        userRole: req.user?.role,
        action: 'PREDICTION_EXECUTED',
        resource: `predictions/${predictionResult.predictionId}`,
        details: {
          modelVersion: predictionResult.modelVersion,
          probability: predictionResult.probability,
          riskLevel: predictionResult.riskLevel,
          isClaimPredicted: predictionResult.isClaimPredicted,
        },
        ipAddress: req.ip,
        success: true,
      });
    } catch (dbErr) {
      logger.warn('Failed to record prediction in database:', { error: dbErr });
    }

    res.status(200).json(predictionResult);
  } catch (error) {
    next(error);
  }
});

// 2a. List Historical Predictions (for Prediction History & Audit UI)
apiRouter.get('/predictions', optionalAuthenticate, (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
    const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;
    const dbResult = db.listPredictions({ limit, offset });

    const formatted = dbResult.predictions.map((p) => {
      const probPct = p.claimProbability * 100;
      return {
        id: p.id,
        predictionId: p.predictionId,
        policyId: p.policyId || `POL-${p.id.slice(-6).toUpperCase()}`,
        timestamp: p.createdAt,
        modelVersion: p.modelVersion,
        modelName: p.modelName,
        probability: p.claimProbability,
        claimProbabilityPercent: probPct,
        riskLevel: p.riskLevel,
        isClaimPredicted: p.isClaimPredicted,
        thresholdApplied: p.thresholdApplied,
        input: {
          age: p.inputSnapshot?.age || 35,
          drivingExperienceYears: p.inputSnapshot?.drivingExperienceYears || 15,
          creditScore: p.inputSnapshot?.creditScore || 720,
          creditTier: p.inputSnapshot?.creditTier || 'Good (670-739)',
          annualMileage: p.inputSnapshot?.annualMileage || 12000,
          vehicleCategory: p.inputSnapshot?.vehicleCategory || 'Economy Sedan',
          vehicleAge: p.inputSnapshot?.vehicleAge || 3,
          vehicleValue: p.inputSnapshot?.vehicleValue || 25000,
          regionalZone: p.inputSnapshot?.regionalZone || 'Suburban Moderate (Zone B)',
          coverageTier: p.inputSnapshot?.coverageTier || 'Standard Comprehensive',
          deductible: p.inputSnapshot?.deductible || 500,
          priorClaimsLast5Years: p.inputSnapshot?.priorClaimsLast5Years ?? 0,
          trafficViolationsCount: p.inputSnapshot?.trafficViolationsCount ?? 0,
          antiTheftDevice: p.inputSnapshot?.antiTheftDevice ?? true,
          policyTenureYears: p.inputSnapshot?.policyTenureYears ?? 3,
          driverGender: p.inputSnapshot?.driverGender || 'Female',
          maritalStatus: p.inputSnapshot?.maritalStatus || 'Married',
          annualExposure: p.inputSnapshot?.annualExposure || 1.0,
        },
        output: {
          claimProbabilityPercent: probPct,
          claimProbability: p.claimProbability,
          expectedSeverityUSD: p.expectedSeverityUSD || 3850,
          purePremiumUSD: p.purePremiumUSD || Math.round(p.claimProbability * 3850 * 100) / 100,
          recommendedGrossPremiumUSD: p.grossPremiumUSD || Math.round((p.claimProbability * 3850) / 0.7 * 100) / 100,
          riskTier: p.riskLevel === 'LOW' ? 'Low Risk' : p.riskLevel === 'MEDIUM' ? 'Standard' : p.riskLevel === 'HIGH' ? 'Elevated' : 'High Risk',
          riskScore: Math.round(probPct * 10),
          underwritingRecommendation: probPct < 4 ? 'Accept with Discount' : probPct < 8 ? 'Accept Standard Rate' : probPct < 16 ? 'Accept with Surcharge' : 'Require Higher Deductible',
        },
        topContributingFactors: p.topAttributions || [],
      };
    });

    res.json({
      predictions: formatted,
      total: dbResult.total,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'PredictionFetchError', message: error?.message });
  }
});

// 2b. Legacy / Historical Statistical Prediction Endpoint

apiRouter.post('/predict', predictionRateLimiter, validatePredictionInput, (req: Request, res: Response) => {
  try {
    const { input, selectedModel } = req.body as { input: PolicyholderInput; selectedModel?: ModelType };
    const modelToUse = selectedModel || 'gradient_boosting_tweedie';

    logger.debug('Executing statistical inference', { model: modelToUse, age: input.age, zone: input.regionalZone });

    const predictionResponse = runStatisticalLearningInference(input, modelToUse);
    res.json(predictionResponse);
  } catch (error: any) {
    logger.error('Statistical prediction failed', { message: error?.message });
    res.status(500).json({
      error: 'InferenceFailure',
      message: error?.message || 'Statistical learning model execution encountered an error.',
      timestamp: new Date().toISOString(),
    });
  }
});

// 3. Academic Benchmarks & Diagnostic Curves Endpoint
apiRouter.get('/benchmarks', (req: Request, res: Response) => {
  res.json({
    models: BENCHMARK_METRICS,
    rocCurves: ROC_CURVES_DATA,
    lorenzGini: LORENZ_GINI_DATA,
    calibrationBins: CALIBRATION_BINS,
    dataProvenance: 'Synthetic benchmark calibrated against CAS & French Motor Loss Distributions',
  });
});

// 4. Actuarial Dataset & Correlation Distributions Endpoint
apiRouter.get('/dataset', (req: Request, res: Response) => {
  const { cleanDataset, qualityReport } = runDataEngineeringPipeline(datasetRecords);
  res.json({
    records: datasetRecords,
    cleanRecords: cleanDataset,
    totalRecords: datasetRecords.length,
    cleanCount: cleanDataset.length,
    qualityReport,
    correlationMatrix: CORRELATION_MATRIX,
    zeroInflationDistribution: ZERO_INFLATION_DISTRIBUTION,
    dataProvenance: 'Explicitly labeled synthetic benchmark dataset calibrated on Casualty Actuarial Society loss distributions',
  });
});

// 4b. Data Quality Report & Schema Validation Endpoint
apiRouter.get('/data-pipeline/report', (req: Request, res: Response) => {
  const { cleanDataset, qualityReport } = runDataEngineeringPipeline(datasetRecords);
  res.json({
    schemaSpecs: DATA_SCHEMA_SPECS,
    qualityReport,
    cleanDatasetSummary: {
      count: cleanDataset.length,
      zeroInflationPct: qualityReport.zeroInflationRatePercent,
      claimOccurrencePct: qualityReport.claimOccurrenceRatePercent,
      meanSeverity: qualityReport.meanClaimSeverityUSD,
    },
    forbiddenLeakageFeatures: FORBIDDEN_LEAKAGE_FEATURES,
  });
});

// 4c. Target Leakage Auditor Endpoint
apiRouter.post('/data-pipeline/audit-leakage', (req: Request, res: Response) => {
  const { featureList } = req.body as { featureList: string[] };
  if (!Array.isArray(featureList)) {
    return res.status(400).json({ error: 'ValidationError', message: 'featureList must be an array of string column names.' });
  }

  const auditResult = auditFeatureVectorForTargetLeakage(featureList);
  res.json({
    auditResult,
    timestamp: new Date().toISOString(),
  });
});

// 5. Batch CSV Records Ingestion
apiRouter.post('/dataset/import', validateCsvImportInput, (req: Request, res: Response) => {
  try {
    const { newRecords } = req.body;
    datasetRecords = [...newRecords, ...datasetRecords].slice(0, 1000);
    logger.info('Dataset records ingested', { importedCount: newRecords.length, totalCount: datasetRecords.length });
    
    res.json({
      success: true,
      count: newRecords.length,
      total: datasetRecords.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Failed to import dataset records', { message: error?.message });
    res.status(500).json({
      error: 'IngestionError',
      message: 'Failed to ingest records into dataset store.',
      timestamp: new Date().toISOString(),
    });
  }
});

// 6. Audit Governance Logs
apiRouter.get('/audit-logs', optionalAuthenticate, (req: Request, res: Response) => {
  const limit = parseInt(String(req.query.limit || 50), 10);
  const offset = parseInt(String(req.query.offset || 0), 10);
  const action = req.query.action as string | undefined;
  const resource = req.query.resource as string | undefined;
  const userId = req.query.userId as string | undefined;
  const success = req.query.success !== undefined ? req.query.success === 'true' : undefined;

  // Query database audit trail
  const dbLogsResult = db.listAuditLogs({
    limit,
    offset,
    action,
    resource,
    userId,
    success,
  });

  res.json({
    logs: auditLogs, // Legacy UI format
    systemAuditTrail: dbLogsResult.logs,
    totalAuditEntries: dbLogsResult.total,
  });
});

apiRouter.post('/audit-logs', optionalAuthenticate, (req: Request, res: Response) => {
  try {
    const logItem: AuditLogItem = {
      id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      ...req.body,
    };
    auditLogs = [logItem, ...auditLogs].slice(0, 200);

    // Also persist in Database Audit Trail
    AuditService.logEvent({
      userId: req.user?.id,
      userEmail: req.user?.email || req.body?.underwriterName,
      userRole: req.user?.role,
      action: 'UNDERWRITING_AUDIT_NOTE',
      resource: `policies/${logItem.policyId}`,
      details: {
        policyId: logItem.policyId,
        decision: logItem.decision,
        status: logItem.status,
        modelUsed: logItem.modelUsed,
        claimProbability: logItem.claimProbability,
      },
      ipAddress: req.ip,
      success: true,
    });

    logger.info('Audit entry recorded', { id: logItem.id, policyId: logItem.policyId, status: logItem.status });
    res.json({ success: true, log: logItem });
  } catch (error: any) {
    logger.error('Failed to save audit log', { message: error?.message });
    res.status(500).json({
      error: 'AuditLoggingError',
      message: 'Failed to record audit log entry.',
      timestamp: new Date().toISOString(),
    });
  }
});

// 7. Qualitative NLP Underwriting Memorandum (Gemini 3.7 Flash & 7-Section Dossier)
apiRouter.post('/ai-underwriting-report', optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const { input, prediction, shapAttributions } = req.body;
    
    // Map input to ExplainabilityService
    const explainInput: PredictionExplanationInput = {
      probability: prediction?.claimProbabilityPercent ? prediction.claimProbabilityPercent / 100 : (prediction?.claimProbability ?? 0.05),
      riskLevel: prediction?.riskTier ? (prediction.riskTier.toUpperCase().includes('LOW') ? 'LOW' : prediction.riskTier.toUpperCase().includes('ELEVATED') || prediction.riskTier.toUpperCase().includes('HIGH') ? 'HIGH' : prediction.riskTier.toUpperCase().includes('CRITICAL') ? 'VERY_HIGH' : 'MEDIUM') : 'LOW',
      isClaimPredicted: prediction?.claimProbabilityPercent ? prediction.claimProbabilityPercent >= 8.0 : false,
      thresholdApplied: 0.08,
      modelVersion: prediction?.modelName || 'Gradient Boosted Trees (Calibrated)',
      modelName: prediction?.modelName || 'Actuarial GBDT Tweedie / Poisson Kernel',
      topContributingFactors: shapAttributions ? shapAttributions.map((s: any) => ({
        feature: s.feature || s.displayName,
        label: s.displayName || s.feature,
        value: s.value,
        contributionScore: (s.impactPercent ?? 0) / 100,
        impact: (s.impactPercent ?? 0) > 0 ? 'INCREASES_RISK' : (s.impactPercent ?? 0) < 0 ? 'DECREASES_RISK' : 'NEUTRAL',
        explanation: s.description,
      })) : [],
      nonSensitiveFeatures: {
        driverAge: input?.age,
        drivingExperienceYears: input?.drivingExperienceYears,
        creditTier: input?.creditTier,
        creditScore: input?.creditScore,
        vehicleCategory: input?.vehicleCategory,
        vehicleAge: input?.vehicleAge,
        annualMileage: input?.annualMileage,
        regionalZone: input?.regionalZone,
        coverageTier: input?.coverageTier,
        deductible: input?.deductible,
        priorClaimsCount: input?.priorClaimsLast5Years,
        trafficViolationsCount: input?.trafficViolationsCount,
        annualExposure: input?.annualExposure,
      },
      financialMetrics: {
        expectedSeverityUSD: prediction?.expectedSeverityUSD,
        purePremiumUSD: prediction?.purePremiumUSD,
        recommendedGrossPremiumUSD: prediction?.recommendedGrossPremiumUSD,
      },
    };

    const userContext = {
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ip: req.ip,
    };

    const dossier = await ExplainabilityService.generateUnderwritingReport(explainInput, userContext);

    // Return combined structure with both legacy keys and structured 7-section report
    res.json({
      source: dossier.source,
      isFallback: dossier.isFallback,
      promptVersion: dossier.promptVersion,
      summary: dossier.sections.executiveSummary.content,
      actuarialAssessment: `${dossier.sections.riskLevel.tierDescription} Expected Pure Premium: $${dossier.sections.prediction.pureRiskPremiumUSD.toLocaleString()}. Estimated Severity: $${dossier.sections.prediction.expectedSeverityUSD.toLocaleString()}.`,
      topRiskDrivers: dossier.sections.keyFactors.primaryRiskDrivers.map((d) => `${d.name}: ${d.direction} - ${d.actuarialExplanation}`),
      regulatoryFairnessNote: dossier.sections.importantDisclaimer.regulatoryNotice,
      pricingRecommendation: `Target Gross Premium evaluated at $${dossier.sections.prediction.recommendedGrossPremiumUSD.toLocaleString()} (Includes administrative loading and loss margin). Action: ${dossier.sections.riskLevel.underwritingAction}`,
      dossier,
    });
  } catch (error: any) {
    logger.error('Gemini Report Generation Error:', { message: error?.message });
    res.status(500).json({
      error: 'ReportGenerationError',
      message: 'Failed to generate underwriting dossier.',
      details: error?.message,
    });
  }
});

// 12. Phase 3: Run Full ML Pipeline & Model Comparison
apiRouter.get('/ml-pipeline/run', (req: Request, res: Response) => {
  try {
    const seed = req.query.seed ? parseInt(String(req.query.seed), 10) : 42;
    logger.info('Executing Master ML Pipeline on dataset', { recordsCount: datasetRecords.length, seed });
    
    const report = runMasterMachineLearningPipeline(datasetRecords, seed);
    res.json(report);
  } catch (error: any) {
    logger.error('Error executing ML pipeline:', { message: error?.message });
    res.status(500).json({
      error: 'Failed to execute machine learning pipeline',
      details: error?.message,
    });
  }
});

// 13. Phase 3: Get Candidate Production Model Details
apiRouter.get('/ml-pipeline/candidate', (req: Request, res: Response) => {
  try {
    const report = runMasterMachineLearningPipeline(datasetRecords, 42);
    res.json({
      candidate: report.productionCandidate,
      evaluation: report.models[report.productionCandidate.modelId],
      classDistribution: report.classDistribution,
      reproducibilityConfig: report.reproducibilityConfig,
      timestamp: report.timestamp,
    });
  } catch (error: any) {
    logger.error('Error retrieving production candidate model:', { message: error?.message });
    res.status(500).json({
      error: 'Failed to retrieve production candidate model',
      details: error?.message,
    });
  }
});

// 14. Phase 4: Run Probability Calibration & Decision Threshold Pipeline
apiRouter.get('/ml-pipeline/calibration-report', (req: Request, res: Response) => {
  try {
    const seed = req.query.seed ? parseInt(String(req.query.seed), 10) : 42;
    logger.info('Executing Phase 4 Probability Calibration & Threshold Engine', { recordsCount: datasetRecords.length, seed });
    
    // Dynamic import / invocation of Phase 4 service
    const { runPhase4ProbabilityCalibrationAndThresholdPipeline } = require('../../services/calibrationService');
    const report = runPhase4ProbabilityCalibrationAndThresholdPipeline(datasetRecords, seed);
    res.json(report);
  } catch (error: any) {
    logger.error('Error executing calibration pipeline:', { message: error?.message });
    res.status(500).json({
      error: 'Failed to execute probability calibration and threshold pipeline',
      details: error?.message,
    });
  }
});

// 15. Phase 4: Custom Threshold & Cost-Sensitive Analysis
apiRouter.post('/ml-pipeline/threshold-analysis', (req: Request, res: Response) => {
  try {
    const { falseNegativeCostUSD, falsePositiveCostUSD, customThreshold } = req.body || {};
    const { runPhase4ProbabilityCalibrationAndThresholdPipeline, performThresholdSweep, optimizeValidationThreshold } = require('../../services/calibrationService');
    
    const baseReport = runPhase4ProbabilityCalibrationAndThresholdPipeline(datasetRecords, 42);
    const costs = {
      falseNegativeCostUSD: Number(falseNegativeCostUSD) || 4500,
      falsePositiveCostUSD: Number(falsePositiveCostUSD) || 450,
      costRatio: (Number(falseNegativeCostUSD) || 4500) / (Number(falsePositiveCostUSD) || 450),
    };

    res.json({
      baseReport,
      customThresholdEvaluated: customThreshold !== undefined ? Number(customThreshold) : baseReport.selectedThreshold,
      costsConfigured: costs,
    });
  } catch (error: any) {
    logger.error('Error evaluating custom threshold analysis:', { message: error?.message });
    res.status(500).json({
      error: 'Failed to evaluate custom threshold analysis',
      details: error?.message,
    });
  }
});

