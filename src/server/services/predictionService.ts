/**
 * Actuarial Prediction Service Layer
 * Phase 5: Backend & Prediction API
 * 
 * Enforces:
 * 1. Schema normalization and boundary validation
 * 2. Exact production preprocessing pipeline application
 * 3. Versioned model retrieval from registry abstraction
 * 4. Calibrated probability calculation
 * 5. Risk threshold evaluation & tier classification
 * 6. Structured attribution factor generation
 */

import { ApiPredictionResponse, ActuarialDatasetRecord } from '../../types';
import { modelRegistry } from './modelRegistry';
import crypto from 'crypto';

export interface NormalizedPolicyholderInput {
  age: number;
  drivingExperienceYears: number;
  creditScore: number;
  annualMileage: number;
  vehicleValue: number;
  vehicleAge: number;
  vehicleType: string;
  regionalZone: string;
  priorClaims: number;
  exposure: number;
  deductible: number;
  coverageTier: string;
}

export class ValidationError extends Error {
  public fieldErrors: Array<{ field: string; message: string; constraint: string }>;
  public statusCode: number;

  constructor(fieldErrors: Array<{ field: string; message: string; constraint: string }>) {
    super('Validation Error: The submitted request contains missing, invalid, or out-of-bounds parameters.');
    this.name = 'ValidationError';
    this.statusCode = 422;
    this.fieldErrors = fieldErrors;
  }
}

export class PredictionService {
  /**
   * Normalizes raw request payload (supporting both camelCase and snake_case)
   * and enforces strict actuarial validation boundaries.
   */
  public normalizeAndValidateInput(raw: any): NormalizedPolicyholderInput {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new ValidationError([
        {
          field: 'body',
          message: 'Request payload must be a non-empty JSON object.',
          constraint: 'object',
        },
      ]);
    }

    const errors: Array<{ field: string; message: string; constraint: string }> = [];

    // Helper to extract by alias
    const getVal = (...keys: string[]): any => {
      for (const k of keys) {
        if (raw[k] !== undefined && raw[k] !== null) return raw[k];
      }
      return undefined;
    };

    // 1. Driver Age (Required: 16 to 100)
    const rawAge = getVal('age', 'driver_age', 'driverAge');
    let age = Number(rawAge);
    if (rawAge === undefined || rawAge === '') {
      errors.push({ field: 'age', message: 'Driver age is required.', constraint: 'required' });
    } else if (typeof rawAge === 'boolean' || isNaN(age) || !Number.isInteger(age)) {
      errors.push({ field: 'age', message: 'Driver age must be a valid integer.', constraint: 'integer' });
    } else if (age < 16 || age > 100) {
      errors.push({ field: 'age', message: 'Driver age must be between 16 and 100 years.', constraint: '16 <= age <= 100' });
    }

    // 2. Annual Mileage (Required: 500 to 100,000)
    const rawMileage = getVal('annualMileage', 'annual_mileage', 'mileage');
    let annualMileage = Number(rawMileage);
    if (rawMileage === undefined || rawMileage === '') {
      errors.push({ field: 'annualMileage', message: 'Annual mileage is required.', constraint: 'required' });
    } else if (typeof rawMileage === 'boolean' || isNaN(annualMileage)) {
      errors.push({ field: 'annualMileage', message: 'Annual mileage must be a valid number.', constraint: 'numeric' });
    } else if (annualMileage < 500 || annualMileage > 100000) {
      errors.push({
        field: 'annualMileage',
        message: 'Annual mileage must be between 500 and 100,000 miles.',
        constraint: '500 <= annualMileage <= 100000',
      });
    }

    // 3. Vehicle Value (Required: $500 to $1,000,000)
    const rawValue = getVal('vehicleValue', 'vehicle_value', 'carValue');
    let vehicleValue = Number(rawValue);
    if (rawValue === undefined || rawValue === '') {
      errors.push({ field: 'vehicleValue', message: 'Vehicle value is required.', constraint: 'required' });
    } else if (typeof rawValue === 'boolean' || isNaN(vehicleValue)) {
      errors.push({ field: 'vehicleValue', message: 'Vehicle value must be a valid number.', constraint: 'numeric' });
    } else if (vehicleValue < 500 || vehicleValue > 1000000) {
      errors.push({
        field: 'vehicleValue',
        message: 'Vehicle value must be between $500 and $1,000,000.',
        constraint: '500 <= vehicleValue <= 1000000',
      });
    }

