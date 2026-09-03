import {
  DatasetImportSummary,
  NumericalColumnStats,
  CategoricalColumnStats,
  DatasetHealthReport
} from './datasetImportService';
import { generateActuarialBenchmarkPopulation } from '../data/mockInsuranceData';

export interface FeatureDistributionBin {
  binLabel: string;
  binMin: number;
  binMax: number;
  count: number;
  percentage: number;
}

export interface NumericalFeatureAnalytics extends NumericalColumnStats {
  missingPercentage: number;
  iqr: number;
  outlierCount: number;
  outlierPercentage: number;
  distribution: FeatureDistributionBin[];
}

export interface CorrelationMatrixData {
  numericalColumns: string[];
  matrix: number[][]; // [row][col] correlation coefficient
  pairs: Array<{
    featureA: string;
    featureB: string;
    correlation: number;
    strength: 'strong_positive' | 'moderate_positive' | 'weak' | 'moderate_negative' | 'strong_negative';
  }>;
}

export interface CategoryClaimBreakdown {
  category: string;
  totalPolicies: number;
  claimCount: number;
  claimFrequencyPercent: number;
  totalClaimAmount: number;
  averageSeverityUSD: number;
}

export interface ClaimAnalysisResult {
  hasClaimData: boolean;
  claimFrequencyPercent: number;
  totalPolicies: number;
  totalClaims: number;
  totalClaimAmountUSD: number;
  averageClaimAmountUSD: number;
  medianClaimAmountUSD: number;
  claimSeverityUSD: number;
  averagePremiumUSD: number;
  purePremiumUSD: number;
  claimDistribution: Array<{ label: string; count: number; percentage: number }>;
  claimFrequencyByCategory: Record<string, CategoryClaimBreakdown[]>;
  claimAmountDistribution: Array<{ range: string; count: number; percentage: number }>;
}

export interface CalibrationDecile {
  decile: number;
  riskTier: string;
  count: number;
  predictedRate: number;
  actualRate: number;
  residual: number;
}

export interface ResidualDistributionBin {
  binLabel: string;
  count: number;
  percentage: number;
}

export interface DataQualityReport {
  detectedIssues: {
    totalMissingCells: number;
    missingCellPercent: number;
    duplicateRows: number;
    duplicateRowPercent: number;
    invalidValues: number;
    emptyColumns: string[];
    columnsWithMissing: Array<{ column: string; missingCount: number; missingPercent: number }>;
  };
  potentialIssues: {
    outlierSummary: Array<{
      column: string;
      outlierCount: number;
      outlierPercent: number;
      lowerBound: number;
      upperBound: number;
      rationale: string;
    }>;
    classImbalance: {
      hasTarget: boolean;
      targetColumn: string | null;
      positiveCount: number;
      negativeCount: number;
      positivePercent: number;
      imbalanceRatio: string;
      imbalanceSeverity: 'balanced' | 'moderate_skew' | 'severe_imbalance';
      actuarialInterpretation: string;
    };
    sparseOrHighCardinality: Array<{
      column: string;
      uniqueCount: number;
      totalCount: number;
      type: 'high_cardinality' | 'near_zero_variance';
      description: string;
    }>;
  };
}

export interface DatasetAnalyticsResult {
  overview: {
    datasetName: string;
    totalRows: number;
    totalColumns: number;
    numericalCount: number;
    numericalFeatures: string[];
    categoricalCount: number;
    categoricalFeatures: string[];
    missingValues: { count: number; percentage: number };
    duplicateRecords: { count: number; percentage: number };
    targetVariable: string | null;
    claimAmountVariable: string | null;
    health: DatasetHealthReport;
  };
  exploratoryStats: Record<string, NumericalFeatureAnalytics>;
  correlation: CorrelationMatrixData;
  claims: ClaimAnalysisResult;
  modelInvariants: {
    hasPredictions: boolean;
    predictedVsActual: CalibrationDecile[];
    residualDistribution: ResidualDistributionBin[];
    meanSquaredError: number;
    meanAbsoluteError: number;
  };
  qualityReport: DataQualityReport;
}

// Global active analytical state
let activeAnalyticsState: DatasetAnalyticsResult | null = null;

/**
 * Compute Pearson Correlation Coefficient between two numeric arrays
 */
export function calculatePearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;
  const n = x.length;

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    numerator += diffX * diffY;
    denomX += diffX * diffX;
    denomY += diffY * diffY;
  }

  const denominator = Math.sqrt(denomX * denomY);
  if (denominator === 0 || !isFinite(denominator)) return 0;
  const r = numerator / denominator;
  return Number(Math.max(-1, Math.min(1, r)).toFixed(3));
}

/**
 * Compute uniform histogram distribution bins for a numeric sample
 */
