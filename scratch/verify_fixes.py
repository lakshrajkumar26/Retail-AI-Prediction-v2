import sys
sys.path.insert(0, "d:/sahil/Product_demand_forecasting/Retail-AI-Prediction-v2/inventory_model_secondary/src")
import pandas as pd
import numpy as np
import xgboost as xgb
from pathlib import Path

BASE_DIR = Path("d:/sahil/Product_demand_forecasting/Retail-AI-Prediction-v2")
DATA_PATH = BASE_DIR / "data" / "master_training_data.csv"
MODEL_PATH = BASE_DIR / "model" / "xgboost_demand_model.json"

MODEL_FEATURES = [
    'W_Rate', 'R_Rate', 'Margin_Abs', 'Margin_Pct',
    'Month', 'Year', 'Quarter', 'Time_Index',
    'Lag_1', 'Lag_2', 'Lag_3', 'Rolling_Mean_3M',
    'Group_II', 'Group_III', 'Group_IV', 'Group_V', 'Group_VI',
    'Category_Liquor'
]

item_name = "CADBURY 5 STAR BIG 34 G"
df = pd.read_csv(DATA_PATH)
df['Date'] = pd.to_datetime(df['Date'])

model = xgb.XGBRegressor()
model.load_model(str(MODEL_PATH))

last_state = df.sort_values('Date').groupby('Item_ID').tail(1).copy()
item_last = last_state[last_state['Item_Name'] == item_name].copy()

max_time_index = int(df['Time_Index'].max())

print("=== BEFORE FIX (using Lag_1 from last row) ===")
print(f"  Lag_1 in last row = {item_last['Lag_1'].values[0]}")

print("\n=== AFTER FIX (seeding lags with actual Net_Qty first) ===")
current_row = item_last.copy()
# Apply lag seed fix
current_row['Lag_3'] = current_row['Lag_2']
current_row['Lag_2'] = current_row['Lag_1']
current_row['Lag_1'] = current_row['Net_Qty'].fillna(0)
current_row['Rolling_Mean_3M'] = (current_row['Lag_1'] + current_row['Lag_2'] + current_row['Lag_3']) / 3
print(f"  Lag_1 after seeding = {current_row['Lag_1'].values[0]} (should be 280.0)")

for step in range(1, 5):
    from pandas import Timestamp, DateOffset
    forecast_date = Timestamp(year=2025, month=12, day=1) + DateOffset(months=step)
    m = forecast_date.month; y = forecast_date.year
    current_row['Month'] = m; current_row['Year'] = y
    current_row['Quarter'] = (m-1)//3+1; current_row['Time_Index'] = max_time_index + step

    temp = pd.get_dummies(current_row, columns=['Group', 'Category'], drop_first=True)
    X = temp.reindex(columns=MODEL_FEATURES, fill_value=0)
    pred = max(0, model.predict(X)[0])
    print(f"  Step {step} ({forecast_date.strftime('%b %Y')}): Lag1={current_row['Lag_1'].values[0]:.1f} => Prediction={pred:.1f}")

    current_row['Lag_3'] = current_row['Lag_2'].values[0]
    current_row['Lag_2'] = current_row['Lag_1'].values[0]
    current_row['Lag_1'] = pred
    current_row['Rolling_Mean_3M'] = (current_row['Lag_1'].values[0] + current_row['Lag_2'].values[0] + current_row['Lag_3'].values[0]) / 3

# Test stock fix
print("\n=== STOCK FIX TEST ===")
item_id = item_last['Item_ID'].values[0]
item_rows = df[df['Item_ID'] == item_id].sort_values('Date', ascending=False)
for _, row in item_rows.iterrows():
    val = row.get('Closing_Stock')
    if pd.notna(val) and float(val) > 0:
        print(f"  Most recent non-zero stock: {float(val)} (from {row['Date'].strftime('%b %Y')})")
        break
