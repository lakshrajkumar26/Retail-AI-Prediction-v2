"""
Demand Forecasting - Kaggle XGBoost Pipeline
==============================================
This script is designed to be copied into a Kaggle Notebook or run in a Kaggle environment.
It expects the `master_training_data.csv` to be uploaded to the Kaggle environment.

Requirements:
!pip install xgboost scikit-learn pandas numpy
"""

import pandas as pd
import numpy as np
import xgboost as xgb
import os
from sklearn.model_selection import RandomizedSearchCV
from sklearn.metrics import mean_absolute_error, mean_squared_error

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, 'data', 'master_training_data.csv')
MODEL_PATH = os.path.join(BASE_DIR, 'model', 'xgboost_demand_model.json')

print("Loading dataset...")
df = pd.read_csv(DATA_PATH)

# Sort strictly by date to prevent time leakage
df['Date'] = pd.to_datetime(df['Date'])
df = df.sort_values(by=['Date', 'Item_ID']).reset_index(drop=True)

# ==========================================
# 2. Preprocessing
# ==========================================
print("Preprocessing features...")

# Identifiers and non-predictive columns to drop
# We drop Net_Qty because it's the target.
# We drop Qty, Refund_Qty, R_Amt, W_Amt, Profit, O_B, Closing_Stock, Net_Tax 
# because they are synchronous with the target (we wouldn't know them at prediction time).
# We keep Lags, Margins, and Rolling Means.
cols_to_drop = [
    'Item_ID', 'Date', 'GP_Index_No', 'pluno', 'Item_Name', 
    'Qty', 'Refund_Qty', 'R_Amt', 'W_Amt', 'Profit', 
    'O_B', 'Closing_Stock', 'Net_Tax', 'Net_Qty'
]

# Extract target variable
y = df['Net_Qty']

# Extract features
X = df.drop(columns=cols_to_drop)

# Categorical Encoding (One-Hot Encode 'Group' and 'Category')
X = pd.get_dummies(X, columns=['Group', 'Category'], drop_first=True)

# Fill NaNs in Lag features (created by the first 3 months of history)
# XGBoost can handle NaNs naturally, but filling them with 0 can sometimes help.
# We will let XGBoost handle them natively.

# ==========================================
# 3. Time-Based Train/Validation Split
# ==========================================
print("Splitting data (Train: Jan'24-Sept'25 | Val: Oct'25-Dec'25)...")

# Define split point: Before Oct 2025 is Train, Oct 2025 onwards is Validation
split_date = pd.to_datetime('2025-10-01')
train_mask = df['Date'] < split_date
val_mask = df['Date'] >= split_date

X_train, y_train = X[train_mask], y[train_mask]
X_val, y_val = X[val_mask], y[val_mask]

print(f"Training Set: {X_train.shape[0]} rows")
print(f"Validation Set: {X_val.shape[0]} rows")

# ==========================================
# 4. Hyperparameter Tuning
# ==========================================
print("\nStarting Hyperparameter Tuning with RandomizedSearchCV...")

xgb_reg = xgb.XGBRegressor(objective='reg:squarederror', random_state=42, n_jobs=-1)

param_distributions = {
    'n_estimators': [100, 300, 500],
    'learning_rate': [0.01, 0.05, 0.1],
    'max_depth': [3, 5, 7],
    'subsample': [0.7, 0.8, 0.9],
    'colsample_bytree': [0.7, 0.8, 0.9]
}

# We use 3 CV folds. Note: In strict time series, we'd use TimeSeriesSplit.
# However, because we are using tree-based models with strong lag features, 
# standard CV over the training portion is generally acceptable for finding robust parameters.
random_search = RandomizedSearchCV(
    estimator=xgb_reg,
    param_distributions=param_distributions,
    n_iter=10,  # Increase to 20-30 in Kaggle for better tuning if time permits
    scoring='neg_mean_absolute_error',
    cv=3,
    verbose=2,
    random_state=42,
    n_jobs=-1
)

random_search.fit(X_train, y_train)

best_model = random_search.best_estimator_
print(f"\nBest Parameters Found: {random_search.best_params_}")

# ==========================================
# 5. Validation Evaluation
# ==========================================
print("\nEvaluating on Validation Set (Oct'25 - Dec'25)...")
y_pred = best_model.predict(X_val)

# Ensure no negative predictions (demand can't be negative)
y_pred = np.clip(y_pred, 0, None)

mae = mean_absolute_error(y_val, y_pred)
rmse = np.sqrt(mean_squared_error(y_val, y_pred))

print(f"Validation MAE:  {mae:.2f} units")
print(f"Validation RMSE: {rmse:.2f} units")

# ==========================================
# 6. Final Model Retraining (100% Data)
# ==========================================
print("\nRetraining Best Model on 100% of the Data...")

# Re-initialize the model with the best parameters
final_model = xgb.XGBRegressor(
    **random_search.best_params_,
    objective='reg:squarederror',
    random_state=42,
    n_jobs=-1
)

# Fit on all data
final_model.fit(X, y)

# ==========================================
# 7. Model Export
# ==========================================
final_model.save_model(MODEL_PATH)
print(f"\n[SUCCESS] Final model saved as: {MODEL_PATH}")
print("You can download this file from Kaggle and load it into your local pipeline using:")
print(f">>> loaded_model.load_model('{MODEL_PATH}')")