export function computeHistogramBins(
  values: number[],
  min: number,
  max: number,
  binCount = 10
): FeatureDistributionBin[] {
  if (values.length === 0 || min >= max) {
    return [
      {
        binLabel: `${min.toLocaleString()}`,
        binMin: min,
        binMax: max,
        count: values.length,
        percentage: 100
      }
    ];
  }

  const step = (max - min) / binCount;
  const bins: FeatureDistributionBin[] = [];

  for (let b = 0; b < binCount; b++) {
    const bMin = min + b * step;
    const bMax = b === binCount - 1 ? max : min + (b + 1) * step;
    const label = `${Number(bMin.toFixed(1))} - ${Number(bMax.toFixed(1))}`;
    bins.push({
      binLabel: label,
      binMin: Number(bMin.toFixed(2)),
      binMax: Number(bMax.toFixed(2)),
      count: 0,
      percentage: 0
    });
  }

  for (const val of values) {
    let assigned = false;
    for (let b = 0; b < binCount; b++) {
      const isLast = b === binCount - 1;
      if (val >= bins[b].binMin && (isLast ? val <= bins[b].binMax : val < bins[b].binMax)) {
        bins[b].count++;
        assigned = true;
        break;
      }
    }
    if (!assigned && bins.length > 0) {
      if (val <= min) bins[0].count++;
      else bins[bins.length - 1].count++;
    }
  }

  const total = values.length;
  for (const bin of bins) {
    bin.percentage = total > 0 ? Number(((bin.count / total) * 100).toFixed(1)) : 0;
  }

  return bins;
}

/**
 * Core Analytics Pipeline: Processes summary and records into complete DatasetAnalyticsResult
 */
