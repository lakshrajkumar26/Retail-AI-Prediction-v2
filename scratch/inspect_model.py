import pandas as pd
import numpy as np
import xgboost as xgb
from pathlib import Path

MODEL_FEATURES = [
    'W_Rate', 'R_Rate', 'Margin_Abs', 'Margin_Pct',
    'Month', 'Year', 'Quarter', 'Time_Index',
    'Lag_1', 'Lag_2', 'Lag_3', 'Rolling_Mean_3M',
    'Group_II', 'Group_III', 'Group_IV', 'Group_V', 'Group_VI',
    'Category_Liquor'
]

BASE_DIR = Path("d:/sahil/Product_demand_forecasting/Retail-AI-Prediction-v2")
MODEL_PATH = BASE_DIR / "model" / "xgboost_demand_model.json"
DATA_PATH = BASE_DIR / "data" / "master_training_data.csv"

def inspect_features():
    df = pd.read_csv(DATA_PATH)
    df['Date'] = pd.to_datetime(df['Date'])
    
    item_name = "FROOTY MANGO 200 ML"
    item_df = df[df['Item_Name'] == item_name].sort_values('Date')
    
    print(f"Historical data for {item_name}:")
    print(item_df[['Date', 'Net_Qty', 'Lag_1', 'Lag_2', 'Lag_3']].tail(5))
    
    last_row = item_df.tail(1).copy()
    
    # Prepare features for Jan 2026
    last_row['Month'] = 1
    last_row['Year'] = 2026
    last_row['Quarter'] = 1
    last_row['Time_Index'] = 25 # Assuming Dec 2025 was 24
    
    # Shift lags
    last_row['Lag_3'] = last_row['Lag_2']
    last_row['Lag_2'] = last_row['Lag_1']
    last_row['Lag_1'] = last_row['Net_Qty']
    last_row['Rolling_Mean_3M'] = (last_row['Lag_1'] + last_row['Lag_2'] + last_row['Lag_3']) / 3
    
    # One-hot encode Group and Category (manual for speed)
    last_row['Group_II'] = 1 if last_row['Group'].values[0] == 'II' else 0
    last_row['Group_III'] = 1 if last_row['Group'].values[0] == 'III' else 0
    last_row['Group_IV'] = 1 if last_row['Group'].values[0] == 'IV' else 0
    last_row['Group_V'] = 1 if last_row['Group'].values[0] == 'V' else 0
    last_row['Group_VI'] = 1 if last_row['Group'].values[0] == 'VI' else 0
    last_row['Category_Liquor'] = 1 if last_row['Category'].values[0] == 'Liquor' else 0
    
    X = last_row[MODEL_FEATURES]
    print("\nFeatures for Jan 2026 prediction:")
    print(X.to_dict('records')[0])
    
    model = xgb.XGBRegressor()
    model.load_model(str(MODEL_PATH))
    
    pred = model.predict(X)
    print(f"\nModel Prediction for Jan 2026: {pred[0]}")

if __name__ == "__main__":
    inspect_features()
