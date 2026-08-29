"""
Insurance Claim Risk Intelligence Platform - Compound Poisson-Gamma Tweedie GBDT
================================================================================
Mathematical formulation and training wrapper for Tweedie compound Poisson-Gamma
distribution (variance power 1 < p < 2) with custom unit deviance objective.
"""

import numpy as np
from typing import Dict, Any, Tuple


def tweedie_unit_deviance(y_true: np.ndarray, y_pred: np.ndarray, p: float = 1.5) -> np.ndarray:
    """
    Computes unit Tweedie deviance for continuous positive claims with zero mass:
    d(y, mu) = 2 * ( (y^(2-p))/((1-p)(2-p)) - (y*mu^(1-p))/(1-p) + (mu^(2-p))/(2-p) )
    
    Args:
        y_true: Empirical aggregate loss (>= 0)
        y_pred: Predicted pure premium (mu > 0)
        p: Tweedie variance power parameter, strictly in (1, 2)
    """
    eps = 1e-8
    y = np.maximum(y_true, 0.0)
    mu = np.maximum(y_pred, eps)

    term1 = np.where(y > 0, (y ** (2 - p)) / ((1 - p) * (2 - p)), 0.0)
    term2 = (y * (mu ** (1 - p))) / (1 - p)
    term3 = (mu ** (2 - p)) / (2 - p)

    deviance = 2.0 * (term1 - term2 + term3)
    return deviance


class TweedieGradientBoostedTree:
    """
    Actuarial Gradient Boosted Tree trained under Tweedie compound Poisson-Gamma deviance.
    Directly models Pure Premium = Frequency * Severity without two-stage truncation errors.
    """

    def __init__(self, tweedie_variance_power: float = 1.5, n_estimators: int = 150, learning_rate: float = 0.05, max_depth: int = 4):
        if not (1.0 < tweedie_variance_power < 2.0):
            raise ValueError("Tweedie variance power 'p' must lie strictly in the interval (1.0, 2.0).")
        self.p = tweedie_variance_power
        self.n_estimators = n_estimators
        self.learning_rate = learning_rate
        self.max_depth = max_depth
        self.base_score = 0.0

    def get_lightgbm_params(self) -> Dict[str, Any]:
        """Returns hyperparameters compatible with LightGBM's native Tweedie objective."""
        return {
            'objective': 'tweedie',
            'tweedie_variance_power': self.p,
            'n_estimators': self.n_estimators,
            'learning_rate': self.learning_rate,
            'max_depth': self.max_depth,
            'num_leaves': 2 ** self.max_depth - 1,
            'min_child_samples': 20,
            'subsample': 0.8,
            'colsample_bytree': 0.8,
            'random_state': 42,
        }