    // 4. Prior Claims (Optional or Required: 0 to 20)
    const rawClaims = getVal('priorClaims', 'prior_claims', 'priorClaimsLast5Years');
    let priorClaims = rawClaims !== undefined ? Number(rawClaims) : 0;
    if (rawClaims !== undefined) {
      if (typeof rawClaims === 'boolean' || isNaN(priorClaims) || !Number.isInteger(priorClaims)) {
        errors.push({ field: 'priorClaims', message: 'Prior claims count must be an integer.', constraint: 'integer' });
      } else if (priorClaims < 0 || priorClaims > 20) {
        errors.push({
          field: 'priorClaims',
          message: 'Prior claims must be between 0 and 20 incidents.',
          constraint: '0 <= priorClaims <= 20',
        });
      }
    }

    // 5. Credit Score (Optional/Defaults to 680: 300 to 850)
    const rawCredit = getVal('creditScore', 'credit_score', 'credit');
    let creditScore = rawCredit !== undefined ? Number(rawCredit) : 680;
    if (rawCredit !== undefined) {
      if (typeof rawCredit === 'boolean' || isNaN(creditScore) || !Number.isInteger(creditScore)) {
        errors.push({ field: 'creditScore', message: 'Credit score must be an integer.', constraint: 'integer' });
      } else if (creditScore < 300 || creditScore > 850) {
        errors.push({
          field: 'creditScore',
          message: 'Credit score must be between 300 and 850.',
          constraint: '300 <= creditScore <= 850',
        });
      }
    }

    // 6. Driving Experience (Optional/Defaults to age - 18)
    const rawExp = getVal('drivingExperienceYears', 'driving_experience_years', 'experience');
    let drivingExperienceYears = rawExp !== undefined ? Number(rawExp) : Math.max(0, age - 18);
    if (rawExp !== undefined) {
      if (typeof rawExp === 'boolean' || isNaN(drivingExperienceYears) || !Number.isInteger(drivingExperienceYears)) {
        errors.push({
          field: 'drivingExperienceYears',
          message: 'Driving experience must be an integer.',
          constraint: 'integer',
        });
      } else if (drivingExperienceYears < 0 || drivingExperienceYears > 80) {
        errors.push({
          field: 'drivingExperienceYears',
          message: 'Driving experience must be between 0 and 80 years.',
          constraint: '0 <= drivingExperienceYears <= 80',
        });
      } else if (!isNaN(age) && drivingExperienceYears > Math.max(0, age - 16)) {
        errors.push({
          field: 'drivingExperienceYears',
          message: `Driving experience (${drivingExperienceYears} yrs) cannot exceed driver age minus legal minimum driving age (${age - 16} yrs).`,
          constraint: 'drivingExperienceYears <= age - 16',
        });
      }
    }

    // 7. Vehicle Age (Optional: 0 to 40)
    const rawVehAge = getVal('vehicleAge', 'vehicle_age');
    let vehicleAge = rawVehAge !== undefined ? Number(rawVehAge) : 4;
    if (rawVehAge !== undefined) {
      if (typeof rawVehAge === 'boolean' || isNaN(vehicleAge) || !Number.isInteger(vehicleAge)) {
        errors.push({ field: 'vehicleAge', message: 'Vehicle age must be an integer.', constraint: 'integer' });
      } else if (vehicleAge < 0 || vehicleAge > 40) {
        errors.push({
          field: 'vehicleAge',
          message: 'Vehicle age must be between 0 and 40 years.',
          constraint: '0 <= vehicleAge <= 40',
        });
      }
    }

    // 8. Vehicle Type / Category Normalization
    const rawType = String(getVal('vehicleType', 'vehicle_type', 'vehicleCategory') || 'Economy Sedan').trim();
    let vehicleType = 'Economy Sedan';
    if (rawType.toLowerCase().includes('suv')) vehicleType = 'Compact SUV';
    else if (rawType.toLowerCase().includes('truck') || rawType.toLowerCase().includes('electric')) vehicleType = 'Heavy Truck / Electric';
    else if (rawType.toLowerCase().includes('van')) vehicleType = 'Commercial Van';
    else if (rawType.toLowerCase().includes('coupe') || rawType.toLowerCase().includes('sport') || rawType.toLowerCase().includes('luxury')) vehicleType = 'Luxury / Sports';
    else vehicleType = 'Economy Sedan';

