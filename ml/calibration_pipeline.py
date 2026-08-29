#!/usr/bin/env python3
"""
Actuarial Probability Calibration and Decision Threshold Pipeline (Phase 4)
Python Pure Standard Library Implementation & Reproducibility Runner
"""

import json
import math
import os
import random
from typing import Dict, List, Tuple, Any

def generate_actuarial_dataset(n_samples: int = 500, seed: int = 42) -> List[Dict[str, Any]]:
    """Generates synthetic actuarial benchmark records matching CAS properties using standard library."""
    rng = random.Random(seed)
    records = []

    for i in range(n_samples):
        age = rng.randint(18, 78)
        experience = max(0, age - rng.randint(16, 25))
        # Normal approximation using Box-Muller
        u1, u2 = max(1e-6, rng.random()), rng.random()
        z0 = math.sqrt(-2.0 * math.log(u1)) * math.cos(2.0 * math.pi * u2)
        credit_score = int(max(350, min(850, 680 + z0 * 75)))
        annual_mileage = int(math.exp(9.3 + 0.45 * (rng.random() - 0.5) * 2))
        vehicle_value = int(math.exp(10.0 + 0.55 * (rng.random() - 0.5) * 2))
        
        prior_claims = rng.choices([0, 1, 2, 3], weights=[0.78, 0.15, 0.05, 0.02])[0]
        violations = rng.choices([0, 1, 2, 3], weights=[0.82, 0.12, 0.04, 0.02])[0]
        exposure = round(rng.uniform(0.2, 1.0), 2)
        
        zone = rng.choices(
            ['urban_high_density', 'suburban_metro', 'semi_rural', 'rural_low_density'],
            weights=[0.35, 0.35, 0.20, 0.10]
        )[0]
        vehicle_cat = rng.choices(
            ['sedan', 'suv', 'truck', 'sports_coupe', 'luxury_ev'],
            weights=[0.45, 0.30, 0.12, 0.08, 0.05]
        )[0]

        # Logit link for claim occurrence
        linear_predictor = (
            -2.45
            + 0.55 * (1 if age < 22 else 0)
            + 0.30 * (1 if age < 26 else 0)
            + 0.40 * prior_claims
            + 0.30 * violations
            + 0.25 * (1 if zone == 'urban_high_density' else 0)
            + 0.20 * (1 if vehicle_cat == 'sports_coupe' else 0)
            - 0.22 * (1 if credit_score > 740 else 0)
            + math.log(exposure)
        )
        prob = 1.0 / (1.0 + math.exp(-linear_predictor))
        claim_occurred = 1 if rng.random() < prob else 0

        records.append({
            "id": f"POL-{i+1:05d}",
            "age": age,
            "experience": experience,
            "credit_score": credit_score,
            "annual_mileage": annual_mileage,
            "vehicle_value": vehicle_value,
            "prior_claims": prior_claims,
            "traffic_violations": violations,
            "exposure": exposure,
            "zone": zone,
            "vehicle_category": vehicle_cat,
            "claim_occurred": claim_occurred,
        })

    return records


