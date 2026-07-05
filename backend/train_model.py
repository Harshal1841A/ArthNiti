"""ArthNiti — Model training script.

Trains XGBClassifier on synthetic data and saves it for the scoring core.

Usage:
    python backend/train_model.py

Prerequisites:
    python backend/data/generate_synthetic_training_data.py --n 2000 --seed 42
"""

import sys
from pathlib import Path

_repo_root = Path(__file__).resolve().parents[1]
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score
import xgboost as xgb

from backend.core.scoring_engine import FEATURE_ORDER


def main():
    data_path = _repo_root / "data" / "synthetic_msme_training.csv"
    if not data_path.exists():
        print(f"Training data not found at {data_path}")
        print("Run: python backend/data/generate_synthetic_training_data.py")
        sys.exit(1)

    df = pd.read_csv(data_path)
    print(f"Loaded {len(df)} rows from {data_path}")

    X = df[FEATURE_ORDER].copy()
    y = df["repayment_success"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="logloss",
        random_state=42,
    )
    model.fit(X_train, y_train)

    # Evaluate
    y_proba = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, y_proba)
    print(f"Test AUC: {auc:.4f}")

    if not (0.68 < auc < 0.85):
        print(f"WARNING: AUC {auc:.4f} is outside the target range (0.68, 0.85).")
        print("         Below 0.68 = no signal. Above 0.85 = leakage on synthetic data.")
        print("         Regenerate synthetic data or adjust noise parameters.")

    # Save model
    model_dir = _repo_root / "models"
    model_dir.mkdir(parents=True, exist_ok=True)
    model_path = model_dir / "xgb_model.json"
    model.save_model(str(model_path))
    print(f"Model saved to {model_path}")
    print(f"DISCLOSURE: AUC computed on synthetic data with injected noise.")
    print(f"          Not predictive of real-world performance.")


if __name__ == "__main__":
    main()
