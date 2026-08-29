# Insurance Claim Prediction & Risk Intelligence Platform

An actuarial-grade statistical learning platform and underwriting risk intelligence application. Engineered to compute insurance claim frequency ($P(\text{Claim})$), expected severity ($E[Y \mid Y > 0]$), and pure premiums ($\text{Pure Premium} = P \times \text{Severity} \times \text{Exposure}$) with mathematical rigor, TreeSHAP explainability, and regulatory governance.

---

## Key Capabilities

1. **Deterministic Statistical & ML Inference**
   - **Tweedie Compound Poisson-Gamma GBDT**: Direct optimization of pure risk premium ($1 < p < 2$) addressing aggregate loss zero-inflation.
   - **Two-Stage Hurdle Model**: Bernoulli zero-claim probability $\times$ Truncated Gamma loss severity.
   - **Generalized Linear Models (GLMs)**: Logistic link (occurrence) and Log Gamma link (severity).
   - **Random Forest**: Smoothed bagging ensemble for non-linear claim risk benchmarking.

2. **Explainability & Actuarial Diagnostic Suite**
   - **TreeSHAP Additive Attribution**: Individual feature contributions decomposition with local efficiency guarantees ($\sum \phi_i = f(x) - E[f(x)]$).
   - **Discrimination & Calibration Curves**: ROC Analysis, Lorenz Curves with Normalized Gini Indices ($G = 1 - 2 \int L(u)du$), and Brier Score reliability bins.

3. **Qualitative Underwriting Assistant (Google Gemini 3.7 Flash)**
   - Strictly isolated server-side for natural language underwriting memorandum generation.
   - **Never** computes or alters quantitative claim risk predictions or pricing rates.

4. **Data Governance & Auditability**
   - Immutable audit logging for underwriter reviews, pricing overrides, and surcharge endorsements.
   - Synthetic benchmark datasets calibrated against Casualty Actuarial Society (CAS) and French Motor Third-Party Liability distributions.
   - Custom CSV portfolio ingestion and correlation analysis.

---

## Project Structure

```
├── .env.example                     # Environment configuration specification
├── ARCHITECTURE.md                  # System architecture, statistical theory & design
├── DATA_DICTIONARY.md               # Feature definitions, types & valid ranges
├── MODEL_CARD.md                    # Machine learning model cards & governance
├── API.md                           # REST API endpoint specifications & contracts
├── SECURITY.md                      # Security boundaries, anti-leakage & threat model
├── package.json                     # Node.js/TypeScript configuration & scripts
├── server.ts                        # Production Express entry point
├── ml/                              # Python Machine Learning Pipeline
│   ├── requirements.txt             # Python dependencies
│   ├── preprocessing.py             # Feature pipeline & exposure offset calculation
│   ├── tweedie_gbdt.py              # Tweedie deviance loss & GBDT specification
│   ├── hurdle_model.py              # Two-stage actuarial hurdle model
│   ├── evaluate_metrics.py          # Gini, Lorenz & Brier score calculations
│   └── train_pipeline.py            # Reproducible reference training script
├── src/
│   ├── server/                      # Modular backend API architecture
│   │   ├── config.ts                # Environment configuration loader
│   │   ├── logger.ts                # Structured JSON & console logger
│   │   ├── middleware/              # Input validation & centralized error handler
│   │   └── routes/api.ts            # Typed REST API endpoints
│   ├── components/                  # React UI components & visualizers
│   ├── services/                    # Client-side statistical calculation kernels
│   ├── data/                        # Benchmark datasets & distributions
│   └── types.ts                     # TypeScript type definitions
└── tests/                           # Automated test suites
    ├── statistical_invariants.test.ts # Mathematical invariant test suite
    ├── api_contracts.test.ts        # API validation & error contract test suite
    └── run_all_tests.ts             # Master test runner
```

---

## Quickstart & Commands

### Prerequisites
- Node.js 20+
- (Optional) Python 3.10+ for running the ML training pipeline in `ml/`

### Application Build & Development
```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Run TypeScript type check
npm run type-check

# Run automated invariant & API test suite
npm test

# Build bundled production distribution
npm run build

# Start production server
npm start
```

### Running the Python ML Pipeline
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r ml/requirements.txt
python ml/train_pipeline.py
```
