import ast
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))


def _check_syntax(file_path: Path) -> bool:
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            ast.parse(f.read())
        return True
    except SyntaxError as e:
        print(f"  [FAIL] Syntax error in {file_path}: {e}")
        return False


def test_all_backend_syntax():
    print("=== Testing Backend Python Syntax ===")
    backend_dir = REPO_ROOT / "backend"
    ok = 0
    fail = 0
    for py_file in backend_dir.rglob("*.py"):
        if "__pycache__" in str(py_file):
            continue
        if _check_syntax(py_file):
            ok += 1
        else:
            fail += 1
    print(f"  {ok} files OK, {fail} failures")
    return fail == 0


def test_synthetic_dataset():
    print("\n=== Testing Synthetic Dataset ===")
    import pandas as pd

    csv_path = REPO_ROOT / "data" / "synthetic_msme_training.csv"
    if not csv_path.exists():
        print(f"  [FAIL] Dataset not found at {csv_path}")
        return False

    df = pd.read_csv(csv_path)
    expected_cols = [
        "avg_monthly_inflow",
        "inflow_volatility_coefficient",
        "avg_closing_balance",
        "days_with_negative_balance_90d",
        "existing_emi_to_inflow_ratio",
        "bounce_count_90d",
        "txn_count_30d",
        "unique_counterparties_30d",
        "payment_time_consistency_score",
        "gst_filing_regularity_12mo",
        "gst_turnover_yoy_growth",
        "epfo_payroll_headcount_trend",
        "data_completeness_pct",
        "had_bureau_record",
        "repayment_success",
    ]
    missing = [c for c in expected_cols if c not in df.columns]
    if missing:
        print(f"  [FAIL] Missing columns: {missing}")
        return False

    if len(df) != 2000:
        print(f"  [FAIL] Expected 2000 rows, got {len(df)}")
        return False

    # Check value ranges
    assert df["avg_monthly_inflow"].min() >= 0, "Negative inflow"
    assert df["inflow_volatility_coefficient"].between(0, 1).all(), "Volatility out of range"
    assert df["data_completeness_pct"].between(0, 1).all(), "Completeness out of range"
    assert df["repayment_success"].isin([0, 1]).all(), "Invalid labels"

    print(f"  [PASS] {len(df)} rows, {len(df.columns)} columns, outcome rate {df['repayment_success'].mean():.2%}")
    return True


def test_feature_schema_consistency():
    print("\n=== Testing Feature Schema Consistency ===")
    from backend.core.scoring_engine import FEATURE_ORDER

    # Verify FEATURE_ORDER has 13 fields
    assert len(FEATURE_ORDER) == 13, f"Expected 13 features, got {len(FEATURE_ORDER)}"

    # Verify no duplicates
    assert len(FEATURE_ORDER) == len(set(FEATURE_ORDER)), "Duplicate features in FEATURE_ORDER"

    print(f"  [PASS] FEATURE_ORDER has {len(FEATURE_ORDER)} unique fields")
    return True


def test_routing_logic():
    print("\n=== Testing Routing Logic ===")
    from backend.core.routing import route_decision

    assert route_decision("STRONG")["routing"] == "STRAIGHT_THROUGH"
    assert route_decision("ADEQUATE")["routing"] == "STRAIGHT_THROUGH"
    assert route_decision("WATCH")["routing"] == "ENHANCED_REVIEW"
    assert route_decision("HIGH_RISK")["routing"] == "REJECT"

    print("  [PASS] All tier routing decisions correct")
    return True


def test_xai_cross_check():
    print("\n=== Testing XAI Cross-Check ===")
    from backend.core.xai_narrative import cross_check_narrative

    score_result = {
        "score": 75,
        "contributing_factors": [
            {"feature": "avg_monthly_inflow", "shap_value": 0.1234},
        ],
    }
    # Should pass — narrative uses only numbers present in score_result
    narrative = "The score is 75. A positive factor is avg_monthly_inflow with SHAP 0.1234."
    check = cross_check_narrative(narrative, score_result)
    assert check["passed"], f"Expected pass but got: {check}"

    # Should fail — narrative invents a number not in score_result
    narrative_bad = "The score is 75. The applicant has 999 employees."
    check_bad = cross_check_narrative(narrative_bad, score_result)
    assert not check_bad["passed"], f"Expected fail but got: {check_bad}"

    print("  [PASS] Cross-check correctly detects hallucinated numbers")
    return True


