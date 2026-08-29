# API Specification & Contract Reference

Base URL: `/api`  
Protocol: HTTP/1.1 JSON REST  
Default Port: `3000`

---

## 1. System Health & Metadata

### `GET /api/health`
Returns service status, model engine version, and active algorithms.

#### Response `200 OK`
```json
{
  "status": "healthy",
  "engine": "Statistical Learning Insurance Claim Platform",
  "version": "2.4.0",
  "environment": "development",
  "modelsLoaded": [
    "glm_logistic_gamma",
    "random_forest",
    "gradient_boosting_tweedie",
    "two_stage_hurdle"
  ],
  "timestamp": "2026-08-28T19:50:00.000Z"
}
```

---

## 2. Statistical Prediction Engine

### `POST /api/predict`
Executes actuarial risk scoring, frequency/severity estimation, confidence intervals, and TreeSHAP attributions.

#### Request Headers
- `Content-Type: application/json`
- `x-correlation-id` (optional): Unique request tracking ID

#### Request Body
```json
{
  "input": {
    "age": 34,
    "drivingExperienceYears": 16,
    "creditScore": 720,
    "creditTier": "good",
    "annualMileage": 12000,
    "vehicleCategory": "sedan",
    "vehicleValue": 28000,
    "vehicleAge": 4,
    "priorClaimsLast5Years": 0,
    "trafficViolationsCount": 0,
    "antiTheftDevice": true,
    "regionalZone": "suburban_metro",
    "driverGender": "female",
    "maritalStatus": "married",
    "deductible": 500,
    "policyTermMonths": 12
  },
  "selectedModel": "gradient_boosting_tweedie"
}
```

#### Response `200 OK`
```json
{
  "modelType": "gradient_boosting_tweedie",
  "modelName": "Gradient Boosted Trees (Tweedie Loss, p=1.5)",
  "claimProbabilityPercent": 5.4,
  "confidenceInterval": [4.1, 6.7],
  "expectedSeverityUSD": 3850,
  "purePremiumUSD": 208,
  "recommendedGrossPremiumUSD": 270,
  "riskTier": "Preferred",
  "underwritingRecommendation": "Approve Standard Terms",
  "shapAttributions": [
    {
      "featureName": "priorClaimsLast5Years",
      "displayName": "Prior Claims (5-Yr)",
      "impactPercent": -2.8,
      "shapValueLogOdds": -0.42,
      "description": "Zero prior claim history yields a substantial downward risk credit."
    }
  ]
}
```

#### Error Responses
- `400 Bad Request`: Input validation failure (e.g., driver age < 16, missing body).
- `500 Internal Server Error`: Statistical engine runtime error.

---

## 3. Benchmark Diagnostics & Datasets

### `GET /api/benchmarks`
Returns model comparison metrics, ROC curves, Lorenz Gini curves, and reliability bins.

#### Response `200 OK`
```json
{
  "models": [
    {
      "id": "gradient_boosting_tweedie",
      "name": "Gradient Boosting (Tweedie p=1.5)",
      "aucRoc": 0.812,
      "normalizedGini": 0.542,
      "brierScore": 0.0682,
      "tweedieDeviance": 0.312,
      "severityRmse": 1120
    }
  ],
  "rocCurves": [...],
  "lorenzGini": [...],
  "calibrationBins": [...],
  "dataProvenance": "Synthetic benchmark calibrated against CAS & French Motor Loss Distributions"
}
```

### `GET /api/dataset`
Retrieves current dataset records, correlation matrices, and zero-inflation statistics.

### `POST /api/dataset/import`
Ingests custom batch records (up to 5,000 items) into the active session store.

---

## 4. Governance & Audit Trails

### `GET /api/audit-logs`
Retrieves immutable log entries of previous underwriting evaluations and decisions.

### `POST /api/audit-logs`
Appends a manual underwriter sign-off or rate surcharge decision to the audit repository.

---

## 5. Qualitative Underwriting Assistant

### `POST /api/ai-underwriting-report`
Invokes server-side Google Gemini 3.7 Flash to draft an executive underwriting memorandum based on statistical model outputs.
*(Falls back to deterministic rule engine if API key is not configured).*
