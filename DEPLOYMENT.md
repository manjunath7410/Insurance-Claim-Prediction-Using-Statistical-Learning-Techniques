# Production Deployment & Operations Guide
**Platform:** Insurance Claim Prediction & Actuarial Risk Intelligence Platform  
**Target Environment:** Google Cloud Run / Node.js 18+  
**Architecture:** Full-Stack (Vite React 19 Frontend + Express TypeScript CommonJS Backend)

---

## 1. Prerequisites

Before deploying to production, ensure the following prerequisites are met:
- **Runtime Environment:** Node.js >= 18.0.0 (or Google Cloud Run Container)
- **Ingress Port:** `PORT=3000` (Bound to `0.0.0.0:3000`)
- **Package Manager:** npm >= 9.0.0
- **Cloud Project:** Google Cloud Project with Cloud Run and Gemini API enabled
- **Secrets Management:** Cloud Secret Manager or AI Studio Settings panel

---

## 2. Environment Variables & Secret Configuration

The platform strictly separates secrets from client-side bundles. Secrets must **never** be prefixed with `VITE_` and are only accessed in the Express backend.

### Environment Variable Matrix

| Variable Name | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `PORT` | **Yes** | `3000` | Ingress listening port (hardcoded to 3000 in Cloud Run) |
| `NODE_ENV` | **Yes** | `production` | Runtime mode (`production` enables optimized bundle serving) |
| `GEMINI_API_KEY` | Optional | `undefined` | Google Gemini API key for natural language explanations & dossiers |
| `APP_URL` | Optional | `http://0.0.0.0:3000` | Canonical external URL for links and CORS origins |

### Secret Invariants
- `.env` and `.env.local` files are ignored by `.gitignore`.
- Template documentation is maintained in `.env.example`.
- In AI Studio, `GEMINI_API_KEY` is injected securely into the server container via the Settings/Secrets UI.

---

## 3. Database Architecture & Setup

The platform utilizes a modular, zero-dependency transactional storage engine with support for pluggable cloud database adapters:
- **Default Storage Engine:** In-memory indexed ACID transaction store with LRU caching, audit trail indexing, and seeded historical policy sets.
- **Model Registry State:** Immutable model artifacts stored with version hashes and promotion lifecycle states.
- **Pluggable Persistence:** Extensible database interface (`db.ts`) with native adapters for Cloud SQL / Firestore if multi-node distributed synchronization is required.

---

## 4. Build Commands & Compilation

The project uses a unified single-command production compilation workflow:

```bash
# 1. Type check and lint validation
npm run lint

# 2. Execute full production test suite (All 13 test phases)
npm test

# 3. Compile client SPA and bundle backend into self-contained CommonJS binary
npm run build
```

### Build Output Verification
- `dist/index.html`: Client-side single page application entry point
- `dist/assets/`: Minified, cache-busted CSS and JS chunks
- `dist/server.cjs`: Self-contained, bundled backend server with external npm dependencies resolved

---

## 5. Deployment Commands (Google Cloud Run)

### Option A: AI Studio Native Deployment
Deployments via Google AI Studio automatically package the container, inject `GEMINI_API_KEY` from the user secrets vault, and route ingress to port 3000.

### Option B: Cloud Run Direct Deploy (gcloud CLI)

```bash
# Build container image with Google Cloud Build
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/insurance-claim-predictor:v1.2.0

# Deploy to Cloud Run service
gcloud run deploy insurance-claim-predictor \
  --image gcr.io/YOUR_PROJECT_ID/insurance-claim-predictor:v1.2.0 \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars NODE_ENV=production \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

---

## 6. Health-Check & Smoke Testing Procedure

### Automated Health Verification Endpoint

```http
GET /api/health
```

**Expected JSON Response:**
```json
{
  "status": "healthy",
  "uptimeSeconds": 1420,
  "engine": "Actuarial ML Risk Intelligence Platform",
  "version": "2.4.0",
  "environment": "production",
  "activeModelVersion": "v1.2.0-gbdt-calibrated-platt",
  "isModelRegistryReady": true,
  "registeredModelsCount": 4,
  "timestamp": "2026-08-30T02:55:00.000Z"
}
```

### Critical Smoke Tests Checklist
1. **Health Verification:** `curl -f http://localhost:3000/api/health` returns HTTP 200 with `"status": "healthy"`.
2. **Model Evaluation:** `POST /api/predict` returns probability $\in [0, 1]$, risk tier, and decomposed SHAP attributions.
3. **Analytics Dashboard:** `GET /api/analytics/dashboard` returns portfolio KPIs, risk distributions, and correlation matrices.
4. **AI Explainability:** `POST /api/explain` returns executive summaries with automatic circuit breaker fallback on quota exhaustion.
5. **RBAC Authorization:** Unauthenticated modifications to model registries return HTTP 401/403.

