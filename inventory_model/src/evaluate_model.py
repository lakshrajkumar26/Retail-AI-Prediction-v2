"""
Model Evaluation Script
Comprehensive accuracy testing and visualization
"""

import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import matplotlib.pyplot as plt

from features import create_features

# =========================
# Setup
# =========================
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "data"

print("\n" + "="*70)
print("🔍 COMPREHENSIVE MODEL EVALUATION")
print("="*70)

# =========================
# Load model & data
# =========================
print("\n📂 Loading model and data...")
model = joblib.load(MODEL_DIR / "demand_model.pkl")
encoders = joblib.load(MODEL_DIR / "encoders.pkl")

try:
    saved_metrics = joblib.load(MODEL_DIR / "model_metrics.pkl")
    has_saved_metrics = True
except:
    has_saved_metrics = False
    print("⚠️  No saved training metrics found")

df = pd.read_csv(DATA_DIR / "retail_store_inventory.csv")
df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_").str.replace("/", "_")
df['date'] = pd.to_datetime(df['date'], errors='coerce')

# Clean data
df = df[df['units_sold'] >= 0]
df = df[df['price'] > 0]
df = df.dropna()

print(f"✅ Loaded {len(df)} records")

# =========================
# Encode & Feature Engineering
# =========================
print("🔧 Processing features...")
for col, le in encoders.items():
    df[col] = le.transform(df[col].astype(str))

df = create_features(df)

# =========================
# Make Predictions
# =========================
FEATURES = [
    'store_id','product_id','category','region',
    'inventory_level','price','discount',
    'competitor_pricing','holiday_promotion',
    'seasonality','is_weekend','week','month',
    'lag_7','lag_14','lag_30','lag_60',
    'rolling_mean_7','rolling_mean_30'
]

df['predicted'] = np.expm1(model.predict(df[FEATURES]))
df['actual'] = df['units_sold_7d']

# Remove NaN
df = df.dropna(subset=['predicted', 'actual'])

print(f"✅ Generated {len(df)} predictions")

# =========================
# Overall Metrics
# =========================
print("\n" + "="*70)
print("📊 OVERALL MODEL PERFORMANCE")
print("="*70)

actual = df['actual'].values
predicted = df['predicted'].values

mae = mean_absolute_error(actual, predicted)
rmse = np.sqrt(mean_squared_error(actual, predicted))
r2 = r2_score(actual, predicted)
mape = np.mean(np.abs((actual - predicted) / actual)) * 100
accuracy = (1 - mape/100) * 100

print(f"\n📈 METRICS:")
print(f"   Total Records: {len(actual):,}")
print(f"   MAE (Mean Absolute Error): {mae:.2f} units")
print(f"   RMSE (Root Mean Squared Error): {rmse:.2f} units")
print(f"   R² Score: {r2:.4f}")
print(f"   MAPE (Mean Absolute % Error): {mape:.2f}%")
print(f"   ✅ ACCURACY: {accuracy:.2f}%")

print(f"\n📊 PREDICTION STATISTICS:")
print(f"   Actual - Min: {actual.min():.2f}, Max: {actual.max():.2f}, Mean: {actual.mean():.2f}")
print(f"   Predicted - Min: {predicted.min():.2f}, Max: {predicted.max():.2f}, Mean: {predicted.mean():.2f}")

# =========================
# Training vs Current Performance
# =========================
if has_saved_metrics:
    print("\n" + "="*70)
    print("📈 TRAINING vs CURRENT PERFORMANCE")
    print("="*70)
    
    print(f"\n🎓 TRAINING METRICS (from model training):")
    print(f"   Training Accuracy: {saved_metrics['train_accuracy']:.2f}%")
    print(f"   Validation Accuracy: {saved_metrics['valid_accuracy']:.2f}%")
    print(f"   Validation MAE: {saved_metrics['valid_mae']:.2f} units")
    print(f"   Validation R²: {saved_metrics['valid_r2']:.4f}")
    
    print(f"\n📉 CURRENT METRICS (on full dataset):")
    print(f"   Current Accuracy: {accuracy:.2f}%")
    print(f"   Current MAE: {mae:.2f} units")
    print(f"   Current R²: {r2:.4f}")
    
    accuracy_diff = accuracy - saved_metrics['valid_accuracy']
    if abs(accuracy_diff) < 5:
        print(f"\n✅ Model performance is CONSISTENT ({accuracy_diff:+.2f}% difference)")
    elif accuracy_diff > 0:
        print(f"\n🌟 Model performance IMPROVED ({accuracy_diff:+.2f}% better)")
    else:
        print(f"\n⚠️  Model performance DEGRADED ({accuracy_diff:.2f}% worse)")

