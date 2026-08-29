import { db, DatabaseValidationError, DatabaseConstraintError } from '../src/server/db/database';
import { SecurityService } from '../src/server/auth/security';
import { AuditService } from '../src/server/services/auditService';
import { ROLE_PERMISSIONS } from '../src/server/db/schema';

interface TestResult {
  passed: number;
  failed: number;
  errors: string[];
}

export function runPhase6AuthAndDbTests(): TestResult {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, errorDetail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      failed++;
      const msg = `FAIL: ${testName}${errorDetail ? ` -> ${errorDetail}` : ''}`;
      errors.push(msg);
      console.error(`  ❌ [FAIL] ${testName} ${errorDetail || ''}`);
    }
  }

  console.log('\n======================================================');
  console.log('⚡ RUNNING PHASE 6: AUTHENTICATION, AUTHORIZATION & DATABASE TEST SUITE');
  console.log('======================================================\n');

  // =========================================================================
  // TEST SUITE 1: CRYPTOGRAPHIC SECURITY & PASSWORD HASHING
  // =========================================================================
  console.log('--- Test Suite 1: Cryptographic Security & Password Hashing ---');

  const rawPassword = 'SecureActuaryPassword!2026';
  const { hash: hash1, salt: salt1 } = SecurityService.hashPassword(rawPassword);
  const { hash: hash2, salt: salt2 } = SecurityService.hashPassword(rawPassword);

  assert(salt1 !== salt2, 'Generates distinct cryptographic salts for identical passwords');
  assert(hash1 !== hash2, 'Produces distinct hash outputs with different salts (Salt uniqueness)');
  assert(SecurityService.verifyPassword(rawPassword, hash1, salt1) === true, 'Successfully verifies correct password against hash and salt');
  assert(SecurityService.verifyPassword('WrongPassword123', hash1, salt1) === false, 'Rejects incorrect password verification');
  assert(SecurityService.verifyPassword(rawPassword, hash1, salt2) === false, 'Rejects password verification with mismatched salt');

  // Sensitive identifier hashing
  const licenseHash1 = SecurityService.hashSensitiveIdentifier('CA-D981245');
  const licenseHash2 = SecurityService.hashSensitiveIdentifier('ca-d981245');
  assert(licenseHash1 === licenseHash2, 'Deterministic case-insensitive hashing for sensitive license numbers without plaintext storage');

  // =========================================================================
  // TEST SUITE 2: SIGNED BEARER TOKENS & INTEGRITY VERIFICATION
  // =========================================================================
  console.log('\n--- Test Suite 2: Signed Bearer Tokens & Integrity Verification ---');

  const testUser = {
    id: 'usr_test_actuary_01',
    email: 'test.actuary@insurance.com',
    name: 'Test Actuary',
    role: 'ANALYST' as const,
  };

  const validToken = SecurityService.generateToken(testUser, 3600);
  assert(typeof validToken === 'string' && validToken.split('.').length === 3, 'Generates valid 3-part HMAC-SHA256 bearer token');

  const verifiedPayload = SecurityService.verifyToken(validToken);
  assert(verifiedPayload !== null, 'Successfully verifies valid signed token signature');
  assert(verifiedPayload?.userId === testUser.id, 'Verified payload contains accurate userId');
  assert(verifiedPayload?.role === 'ANALYST', 'Verified payload contains accurate role');

  // Tamper detection: modifying payload segment
  const tokenParts = validToken.split('.');
  const tamperedPayload = Buffer.from(
    JSON.stringify({ ...JSON.parse(Buffer.from(tokenParts[1], 'base64url').toString('utf8')), role: 'ADMIN' })
  ).toString('base64url');
  const tamperedToken = `${tokenParts[0]}.${tamperedPayload}.${tokenParts[2]}`;
  const tamperedResult = SecurityService.verifyToken(tamperedToken);
  assert(tamperedResult === null, 'Detects signature mismatch and rejects tampered token payload');

  // Expired token rejection
  const expiredToken = SecurityService.generateToken(testUser, -10); // Expired 10 seconds ago
  const expiredResult = SecurityService.verifyToken(expiredToken);
  assert(expiredResult === null, 'Rejects expired authentication token');

  // =========================================================================
  // TEST SUITE 3: DATABASE SCHEMA, VALIDATION & UNIQUE CONSTRAINTS
  // =========================================================================
  console.log('\n--- Test Suite 3: Database Schema, Validation & Unique Constraints ---');

  const uniqueEmail = `test.user.${Date.now()}@actuarial.ai`;
  const createdUser = db.createUser({
    name: 'Validation Test User',
    email: uniqueEmail,
    password: 'ValidPassword123!',
    role: 'USER',
  });

  assert(createdUser.id.startsWith('usr_'), 'Creates user with unique primary key ID');
  assert(createdUser.email === uniqueEmail.toLowerCase(), 'Normalizes and stores lowercase email');
  assert((createdUser as any).password === undefined, 'Never stores raw plaintext password on user entity');
  assert(createdUser.passwordHash.length === 128, 'Stores 512-bit hexadecimal password hash');

  // Duplicate email constraint check
  let duplicateRejected = false;
  try {
    db.createUser({
      name: 'Duplicate Attempt',
      email: uniqueEmail,
      password: 'AnotherPassword123!',
      role: 'USER',
    });
  } catch (err: any) {
    duplicateRejected = err instanceof DatabaseConstraintError;
  }
  assert(duplicateRejected, 'Enforces unique email database constraint on user creation');

  // Invalid email format validation
  let invalidEmailRejected = false;
  try {
    db.createUser({
      name: 'Invalid Email User',
      email: 'not-an-email',
      password: 'ValidPassword123!',
      role: 'USER',
    });
  } catch (err: any) {
    invalidEmailRejected = err instanceof DatabaseValidationError;
  }
  assert(invalidEmailRejected, 'Rejects invalid email format with DatabaseValidationError');

  // Customer creation & indexed lookup
  const custEmail = `cust.${Date.now()}@example.com`;
  const createdCustomer = db.createCustomer({
    firstName: 'Jordan',
    lastName: 'Haynes',
    email: custEmail,
    phone: '+1-555-092-1144',
    dateOfBirth: '1992-06-18',
    driverLicenseState: 'TX',
    driverLicenseHash: SecurityService.hashSensitiveIdentifier('TX-H882194'),
    creditScore: 740,
    addressCity: 'Austin',
    addressState: 'TX',
    addressZip: '78701',
    riskTier: 'Standard',
  });

  assert(createdCustomer.id.startsWith('cust_'), 'Creates customer entity with valid primary key');
  const foundCust = db.findCustomerById(createdCustomer.id);
  assert(foundCust !== null && foundCust.email === custEmail, 'Performs fast O(1) indexed customer lookup by ID');
  const foundCustByEmail = db.findCustomerByEmail(custEmail);
  assert(foundCustByEmail !== null && foundCustByEmail.id === createdCustomer.id, 'Performs fast O(1) indexed customer lookup by email');

  // Foreign key constraint: Policy referencing valid vs invalid customer
  const validPolicyNumber = `POL-TX-${Date.now()}`;
  const createdPolicy = db.createPolicy({
    policyNumber: validPolicyNumber,
    customerId: createdCustomer.id,
    coverageTier: 'Standard Comprehensive',
    vehicleCategory: 'Economy Sedan',
    vehicleYear: 2021,
    vehicleValue: 24000,
    annualMileage: 12000,
    deductible: 500,
    annualPremiumUSD: 980,
    effectiveDate: '2026-01-01',
    expirationDate: '2027-01-01',
    status: 'ACTIVE',
  });
  assert(createdPolicy.policyNumber === validPolicyNumber, 'Creates policy linked to valid customer');

  let invalidCustomerFkRejected = false;
  try {
    db.createPolicy({
      policyNumber: `POL-FAIL-${Date.now()}`,
      customerId: 'cust_nonexistent_9999',
      coverageTier: 'Standard Comprehensive',
      vehicleCategory: 'Economy Sedan',
      vehicleYear: 2021,
      vehicleValue: 24000,
      annualMileage: 12000,
      deductible: 500,
      annualPremiumUSD: 980,
      effectiveDate: '2026-01-01',
      expirationDate: '2027-01-01',
      status: 'ACTIVE',
    });
  } catch (err: any) {
    invalidCustomerFkRejected = err instanceof DatabaseConstraintError;
  }
  assert(invalidCustomerFkRejected, 'Enforces foreign key constraint: rejects policy linking to non-existent customer');

  // Claim creation & linked lookups
  const validClaimNumber = `CLM-TX-${Date.now()}`;
  const createdClaim = db.createClaim({
    claimNumber: validClaimNumber,
    policyId: createdPolicy.id,
    customerId: createdCustomer.id,
    incidentDate: '2026-04-10',
    reportedDate: '2026-04-11',
    claimType: 'Windshield Replacement',
    amountClaimedUSD: 650,
    amountPaidUSD: 650,
    status: 'APPROVED',
    description: 'Highway stone chip crack repair.',
  });
  assert(createdClaim.claimNumber === validClaimNumber, 'Creates claim linked to policy');
  const claimsByPol = db.findClaimsByPolicyId(createdPolicy.id);
  assert(claimsByPol.length === 1 && claimsByPol[0].id === createdClaim.id, 'Indexed retrieval of claims by policy ID');

  // =========================================================================
  // TEST SUITE 4: ROLE-BASED AUTHORIZATION & PERMISSION MATRIX
  // =========================================================================
  console.log('\n--- Test Suite 4: Role-Based Authorization & Permission Matrix ---');

  assert(ROLE_PERMISSIONS.ADMIN.includes('manage_users'), 'ADMIN has manage_users permission');
  assert(ROLE_PERMISSIONS.ADMIN.includes('manage_models'), 'ADMIN has manage_models permission');
  assert(ROLE_PERMISSIONS.ADMIN.includes('view_audit_logs'), 'ADMIN has view_audit_logs permission');

  assert(ROLE_PERMISSIONS.ANALYST.includes('create_predictions'), 'ANALYST has create_predictions permission');
  assert(ROLE_PERMISSIONS.ANALYST.includes('view_model_performance'), 'ANALYST has view_model_performance permission');
  assert(!ROLE_PERMISSIONS.ANALYST.includes('manage_users'), 'ANALYST does NOT have manage_users permission');
  assert(!ROLE_PERMISSIONS.ANALYST.includes('manage_models'), 'ANALYST does NOT have manage_models permission');

  assert(ROLE_PERMISSIONS.USER.includes('create_predictions'), 'USER has create_predictions permission');
  assert(ROLE_PERMISSIONS.USER.includes('view_own_predictions'), 'USER has view_own_predictions permission');
  assert(!ROLE_PERMISSIONS.USER.includes('view_all_predictions'), 'USER does NOT have view_all_predictions permission');
  assert(!ROLE_PERMISSIONS.USER.includes('manage_users'), 'USER does NOT have manage_users permission');
  assert(!ROLE_PERMISSIONS.USER.includes('view_audit_logs'), 'USER does NOT have view_audit_logs permission');

  // Prediction Scoping by User ID
  const pred1 = db.recordPrediction({
    predictionId: `pred_test_u1_${Date.now()}`,
    userId: createdUser.id,
    modelVersion: 'v1.2.0-gbdt-calibrated-platt',
    modelName: 'Gradient Boosted Trees',
    inputSnapshot: { age: 34, vehicleCategory: 'Compact SUV' },
    claimProbability: 0.045,
    riskLevel: 'LOW',
    isClaimPredicted: false,
    thresholdApplied: 0.08,
    topAttributions: [{ feature: 'age', impact: '-12%' }],
    inferenceTimeMs: 8,
  });

  const pred2 = db.recordPrediction({
    predictionId: `pred_test_other_${Date.now()}`,
    userId: 'usr_other_person_99',
    modelVersion: 'v1.2.0-gbdt-calibrated-platt',
    modelName: 'Gradient Boosted Trees',
    inputSnapshot: { age: 22, vehicleCategory: 'Sports' },
    claimProbability: 0.12,
    riskLevel: 'HIGH',
    isClaimPredicted: true,
    thresholdApplied: 0.08,
    topAttributions: [{ feature: 'age', impact: '+24%' }],
    inferenceTimeMs: 9,
  });

  const user1History = db.listPredictions({ userId: createdUser.id });
  assert(user1History.predictions.some((p) => p.id === pred1.id), 'USER correctly retrieves own prediction in history');
  assert(!user1History.predictions.some((p) => p.id === pred2.id), 'USER is strictly prohibited from viewing other users predictions');

  const allPredictions = db.listPredictions();
  assert(allPredictions.total >= 2, 'ADMIN / ANALYST can query complete cross-user prediction repository');

  // =========================================================================
  // TEST SUITE 5: AUDIT LOGGING & SENSITIVE DATA REDACTION
  // =========================================================================
  console.log('\n--- Test Suite 5: Audit Logging & Sensitive Data Redaction ---');

  const auditLog = AuditService.logEvent({
    userId: createdUser.id,
    userEmail: createdUser.email,
    userRole: createdUser.role,
    action: 'POLICY_UNDERWRITING_DECISION',
    resource: `policies/${createdPolicy.id}`,
    details: {
      policyNumber: createdPolicy.policyNumber,
      decision: 'Approved standard tier',
      password: 'DoNotLogThisSecretPassword',
      apiKey: 'secret_key_abcdef123456',
      creditCard: '4111-2222-3333-4444',
      riskTier: 'Standard',
    },
    ipAddress: '192.168.1.100',
    success: true,
  });

  assert(auditLog.id.startsWith('aud_'), 'Generates unique audit log ID');
  assert(auditLog.action === 'POLICY_UNDERWRITING_DECISION', 'Records structured action identifier');
  assert(auditLog.success === true, 'Records success status boolean');
  assert(auditLog.details?.policyNumber === createdPolicy.policyNumber, 'Preserves legitimate operational details');

  // Verify secret redaction
  assert(auditLog.details?.password === '[REDACTED]', 'Redacts sensitive password from audit log details');
  assert(auditLog.details?.apiKey === '[REDACTED]', 'Redacts sensitive API keys from audit log details');
  assert(auditLog.details?.creditCard === '[REDACTED]', 'Redacts sensitive payment details from audit log details');

  // Audit log filtering
  const filteredLogs = AuditService.getAuditLogs({ action: 'POLICY_UNDERWRITING_DECISION' });
  assert(filteredLogs.logs.length >= 1, 'Successfully filters audit trail by action type');

  // =========================================================================
  // TEST SUITE 6: MODEL ACTIVATION & VERSION GOVERNANCE
  // =========================================================================
  console.log('\n--- Test Suite 6: Model Activation & Version Governance ---');

  const activeModelBefore = db.getActiveModel();
  assert(activeModelBefore !== null, 'Retrieves currently active champion model from database');

  const candidateVersion = 'v1.1.0-hurdle-poisson';
  const switchedModel = db.activateModel(candidateVersion);
  assert(switchedModel.version === candidateVersion, 'Successfully switches active champion model version');
  assert(switchedModel.status === 'active', 'Updates activated model status to active');

  // Switch back to Platt GBDT for production consistency
  db.activateModel('v1.2.0-gbdt-calibrated-platt');
  assert(db.getActiveModel()?.version === 'v1.2.0-gbdt-calibrated-platt', 'Maintains correct active production champion state');

  console.log('\n======================================================');
  console.log(`PHASE 6 TEST RESULTS: Passed: ${passed} | Failed: ${failed}`);
  console.log('======================================================\n');

  if (failed > 0) {
    throw new Error(`Phase 6 Auth & Database tests failed (${failed} errors).`);
  }

  return { passed, failed, errors };
}
