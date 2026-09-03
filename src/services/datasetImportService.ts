import * as XLSX from 'xlsx';

export interface ColumnDefinition {
  id: string;
  label: string;
  category: 'target' | 'numerical' | 'categorical' | 'optional';
  aliases: string[];
  description?: string;
}

export interface ColumnDetectionResult {
  target: string | null;
  numerical: string[];
  categorical: string[];
  optional: string[];
  unmapped: string[];
  confidenceScore: number; // 0 to 100
  mapping: Record<string, string>; // fieldId -> csvColumnName
}

export interface NumericalColumnStats {
  column: string;
  count: number;
  missingCount: number;
  invalidCount: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  std: number;
  q25: number;
  q75: number;
}

export interface CategoricalColumnStats {
  column: string;
  totalCount: number;
  missingCount: number;
  uniqueCount: number;
  topCategories: Array<{ category: string; count: number; percentage: number }>;
}

export interface DatasetHealthReport {
  score: number; // 0 to 100
  grade: 'A' | 'B' | 'C' | 'D';
  status: 'Passed' | 'Warning' | 'Failed';
  summaryMessage: string;
  totalRows: number;
  totalColumns: number;
  missingCells: number;
  missingCellPercent: number;
  rowsWithMissing: number;
  duplicateRows: number;
  duplicateRowPercent: number;
  invalidValues: number;
  emptyColumns: string[];
  numericalCount: number;
  categoricalCount: number;
  issues: Array<{ severity: 'info' | 'warning' | 'error'; message: string }>;
}

export interface DatasetImportSummary {
  fileName: string;
  fileSize: number;
  fileSizeBytes: number;
  fileType: 'csv' | 'xlsx';
  totalRows: number;
  totalColumns: number;
  columns: string[];
  health: DatasetHealthReport;
  numericalStats: Record<string, NumericalColumnStats>;
  categoricalStats: Record<string, CategoricalColumnStats>;
  previewRows: Array<Record<string, any>>;
  mapping: Record<string, string>;
  processingDurationMs: number;
}