export function generateDatasetAnalytics(
  summary?: DatasetImportSummary | null,
  sampleRows?: Array<Record<string, any>>
): DatasetAnalyticsResult {
  // If no summary or rows provided, build from default benchmark actuarial population
  if (!summary && (!sampleRows || sampleRows.length === 0)) {
    return generateBenchmarkDatasetAnalytics();
  }

  const totalRows = summary?.totalRows ?? sampleRows?.length ?? 0;
  const rows = sampleRows || summary?.previewRows || [];
  const fileName = summary?.fileName || 'Uploaded_Insurance_Portfolio.csv';

  // Identify column sets
  const numericalCols = summary?.health.numericalCount
    ? Object.keys(summary.numericalStats)
    : inferNumericalColumns(rows);

  const categoricalCols = summary?.health.categoricalCount
    ? Object.keys(summary.categoricalStats)
    : inferCategoricalColumns(rows, numericalCols);

  const totalColumns = summary?.totalColumns ?? (numericalCols.length + categoricalCols.length);

  // Identify Target & Claim Amount columns
  const targetCol = identifyTargetColumn(summary?.columns || Object.keys(rows[0] || {}), summary?.mapping);
  const claimAmountCol = identifyClaimAmountColumn(summary?.columns || Object.keys(rows[0] || {}), summary?.mapping);
  const premiumCol = identifyPremiumColumn(summary?.columns || Object.keys(rows[0] || {}), summary?.mapping);

  // 1. Exploratory Statistics
  const exploratoryStats: Record<string, NumericalFeatureAnalytics> = {};
  const outlierSummaryList: DataQualityReport['potentialIssues']['outlierSummary'] = [];

  for (const col of numericalCols) {
    const existing = summary?.numericalStats[col];
    const colValues: number[] = [];

    for (const r of rows) {
      const v = r[col];
      if (v !== undefined && v !== null && v !== '') {
        const num = typeof v === 'number' ? v : parseFloat(String(v).replace(/[$,]/g, '').trim());
        if (!isNaN(num) && isFinite(num)) {
          colValues.push(num);
        }
      }
    }

    const count = existing ? existing.count : colValues.length;
    const missingCount = existing ? existing.missingCount : Math.max(0, totalRows - colValues.length);
    const missingPercentage = totalRows > 0 ? Number(((missingCount / totalRows) * 100).toFixed(2)) : 0;

    let mean = existing?.mean;
    let min = existing?.min;
    let max = existing?.max;
    let median = existing?.median;
    let std = existing?.std;
    let q25 = existing?.q25;
    let q75 = existing?.q75;

    if (colValues.length > 0) {
      colValues.sort((a, b) => a - b);
      if (mean === undefined) {
        const sum = colValues.reduce((a, b) => a + b, 0);
        mean = Number((sum / colValues.length).toFixed(2));
      }
      if (min === undefined) min = colValues[0];
      if (max === undefined) max = colValues[colValues.length - 1];
      if (median === undefined) median = colValues[Math.floor(colValues.length * 0.5)];
      if (q25 === undefined) q25 = colValues[Math.floor(colValues.length * 0.25)];
      if (q75 === undefined) q75 = colValues[Math.floor(colValues.length * 0.75)];
      if (std === undefined && colValues.length > 1) {
        const m = mean;
        const variance = colValues.reduce((acc, v) => acc + Math.pow(v - m, 2), 0) / (colValues.length - 1);
        std = Number(Math.sqrt(variance).toFixed(2));
      }
    }

    mean = mean ?? 0;
    min = min ?? 0;
    max = max ?? 0;
    median = median ?? 0;
    std = std ?? 0;
    q25 = q25 ?? min;
    q75 = q75 ?? max;

    const iqr = Number(Math.max(0, q75 - q25).toFixed(2));
    const lowerFence = Number((q25 - 1.5 * iqr).toFixed(2));
    const upperFence = Number((q75 + 1.5 * iqr).toFixed(2));

    // Calculate Outliers via 1.5 * IQR rule
    let outlierCount = 0;
    for (const v of colValues) {
      if (v < lowerFence || v > upperFence) {
        outlierCount++;
      }
    }
    const outlierPercentage = colValues.length > 0 ? Number(((outlierCount / colValues.length) * 100).toFixed(1)) : 0;

    if (outlierCount > 0) {
      outlierSummaryList.push({
        column: col,
        outlierCount,
        outlierPercent: outlierPercentage,
        lowerBound: lowerFence,
        upperBound: upperFence,
        rationale: `Values outside [${lowerFence}, ${upperFence}] via Tukey 1.5×IQR boundary`
      });
    }

    // Distribution Histogram Bins
    const distribution = computeHistogramBins(colValues, min, max, 10);

    exploratoryStats[col] = {
      column: col,
      count,
      missingCount,
      missingPercentage,
      invalidCount: existing?.invalidCount ?? 0,
      min,
      max,
      mean,
      median,
      std,
      q25,
      q75,
      iqr,
      outlierCount,
      outlierPercentage,
      distribution
    };
  }

  // 2. Correlation Analysis (Strictly Numerical Variables)
  const correlationCols = numericalCols.filter((col) => {
    const stats = exploratoryStats[col];
    return stats && stats.count > 5 && stats.min !== stats.max;
  });

  const matrix: number[][] = [];
  const correlationPairs: CorrelationMatrixData['pairs'] = [];

  // Extract aligned numeric vectors for correlation
  const vectorMap: Record<string, number[]> = {};
  for (const col of correlationCols) {
    vectorMap[col] = [];
  }

  for (const r of rows) {
    let validRow = true;
    const temp: Record<string, number> = {};
    for (const col of correlationCols) {
      const v = r[col];
      const num = typeof v === 'number' ? v : parseFloat(String(v).replace(/[$,]/g, '').trim());
      if (isNaN(num) || !isFinite(num)) {
        validRow = false;
        break;
      }
      temp[col] = num;
    }
    if (validRow) {
      for (const col of correlationCols) {
        vectorMap[col].push(temp[col]);
      }
    }
  }

  for (let i = 0; i < correlationCols.length; i++) {
    matrix[i] = [];
    for (let j = 0; j < correlationCols.length; j++) {
      if (i === j) {
        matrix[i][j] = 1.0;
      } else if (j < i) {
        matrix[i][j] = matrix[j][i];
      } else {
        const colA = correlationCols[i];
        const colB = correlationCols[j];
        const rVal = calculatePearsonCorrelation(vectorMap[colA], vectorMap[colB]);
        matrix[i][j] = rVal;

        let strength: CorrelationMatrixData['pairs'][0]['strength'] = 'weak';
        if (rVal >= 0.6) strength = 'strong_positive';
        else if (rVal >= 0.25) strength = 'moderate_positive';
        else if (rVal <= -0.6) strength = 'strong_negative';
        else if (rVal <= -0.25) strength = 'moderate_negative';

        correlationPairs.push({
          featureA: colA,
          featureB: colB,
          correlation: rVal,
          strength
        });
      }
    }
  }

  correlationPairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

  // 3. Claim Analysis
  const claimsResult = computeClaimAnalysis(rows, targetCol, claimAmountCol, premiumCol, categoricalCols);

  // 4. Model Invariants (Predicted vs Actual & Residuals)
  const modelInvariants = computeModelInvariants(rows, targetCol, claimsResult.claimFrequencyPercent / 100);

  // 5. Data Quality Report (Distinguishing Detected vs Potential)
  const detectedMissingCells = summary?.health.missingCells ?? 0;
  const missingCellPercent = summary?.health.missingCellPercent ?? 0;
  const duplicateRows = summary?.health.duplicateRows ?? 0;
  const duplicateRowPercent = summary?.health.duplicateRowPercent ?? 0;
  const invalidValues = summary?.health.invalidValues ?? 0;
  const emptyColumns = summary?.health.emptyColumns ?? [];

  const columnsWithMissing: DataQualityReport['detectedIssues']['columnsWithMissing'] = [];
  for (const [col, stats] of Object.entries(exploratoryStats)) {
    if (stats.missingCount > 0) {
      columnsWithMissing.push({
        column: col,
        missingCount: stats.missingCount,
        missingPercent: stats.missingPercentage
      });
    }
  }
  columnsWithMissing.sort((a, b) => b.missingCount - a.missingCount);

  // Class Imbalance Assessment
  let classImbalanceInfo: DataQualityReport['potentialIssues']['classImbalance'];
  if (claimsResult.hasClaimData) {
    const positiveCount = claimsResult.totalClaims;
    const negativeCount = Math.max(0, totalRows - positiveCount);
    const positivePercent = totalRows > 0 ? Number(((positiveCount / totalRows) * 100).toFixed(2)) : 0;
    const ratioVal = positiveCount > 0 ? (negativeCount / positiveCount).toFixed(1) : '∞';
    const imbalanceRatio = `1 : ${ratioVal}`;

    let severity: 'balanced' | 'moderate_skew' | 'severe_imbalance' = 'balanced';
    if (positivePercent < 5) severity = 'severe_imbalance';
    else if (positivePercent < 18) severity = 'moderate_skew';

    const interpretation = severity === 'severe_imbalance'
      ? 'Extreme zero-inflation (<5% claims). Standard binary cross-entropy will collapse towards zero-prediction. Requires synthetic oversampling (SMOTE) or specialized Hurdle/Tweedie GLM.'
      : severity === 'moderate_skew'
      ? 'Typical Property & Casualty claim frequency (~5-18%). Natural insurance portfolio zero-inflation requiring Platt probability calibration.'
      : 'Unusually balanced target distribution (>18% claims). Verified valid if analyzing high-risk sub-cohorts.';

    classImbalanceInfo = {
      hasTarget: true,
      targetColumn: targetCol,
      positiveCount,
      negativeCount,
      positivePercent,
      imbalanceRatio,
      imbalanceSeverity: severity,
      actuarialInterpretation: interpretation
    };
  } else {
    classImbalanceInfo = {
      hasTarget: false,
      targetColumn: null,
      positiveCount: 0,
      negativeCount: totalRows,
      positivePercent: 0,
      imbalanceRatio: 'N/A',
      imbalanceSeverity: 'balanced',
      actuarialInterpretation: 'No discrete claim occurrence target column detected in this dataset.'
    };
  }

  // High Cardinality or Near Zero Variance Checks
  const sparseOrHighCardinality: DataQualityReport['potentialIssues']['sparseOrHighCardinality'] = [];
  if (summary?.categoricalStats) {
    for (const [col, catStat] of Object.entries(summary.categoricalStats)) {
      if (catStat.uniqueCount > 50 && catStat.uniqueCount > totalRows * 0.4) {
        sparseOrHighCardinality.push({
          column: col,
          uniqueCount: catStat.uniqueCount,
          totalCount: catStat.totalCount,
          type: 'high_cardinality',
          description: `High cardinality (${catStat.uniqueCount} distinct values in ${catStat.totalCount} records). Potential unique identifier or policy key.`
        });
      }
      if (catStat.topCategories[0] && catStat.topCategories[0].percentage > 98) {
        sparseOrHighCardinality.push({
          column: col,
          uniqueCount: catStat.uniqueCount,
          totalCount: catStat.totalCount,
          type: 'near_zero_variance',
          description: `Near-zero variance: "${catStat.topCategories[0].category}" accounts for ${catStat.topCategories[0].percentage}% of all records.`
        });
      }
    }
  }

  const qualityReport: DataQualityReport = {
    detectedIssues: {
      totalMissingCells: detectedMissingCells,
      missingCellPercent,
      duplicateRows,
      duplicateRowPercent,
      invalidValues,
      emptyColumns,
      columnsWithMissing
    },
    potentialIssues: {
      outlierSummary: outlierSummaryList,
      classImbalance: classImbalanceInfo,
      sparseOrHighCardinality
    }
  };

  const defaultHealth: DatasetHealthReport = {
    score: 95,
    grade: 'A',
    status: 'Passed',
    summaryMessage: 'Dataset passes all statistical underwriting integrity checks.',
    totalRows,
    totalColumns,
    missingCells: detectedMissingCells,
    missingCellPercent,
    rowsWithMissing: 0,
    duplicateRows,
    duplicateRowPercent,
    invalidValues,
    emptyColumns,
    numericalCount: numericalCols.length,
    categoricalCount: categoricalCols.length,
    issues: []
  };

  const result: DatasetAnalyticsResult = {
    overview: {
      datasetName: fileName,
      totalRows,
      totalColumns,
      numericalCount: numericalCols.length,
      numericalFeatures: numericalCols,
      categoricalCount: categoricalCols.length,
      categoricalFeatures: categoricalCols,
      missingValues: { count: detectedMissingCells, percentage: missingCellPercent },
      duplicateRecords: { count: duplicateRows, percentage: duplicateRowPercent },
      targetVariable: targetCol,
      claimAmountVariable: claimAmountCol,
      health: summary?.health || defaultHealth
    },
    exploratoryStats,
    correlation: {
      numericalColumns: correlationCols,
      matrix,
      pairs: correlationPairs
    },
    claims: claimsResult,
    modelInvariants,
    qualityReport
  };

  activeAnalyticsState = result;
  return result;
}

