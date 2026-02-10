import pandas as pd
import numpy as np
import joblib
from pathlib import Path

from features import create_features
from inventory_math import calculate_inventory
from metrics import calculate_all_metrics, print_metrics

# =========================
# Load model & encoders
# =========================
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "data"

model = joblib.load(MODEL_DIR / "demand_model.pkl")
encoders = joblib.load(MODEL_DIR / "encoders.pkl")

# =========================
# Load data
# =========================
df = pd.read_csv(DATA_DIR / "retail_store_inventory.csv")

df.columns = (
    df.columns.str.strip().str.lower().str.replace(" ", "_").str.replace("/", "_")
)

df['date'] = pd.to_datetime(df['date'], errors='coerce')

# =========================
# Encode categorical columns
# =========================
for col, le in encoders.items():
    df[col] = le.transform(df[col].astype(str))

# =========================
# Feature engineering
# =========================
df = create_features(df)

# =========================
# Prediction
# =========================
FEATURES = [
    'store_id','product_id','category','region',
    'inventory_level','price','discount',
    'competitor_pricing','holiday_promotion',
    'seasonality','is_weekend','week','month',
    'lag_7','lag_14','lag_30','lag_60',
    'rolling_mean_7','rolling_mean_30'
]

df['predicted_weekly_demand'] = np.expm1(
    model.predict(df[FEATURES])
)

# =========================
# Evaluate Prediction Accuracy with Zero-Demand Handling
# =========================
print("\n" + "="*70)
print("📊 PREDICTION ACCURACY WITH ZERO-DEMAND HANDLING")
print("="*70)

# Load saved metrics if available
try:
    saved_metrics = joblib.load(MODEL_DIR / "model_metrics.pkl")
    print(f"\n📈 MODEL TRAINING METRICS:")
    print(f"   Training WAPE Accuracy: {saved_metrics.get('train_wape_accuracy', 0):.2f}%")
    print(f"   Validation WAPE Accuracy: {saved_metrics.get('valid_wape_accuracy', 0):.2f}%")
    print(f"   Validation SMAPE Accuracy: {saved_metrics.get('valid_smape_accuracy', 0):.2f}%")
    print(f"   Validation MAPE Accuracy: {saved_metrics.get('valid_mape_accuracy', 0):.2f}%")
    print(f"   Primary Metric: {saved_metrics.get('primary_metric', 'WAPE')}")
    print(f"   Zero-Demand Records: {saved_metrics.get('valid_zero_records', 0):,} ({saved_metrics.get('valid_zero_percentage', 0):.1f}%)")
except:
    print("\n⚠️  No saved training metrics found. Run train.py first.")

# Calculate accuracy on current predictions
actual = df['units_sold_7d'].values
predicted = df['predicted_weekly_demand'].values

# Remove any NaN values
mask = ~(np.isnan(actual) | np.isnan(predicted))
actual = actual[mask]
predicted = predicted[mask]

if len(actual) > 0:
    # Calculate comprehensive metrics
    current_metrics = calculate_all_metrics(
        actual, 
        predicted, 
        y_train=None,
        exclude_zeros=True  # Exclude zeros from MAPE
    )
    
    # Print metrics
    print_metrics(current_metrics, "CURRENT PREDICTIONS PERFORMANCE")
    
    # Per-store accuracy
    print(f"\n{'='*70}")
    print(f"📍 ACCURACY BY STORE (using WAPE)")
    print(f"{'='*70}")
    
    for store_id in sorted(df['store_id'].unique()):
        store_mask = (df['store_id'] == store_id) & mask
        if store_mask.sum() > 0:
            store_actual = actual[store_mask[:len(actual)]]
            store_predicted = predicted[store_mask[:len(predicted)]]
            if len(store_actual) > 0:
                store_metrics = calculate_all_metrics(
                    store_actual, 
                    store_predicted, 
                    exclude_zeros=True
                )
                print(f"\n   Store {store_id}:")
                print(f"      Records: {len(store_actual):,}")
                print(f"      Zero-Demand: {store_metrics['zero_records']:,} ({store_metrics['zero_percentage']:.1f}%)")
                print(f"      WAPE Accuracy: {store_metrics['wape_accuracy']:.2f}%")
                print(f"      SMAPE Accuracy: {store_metrics['smape_accuracy']:.2f}%")
                print(f"      MAPE Accuracy: {store_metrics['mape_accuracy']:.2f}%")
    
    print(f"\n{'='*70}")
    print(f"🎯 PREDICTION QUALITY ASSESSMENT")
    print(f"{'='*70}")
    
    # Use WAPE as primary metric
    primary_accuracy = current_metrics['wape_accuracy']
    
    print(f"\n   PRIMARY METRIC: WAPE Accuracy = {primary_accuracy:.2f}%")
    
    if primary_accuracy >= 90:
        print(f"\n   🌟 EXCELLENT! Predictions are highly reliable")
    elif primary_accuracy >= 80:
        print(f"\n   ✅ GOOD! Predictions are reliable")
    elif primary_accuracy >= 70:
        print(f"\n   ⚠️  MODERATE. Predictions are acceptable")
    else:
        print(f"\n   ❌ POOR. Model needs retraining with more data")
    
    print(f"\n{'='*70}")
else:
    print("\n⚠️  No valid predictions to evaluate")
    print("="*70)

# =========================
# Inventory decisions
# =========================
df = calculate_inventory(
    df,
    lead_time_weeks=1,
    service_level=1.65
)

# =========================
# Final reorder table
# =========================
reorder_table = df[df['stockout_risk'] == 1][[
    'store_id',
    'product_id',
    'inventory_level',
    'predicted_weekly_demand',
    'reorder_point',
    'order_quantity',
    'stockout_risk'
]]

print("\n📦 REORDER RECOMMENDATIONS:")
print(reorder_table.head(20))

# Save output
reorder_table.to_csv(DATA_DIR / "reorder_recommendations.csv", index=False)

print("\n✅ Inventory reorder file generated")
