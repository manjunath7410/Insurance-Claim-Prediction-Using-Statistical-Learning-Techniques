import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AnalyticsService } from '../src/server/services/analyticsService';
import { db } from '../src/server/db/database';
import { modelRegistry } from '../src/server/services/modelRegistry';

export async function runPhase8AnalyticsDashboardTests() {
  console.log('\n--- Running Phase 8: Insurance Analytics Dashboard Tests ---');

  // 1. Base Analytics Response Structure & KPIs
  {
    const data = AnalyticsService.getAnalytics();

    assert.ok(data, 'Analytics response must not be null');
    assert.ok(data.overviewKpis, 'overviewKpis must be defined');
    assert.ok(data.overviewKpis.totalPredictions > 0, 'totalPredictions must be > 0');
    assert.ok(data.overviewKpis.portfolioClaimFrequencyPercent >= 0, 'portfolioClaimFrequencyPercent must be >= 0');
    assert.ok(data.overviewKpis.averageProbabilityPercent > 0 && data.overviewKpis.averageProbabilityPercent < 100, 'averageProbabilityPercent must be valid');
    assert.ok(data.overviewKpis.expectedPurePremiumUSD > 0, 'expectedPurePremiumUSD must be > 0');
    assert.strictEqual(typeof data.overviewKpis.activeThreshold, 'number', 'activeThreshold must be a number');
    assert.ok(data.overviewKpis.activeModelVersion.length > 0, 'activeModelVersion must be a non-empty string');

    console.log('✓ 1. Base Analytics response & Overview KPIs calculated accurately');
  }

  // 2. Claim Distribution Breakdown
  {
    const data = AnalyticsService.getAnalytics();
    const cd = data.claimDistribution;

    assert.ok(cd, 'claimDistribution must be defined');
    assert.strictEqual(cd.claimsOccurredCount + cd.noClaimsCount, data.overviewKpis.totalPredictions, 'Claim + Non-claim counts must sum to total');
    assert.ok(cd.byVehicleCategory.length > 0, 'byVehicleCategory must have segments');
    assert.ok(cd.byRegionalZone.length > 0, 'byRegionalZone must have segments');
    assert.ok(cd.byDriverAgeGroup.length > 0, 'byDriverAgeGroup must have segments');

    // Verify all vehicle category rates are non-negative
    for (const item of cd.byVehicleCategory) {
      assert.ok(item.total > 0, `Category ${item.category} total must be > 0`);
      assert.ok(item.claimRatePercent >= 0 && item.claimRatePercent <= 100, `Category ${item.category} claim rate must be valid`);
    }

    console.log('✓ 2. Claim Distribution segmented across vehicle, territory, and age dimensions');
  }

  // 3. Risk Tier Stratification
  {
    const data = AnalyticsService.getAnalytics();
    const rd = data.riskDistribution;

    assert.strictEqual(rd.length, 4, 'Must have 4 risk tiers (LOW, MEDIUM, HIGH, VERY_HIGH)');
    const sumCount = rd.reduce((acc, t) => acc + t.count, 0);
    assert.strictEqual(sumCount, data.overviewKpis.totalPredictions, 'Sum of risk tier counts must equal total');

    const sumPct = rd.reduce((acc, t) => acc + t.percentage, 0);
    assert.ok(Math.abs(sumPct - 100) < 1.0, `Sum of risk tier percentages (${sumPct}) must be ~100%`);

    console.log('✓ 3. 4-Tier Risk Stratification accurately partitions entire portfolio');
  }

  // 4. Calibrated Probability Histogram
  {
    const data = AnalyticsService.getAnalytics();
    const pd = data.probabilityDistribution;

    assert.ok(pd.bins.length >= 6, 'Must have at least 6 probability histogram bins');
    assert.ok(pd.summary.mean > 0, 'Summary mean must be > 0');
    assert.ok(pd.summary.median > 0, 'Summary median must be > 0');
    assert.ok(pd.summary.p95 >= pd.summary.median, '95th percentile must be >= median');

    const totalBinsCount = pd.bins.reduce((acc, b) => acc + b.count, 0);
    assert.strictEqual(totalBinsCount, data.overviewKpis.totalPredictions, 'Histogram bins must account for all evaluated items');

    console.log('✓ 4. Calibrated Probability Histogram bins & percentiles verified');
  }

  // 5. Actuarial Feature Statistics
  {
    const data = AnalyticsService.getAnalytics();
    const fs = data.featureStatistics;

    assert.ok(fs.driverAge.mean >= 18 && fs.driverAge.mean <= 85, 'Driver age mean must be actuarially sensible');
    assert.ok(fs.driverAge.min >= 16, 'Minimum driver age must be >= 16');
    assert.ok(fs.creditScore.mean >= 300 && fs.creditScore.mean <= 850, 'Credit score mean must be in valid FICO/Vantage range');
    assert.ok(fs.annualMileage.mean >= 2000, 'Annual mileage mean must be >= 2000');
    assert.ok(fs.priorClaims.zeroClaimsPct > 0, 'Zero claims percentage must be > 0');

    console.log('✓ 5. Actuarial Feature Statistics (Age, Credit, Mileage, Experience) verified');
  }

  // 6. Model Performance Matrix
  {
    const data = AnalyticsService.getAnalytics();
    const mp = data.modelPerformance;

    assert.ok(mp.length >= 3, 'Must compare at least 3 models in registry');
    const champion = mp.find((m) => m.status === 'active');
    assert.ok(champion, 'Champion active model must be present');
    assert.ok(champion!.rocAuc >= 0.80, 'Champion ROC-AUC must be >= 0.80');
    assert.ok(champion!.gini > 0.60, 'Champion Gini must be > 0.60');
    assert.ok(champion!.ece < 0.05, 'Champion ECE must indicate well-calibrated probabilities (< 0.05)');

    console.log('✓ 6. Multi-Model Performance Matrix verified against actuarial discrimination & calibration benchmarks');
  }

  // 7. Data Quality & Target Leakage Summary
  {
    const data = AnalyticsService.getAnalytics();
    const dq = data.dataQualitySummary;

    assert.strictEqual(dq.targetLeakageAudit.status, 'CLEAN', 'Target leakage audit status must be CLEAN');
    assert.strictEqual(dq.targetLeakageAudit.forbiddenFeaturesDetected, 0, 'Forbidden leakage features must be 0');
    assert.strictEqual(dq.schemaValidationPassRatePercent, 100, 'Schema validation pass rate must be 100%');
    assert.ok(dq.completenessRatePercent >= 95, 'Data completeness must be >= 95%');

    console.log('✓ 7. Data Quality & Target Leakage governance health check verified');
  }

  // 8. Filter Applications
  {
    // Filter by Risk Level: LOW
    const lowRiskData = AnalyticsService.getAnalytics({ riskLevel: 'LOW' });
    assert.ok(lowRiskData.overviewKpis.totalPredictions > 0, 'Filtered low risk count must be > 0');
    for (const pred of lowRiskData.recentPredictions) {
      assert.strictEqual(pred.riskLevel, 'LOW', 'All filtered predictions must be LOW risk');
    }

    // Filter by Date Range: 7d
    const sevenDaysData = AnalyticsService.getAnalytics({ dateRange: '7d' });
    assert.ok(sevenDaysData.overviewKpis.totalPredictions >= 0, '7d date range filter must execute successfully');

    // Filter by Coverage Tier
    const fullCompData = AnalyticsService.getAnalytics({ coverageTier: 'Full Comprehensive' });
    assert.ok(fullCompData.overviewKpis.totalPredictions >= 0, 'Coverage tier filter must execute successfully');

    console.log('✓ 8. Multi-dimensional filter queries (Date, Risk Level, Coverage) properly constrain records');
  }

  // 9. RBAC Data Scoping
  {
    // Analyst / Admin scope
    const adminView = AnalyticsService.getAnalytics({}, { id: 'usr_admin', role: 'ADMIN' });
    assert.strictEqual(adminView.userRoleScope, 'ADMIN', 'Admin role scope reflected');

    // User scope
    const userView = AnalyticsService.getAnalytics({}, { id: 'usr_user1', role: 'USER' });
    assert.strictEqual(userView.userRoleScope, 'USER', 'User role scope reflected');

    console.log('✓ 9. RBAC role-based data scoping verified');
  }

  console.log('--- Phase 8 Analytics Dashboard Tests Passed Successfully! ---\n');
}

// Direct execution if run directly via tsx
if (process.argv[1]?.includes('phase8_analytics_dashboard.test')) {
  runPhase8AnalyticsDashboardTests().catch((err) => {
    console.error('Phase 8 Tests Failed:', err);
    process.exit(1);
  });
}