// Canonical Insurance Column Definitions with Extensive Flexible Aliases
export const INSURANCE_FIELDS: ColumnDefinition[] = [
  // Target
  {
    id: 'target',
    label: 'Claim Status / Target Flag',
    category: 'target',
    aliases: [
      'target', 'claim', 'status', 'is_claim', 'claim_status', 'claim_flag',
      'has_claim', 'claim_indicator', 'made_claim', 'fraud_flag', 'claim_ind',
      'clm_flag', 'loss_flag', 'claim_occurrence', 'is_fraud'
    ],
    description: 'Binary claim occurrence (0/1 or Yes/No) or primary target indicator'
  },
  {
    id: 'claimAmount',
    label: 'Claim Amount / Severity (USD)',
    category: 'target',
    aliases: [
      'claim_amount', 'claimamount', 'loss_amount', 'total_claim', 'claim_cost',
      'severity', 'payout', 'paid_amount', 'indemnity', 'total_paid', 'loss_paid'
    ],
    description: 'Actual loss or indemnity payout amount for conditional severity models'
  },

  // Numerical Features
  {
    id: 'age',
    label: 'Driver / Policyholder Age',
    category: 'numerical',
    aliases: ['age', 'driver_age', 'applicant_age', 'policyholder_age', 'insured_age', 'client_age', 'd_age'],
    description: 'Age in years of primary operator'
  },
  {
    id: 'drivingExperienceYears',
    label: 'Driving Experience (Years)',
    category: 'numerical',
    aliases: [
      'drivingexperienceyears', 'driving_experience', 'experience', 'driving_exp',
      'license_years', 'years_licensed', 'drive_exp', 'driver_experience'
    ],
    description: 'Years of licensed driving experience'
  },
  {
    id: 'bmi',
    label: 'Body Mass Index (BMI)',
    category: 'numerical',
    aliases: ['bmi', 'body_mass_index', 'body_mass', 'bodymassindex'],
    description: 'Underwriting health metric (if applicable to health/life/motor combined)'
  },
  {
    id: 'children',
    label: 'Number of Children / Dependents',
    category: 'numerical',
    aliases: ['children', 'dependents', 'num_children', 'kids', 'child_count', 'no_of_children'],
    description: 'Family size and dependent profile'
  },
  {
    id: 'income',
    label: 'Annual Household Income',
    category: 'numerical',
    aliases: ['income', 'annual_income', 'salary', 'household_income', 'gross_income', 'wage'],
    description: 'Annual verified income'
  },
  {
    id: 'creditScore',
    label: 'Credit Score (FICO)',
    category: 'numerical',
    aliases: ['creditscore', 'credit_score', 'credit', 'fico', 'fico_score', 'credit_rating', 'bureau_score'],
    description: 'Financial stability score'
  },
  {
    id: 'annualMileage',
    label: 'Annual Mileage (Miles/Yr)',
    category: 'numerical',
    aliases: [
      'annualmileage', 'annual_mileage', 'mileage', 'miles', 'annual_miles',
      'yearly_miles', 'miles_driven', 'annual_miles_driven', 'annualmilesdriven', 'distance'
    ],
    description: 'Annual vehicle or commute exposure'
  },
  {
    id: 'vehicleAge',
    label: 'Vehicle Age (Years)',
    category: 'numerical',
    aliases: ['vehicleage', 'vehicle_age', 'car_age', 'auto_age', 'age_of_car', 'veh_age'],
    description: 'Model age from date of manufacture'
  },
  {
    id: 'vehicleValue',
    label: 'Vehicle Value / Coverage Amount (USD)',
    category: 'numerical',
    aliases: [
      'vehiclevalue', 'vehicle_value', 'car_value', 'coverage_amount', 'insured_value',
      'sum_insured', 'vehicle_cost', 'price', 'market_value', 'stated_value'
    ],
    description: 'Current replacement value / total coverage limit'
  },
  {
    id: 'premium',
    label: 'Policy Premium (USD)',
    category: 'numerical',
    aliases: ['premium', 'annual_premium', 'gross_premium', 'policy_premium', 'written_premium', 'earned_premium'],
    description: 'Current or prior annual premium'
  },
  {
    id: 'deductible',
    label: 'Policy Deductible (USD)',
    category: 'numerical',
    aliases: ['deductible', 'excess', 'policy_deductible', 'deductible_amount', 'out_of_pocket'],
    description: 'First-dollar loss retention'
  },
  {
    id: 'priorClaimsLast5Years',
    label: 'Previous Claims (Past 5 Years)',
    category: 'numerical',
    aliases: [
      'priorclaimslast5years', 'prior_claims', 'previous_claims', 'past_claims',
      'claims_history', 'prior_claim_count', 'no_of_previous_claims', 'claim_count'
    ],
    description: 'Prior frequency history'
  },
  {
    id: 'trafficViolationsCount',
    label: 'Traffic Violations / Points',
    category: 'numerical',
    aliases: ['trafficviolationscount', 'traffic_violations', 'violations', 'tickets', 'moving_violations', 'points', 'penalty_points'],
    description: 'Regulatory infraction count'
  },
  {
    id: 'policyTenureYears',
    label: 'Policy Duration / Tenure (Years)',
    category: 'numerical',
    aliases: [
      'policytenureyears', 'policy_tenure', 'policy_duration', 'tenure', 'years_with_company',
      'customer_duration', 'duration', 'account_age', 'tenure_years'
    ],
    description: 'Loyalty tenure with carrier'
  },
  {
    id: 'annualExposure',
    label: 'Annual Exposure Fraction',
    category: 'numerical',
    aliases: ['annualexposure', 'annual_exposure', 'exposure', 'earned_exposure', 'policy_fraction', 'time_at_risk'],
    description: 'Actuarial risk period duration (0 to 1.0 year)'
  },

  // Categorical Features
  {
    id: 'driverGender',
    label: 'Driver Gender',
    category: 'categorical',
    aliases: ['gender', 'driver_gender', 'sex', 'driver_sex', 'applicant_gender'],
    description: 'Driver demographic attribute'
  },
  {
    id: 'smoker',
    label: 'Smoking Status',
    category: 'categorical',
    aliases: ['smoker', 'smoking', 'smoking_status', 'tobacco', 'nicotine_user', 'cigarette'],
    description: 'Health & habit risk factor'
  },
  {
    id: 'maritalStatus',
    label: 'Marital Status',
    category: 'categorical',
    aliases: ['maritalstatus', 'marital_status', 'marital', 'married', 'civil_status'],
    description: 'Household stability index'
  },
  {
    id: 'vehicleCategory',
    label: 'Vehicle Category / Body Style',
    category: 'categorical',
    aliases: ['vehiclecategory', 'vehicle_category', 'car_type', 'vehicle_type', 'category', 'body_type', 'auto_type'],
    description: 'Segment classification (Sedan, SUV, Luxury, Truck)'
  },
  {
    id: 'regionalZone',
    label: 'Region / Territory Zone',
    category: 'categorical',
    aliases: ['regionalzone', 'regional_zone', 'region', 'zone', 'territory', 'location', 'state', 'geographic_zone', 'postal_zone'],
    description: 'Territorial risk tier (Urban, Suburban, Rural)'
  },
  {
    id: 'coverageTier',
    label: 'Coverage Tier / Plan Level',
    category: 'categorical',
    aliases: ['coveragetier', 'coverage_tier', 'coverage', 'tier', 'plan', 'policy_plan', 'package', 'cover_type'],
    description: 'Product bundle selection'
  },
  {
    id: 'antiTheftDevice',
    label: 'Anti-Theft Device Installed',
    category: 'categorical',
    aliases: ['antitheftdevice', 'anti_theft', 'anti_theft_device', 'alarm', 'security_system', 'tracker', 'immobilizer'],
    description: 'Theft deterrent indicator'
  }
];