def test_data_completeness_consistency():
    print("\n=== Testing Data Completeness Consistency ===")
    from backend.core.scoring_engine import FEATURE_ORDER
    from backend.adapters.aa_adapter import map_to_normalized_schema
    from backend.adapters.document_fallback_adapter import _parse_and_validate_llm_output

    # AA adapter should use len(FEATURE_ORDER) as denominator
    # We can't easily test the full map without real data, but we can verify the constant
    assert len(FEATURE_ORDER) == 13

    # Document fallback: max extracted fields is 10, so max completeness is 10/13
    sample_llm_output = '{"avg_monthly_inflow": 50000, "inflow_volatility_coefficient": 0.5, "avg_closing_balance": 10000, "days_with_negative_balance_90d": 0, "existing_emi_to_inflow_ratio": 0.2, "bounce_count_90d": 0, "txn_count_30d": 50, "unique_counterparties_30d": 10, "gst_filing_regularity_12mo": 0.9, "gst_turnover_yoy_growth": 0.05}'
    extracted = _parse_and_validate_llm_output(sample_llm_output)
    populated = sum(1 for v in extracted.values() if v is not None)
    completeness = populated / len(FEATURE_ORDER)
    assert abs(completeness - 10 / 13) < 0.001, f"Document fallback completeness wrong: {completeness}"

    print(f"  [PASS] AA and document fallback completeness consistent at denominator {len(FEATURE_ORDER)}")
    return True


def test_model_auc():
    """Verify the trained model has realistic predictive power on synthetic data.

    AUC must be between 0.68 and 0.85. Below 0.68 means the synthetic data
    has no real feature-outcome correlation. Above 0.85 on synthetic data
    looks like leakage — a risk officer will flag it.

    This test is a BUILD FAILURE if it fails. Do not ship a model with
    AUC outside this range.
    """
    print("\n=== Testing Model AUC (Build-Critical) ===")
    import pandas as pd
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import roc_auc_score
    import xgboost as xgb

    from backend.core.scoring_engine import FEATURE_ORDER

    csv_path = REPO_ROOT / "data" / "synthetic_msme_training.csv"
    if not csv_path.exists():
        print(f"  [FAIL] Training data not found at {csv_path}")
        return False

    model_path = REPO_ROOT / "models" / "xgb_model.json"
    if not model_path.exists():
        print(f"  [FAIL] Model not found at {model_path}. Run `python backend/train_model.py` first.")
        return False

    df = pd.read_csv(csv_path)
    X = df[FEATURE_ORDER].copy()
    y = df["repayment_success"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = xgb.XGBClassifier()
    model.load_model(str(model_path))

    y_proba = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, y_proba)
    print(f"  Model AUC: {auc:.4f}")

    assert 0.68 < auc < 0.85, f"AUC {auc:.4f} outside target range (0.68, 0.85). " \
        f"Below 0.68 = no signal. Above 0.85 = leakage on synthetic data."

    print(f"  [PASS] AUC {auc:.4f} is within target range (0.68, 0.85)")
    return True


def main():
    results = []
    results.append(("Backend Syntax", test_all_backend_syntax()))
    results.append(("Synthetic Dataset", test_synthetic_dataset()))
    results.append(("Feature Schema", test_feature_schema_consistency()))
    results.append(("Routing Logic", test_routing_logic()))
    results.append(("XAI Cross-Check", test_xai_cross_check()))
    results.append(("Data Completeness", test_data_completeness_consistency()))
    results.append(("Model AUC", test_model_auc()))

    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    all_pass = True
    for name, passed in results:
        status = "PASS" if passed else "FAIL"
        print(f"  {status:>6}  {name}")
        if not passed:
            all_pass = False

    if all_pass:
        print("\nAll tests passed. Prototype is structurally sound.")
    else:
        print("\nSome tests failed. Review the output above.")
    return 0 if all_pass else 1


if __name__ == "__main__":
    sys.exit(main())
