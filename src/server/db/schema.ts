export type UserRole = 'ADMIN' | 'ANALYST' | 'USER';

export type PolicyStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PENDING';
export type ClaimStatus = 'REPORTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CLOSED';
export type ModelStatus = 'DEVELOPMENT' | 'CANDIDATE' | 'PRODUCTION' | 'RETIRED' | 'active' | 'candidate' | 'deprecated';

export interface UserEntity {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export type SafeUser = Omit<UserEntity, 'passwordHash' | 'salt'>;

export interface CustomerEntity {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  driverLicenseState: string;
  driverLicenseHash: string;
  creditScore: number;
  addressCity: string;
  addressState: string;
  addressZip: string;
  riskTier: string;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyEntity {
  id: string;
  policyNumber: string;
  customerId: string;
  coverageTier: string;
  vehicleCategory: string;
  vehicleYear: number;
  vehicleValue: number;
  annualMileage: number;
  deductible: number;
  annualPremiumUSD: number;
  effectiveDate: string;
  expirationDate: string;
  status: PolicyStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimEntity {
  id: string;
  claimNumber: string;
  policyId: string;
  customerId: string;
  incidentDate: string;
  reportedDate: string;
  claimType: string;
  amountClaimedUSD: number;
  amountPaidUSD: number;
  status: ClaimStatus;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface PredictionEntity {
  id: string;
  predictionId: string;
  userId?: string;
  customerId?: string;
  policyId?: string;
  modelVersion: string;
  modelName: string;
  inputSnapshot: Record<string, any>;
  claimProbability: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  isClaimPredicted: boolean;
  thresholdApplied: number;
  expectedSeverityUSD?: number;
  purePremiumUSD?: number;
  grossPremiumUSD?: number;
  topAttributions: Array<{ feature: string; impact: string; description?: string }>;
  inferenceTimeMs: number;
  createdAt: string;
}

export interface ModelEntity {
  id: string;
  version: string;
  name: string;
  type: string;
  algorithm?: string;
  description: string;
  status: ModelStatus;
  threshold: number;
  calibrationMethod: string;
  trainingDatasetVersion?: string;
  trainingDate?: string;
  features?: string[];
  hyperparameters?: Record<string, any>;
  calibrationInformation?: Record<string, any>;
  promotedAt?: string;
  promotedBy?: string;
  promotionRationale?: string;
  retiredAt?: string;
  retiredBy?: string;
  retirementRationale?: string;
  createdAt: string;
  activatedAt?: string;
}

export interface ModelMetricEntity {
  id: string;
  modelId: string;
  modelVersion: string;
  evaluationDataset: string;
  sampleSize: number;
  brierScore: number;
  logLoss: number;
  rocAuc: number;
  prAuc: number;
  ece: number;
  f1Score: number;
  precision: number;
  recall: number;
  evaluatedAt: string;
}

export interface AuditLogEntity {
  id: string;
  userId?: string;
  userEmail?: string;
  userRole?: UserRole;
  action: string;
  resource: string;
  details?: Record<string, any>;
  ipAddress?: string;
  success: boolean;
  errorMessage?: string;
  timestamp: string;
}

export type Permission =
  | 'manage_users'
  | 'manage_models'
  | 'view_audit_logs'
  | 'access_all_analytics'
  | 'create_predictions'
  | 'view_all_predictions'
  | 'view_own_predictions'
  | 'view_model_performance'
  | 'manage_customers'
  | 'manage_policies'
  | 'manage_claims';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    'manage_users',
    'manage_models',
    'view_audit_logs',
    'access_all_analytics',
    'create_predictions',
    'view_all_predictions',
    'view_own_predictions',
    'view_model_performance',
    'manage_customers',
    'manage_policies',
    'manage_claims',
  ],
  ANALYST: [
    'create_predictions',
    'view_all_predictions',
    'view_own_predictions',
    'view_analytics',
    'access_all_analytics',
    'view_model_performance',
    'manage_customers',
    'manage_policies',
    'manage_claims',
  ] as unknown as Permission[],
  USER: [
    'create_predictions',
    'view_own_predictions',
  ],
};