/**
 * Flexible normalizer for column headers
 */
export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Auto-detect columns with flexible fuzzy alias matching
 */
export function detectInsuranceColumns(columns: string[]): ColumnDetectionResult {
  const mapping: Record<string, string> = {};
  const matchedColumns = new Set<string>();

  const normalizedColumns = columns.map(c => ({
    original: c,
    normalized: normalizeHeader(c)
  }));

  // Score candidate matches
  for (const def of INSURANCE_FIELDS) {
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const col of normalizedColumns) {
      if (matchedColumns.has(col.original)) continue;

      for (const alias of def.aliases) {
        const normAlias = normalizeHeader(alias);

        // Exact match
        if (col.normalized === normAlias) {
          bestMatch = col.original;
          bestScore = 100;
          break;
        }

        // Substring / contained match
        if (col.normalized.includes(normAlias) || normAlias.includes(col.normalized)) {
          const score = (Math.min(col.normalized.length, normAlias.length) / Math.max(col.normalized.length, normAlias.length)) * 85;
          if (score > bestScore) {
            bestScore = score;
            bestMatch = col.original;
          }
        }
      }

      if (bestScore === 100) break;
    }

    if (bestMatch && bestScore >= 60) {
      mapping[def.id] = bestMatch;
      matchedColumns.add(bestMatch);
    }
  }

  const numerical: string[] = [];
  const categorical: string[] = [];
  const optional: string[] = [];
  const unmapped: string[] = [];

  for (const col of columns) {
    const isMapped = Object.values(mapping).includes(col);
    if (!isMapped) {
      unmapped.push(col);
    }
  }

  for (const [fieldId, colName] of Object.entries(mapping)) {
    const def = INSURANCE_FIELDS.find(f => f.id === fieldId);
    if (!def) continue;

    if (def.category === 'numerical') {
      numerical.push(colName);
    } else if (def.category === 'categorical') {
      categorical.push(colName);
    } else if (def.category === 'optional') {
      optional.push(colName);
    }
  }

  // Calculate confidence score
  const hasTarget = Boolean(mapping.target || mapping.claimAmount);
  const coreFieldsCount = ['age', 'vehicleAge', 'annualMileage', 'creditScore', 'priorClaimsLast5Years']
    .filter(f => Boolean(mapping[f])).length;

  let confidenceScore = 30;
  if (hasTarget) confidenceScore += 35;
  confidenceScore += Math.min(35, coreFieldsCount * 7);

  return {
    target: mapping.target || mapping.claimAmount || null,
    numerical,
    categorical,
    optional,
    unmapped,
    confidenceScore: Math.min(100, Math.round(confidenceScore)),
    mapping
  };
}

/**
 * Validate incoming file before parsing
 */