# =========================
# Per-Store Analysis
# =========================
print("\n" + "="*70)
print("📍 ACCURACY BY STORE")
print("="*70)

store_results = []
for store_id in sorted(df['store_id'].unique()):
    store_df = df[df['store_id'] == store_id]
    
    if len(store_df) > 0:
        store_actual = store_df['actual'].values
        store_predicted = store_df['predicted'].values
        
        store_mae = mean_absolute_error(store_actual, store_predicted)
        store_mape = np.mean(np.abs((store_actual - store_predicted) / store_actual)) * 100
        store_accuracy = (1 - store_mape/100) * 100
        store_r2 = r2_score(store_actual, store_predicted)
        
        store_results.append({
            'store_id': store_id,
            'records': len(store_df),
            'accuracy': store_accuracy,
            'mae': store_mae,
            'r2': store_r2
        })
        
        status = "🌟" if store_accuracy >= 90 else "✅" if store_accuracy >= 80 else "⚠️" if store_accuracy >= 70 else "❌"
        print(f"\n{status} Store {store_id}:")
        print(f"   Records: {len(store_df):,}")
        print(f"   Accuracy: {store_accuracy:.2f}%")
        print(f"   MAE: {store_mae:.2f} units")
        print(f"   R² Score: {store_r2:.4f}")

# =========================
# Per-Category Analysis
# =========================
print("\n" + "="*70)
print("📦 ACCURACY BY CATEGORY")
print("="*70)

category_results = []
for category_id in sorted(df['category'].unique()):
    cat_df = df[df['category'] == category_id]
    
    if len(cat_df) > 0:
        cat_actual = cat_df['actual'].values
        cat_predicted = cat_df['predicted'].values
        
        cat_mae = mean_absolute_error(cat_actual, cat_predicted)
        cat_mape = np.mean(np.abs((cat_actual - cat_predicted) / cat_actual)) * 100
        cat_accuracy = (1 - cat_mape/100) * 100
        
        category_results.append({
            'category': category_id,
            'records': len(cat_df),
            'accuracy': cat_accuracy,
            'mae': cat_mae
        })
        
        status = "🌟" if cat_accuracy >= 90 else "✅" if cat_accuracy >= 80 else "⚠️" if cat_accuracy >= 70 else "❌"
        print(f"\n{status} Category {category_id}:")
        print(f"   Records: {len(cat_df):,}")
        print(f"   Accuracy: {cat_accuracy:.2f}%")
        print(f"   MAE: {cat_mae:.2f} units")

# =========================
# Time-based Analysis
# =========================
print("\n" + "="*70)
print("📅 ACCURACY OVER TIME")
print("="*70)

df['year_month'] = df['date'].dt.to_period('M')
time_results = []

for period in sorted(df['year_month'].unique())[-6:]:  # Last 6 months
    period_df = df[df['year_month'] == period]
    
    if len(period_df) > 0:
        period_actual = period_df['actual'].values
        period_predicted = period_df['predicted'].values
        
        period_mae = mean_absolute_error(period_actual, period_predicted)
        period_mape = np.mean(np.abs((period_actual - period_predicted) / period_actual)) * 100
        period_accuracy = (1 - period_mape/100) * 100
        
        time_results.append({
            'period': str(period),
            'records': len(period_df),
            'accuracy': period_accuracy,
            'mae': period_mae
        })
        
        print(f"\n📆 {period}:")
        print(f"   Records: {len(period_df):,}")
        print(f"   Accuracy: {period_accuracy:.2f}%")
        print(f"   MAE: {period_mae:.2f} units")