class SimpleFeaturePreprocessor:
    def __init__(self):
        self.means = {}
        self.stds = {}
        self.feature_names = []

    def fit(self, data: List[Dict[str, Any]]):
        num_keys = ["age", "experience", "credit_score", "prior_claims", "traffic_violations", "exposure"]
        for k in num_keys:
            vals = [d[k] for d in data]
            m = sum(vals) / len(vals)
            s = math.sqrt(sum((v - m) ** 2 for v in vals) / len(vals))
            self.means[k] = m
            self.stds[k] = max(1e-5, s)

        # Log keys
        for k in ["annual_mileage", "vehicle_value"]:
            vals = [math.log(max(1, d[k])) for d in data]
            m = sum(vals) / len(vals)
            s = math.sqrt(sum((v - m) ** 2 for v in vals) / len(vals))
            self.means[k] = m
            self.stds[k] = max(1e-5, s)

        self.feature_names = [
            "age", "experience", "credit_score", "log_mileage", "log_vehicle_value",
            "prior_claims", "traffic_violations", "exposure",
            "zone_urban", "zone_suburban", "zone_rural",
            "cat_suv", "cat_sports", "cat_truck"
        ]
        return self

    def transform(self, data: List[Dict[str, Any]]) -> Tuple[List[List[float]], List[int]]:
        X, y = [], []
        for d in data:
            row = [
                (d["age"] - self.means["age"]) / self.stds["age"],
                (d["experience"] - self.means["experience"]) / self.stds["experience"],
                (d["credit_score"] - self.means["credit_score"]) / self.stds["credit_score"],
                (math.log(max(1, d["annual_mileage"])) - self.means["annual_mileage"]) / self.stds["annual_mileage"],
                (math.log(max(1, d["vehicle_value"])) - self.means["vehicle_value"]) / self.stds["vehicle_value"],
                (d["prior_claims"] - self.means["prior_claims"]) / self.stds["prior_claims"],
                (d["traffic_violations"] - self.means["traffic_violations"]) / self.stds["traffic_violations"],
                (d["exposure"] - self.means["exposure"]) / self.stds["exposure"],
                1.0 if d["zone"] == "urban_high_density" else 0.0,
                1.0 if d["zone"] == "suburban_metro" else 0.0,
                1.0 if d["zone"] == "rural_low_density" else 0.0,
                1.0 if d["vehicle_category"] == "suv" else 0.0,
                1.0 if d["vehicle_category"] == "sports_coupe" else 0.0,
                1.0 if d["vehicle_category"] == "truck" else 0.0,
            ]
            X.append(row)
            y.append(d["claim_occurred"])
        return X, y


class DecisionTreeStump:
    def __init__(self, feat_idx: int, threshold: float, left_val: float, right_val: float):
        self.feat_idx = feat_idx
        self.threshold = threshold
        self.left_val = left_val
        self.right_val = right_val

    def predict(self, x: List[float]) -> float:
        return self.left_val if x[self.feat_idx] <= self.threshold else self.right_val


class SimpleGBDT:
    def __init__(self, n_estimators=30, lr=0.08):
        self.n_estimators = n_estimators
        self.lr = lr
        self.trees: List[DecisionTreeStump] = []
        self.init_raw = 0.0

    def fit(self, X: List[List[float]], y: List[int]):
        n = len(y)
        pos = sum(y)
        p0 = max(1e-4, min(1 - 1e-4, pos / n))
        self.init_raw = math.log(p0 / (1.0 - p0))

        raw_preds = [self.init_raw] * n
        n_feats = len(X[0])

        for _ in range(self.n_estimators):
            # Compute negative gradient of log loss: g_i = y_i - p_i
            probs = [1.0 / (1.0 + math.exp(-r)) for r in raw_preds]
            residuals = [y[i] - probs[i] for i in range(n)]

            best_feat = 0
            best_th = 0.0
            best_mse = float('inf')
            best_l_val = 0.0
            best_r_val = 0.0

            for f in range(n_feats):
                vals = sorted([row[f] for row in X])
                thresholds = [vals[int(len(vals) * q)] for q in [0.25, 0.50, 0.75]]
                for th in thresholds:
                    left_res = [residuals[i] for i in range(n) if X[i][f] <= th]
                    right_res = [residuals[i] for i in range(n) if X[i][f] > th]
                    if len(left_res) < 2 or len(right_res) < 2:
                        continue
                    l_val = sum(left_res) / len(left_res)
                    r_val = sum(right_res) / len(right_res)
                    mse = sum((r - l_val)**2 for r in left_res) + sum((r - r_val)**2 for r in right_res)
                    if mse < best_mse:
                        best_mse = mse
                        best_feat = f
                        best_th = th
                        best_l_val = l_val
                        best_r_val = r_val

            tree = DecisionTreeStump(best_feat, best_th, best_l_val, best_r_val)
            self.trees.append(tree)

            for i in range(n):
                raw_preds[i] += self.lr * tree.predict(X[i])

    def predict_probabilities(self, X: List[List[float]]) -> List[float]:
        probs = []
        for row in X:
            r = self.init_raw
            for tree in self.trees:
                r += self.lr * tree.predict(row)
            p = 1.0 / (1.0 + math.exp(-max(-20, min(20, r))))
            probs.append(p)
        return probs


