import pandas as pd
import numpy as np
import joblib
from pathlib import Path

from features import create_features
from inventory_math import calculate_inventory

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
