# INSURANCE CLAIM PREDICTION & RISK INTELLIGENCE PLATFORM
## Technical Architecture, Statistical Design & Engineering Blueprint

---

### 1. Executive Summary & System Objectives
The **Insurance Claim Prediction & Risk Intelligence Platform** is an actuarial-grade statistical learning application engineered to predict insurance claim frequency ($P(\text{Claim})$), loss severity ($E[Y \mid Y > 0]$), and actuarial pure premiums ($\text{Pure Premium} = P \times \text{Severity} \times \text{Exposure}$) with mathematical precision and regulatory auditability.

#### Core Directives & Separation of Concerns
1. **Deterministic Statistical Prediction Engine**: All claim probabilities, loss expectancies, risk scoring, confidence intervals, and SHAP feature attributions are computed strictly via validated statistical and machine learning algorithms (Generalized Linear Models, Tweedie Gradient Boosted Trees, Two-Stage Hurdle Models, and Random Forests).
2. **Strict Non-Prediction Role for LLMs**: Google Gemini is strictly confined to post-prediction natural language explanation, automated underwriting memorandum drafting, and regulatory narrative translation. Gemini **never** calculates or overrides quantitative risk probabilities.
3. **Data Integrity & Labeling**: Synthetic benchmark datasets (calibrated to the French Motor Third-Party Liability and CAS loss distributions) are explicitly labeled as synthetic benchmarks to maintain empirical integrity.

---

### 2. Architecture & Layering Model

```
+-----------------------------------------------------------------------------------+
|                            PRESENTATION LAYER (React 19)                          |
|  - Underwriter Risk Console      - Benchmark Matrix & ROC/Gini Visualizer         |
|  - Local TreeSHAP Attributions   - Data Layer & CSV Ingestion                     |
|  - Audit Log & Governance View   - Actuarial Memorandum Modal                     |
+-----------------------------------------------------------------------------------+
                                         │  (JSON REST API)
                                         ▼
+-----------------------------------------------------------------------------------+
|                            API & SECURITY GATEWAY (Express)                       |
|  - Schema Validation (Input guardrails, type checking, boundary enforcement)      |
|  - Route Controllers (/api/predict, /api/benchmarks, /api/dataset, /api/audit)    |
|  - Model Versioning & Request Metadata Injection (Timestamp, Run ID, Model Ver)   |
|  - Safe Secret Management (Gemini API Key isolated server-side)                  |
+-----------------------------------------------------------------------------------+
         │                                       │                         │
         ▼                                       ▼                         ▼
+-----------------------+     +-------------------------------+   +------------------+
|   STATISTICAL ENGINE  |     |      EXPLAINABILITY LAYER     |   | NLP MEMORANDUM   |
| - GLM (Logit + Gamma) |     | - TreeSHAP Additive Decomp    |   | - Gemini 3.7     |
| - GBDT Tweedie Loss   |     | - Normalized Gini Coefficients|   |   (Qualitative   |
| - Two-Stage Hurdle    |     | - Brier Calibration Bins      |   |   synthesis only)|
| - Random Forest       |     | - Loss Deviance Metrics       |   +------------------+
+-----------------------+     +-------------------------------+
         │                                       │
         ▼                                       ▼
+-----------------------------------------------------------------------------------+
|                        DATA & AUDIT PERSISTENCE LAYER                             |
|  - Actuarial Claims Repository (Zero-Inflation & Long-Tail Distribution Data)     |
|  - Immutable Underwriting Decision Audit Log (Decisions, Overrides, Surcharges)   |
|  - Synthetic Benchmark Ground-Truth Sets                                          |
+-----------------------------------------------------------------------------------+
```

---

### 3. Machine Learning & Statistical Formulations

#### A. Compound Poisson-Gamma / Tweedie Distribution ($1 < p < 2$)
Insurance aggregate losses exhibit high zero-inflation (~90–95% zero claims) and heavy right-skewed positive claims. The Tweedie compound Poisson-Gamma distribution models both in a single step:
$$\text{Var}(Y) = \phi \mu^p, \quad p \in (1, 2)$$
The unit deviance minimized during gradient boosting is:
$$d(y, \mu) = 2 \left( \frac{y^{2-p}}{(1-p)(2-p)} - \frac{y \mu^{1-p}}{1-p} + \frac{\mu^{2-p}}{2-p} \right)$$

