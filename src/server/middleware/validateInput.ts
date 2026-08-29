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

  // Validate Age
  if (typeof input.age !== 'number' || input.age < 16 || input.age > 100) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Driver age must be a number between 16 and 100.',
      field: 'age',
      timestamp: new Date().toISOString(),
    });
  }

  // Validate Annual Mileage
  if (typeof input.annualMileage !== 'number' || input.annualMileage < 500 || input.annualMileage > 100000) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Annual mileage must be a number between 500 and 100,000 miles.',
      field: 'annualMileage',
      timestamp: new Date().toISOString(),
    });
  }

  // Validate Vehicle Value
  if (typeof input.vehicleValue !== 'number' || input.vehicleValue < 500 || input.vehicleValue > 1000000) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Vehicle value must be a number between $500 and $1,000,000.',
      field: 'vehicleValue',
      timestamp: new Date().toISOString(),
    });
  }

  // Validate Prior Claims
  if (typeof input.priorClaimsLast5Years !== 'number' || input.priorClaimsLast5Years < 0 || input.priorClaimsLast5Years > 20) {
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
