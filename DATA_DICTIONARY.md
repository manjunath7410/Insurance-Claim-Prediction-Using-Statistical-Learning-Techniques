# Actuarial Data Dictionary & Data Engineering Specifications

This document defines the complete schema, feature engineering specifications, prediction-time usage rules, target leakage protections, and data validation criteria for the **Insurance Claim Prediction & Risk Intelligence Platform** (Phase 2 Data Engineering Pipeline).

---

## 1. Provenance Statement & Synthetic Calibration Disclosure

> **Transparency Note**: The dataset included and processed by this platform is an **explicitly labeled synthetic benchmark dataset**, calibrated to mirror the empirical statistical moments, zero-inflation properties ($91.6\%$ zero claims), and heavy right-tailed loss distributions of the **French Motor Third-Party Liability Benchmark (`freMTPL2freq` / `freMTPL2sev`)** and Casualty Actuarial Society (CAS) standards. Synthetic data is never represented as actual private policyholder records.

---

## 2. End-to-End Data Pipeline Architecture

```
Raw Ingested Records (CSV / JSON)
  │
  ▼
[1] Schema & Field Specification Validation
  │   └── Verifies presence of required fields, expected types, and schema contracts
  ▼
[2] Data Quality & Anomaly Checks
  │   ├── Missing-Value Detection (Flags & tracks per-column null rates)
  │   ├── Duplicate Detection (Flags repeated policy/record IDs)
  │   └── Invalid-Value & Range Checking (Checks biological & physical bounds)
  ▼
[3] Actuarial Logical Consistency Validation
  │   ├── Driver Age vs. Experience: Experience ≤ Age - 15
  │   └── Target Consistency: (Claim Occurred == 0 ↔ Claim Amount == $0)
  ▼
[4] Target Leakage Audit
  │   └── Scans for post-loss/adjuster variables forbidden at inference time
  ▼
[5] Deterministic Preprocessing & Standardization
  │   ├── Numerical scaling / Log-transform ln(Exposure) offset
  │   ├── Categorical one-hot / target encoding
  │   └── Monotonic binning & risk tiers
  ▼
[6] Clean Model-Ready Dataset Matrix
```

---

## 3. Comprehensive Feature Catalog

### A. Pre-Loss Underwriting Features (Usable at Prediction Time)

| Feature Name | Storage Type | Allowed / Expected Values | Usable at Prediction Time? | Description | Preprocessing Requirements | Potential Limitations |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `id` | `String` | Unique string / alphanumeric (e.g. `REC-1001`) | **No (Index only)** | Unique policyholder identifier. | Pass-through for audit tracking; strictly dropped from mathematical model feature matrix. | Non-informative index; must not introduce sorting or clustering artifacts. |
| `age` | `Integer` | $16 - 100$ | **Yes** | Chronological age of the primary licensed driver in years. | Z-score standardization ($\frac{x - \mu}{\sigma}$) or actuarial age-cohort binning. | Non-linear U-shaped risk curve; higher frequency variance in young (<21) and senior (>75) cohorts. |
| `experience` | `Integer` | $0 - 84$ | **Yes** | Number of years of licensed driving experience. | Standardization; enforced consistency invariant: $\text{experience} \le \text{age} - 15$. | Gaps in foreign licensing histories or self-reported driving gaps. |
| `creditScore` | `Integer` | $300 - 850$ | **Yes** | Insurance bureau risk score (FICO proxy). | Min-Max scaling to $[0, 1]$ or mapping to regulatory credit tiers. | Prohibited in certain jurisdictions (CA, MA, HI); must support fallback imputation or exclusion. |
| `annualMileage` | `Integer` | $500 - 100,000$ | **Yes** | Estimated annual vehicle miles traveled (VMT). | Log-transformation $\ln(\text{mileage})$ to mitigate skewness. | Self-reported mileage often underestimates exposure without telematics verification. |
| `vehicleType` | `Categorical` | `Economy Sedan`, `Compact SUV`, `Luxury / Sports`, `Commercial Van`, `Heavy Truck`, `Electric / EV` | **Yes** | Classification and body style of insured vehicle. | One-hot encoding ($k-1$ dummy variables) or Target Frequency Encoding. | High instantaneous torque in EVs creates distinct collision frequency patterns. |
| `vehicleValue` | `Float` | $\$500 - \$1,000,000$ | **Yes** | Actual Cash Value (ACV) or declared insured value in USD. | Log-transformation $\ln(\text{value})$ to normalize right-skewed pricing distributions. | Subject to vehicle depreciation curves over multi-year policy life. |
| `zone` | `Categorical` | `Metro High-Congestion`, `Suburban Moderate`, `Rural Low-Risk`, `Semi-Rural` | **Yes** | Territorial rating zone based on population and traffic density. | One-hot encoding or ordered demographic hazard index. | Must reflect pure geographic exposure, avoiding redlining proxies. |
| `priorClaims` | `Integer` | $0 - 20$ | **Yes** | Historical claim count filed within prior 60-month window. | Integer clipping and monotonic positive coefficient constraint. | Historical record truncated to 5-year lookback window. |
| `exposure` | `Float` | $0.01 - 1.00$ | **Yes** | Policy duration expressed as fraction of 365-day year. | Used strictly as logarithmic exposure offset term $\ln(\text{Exposure})$ in Poisson / Tweedie link function. | Short-term policies (<90 days) exhibit higher annualized claim variance. |

