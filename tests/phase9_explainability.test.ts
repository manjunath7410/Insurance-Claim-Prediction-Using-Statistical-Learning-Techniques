import { ExplainabilityService, PROMPT_VERSION_EXPLAIN, PROMPT_VERSION_REPORT, PredictionExplanationInput } from '../src/server/services/explainabilityService';
import { AuditService } from '../src/server/services/auditService';

export async function runPhase9ExplainabilityTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, errorDetail?: string) {
    if (condition) {
      passed++;
      console.log(`      ✓ ${testName}`);
    } else {
      failed++;
      const msg = `FAIL: ${testName}${errorDetail ? ` - ${errorDetail}` : ''}`;
      errors.push(msg);
      console.error(`      ✗ ${msg}`);
    }
  }

  console.log('\n--- Phase 9: Explainability & Gemini AI Invariants & Fallbacks ---');

  // Test 1: Authoritative Model Prediction Invariance
  try {
    const input: PredictionExplanationInput = {
      predictionId: 'pred_test_101',
      probability: 0.1245,
      riskLevel: 'HIGH',
      isClaimPredicted: true,
      thresholdApplied: 0.08,
      modelVersion: 'v1.2.0-gbdt-calibrated-platt',
      modelName: 'Gradient Boosted Trees (Calibrated)',
      topContributingFactors: [
        { feature: 'priorClaimsLast5Years', label: 'Prior Claims (5-Yr)', value: 2, contributionScore: 0.065, impact: 'INCREASES_RISK', explanation: 'Prior claims history significantly elevates future loss propensity.' },
        { feature: 'annualMileage', label: 'Annual Mileage', value: 22000, contributionScore: 0.035, impact: 'INCREASES_RISK', explanation: 'High annual exposure increases accident frequency risk.' },
      ],
      nonSensitiveFeatures: {
        driverAge: 29,
        drivingExperienceYears: 8,
        creditTier: 'Good (670-739)',
        vehicleCategory: 'Sedan',
        regionalZone: 'Urban High Density',
        deductible: 500,
        priorClaimsCount: 2,
        trafficViolationsCount: 1,
        annualExposure: 1.0,
      },
      financialMetrics: {
        expectedSeverityUSD: 4600,
        purePremiumUSD: 572,
        recommendedGrossPremiumUSD: 1003,
      },
    };

    const explanation = await ExplainabilityService.generateExplanation(input);

    assert(
      explanation.modelPrediction.probability === 0.1245,
      'Test 1.1: Exact model probability (0.1245) preserved in explanation output without recalculation',
      `Got ${explanation.modelPrediction.probability}`
    );
    assert(
      explanation.modelPrediction.riskLevel === 'HIGH',
      'Test 1.2: Authoritative risk tier (HIGH) preserved without alteration'
    );
    assert(
      explanation.modelPrediction.thresholdApplied === 0.08,
      'Test 1.3: Authoritative threshold (0.08) preserved in modelPrediction block'
    );
    assert(
      explanation.promptVersion === PROMPT_VERSION_EXPLAIN,
      'Test 1.4: Prompt version tracked in explanation response'
    );
  } catch (err: any) {
    assert(false, 'Test 1: Model Prediction Invariance', err.message);
  }

  // Test 2: PII Stripping & Input Sanitization
  try {
    const rawInputWithPii: any = {
      predictionId: 'pred_pii_test',
      probability: 0.042,
      riskLevel: 'LOW',
      nonSensitiveFeatures: {
        driverAge: 45,
        drivingExperienceYears: 25,
        creditScore: 780,
        vehicleCategory: 'Station Wagon',
        vehicleAge: 4,
        annualMileage: 10000,
        regionalZone: 'Rural Zone A',
        deductible: 1000,
        priorClaimsCount: 0,
        trafficViolationsCount: 0,
        // Hypothetical PII fields that might be accidentally passed:
        fullName: 'Jane Doe',
        email: 'jane.doe@example.com',
        ssn: '000-12-3456',
        driverLicense: 'DL-9948201',
      },
    };

    const sanitized = ExplainabilityService.sanitizeInput(rawInputWithPii);

    assert(
      sanitized.fullName === undefined && sanitized.email === undefined && sanitized.ssn === undefined && sanitized.driverLicense === undefined,
      'Test 2.1: Sensitive PII (name, email, ssn, license) stripped from AI explanation payload'
    );
    assert(
      sanitized.driverAge === 45 && sanitized.vehicleCategory === 'Station Wagon',
      'Test 2.2: Relevant non-sensitive actuarial features preserved for contextual interpretation'
    );
  } catch (err: any) {
    assert(false, 'Test 2: PII Stripping & Input Sanitization', err.message);
  }

  // Test 3: Structured 7-Section Underwriting Dossier Report Generation
  try {
    const reportInput: PredictionExplanationInput = {
      predictionId: 'pred_rep_test',
      probability: 0.065,
      riskLevel: 'MEDIUM',
      isClaimPredicted: false,
      thresholdApplied: 0.08,
      modelVersion: 'v1.2.0-gbdt-calibrated-platt',
      modelName: 'Gradient Boosted Trees (Calibrated)',
      topContributingFactors: [
        { feature: 'creditScore', label: 'Credit Score Tier', value: 'Prime', contributionScore: -0.025, impact: 'DECREASES_RISK', explanation: 'Prime credit rating correlates with lower claim frequency.' },
        { feature: 'vehicleValue', label: 'Vehicle Value', value: 35000, contributionScore: 0.015, impact: 'INCREASES_RISK', explanation: 'Higher asset value increases potential collision severity.' },
      ],
      nonSensitiveFeatures: {
        driverAge: 38,
        drivingExperienceYears: 18,
        creditTier: 'Prime (740-799)',
        vehicleCategory: 'Midsize SUV',
        regionalZone: 'Suburban Zone B',
        deductible: 750,
        priorClaimsCount: 0,
        trafficViolationsCount: 0,
        annualExposure: 1.0,
      },
      financialMetrics: {
        expectedSeverityUSD: 4100,
        purePremiumUSD: 266,
        recommendedGrossPremiumUSD: 578,
      },
    };

    const dossier = await ExplainabilityService.generateUnderwritingReport(reportInput);

    assert(Boolean(dossier.reportId), 'Test 3.1: Generated unique report ID');
    assert(
      dossier.sections.executiveSummary !== undefined && Boolean(dossier.sections.executiveSummary.content),
      'Test 3.2: Section 1 (Executive Summary) populated'
    );
    assert(
      dossier.sections.prediction !== undefined && dossier.sections.prediction.claimProbability === 0.065,
      'Test 3.3: Section 2 (Authoritative Model Prediction) preserves exact probability 0.065'
    );
    assert(
      dossier.sections.riskLevel !== undefined && dossier.sections.riskLevel.riskLevel === 'MEDIUM',
      'Test 3.4: Section 3 (Calibrated Risk Stratification) matches risk tier MEDIUM'
    );
    assert(
      dossier.sections.keyFactors !== undefined && Array.isArray(dossier.sections.keyFactors.primaryRiskDrivers) && dossier.sections.keyFactors.primaryRiskDrivers.length >= 2,
      'Test 3.5: Section 4 (Key Contributing Risk Factors) contains SHAP decomposed drivers'
    );
    assert(
      dossier.sections.modelInformation !== undefined && Boolean(dossier.sections.modelInformation.modelVersion),
      'Test 3.6: Section 5 (Model Governance & Provenance) contains model metadata & validation status'
    );
    assert(
      dossier.sections.limitations !== undefined && Array.isArray(dossier.sections.limitations.items) && dossier.sections.limitations.items.length >= 2,
      'Test 3.7: Section 6 (Actuarial Limitations & Model Bounds) contains statistical limitation notices'
    );
    assert(
      dossier.sections.importantDisclaimer !== undefined && Boolean(dossier.sections.importantDisclaimer.humanInTheLoopRequirement),
      'Test 3.8: Section 7 (Regulatory & Human-in-the-Loop Disclaimer) requires licensed underwriter sign-off'
    );
  } catch (err: any) {
    assert(false, 'Test 3: 7-Section Dossier Report Generation', err.message);
  }

  // Test 4: Graceful Fallback Engine Behavior (When Gemini is offline / mock key)
  try {
    const fallbackInput: PredictionExplanationInput = {
      predictionId: 'pred_fallback_test',
      probability: 0.18,
      riskLevel: 'VERY_HIGH',
      isClaimPredicted: true,
      thresholdApplied: 0.08,
      modelVersion: 'v1.2.0-gbdt-calibrated-platt',
      modelName: 'Gradient Boosted Trees (Calibrated)',
      topContributingFactors: [
        { feature: 'priorClaimsLast5Years', label: 'Prior Claims (5-Yr)', value: 4, contributionScore: 0.12, impact: 'INCREASES_RISK', explanation: 'Multiple prior losses.' },
      ],
      nonSensitiveFeatures: {
        driverAge: 21,
        drivingExperienceYears: 2,
        vehicleCategory: 'Sports Coupe',
        regionalZone: 'Metro Downtown Zone C',
      },
    };

    const fallbackResult = ExplainabilityService.generateDeterministicExplanation(
      fallbackInput,
      'exp_fb_123',
      'pred_fb_123'
    );

    assert(fallbackResult.isFallback === true, 'Test 4.1: Deterministic explanation flagged as isFallback: true');
    assert(
      fallbackResult.source === 'rule-based-actuarial-engine',
      'Test 4.2: Deterministic explanation labeled source: rule-based-actuarial-engine'
    );
    assert(
      fallbackResult.modelPrediction.probability === 0.18,
      'Test 4.3: Deterministic fallback preserves exact 0.18 probability'
    );
    assert(
      Boolean(fallbackResult.underwritingGuidance),
      'Test 4.4: Fallback engine provides concrete underwriting guidance'
    );
  } catch (err: any) {
    assert(false, 'Test 4: Graceful Fallback Engine Behavior', err.message);
  }

  // Test 5: Hallucinated Certainty Guardrail Safety Check
  try {
    const rawAiOutput = {
      executiveSummary: 'This driver will definitely have a catastrophic accident and is 100% certainty going to file a claim.',
      naturalLanguageExplanation: 'The profile is guaranteed to result in massive losses next quarter.',
      factorBreakdown: [],
    };

    const sanitizedAi = (ExplainabilityService as any).validateAndSanitizeAiOutput(rawAiOutput, {
      probability: 0.15,
      riskLevel: 'HIGH',
    });

    assert(
      !sanitizedAi.executiveSummary.includes('will definitely') && !sanitizedAi.executiveSummary.includes('100% certainty'),
      'Test 5.1: Deterministic certainty buzzwords ("will definitely", "100% certainty") sanitized into statistical likelihood phrasing'
    );
    assert(
      !sanitizedAi.naturalLanguageExplanation.includes('guaranteed to'),
      'Test 5.2: "guaranteed to" replaced with actuarial estimation phrasing'
    );
  } catch (err: any) {
    assert(false, 'Test 5: Hallucinated Certainty Guardrail Safety Check', err.message);
  }

  // Test 6: Audit Logging for Explainability Usage
  try {
    // Trigger an explanation with user context
    await ExplainabilityService.generateExplanation(
      {
        predictionId: 'pred_audit_eval_1',
        probability: 0.05,
        riskLevel: 'LOW',
      },
      {
        userId: 'usr_underwriter_42',
        userEmail: 'underwriter@insurance.internal',
        userRole: 'UNDERWRITER',
        ip: '10.0.4.15',
      }
    );

    const auditResponse = AuditService.getAuditLogs({});
    const logs = auditResponse.logs;
    const explanationLog = logs.find((l) => l.action.includes('AI_EXPLANATION'));

    assert(
      explanationLog !== undefined,
      'Test 6.1: AI explainability usage logged to central audit trail'
    );
    assert(
      explanationLog?.details?.promptVersion === PROMPT_VERSION_EXPLAIN,
      'Test 6.2: Prompt version recorded in audit trail'
    );
    assert(
      explanationLog?.details?.ssn === undefined && explanationLog?.details?.fullName === undefined,
      'Test 6.3: Audit trail contains no sensitive policyholder PII'
    );
  } catch (err: any) {
    assert(false, 'Test 6: Audit Logging for Explainability Usage', err.message);
  }

  return { passed, failed, errors };
}
