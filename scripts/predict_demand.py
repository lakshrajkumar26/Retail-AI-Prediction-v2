import pandas as pd
import numpy as np
import xgboost as xgb
import os
from datetime import datetime

# --- Configuration ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, 'data', 'master_training_data.csv')
MODEL_PATH = os.path.join(BASE_DIR, 'model', 'xgboost_demand_model.json')
OUTPUT_PATH = os.path.join(BASE_DIR, 'data', 'forecast_2026_Q1.csv')

# The exact feature names the model was trained on
MODEL_FEATURES = [
    'W_Rate', 'R_Rate', 'Margin_Abs', 'Margin_Pct', 'Month', 'Year', 'Quarter', 'Time_Index', 
    'Lag_1', 'Lag_2', 'Lag_3', 'Rolling_Mean_3M', 
    'Group_II', 'Group_III', 'Group_IV', 'Group_V', 'Group_VI', 'Category_Liquor'
]

def load_data_and_model():
    print(f"Loading data from {DATA_PATH}...")
    df = pd.read_csv(DATA_PATH)
    df['Date'] = pd.to_datetime(df['Date'])
    
    print(f"Loading model from {MODEL_PATH}...")
    model = xgb.XGBRegressor()
    model.load_model(MODEL_PATH)
    
    return df, model

def prepare_initial_state(df):
    """
    Get the most recent state (Dec 2025) for each item to start the forecast.
    """
    # Filter for the last month in the dataset (Dec 2025)
    last_date = df['Date'].max()
    print(f"Dataset ends at: {last_date.date()}")
    
    # We need the last state for every item.
    # We take the last known row for each item.
    last_state = df.sort_values('Date').groupby('Item_ID').tail(1).copy()
    
    return last_state

def run_recursive_forecast(last_state, model, months_to_forecast=3):
    """
    Run the recursive forecast month by month.
    """
    forecast_results = []
    
    # Current month/year is based on the end of dataset (Dec 2025)
    current_year = 2026
    current_time_index = 25
    
    # Working dataframe to keep track of shifting lags
    current_df = last_state.copy()
    
    for m in range(1, months_to_forecast + 1):
        month_name = {1: 'Jan', 2: 'Feb', 3: 'Mar'}.get(m, f'Month_{m}')
        print(f"Forecasting {month_name} 2026 (Step {m})...")
        
        # 1. Update Time/Seasonality Features
        current_df['Month'] = m
        current_df['Year'] = current_year
        current_df['Quarter'] = (m - 1) // 3 + 1
        current_df['Time_Index'] = current_time_index + (m - 1)
        
        # 2. Handle Categorical Encoding (Group and Category)
        # We need to create the Group_X and Category_X columns exactly as the model expects.
        # We start with a copy and then dummy encode it.
        # However, to be safe and efficient, we'll manually ensure all columns exist.
        
        # First, ensure we have the dummy columns
        temp_X = pd.get_dummies(current_df, columns=['Group', 'Category'], drop_first=True)
        
        # 3. Align features with MODEL_FEATURES
        # Add missing columns with 0, and select only the required ones in correct order
        X_inference = temp_X.reindex(columns=MODEL_FEATURES, fill_value=0)
        
        # 4. Predict
        preds = model.predict(X_inference)
        preds = np.clip(preds, 0, None) # No negative demand
        
        # 5. Save results
        step_results = current_df[['Item_ID', 'Item_Name', 'Group', 'Category']].copy()
        step_results['Forecast_Month'] = m
        step_results['Forecast_Year'] = current_year
        step_results['Predicted_Demand'] = preds
        forecast_results.append(step_results)
        
        # 6. Update Lags for next month
        # Lag_3 becomes what Lag_2 was
        # Lag_2 becomes what Lag_1 was
        # Lag_1 becomes the new Prediction
        current_df['Lag_3'] = current_df['Lag_2']
        current_df['Lag_2'] = current_df['Lag_1']
        current_df['Lag_1'] = preds
        
        # Recalculate Rolling Mean 3M
        current_df['Rolling_Mean_3M'] = (current_df['Lag_1'] + current_df['Lag_2'] + current_df['Lag_3']) / 3
        
    return pd.concat(forecast_results)

def main():
    if not os.path.exists(MODEL_PATH):
        print(f"Error: Model not found at {MODEL_PATH}")
        return
    
    df, model = load_data_and_model()
    
    last_state = prepare_initial_state(df)
    print(f"Starting forecast for {len(last_state)} products...")
    
    final_forecast = run_recursive_forecast(last_state, model, months_to_forecast=3)
    
    # Clean up output
    final_forecast = final_forecast.sort_values(['Item_ID', 'Forecast_Month'])
    
    # Save to CSV
    final_forecast.to_csv(OUTPUT_PATH, index=False)
    print(f"\n[SUCCESS] Forecast saved to: {OUTPUT_PATH}")
    
    # Show summary
    summary = final_forecast.groupby('Forecast_Month')['Predicted_Demand'].sum()
    print("\nForecasted Total Demand Summary:")
    print(summary)

if __name__ == "__main__":
    main()