class PlattSigmoidCalibrator:
    def __init__(self, l2_reg: float = 0.001, lr: float = 0.05, max_iter: int = 300):
        self.a = 1.0
        self.b = 0.0
        self.l2_reg = l2_reg
        self.lr = lr
        self.max_iter = max_iter
        self.is_fitted = False

    def fit(self, probs: List[float], y_true: List[int]):
        n_pos = sum(y_true)
        n_neg = len(y_true) - n_pos

        hi_target = (n_pos + 1.0) / (n_pos + 2.0)
        lo_target = 1.0 / (n_neg + 2.0)
        targets = [hi_target if y == 1 else lo_target for y in y_true]

        logits = []
        for p in probs:
            clamped = max(1e-6, min(1.0 - 1e-6, p))
            logits.append(math.log(clamped / (1.0 - clamped)))

        a, b = 1.0, 0.0
        n = len(logits)

        for _ in range(self.max_iter):
            grad_a, grad_b = 0.0, 0.0
            for i in range(n):
                logit = logits[i]
                t = targets[i]
                f = a * logit + b
                p_hat = 1.0 / (1.0 + math.exp(-max(-20.0, min(20.0, f))))
                err = p_hat - t
                grad_a += err * logit
                grad_b += err

            grad_a = grad_a / n + self.l2_reg * (a - 1.0)
            grad_b = grad_b / n + self.l2_reg * b

            a -= self.lr * grad_a
            b -= self.lr * grad_b
            if a < 0.01:
                a = 0.01

        self.a = a
        self.b = b
        self.is_fitted = True
        return self

    def predict_probabilities(self, probs: List[float]) -> List[float]:
        if not self.is_fitted:
            return probs[:]
        calibrated = []
        for p in probs:
            clamped = max(1e-6, min(1.0 - 1e-6, p))
            logit = math.log(clamped / (1.0 - clamped))
            f = self.a * logit + self.b
            p_cal = 1.0 / (1.0 + math.exp(-max(-25.0, min(25.0, f))))
            calibrated.append(max(0.0001, min(0.9999, p_cal)))
        return calibrated


def calculate_brier_score(probs: List[float], y_true: List[int]) -> float:
    return sum((p - y) ** 2 for p, y in zip(probs, y_true)) / len(y_true)

def calculate_log_loss(probs: List[float], y_true: List[int], eps=1e-15) -> float:
    return -sum(
        y * math.log(max(eps, min(1.0 - eps, p))) + (1 - y) * math.log(max(eps, min(1.0 - eps, 1.0 - p)))
        for p, y in zip(probs, y_true)
    ) / len(y_true)

def calculate_roc_auc(probs: List[float], y_true: List[int]) -> float:
    pos_probs = [p for p, y in zip(probs, y_true) if y == 1]
    neg_probs = [p for p, y in zip(probs, y_true) if y == 0]
    if not pos_probs or not neg_probs:
        return 0.5
    concordant = sum(1.0 for pos in pos_probs for neg in neg_probs if pos > neg)
    ties = sum(0.5 for pos in pos_probs for neg in neg_probs if pos == neg)
    return (concordant + ties) / (len(pos_probs) * len(neg_probs))

def calculate_confusion_matrix(probs: List[float], y_true: List[int], threshold: float) -> Dict[str, Any]:
    tp = sum(1 for p, y in zip(probs, y_true) if p >= threshold and y == 1)
    fp = sum(1 for p, y in zip(probs, y_true) if p >= threshold and y == 0)
    tn = sum(1 for p, y in zip(probs, y_true) if p < threshold and y == 0)
    fn = sum(1 for p, y in zip(probs, y_true) if p < threshold and y == 1)

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
    balanced_acc = (recall + specificity) / 2.0

    return {
        "threshold": threshold,
        "true_positives": tp,
        "false_positives": fp,
        "true_negatives": tn,
        "false_negatives": fn,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "specificity": round(specificity, 4),
        "f1_score": round(f1, 4),
        "balanced_accuracy": round(balanced_acc, 4),
    }

