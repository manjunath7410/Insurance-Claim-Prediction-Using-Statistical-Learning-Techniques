"""
Actuarial Data Engineering & Quality Pipeline
Phase 2: Data Pipeline & Preprocessing Module

Provides deterministic data validation, schema enforcement, data quality statistics,
target leakage auditing, and clean ML feature matrix generation.
"""

from typing import Dict, List, Tuple, Any, Optional
import numpy as np
import pandas as pd

DATA_SCHEMA_SPECIFICATIONS: Dict[str, Dict[str, Any]] = {
    "id": {
        "type": "identifier",
        "required": True,
        "usable_at_prediction_time": False,
        "description": "Unique policy or record identifier",
        "preprocessing": "Drop from predictive feature matrix",
        "limitations": "Index only",
    },
    "age": {
        "type": "numerical",
        "required": True,
        "min": 16,
        "max": 100,
        "usable_at_prediction_time": True,
        "description": "Driver age in years",
        "preprocessing": "StandardScaler / numerical imputation",
        "limitations": "Non-linear U-shaped risk curve",
    },
    "experience": {
        "type": "numerical",
        "required": True,
        "min": 0,
        "max": 84,
        "usable_at_prediction_time": True,
        "description": "Licensed driving experience in years",
        "preprocessing": "StandardScaler / boundary check (experience <= age - 16)",
        "limitations": "Self-reported foreign license gaps",
    },
    "creditScore": {
        "type": "numerical",
        "required": True,
        "min": 300,
        "max": 850,
        "usable_at_prediction_time": True,
        "description": "Insurance credit score",
        "preprocessing": "RobustScaler or quantile binning",
        "limitations": "Subject to jurisdictional insurance regulation",
    },
    "annualMileage": {
        "type": "numerical",
        "required": True,
        "min": 500,
        "max": 100000,
        "usable_at_prediction_time": True,
        "description": "Estimated annual miles traveled",
        "preprocessing": "Log-transform ln(mileage)",
        "limitations": "Self-reported underestimation without telematics",
    },
    "vehicleType": {
        "type": "categorical",
        "required": True,
        "allowed": ["Economy Sedan", "Compact SUV", "Luxury / Sports", "Commercial Van", "Heavy Truck", "Electric / EV"],
        "usable_at_prediction_time": True,
        "description": "Vehicle classification",
        "preprocessing": "One-hot encoding",
        "limitations": "Rapid EV acceleration variance",
    },
    "vehicleValue": {
        "type": "numerical",
        "required": True,
        "min": 500,
        "max": 1000000,
        "usable_at_prediction_time": True,
        "description": "Vehicle Actual Cash Value in USD",
        "preprocessing": "Log-transform ln(value)",
        "limitations": "Depreciation curves",
    },
    "zone": {
        "type": "categorical",
        "required": True,
        "allowed": ["Metro High-Congestion", "Suburban Moderate", "Rural Low-Risk", "Semi-Rural"],
        "usable_at_prediction_time": True,
        "description": "Geographic rating territory",
        "preprocessing": "Target or One-hot encoding",
        "limitations": "Must reflect pure territory hazards",
    },
    "priorClaims": {
        "type": "numerical",
        "required": True,
        "min": 0,
        "max": 20,
        "usable_at_prediction_time": True,
        "description": "Prior claims count in 5-year lookback",
        "preprocessing": "Integer clipping & monotonic constraint",
        "limitations": "Truncated 5-year history",
    },
    "exposure": {
        "type": "numerical",
        "required": True,
        "min": 0.01,
        "max": 1.0,
        "usable_at_prediction_time": True,
        "description": "Policy earned exposure (year fraction)",
        "preprocessing": "Actuarial logarithmic offset ln(Exposure)",
        "limitations": "Short-term policy volatility",
    },
    "claimOccurred": {
        "type": "target",
        "required": True,
        "min": 0,
        "max": 1,
        "usable_at_prediction_time": False,
        "description": "Binary ground-truth claim occurrence indicator",
        "preprocessing": "Hurdle stage 1 binary label",
        "limitations": "Zero-inflation (~90-95% zeros)",
    },
    "claimAmount": {
        "type": "target",
        "required": True,
        "min": 0,
        "max": 10000000,
        "usable_at_prediction_time": False,
        "description": "Monetary claim loss amount in USD",
        "preprocessing": "Gamma severity & Tweedie loss target",
        "limitations": "Heavy right tail",
    },
}

FORBIDDEN_LEAKAGE_FEATURES = [
    "claimamount", "claim_amount", "claimoccurred", "claim_occurred",
    "settlement_cost", "payout", "adjuster_notes", "litigation_status",
    "bodily_injury_count", "repair_duration_days", "salvage_recovery",
    "subrogation_recovered", "fault_determination_pct"
]


