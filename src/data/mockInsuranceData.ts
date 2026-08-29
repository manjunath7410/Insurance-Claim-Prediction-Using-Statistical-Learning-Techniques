import { ActuarialDatasetRecord, AuditLogItem } from '../types';

export const INITIAL_DATASET_RECORDS: ActuarialDatasetRecord[] = [
  { id: 'REC-1001', age: 22, experience: 3, creditScore: 620, annualMileage: 14500, vehicleType: 'Economy Sedan', vehicleValue: 18500, zone: 'Metro High-Congestion', priorClaims: 1, exposure: 1.0, claimOccurred: 1, claimAmount: 4200, predictedProb: 0.185 },
  { id: 'REC-1002', age: 45, experience: 26, creditScore: 790, annualMileage: 9000, vehicleType: 'Compact SUV', vehicleValue: 32000, zone: 'Suburban Moderate', priorClaims: 0, exposure: 1.0, claimOccurred: 0, claimAmount: 0, predictedProb: 0.042 },
  { id: 'REC-1003', age: 52, experience: 32, creditScore: 815, annualMileage: 7200, vehicleType: 'Economy Sedan', vehicleValue: 21000, zone: 'Rural Low-Risk', priorClaims: 0, exposure: 1.0, claimOccurred: 0, claimAmount: 0, predictedProb: 0.024 },
  { id: 'REC-1004', age: 29, experience: 8, creditScore: 680, annualMileage: 18000, vehicleType: 'Luxury / Sports', vehicleValue: 56000, zone: 'Metro High-Congestion', priorClaims: 2, exposure: 1.0, claimOccurred: 1, claimAmount: 14850, predictedProb: 0.342 },
  { id: 'REC-1005', age: 34, experience: 14, creditScore: 740, annualMileage: 12000, vehicleType: 'Compact SUV', vehicleValue: 28500, zone: 'Suburban Moderate', priorClaims: 0, exposure: 1.0, claimOccurred: 0, claimAmount: 0, predictedProb: 0.058 },
  { id: 'REC-1006', age: 61, experience: 40, creditScore: 765, annualMileage: 6500, vehicleType: 'Economy Sedan', vehicleValue: 19000, zone: 'Rural Low-Risk', priorClaims: 0, exposure: 1.0, claimOccurred: 0, claimAmount: 0, predictedProb: 0.031 },
  { id: 'REC-1007', age: 27, experience: 6, creditScore: 590, annualMileage: 21000, vehicleType: 'Commercial Van', vehicleValue: 35000, zone: 'Metro High-Congestion', priorClaims: 2, exposure: 1.0, claimOccurred: 1, claimAmount: 6900, predictedProb: 0.388 },
  { id: 'REC-1008', age: 41, experience: 20, creditScore: 725, annualMileage: 13500, vehicleType: 'Compact SUV', vehicleValue: 31000, zone: 'Suburban Moderate', priorClaims: 0, exposure: 1.0, claimOccurred: 0, claimAmount: 0, predictedProb: 0.064 },
  { id: 'REC-1009', age: 19, experience: 1, creditScore: 610, annualMileage: 16000, vehicleType: 'Economy Sedan', vehicleValue: 14000, zone: 'Metro High-Congestion', priorClaims: 1, exposure: 0.8, claimOccurred: 1, claimAmount: 3100, predictedProb: 0.295 },
  { id: 'REC-1010', age: 50, experience: 30, creditScore: 820, annualMileage: 8000, vehicleType: 'Economy Sedan', vehicleValue: 26000, zone: 'Rural Low-Risk', priorClaims: 0, exposure: 1.0, claimOccurred: 0, claimAmount: 0, predictedProb: 0.021 },
  { id: 'REC-1011', age: 36, experience: 17, creditScore: 710, annualMileage: 15000, vehicleType: 'Luxury / Sports', vehicleValue: 62000, zone: 'Suburban Moderate', priorClaims: 1, exposure: 1.0, claimOccurred: 0, claimAmount: 0, predictedProb: 0.115 },
  { id: 'REC-1012', age: 70, experience: 48, creditScore: 780, annualMileage: 5000, vehicleType: 'Economy Sedan', vehicleValue: 17000, zone: 'Suburban Moderate', priorClaims: 0, exposure: 1.0, claimOccurred: 0, claimAmount: 0, predictedProb: 0.048 },
  { id: 'REC-1013', age: 31, experience: 11, creditScore: 650, annualMileage: 17500, vehicleType: 'Compact SUV', vehicleValue: 29000, zone: 'Metro High-Congestion', priorClaims: 1, exposure: 1.0, claimOccurred: 1, claimAmount: 5400, predictedProb: 0.174 },
  { id: 'REC-1014', age: 44, experience: 24, creditScore: 760, annualMileage: 11000, vehicleType: 'Economy Sedan', vehicleValue: 22000, zone: 'Rural Low-Risk', priorClaims: 0, exposure: 1.0, claimOccurred: 0, claimAmount: 0, predictedProb: 0.038 },
  { id: 'REC-1015', age: 24, experience: 4, creditScore: 630, annualMileage: 19000, vehicleType: 'Luxury / Sports', vehicleValue: 49000, zone: 'Metro High-Congestion', priorClaims: 3, exposure: 1.0, claimOccurred: 1, claimAmount: 22400, predictedProb: 0.490 },
  { id: 'REC-1016', age: 58, experience: 38, creditScore: 805, annualMileage: 8800, vehicleType: 'Compact SUV', vehicleValue: 36000, zone: 'Suburban Moderate', priorClaims: 0, exposure: 1.0, claimOccurred: 0, claimAmount: 0, predictedProb: 0.029 },
];