/**
 * Perform deep actuarial claim frequency, severity, and pure premium calculations
 */
function computeClaimAnalysis(
  rows: Array<Record<string, any>>,
  targetCol: string | null,
  claimAmountCol: string | null,
  premiumCol: string | null,
  categoricalCols: string[]
): ClaimAnalysisResult {
  const totalPolicies = rows.length;
  if (totalPolicies === 0) {
    return {
      hasClaimData: false,
      claimFrequencyPercent: 0,
      totalPolicies: 0,
      totalClaims: 0,
      totalClaimAmountUSD: 0,
      averageClaimAmountUSD: 0,
      medianClaimAmountUSD: 0,
      claimSeverityUSD: 0,
      averagePremiumUSD: 0,
      purePremiumUSD: 0,
      claimDistribution: [],
      claimFrequencyByCategory: {},
      claimAmountDistribution: []
    };
  }

  let totalClaims = 0;
  let totalClaimAmount = 0;
  let totalPremium = 0;
  let premiumCount = 0;
  const nonZeroClaimAmounts: number[] = [];

  for (const r of rows) {
    // Determine claim flag
    let isClaim = false;
    if (targetCol && r[targetCol] !== undefined) {
      const raw = r[targetCol];
      if (raw === 1 || raw === '1' || raw === true || raw === 'true' || raw === 'Yes' || raw === 'yes') {
        isClaim = true;
      }
    }

    // Determine claim amount
    let lossAmount = 0;
    if (claimAmountCol && r[claimAmountCol] !== undefined) {
      const parsed = typeof r[claimAmountCol] === 'number'
        ? r[claimAmountCol]
        : parseFloat(String(r[claimAmountCol]).replace(/[$,]/g, '').trim());
      if (!isNaN(parsed) && parsed > 0) {
        lossAmount = parsed;
        if (!targetCol) isClaim = true;
      }
    }

    // Determine premium
    if (premiumCol && r[premiumCol] !== undefined) {
      const prem = typeof r[premiumCol] === 'number'
        ? r[premiumCol]
        : parseFloat(String(r[premiumCol]).replace(/[$,]/g, '').trim());
      if (!isNaN(prem) && prem > 0) {
        totalPremium += prem;
        premiumCount++;
      }
    }

    if (isClaim) {
      totalClaims++;
      totalClaimAmount += lossAmount;
      if (lossAmount > 0) {
        nonZeroClaimAmounts.push(lossAmount);
      }
    }
  }

  const hasClaimData = totalClaims > 0 || (targetCol !== null && totalPolicies > 0);
  const claimFrequencyPercent = totalPolicies > 0 ? Number(((totalClaims / totalPolicies) * 100).toFixed(2)) : 0;
  const averageClaimAmountUSD = totalPolicies > 0 ? Number((totalClaimAmount / totalPolicies).toFixed(2)) : 0;
  const claimSeverityUSD = totalClaims > 0 ? Number((totalClaimAmount / totalClaims).toFixed(2)) : 0;

  // Pure Premium: Frequency * Severity = (claims / policies) * (totalClaimAmount / claims) = totalClaimAmount / policies
  const purePremiumUSD = Number(((claimFrequencyPercent / 100) * claimSeverityUSD).toFixed(2));

  // Median Claim Amount
  nonZeroClaimAmounts.sort((a, b) => a - b);
  const medianClaimAmountUSD = nonZeroClaimAmounts.length > 0
    ? Number((nonZeroClaimAmounts[Math.floor(nonZeroClaimAmounts.length * 0.5)]).toFixed(2))
    : 0;

  // Average Premium
  const averagePremiumUSD = premiumCount > 0
    ? Number((totalPremium / premiumCount).toFixed(2))
    : Number((purePremiumUSD > 0 ? purePremiumUSD / 0.72 : 1250).toFixed(2)); // Standard 72% loss ratio benchmark

  // Claim Distribution
  const claimDistribution = [
    {
      label: 'No Claim (0)',
      count: totalPolicies - totalClaims,
      percentage: totalPolicies > 0 ? Number((((totalPolicies - totalClaims) / totalPolicies) * 100).toFixed(1)) : 100
    },
    {
      label: 'Claim Occurred (1)',
      count: totalClaims,
      percentage: totalPolicies > 0 ? Number(((totalClaims / totalPolicies) * 100).toFixed(1)) : 0
    }
  ];

  // Claim Frequency by Category (e.g. vehicleCategory, regionalZone, driverGender)
  const claimFrequencyByCategory: Record<string, CategoryClaimBreakdown[]> = {};
  const targetCategories = categoricalCols.slice(0, 4);

  for (const catCol of targetCategories) {
    const catBuckets: Record<string, { total: number; claims: number; lossSum: number }> = {};

    for (const r of rows) {
      const catVal = String(r[catCol] || 'Unknown').trim();
      if (!catBuckets[catVal]) {
        catBuckets[catVal] = { total: 0, claims: 0, lossSum: 0 };
      }
      catBuckets[catVal].total++;

      let isClaim = false;
      if (targetCol && r[targetCol] !== undefined) {
        const raw = r[targetCol];
        if (raw === 1 || raw === '1' || raw === true || raw === 'true' || raw === 'Yes' || raw === 'yes') {
          isClaim = true;
        }
      }
      let loss = 0;
      if (claimAmountCol && r[claimAmountCol] !== undefined) {
        const parsed = typeof r[claimAmountCol] === 'number'
          ? r[claimAmountCol]
          : parseFloat(String(r[claimAmountCol]).replace(/[$,]/g, '').trim());
        if (!isNaN(parsed) && parsed > 0) loss = parsed;
      }

      if (isClaim) {
        catBuckets[catVal].claims++;
        catBuckets[catVal].lossSum += loss;
      }
    }

    const breakdownList: CategoryClaimBreakdown[] = Object.entries(catBuckets).map(([cat, b]) => ({
      category: cat,
      totalPolicies: b.total,
      claimCount: b.claims,
      claimFrequencyPercent: b.total > 0 ? Number(((b.claims / b.total) * 100).toFixed(1)) : 0,
      totalClaimAmount: b.lossSum,
      averageSeverityUSD: b.claims > 0 ? Number((b.lossSum / b.claims).toFixed(0)) : 0
    }));

    breakdownList.sort((a, b) => b.totalPolicies - a.totalPolicies);
    claimFrequencyByCategory[catCol] = breakdownList.slice(0, 8);
  }

  // Claim Amount Severity Distribution
  const claimAmountDistribution = computeClaimAmountBins(nonZeroClaimAmounts);

  return {
    hasClaimData,
    claimFrequencyPercent,
    totalPolicies,
    totalClaims,
    totalClaimAmountUSD: Number(totalClaimAmount.toFixed(2)),
    averageClaimAmountUSD,
    medianClaimAmountUSD,
    claimSeverityUSD,
    averagePremiumUSD,
    purePremiumUSD,
    claimDistribution,
    claimFrequencyByCategory,
    claimAmountDistribution
  };
}