    // 9. Regional Zone Normalization
    const rawZone = String(getVal('regionalZone', 'regional_zone', 'zone') || 'Suburban Moderate').trim();
    let regionalZone = 'Suburban Moderate';
    if (rawZone.toLowerCase().includes('metro') || rawZone.toLowerCase().includes('congestion')) {
      regionalZone = 'Metro High-Congestion';
    } else if (rawZone.toLowerCase().includes('suburban')) {
      regionalZone = 'Suburban Moderate';
    } else if (rawZone.toLowerCase().includes('urban') || rawZone.toLowerCase().includes('city')) {
      regionalZone = 'Urban Dense';
    } else if (rawZone.toLowerCase().includes('rural') || rawZone.toLowerCase().includes('country')) {
      regionalZone = 'Rural Low-Risk';
    } else {
      regionalZone = 'Suburban Moderate';
    }

    // 10. Deductible & Coverage Tier & Exposure
    const rawDeductible = getVal('deductible');
    let deductible = rawDeductible !== undefined ? Number(rawDeductible) : 500;
    if (rawDeductible !== undefined) {
      if (typeof rawDeductible === 'boolean' || isNaN(deductible) || deductible < 0 || deductible > 10000) {
        errors.push({
          field: 'deductible',
          message: 'Deductible must be a number between $0 and $10,000.',
          constraint: '0 <= deductible <= 10000',
        });
      }
    }

    const rawExposure = getVal('exposure', 'annualExposure', 'annual_exposure');
    let exposure = rawExposure !== undefined ? Number(rawExposure) : 1.0;
    if (rawExposure !== undefined) {
      if (typeof rawExposure === 'boolean' || isNaN(exposure) || exposure < 0.05 || exposure > 5.0) {
        errors.push({
          field: 'exposure',
          message: 'Policy annual exposure must be between 0.05 and 5.0 policy-years.',
          constraint: '0.05 <= exposure <= 5.0',
        });
      }
    }

    const coverageTier = String(getVal('coverageTier', 'coverage_tier') || 'Standard Comprehensive').trim();

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    return {
      age,
      drivingExperienceYears,
      creditScore,
      annualMileage,
      vehicleValue,
      vehicleAge,
      vehicleType,
      regionalZone,
      priorClaims,
      exposure,
      deductible,
      coverageTier,
    };
  }

  /**
   * Generates a calibrated prediction through the versioned model pipeline.
   */
  public generatePrediction(rawInput: any, requestedModelVersion?: string): ApiPredictionResponse {
    const startTime = Date.now();

    // 1. Input Normalization & Validation
    const normalized = this.normalizeAndValidateInput(rawInput);

    // 2. Fetch Model from Registry Abstraction
    const model = modelRegistry.getModel(requestedModelVersion);

    // 3. Construct Actuarial Feature Record for Preprocessor
    const recordToEvaluate: Partial<ActuarialDatasetRecord> = {
      age: normalized.age,
      experience: normalized.drivingExperienceYears,
      creditScore: normalized.creditScore,
      annualMileage: normalized.annualMileage,
      vehicleValue: normalized.vehicleValue,
      vehicleType: normalized.vehicleType,
      zone: normalized.regionalZone,
      priorClaims: normalized.priorClaims,
      exposure: normalized.exposure,
    };

    // 4. Model Prediction & Probability Calibration
    const predictionResult = model.predict(recordToEvaluate);
    const probability = predictionResult.calibratedProbability;
    const threshold = model.info.decisionThreshold;

    // 5. Binary Claim Decision & Risk Tier Assignment
    const isClaimPredicted = probability >= threshold;
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

    if (probability < 0.04) {
      riskLevel = 'LOW';
    } else if (probability < threshold) {
      riskLevel = 'MEDIUM';
    } else if (probability < 0.18) {
      riskLevel = 'HIGH';
    } else {
      riskLevel = 'VERY_HIGH';
    }

    // 6. Generate Unique Traceable Prediction Identifier
    const randomHex = crypto.randomBytes(4).toString('hex');
    const predictionId = `pred_act_${Date.now()}_${randomHex}`;
    const latencyMs = Date.now() - startTime;

    return {
      predictionId,
      probability,
      riskLevel,
      isClaimPredicted,
      thresholdApplied: threshold,
      modelName: model.info.modelName,
      modelVersion: model.info.version,
      timestamp: new Date().toISOString(),
      topContributingFactors: predictionResult.topFactors,
      metadata: {
        latencyMs,
        calibrationMethod: model.info.calibrationMethod,
        normalizedInput: normalized,
      },
    };
  }
}

export const predictionService = new PredictionService();