---

### B. Target Variables (Model Training Ground Truth Only)

| Feature Name | Storage Type | Allowed / Expected Values | Usable at Prediction Time? | Description | Preprocessing Requirements | Potential Limitations |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `claimOccurred` | `Integer (Binary)` | $0$ or $1$ | **No (Target)** | Binary ground-truth indicator of whether $\ge 1$ claim was incurred during exposure period. | Primary target label for Stage 1 Hurdle logistic classifier and binary cross-entropy. | Severe zero-inflation ($90-95\%$ zeros) requires specialized loss functions (Tweedie deviance, focal loss). |
| `claimAmount` | `Float` | $\$0 - \$10,000,000$ | **No (Target)** | Total monetary loss indemnity paid in USD. | Primary target label for Stage 2 Gamma severity regression and Tweedie compound loss. | Extreme heavy right tail requires robust deviance evaluation; must be exactly $\$0$ when `claimOccurred` is $0$. |

---

## 4. Target Leakage Prevention & Forbidden Post-Incident Variables

> **Actuarial Golden Rule**: No feature may be included in the training or inference feature matrix if its value is determined or modified *after* an incident or claim filing occurs.

### Forbidden Post-Loss Attributes (Automated Leakage Audit):
The pipeline actively audits feature sets and flags or rejects any variable matching the following:
1. `claimAmount` / `claim_amount` / `payout` / `settlement_cost`
2. `claimOccurred` / `claim_occurred`
3. `adjuster_notes` / `adjuster_evaluation`
4. `litigation_status` / `attorney_represented`
5. `bodily_injury_count` / `fatality_flag` (post-accident metrics)
6. `repair_duration_days` / `rental_car_days_incurred`
7. `salvage_recovery_amount` / `subrogation_recovered`
8. `fault_determination_pct` (determined after accident investigation)
9. `police_report_filed_post_loss`

---

## 5. Mathematical Preprocessing Invariants

To eliminate training/serving skew and maintain deterministic transformation across environments:

1. **Logarithmic Actuarial Exposure Offset**:
   $$\eta_i = \ln(\text{Exposure}_i) + \sum_{j=1}^{p} \beta_j X_{ij}$$
2. **Deterministic Imputation Policy**:
   - Numerical fields: Median of training cohort or domain standard default ($700$ for credit score, $12,000$ for annual mileage).
   - Categorical fields: Explicit `'Missing'` or modal category (`'Economy Sedan'`).
3. **Biological & Actuarial Range Invariants**:
   - $16 \le \text{Age} \le 100$
   - $0 \le \text{Experience} \le (\text{Age} - 15)$
   - $300 \le \text{CreditScore} \le 850$
   - $\text{ClaimOccurred} = 0 \iff \text{ClaimAmount} = 0$