/**
 * Deterministic synthetic actuarial benchmark dataset generator (French MTPL & CAS calibrated)
 */
export function generateActuarialBenchmarkPopulation(size = 500, seed = 42): ActuarialDatasetRecord[] {
  let s = seed;
  const rand = () => {
    const x = Math.sin(s++) * 10000;
    return x - Math.floor(x);
  };

  const vehicleTypes = ['Economy Sedan', 'Compact SUV', 'Luxury / Sports', 'Commercial Van', 'Heavy Truck / Electric'];
  const zones = ['Rural Low-Risk', 'Suburban Moderate', 'Urban Dense', 'Metro High-Congestion'];

  const records: ActuarialDatasetRecord[] = [];

  for (let i = 0; i < size; i++) {
    const age = Math.floor(18 + rand() * 62);
    const experience = Math.max(0, age - 16 - Math.floor(rand() * 8));
    const creditScore = Math.floor(520 + rand() * 320);
    const annualMileage = Math.floor(4000 + rand() * 22000);
    const vehicleType = vehicleTypes[Math.floor(rand() * vehicleTypes.length)];
    const vehicleValue = Math.floor(12000 + rand() * 65000);
    const zone = zones[Math.floor(rand() * zones.length)];
    const priorClaims = rand() < 0.75 ? 0 : (rand() < 0.85 ? 1 : 2);
    const exposure = Number((0.2 + rand() * 0.8).toFixed(2));

    // Actuarial claim propensity
    const logOdds = -2.6 +
      (age < 25 ? 0.65 : age > 68 ? 0.35 : -0.30) +
      priorClaims * 0.40 +
      (zone === 'Metro High-Congestion' ? 0.45 : zone === 'Rural Low-Risk' ? -0.35 : 0) +
      (creditScore < 600 ? 0.35 : creditScore > 750 ? -0.30 : 0);

    const prob = 1 / (1 + Math.exp(-logOdds));
    const claimOccurred = rand() < (prob * exposure) ? 1 : 0;
    const claimAmount = claimOccurred === 1 ? Math.floor(1200 + rand() * 8500 + (vehicleValue * 0.15)) : 0;

    records.push({
      id: `REC-${2000 + i}`,
      age,
      experience,
      creditScore,
      annualMileage,
      vehicleType,
      vehicleValue,
      zone,
      priorClaims,
      exposure,
      claimOccurred,
      claimAmount,
      predictedProb: Number(prob.toFixed(3)),
    });
  }

  return records;
}

