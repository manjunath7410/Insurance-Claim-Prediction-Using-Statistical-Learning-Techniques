import {
  UserEntity,
  CustomerEntity,
  PolicyEntity,
  ClaimEntity,
  PredictionEntity,
  ModelEntity,
  ModelMetricEntity,
  AuditLogEntity,
  UserRole,
  SafeUser,
} from './schema';
import { SecurityService } from '../auth/security';

export class DatabaseValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'DatabaseValidationError';
  }
}

export class DatabaseConstraintError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseConstraintError';
  }
}

export class InMemoryDatabase {
  // Primary Storage Maps (keyed by primary key id)
  private users = new Map<string, UserEntity>();
  private customers = new Map<string, CustomerEntity>();
  private policies = new Map<string, PolicyEntity>();
  private claims = new Map<string, ClaimEntity>();
  private predictions = new Map<string, PredictionEntity>();
  private models = new Map<string, ModelEntity>();
  private modelMetrics = new Map<string, ModelMetricEntity>();
  private auditLogs = new Map<string, AuditLogEntity>();

  // Unique Secondary Indices
  private userEmailIndex = new Map<string, string>(); // email (lowercase) -> userId
  private customerEmailIndex = new Map<string, string>(); // email (lowercase) -> customerId
  private policyNumberIndex = new Map<string, string>(); // policyNumber -> policyId
  private claimNumberIndex = new Map<string, string>(); // claimNumber -> claimId
  private modelVersionIndex = new Map<string, string>(); // version -> modelId

  // Multi-value Secondary Indices
  private policiesByCustomer = new Map<string, Set<string>>(); // customerId -> Set<policyId>
  private claimsByPolicy = new Map<string, Set<string>>(); // policyId -> Set<claimId>
  private claimsByCustomer = new Map<string, Set<string>>(); // customerId -> Set<claimId>
  private predictionsByUser = new Map<string, Set<string>>(); // userId -> Set<predictionId>
  private auditLogsByUser = new Map<string, Set<string>>(); // userId -> Set<auditLogId>

  constructor() {
    this.seedInitialData();
  }

  // =========================================================================
  // USER OPERATIONS
  // =========================================================================

  public createUser(userData: {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
    isActive?: boolean;
  }): UserEntity {
    this.validateUserData(userData);

    const emailNorm = userData.email.trim().toLowerCase();
    if (this.userEmailIndex.has(emailNorm)) {
      throw new DatabaseConstraintError(`User with email '${userData.email}' already exists.`);
    }

    const { hash, salt } = SecurityService.hashPassword(userData.password);
    const userId = `usr_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    const now = new Date().toISOString();

    const user: UserEntity = {
      id: userId,
      name: userData.name.trim(),
      email: emailNorm,
      passwordHash: hash,
      salt,
      role: userData.role || 'USER',
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(userId, user);
    this.userEmailIndex.set(emailNorm, userId);

    return user;
  }

  public findUserById(id: string): UserEntity | null {
    return this.users.get(id) || null;
  }

  public findUserByEmail(email: string): UserEntity | null {
    const userId = this.userEmailIndex.get(email.trim().toLowerCase());
    if (!userId) return null;
    return this.users.get(userId) || null;
  }

  public listUsers(): SafeUser[] {
    return Array.from(this.users.values()).map(SecurityService.sanitizeUser);
  }

  public updateUserRole(userId: string, newRole: UserRole): UserEntity {
    const user = this.users.get(userId);
    if (!user) {
      throw new DatabaseValidationError(`User '${userId}' not found.`);
    }
    if (!['ADMIN', 'ANALYST', 'USER'].includes(newRole)) {
      throw new DatabaseValidationError(`Invalid user role '${newRole}'.`);
    }

    user.role = newRole;
    user.updatedAt = new Date().toISOString();
    this.users.set(userId, user);
    return user;
  }

  public updateUserLastLogin(userId: string): void {
    const user = this.users.get(userId);
    if (user) {
      user.lastLoginAt = new Date().toISOString();
      user.updatedAt = user.lastLoginAt;
    }
  }

  public deleteUser(userId: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    this.userEmailIndex.delete(user.email.toLowerCase());
    this.users.delete(userId);
    return true;
  }

  private validateUserData(data: { name: string; email: string; password?: string; role?: UserRole }) {
    if (!data.name || data.name.trim().length < 2) {
      throw new DatabaseValidationError('Name must be at least 2 characters long.', 'name');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email.trim())) {
      throw new DatabaseValidationError('Invalid email address format.', 'email');
    }
    if (data.role && !['ADMIN', 'ANALYST', 'USER'].includes(data.role)) {
      throw new DatabaseValidationError(`Invalid role '${data.role}'. Must be ADMIN, ANALYST, or USER.`, 'role');
    }
    if (data.password !== undefined && (typeof data.password !== 'string' || data.password.length < 6)) {
      throw new DatabaseValidationError('Password must be at least 6 characters.', 'password');
    }
  }

  // =========================================================================
  // CUSTOMER OPERATIONS
  // =========================================================================

  public createCustomer(customerData: Omit<CustomerEntity, 'id' | 'createdAt' | 'updatedAt'>): CustomerEntity {
    this.validateCustomerData(customerData);

    const emailNorm = customerData.email.trim().toLowerCase();
    if (this.customerEmailIndex.has(emailNorm)) {
      throw new DatabaseConstraintError(`Customer with email '${customerData.email}' already exists.`);
    }

    const id = `cust_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    const now = new Date().toISOString();

    const customer: CustomerEntity = {
      id,
      ...customerData,
      email: emailNorm,
      createdAt: now,
      updatedAt: now,
    };

    this.customers.set(id, customer);
    this.customerEmailIndex.set(emailNorm, id);

    return customer;
  }

