"""
Insurance Claim Risk Intelligence Platform - ML Preprocessing & Feature Pipeline
================================================================================
Implements actuarial-grade feature transformations, logarithmic exposure offset,
categorical encoding, and strict anti-leakage train/test partitioning.
"""

import numpy as np
import pandas as pd
from typing import Tuple, Dict, Any, List


class ActuarialFeaturePipeline:
    """
    Standardized preprocessing pipeline for motor insurance risk modeling.
    Guarantees parity between batch training and single-record inference.
    """

    NUMERICAL_COLS = [
        'driver_age',
        'driving_experience_years',
        'credit_score',
        'annual_mileage',
        'vehicle_value',
        'vehicle_age',
        'prior_claims_5yr',
        'traffic_violations_count',
        'deductible',
    ]

    CATEGORICAL_COLS = [
        'vehicle_category',
        'regional_zone',
        'driver_gender',
        'marital_status',
        'anti_theft_device',
    ]

    def __init__(self):
        self.feature_means: Dict[str, float] = {}
        self.feature_stds: Dict[str, float] = {}
        self.category_mappings: Dict[str, Dict[str, int]] = {}
        self.fitted = False

    def fit(self, df: pd.DataFrame) -> 'ActuarialFeaturePipeline':
        """Calculates population statistics and categorical mappings."""
        for col in self.NUMERICAL_COLS:
            if col in df.columns:
                self.feature_means[col] = float(df[col].mean())
                self.feature_stds[col] = float(df[col].std()) if df[col].std() > 0 else 1.0

        for col in self.CATEGORICAL_COLS:
            if col in df.columns:
                unique_vals = sorted(df[col].astype(str).unique())
                self.category_mappings[col] = {val: idx for idx, val in enumerate(unique_vals)}

        self.fitted = True
        return self

    def transform(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """
        Transforms raw dataframe into feature matrix X and log-exposure offset vector.
        
        Returns:
            X: Standardized and encoded feature matrix (N, D)
            log_exposure: Actuarial offset array ln(Exposure) (N,)
        """
        if not self.fitted:
            raise RuntimeError("ActuarialFeaturePipeline must be fitted before transform.")

        df_processed = df.copy()

        # 1. Log Exposure offset calculation (Actuarial baseline: Exposure in policy years)
        if 'exposure' in df_processed.columns:
            exposure = df_processed['exposure'].clip(lower=0.01, upper=1.0).values
        else:
            exposure = np.ones(len(df_processed))
        log_exposure = np.log(exposure)

        # 2. Numerical Standardization
        transformed_num = []
        for col in self.NUMERICAL_COLS:
            if col in df_processed.columns:
                standardized = (df_processed[col] - self.feature_means[col]) / self.feature_stds[col]
                transformed_num.append(standardized.values.reshape(-1, 1))

        # 3. Categorical Ordinal/One-Hot Mapping
        transformed_cat = []
        for col in self.CATEGORICAL_COLS:
            if col in df_processed.columns:
                mapping = self.category_mappings.get(col, {})
                encoded = df_processed[col].astype(str).map(mapping).fillna(0).values
                transformed_cat.append(encoded.reshape(-1, 1))

        # 4. Domain Interaction Terms
        # Young Driver x High Vehicle Value Hazard interaction
        young_driver = (df_processed['driver_age'] < 25).astype(float).values.reshape(-1, 1)
        luxury_asset = (df_processed['vehicle_value'] > 45000).astype(float).values.reshape(-1, 1)
        interaction_young_luxury = young_driver * luxury_asset

        X = np.hstack(transformed_num + transformed_cat + [interaction_young_luxury])
        return X, log_exposure


def split_actuarial_train_test(
    df: pd.DataFrame,
    test_size: float = 0.2,
    random_state: int = 42
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Stratified train/test split on claim occurrence indicator (Y > 0)
    to preserve severe zero-inflation proportions across splits.
    """
    np.random.seed(random_state)
    has_claim = (df['claim_amount'] > 0).values

    claim_idx = np.where(has_claim)[0]
    zero_idx = np.where(~has_claim)[0]

    np.random.shuffle(claim_idx)
    np.random.shuffle(zero_idx)

    n_test_claims = int(len(claim_idx) * test_size)
    n_test_zeros = int(len(zero_idx) * test_size)

    test_indices = np.concatenate([claim_idx[:n_test_claims], zero_idx[:n_test_zeros]])
    train_indices = np.concatenate([claim_idx[n_test_claims:], zero_idx[n_test_zeros:]])

    return df.iloc[train_indices].reset_index(drop=True), df.iloc[test_indices].reset_index(drop=True)