export function validateDatasetFile(file: { name: string; size: number; type?: string }): {
  valid: boolean;
  fileType: 'csv' | 'xlsx';
  error?: string;
  warning?: string;
} {
  if (!file || !file.name) {
    return { valid: false, fileType: 'csv', error: 'No file provided.' };
  }

  const name = file.name.toLowerCase();
  const isCsv = name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel';
  const isXlsx = name.endsWith('.xlsx') || name.endsWith('.xls') || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  if (!isCsv && !isXlsx) {
    return {
      valid: false,
      fileType: 'csv',
      error: 'Unsupported file format. Please upload a standard comma-separated (.csv) or Excel spreadsheet (.xlsx/.xls) file.'
    };
  }

  const fileType = isCsv ? 'csv' : 'xlsx';

  if (file.size === 0) {
    return {
      valid: false,
      fileType,
      error: 'The uploaded file is empty (0 bytes). Please select a valid dataset with data rows.'
    };
  }

  let warning: string | undefined;
  if (file.size > 150 * 1024 * 1024) {
    warning = 'File size exceeds 150 MB. Processing may require additional memory.';
  }

  return { valid: true, fileType, warning };
}

/**
 * High-speed 32-bit FNV-1a hash function for lightweight, low-memory duplicate detection
 */