class ActuarialDataPipeline:
    """
    Production-grade reproducible data engineering pipeline for insurance risk modeling.
    Enforces schema checks, data validation, leak detection, and deterministic cleaning.
    """

    def __init__(self, schema_specs: Optional[Dict[str, Dict[str, Any]]] = None):
        self.schema_specs = schema_specs or DATA_SCHEMA_SPECIFICATIONS
        self.forbidden_leakage = FORBIDDEN_LEAKAGE_FEATURES

    def audit_target_leakage(self, feature_columns: List[str]) -> Tuple[bool, List[str]]:
        """Audits feature list for target leakage / post-incident variables."""
        leaked = []
        for col in feature_columns:
            normalized = col.lower().replace("_", "").replace(" ", "")
            if normalized in self.forbidden_leakage:
                leaked.append(col)
        return len(leaked) > 0, leaked

    def validate_and_clean_dataframe(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Validates schema, checks ranges, flags missing & duplicate values, verifies target logic,
        and produces a clean dataframe alongside a comprehensive quality report.
        """
        initial_count = len(df)
        report: Dict[str, Any] = {
            "initial_rows": initial_count,
            "duplicate_rows": 0,
            "missing_value_rows": 0,
            "invalid_range_rows": 0,
            "logical_inconsistencies": 0,
            "leakage_features_detected": [],
            "field_missingness": {},
        }

        # Check for column-level target leakage
        has_leakage, leaked = self.audit_target_leakage(list(df.columns))
        report["leakage_features_detected"] = leaked

        # 1. Missingness per field
        for col in df.columns:
            missing_cnt = int(df[col].isna().sum())
            report["field_missingness"][col] = {
                "count": missing_cnt,
                "percent": round((missing_cnt / max(1, initial_count)) * 100, 2),
            }

        # 2. Duplicate detection
        dup_mask = df.duplicated(subset=["id"], keep="first") if "id" in df.columns else df.duplicated()
        report["duplicate_rows"] = int(dup_mask.sum())
        clean_df = df[~dup_mask].copy()

        # 3. Missing required values removal
        required_cols = [k for k, v in self.schema_specs.items() if v.get("required", False) and k in clean_df.columns]
        missing_mask = clean_df[required_cols].isna().any(axis=1)
        report["missing_value_rows"] = int(missing_mask.sum())
        clean_df = clean_df[~missing_mask]

        # 4. Valid range & categorical checks
        invalid_mask = pd.Series(False, index=clean_df.index)
        for col, spec in self.schema_specs.items():
            if col not in clean_df.columns:
                continue
            if spec["type"] in ["numerical", "target"]:
                numeric_series = pd.to_numeric(clean_df[col], errors="coerce")
                if numeric_series.isna().any():
                    invalid_mask |= numeric_series.isna()
                if "min" in spec:
                    invalid_mask |= (numeric_series < spec["min"])
                if "max" in spec:
                    invalid_mask |= (numeric_series > spec["max"])
            elif spec["type"] == "categorical" and "allowed" in spec:
                invalid_mask |= ~clean_df[col].astype(str).str.strip().isin(spec["allowed"])

        report["invalid_range_rows"] = int(invalid_mask.sum())
        clean_df = clean_df[~invalid_mask]

        # 5. Biological / Actuarial logical consistency: experience <= age - 15
        if "age" in clean_df.columns and "experience" in clean_df.columns:
            incon_exp = clean_df["experience"] > (clean_df["age"] - 15)
            report["logical_inconsistencies"] += int(incon_exp.sum())
            clean_df = clean_df[~incon_exp]

        # 6. Target consistency: claimOccurred == 0 must have claimAmount == 0
        if "claimOccurred" in clean_df.columns and "claimAmount" in clean_df.columns:
            incon_target = ((clean_df["claimOccurred"] == 0) & (clean_df["claimAmount"] > 0)) | \
                           ((clean_df["claimOccurred"] == 1) & (clean_df["claimAmount"] <= 0))
            report["logical_inconsistencies"] += int(incon_target.sum())
            clean_df = clean_df[~incon_target]

        # Quality Summary Metrics
        report["clean_rows"] = len(clean_df)
        report["quality_score_pct"] = round((len(clean_df) / max(1, initial_count)) * 100, 1)
        
        if "claimOccurred" in clean_df.columns and len(clean_df) > 0:
            zero_claims = int((clean_df["claimOccurred"] == 0).sum())
            report["zero_inflation_pct"] = round((zero_claims / len(clean_df)) * 100, 1)
            report["claim_frequency_pct"] = round(((len(clean_df) - zero_claims) / len(clean_df)) * 100, 1)

        return clean_df, report
