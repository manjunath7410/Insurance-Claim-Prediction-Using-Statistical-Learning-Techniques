import { Router, Request, Response } from 'express';
import { ExplainabilityService, PROMPT_VERSION_EXPLAIN, PROMPT_VERSION_REPORT, PredictionExplanationInput } from '../services/explainabilityService';
import { optionalAuthenticate } from '../middleware/authMiddleware';
import { logger } from '../logger';
import { config } from '../config';

export const explainabilityRouter = Router();

/**
 * 1. Health check & configuration of Explainability AI layer
 */
explainabilityRouter.get('/health', (req: Request, res: Response) => {
  const isApiKeyConfigured = Boolean(config.geminiApiKey || process.env.GEMINI_API_KEY);
  res.json({
    status: 'healthy',
    explanatoryAiModel: 'gemini-3.7-flash',
    apiKeyConfigured: isApiKeyConfigured,
    fallbackEngine: 'Deterministic Actuarial Rule Kernel',
    promptVersions: {
      explanation: PROMPT_VERSION_EXPLAIN,
      report: PROMPT_VERSION_REPORT,
    },
    authoritativePredictiveEngine: 'Actuarial ML Model Registry (GBDT / Two-Stage Hurdle / GLM)',
    explanatoryLayerNotice: 'Gemini is an explanatory narrative layer and does NOT calculate claim probabilities.',
    timestamp: new Date().toISOString(),
  });
});

/**
 * 2. Get prompt templates & governance specs
 */
explainabilityRouter.get('/prompts', (req: Request, res: Response) => {
  res.json({
    activeVersion: PROMPT_VERSION_EXPLAIN,
    reportVersion: PROMPT_VERSION_REPORT,
    templates: {
      explanation: {
        version: PROMPT_VERSION_EXPLAIN,
        purpose: 'Converts pre-calculated ML claim probability and SHAP attributions into a concise natural language explanation.',
        constraints: [
          'Must not calculate or modify model probability',
          'Must not override model risk level',
          'Must not invent features or unlisted accidents',
          'Must not claim 100% deterministic certainty',
          'Must treat ML model as authoritative source of truth',
        ],
      },
      underwritingReport: {
        version: PROMPT_VERSION_REPORT,
        purpose: 'Generates comprehensive 7-section Actuarial Underwriting & Risk Dossier.',
        sections: [
          '1. Executive Summary',
          '2. Authoritative Model Prediction',
          '3. Calibrated Risk Stratification',
          '4. Key Contributing Factors (SHAP)',
          '5. Model Information & Provenance',
          '6. Actuarial Limitations',
          '7. Regulatory & Human-in-the-Loop Disclaimer',
        ],
      },
    },
    privacyRules: {
      piiStripped: true,
      allowedFeatures: ['driverAgeBand', 'drivingExperience', 'creditTier', 'vehicleCategory', 'annualMileage', 'regionalZone', 'deductible', 'priorClaimsCount', 'trafficViolationsCount'],
      excludedFields: ['name', 'email', 'phone', 'ssn', 'driverLicense', 'streetAddress', 'bankAccount'],
    },
  });
});

/**
 * 3. Generate Natural Language Prediction Explanation (POST /api/explainability/explain & POST /api/explain)
 */
explainabilityRouter.post('/explain', optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    
    // Extract input parameters, supporting both flat and nested structures
    const input: PredictionExplanationInput = {
      predictionId: body.predictionId,
      probability: typeof body.probability === 'number' ? body.probability : (body.claimProbability ?? 0.05),
      riskLevel: body.riskLevel || 'LOW',
      isClaimPredicted: body.isClaimPredicted,
      thresholdApplied: body.thresholdApplied ?? 0.08,
      modelVersion: body.modelVersion,
      modelName: body.modelName,
      topContributingFactors: body.topContributingFactors || body.shapAttributions || [],
      nonSensitiveFeatures: body.nonSensitiveFeatures || body.input || {},
      financialMetrics: body.financialMetrics,
    };

    if (input.probability < 0 || input.probability > 1) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Claim probability must be a valid number between 0.0 and 1.0.',
      });
    }

    const userContext = {
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ip: req.ip,
    };

    const explanationResult = await ExplainabilityService.generateExplanation(input, userContext);
    res.status(200).json(explanationResult);
  } catch (error: any) {
    logger.error('Failed to generate prediction explanation:', { error: error?.message });
    res.status(500).json({
      error: 'ExplainabilityError',
      message: 'Failed to generate explanation for prediction.',
      details: error?.message,
    });
  }
});

/**
 * 4. Generate Complete 7-Section Underwriting Dossier Report (POST /api/explainability/report & POST /api/reports/underwriting)
 */
explainabilityRouter.post('/report', optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    
    const input: PredictionExplanationInput = {
      predictionId: body.predictionId || body.policyId,
      probability: typeof body.probability === 'number' ? body.probability : (body.claimProbability ?? (body.prediction?.claimProbabilityPercent ? body.prediction.claimProbabilityPercent / 100 : 0.05)),
      riskLevel: body.riskLevel || (body.prediction?.riskTier ? (body.prediction.riskTier.toUpperCase().includes('LOW') ? 'LOW' : body.prediction.riskTier.toUpperCase().includes('ELEVATED') || body.prediction.riskTier.toUpperCase().includes('HIGH') ? 'HIGH' : body.prediction.riskTier.toUpperCase().includes('CRITICAL') ? 'VERY_HIGH' : 'MEDIUM') : 'LOW'),
      isClaimPredicted: body.isClaimPredicted,
      thresholdApplied: body.thresholdApplied ?? 0.08,
      modelVersion: body.modelVersion || body.prediction?.modelName,
      modelName: body.modelName || body.prediction?.modelName,
      topContributingFactors: body.topContributingFactors || (body.shapAttributions ? body.shapAttributions.map((s: any) => ({
        feature: s.feature || s.displayName,
        label: s.displayName || s.feature,
        value: s.value,
        contributionScore: (s.impactPercent ?? 0) / 100,
        impact: (s.impactPercent ?? 0) > 0 ? 'INCREASES_RISK' : (s.impactPercent ?? 0) < 0 ? 'DECREASES_RISK' : 'NEUTRAL',
        explanation: s.description,
      })) : []),
      nonSensitiveFeatures: body.nonSensitiveFeatures || body.input || {},
      financialMetrics: body.financialMetrics || (body.prediction ? {
        expectedSeverityUSD: body.prediction.expectedSeverityUSD,
        purePremiumUSD: body.prediction.purePremiumUSD,
        recommendedGrossPremiumUSD: body.prediction.recommendedGrossPremiumUSD,
      } : undefined),
    };

    const userContext = {
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ip: req.ip,
    };

    const dossierReport = await ExplainabilityService.generateUnderwritingReport(input, userContext);
    res.status(200).json(dossierReport);
  } catch (error: any) {
    logger.error('Failed to generate underwriting dossier report:', { error: error?.message });
    res.status(500).json({
      error: 'ReportGenerationError',
      message: 'Failed to generate underwriting dossier report.',
      details: error?.message,
    });
  }
});