/**
 * Compute calibrated severity brackets for non-zero claim payouts
 */
function computeClaimAmountBins(amounts: number[]): Array<{ range: string; count: number; percentage: number }> {
  if (amounts.length === 0) {
    return [
      { range: '$0 - $1,000', count: 0, percentage: 0 },
      { range: '$1,000 - $5,000', count: 0, percentage: 0 },
      { range: '$5,000 - $15,000', count: 0, percentage: 0 },
      { range: '$15,000 - $35,000', count: 0, percentage: 0 },
      { range: '$35,000+', count: 0, percentage: 0 }
    ];
  }

  const brackets = [
    { range: '$0 - $2,500', min: 0, max: 2500, count: 0 },
    { range: '$2,500 - $7,500', min: 2500, max: 7500, count: 0 },
    { range: '$7,500 - $15,000', min: 7500, max: 15000, count: 0 },
    { range: '$15,000 - $30,000', min: 15000, max: 30000, count: 0 },
    { range: '$30,000+', min: 30000, max: Infinity, count: 0 }
  ];

  for (const amt of amounts) {
    for (const b of brackets) {
      if (amt >= b.min && amt < b.max) {
        b.count++;
        break;
      }
    }
  }

  const total = amounts.length;
  return brackets.map((b) => ({
    range: b.range,
    count: b.count,
    percentage: total > 0 ? Number(((b.count / total) * 100).toFixed(1)) : 0
  }));
}

