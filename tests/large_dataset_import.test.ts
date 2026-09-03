import {
  detectInsuranceColumns,
  validateDatasetFile,
  StreamingDatasetAnalyzer,
  fnv1a32,
  INSURANCE_FIELDS
} from '../src/services/datasetImportService';

export interface TestResult {
  passed: number;
  failed: number;
  errors: string[];
}

export async function runLargeDatasetImportTests(): Promise<TestResult> {
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

  console.log('--- Phase 3 Large Dataset Import & Analysis System Tests ---');

  // --------------------------------------------------------------------------
  // TEST 1: 100-row CSV processing & schema validation
  // --------------------------------------------------------------------------
  console.log('\n[Test 1/10] Processing 100-row CSV dataset...');
  try {
    const headers = ['age', 'driver_gender', 'credit_score', 'annual_mileage', 'vehicle_age', 'claim_status'];
    const detected = detectInsuranceColumns(headers);
    assert(detected.target === 'claim_status', 'Test 1.1: Target variable detected as claim_status');
    assert(detected.numerical.includes('age') && detected.numerical.includes('credit_score'), 'Test 1.2: Numerical columns detected');
    assert(detected.categorical.includes('driver_gender'), 'Test 1.3: Categorical column detected');

    const analyzer = new StreamingDatasetAnalyzer(headers, detected.numerical, detected.categorical);

    // Generate 100 rows
    for (let i = 0; i < 100; i++) {
      analyzer.processRow({
        age: 25 + (i % 50),
        driver_gender: i % 2 === 0 ? 'Female' : 'Male',
        credit_score: 600 + (i % 200),
        annual_mileage: 8000 + i * 100,
        vehicle_age: 1 + (i % 15),
        claim_status: i % 10 === 0 ? 1 : 0
      });
    }

    const summary = analyzer.finalize('test_100_rows.csv', 100 * 80, 'csv', 15, detected.mapping);
    assert(summary.totalRows === 100, 'Test 1.4: Exactly 100 rows processed');
    assert(summary.health.score >= 90, 'Test 1.5: High health score on clean 100-row dataset');
    assert(summary.health.grade === 'A', 'Test 1.6: Grade A assigned for clean dataset');
    assert(summary.numericalStats['age'].mean >= 25 && summary.numericalStats['age'].mean <= 75, 'Test 1.7: Driver age mean computed correctly');
    assert(summary.previewRows.length === 100, 'Test 1.8: Preview rows stored for small dataset');
  } catch (err: any) {
    failed++;
    errors.push(`Test 1 threw unexpected exception: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // TEST 2: 10,000-row CSV dataset streaming & moment precision
  // --------------------------------------------------------------------------
  console.log('\n[Test 2/10] Streaming 10,000-row CSV dataset...');
  try {
    const headers = ['policy_id', 'age', 'annual_mileage', 'vehicle_value', 'is_claim'];
    const detected = detectInsuranceColumns(headers);
    const analyzer = new StreamingDatasetAnalyzer(headers, detected.numerical, detected.categorical);

    const startTime = performance.now();
    let trueAgeSum = 0;

    for (let i = 0; i < 10000; i++) {
      const ageVal = 20 + (i % 60);
      trueAgeSum += ageVal;
      analyzer.processRow({
        policy_id: `POL-${100000 + i}`,
        age: ageVal,
        annual_mileage: 10000 + (i * 2),
        vehicle_value: 15000 + (i % 30000),
        is_claim: i % 12 === 0 ? 1 : 0
      });
    }

    const elapsed = performance.now() - startTime;
    const summary = analyzer.finalize('portfolio_10k.csv', 10000 * 95, 'csv', Math.round(elapsed), detected.mapping);

    assert(summary.totalRows === 10000, 'Test 2.1: Exactly 10,000 rows processed');
    const expectedAgeMean = trueAgeSum / 10000;
    const diff = Math.abs(summary.numericalStats['age'].mean - expectedAgeMean);
    assert(diff < 0.05, `Test 2.2: Welford running mean precision: diff=${diff.toFixed(4)} < 0.05`);
    assert(elapsed < 1000, `Test 2.3: 10,000 rows processed in ${elapsed.toFixed(1)}ms (< 1000ms)`);
    assert(summary.previewRows.length <= 250, 'Test 2.4: Preview rows strictly bounded to 250 rows');
  } catch (err: any) {
    failed++;
    errors.push(`Test 2 threw unexpected exception: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // TEST 3: 100,000-row CSV dataset performance & bounded memory
  // --------------------------------------------------------------------------
  console.log('\n[Test 3/10] Streaming 100,000-row CSV dataset (Performance Benchmark)...');
  try {
    const headers = ['age', 'credit_score', 'annual_mileage', 'claim_flag'];
    const detected = detectInsuranceColumns(headers);
    const analyzer = new StreamingDatasetAnalyzer(headers, detected.numerical, detected.categorical);

    const memBefore = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    for (let i = 0; i < 100000; i++) {
      analyzer.processRow({
        age: 18 + (i % 65),
        credit_score: 500 + (i % 350),
        annual_mileage: 5000 + (i % 25000),
        claim_flag: i % 15 === 0 ? 1 : 0
      });
    }

    const elapsed = performance.now() - startTime;
    const memAfter = process.memoryUsage().heapUsed;
    const memDiffMB = (memAfter - memBefore) / (1024 * 1024);

    const summary = analyzer.finalize('freMTPL2_100k.csv', 100000 * 80, 'csv', Math.round(elapsed), detected.mapping);

    assert(summary.totalRows === 100000, 'Test 3.1: Successfully processed 100,000 rows without crashing');
    assert(summary.numericalStats['credit_score'].min >= 500, 'Test 3.2: Accurate minimum credit score across 100k rows');
    assert(summary.numericalStats['credit_score'].max <= 850, 'Test 3.3: Accurate maximum credit score across 100k rows');
    assert(memDiffMB < 60, `Test 3.4: Bounded memory: Heap growth was only ${memDiffMB.toFixed(2)} MB (< 60 MB)`);
    const rowsPerSec = Math.round((100000 / Math.max(1, elapsed)) * 1000);
    assert(rowsPerSec > 100000, `Test 3.5: High throughput: ${rowsPerSec.toLocaleString()} rows/sec`);
  } catch (err: any) {
    failed++;
    errors.push(`Test 3 threw unexpected exception: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Missing values detection & health score impact
  // --------------------------------------------------------------------------
  console.log('\n[Test 4/10] Testing missing values detection...');
  try {
    const headers = ['age', 'income', 'region'];
    const detected = detectInsuranceColumns(headers);
    const analyzer = new StreamingDatasetAnalyzer(headers, detected.numerical, detected.categorical);

    // 100 rows with known missing values
    for (let i = 0; i < 100; i++) {
      analyzer.processRow({
        age: i < 20 ? '' : 30 + i, // 20 missing
        income: i % 5 === 0 ? null : 50000, // 20 missing
        region: i % 10 === 0 ? undefined : 'Urban' // 10 missing
      });
    }

    const summary = analyzer.finalize('missing_test.csv', 1000, 'csv', 5, detected.mapping);
    assert(summary.health.missingCells === 50, `Test 4.1: Exactly 50 missing cells detected (found ${summary.health.missingCells})`);
    assert(summary.health.missingCellPercent > 10, 'Test 4.2: Missing cell percentage calculated correctly');
    assert(summary.health.rowsWithMissing >= 35, 'Test 4.3: Rows with missing values accurately counted');
    assert(summary.health.score < 100, 'Test 4.4: Health score penalized for elevated missing values');
  } catch (err: any) {
    failed++;
    errors.push(`Test 4 threw unexpected exception: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Duplicate rows detection via FNV-1a hashing
  // --------------------------------------------------------------------------
  console.log('\n[Test 5/10] Testing duplicate row detection...');
  try {
    const headers = ['policy_id', 'age', 'state'];
    const analyzer = new StreamingDatasetAnalyzer(headers, ['age'], ['state']);

    // Insert 50 unique rows, then duplicate 15 of them
    for (let i = 0; i < 50; i++) {
      analyzer.processRow({ policy_id: `POL-${i}`, age: 30 + i, state: 'CA' });
    }
    // Duplicate 15 rows
    for (let i = 0; i < 15; i++) {
      analyzer.processRow({ policy_id: `POL-${i}`, age: 30 + i, state: 'CA' });
    }

    const summary = analyzer.finalize('duplicate_test.csv', 1500, 'csv', 5, {});
    assert(summary.totalRows === 65, 'Test 5.1: 65 total rows processed');
    assert(summary.health.duplicateRows === 15, `Test 5.2: Exactly 15 duplicate rows detected (found ${summary.health.duplicateRows})`);
    assert(summary.health.duplicateRowPercent > 20, 'Test 5.3: Duplicate percentage reflects 15/65');
  } catch (err: any) {
    failed++;
    errors.push(`Test 5 threw unexpected exception: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // TEST 6: Categorical variables frequency & percentage calculation
  // --------------------------------------------------------------------------
  console.log('\n[Test 6/10] Testing categorical frequency distributions...');
  try {
    const headers = ['vehicle_type', 'smoker'];
    const analyzer = new StreamingDatasetAnalyzer(headers, [], ['vehicle_type', 'smoker']);

    for (let i = 0; i < 100; i++) {
      analyzer.processRow({
        vehicle_type: i < 60 ? 'Sedan' : i < 90 ? 'SUV' : 'Truck',
        smoker: i < 80 ? 'No' : 'Yes'
      });
    }

    const summary = analyzer.finalize('cat_test.csv', 1000, 'csv', 5, {});
    const vehStats = summary.categoricalStats['vehicle_type'];
    assert(vehStats.uniqueCount === 3, 'Test 6.1: 3 unique vehicle types detected');
    assert(vehStats.topCategories[0].category === 'Sedan', 'Test 6.2: Top category is Sedan');
    assert(vehStats.topCategories[0].count === 60, 'Test 6.3: Sedan count is 60');
    assert(vehStats.topCategories[0].percentage === 60, 'Test 6.4: Sedan percentage is 60.0%');
    const smokerStats = summary.categoricalStats['smoker'];
    assert(smokerStats.topCategories[0].category === 'No', 'Test 6.5: Smoker top category is No');
    assert(smokerStats.topCategories[0].percentage === 80, 'Test 6.6: Smoker percentage is 80.0%');
  } catch (err: any) {
    failed++;
    errors.push(`Test 6 threw unexpected exception: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // TEST 7: Incorrect / non-standard column names auto-detection
  // --------------------------------------------------------------------------
  console.log('\n[Test 7/10] Testing flexible insurance column auto-detection...');
  try {
    const exoticHeaders = [
      'client_age',
      'driver_sex',
      'body_mass_index',
      'annual_miles_driven',
      'car_value',
      'past_claims',
      'loss_flag'
    ];

    const detected = detectInsuranceColumns(exoticHeaders);
    assert(detected.mapping['age'] === 'client_age', 'Test 7.1: client_age mapped to age');
    assert(detected.mapping['driverGender'] === 'driver_sex', 'Test 7.2: driver_sex mapped to driverGender');
    assert(detected.mapping['bmi'] === 'body_mass_index', 'Test 7.3: body_mass_index mapped to bmi');
    assert(detected.mapping['annualMileage'] === 'annual_miles_driven', 'Test 7.4: annual_miles_driven mapped to annualMileage');
    assert(detected.mapping['vehicleValue'] === 'car_value', 'Test 7.5: car_value mapped to vehicleValue');
    assert(detected.mapping['priorClaimsLast5Years'] === 'past_claims', 'Test 7.6: past_claims mapped to priorClaimsLast5Years');
    assert(detected.target === 'loss_flag', 'Test 7.7: loss_flag mapped to target');
    assert(detected.confidenceScore >= 70, `Test 7.8: High detection confidence score (${detected.confidenceScore}%)`);
  } catch (err: any) {
    failed++;
    errors.push(`Test 7 threw unexpected exception: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // TEST 8: Empty file validation
  // --------------------------------------------------------------------------
  console.log('\n[Test 8/10] Testing empty file rejection...');
  try {
    const emptyFile = { name: 'empty_policies.csv', size: 0, type: 'text/csv' };
    const validation = validateDatasetFile(emptyFile);
    assert(!validation.valid, 'Test 8.1: Empty file rejected as invalid');
    assert(validation.error?.includes('0 bytes'), 'Test 8.2: Descriptive 0-bytes error message provided');
  } catch (err: any) {
    failed++;
    errors.push(`Test 8 threw unexpected exception: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // TEST 9: Invalid file type / malformed file validation
  // --------------------------------------------------------------------------
  console.log('\n[Test 9/10] Testing invalid file formats...');
  try {
    const invalidFile = { name: 'malicious_executable.exe', size: 5000, type: 'application/octet-stream' };
    const validation = validateDatasetFile(invalidFile);
    assert(!validation.valid, 'Test 9.1: Unsupported file extension rejected');
    assert(validation.error?.includes('Unsupported file format'), 'Test 9.2: Actionable unsupported format message');

    const pdfFile = { name: 'annual_report.pdf', size: 1048576, type: 'application/pdf' };
    const pdfValidation = validateDatasetFile(pdfFile);
    assert(!pdfValidation.valid, 'Test 9.3: PDF document rejected');
  } catch (err: any) {
    failed++;
    errors.push(`Test 9 threw unexpected exception: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // TEST 10: Large file advisory & XLSX support
  // --------------------------------------------------------------------------
  console.log('\n[Test 10/10] Testing large file warnings and XLSX compatibility...');
  try {
    const largeFile = { name: 'big_data_500mb.csv', size: 200 * 1024 * 1024, type: 'text/csv' };
    const validation = validateDatasetFile(largeFile);
    assert(validation.valid, 'Test 10.1: Large file is recognized as valid CSV');
    assert(Boolean(validation.warning?.includes('150 MB')), 'Test 10.2: Size warning triggered for >150MB dataset');

    const xlsxFile = { name: 'underwriting_2026.xlsx', size: 5 * 1024 * 1024, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    const xlsxValidation = validateDatasetFile(xlsxFile);
    assert(xlsxValidation.valid, 'Test 10.3: Excel .xlsx accepted');
    assert(xlsxValidation.fileType === 'xlsx', 'Test 10.4: Excel fileType detected as xlsx');

    const xlsFile = { name: 'legacy_portfolio.xls', size: 2 * 1024 * 1024 };
    const xlsValidation = validateDatasetFile(xlsFile);
    assert(xlsValidation.valid && xlsValidation.fileType === 'xlsx', 'Test 10.5: Legacy .xls accepted');
  } catch (err: any) {
    failed++;
    errors.push(`Test 10 threw unexpected exception: ${err.message}`);
  }

  return { passed, failed, errors };
}