def compute_calibration_curve(probs: List[float], y_true: List[int], num_bins: int = 10):
    n = len(probs)
    bin_step = 1.0 / num_bins
    bins_data = []
    ece = 0.0
    mce = 0.0

    for k in range(num_bins):
        bin_min = k * bin_step
        bin_max = (k + 1) * bin_step

        indices = [
            i for i, p in enumerate(probs)
            if (bin_min <= p <= bin_max if k == num_bins - 1 else bin_min <= p < bin_max)
        ]
        count = len(indices)
        if count == 0:
            bins_data.append({
                "bin_index": k + 1,
                "bin_min": round(bin_min, 2),
                "bin_max": round(bin_max, 2),
                "sample_count": 0,
                "mean_predicted_prob": round((bin_min + bin_max) / 2.0, 4),
                "empirical_true_frequency": 0.0,
                "absolute_calibration_error": 0.0,
            })
            continue

        mean_pred = sum(probs[i] for i in indices) / count
        true_freq = sum(y_true[i] for i in indices) / count
        abs_err = abs(mean_pred - true_freq)

        ece += (count / n) * abs_err
        if abs_err > mce:
            mce = abs_err

        bins_data.append({
            "bin_index": k + 1,
            "bin_min": round(bin_min, 2),
            "bin_max": round(bin_max, 2),
            "sample_count": count,
            "mean_predicted_prob": round(mean_pred, 4),
            "empirical_true_frequency": round(true_freq, 4),
            "absolute_calibration_error": round(abs_err, 4),
        })

    return bins_data, round(ece, 4), round(mce, 4)