#### B. Two-Stage Actuarial Hurdle Model
Separates the process into zero-frequency Bernoulli classification and truncated severity regression:
$$E(\text{Loss}) = P(Y > 0) \times E(Y \mid Y > 0)$$
- **Stage 1 (Occurrence):** $\text{logit}(P(Y > 0)) = \mathbf{X}\beta + \ln(\text{Exposure})$
- **Stage 2 (Severity):** $\ln(E[Y \mid Y > 0]) = \mathbf{X}\gamma$ (Gamma GLM with log link)

#### C. TreeSHAP Additive Explainability
Each policyholder's predicted log-odds deviation is decomposed into additive feature attributions:
$$f(x) = \phi_0 + \sum_{j=1}^{M} \phi_j(x)$$
Where $\phi_0$ is the population baseline log-odds ($8.4\%$ frequency) and $\phi_j$ represents the marginal contribution of driver age, past claims, territorial zone, vehicle tier, and mileage.

#### D. Actuarial Metrics Suite
- **Normalized Gini Index:** $G = 1 - 2 \int_0^1 L(u) \, du$, measuring risk differentiation across policyholder deciles.
- **Brier Reliability Score:** $\text{Brier} = \frac{1}{N} \sum_{i=1}^N (p_i - y_i)^2 = \text{Reliability} - \text{Resolution} + \text{Uncertainty}$.

---

### 4. Security Boundaries & Threat Modeling

| Threat Vector | Mitigation Strategy | Architectural Layer |
| :--- | :--- | :--- |
| **Data Leakage & Target Snooping** | Strict prediction-time feature sets (only pre-loss attributes: driver age, past 5-yr claims, territory, vehicle type). No post-incident telemetry or settlement variables. | Data Pipeline / Feature Store |
| **API Secret Exposure** | `GEMINI_API_KEY` stored exclusively in server environment; no `VITE_` client prefixes; client never contacts Google GenAI endpoints directly. | Server Gateway (`server.ts`) |
| **Arbitrary Input Injection** | Type-safe JSON schemas, numerical range bounds, categorical enumeration validation, and sanitized CSV string parsing. | Controller Validation |
| **Model Drift / Silent Modification** | Strict model versioning tags returned on every prediction payload (`modelVersion`, `algorithmId`, `timestamp`). | ML Inference Engine |
| **Regulatory Non-Compliance** | Fair-lending guardrails ensuring no direct discriminatory proxies; transparent SHAP attribution logs for underwriting justifications. | Audit & Governance Layer |

---

### 5. Repository Directory Structure