# =========================
# Error Analysis
# =========================
print("\n" + "="*70)
print("🔍 ERROR ANALYSIS")
print("="*70)

df['error'] = df['predicted'] - df['actual']
df['abs_error'] = np.abs(df['error'])
df['pct_error'] = (df['error'] / df['actual']) * 100

print(f"\n📊 ERROR DISTRIBUTION:")
print(f"   Mean Error: {df['error'].mean():.2f} units")
print(f"   Median Error: {df['error'].median():.2f} units")
print(f"   Std Dev: {df['error'].std():.2f} units")
print(f"   Min Error: {df['error'].min():.2f} units")
print(f"   Max Error: {df['error'].max():.2f} units")

print(f"\n📈 ERROR PERCENTILES:")
print(f"   25th percentile: {df['abs_error'].quantile(0.25):.2f} units")
print(f"   50th percentile: {df['abs_error'].quantile(0.50):.2f} units")
print(f"   75th percentile: {df['abs_error'].quantile(0.75):.2f} units")
print(f"   95th percentile: {df['abs_error'].quantile(0.95):.2f} units")

# Predictions within tolerance
within_10pct = (df['abs_error'] / df['actual'] <= 0.10).sum()
within_20pct = (df['abs_error'] / df['actual'] <= 0.20).sum()
within_30pct = (df['abs_error'] / df['actual'] <= 0.30).sum()

print(f"\n🎯 PREDICTIONS WITHIN TOLERANCE:")
print(f"   Within ±10%: {within_10pct:,} ({within_10pct/len(df)*100:.1f}%)")
print(f"   Within ±20%: {within_20pct:,} ({within_20pct/len(df)*100:.1f}%)")
print(f"   Within ±30%: {within_30pct:,} ({within_30pct/len(df)*100:.1f}%)")

# =========================
# Final Summary
# =========================
print("\n" + "="*70)
print("🎓 FINAL EVALUATION SUMMARY")
print("="*70)

print(f"\n✅ OVERALL MODEL ACCURACY: {accuracy:.2f}%")

if accuracy >= 90:
    print(f"\n🌟 EXCELLENT MODEL!")
    print(f"   • Predictions are highly reliable")
    print(f"   • Safe to use for production decisions")
    print(f"   • Model is well-trained and generalizes well")
elif accuracy >= 80:
    print(f"\n✅ GOOD MODEL!")
    print(f"   • Predictions are reliable")
    print(f"   • Suitable for production use")
    print(f"   • Minor improvements possible")
elif accuracy >= 70:
    print(f"\n⚠️  MODERATE MODEL")
    print(f"   • Predictions are acceptable")
    print(f"   • Use with caution")
    print(f"   • Consider retraining with more data")
else:
    print(f"\n❌ POOR MODEL")
    print(f"   • Predictions are unreliable")
    print(f"   • NOT recommended for production")
    print(f"   • Retrain with more/better data")

print(f"\n📊 KEY METRICS:")
print(f"   • R² Score: {r2:.4f} (closer to 1.0 is better)")
print(f"   • MAE: {mae:.2f} units (lower is better)")
print(f"   • MAPE: {mape:.2f}% (lower is better)")

print("\n" + "="*70)
print("✅ Evaluation Complete!")
print("="*70 + "\n")

# =========================
# Save Results
# =========================
evaluation_results = {
    'overall_accuracy': accuracy,
    'mae': mae,
    'rmse': rmse,
    'r2': r2,
    'mape': mape,
    'total_records': len(df),
    'store_results': store_results,
    'category_results': category_results,
    'time_results': time_results,
    'within_10pct': within_10pct,
    'within_20pct': within_20pct,
    'within_30pct': within_30pct
}

joblib.dump(evaluation_results, MODEL_DIR / "evaluation_results.pkl")
print(f"💾 Evaluation results saved to: {MODEL_DIR / 'evaluation_results.pkl'}")

# Save detailed predictions
df[['date', 'store_id', 'product_id', 'actual', 'predicted', 'error', 'abs_error', 'pct_error']].to_csv(
    DATA_DIR / "prediction_evaluation.csv", index=False
)
print(f"💾 Detailed predictions saved to: {DATA_DIR / 'prediction_evaluation.csv'}")