---

## 7. Rollback & Version Governance Procedure

The platform supports zero-downtime model rollbacks without redeploying container images:

```bash
# Promote prior stable model version via Actuary/Admin credentials
curl -X POST http://localhost:3000/api/models/v1.1.0-hurdle-poisson/promote \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

### Container Image Rollback
If a infrastructure regression occurs, instantly roll back Cloud Run traffic:
```bash
gcloud run services update-traffic insurance-claim-predictor --to-revisions=PREVIOUS_REVISION=100
```

---

## 8. Monitoring & Observability

- **Structured Correlation IDs:** Every HTTP transaction generates a unique `x-correlation-id` header for end-to-end request tracing.
- **Audit Logging:** Every critical underwriting decision and model lifecycle transition is committed to the immutable audit trail.
- **Circuit Breaker Telemetry:** Gemini API rate limits (`429`) trigger an automated 60-second cooldown window, seamlessly falling back to deterministic actuarial rule synthesis.

---

## 9. Troubleshooting & Recovery

| Issue / Symptom | Root Cause | Resolution |
| :--- | :--- | :--- |
| **HTTP 429 Quota Exceeded on `/api/explain`** | Gemini API free-tier rate limit reached. | System automatically enters 60s circuit breaker; deterministic rule-based actuarial engine generates valid explanations without failure. |
| **HTTP 400 Validation Error** | Invalid policyholder input vector (e.g. driving experience > age - 16). | Input rejected by strict Zod schema; inspect error response details for field violations. |
| **HTTP 403 Forbidden** | User lacks required role for administrative action. | Verify JWT token claims (e.g. `ADMIN` role required for model promotion). |
| **Container Port Ingress Failure** | Server not listening on 0.0.0.0:3000. | Verify `server.ts` binds to host `0.0.0.0` and port `3000`. |

---

## 10. Deployed Architecture Summary

```
+-------------------------------------------------------------------------------+
|                             CLIENT APPLICATION                                |
|  - React 19 + TypeScript + Vite Single Page Application (SPA)                 |
|  - Tailwind CSS + Lucide Icons + Recharts Actuarial Visualizations            |
|  - Underwriting Console • Risk Stratification • SHAP Attribution Waterfall    |
+---------------------------------------+---------------------------------------+
                                        | (HTTPS / Port 3000)
+---------------------------------------v---------------------------------------+
|                      EXPRESS BACKEND & REST API SERVER                        |
|  - Security Middleware: X-Content-Type, Referrer-Policy, Rate Limiting        |
|  - Request Logging & Correlation ID Tracing                                   |
|  - Role-Based Access Control (RBAC): Admin, Actuary, Underwriter, Viewer      |
+-------------------+-------------------+-------------------+-------------------+
                    |                   |                   |
+-------------------v---+   +-----------v-------+   +-------v-------------------+
|  ACTUARIAL ML ENGINE  |   |  GEMINI AI & NLP  |   |  DATA & AUDIT PERSISTENCE |
|  - Platt Calibration  |   |  - Gemini 3.7     |   |  - Transactional Store    |
|  - Tweedie GBDT       |   |  - 60s Circuit    |   |  - Model Registry DB      |
|  - Two-Stage Hurdle   |   |    Breaker Cooldown|  |  - Immutable Audit Logs   |
|  - SHAP Tree Kernel   |   |  - Actuarial Rule |   |  - PII Scrubbing Engine   |
|  - Expected Severity  |   |    Fallback Engine|   |                           |
+-----------------------+   +-------------------+   +---------------------------+
```
