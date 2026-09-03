import { Request, Response, NextFunction } from 'express';
import { PolicyholderInput } from '../../types';

export function validatePredictionInput(req: Request, res: Response, next: NextFunction) {
  const { input } = req.body as { input?: Partial<PolicyholderInput> };

  if (!input || typeof input !== 'object') {
    return res.status(400).json({
      error: 'Invalid Request Body',
      message: 'A valid policyholder input object is required in request body.',
      timestamp: new Date().toISOString(),
    });
  }

  // Gracefully coerce numeric fields if passed as numeric strings
  if (input.age !== undefined) input.age = Number(input.age);
  if (input.annualMileage !== undefined) input.annualMileage = Number(input.annualMileage);
  if (input.vehicleValue !== undefined) input.vehicleValue = Number(input.vehicleValue);
  if (input.priorClaimsLast5Years !== undefined) input.priorClaimsLast5Years = Number(input.priorClaimsLast5Years);

  // Validate Age
  if (typeof input.age !== 'number' || isNaN(input.age) || input.age < 16 || input.age > 100) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Driver age must be a number between 16 and 100.',
      field: 'age',
      timestamp: new Date().toISOString(),
    });
  }

  // Validate Annual Mileage
  if (typeof input.annualMileage !== 'number' || isNaN(input.annualMileage) || input.annualMileage < 500 || input.annualMileage > 100000) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Annual mileage must be a number between 500 and 100,000 miles.',
      field: 'annualMileage',
      timestamp: new Date().toISOString(),
    });
  }

  // Validate Vehicle Value (with sensible default if omitted)
  if (input.vehicleValue === undefined) {
    input.vehicleValue = 25000;
  } else if (typeof input.vehicleValue !== 'number' || isNaN(input.vehicleValue) || input.vehicleValue < 500 || input.vehicleValue > 1000000) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Vehicle value must be a number between $500 and $1,000,000.',
      field: 'vehicleValue',
      timestamp: new Date().toISOString(),
    });
  }

  // Validate Prior Claims (with sensible default if omitted)
  if (input.priorClaimsLast5Years === undefined) {
    input.priorClaimsLast5Years = 0;
  } else if (typeof input.priorClaimsLast5Years !== 'number' || isNaN(input.priorClaimsLast5Years) || input.priorClaimsLast5Years < 0 || input.priorClaimsLast5Years > 20) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Prior claims count must be a non-negative integer <= 20.',
      field: 'priorClaimsLast5Years',
      timestamp: new Date().toISOString(),
    });
  }

  next();
}

export function validateCsvImportInput(req: Request, res: Response, next: NextFunction) {
  const { newRecords } = req.body;

  if (!Array.isArray(newRecords) || newRecords.length === 0) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'newRecords must be a non-empty array of actuarial dataset records.',
      timestamp: new Date().toISOString(),
    });
  }

  if (newRecords.length > 5000) {
    return res.status(400).json({
      error: 'Payload Too Large',
      message: 'Maximum batch import limit is 5,000 records per upload.',
      timestamp: new Date().toISOString(),
    });
  }

  next();
}
