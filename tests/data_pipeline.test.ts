import {
  runDataEngineeringPipeline,
  validateSingleRecord,
  auditFeatureVectorForTargetLeakage,
  DATA_SCHEMA_SPECS,
  FORBIDDEN_LEAKAGE_FEATURES,
} from '../src/services/dataPipeline';

export function runDataPipelineTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(`FAIL: ${testName}`);
    }
  }

  // 1. Schema Validation & Valid Record Test
  const validRecord = {
    id: 'REC-VALID-1',
    age: 35,
    experience: 15,
    creditScore: 720,
    annualMileage: 12500,
    vehicleType: 'Compact SUV',
    vehicleValue: 28000,
    zone: 'Suburban Moderate',
    priorClaims: 0,
    exposure: 1.0,
    claimOccurred: 0,
    claimAmount: 0,
  };

  const validIssues = validateSingleRecord(validRecord, new Set<string>());
  assert(validIssues.length === 0, 'Valid record must have zero validation issues');

  // 2. Missing Required Field Test
  const missingFieldRecord = { ...validRecord, age: undefined };
  const missingIssues = validateSingleRecord(missingFieldRecord, new Set<string>());
  assert(
    missingIssues.some((i) => i.field === 'age' && i.issueType === 'missing'),
    'Missing required field (age) must be flagged with issueType=missing'
  );

  // 3. Invalid Numerical Range Bounds
  const outOfRangeAgeRecord = { ...validRecord, age: 105 }; // Above maximum 100
  const ageIssues = validateSingleRecord(outOfRangeAgeRecord, new Set<string>());
  assert(
    ageIssues.some((i) => i.field === 'age' && i.issueType === 'invalid_range'),
    'Age above 100 must trigger invalid_range error'
  );

  const outOfRangeCreditRecord = { ...validRecord, creditScore: 920 }; // Above max 850
  const creditIssues = validateSingleRecord(outOfRangeCreditRecord, new Set<string>());
  assert(
    creditIssues.some((i) => i.field === 'creditScore' && i.issueType === 'invalid_range'),
    'Credit score > 850 must trigger invalid_range error'
  );

  // 4. Invalid Categorical Value
  const invalidCategoryRecord = { ...validRecord, vehicleType: 'Flying Rocket Car' };
  const catIssues = validateSingleRecord(invalidCategoryRecord, new Set<string>());
  assert(
    catIssues.some((i) => i.field === 'vehicleType' && i.issueType === 'invalid_category'),
    'Unrecognized vehicle category must trigger invalid_category error'
  );

  // 5. Actuarial Logical Inconsistency (Experience > Age - 15)
  const impossibleExperienceRecord = { ...validRecord, age: 20, experience: 12 };
  const expIssues = validateSingleRecord(impossibleExperienceRecord, new Set<string>());
  assert(
    expIssues.some((i) => i.field === 'experience' && i.issueType === 'logical_inconsistency'),
    'Biological impossibility (20yo with 12yrs driving experience) must be flagged as logical_inconsistency'
  );

  // 6. Target Inconsistency (claimOccurred = 0 but claimAmount > 0)
  const targetConflictRecord1 = { ...validRecord, claimOccurred: 0, claimAmount: 5000 };
  const targetIssues1 = validateSingleRecord(targetConflictRecord1, new Set<string>());
  assert(
    targetIssues1.some((i) => i.field === 'claimAmount' && i.issueType === 'logical_inconsistency'),
    'Target conflict: claimOccurred=0 with claimAmount=$5000 must trigger logical_inconsistency'
  );

  // Target Inconsistency (claimOccurred = 1 but claimAmount = 0)
  const targetConflictRecord2 = { ...validRecord, claimOccurred: 1, claimAmount: 0 };
  const targetIssues2 = validateSingleRecord(targetConflictRecord2, new Set<string>());
  assert(
    targetIssues2.some((i) => i.field === 'claimAmount' && i.issueType === 'logical_inconsistency'),
    'Target conflict: claimOccurred=1 with claimAmount=$0 must trigger logical_inconsistency'
  );

  // 7. Duplicate Detection
  const existingSet = new Set<string>(['REC-VALID-1']);
  const dupIssues = validateSingleRecord(validRecord, existingSet);
  assert(
    dupIssues.some((i) => i.field === 'id' && i.issueType === 'duplicate'),
    'Re-ingesting existing ID must be flagged as duplicate'
  );

  // 8. Target Leakage Checks
  const safeFeatures = ['age', 'experience', 'creditScore', 'annualMileage', 'vehicleType', 'zone', 'priorClaims'];
  const safeAudit = auditFeatureVectorForTargetLeakage(safeFeatures);
  assert(safeAudit.hasLeakage === false && safeAudit.leakedFields.length === 0, 'Safe underwriting features must pass leakage audit');

  const leakedFeatures = ['age', 'experience', 'claim_amount', 'adjuster_notes', 'litigation_status'];
  const leakedAudit = auditFeatureVectorForTargetLeakage(leakedFeatures);
  assert(
    leakedAudit.hasLeakage === true &&
    leakedAudit.leakedFields.includes('claim_amount') &&
    leakedAudit.leakedFields.includes('adjuster_notes') &&
    leakedAudit.leakedFields.includes('litigation_status'),
    'Post-loss fields (claim_amount, adjuster_notes, litigation_status) must be identified as target leakage'
  );

  // 9. Full Pipeline Execution on Mixed Ingested Batch
  const mixedBatch = [
    { ...validRecord, id: 'REC-BATCH-1' },
    { ...validRecord, id: 'REC-BATCH-2', claimOccurred: 1, claimAmount: 3400 },
    { ...missingFieldRecord, id: 'REC-BATCH-3' },
    { ...outOfRangeAgeRecord, id: 'REC-BATCH-4' },
    { ...invalidCategoryRecord, id: 'REC-BATCH-5' },
    { ...impossibleExperienceRecord, id: 'REC-BATCH-6' },
    { ...targetConflictRecord1, id: 'REC-BATCH-7' },
  ];

  const pipelineOutput = runDataEngineeringPipeline(mixedBatch);
  assert(
    pipelineOutput.qualityReport.totalRecordsIngested === 7,
    'Pipeline must ingest all 7 records'
  );
  assert(
    pipelineOutput.cleanDataset.length === 2,
    `Pipeline must cleanly filter down to exactly 2 valid records (got ${pipelineOutput.cleanDataset.length})`
  );
  assert(
    pipelineOutput.qualityReport.recordsWithMissingValues === 1,
    'Quality report must accurately tally 1 missing value record'
  );
  assert(
    pipelineOutput.qualityReport.recordsWithInvalidValues === 2,
    'Quality report must accurately tally 2 invalid value records'
  );
  assert(
    pipelineOutput.qualityReport.recordsWithInconsistencies === 2,
    'Quality report must accurately tally 2 logically inconsistent records'
  );
  assert(
    pipelineOutput.qualityReport.zeroInflationRatePercent === 50.0,
    'Clean dataset with 1 zero and 1 positive claim must reflect 50% zero-inflation rate'
  );

  return { passed, failed, errors };
}