export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'AUD-901',
    timestamp: '2026-08-28 17:45:12',
    policyId: 'POL-829143',
    driverAge: 20,
    vehicleCategory: 'Luxury / Sports',
    modelUsed: 'Gradient Boosting (Tweedie)',
    claimProbability: 0.284,
    expectedSeverity: 8250,
    purePremium: 2343,
    grossPremium: 3116,
    riskTier: 'High Risk',
    decision: 'Surcharge applied (35%) due to prior violations and high performance vehicle.',
    underwriterName: 'Actuary System (Auto-Rule #14)',
    status: 'Flagged',
  },
  {
    id: 'AUD-902',
    timestamp: '2026-08-28 18:12:05',
    policyId: 'POL-391820',
    driverAge: 48,
    vehicleCategory: 'Economy Sedan',
    modelUsed: 'Two-Stage Hurdle Model',
    claimProbability: 0.028,
    expectedSeverity: 2900,
    purePremium: 81,
    grossPremium: 108,
    riskTier: 'Low Risk',
    decision: 'Standard Clean Driver discount (15%) approved.',
    underwriterName: 'Senior Underwriter (M. Khot)',
    status: 'Approved',
  },
  {
    id: 'AUD-903',
    timestamp: '2026-08-28 19:04:40',
    policyId: 'POL-610482',
    driverAge: 38,
    vehicleCategory: 'Compact SUV',
    modelUsed: 'GLM (Logistic + Gamma)',
    claimProbability: 0.061,
    expectedSeverity: 3650,
    purePremium: 223,
    grossPremium: 296,
    riskTier: 'Standard',
    decision: 'Standard comprehensive binder issued.',
    underwriterName: 'Underwriting Engine v3.2',
    status: 'Approved',
  },
];

export const ZERO_INFLATION_DISTRIBUTION = [
  { category: '$0 (No Claim Filed)', count: 916, percentage: 91.6, fill: '#3b82f6' },
  { category: '$1 - $2,500 (Minor)', count: 42, percentage: 4.2, fill: '#10b981' },
  { category: '$2,501 - $7,500 (Moderate)', count: 26, percentage: 2.6, fill: '#f59e0b' },
  { category: '$7,501 - $15,000 (Severe)', count: 11, percentage: 1.1, fill: '#ef4444' },
  { category: '$15,000+ (Catastrophic)', count: 5, percentage: 0.5, fill: '#8b5cf6' },
];

export const CORRELATION_MATRIX = [
  { feature: 'Prior Claims (5yr)', correlationWithClaim: 0.46, pValue: '< 0.0001', statisticalSignificance: 'Strong' },
  { feature: 'Driver Age (< 25)', correlationWithClaim: 0.38, pValue: '< 0.0001', statisticalSignificance: 'Strong' },
  { feature: 'Traffic Violations', correlationWithClaim: 0.35, pValue: '< 0.0001', statisticalSignificance: 'Strong' },
  { feature: 'Annual Mileage', correlationWithClaim: 0.29, pValue: '< 0.001', statisticalSignificance: 'Moderate' },
  { feature: 'Regional Risk Zone', correlationWithClaim: 0.27, pValue: '< 0.001', statisticalSignificance: 'Moderate' },
  { feature: 'Credit Tier (FICO)', correlationWithClaim: -0.31, pValue: '< 0.001', statisticalSignificance: 'Moderate (Negative)' },
  { feature: 'Policy Tenure', correlationWithClaim: -0.22, pValue: '< 0.01', statisticalSignificance: 'Weak (Negative)' },
  { feature: 'Anti-Theft Installed', correlationWithClaim: -0.16, pValue: '< 0.05', statisticalSignificance: 'Weak (Negative)' },
];