```
├── .env.example                     # Environment configuration specification
├── ARCHITECTURE.md                  # System architecture, statistical theory & design
├── DATA_DICTIONARY.md               # Feature definitions, types & valid ranges
├── MODEL_CARD.md                    # Machine learning model cards & governance
├── API.md                           # REST API endpoint specifications & contracts
├── SECURITY.md                      # Security boundaries, anti-leakage & threat model
├── index.html                       # SPA HTML entry point
├── metadata.json                    # Application metadata & capabilities
├── package.json                     # Node/Express/Vite dependencies & test scripts
├── server.ts                        # Express server entry point & middleware wiring
├── ml/                              # Python Machine Learning Pipeline
│   ├── requirements.txt             # Python dependencies
│   ├── preprocessing.py             # Feature pipeline & exposure offset calculation
│   ├── tweedie_gbdt.py              # Tweedie deviance loss & GBDT specification
│   ├── hurdle_model.py              # Two-stage actuarial hurdle model
│   ├── evaluate_metrics.py          # Gini, Lorenz & Brier score calculations
│   ├── train_pipeline.py            # Reproducible reference training script
│   └── README.md                    # ML pipeline execution guide
├── src/
│   ├── main.tsx                     # React entry point
│   ├── App.tsx                      # Main application orchestrator & tab routing
│   ├── types.ts                     # Strict TypeScript interfaces & statistical types
│   ├── index.css                    # Tailwind CSS v4 styling
│   ├── server/                      # Modular backend architecture
│   │   ├── config.ts                # Server environment configuration
│   │   ├── logger.ts                # Structured JSON & color logger
│   │   ├── middleware/              # Input validation & error handling
│   │   │   ├── validateInput.ts     # Boundary checking middleware
│   │   │   └── errorHandler.ts      # Global Express error handler
│   │   └── routes/                  # Express REST API routes
│   │       └── api.ts               # Core API router controllers
│   ├── components/                  # React UI components
│   │   ├── Header.tsx               # Navigation, model selector, & Viva defense trigger
│   │   ├── PredictionConsole.tsx    # Interactive policyholder input & pricing output
│   │   ├── ShapAttributionView.tsx  # TreeSHAP risk driver visualizer
│   │   ├── ModelComparisonDashboard.tsx # ROC, Lorenz/Gini, Calibration & Performance Matrix
│   │   ├── DataExplorer.tsx         # Actuarial claims dataset & CSV ingestion
│   │   ├── AuditGovernancePanel.tsx # Immutable underwriting decision logs & notes
│   │   ├── UnderwritingReportModal.tsx # AI/Gemini qualitative memorandum synthesis
│   │   └── ActuarialFormulasModal.tsx  # Mathematical formulations & Viva defense guide
│   ├── data/
│   │   └── mockInsuranceData.ts     # Calibrated synthetic benchmark records & distributions
│   └── services/
│       └── statisticalModels.ts     # Core ML/statistical engines, SHAP math, & benchmarks
└── tests/                           # Automated Test Suite
    ├── statistical_invariants.test.ts # Mathematical invariant tests
    ├── api_contracts.test.ts        # API validation & error contract tests
    └── run_all_tests.ts             # Master test runner
```

---

### 6. Technology Stack Decisions

- **Frontend Framework**: React 19 with Vite, TypeScript 5.8 (Strict Mode).
- **Styling & Visual Design**: Tailwind CSS v4, Lucide React icons, Motion (Framer Motion v12).
- **Data Visualization**: Recharts for ROC curves, Lorenz/Gini curves, Reliability calibration bar charts, and SHAP importance rankings.
- **Backend API & Middleware**: Node.js with Express 4.21, `tsx` runtime, `esbuild` CommonJS compilation for production container execution.
- **NLP / Qualitative Synthesis**: Google GenAI SDK (`@google/genai` v2.4.0) calling Gemini 3.7 Flash for structured memorandum generation.
- **State & Data Ingestion**: Client React state synchronized with server-side REST APIs for real-time inference and CSV uploads.

---

### 7. Phased Implementation Roadmap

0. **Phase 0: Architecture, Statistical Design & Structural Foundation (Initial Phase / Mind Map)**
   - Initial system concept, mind map, and technology stack audit.
   - Core architectural documentation (`ARCHITECTURE.md`).
   - System boundary definitions, statistical model formulation & verification, and API contract specifications.
   - Clear separation of deterministic ML/statistical prediction from qualitative LLM assistance.
1. **Phase 1: Enhanced Feature Engineering & Preprocessing Pipeline (Implementation Phase)**
   - Formal feature transformation layer (standardization, categorical one-hot/target encodings, exposure offset calculation $\ln(\text{Exposure})$).
   - Training and inference pipeline consistency and target leakage prevention.
2. **Phase 2: Interactive Scenario & Sensitivity Analysis (What-If Simulator)**
   - Real-time partial dependence and risk trajectory simulation when policyholders alter deductibles, mileage, or telematics adoption.
3. **Phase 3: Advanced Actuarial Rate Filing & Portfolio Stress Testing**
   - Aggregate portfolio capital adequacy (Value-at-Risk $\text{VaR}_{99.5\%}$ / Solvency II capital requirements) and synthetic portfolio loss simulation.
4. **Phase 4: Automated Testing Suite & Validation Hardening**
   - Numerical invariant tests, monotonic risk constraint tests, calibration tests, and end-to-end API regression coverage.
