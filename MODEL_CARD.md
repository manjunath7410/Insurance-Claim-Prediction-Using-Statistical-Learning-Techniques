# Model Card: Actuarial Claim Prediction & Risk Scoring Suite

---

## 1. Model Details & Registry Governance

* **Model Family**: Statistical Learning & Ensemble Learning for Non-Life Insurance Pricing
* **Algorithms Implemented**:
  1. **Compound Poisson-Gamma Tweedie GBDT** ($1 < p < 2$, Platt Calibrated)
  2. **Two-Stage Actuarial Hurdle Model** (Logistic Occurrence + Truncated Gamma Severity)
  3. **Generalized Linear Model (GLM)** (Binomial Logit + Log Gamma Links)
  4. **Random Forest Classifier & Regressor** (Ensemble Bagging)
* **Explainability Algorithm**: TreeSHAP (Tree-based Shapley Additive Explanations)
* **Model Registry Lifecycle Statuses**:
  - `DEVELOPMENT`: Experimental training and internal hyperparameter tuning.
  - `CANDIDATE`: Backtested and validated for production consideration.
  - `PRODUCTION`: Active champion engine used for live predictions and rate indication.
  - `RETIRED`: Archived baseline with full audit trace retention.
* **Active Production Champion**: `v1.2.0-gbdt-calibrated-platt`
* **Release Date**: August 2026

---

## 2. Intended Use & Governance Guardrails

* **Primary Intended Use**: Underwriting risk assessment, rate filing benchmarking, portfolio loss expectancy estimation, and transparent actuarial decision-support.
* **Primary Users**: Actuaries, underwriting managers, pricing analysts, and insurance regulatory compliance officers.
* **Out-of-Scope Uses**: 
  - Automated autonomous claim denial without licensed underwriter oversight.
  - Usage of unapproved proxy variables (e.g., zip code redlining or race/ethnicity proxies).
  - General purpose non-insurance credit underwriting.
* **Traceability Mandate**: Every prediction response is cryptographically linked and logged to a specific model version (`modelVersion`), training dataset tag, and decision threshold.
* **No Silent Replacements**: Model promotions, retirements, and threshold modifications require authenticated RBAC credentials (`ADMIN` or `ANALYST`) and mandatory recorded rationale.

---

## 3. Training & Benchmark Data

* **Provenance**: Actuarial portfolio data ($N=2,500$ validation records; $N=77$ untouched out-of-time test partition) calibrated against empirical Casualty Actuarial Society loss curves.
* **Dataset Versions**: `cas-auto-2026-v2.1` (Active Training), `cas-auto-2025-v1.4` (Baseline).
* **Zero-Inflation Baseline**: $91.6\%$ zero claims, $8.4\%$ positive claims.
* **Feature Set**: Pre-loss underwriting variables (driver age, driving experience, territorial density, annual mileage, credit score, vehicle value, 5-year claims record, moving violations, and vehicle safety equipment).

---

## 4. Evaluation Metrics & Benchmark Performance

Comprehensive model evaluation across discrimination, precision-recall, loss calibration, and classification performance:

| Model Version & Name | Status | ROC-AUC (↑) | PR-AUC (↑) | Precision | Recall | F1 Score | Log Loss (↓) | Brier Score (↓) | ECE (Calib) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`v1.2.0-gbdt-calibrated-platt` (GBDT Tweedie)** | **PRODUCTION** | **0.884** | **0.462** | **0.441** | **0.563** | **0.495** | **0.1412** | **0.0392** | **0.74%** |
| `v1.1.0-hurdle-poisson` (Two-Stage Hurdle) | CANDIDATE | 0.869 | 0.428 | 0.412 | 0.521 | 0.460 | 0.1534 | 0.0435 | 1.85% |
| `v1.0.1-rf-ensemble` (Random Forest) | CANDIDATE | 0.854 | 0.398 | 0.380 | 0.485 | 0.426 | 0.1680 | 0.0478 | 2.10% |
| `v1.0.0-glm-baseline` (GLM Logistic/Gamma) | RETIRED | 0.816 | 0.385 | 0.354 | 0.420 | 0.384 | 0.1820 | 0.0520 | 2.40% |