def run_phase4_calibration_pipeline(seed: int = 42) -> Dict[str, Any]:
    print("=" * 70)
    print("RUNNING PHASE 4: PROBABILITY CALIBRATION & DECISION THRESHOLD PIPELINE")
    print("=" * 70)

    dataset = generate_actuarial_dataset(n_samples=500, seed=seed)
    
    positives = [r for r in dataset if r["claim_occurred"] == 1]
    negatives = [r for r in dataset if r["claim_occurred"] == 0]

    rng = random.Random(seed)
    rng.shuffle(positives)
    rng.shuffle(negatives)

    def split_list(items, tr=0.70, vr=0.15):
        n = len(items)
        n_tr = int(n * tr)
        n_vr = int(n * vr)
        return items[:n_tr], items[n_tr:n_tr + n_vr], items[n_tr + n_vr:]

    pos_tr, pos_val, pos_te = split_list(positives)
    neg_tr, neg_val, neg_te = split_list(negatives)

    train_data = pos_tr + neg_tr
    val_data = pos_val + neg_val
    test_data = pos_te + neg_te
    rng.shuffle(train_data)
    rng.shuffle(val_data)
    rng.shuffle(test_data)

    print(f"Dataset Partitions: Train={len(train_data)}, Validation={len(val_data)}, Test={len(test_data)}")

    preprocessor = SimpleFeaturePreprocessor().fit(train_data)
    X_train, y_train = preprocessor.transform(train_data)
    X_val, y_val = preprocessor.transform(val_data)
    X_test, y_test = preprocessor.transform(test_data)

    print("Fitting Candidate Model: Gradient Boosted Trees (GBDT)...")
    gbdt = SimpleGBDT(n_estimators=30, lr=0.08)
    gbdt.fit(X_train, y_train)

    val_raw_probs = gbdt.predict_probabilities(X_val)
    test_raw_probs = gbdt.predict_probabilities(X_test)

    print("Fitting Platt Sigmoid Calibrator strictly on Validation Set...")
    calibrator = PlattSigmoidCalibrator().fit(val_raw_probs, y_val)
    val_cal_probs = calibrator.predict_probabilities(val_raw_probs)
    test_cal_probs = calibrator.predict_probabilities(test_raw_probs)

    # Threshold sweep strictly on validation
    val_sweep = [
        calculate_confusion_matrix(val_cal_probs, y_val, round(t * 0.01, 2))
        for t in range(1, 61)
    ]
    best_val_pt = max(val_sweep, key=lambda x: x["f1_score"])
    selected_threshold = best_val_pt["threshold"]
    print(f"Optimal Threshold derived from Validation: {selected_threshold:.2f} (Val F1: {best_val_pt['f1_score']:.4f})")

    # Evaluate on Untouched Test Set
    uncal_bins, uncal_ece, uncal_mce = compute_calibration_curve(test_raw_probs, y_test, 10)
    cal_bins, cal_ece, cal_mce = compute_calibration_curve(test_cal_probs, y_test, 10)

    uncal_brier = calculate_brier_score(test_raw_probs, y_test)
    cal_brier = calculate_brier_score(test_cal_probs, y_test)

    uncal_logloss = calculate_log_loss(test_raw_probs, y_test)
    cal_logloss = calculate_log_loss(test_cal_probs, y_test)

    uncal_roc = calculate_roc_auc(test_raw_probs, y_test)
    cal_roc = calculate_roc_auc(test_cal_probs, y_test)

    cm_selected = calculate_confusion_matrix(test_cal_probs, y_test, selected_threshold)
    cm_default = calculate_confusion_matrix(test_cal_probs, y_test, 0.50)

    print("\n" + "-" * 70)
    print("PHASE 4 BENCHMARK EVALUATION ON UNTOUCHED TEST PARTITION:")
    print(f"  Uncalibrated Brier Score: {uncal_brier:.4f}  -->  Calibrated Brier Score: {cal_brier:.4f}")
    print(f"  Uncalibrated Log Loss:    {uncal_logloss:.4f}  -->  Calibrated Log Loss:    {cal_logloss:.4f}")
    print(f"  Uncalibrated ECE:         {uncal_ece:.4f}  -->  Calibrated ECE:         {cal_ece:.4f}")
    print(f"  ROC-AUC (Discrimination): {uncal_roc:.4f}  -->  Calibrated ROC-AUC:      {cal_roc:.4f}")
    print("-" * 70)
    print(f"TEST CONFUSION MATRIX @ VALIDATION-DERIVED THRESHOLD ({selected_threshold:.2f}):")
    print(f"  TP: {cm_selected['true_positives']} | FP: {cm_selected['false_positives']} | TN: {cm_selected['true_negatives']} | FN: {cm_selected['false_negatives']}")
    print(f"  Precision: {cm_selected['precision']:.4f} | Recall: {cm_selected['recall']:.4f} | F1: {cm_selected['f1_score']:.4f}")
    print(f"  Balanced Accuracy: {cm_selected['balanced_accuracy'] * 100:.2f}% | Specificity: {cm_selected['specificity']:.4f}")
    print("-" * 70)
    print(f"TEST CONFUSION MATRIX @ DEFAULT NAIVE THRESHOLD (0.50):")
    print(f"  TP: {cm_default['true_positives']} | FP: {cm_default['false_positives']} | TN: {cm_default['true_negatives']} | FN: {cm_default['false_negatives']}")
    print(f"  Precision: {cm_default['precision']:.4f} | Recall: {cm_default['recall']:.4f} | F1: {cm_default['f1_score']:.4f}")
    print("=" * 70)

    report = {
        "model_id": "gradient_boosting_deviance",
        "calibration_method": "Platt Scaling (Sigmoid Logistic)",
        "platt_params": {"a": round(calibrator.a, 4), "b": round(calibrator.b, 4)},
        "selected_threshold": selected_threshold,
        "metrics": {
            "uncalibrated_brier": round(uncal_brier, 4),
            "calibrated_brier": round(cal_brier, 4),
            "uncalibrated_log_loss": round(uncal_logloss, 4),
            "calibrated_log_loss": round(cal_logloss, 4),
            "uncalibrated_ece": uncal_ece,
            "calibrated_ece": cal_ece,
            "uncalibrated_mce": uncal_mce,
            "calibrated_mce": cal_mce,
            "roc_auc": round(cal_roc, 4),
        },
        "test_confusion_matrix_selected": cm_selected,
        "test_confusion_matrix_05": cm_default,
    }

    os.makedirs("ml/artifacts", exist_ok=True)
    with open("ml/artifacts/phase4_calibration_artifacts.json", "w") as f:
        json.dump(report, f, indent=2)

    return report


if __name__ == "__main__":
    run_phase4_calibration_pipeline(seed=42)