export function fnv1a32(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Format bytes into human-readable representation
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Streaming dataset processor that computes Welford running moments, quantiles,
 * duplicate metrics, and health scores in single-pass O(1) extra memory.
 */
export class StreamingDatasetAnalyzer {
  private totalRows = 0;
  private columns: string[] = [];
  private numericalCols = new Set<string>();
  private categoricalCols = new Set<string>();

  // Welford running statistics
  private numStats = new Map<string, {
    count: number;
    missingCount: number;
    invalidCount: number;
    min: number;
    max: number;
    mean: number;
    m2: number; // For running sample variance
    reservoir: number[]; // Reservoir sample for median/quantiles (max 500 values)
  }>();

  // Categorical frequency trackers
  private catStats = new Map<string, {
    missingCount: number;
    freqMap: Map<string, number>;
  }>();

  // Low-memory duplicate tracking (FNV-1a 32-bit hashes in a Set<number>)
  private rowHashes = new Set<number>();
  private duplicateRowCount = 0;
  private rowsWithMissingCount = 0;
  private totalMissingCells = 0;

  // Bounded preview buffer (first 250 rows)
  private previewRows: Array<Record<string, any>> = [];
  private maxPreviewRows = 250;
  private maxReservoirSize = 500;

  constructor(columns: string[], numericalColumns: string[], categoricalColumns: string[]) {
    this.columns = [...columns];
    this.numericalCols = new Set(numericalColumns);
    this.categoricalCols = new Set(categoricalColumns);

    for (const col of numericalColumns) {
      this.numStats.set(col, {
        count: 0,
        missingCount: 0,
        invalidCount: 0,
        min: Infinity,
        max: -Infinity,
        mean: 0,
        m2: 0,
        reservoir: []
      });
    }

    for (const col of categoricalColumns) {
      this.catStats.set(col, {
        missingCount: 0,
        freqMap: new Map()
      });
    }
  }

  /**
   * Process a single row with Welford moment accumulation & hash deduplication
   */
  public processRow(row: Record<string, any>): void {
    this.totalRows++;
    let rowHasMissing = false;

    // Fast string representation for duplicate hashing
    let rowString = '';

    for (let c = 0; c < this.columns.length; c++) {
      const col = this.columns[c];
      const rawVal = row[col];
      rowString += `${c}:${rawVal ?? ''}|`;

      const isBlank = rawVal === undefined || rawVal === null || rawVal === '' || (typeof rawVal === 'string' && rawVal.trim() === '');
      if (isBlank) {
        this.totalMissingCells++;
        rowHasMissing = true;
      }

      // Numerical Column Processing
      if (this.numericalCols.has(col)) {
        const stats = this.numStats.get(col)!;
        if (isBlank) {
          stats.missingCount++;
        } else {
          const num = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(/[$,]/g, '').trim());
          if (isNaN(num) || !isFinite(num)) {
            stats.invalidCount++;
          } else {
            stats.count++;
            stats.min = Math.min(stats.min, num);
            stats.max = Math.max(stats.max, num);

            // Welford's algorithm for online variance & mean
            const delta = num - stats.mean;
            stats.mean += delta / stats.count;
            const delta2 = num - stats.mean;
            stats.m2 += delta * delta2;

            // Reservoir sampling for percentile estimations (median, Q25, Q75)
            if (stats.reservoir.length < this.maxReservoirSize) {
              stats.reservoir.push(num);
            } else {
              const j = Math.floor(Math.random() * stats.count);
              if (j < this.maxReservoirSize) {
                stats.reservoir[j] = num;
              }
            }
          }
        }
      }

      // Categorical Column Processing
      if (this.categoricalCols.has(col)) {
        const stats = this.catStats.get(col)!;
        if (isBlank) {
          stats.missingCount++;
        } else {
          const key = String(rawVal).trim();
          const currentCount = stats.freqMap.get(key) || 0;
          if (stats.freqMap.size < 500 || currentCount > 0) {
            stats.freqMap.set(key, currentCount + 1);
          }
        }
      }
    }

    if (rowHasMissing) {
      this.rowsWithMissingCount++;
    }

    // Duplicate detection via 32-bit hash
    const hash = fnv1a32(rowString);
    if (this.rowHashes.has(hash)) {
      this.duplicateRowCount++;
    } else {
      this.rowHashes.add(hash);
    }

    // Bounded preview buffer
    if (this.previewRows.length < this.maxPreviewRows) {
      this.previewRows.push({ ...row });
    }
  }

  /**
   * Finalize and construct the complete statistical summary and health report
   */
  public finalize(fileName: string, fileSizeBytes: number, fileType: 'csv' | 'xlsx', durationMs: number, mapping: Record<string, string>): DatasetImportSummary {
    const numericalStats: Record<string, NumericalColumnStats> = {};
    const categoricalStats: Record<string, CategoricalColumnStats> = {};
    const emptyColumns: string[] = [];

    // Numerical summaries
    for (const [col, s] of this.numStats.entries()) {
      if (s.count === 0 && s.missingCount > 0) {
        emptyColumns.push(col);
      }

      const variance = s.count > 1 ? s.m2 / (s.count - 1) : 0;
      const std = Math.sqrt(Math.max(0, variance));

      // Calculate percentiles from reservoir sample
      const sorted = [...s.reservoir].sort((a, b) => a - b);
      const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
      const q25 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.25)] : 0;
      const q75 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.75)] : 0;

      numericalStats[col] = {
        column: col,
        count: s.count,
        missingCount: s.missingCount,
        invalidCount: s.invalidCount,
        min: s.min === Infinity ? 0 : s.min,
        max: s.max === -Infinity ? 0 : s.max,
        mean: Number(s.mean.toFixed(2)),
        median: Number(median.toFixed(2)),
        std: Number(std.toFixed(2)),
        q25: Number(q25.toFixed(2)),
        q75: Number(q75.toFixed(2))
      };
    }

    // Categorical summaries
    for (const [col, s] of this.catStats.entries()) {
      let totalValid = 0;
      const topList: Array<{ category: string; count: number; percentage: number }> = [];

      const entries = Array.from(s.freqMap.entries()).sort((a, b) => b[1] - a[1]);
      for (const [, cnt] of entries) {
        totalValid += cnt;
      }

      if (totalValid === 0 && s.missingCount > 0) {
        emptyColumns.push(col);
      }

      for (const [cat, cnt] of entries.slice(0, 8)) {
        topList.push({
          category: cat,
          count: cnt,
          percentage: totalValid > 0 ? Number(((cnt / totalValid) * 100).toFixed(1)) : 0
        });
      }

      categoricalStats[col] = {
        column: col,
        totalCount: totalValid,
        missingCount: s.missingCount,
        uniqueCount: s.freqMap.size,
        topCategories: topList
      };
    }

    // Health report calculations
    const totalCells = Math.max(1, this.totalRows * this.columns.length);
    const missingCellPercent = Number(((this.totalMissingCells / totalCells) * 100).toFixed(2));
    const duplicateRowPercent = this.totalRows > 0 ? Number(((this.duplicateRowCount / this.totalRows) * 100).toFixed(2)) : 0;

    let healthScore = 100;
    const issues: Array<{ severity: 'info' | 'warning' | 'error'; message: string }> = [];

    if (missingCellPercent > 15) {
      healthScore -= 30;
      issues.push({ severity: 'error', message: `High missing values detected (${missingCellPercent}% of dataset cells are missing).` });
    } else if (missingCellPercent > 3) {
      healthScore -= 12;
      issues.push({ severity: 'warning', message: `Moderate missing values (${missingCellPercent}% of dataset cells).` });
    }

    if (duplicateRowPercent > 10) {
      healthScore -= 25;
      issues.push({ severity: 'error', message: `Elevated duplicate rate (${duplicateRowPercent}% duplicate rows detected).` });
    } else if (duplicateRowPercent > 2) {
      healthScore -= 10;
      issues.push({ severity: 'warning', message: `Contains ${this.duplicateRowCount.toLocaleString()} duplicate rows (${duplicateRowPercent}%).` });
    }

    if (emptyColumns.length > 0) {
      healthScore -= emptyColumns.length * 10;
      issues.push({ severity: 'error', message: `${emptyColumns.length} completely empty column(s): ${emptyColumns.join(', ')}` });
    }

    let totalInvalid = 0;
    for (const s of Object.values(numericalStats)) {
      totalInvalid += s.invalidCount;
    }
    if (totalInvalid > 0) {
      healthScore -= Math.min(15, totalInvalid);
      issues.push({ severity: 'warning', message: `${totalInvalid} non-numeric values found in numerical columns.` });
    }

    healthScore = Math.max(10, Math.min(100, Math.round(healthScore)));

    let grade: 'A' | 'B' | 'C' | 'D' = 'A';
    let status: 'Passed' | 'Warning' | 'Failed' = 'Passed';
    if (healthScore >= 85) {
      grade = 'A';
      status = 'Passed';
    } else if (healthScore >= 70) {
      grade = 'B';
      status = 'Passed';
    } else if (healthScore >= 50) {
      grade = 'C';
      status = 'Warning';
    } else {
      grade = 'D';
      status = 'Failed';
    }

    const summaryMessage = status === 'Passed'
      ? 'Dataset is in excellent health and ready for high-fidelity statistical underwriting inference.'
      : status === 'Warning'
      ? 'Dataset contains moderate data quality warnings. Review missing values and duplicate rows prior to model deployment.'
      : 'Dataset health requires attention. Significant data cleaning recommended before actuarial pricing.';

    return {
      fileName,
      fileSize: Number((fileSizeBytes / (1024 * 1024)).toFixed(2)),
      fileSizeBytes,
      fileType,
      totalRows: this.totalRows,
      totalColumns: this.columns.length,
      columns: this.columns,
      health: {
        score: healthScore,
        grade,
        status,
        summaryMessage,
        totalRows: this.totalRows,
        totalColumns: this.columns.length,
        missingCells: this.totalMissingCells,
        missingCellPercent,
        rowsWithMissing: this.rowsWithMissingCount,
        duplicateRows: this.duplicateRowCount,
        duplicateRowPercent,
        invalidValues: totalInvalid,
        emptyColumns,
        numericalCount: this.numericalCols.size,
        categoricalCount: this.categoricalCols.size,
        issues
      },
      numericalStats,
      categoricalStats,
      previewRows: this.previewRows,
      mapping,
      processingDurationMs: durationMs
    };
  }
}

