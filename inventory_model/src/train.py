import pandas as pd
import numpy as np
import joblib
from pathlib import Path

from xgboost import XGBRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error

from features import create_features

# =========================
# Load data
# =========================
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "data"

df = pd.read_csv(DATA_DIR / "retail_store_inventory.csv")

df.columns = (
    df.columns.str.strip().str.lower().str.replace(" ", "_").str.replace("/", "_")
)

df['date'] = pd.to_datetime(df['date'], errors='coerce')

# =========================
# BAD DATA REMOVAL (BIGGEST IMPACT)
# =========================
df = df[df['units_sold'] >= 0]
df = df[df['price'] > 0]
df = df.dropna()

# =========================
# Encode categoricals
# =========================
categorical_cols = [
    'store_id','product_id','category',
    'region','weather_condition','seasonality'
]

encoders = {}
for col in categorical_cols:
    le = LabelEncoder()
    df[col] = le.fit_transform(df[col].astype(str))
    encoders[col] = le

# =========================
# Feature engineering
# =========================
df = create_features(df)

print("\n📊 Weekly Demand Distribution:")
print(df['units_sold_7d'].describe())

# =========================
# Features & Target
# =========================
FEATURES = [
    'store_id','product_id','category','region',
    'inventory_level','price','discount',
    'competitor_pricing','holiday_promotion',
    'seasonality','is_weekend','week','month',
    'lag_7','lag_14','lag_30','lag_60',
    'rolling_mean_7','rolling_mean_30'
]

TARGET = 'log_units_sold_7d'

# =========================
# Time-safe split
# =========================
split_date = df['date'].quantile(0.80)

X_train = df[df['date'] <= split_date][FEATURES]
y_train = df[df['date'] <= split_date][TARGET]

X_valid = df[df['date'] > split_date][FEATURES]
y_valid = df[df['date'] > split_date][TARGET]

# =========================
# Train model
# =========================
model = XGBRegressor(
    n_estimators=600,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    min_child_weight=5,
    gamma=0.2,
    reg_alpha=0.5,
    reg_lambda=1.5,
    objective="reg:squarederror",
    tree_method="hist",
    random_state=42
)

model.fit(X_train, y_train)

# =========================
# Evaluation
# =========================
preds = np.expm1(model.predict(X_valid))
true  = np.expm1(y_valid)

print("📉 Weekly MAE:", mean_absolute_error(true, preds))

# =========================
# Save artifacts
# =========================
joblib.dump(model, MODEL_DIR / "demand_model.pkl")
joblib.dump(encoders, MODEL_DIR / "encoders.pkl")

print("✅ Weekly demand model trained & saved")
