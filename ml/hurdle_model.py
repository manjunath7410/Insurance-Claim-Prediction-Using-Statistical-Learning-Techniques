"""
Insurance Claim Risk Intelligence Platform - Two-Stage Hurdle Model
===================================================================
Implements the canonical two-stage actuarial framework:
Stage 1: Bernoulli / Logistic classifier for zero-claim probability P(Y > 0)
Stage 2: Truncated Gamma GLM with log-link for positive claim severity E[Y | Y > 0]
Total Pure Premium E[Y] = P(Y > 0) * E[Y | Y > 0]
"""

import numpy as np
from typing import Tuple, Dict, Any


class TwoStageActuarialHurdle:
    """
    Two-Stage Hurdle model separating claim frequency hurdle from severity magnitude.
    """

    def __init__(self, frequency_l2: float = 1.0, severity_l2: float = 1.0):
        self.frequency_l2 = frequency_l2
        self.severity_l2 = severity_l2
        self.freq_weights = None
        self.freq_bias = 0.0
        self.sev_weights = None
        self.sev_bias = 0.0

    def predict_components(self, X: np.ndarray, log_exposure: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Calculates:
        1. p_claim: P(Y > 0) via logistic sigmoid with log_exposure offset
        2. e_severity: E[Y | Y > 0] via exponential Gamma link
        3. pure_premium: p_claim * e_severity * exp(log_exposure)
        """
        # Linear score for occurrence
        z_freq = np.dot(X, self.freq_weights) + self.freq_bias + log_exposure
        p_claim = 1.0 / (1.0 + np.exp(-np.clip(z_freq, -15.0, 15.0)))

        # Log link for positive severity
        z_sev = np.dot(X, self.sev_weights) + self.sev_bias
        e_severity = np.exp(np.clip(z_sev, 4.0, 12.0))

        exposure = np.exp(log_exposure)
        pure_premium = p_claim * e_severity * exposure

        return p_claim, e_severity, pure_premium