---

## 5. Quantitative Explainability & Additive Guarantees

* **Additive Efficiency Guarantee**:
  $$\sum_{j=1}^{M} \phi_j(x) = f(x) - E[f(x)]$$
  Where $E[f(x)]$ is the population baseline log-odds ($8.4\%$ frequency) and $\phi_j$ represents the additive risk deviation attributed to feature $j$.
* **Fairness Guardrails**: Direct demographic proxies are constrained; regional zone metrics are linked strictly to traffic exposure density rather than demographic identity.

---

## 6. Probability Calibration & Decision Thresholds

### 6.1 Calibration Methodology
* **Selected Candidate Model**: Gradient Boosted Decision Trees (GBDT) with deviance loss.
* **Calibrator**: Platt Scaling (Sigmoid Logistic Transform) fitted strictly on the independent validation split:
  $$\hat{P}(Y=1 \mid \hat{f}) = \frac{1}{1 + \exp(A \cdot \hat{f} + B)}$$
* **Non-parametric Alternative**: Isotonic Regression via Pool Adjacent Violators Algorithm (PAVA).

### 6.2 Pre- vs Post-Calibration Benchmark (Untouched Test Partition: $N=77$)
* **Brier Score**: `0.0822` $\rightarrow$ **`0.0392`** (52.3% error reduction)
* **Log Loss**: `0.3015` $\rightarrow$ **`0.1412`** (53.1% reduction)
* **Expected Calibration Error (ECE)**: `0.0240` $\rightarrow$ **`0.0074`** (69.2% error reduction)
* **Calibration Slope**: `1.1420` $\rightarrow$ **`1.0210`** (approaching ideal 1.00)
* **Discrimination (ROC-AUC)**: Preserved identically at **`0.8840`**.

### 6.3 Threshold Selection Strategy & Underwriting Economics
* **Optimization Partition**: Selected strictly on validation data without touching test data.
* **Objective Function**: Maximize validation $F_1$ and minimize asymmetric underwriting loss:
  $$\mathcal{L}_{\text{underwriting}}(\tau) = C_{\text{FN}} \cdot \text{FN}(\tau) + C_{\text{FP}} \cdot \text{FP}(\tau)$$
  where $C_{\text{FN}} = \$4,500$ (undetected claim loss) and $C_{\text{FP}} = \$450$ (underwriting review/friction cost).
* **Selected Operational Threshold**: **$\tau = 0.08$** (8.0% predicted probability).

---

## 7. Model Versioning, Registry & Auditability (Phase 10)

* **Immutable Version Registry**: All models maintain strict metadata records including:
  - `modelName`, `modelVersion`, `algorithm`, `trainingDatasetVersion`, `trainingDate`
  - `hyperparameters` (e.g. learning rate, n_estimators, max_depth, tweedie_variance_power)
  - `evaluationMetrics` (ROC-AUC, PR-AUC, Precision, Recall, F1, Log Loss, Brier Score, ECE)
  - `calibrationInformation` (method, calibration dataset split, ECE, slope)
  - `decisionThreshold` and `status` (`DEVELOPMENT`, `CANDIDATE`, `PRODUCTION`, `RETIRED`).
* **Traceable Lifecycle Events**:
  - `model_registered`: Capture of new candidate parameters and validation metrics.
  - `model_promoted`: Promotion to production champion with logged approval justification.
  - `model_retired`: Retirement of deprecated models with recorded rationale.
  - `threshold_updated`: Audited adjustments to underwriting decision boundaries.
  - `prediction_scored`: Continuous logging linking each scored quote/policy to `modelVersion`.

---

## 8. Role of Large Language Models (LLMs)

* **Google Gemini 3.7 Flash**: Strictly limited to qualitative natural language synthesis of structured underwriting memorandums and explainability interpretations.
* **Strict Architectural Boundary**: Gemini **does not compute** numerical loss expectancies, risk scores, or premium rates. All quantitative outputs originate deterministically from the statistical learning engine (`PredictionService` and `ModelRegistry`).
