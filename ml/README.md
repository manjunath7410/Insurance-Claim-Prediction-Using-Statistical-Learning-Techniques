# Machine Learning Pipeline & Statistical Formulations

This directory contains the Python-based machine learning pipeline specifications, feature transformation definitions, Tweedie objective functions, and actuarial evaluation metric implementations.

## Directory Structure

* `preprocessing.py`: Feature normalization, one-hot/ordinal encodings, actuarial offset calculation ($\ln(\text{Exposure})$), and zero-inflation stratified splitting.
* `tweedie_gbdt.py`: Compound Poisson-Gamma Tweedie loss deviance formulations for direct pure premium modeling ($1 < p < 2$).
* `hurdle_model.py`: Two-stage actuarial hurdle model separating frequency (Logistic Bernoulli) and severity magnitude (Gamma GLM).
* `evaluate_metrics.py`: Actuarial evaluation suite (Normalized Gini Index, Lorenz curves, Brier reliability/resolution decomposition, deviance residuals).
* `train_pipeline.py`: Reproducible reference pipeline execution and validation script.
* `requirements.txt`: Python dependencies (`numpy`, `pandas`, `scipy`, `scikit-learn`, `lightgbm`, `shap`).

## Execution

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r ml/requirements.txt
python ml/train_pipeline.py
```