/**
 * Fast asynchronous Excel (.xlsx/.xls) parsing in non-blocking batches
 */
export async function parseExcelDataset(
  file: File,
  onProgress: (processed: number, total: number, percent: number) => void,
  signal?: AbortSignal
): Promise<{ headers: string[]; rows: Array<Record<string, any>> }> {
  const buffer = await file.arrayBuffer();
  if (signal?.aborted) throw new Error('Parsing aborted by user');

  const workbook = XLSX.read(buffer, { type: 'array', dense: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error('The uploaded Excel workbook contains no readable sheets.');

  const sheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
    header: 1,
    blankrows: false,
    defval: ''
  }) as unknown[][];

  if (!jsonData || jsonData.length === 0) {
    throw new Error('Excel sheet is empty.');
  }

  const rawHeaders = jsonData[0] as string[];
  const headers = rawHeaders.map((h, idx) => (h ? String(h).trim() : `Column_${idx + 1}`));
  const dataRows = jsonData.slice(1);

  const total = dataRows.length;
  const resultRows: Array<Record<string, any>> = [];

  const BATCH_SIZE = 2500;
  for (let i = 0; i < total; i += BATCH_SIZE) {
    if (signal?.aborted) throw new Error('Parsing aborted by user');

    const chunk = dataRows.slice(i, i + BATCH_SIZE);
    for (const rowArr of chunk) {
      const obj: Record<string, any> = {};
      for (let h = 0; h < headers.length; h++) {
        obj[headers[h]] = (rowArr as any)[h] ?? '';
      }
      resultRows.push(obj);
    }

    const processed = Math.min(total, i + BATCH_SIZE);
    const percent = Math.round((processed / total) * 100);
    onProgress(processed, total, percent);

    // Yield control to UI thread
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return { headers, rows: resultRows };
}