  public findCustomerById(id: string): CustomerEntity | null {
    return this.customers.get(id) || null;
  }

  public findCustomerByEmail(email: string): CustomerEntity | null {
    const id = this.customerEmailIndex.get(email.trim().toLowerCase());
    if (!id) return null;
    return this.customers.get(id) || null;
  }

  public listCustomers(limit: number = 50, offset: number = 0): { customers: CustomerEntity[]; total: number } {
    const all = Array.from(this.customers.values());
    return {
      customers: all.slice(offset, offset + limit),
      total: all.length,
    };
  }

  private validateCustomerData(data: Omit<CustomerEntity, 'id' | 'createdAt' | 'updatedAt'>) {
    if (!data.firstName || data.firstName.trim().length < 1) {
      throw new DatabaseValidationError('First name is required.', 'firstName');
    }
    if (!data.lastName || data.lastName.trim().length < 1) {
      throw new DatabaseValidationError('Last name is required.', 'lastName');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email.trim())) {
      throw new DatabaseValidationError('Valid customer email is required.', 'email');
    }
    if (typeof data.creditScore !== 'number' || data.creditScore < 300 || data.creditScore > 850) {
      throw new DatabaseValidationError('Credit score must be between 300 and 850.', 'creditScore');
    }
  }

  // =========================================================================
  // POLICY OPERATIONS
  // =========================================================================

  public createPolicy(policyData: Omit<PolicyEntity, 'id' | 'createdAt' | 'updatedAt'>): PolicyEntity {
    this.validatePolicyData(policyData);

    if (this.policyNumberIndex.has(policyData.policyNumber)) {
      throw new DatabaseConstraintError(`Policy with number '${policyData.policyNumber}' already exists.`);
    }

    if (!this.customers.has(policyData.customerId)) {
      throw new DatabaseConstraintError(`Referenced customer ID '${policyData.customerId}' does not exist.`);
    }

    const id = `pol_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    const now = new Date().toISOString();

    const policy: PolicyEntity = {
      id,
      ...policyData,
      createdAt: now,
      updatedAt: now,
    };

    this.policies.set(id, policy);
    this.policyNumberIndex.set(policy.policyNumber, id);

    // Index by customer
    if (!this.policiesByCustomer.has(policy.customerId)) {
      this.policiesByCustomer.set(policy.customerId, new Set());
    }
    this.policiesByCustomer.get(policy.customerId)!.add(id);

    return policy;
  }

  public findPolicyById(id: string): PolicyEntity | null {
    return this.policies.get(id) || null;
  }

  public findPolicyByNumber(policyNumber: string): PolicyEntity | null {
    const id = this.policyNumberIndex.get(policyNumber);
    if (!id) return null;
    return this.policies.get(id) || null;
  }

  public findPoliciesByCustomerId(customerId: string): PolicyEntity[] {
    const policyIds = this.policiesByCustomer.get(customerId);
    if (!policyIds) return [];
    return Array.from(policyIds).map((id) => this.policies.get(id)!).filter(Boolean);
  }

  public listPolicies(limit: number = 50, offset: number = 0): { policies: PolicyEntity[]; total: number } {
    const all = Array.from(this.policies.values());
    return {
      policies: all.slice(offset, offset + limit),
      total: all.length,
    };
  }

  private validatePolicyData(data: Omit<PolicyEntity, 'id' | 'createdAt' | 'updatedAt'>) {
    if (!data.policyNumber || data.policyNumber.trim().length < 3) {
      throw new DatabaseValidationError('Valid policy number is required.', 'policyNumber');
    }
    if (!data.customerId) {
      throw new DatabaseValidationError('Customer ID is required.', 'customerId');
    }
    if (typeof data.vehicleValue !== 'number' || data.vehicleValue <= 0) {
      throw new DatabaseValidationError('Vehicle value must be a positive number.', 'vehicleValue');
    }
    if (typeof data.annualMileage !== 'number' || data.annualMileage < 0) {
      throw new DatabaseValidationError('Annual mileage must be a non-negative number.', 'annualMileage');
    }
    if (typeof data.deductible !== 'number' || data.deductible < 0) {
      throw new DatabaseValidationError('Deductible must be non-negative.', 'deductible');
    }
    if (!['ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING'].includes(data.status)) {
      throw new DatabaseValidationError(`Invalid policy status '${data.status}'.`, 'status');
    }
  }

  // =========================================================================
  // CLAIM OPERATIONS
  // =========================================================================

  public createClaim(claimData: Omit<ClaimEntity, 'id' | 'createdAt' | 'updatedAt'>): ClaimEntity {
    this.validateClaimData(claimData);

    if (this.claimNumberIndex.has(claimData.claimNumber)) {
      throw new DatabaseConstraintError(`Claim number '${claimData.claimNumber}' already exists.`);
    }

    if (!this.policies.has(claimData.policyId)) {
      throw new DatabaseConstraintError(`Referenced policy ID '${claimData.policyId}' does not exist.`);
    }

    if (!this.customers.has(claimData.customerId)) {
      throw new DatabaseConstraintError(`Referenced customer ID '${claimData.customerId}' does not exist.`);
    }

    const id = `clm_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    const now = new Date().toISOString();

    const claim: ClaimEntity = {
      id,
      ...claimData,
      createdAt: now,
      updatedAt: now,
    };

    this.claims.set(id, claim);
    this.claimNumberIndex.set(claim.claimNumber, id);

    // Index by policy and customer
    if (!this.claimsByPolicy.has(claim.policyId)) {
      this.claimsByPolicy.set(claim.policyId, new Set());
    }
    this.claimsByPolicy.get(claim.policyId)!.add(id);

    if (!this.claimsByCustomer.has(claim.customerId)) {
      this.claimsByCustomer.set(claim.customerId, new Set());
    }
    this.claimsByCustomer.get(claim.customerId)!.add(id);

    return claim;
  }

  public findClaimById(id: string): ClaimEntity | null {
    return this.claims.get(id) || null;
  }

  public findClaimsByPolicyId(policyId: string): ClaimEntity[] {
    const claimIds = this.claimsByPolicy.get(policyId);
    if (!claimIds) return [];
    return Array.from(claimIds).map((id) => this.claims.get(id)!).filter(Boolean);
  }

  public findClaimsByCustomerId(customerId: string): ClaimEntity[] {
    const claimIds = this.claimsByCustomer.get(customerId);
    if (!claimIds) return [];
    return Array.from(claimIds).map((id) => this.claims.get(id)!).filter(Boolean);
  }

  public listClaims(limit: number = 50, offset: number = 0): { claims: ClaimEntity[]; total: number } {
    const all = Array.from(this.claims.values());
    return {
      claims: all.slice(offset, offset + limit),
      total: all.length,
    };
  }

  private validateClaimData(data: Omit<ClaimEntity, 'id' | 'createdAt' | 'updatedAt'>) {
    if (!data.claimNumber || data.claimNumber.trim().length < 3) {
      throw new DatabaseValidationError('Valid claim number is required.', 'claimNumber');
    }
    if (!data.policyId) throw new DatabaseValidationError('Policy ID is required.', 'policyId');
    if (!data.customerId) throw new DatabaseValidationError('Customer ID is required.', 'customerId');
    if (typeof data.amountClaimedUSD !== 'number' || data.amountClaimedUSD < 0) {
      throw new DatabaseValidationError('Amount claimed must be non-negative.', 'amountClaimedUSD');
    }
    if (!['REPORTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CLOSED'].includes(data.status)) {
      throw new DatabaseValidationError(`Invalid claim status '${data.status}'.`, 'status');
    }
  }

  // =========================================================================
  // PREDICTION OPERATIONS
  // =========================================================================

  public recordPrediction(predData: Omit<PredictionEntity, 'id' | 'createdAt'>): PredictionEntity {
    if (typeof predData.claimProbability !== 'number' || predData.claimProbability < 0 || predData.claimProbability > 1) {
      throw new DatabaseValidationError('Claim probability must be between 0 and 1.', 'claimProbability');
    }

    const id = `pred_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    const now = new Date().toISOString();

    const entity: PredictionEntity = {
      id,
      ...predData,
      createdAt: now,
    };

    this.predictions.set(id, entity);

    if (entity.userId) {
      if (!this.predictionsByUser.has(entity.userId)) {
        this.predictionsByUser.set(entity.userId, new Set());
      }
      this.predictionsByUser.get(entity.userId)!.add(id);
    }

    return entity;
  }

  public findPredictionById(id: string): PredictionEntity | null {
    return this.predictions.get(id) || null;
  }

  public listPredictions(
    options: { userId?: string; limit?: number; offset?: number } = {}
  ): { predictions: PredictionEntity[]; total: number } {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    let list: PredictionEntity[];
    if (options.userId) {
      const ids = this.predictionsByUser.get(options.userId);
      list = ids ? Array.from(ids).map((id) => this.predictions.get(id)!).filter(Boolean) : [];
    } else {
      list = Array.from(this.predictions.values());
    }

    // Sort descending by creation date
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      predictions: list.slice(offset, offset + limit),
      total: list.length,
    };
  }

  // =========================================================================
  // MODEL & METRIC OPERATIONS
  // =========================================================================

  public registerModel(modelData: Omit<ModelEntity, 'id' | 'createdAt'>): ModelEntity {
    if (this.modelVersionIndex.has(modelData.version)) {
      throw new DatabaseConstraintError(`Model version '${modelData.version}' already registered.`);
    }

    const id = `mdl_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    const entity: ModelEntity = {
      id,
      ...modelData,
      createdAt: now,
      activatedAt: modelData.status === 'active' ? now : undefined,
    };

    // If setting active, deactivate others
    if (modelData.status === 'active') {
      for (const m of this.models.values()) {
        if (m.status === 'active') {
          m.status = 'candidate';
        }
      }
    }

    this.models.set(id, entity);
    this.modelVersionIndex.set(entity.version, id);

    return entity;
  }

  public findModelByVersion(version: string): ModelEntity | null {
    const id = this.modelVersionIndex.get(version);
    if (!id) return null;
    return this.models.get(id) || null;
  }

  public getActiveModel(): ModelEntity | null {
    for (const model of this.models.values()) {
      if (model.status === 'active') return model;
    }
    return null;
  }

  public activateModel(version: string): ModelEntity {
    const modelId = this.modelVersionIndex.get(version);
    if (!modelId) {
      throw new DatabaseValidationError(`Model version '${version}' not found in registry.`);
    }

    const targetModel = this.models.get(modelId)!;
    for (const m of this.models.values()) {
      if (m.id === modelId) {
        m.status = 'active';
        m.activatedAt = new Date().toISOString();
      } else if (m.status === 'active') {
        m.status = 'candidate';
      }
    }

    return targetModel;
  }

  public listModels(): ModelEntity[] {
    return Array.from(this.models.values());
  }

  public recordModelMetrics(metricData: Omit<ModelMetricEntity, 'id' | 'evaluatedAt'>): ModelMetricEntity {
    const id = `met_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    const entity: ModelMetricEntity = {
      id,
      ...metricData,
      evaluatedAt: now,
    };

    this.modelMetrics.set(id, entity);
    return entity;
  }

  public getModelMetrics(modelVersion: string): ModelMetricEntity[] {
    return Array.from(this.modelMetrics.values()).filter((m) => m.modelVersion === modelVersion);
  }

  // =========================================================================
  // AUDIT LOG OPERATIONS
  // =========================================================================

  public recordAuditLog(logData: Omit<AuditLogEntity, 'id' | 'timestamp'>): AuditLogEntity {
    if (!logData.action || logData.action.trim().length === 0) {
      throw new DatabaseValidationError('Audit log action is required.', 'action');
    }
    if (!logData.resource || logData.resource.trim().length === 0) {
      throw new DatabaseValidationError('Audit log resource is required.', 'resource');
    }

    const id = `aud_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    const timestamp = new Date().toISOString();

    // Sanitize any sensitive details before storing
    const sanitizedDetails = logData.details ? SecurityService.sanitizeForLogging(logData.details) : undefined;

    const entity: AuditLogEntity = {
      id,
      userId: logData.userId,
      userEmail: logData.userEmail,
      userRole: logData.userRole,
      action: logData.action,
      resource: logData.resource,
      details: sanitizedDetails,
      ipAddress: logData.ipAddress,
      success: logData.success,
      errorMessage: logData.errorMessage,
      timestamp,
    };

    this.auditLogs.set(id, entity);

    if (entity.userId) {
      if (!this.auditLogsByUser.has(entity.userId)) {
        this.auditLogsByUser.set(entity.userId, new Set());
      }
      this.auditLogsByUser.get(entity.userId)!.add(id);
    }

    return entity;
  }

  public listAuditLogs(
    filters: {
      userId?: string;
      action?: string;
      resource?: string;
      success?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): { logs: AuditLogEntity[]; total: number } {
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    let list = Array.from(this.auditLogs.values());

    if (filters.userId) {
      list = list.filter((l) => l.userId === filters.userId);
    }
    if (filters.action) {
      const actionUpper = filters.action.toUpperCase();
      list = list.filter((l) => l.action.toUpperCase().includes(actionUpper));
    }
    if (filters.resource) {
      list = list.filter((l) => l.resource.toLowerCase().includes(filters.resource!.toLowerCase()));
    }
    if (filters.success !== undefined) {
      list = list.filter((l) => l.success === filters.success);
    }

    // Sort descending by timestamp
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      logs: list.slice(offset, offset + limit),
      total: list.length,
    };
  }

  // =========================================================================
  // SEED INITIAL BENCHMARK DATA
  // =========================================================================

  private seedInitialData() {
    // 1. Seed Core Users (ADMIN, ANALYST, USER)
    this.createUser({
      name: 'Dr. Evelyn Reed (Chief Actuary)',
      email: 'admin@actuarial.ai',
      password: 'AdminPassword!2026',
      role: 'ADMIN',
    });

    this.createUser({
      name: 'Marcus Vance (Senior Actuarial Analyst)',
      email: 'analyst@actuarial.ai',
      password: 'AnalystSecure!2026',
      role: 'ANALYST',
    });

    this.createUser({
      name: 'Alex Chen (Policyholder / Underwriting User)',
      email: 'user@policyholder.com',
      password: 'UserPasscode!2026',
      role: 'USER',
    });

    // 2. Seed Initial Models & Metrics
    this.registerModel({
      version: 'v1.2.0-gbdt-calibrated-platt',
      name: 'Gradient Boosted Trees (Platt Calibrated)',
      type: 'gradient_boosting_tweedie',
      description: 'Production Champion - Friedman deviance gradient boosting with Platt sigmoid calibration.',
      status: 'active',
      threshold: 0.08,
      calibrationMethod: 'Platt Scaling (Sigmoid Logistic Loss Minimization)',
    });

    this.registerModel({
      version: 'v1.1.0-hurdle-poisson',
      name: 'Two-Stage Hurdle (Bernoulli x Gamma)',
      type: 'two_stage_hurdle',
      description: 'Candidate Model - Frequency-severity decoupling for heavy-tailed loss portfolios.',
      status: 'candidate',
      threshold: 0.1,
      calibrationMethod: 'Isotonic Regression Calibration',
    });

    this.registerModel({
      version: 'v1.0.0-glm-logistic-baseline',
      name: 'GLM Logistic Baseline (Tweedie Log-Link)',
      type: 'glm_logistic_gamma',
      description: 'Baseline Model - Exponential dispersion family generalized linear model.',
      status: 'candidate',
      threshold: 0.12,
      calibrationMethod: 'Standard Maximum Likelihood Sigmoid',
    });

    this.recordModelMetrics({
      modelId: 'mdl_gbdt_platt',
      modelVersion: 'v1.2.0-gbdt-calibrated-platt',
      evaluationDataset: 'Actuarial Test Partition (CAS Benchmark N=150)',
      sampleSize: 150,
      brierScore: 0.0392,
      logLoss: 0.1412,
      rocAuc: 0.884,
      prAuc: 0.462,
      ece: 0.018,
      f1Score: 0.495,
      precision: 0.441,
      recall: 0.563,
    });

    // 3. Seed Benchmark Customers
    const cust1 = this.createCustomer({
      firstName: 'Samantha',
      lastName: 'Sterling',
      email: 'samantha.sterling@example.com',
      phone: '+1-555-019-2834',
      dateOfBirth: '1989-04-12',
      driverLicenseState: 'CA',
      driverLicenseHash: SecurityService.hashSensitiveIdentifier('CA-D9918234'),
      creditScore: 785,
      addressCity: 'San Francisco',
      addressState: 'CA',
      addressZip: '94105',
      riskTier: 'Low Risk',
    });

    const cust2 = this.createCustomer({
      firstName: 'Devon',
      lastName: 'Kowalski',
      email: 'devon.k@example.com',
      phone: '+1-555-014-9921',
      dateOfBirth: '2004-11-23',
      driverLicenseState: 'IL',
      driverLicenseHash: SecurityService.hashSensitiveIdentifier('IL-K3301982'),
      creditScore: 590,
      addressCity: 'Chicago',
      addressState: 'IL',
      addressZip: '60601',
      riskTier: 'High Risk',
    });

    // 4. Seed Benchmark Policies
    const pol1 = this.createPolicy({
      policyNumber: 'POL-CA-889124',
      customerId: cust1.id,
      coverageTier: 'Standard Comprehensive',
      vehicleCategory: 'Compact SUV',
      vehicleYear: 2022,
      vehicleValue: 34000,
      annualMileage: 11000,
      deductible: 500,
      annualPremiumUSD: 1120,
      effectiveDate: '2026-01-01',
      expirationDate: '2027-01-01',
      status: 'ACTIVE',
    });

    const pol2 = this.createPolicy({
      policyNumber: 'POL-IL-441209',
      customerId: cust2.id,
      coverageTier: 'Full Comprehensive + Zero-Dep',
      vehicleCategory: 'Luxury / Sports',
      vehicleYear: 2023,
      vehicleValue: 58000,
      annualMileage: 22000,
      deductible: 250,
      annualPremiumUSD: 3450,
      effectiveDate: '2026-03-01',
      expirationDate: '2027-03-01',
      status: 'ACTIVE',
    });

    // 5. Seed Benchmark Claims
    this.createClaim({
      claimNumber: 'CLM-2026-0012',
      policyId: pol2.id,
      customerId: cust2.id,
      incidentDate: '2026-05-14',
      reportedDate: '2026-05-15',
      claimType: 'Collision Rear-End',
      amountClaimedUSD: 6800,
      amountPaidUSD: 6550,
      status: 'APPROVED',
      description: 'Wet road braking failure during rush hour bumper collision.',
    });

    // 6. Seed System Audit Logs
    this.recordAuditLog({
      action: 'SYSTEM_BOOTSTRAP',
      resource: 'database/schema',
      details: { version: '2.4.0', partitions: 8, seedEntities: 'active' },
      success: true,
      ipAddress: '127.0.0.1',
    });

    this.recordAuditLog({
      action: 'MODEL_CHAMPION_ACTIVATION',
      resource: 'models/v1.2.0-gbdt-calibrated-platt',
      details: { champion: 'v1.2.0-gbdt-calibrated-platt', prior: 'v1.1.0-hurdle-poisson', threshold: 0.08 },
      success: true,
      userRole: 'ADMIN',
      ipAddress: '127.0.0.1',
    });
  }
}

// Global Singleton Database Instance
export const db = new InMemoryDatabase();
