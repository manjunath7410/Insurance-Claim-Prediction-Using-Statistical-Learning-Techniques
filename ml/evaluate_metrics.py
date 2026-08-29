"""
Insurance Claim Risk Intelligence Platform - Actuarial Evaluation Suite
=======================================================================
Implements standardized actuarial metrics:
- Normalized Gini Index (Gini = 1 - 2 * AUC(Lorenz))
- Lorenz Risk Ordering Curve
- Brier Reliability & Resolution Decomposition
- Poisson & Gamma Deviance
"""

import numpy as np
from typing import Dict, Any, Tuple


def calculate_lorenz_and_gini(y_true: np.ndarray, y_pred: np.ndarray, exposure: np.ndarray = None) -> Tuple[float, np.ndarray, np.ndarray]:
    """
    Computes Normalized Gini Index and Lorenz curve coordinate arrays.
    
    Args:
        y_true: Actual losses or binary claim indicators
        y_pred: Predicted pure premium or frequency
        exposure: Policyholder exposure weight
    
    Returns:
        normalized_gini: Gini coefficient scaled to [0, 1] relative to oracle
        cumulative_exposure_pct: X-axis coordinates of Lorenz curve
        cumulative_loss_pct: Y-axis coordinates of Lorenz curve
    """
    if exposure is None:
        exposure = np.ones_like(y_true)

    # Sort policyholders by ascending predicted risk
    order = np.argsort(y_pred)
    sorted_losses = y_true[order]
    sorted_exp = exposure[order]

    cum_exp = np.cumsum(sorted_exp) / np.sum(sorted_exp)
    cum_loss = np.cumsum(sorted_losses) / np.sum(sorted_losses)

    # Prepend (0, 0) origin
    cum_exp = np.insert(cum_exp, 0, 0.0)
    cum_loss = np.insert(cum_loss, 0, 0.0)

    # Trapezoidal integration for Area Under Lorenz Curve
    auc_lorenz = np.trapz(cum_loss, cum_exp)
    raw_gini = 1.0 - 2.0 * auc_lorenz

    # Oracle Gini (perfect sorting by actual loss)
    oracle_order = np.argsort(y_true)
    oracle_cum_exp = np.cumsum(exposure[oracle_order]) / np.sum(exposure)
    oracle_cum_loss = np.cumsum(y_true[oracle_order]) / np.sum(y_true)
    oracle_cum_exp = np.insert(oracle_cum_exp, 0, 0.0)
    oracle_cum_loss = np.insert(oracle_cum_loss, 0, 0.0)
    oracle_auc = np.trapz(oracle_cum_loss, oracle_cum_exp)
    oracle_gini = 1.0 - 2.0 * oracle_auc

    normalized_gini = float(raw_gini / oracle_gini) if oracle_gini != 0 else float(raw_gini)
    return normalized_gini, cum_exp, cum_loss


def calculate_brier_score_decomposition(y_true_binary: np.ndarray, p_pred: np.ndarray, n_bins: int = 10) -> Dict[str, float]:
    """
    Decomposes Brier Score into:
    Brier = Reliability (Calibration error) - Resolution (Discrimination) + Uncertainty
    """
    base_rate = float(np.mean(y_true_binary))
    uncertainty = base_rate * (1.0 - base_rate)

    bin_edges = np.linspace(0.0, 1.0, n_bins + 1)
    bin_assignments = np.digitize(p_pred, bin_edges) - 1

    reliability = 0.0
    resolution = 0.0
    total_n = len(y_true_binary)

    for k in range(n_bins):
        mask = (bin_assignments == k)
        n_k = np.sum(mask)
        if n_k > 0:
            p_bar_k = float(np.mean(p_pred[mask]))
            y_bar_k = float(np.mean(y_true_binary[mask]))
            reliability += (n_k / total_n) * ((p_bar_k - y_bar_k) ** 2)
            resolution += (n_k / total_n) * ((y_bar_k - base_rate) ** 2)

    total_brier = float(np.mean((p_pred - y_true_binary) ** 2))

    return {
        'total_brier': total_brier,
        'reliability_calibration_loss': reliability,
        'resolution_discrimination_gain': resolution,
        'uncertainty_base_entropy': uncertainty,
    }