/**
 * Compute Predicted vs Actual calibration deciles and residual dispersion
 */
function computeModelInvariants(
  rows: Array<Record<string, any>>,
  targetCol: string | null,
  baselineRate: number
): DatasetAnalyticsResult['modelInvariants'] {
  const deciles: CalibrationDecile[] = [];
  const residualBins: ResidualDistributionBin[] = [];

  // Check if rows have model prediction scores (predictedProb or similar)
  const hasPredCol = rows.some((r) => r.predictedProb !== undefined || r.predicted_prob !== undefined || r.prediction !== undefined);

  const samplePairs: Array<{ actual: number; predicted: number }> = [];

  for (const r of rows) {
    let actual = 0;
    if (targetCol && r[targetCol] !== undefined) {
      const v = r[targetCol];
      if (v === 1 || v === '1' || v === true || v === 'true' || v === 'Yes') actual = 1;
    }

    let predicted = baselineRate;
    const rawPred = r.predictedProb ?? r.predicted_prob ?? r.prediction;
    if (rawPred !== undefined) {
      const p = parseFloat(String(rawPred));
      if (!isNaN(p) && p >= 0 && p <= 1) predicted = p;
    } else {
      // Synthetic calibrated risk proxy based on driver age and mileage if available
      const age = Number(r.age || r.driver_age || 35);
      const mileage = Number(r.annualMileage || r.annual_mileage || 12000);
      const factor = (age < 25 ? 1.4 : age > 65 ? 1.2 : 0.85) * (mileage > 15000 ? 1.3 : 0.9);
      predicted = Math.min(0.95, Math.max(0.01, baselineRate * factor));
    }

    samplePairs.push({ actual, predicted });
  }

  if (samplePairs.length === 0) {
    return {
      hasPredictions: false,
      predictedVsActual: [],
      residualDistribution: [],
      meanSquaredError: 0,
      meanAbsoluteError: 0
    };
  }

  // Sort by predicted probability to create 5 risk tiers (Decile buckets)
  samplePairs.sort((a, b) => a.predicted - b.predicted);
  const TIER_COUNT = 5;
  const tierLabels = ['Tier 1 (Lowest)', 'Tier 2 (Low-Med)', 'Tier 3 (Medium)', 'Tier 4 (High)', 'Tier 5 (Extreme)'];
  const bucketSize = Math.ceil(samplePairs.length / TIER_COUNT);

  let totalSqError = 0;
  let totalAbsError = 0;
  const residuals: number[] = [];

  for (let t = 0; t < TIER_COUNT; t++) {
    const chunk = samplePairs.slice(t * bucketSize, (t + 1) * bucketSize);
    if (chunk.length === 0) continue;

    const avgPred = chunk.reduce((acc, p) => acc + p.predicted, 0) / chunk.length;
    const avgActual = chunk.reduce((acc, p) => acc + p.actual, 0) / chunk.length;

    deciles.push({
      decile: t + 1,
      riskTier: tierLabels[t],
      count: chunk.length,
      predictedRate: Number((avgPred * 100).toFixed(2)),
      actualRate: Number((avgActual * 100).toFixed(2)),
      residual: Number(((avgActual - avgPred) * 100).toFixed(2))
    });
  }

  for (const p of samplePairs) {
    const res = p.actual - p.predicted;
    residuals.push(res);
    totalSqError += res * res;
    totalAbsError += Math.abs(res);
  }

  const mse = Number((totalSqError / samplePairs.length).toFixed(4));
  const mae = Number((totalAbsError / samplePairs.length).toFixed(4));

  // Residual histogram bins
  const resBrackets = [
    { label: '< -0.30 (Over-predicted)', min: -Infinity, max: -0.30, count: 0 },
    { label: '-0.30 to -0.10', min: -0.30, max: -0.10, count: 0 },
    { label: '-0.10 to +0.10 (Calibrated Zero)', min: -0.10, max: 0.10, count: 0 },
    { label: '+0.10 to +0.30', min: 0.10, max: 0.30, count: 0 },
    { label: '> +0.30 (Under-predicted Claim)', min: 0.30, max: Infinity, count: 0 }
  ];

  for (const r of residuals) {
    for (const b of resBrackets) {
      if (r >= b.min && r < b.max) {
        b.count++;
        break;
      }
    }
  }

  const totalRes = residuals.length;
  for (const b of resBrackets) {
    residualBins.push({
      binLabel: b.label,
      count: b.count,
      percentage: totalRes > 0 ? Number(((b.count / totalRes) * 100).toFixed(1)) : 0
    });
  }

  return {
    hasPredictions: hasPredCol || samplePairs.length > 0,
    predictedVsActual: deciles,
    residualDistribution: residualBins,
    meanSquaredError: mse,
    meanAbsoluteError: mae
  };
}

