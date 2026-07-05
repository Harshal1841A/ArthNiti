import sys
import pandas as pd
from pathlib import Path

# Add repo root to path
REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from backend.core.scoring_engine import ScoringCore
from backend.core.feature_schema import NormalizedApplicantFeatures, DataSourceType

def analyze_impact():
    print("Loading dataset...")
    csv_path = REPO_ROOT / "data" / "synthetic_msme_training.csv"
    if not csv_path.exists():
        print(f"Error: {csv_path} not found.")
        sys.exit(1)
        
    df = pd.read_csv(csv_path)
    
    # Filter NTC/NTB applicants
    ntc_df = df[df["had_bureau_record"] == False]
    total_ntc = len(ntc_df)
    
    print(f"Found {total_ntc} NTC/NTB applicants out of {len(df)} total.")
    if total_ntc == 0:
        print("No NTC applicants to analyze.")
        sys.exit(0)
        
    print("Loading scoring engine...")
    try:
        model_path = str(REPO_ROOT / "models" / "xgb_model.json")
        core = ScoringCore(model_path)
    except FileNotFoundError:
        print(f"Error: Model not found at {model_path}.")
        print("Run `python backend/train_model.py` first.")
        sys.exit(1)
        
    print("Scoring NTC applicants...")
    adequate_or_better = 0
    
    for _, row in ntc_df.iterrows():
        # Convert NaN to None for Pydantic
        row_dict = {k: (None if pd.isna(v) else v) for k, v in row.items()}
        
        # Build normalized features payload
        features = NormalizedApplicantFeatures(
            applicant_id="IMPACT-ANALYSIS",
            data_sources_used=[DataSourceType.AA_BANK_STATEMENT],
            had_bureau_record=False,
            data_completeness_pct=row_dict.get("data_completeness_pct", 0.8),
            avg_monthly_inflow=row_dict.get("avg_monthly_inflow"),
            inflow_volatility_coefficient=row_dict.get("inflow_volatility_coefficient"),
            avg_closing_balance=row_dict.get("avg_closing_balance"),
            days_with_negative_balance_90d=row_dict.get("days_with_negative_balance_90d"),
            existing_emi_to_inflow_ratio=row_dict.get("existing_emi_to_inflow_ratio"),
            bounce_count_90d=row_dict.get("bounce_count_90d"),
            txn_count_30d=row_dict.get("txn_count_30d"),
            unique_counterparties_30d=row_dict.get("unique_counterparties_30d"),
            payment_time_consistency_score=row_dict.get("payment_time_consistency_score"),
            gst_filing_regularity_12mo=row_dict.get("gst_filing_regularity_12mo"),
            gst_turnover_yoy_growth=row_dict.get("gst_turnover_yoy_growth"),
            epfo_payroll_headcount_trend=row_dict.get("epfo_payroll_headcount_trend")
        )
        
        try:
            res = core.score(features)
            if res["score"] >= 50: # ADEQUATE or STRONG
                adequate_or_better += 1
        except Exception:
            continue
            
    pct_adequate = (adequate_or_better / total_ntc) * 100
    stat_msg = f"{pct_adequate:.1f}%"
    
    print("\n" + "="*50)
    print(f"BUSINESS IMPACT STATISTIC:")
    print(f"NTC Applicants scoring ADEQUATE or better: {adequate_or_better} / {total_ntc} ({stat_msg})")
    print("="*50 + "\n")
    
    docs_dir = REPO_ROOT / "docs"
    docs_dir.mkdir(exist_ok=True)
    
    md_path = docs_dir / "impact_stat.md"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("# ArthNiti Business Impact\n\n")
        f.write(f"> **{stat_msg} of New-to-Credit (NTC) applicants in our test dataset scored ADEQUATE (≥50) or better.**\n\n")
        f.write("*Disclosure: This metric is derived from our synthetic evaluation dataset (`data/synthetic_msme_training.csv`) used for hackathon prototyping. It is an illustrative indicator of the model's design to score thin-file applicants using alternative data, but is NOT predictive of real-world performance or representative of actual applicant distributions.*\n")
    
    print(f"Stat saved to {md_path}")

if __name__ == "__main__":
    analyze_impact()
