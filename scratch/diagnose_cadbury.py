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

item_df = df[df['Item_Name'] == item_name].sort_values('Date')
print(f"=== All data for: {item_name} ===")
print(item_df[['Date', 'Net_Qty', 'Closing_Stock', 'Lag_1', 'Lag_2', 'Lag_3', 'Rolling_Mean_3M']].to_string())

print("\n=== Last row (used for forecasting basis) ===")
last_row = item_df.tail(1)
print(f"Date: {last_row['Date'].values[0]}")
print(f"Net_Qty: {last_row['Net_Qty'].values[0]}")
print(f"Closing_Stock: {last_row['Closing_Stock'].values[0]}")
print(f"Lag_1: {last_row['Lag_1'].values[0]}")
print(f"Lag_2: {last_row['Lag_2'].values[0]}")
print(f"Lag_3: {last_row['Lag_3'].values[0]}")

print("\n=== Running XGBoost forecast for April 2026 (4 steps from Dec 2025) ===")
model = xgb.XGBRegressor()
model.load_model(str(MODEL_PATH))

last_state = df.sort_values('Date').groupby('Item_ID').tail(1).copy()
item_last = last_state[last_state['Item_Name'] == item_name].copy()

max_time_index = int(df['Time_Index'].max())
print(f"Max Time_Index in data: {max_time_index}")

current_row = item_last.copy()
for step in range(1, 5):  # Jan, Feb, Mar, Apr 2026
    from pandas import Timestamp, DateOffset
    forecast_date = Timestamp(year=2025, month=12, day=1) + DateOffset(months=step)
    m = forecast_date.month
    y = forecast_date.year
    q = (m - 1) // 3 + 1

    current_row['Month'] = m
    current_row['Year'] = y
    current_row['Quarter'] = q
    current_row['Time_Index'] = max_time_index + step

    temp = pd.get_dummies(current_row, columns=['Group', 'Category'], drop_first=True)
    X = temp.reindex(columns=MODEL_FEATURES, fill_value=0)

    pred = model.predict(X)[0]
    pred = max(0, pred)

    print(f"  Step {step} ({forecast_date.strftime('%b %Y')}): Lag1={current_row['Lag_1'].values[0]:.1f}, Lag2={current_row['Lag_2'].values[0]:.1f}, Lag3={current_row['Lag_3'].values[0]:.1f}, Roll3M={current_row['Rolling_Mean_3M'].values[0]:.1f} => Prediction={pred:.1f}")

    current_row['Lag_3'] = current_row['Lag_2'].values[0]
    current_row['Lag_2'] = current_row['Lag_1'].values[0]
    current_row['Lag_1'] = pred
    current_row['Rolling_Mean_3M'] = (current_row['Lag_1'].values[0] + current_row['Lag_2'].values[0] + current_row['Lag_3'].values[0]) / 3