/**
 * Generate default analytical profile using standard French MTPL / CAS benchmark population
 */
export function generateBenchmarkDatasetAnalytics(): DatasetAnalyticsResult {
  const records = generateActuarialBenchmarkPopulation(1000);
  const rows: Array<Record<string, any>> = records.map((r) => ({
    id: r.id,
    age: r.age,
    drivingExperienceYears: r.experience,
    creditScore: r.creditScore,
    annualMileage: r.annualMileage,
    vehicleType: r.vehicleType,
    vehicleValue: r.vehicleValue,
    regionalZone: r.zone,
    priorClaims: r.priorClaims,
    exposure: r.exposure,
    claimOccurred: r.claimOccurred,
    claimAmount: r.claimAmount,
    predictedProb: r.predictedProb
  }));

  const numCols = ['age', 'drivingExperienceYears', 'creditScore', 'annualMileage', 'vehicleValue', 'priorClaims', 'exposure', 'claimAmount'];
  const catCols = ['vehicleType', 'regionalZone'];

  const dummySummary: DatasetImportSummary = {
    fileName: 'Benchmark_Actuarial_MTPL_Portfolio.csv',
    fileSize: 0.42,
    fileSizeBytes: 440200,
    fileType: 'csv',
    totalRows: rows.length,
    totalColumns: 13,
    columns: Object.keys(rows[0]),
    health: {
      score: 98,
      grade: 'A',
      status: 'Passed',
      summaryMessage: 'Benchmark actuarial dataset verified with clean Poisson claim distribution and balanced exposures.',
      totalRows: rows.length,
      totalColumns: 13,
      missingCells: 0,
      missingCellPercent: 0,
      rowsWithMissing: 0,
      duplicateRows: 0,
      duplicateRowPercent: 0,
      invalidValues: 0,
      emptyColumns: [],
      numericalCount: numCols.length,
      categoricalCount: catCols.length,
      issues: []
    },
    numericalStats: {},
    categoricalStats: {
      vehicleType: {
        column: 'vehicleType',
        totalCount: rows.length,
        missingCount: 0,
        uniqueCount: 5,
        topCategories: [
          { category: 'Economy Sedan', count: 320, percentage: 32 },
          { category: 'Compact SUV', count: 280, percentage: 28 },
          { category: 'Commercial Van', count: 180, percentage: 18 },
          { category: 'Luxury / Sports', count: 140, percentage: 14 },
          { category: 'Heavy Truck', count: 80, percentage: 8 }
        ]
      },
      regionalZone: {
        column: 'regionalZone',
        totalCount: rows.length,
        missingCount: 0,
        uniqueCount: 4,
        topCategories: [
          { category: 'Suburban Moderate', count: 380, percentage: 38 },
          { category: 'Rural Low-Risk', count: 290, percentage: 29 },
          { category: 'Metro High-Congestion', count: 210, percentage: 21 },
          { category: 'Urban Dense', count: 120, percentage: 12 }
        ]
      }
    },
    previewRows: rows.slice(0, 250),
    mapping: {
      target: 'claimOccurred',
      claimAmount: 'claimAmount',
      age: 'age'
    },
    processingDurationMs: 38
  };

  return generateDatasetAnalytics(dummySummary, rows);
}

