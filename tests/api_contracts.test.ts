import { validatePredictionInput, validateCsvImportInput } from '../src/server/middleware/validateInput';
import { Request, Response } from 'express';

export function runApiContractTests(): { passed: number; failed: number; errors: string[] } {
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

  // Mock Request / Response helper
  function createMockReqRes(body: any): { req: Request; res: Response; statusCode?: number; jsonBody?: any; nextCalled: boolean } {
    let statusCode: number | undefined;
    let jsonBody: any;
    let nextCalled = false;

    const req = { body, headers: {} } as unknown as Request;
    const res = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: any) => {
        jsonBody = data;
        return res;
      },
    } as unknown as Response;

    const next = () => {
      nextCalled = true;
    };

    return { req, res, get statusCode() { return statusCode; }, get jsonBody() { return jsonBody; }, get nextCalled() { return nextCalled; }, next } as any;
  }

  // Test 1: Reject missing input object
  {
    const mock = createMockReqRes({});
    validatePredictionInput(mock.req, mock.res, (mock as any).next);
    assert(mock.statusCode === 400, 'Validation: Missing input object must return HTTP 400');
    assert(!mock.nextCalled, 'Validation: next() must not be called on missing input');
  }

  // Test 2: Reject invalid driver age (< 16)
  {
    const mock = createMockReqRes({ input: { age: 14, annualMileage: 10000, vehicleValue: 20000, priorClaimsLast5Years: 0 } });
    validatePredictionInput(mock.req, mock.res, (mock as any).next);
    assert(mock.statusCode === 400, 'Validation: Underage driver (< 16) must return HTTP 400');
    assert(mock.jsonBody?.field === 'age', 'Validation: Error payload must flag "age" field');
  }

  // Test 3: Reject extreme annual mileage (> 100,000)
  {
    const mock = createMockReqRes({ input: { age: 35, annualMileage: 150000, vehicleValue: 20000, priorClaimsLast5Years: 0 } });
    validatePredictionInput(mock.req, mock.res, (mock as any).next);
    assert(mock.statusCode === 400, 'Validation: Out-of-bounds mileage must return HTTP 400');
    assert(mock.jsonBody?.field === 'annualMileage', 'Validation: Error payload must flag "annualMileage" field');
  }

  // Test 4: Accept valid input object
  {
    const mock = createMockReqRes({
      input: {
        age: 35,
        annualMileage: 12000,
        vehicleValue: 25000,
        priorClaimsLast5Years: 0,
      },
    });
    validatePredictionInput(mock.req, mock.res, (mock as any).next);
    assert(mock.nextCalled, 'Validation: Valid input must call next() without error');
  }

  // Test 5: CSV Import Validation (empty array rejected)
  {
    const mock = createMockReqRes({ newRecords: [] });
    validateCsvImportInput(mock.req, mock.res, (mock as any).next);
    assert(mock.statusCode === 400, 'Validation: Empty CSV import must return HTTP 400');
  }

  // Test 6: CSV Import Validation (valid array accepted)
  {
    const mock = createMockReqRes({ newRecords: [{ id: 'TEST-1' }] });
    validateCsvImportInput(mock.req, mock.res, (mock as any).next);
    assert(mock.nextCalled, 'Validation: Non-empty CSV import must call next()');
  }

  return { passed, failed, errors };
}
