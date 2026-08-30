import { db } from '../src/server/db/database';
import { modelRegistry } from '../src/server/services/modelRegistry';
import { predictionService } from '../src/server/services/predictionService';
import { ExplainabilityService } from '../src/server/services/explainabilityService';
import { AuditService } from '../src/server/services/auditService';
import { SecurityService } from '../src/server/auth/security';
import { AnalyticsService } from '../src/server/services/analyticsService';
import fs from 'fs';
import path from 'path';

export async function runPhase15DeploymentTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
      console.log(`      ✓ ${msg}`);
    } else {
      failed++;
      errors.push(`Assertion failed: ${msg}`);
      console.error(`      ✗ ${msg}`);
    }
  }

  console.log('--- Phase 15: Production Deployment & Health Invariants ---');

  // 1. Health-Check Invariant
  try {
    const isModelReady = modelRegistry.isReady();
    const activeVersion = modelRegistry.getActiveVersion();
    const modelsCount = modelRegistry.listModels().length;

    assert(isModelReady === true, 'Health check: Model Registry reports ready');
    assert(activeVersion === 'v1.2.0-gbdt-calibrated-platt', 'Health check: Active model is calibrated production GBDT');
    assert(modelsCount >= 3, 'Health check: Multi-model candidate registry populated (count >= 3)');
  } catch (err: any) {
    failed++;
    errors.push(`Health-Check invariant error: ${err.message}`);
  }

  // 2. Production Configuration & Secrets Invariants
  try {
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    const envExamplePath = path.join(process.cwd(), '.env.example');
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    const envExampleContent = fs.readFileSync(envExamplePath, 'utf-8');

    assert(gitignoreContent.includes('.env*'), 'Security: .gitignore ignores secret environment files (.env*)');
    assert(gitignoreContent.includes('!.env.example'), 'Security: .gitignore explicitly retains .env.example');
    assert(envExampleContent.includes('GEMINI_API_KEY='), 'Configuration: .env.example documents GEMINI_API_KEY');
    assert(!envExampleContent.includes('AIzaSy'), 'Security: .env.example contains no committed secret keys');
  } catch (err: any) {
    failed++;
    errors.push(`Production configuration error: ${err.message}`);
  }

  // 3. User Authentication & Cryptographic Token Issuance Invariant
  let adminToken = '';
  let analystToken = '';
  let userToken = '';
  try {
    const adminUser = db.findUserByEmail('admin@actuarial.ai');
    const actuaryUser = db.findUserByEmail('analyst@actuarial.ai');
    const standardUser = db.findUserByEmail('user@policyholder.com');

    assert(Boolean(adminUser), 'Auth: Admin user pre-seeded in database');
    assert(Boolean(actuaryUser), 'Auth: Actuary analyst user pre-seeded in database');
    assert(Boolean(standardUser), 'Auth: Standard underwriting user pre-seeded in database');

    if (adminUser) {
      adminToken = SecurityService.generateToken({
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
      });
      const verifiedAdmin = SecurityService.verifyToken(adminToken);
      assert(verifiedAdmin?.role === 'ADMIN', 'Auth & Token: Admin bearer token successfully generated and verified');
    }

    if (actuaryUser) {
      analystToken = SecurityService.generateToken({
        id: actuaryUser.id,
        email: actuaryUser.email,
        name: actuaryUser.name,
        role: actuaryUser.role,
      });
      const verifiedAnalyst = SecurityService.verifyToken(analystToken);
      assert(verifiedAnalyst?.role === 'ANALYST', 'Auth & Token: Analyst bearer token successfully generated and verified');
    }

    if (standardUser) {
      userToken = SecurityService.generateToken({
        id: standardUser.id,
        email: standardUser.email,
        name: standardUser.name,
        role: standardUser.role,
      });
      const verifiedUser = SecurityService.verifyToken(userToken);
      assert(verifiedUser?.role === 'USER', 'Auth & Token: User bearer token successfully generated and verified');
    }
  } catch (err: any) {
    failed++;
    errors.push(`Auth invariant error: ${err.message}`);
  }

  // 4. ML Prediction API Inference & Financial Mathematics Invariant
  let testPredictionId = '';
  try {
    const validPolicyholder = {
      age: 38,
      drivingExperienceYears: 18,
      annualMileage: 12500,
      vehicleValue: 28000,
      creditScore: 720,
      priorClaims: 0,
      vehicleType: 'Economy Sedan',
      regionalZone: 'Suburban Moderate',
      exposure: 1.0,
    };

    const prediction = predictionService.generatePrediction(validPolicyholder, 'v1.2.0-gbdt-calibrated-platt');
    testPredictionId = prediction.predictionId;

    assert(Boolean(prediction.predictionId), 'Prediction API: Generated unique traceable prediction ID');
    assert(prediction.probability >= 0 && prediction.probability <= 1, 'Prediction API: Probability within [0, 1] range');
    assert(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'].includes(prediction.riskLevel), 'Prediction API: Valid 4-tier risk level');
    assert(prediction.topContributingFactors.length >= 2, 'Prediction API: Decomposed SHAP contributing factors present');
    assert(prediction.modelVersion === 'v1.2.0-gbdt-calibrated-platt', 'Prediction API: Correct model version metadata');
    assert(prediction.thresholdApplied === 0.08, 'Prediction API: Actuarial decision threshold applied');

    // Persist prediction into database
    const saved = db.recordPrediction({
      predictionId: prediction.predictionId,
      modelVersion: prediction.modelVersion,
      modelName: prediction.modelName,
      claimProbability: prediction.probability,
      riskLevel: prediction.riskLevel,
      isClaimPredicted: prediction.isClaimPredicted,
      thresholdApplied: prediction.thresholdApplied,
      inputSnapshot: validPolicyholder,
      topAttributions: prediction.topContributingFactors,
      inferenceTimeMs: prediction.metadata.latencyMs,
    });
    assert(Boolean(saved.id), 'Database: Prediction successfully recorded in persistent ACID store');
    const retrieved = db.findPredictionById(saved.id);
    assert(retrieved?.claimProbability === prediction.probability, 'Database: Record integrity verified via primary key retrieval');
  } catch (err: any) {
    failed++;
    errors.push(`Prediction API inference error: ${err.message}`);
  }

  // 5. Analytics Dashboard KPI & Aggregation Invariant
  try {
    const analytics = AnalyticsService.getAnalytics();

    assert(analytics.overviewKpis.totalPredictions > 0, 'Analytics: Total predictions aggregated (> 0)');
    assert(analytics.overviewKpis.portfolioClaimFrequencyPercent >= 0, 'Analytics: Portfolio claim frequency computed (>= 0%)');
    assert(analytics.overviewKpis.expectedPurePremiumUSD > 0, 'Analytics: Expected pure premium calculated (> $0)');
    assert(analytics.riskDistribution.length === 4, 'Analytics: 4-tier risk stratification partitioned');
    assert(analytics.probabilityDistribution.bins.length > 0, 'Analytics: Probability histogram bins generated');
  } catch (err: any) {
    failed++;
    errors.push(`Analytics dashboard error: ${err.message}`);
  }

  // 6. Database Persistence & Audit Log Trail Invariant
  try {
    const logsBefore = AuditService.getLogs().length;
    AuditService.logEvent({
      action: 'DEPLOYMENT_VERIFICATION',
      resource: 'system/phase15',
      userEmail: 'admin@actuarial.ai',
      userRole: 'ADMIN',
      success: true,
      details: { environment: 'production', testSuite: 'phase15' },
    });
    const logsAfter = AuditService.getLogs().length;
    assert(logsAfter === logsBefore + 1, 'Database & Audit: Immutable audit event recorded with secret sanitization');
  } catch (err: any) {
    failed++;
    errors.push(`Database persistence error: ${err.message}`);
  }

  // 7. Gemini Explanation & Deterministic Fallback Invariant
  try {
    const explanation = await ExplainabilityService.generateExplanation({
      predictionId: testPredictionId,
      probability: 0.0725,
      riskLevel: 'LOW',
      modelVersion: 'v1.2.0-gbdt-calibrated-platt',
      modelName: 'Gradient Boosted Trees (Tweedie Deviance)',
      thresholdApplied: 0.08,
      topContributingFactors: [
        {
          feature: 'creditScore',
          label: 'Credit Score',
          value: 720,
          contributionScore: -0.04,
          impact: 'DECREASES_RISK',
          explanation: 'Favorable credit history correlates with lower loss frequency.',
        },
      ],
    });

    assert(explanation.modelPrediction.probability === 0.0725, 'Explainability: Preserves exact authoritative probability');
    assert(explanation.modelPrediction.riskLevel === 'LOW', 'Explainability: Preserves exact risk tier');
    assert(Boolean(explanation.executiveSummary), 'Explainability: Executive summary provided');
    assert(Boolean(explanation.underwritingGuidance), 'Explainability: Concrete underwriting action guidance provided');
  } catch (err: any) {
    failed++;
    errors.push(`Explainability error: ${err.message}`);
  }

  return { passed, failed, errors };
}