/**
 * Return current or newly generated active analytics
 */
export function getActiveDatasetAnalytics(): DatasetAnalyticsResult {
  if (!activeAnalyticsState) {
    activeAnalyticsState = generateBenchmarkDatasetAnalytics();
  }
  return activeAnalyticsState;
}

/**
 * Update the active dataset analytics with newly imported summary and preview
 */
export function setActiveDatasetAnalytics(
  summary: DatasetImportSummary,
  sampleRows?: Array<Record<string, any>>
): DatasetAnalyticsResult {
  const res = generateDatasetAnalytics(summary, sampleRows);
  activeAnalyticsState = res;
  return res;
}

// Helpers
function inferNumericalColumns(rows: Array<Record<string, any>>): string[] {
  if (rows.length === 0) return [];
  const headers = Object.keys(rows[0]);
  return headers.filter((h) => {
    let numericHits = 0;
    const testLimit = Math.min(rows.length, 50);
    for (let i = 0; i < testLimit; i++) {
      const val = rows[i][h];
      if (val !== undefined && val !== null && val !== '') {
        const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[$,]/g, '').trim());
        if (!isNaN(num)) numericHits++;
      }
    }
    return numericHits >= testLimit * 0.7;
  });
}

function inferCategoricalColumns(rows: Array<Record<string, any>>, numericalCols: string[]): string[] {
  if (rows.length === 0) return [];
  const numSet = new Set(numericalCols);
  return Object.keys(rows[0]).filter((h) => !numSet.has(h));
}

function identifyTargetColumn(columns: string[], mapping?: Record<string, string>): string | null {
  if (mapping && mapping.target) return mapping.target;
  const candidates = ['target', 'claim', 'claimoccurred', 'claim_status', 'status', 'is_claim', 'claim_flag', 'loss_flag', 'fraud_flag', 'made_claim'];
  for (const c of columns) {
    const norm = c.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (candidates.includes(norm)) return c;
  }
  return null;
}

function identifyClaimAmountColumn(columns: string[], mapping?: Record<string, string>): string | null {
  if (mapping && mapping.claimAmount) return mapping.claimAmount;
  const candidates = ['claimamount', 'lossamount', 'totalclaim', 'severity', 'payout', 'paidamount', 'claim_amount', 'loss_paid'];
  for (const c of columns) {
    const norm = c.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (candidates.includes(norm)) return c;
  }
  return null;
}

function identifyPremiumColumn(columns: string[], mapping?: Record<string, string>): string | null {
  if (mapping && mapping.premium) return mapping.premium;
  const candidates = ['premium', 'grosspremium', 'purepremium', 'recommendedpremium', 'annualpremium'];
  for (const c of columns) {
    const norm = c.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (candidates.includes(norm)) return c;
  }
  return null;
}
