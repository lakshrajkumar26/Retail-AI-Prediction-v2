"""
XGBoost Demand Forecaster
=========================
Core inference engine that loads the trained XGBoost model and performs
single-month and recursive multi-month demand forecasting.

TRADEOFFS & BIASES:
- Recursive drift: errors compound month-over-month for multi-step forecasts.
- Static pricing: future W_Rate/R_Rate are assumed unchanged from last known month.
- Cold-start: items with < 3 months history will have NaN lags (XGBoost handles natively but quality is lower).
- Global model bias: high-volume items dominate the learned patterns.
"""

import pandas as pd
import numpy as np
import xgboost as xgb
import os
from pathlib import Path
from functools import lru_cache

# The exact feature names the model was trained on (order matters for XGBoost)
MODEL_FEATURES = [
    'W_Rate', 'R_Rate', 'Margin_Abs', 'Margin_Pct',
    'Month', 'Year', 'Quarter', 'Time_Index',
    'Lag_1', 'Lag_2', 'Lag_3', 'Rolling_Mean_3M',
    'Group_II', 'Group_III', 'Group_IV', 'Group_V', 'Group_VI',
    'Category_Liquor'
]

BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODEL_PATH = BASE_DIR / "model" / "xgboost_demand_model.json"
DATA_PATH = BASE_DIR / "data" / "master_training_data.csv"


class DemandForecaster:
    """
    Loads the XGBoost model and master training data once, then serves predictions.
    """

    def __init__(self):
        self.model = None
        self.df = None
        self._load()

    def _load(self):
        """Load model and data into memory."""
        print(f"[FORECASTER] Loading model from {MODEL_PATH}...")
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"Model not found: {MODEL_PATH}")
        self.model = xgb.XGBRegressor()
        self.model.load_model(str(MODEL_PATH))

        print(f"[FORECASTER] Loading data from {DATA_PATH}...")
        if not DATA_PATH.exists():
            raise FileNotFoundError(f"Data not found: {DATA_PATH}")
        self.df = pd.read_csv(str(DATA_PATH))
        self.df['Date'] = pd.to_datetime(self.df['Date'])
        self.df = self.df.sort_values(by=['Date', 'Item_ID']).reset_index(drop=True)
        print(f"[FORECASTER] Loaded {len(self.df)} records for {self.df['Item_ID'].nunique()} items.")

    def reload_data(self):
        """Reload data from disk (after an upload, for example)."""
        self._load()

    def get_item_list(self):
        """Return unique items with their metadata."""
        last_state = self.df.sort_values('Date').groupby('Item_ID').tail(1)
        items = []
        for _, row in last_state.iterrows():
            items.append({
                'item_id': row['Item_ID'],
                'item_name': row['Item_Name'],
                'group': row['Group'],
                'category': row['Category'],
                'w_rate': float(row['W_Rate']) if pd.notna(row['W_Rate']) else 0,
                'r_rate': float(row['R_Rate']) if pd.notna(row['R_Rate']) else 0,
            })
        return items

    def get_historical_sales(self, item_name):
        """
        Get the full monthly sales history for a given item.
        Returns dict: { year: { month: net_qty } }
        """
        item_df = self.df[self.df['Item_Name'] == item_name]
        if item_df.empty:
            return {}

        result = {}
        for _, row in item_df.iterrows():
            year = int(row['Year'])
            month = int(row['Month'])
            net_qty = float(row['Net_Qty']) if pd.notna(row['Net_Qty']) else 0
            if year not in result:
                result[year] = {}
            result[year][month] = net_qty
        return result

    def get_last_n_months_data(self, item_name, n_months=4):
        """Get the last N months of actual sales for an item."""
        item_df = self.df[self.df['Item_Name'] == item_name].sort_values('Date')
        if item_df.empty:
            return []

        recent = item_df.tail(n_months)
        months_data = []
        for _, row in recent.iterrows():
            months_data.append({
                'date': row['Date'].strftime('%Y-%m-%d'),
                'year': int(row['Year']),
                'month': int(row['Month']),
                'month_name': row['Date'].strftime('%b %Y'),
                'sales': float(row['Net_Qty']) if pd.notna(row['Net_Qty']) else 0,
                'units': float(row['Net_Qty']) if pd.notna(row['Net_Qty']) else 0,
            })
        return months_data

    def compute_confidence(self, item_name):
        """
        Compute confidence score for an item based on historical variance.
        Formula: max(0.5, 1 - StdDev / Mean)

        BIAS NOTE: Items with consistently low sales (mean near 0) will get
        artificially low or capped confidence because the ratio explodes.
        """
        item_df = self.df[self.df['Item_Name'] == item_name]
        sales = item_df['Net_Qty'].dropna()

        # Hardcoded to 0.8 (80%) as per user request
        return 0.8

    def compute_trend(self, item_name):
        """
        Detect trend (increasing/decreasing/stable) from last 3 months.
        Returns (trend_label, growth_rate).
        """
        item_df = self.df[self.df['Item_Name'] == item_name].sort_values('Date')
        sales = item_df['Net_Qty'].dropna().tail(6).values

        if len(sales) < 3:
            return 'stable', 0.0

        first_half = sales[:len(sales)//2].mean()
        second_half = sales[len(sales)//2:].mean()

        if first_half == 0:
            return 'stable', 0.0

        growth_rate = (second_half - first_half) / first_half

        if growth_rate > 0.1:
            return 'increasing', growth_rate
        elif growth_rate < -0.1:
            return 'decreasing', growth_rate
        else:
            return 'stable', growth_rate

    def compute_year_totals(self, item_name):
        """Get yearly total sales for an item."""
        item_df = self.df[self.df['Item_Name'] == item_name]
        totals = item_df.groupby('Year')['Net_Qty'].sum()
        return {int(y): float(v) for y, v in totals.items()}

    def _get_best_closing_stock(self, item_id):
        """
        Get the most recent non-null, non-zero closing stock for an item.
        The last row's Closing_Stock may be 0 or NaN even when stock exists
        (e.g., an item sold out in Dec but had 280 stock in Nov).
        We walk backwards to find the most accurate last known stock level.
        """
        item_rows = self.df[self.df['Item_ID'] == item_id].sort_values('Date', ascending=False)
        for _, row in item_rows.iterrows():
            val = row.get('Closing_Stock')
            if pd.notna(val) and float(val) > 0:
                return float(val)
        # fallback: use the absolute last known value (even if 0)
        last_val = item_rows.iloc[0].get('Closing_Stock') if not item_rows.empty else None
        return float(last_val) if pd.notna(last_val) else 0.0

    def _prepare_initial_state(self):
        """
        Get the latest state for every item (last known row).
        This is the starting point for recursive forecasting.
        """
        return self.df.sort_values('Date').groupby('Item_ID').tail(1).copy()

    def _encode_features(self, df):
        """
        Create the exact feature matrix the model expects.
        Handles One-Hot Encoding alignment to prevent column mismatch crashes.

        COMPLICATION: If a new Group (e.g., Group VII) appears in future data,
        the model CANNOT handle it — it will be silently ignored. Retraining
        would be required.
        """
        # One-hot encode Group and Category
        temp = pd.get_dummies(df, columns=['Group', 'Category'], drop_first=True)

        # Align to exact model features, filling missing OHE columns with 0
        X = temp.reindex(columns=MODEL_FEATURES, fill_value=0)
        return X

    def predict_single_month(self, target_month, target_year):
        """
        Predict demand for all items for a single target month/year.
        Uses a cache to avoid re-calculating the entire catalog on every paginated request.
        """
        cache_key = f"{target_month}-{target_year}"
        if not hasattr(self, '_prediction_cache') or not isinstance(self._prediction_cache, dict):
            self._prediction_cache = {}
            
        if cache_key in self._prediction_cache:
            print(f"[FORECASTER] Using cached predictions for {cache_key}")
            return self._prediction_cache[cache_key]

        print(f"[FORECASTER] Calculating fresh predictions for {cache_key}...")
        
        last_state = self._prepare_initial_state()
        last_date = self.df['Date'].max()
        last_month = last_date.month
        last_year = last_date.year

        # Calculate how many steps ahead we need to forecast
        steps_ahead = (target_year - last_year) * 12 + (target_month - last_month)

        if steps_ahead <= 0:
            # Target is in the past — return actual data
            results = self._get_actual_data_for_month(target_month, target_year)
            self._prediction_cache[cache_key] = results
            return results

        # Recursive forecast for each step
        current_df = last_state.copy()
        max_time_index = int(self.df['Time_Index'].max())

        # FIX: Seed the lag features with the actual last-month sales before
        # starting recursive forecasting. The last row's Lag_1 is the previous
        # month's actual value, not the last month itself. We need to shift once
        # to incorporate the last known month's actual Net_Qty into Lag_1.
        current_df['Lag_3'] = current_df['Lag_2']
        current_df['Lag_2'] = current_df['Lag_1']
        current_df['Lag_1'] = current_df['Net_Qty'].fillna(0)
        current_df['Rolling_Mean_3M'] = (
            current_df['Lag_1'] + current_df['Lag_2'] + current_df['Lag_3']
        ) / 3

        for step in range(1, steps_ahead + 1):
            forecast_date = pd.Timestamp(year=last_year, month=last_month, day=1) + pd.DateOffset(months=step)
            m = forecast_date.month
            y = forecast_date.year

            current_df['Month'] = m
            current_df['Year'] = y
            current_df['Quarter'] = (m - 1) // 3 + 1
            current_df['Time_Index'] = max_time_index + step

            X = self._encode_features(current_df)
            preds = self.model.predict(X)
            preds = np.clip(preds, 0, None)

            # Shift lags for next step
            current_df['Lag_3'] = current_df['Lag_2']
            current_df['Lag_2'] = current_df['Lag_1']
            current_df['Lag_1'] = preds
            current_df['Rolling_Mean_3M'] = (
                current_df['Lag_1'] + current_df['Lag_2'] + current_df['Lag_3']
            ) / 3

        # Build result list
        results = []
        
        print("[FORECASTER] Pre-computing historical metrics for speed...")
        
        # --- VECTORIZED PRE-COMPUTATIONS ---
        
        # 1. Year Totals
        year_totals_df = self.df.groupby(['Item_Name', 'Year'])['Net_Qty'].sum().reset_index()
        year_totals_dict = {}
        for _, r in year_totals_df.iterrows():
            item_name = r['Item_Name']
            if item_name not in year_totals_dict:
                year_totals_dict[item_name] = {}
            year_totals_dict[item_name][int(r['Year'])] = float(r['Net_Qty'])

        # 2. Historical Sales & Last 3 Months & Trend
        historical_dict = {}
        last_3_dict = {}
        trend_dict = {}
        
        # Sort values once
        sorted_df = self.df.sort_values(['Item_Name', 'Date'])
        
        # Group by Item_Name
        for item_name, group in sorted_df.groupby('Item_Name'):
            # Historical
            hist = {}
            for _, r in group.iterrows():
                yr = int(r['Year'])
                mo = int(r['Month'])
                if yr not in hist: hist[yr] = {}
                hist[yr][mo] = float(r['Net_Qty']) if pd.notna(r['Net_Qty']) else 0
            historical_dict[item_name] = hist
            
            # Last 3
            recent = group.tail(3)
            last_3 = []
            for _, r in recent.iterrows():
                last_3.append({
                    'date': r['Date'].strftime('%Y-%m-%d'),
                    'year': int(r['Year']),
                    'month': int(r['Month']),
                    'month_name': r['Date'].strftime('%b %Y'),
                    'sales': float(r['Net_Qty']) if pd.notna(r['Net_Qty']) else 0,
                    'units': float(r['Net_Qty']) if pd.notna(r['Net_Qty']) else 0,
                })
            last_3_dict[item_name] = last_3
            
            # Trend
            sales = group['Net_Qty'].dropna().tail(6).values
            if len(sales) < 3:
                trend_dict[item_name] = ('stable', 0.0)
            else:
                first_half = sales[:len(sales)//2].mean()
                second_half = sales[len(sales)//2:].mean()
                if first_half == 0:
                    trend_dict[item_name] = ('stable', 0.0)
                else:
                    gr = (second_half - first_half) / first_half
                    if gr > 0.1:
                        trend_dict[item_name] = ('increasing', gr)
                    elif gr < -0.1:
                        trend_dict[item_name] = ('decreasing', gr)
                    else:
                        trend_dict[item_name] = ('stable', gr)

        # 3. Best Closing Stock
        # Filter where Closing_Stock > 0, keep last
        valid_stocks = sorted_df[sorted_df['Closing_Stock'] > 0].groupby('Item_ID').tail(1)
        closing_stock_dict = valid_stocks.set_index('Item_ID')['Closing_Stock'].to_dict()
        # Fallback to last known value (even if 0) if not in valid_stocks
        last_known_stocks = sorted_df.groupby('Item_ID').tail(1).set_index('Item_ID')['Closing_Stock'].to_dict()
        
        # --- END VECTORIZED PRE-COMPUTATIONS ---
        
        for i, (_, row) in enumerate(current_df.iterrows()):
            item_id = row['Item_ID']
            item_name = row['Item_Name']
            
            # Fast lookups
            confidence = 0.8  # Hardcoded
            trend, growth_rate = trend_dict.get(item_name, ('stable', 0.0))
            year_totals = year_totals_dict.get(item_name, {})
            historical = historical_dict.get(item_name, {})
            last_3 = last_3_dict.get(item_name, [])
            
            # Closing stock logic
            closing_stock = float(closing_stock_dict.get(item_id, last_known_stocks.get(item_id, 0.0)))
            if pd.isna(closing_stock): closing_stock = 0.0

            prediction = float(preds[i])

            max_year = int(self.df["Year"].max())
            prev_year = max_year - 1
            
            results.append({
                'item_id': str(item_id),
                'item_name': item_name,
                'category': row['Category'],
                'group': row['Group'],
                'final_prediction': round(prediction, 1),
                'xgb_prediction': round(prediction, 1),
                'prophet_prediction': None,
                'method': 'xgboost_recursive',
                'price': float(row['R_Rate']) if pd.notna(row['R_Rate']) else 0,
                'purchase_price': float(row['W_Rate']) if pd.notna(row['W_Rate']) else 0,
                'current_stock': int(closing_stock),
                'recommended_order': max(0, int(round(prediction - closing_stock))),
                'confidence': 0.8,
                'trend': trend,
                'growth_rate': round(growth_rate, 3),
                'historical_sales': historical,
                'last_3_months': last_3,
                'year_totals': {
                    str(prev_year): round(float(year_totals.get(prev_year, 0)), 1),
                    str(max_year): round(float(year_totals.get(max_year, 0)), 1)
                },
                'year_prev_total': year_totals.get(prev_year, 0),
                'year_curr_total': year_totals.get(max_year, 0),
            })

        # Cache the results in memory
        self._prediction_cache[cache_key] = results

        return results

    def _get_actual_data_for_month(self, month, year):
        """Return actual historical data for a past month."""
        month_df = self.df[(self.df['Month'] == month) & (self.df['Year'] == year)]
        
        print(f"[FORECASTER] Pre-computing historical metrics for actual data (Month: {month}, Year: {year})...")
        
        # --- VECTORIZED PRE-COMPUTATIONS ---
        year_totals_df = self.df.groupby(['Item_Name', 'Year'])['Net_Qty'].sum().reset_index()
        year_totals_dict = {}
        for _, r in year_totals_df.iterrows():
            item_name = r['Item_Name']
            if item_name not in year_totals_dict: year_totals_dict[item_name] = {}
            year_totals_dict[item_name][int(r['Year'])] = float(r['Net_Qty'])

        historical_dict = {}
        last_3_dict = {}
        trend_dict = {}
        sorted_df = self.df.sort_values(['Item_Name', 'Date'])
        
        for item_name, group in sorted_df.groupby('Item_Name'):
            hist = {}
            for _, r in group.iterrows():
                yr = int(r['Year'])
                mo = int(r['Month'])
                if yr not in hist: hist[yr] = {}
                hist[yr][mo] = float(r['Net_Qty']) if pd.notna(r['Net_Qty']) else 0
            historical_dict[item_name] = hist
            
            recent = group.tail(3)
            last_3 = []
            for _, r in recent.iterrows():
                last_3.append({
                    'date': r['Date'].strftime('%Y-%m-%d'),
                    'year': int(r['Year']),
                    'month': int(r['Month']),
                    'month_name': r['Date'].strftime('%b %Y'),
                    'sales': float(r['Net_Qty']) if pd.notna(r['Net_Qty']) else 0,
                    'units': float(r['Net_Qty']) if pd.notna(r['Net_Qty']) else 0,
                })
            last_3_dict[item_name] = last_3
            
            sales = group['Net_Qty'].dropna().tail(6).values
            if len(sales) < 3:
                trend_dict[item_name] = ('stable', 0.0)
            else:
                first_half = sales[:len(sales)//2].mean()
                second_half = sales[len(sales)//2:].mean()
                if first_half == 0: trend_dict[item_name] = ('stable', 0.0)
                else:
                    gr = (second_half - first_half) / first_half
                    if gr > 0.1: trend_dict[item_name] = ('increasing', gr)
                    elif gr < -0.1: trend_dict[item_name] = ('decreasing', gr)
                    else: trend_dict[item_name] = ('stable', gr)
        # --- END VECTORIZED PRE-COMPUTATIONS ---
        
        results = []
        for _, row in month_df.iterrows():
            item_name = row['Item_Name']
            net_qty = float(row['Net_Qty']) if pd.notna(row['Net_Qty']) else 0
            
            confidence = 0.8
            trend, growth_rate = trend_dict.get(item_name, ('stable', 0.0))
            historical = historical_dict.get(item_name, {})
            last_3 = last_3_dict.get(item_name, [])
            year_totals = year_totals_dict.get(item_name, {})
            closing_stock = float(row['Closing_Stock']) if pd.notna(row['Closing_Stock']) else 0

            results.append({
                'item_id': str(row['Item_ID']),
                'item_name': item_name,
                'category': row['Category'],
                'group': row['Group'],
                'final_prediction': round(net_qty, 1),
                'xgb_prediction': round(net_qty, 1),
                'prophet_prediction': None,
                'method': 'actual_historical',
                'price': float(row['R_Rate']) if pd.notna(row['R_Rate']) else 0,
                'purchase_price': float(row['W_Rate']) if pd.notna(row['W_Rate']) else 0,
                'current_stock': int(closing_stock),
                'recommended_order': max(0, int(round(net_qty - closing_stock))),
                'confidence': 0.8,
                'trend': trend,
                'growth_rate': round(growth_rate, 3),
                'historical_sales': historical,
                'last_3_months': last_3,
                'year_2024_total': year_totals.get(2024, 0),
                'year_2025_total': year_totals.get(2025, 0),
            })
        return results

    def predict_future_aggregate(self, target_date_str, n_months=3):
        """
        Predict aggregate demand for the next N months starting from target_date.
        Useful for bulk order planning.
        """
        try:
            target_date = pd.to_datetime(target_date_str)
        except:
            target_date = self.df['Date'].max() + pd.DateOffset(months=1)
            
        print(f"[FORECASTER] Calculating AGGREGATE forecast for {n_months} months starting {target_date.strftime('%Y-%m')}...")
        
        last_state = self._prepare_initial_state()
        last_date = self.df['Date'].max()
        last_month = last_date.month
        last_year = last_date.year
        
        # Start month calculation
        start_month = target_date.month
        start_year = target_date.year
        
        # Steps to get to the START month
        pre_steps = (start_year - last_year) * 12 + (start_month - last_month)
        if pre_steps < 1: pre_steps = 1
        
        # Recursive forecast loop
        current_df = last_state.copy()
        max_time_index = int(self.df['Time_Index'].max())
        
        # Seed lags
        current_df['Lag_3'] = current_df['Lag_2']
        current_df['Lag_2'] = current_df['Lag_1']
        current_df['Lag_1'] = current_df['Net_Qty'].fillna(0)
        current_df['Rolling_Mean_3M'] = (current_df['Lag_1'] + current_df['Lag_2'] + current_df['Lag_3']) / 3
        
        # Track aggregate demand per item
        aggregate_demand = {item: 0.0 for item in current_df['Item_Name'].unique()}
        
        # Run forecast for (pre_steps + n_months - 1)
        total_steps = pre_steps + n_months - 1
        
        for step in range(1, total_steps + 1):
            forecast_date = pd.Timestamp(year=last_year, month=last_month, day=1) + pd.DateOffset(months=step)
            m = forecast_date.month
            y = forecast_date.year
            
            current_df['Month'] = m
            current_df['Year'] = y
            current_df['Quarter'] = (m - 1) // 3 + 1
            current_df['Time_Index'] = max_time_index + step
            
            X = self._encode_features(current_df)
            preds = self.model.predict(X)
            preds = np.clip(preds, 0, None)
            
            # If we are within the target window, add to aggregate
            if step >= pre_steps:
                for item, p in zip(current_df['Item_Name'], preds):
                    aggregate_demand[item] += float(p)
            
            # Shift lags
            current_df['Lag_3'] = current_df['Lag_2']
            current_df['Lag_2'] = current_df['Lag_1']
            current_df['Lag_1'] = preds
            current_df['Rolling_Mean_3M'] = (current_df['Lag_1'] + current_df['Lag_2'] + current_df['Lag_3']) / 3

        # Prepare final results using the logic from predict_single_month for metadata
        # We reuse the "metadata" from the last step but overwrite the prediction with the aggregate
        results = []
        
        # Pre-compute maps for efficiency
        price_map = self.df.groupby('Item_Name')['R_Rate'].last().to_dict()
        w_price_map = self.df.groupby('Item_Name')['W_Rate'].last().to_dict()
        cat_map = self.df.groupby('Item_Name')['Category'].last().to_dict()
        
        for item_name, total_pred in aggregate_demand.items():
            results.append({
                'item_name': item_name,
                'category': cat_map.get(item_name, 'Unknown'),
                'prediction': total_pred,
                'final_prediction': total_pred,
                'price': float(price_map.get(item_name, 0)),
                'purchase_price': float(w_price_map.get(item_name, 0)),
                'recommended_order': int(round(total_pred)),
                'confidence': 0.80 - (n_months * 0.02), # Confidence decays with longer horizon
                'is_aggregate': True,
                'n_months': n_months,
                'start_date': target_date.strftime('%Y-%m'),
            })
            
        return results

    def predict_previous_years(self, item_names, target_date_str):
        """
        For each item, get the same month's sales across all available years.
        Returns analysis data with statistics, yearly breakdowns, and a prediction.
        """
        target_date = pd.to_datetime(target_date_str)
        target_month = target_date.month

        results = []
        for item_name in item_names:
            item_df = self.df[
                (self.df['Item_Name'] == item_name) &
                (self.df['Month'] == target_month)
            ].sort_values('Date')

            if item_df.empty:
                continue

            yearly_data = []
            sales_values = []
            for _, row in item_df.iterrows():
                net_qty = float(row['Net_Qty']) if pd.notna(row['Net_Qty']) else 0
                sales_values.append(net_qty)
                yearly_data.append({
                    'year': int(row['Year']),
                    'month': int(row['Month']),
                    'units': net_qty,
                    'sales': round(net_qty * (float(row['R_Rate']) if pd.notna(row['R_Rate']) else 0), 2),
                })

            if not sales_values:
                continue

            avg_sales = np.mean(sales_values)
            std_sales = np.std(sales_values) if len(sales_values) > 1 else 0
            confidence = max(0.5, 1.0 - (std_sales / avg_sales)) if avg_sales > 0 else 0.5

            # Trend from the yearly data
            if len(sales_values) >= 2:
                if sales_values[-1] > sales_values[-2] * 1.1:
                    trend = 'increasing'
                elif sales_values[-1] < sales_values[-2] * 0.9:
                    trend = 'decreasing'
                else:
                    trend = 'stable'
            else:
                trend = 'stable'

            results.append({
                'item_id': str(item_df.iloc[-1]['Item_ID']),
                'item_name': item_name,
                'category': item_df.iloc[-1]['Category'],
                'price': float(item_df.iloc[-1]['R_Rate']) if pd.notna(item_df.iloc[-1]['R_Rate']) else 0,
                'purchase_price': float(item_df.iloc[-1]['W_Rate']) if pd.notna(item_df.iloc[-1]['W_Rate']) else 0,
                'prediction': round(avg_sales, 1),
                'confidence': 0.8,
                'statistics': {
                    'low_sales': round(min(sales_values), 1),
                    'high_sales': round(max(sales_values), 1),
                    'average_sales': round(avg_sales, 1),
                    'trend': trend,
                },
                'yearly_data': yearly_data,
            })

        return results

    def predict_last_n_months(self, item_names, n_months):
        """
        For each item, get the last N months of actual sales data.
        Returns analysis data with statistics and monthly breakdowns.
        """
        results = []
        for item_name in item_names:
            item_df = self.df[self.df['Item_Name'] == item_name].sort_values('Date')

            if item_df.empty:
                continue

            recent = item_df.tail(n_months)
            monthly_data = []
            sales_values = []
            for _, row in recent.iterrows():
                net_qty = float(row['Net_Qty']) if pd.notna(row['Net_Qty']) else 0
                sales_values.append(net_qty)
                monthly_data.append({
                    'date': row['Date'].strftime('%Y-%m-%d'),
                    'year': int(row['Year']),
                    'month': int(row['Month']),
                    'units': net_qty,
                    'sales': round(net_qty * (float(row['R_Rate']) if pd.notna(row['R_Rate']) else 0), 2),
                })

            if not sales_values:
                continue

            avg_sales = np.mean(sales_values)
            std_sales = np.std(sales_values) if len(sales_values) > 1 else 0
            confidence = max(0.5, 1.0 - (std_sales / avg_sales)) if avg_sales > 0 else 0.5

            if len(sales_values) >= 2:
                if sales_values[-1] > sales_values[-2] * 1.1:
                    trend = 'increasing'
                elif sales_values[-1] < sales_values[-2] * 0.9:
                    trend = 'decreasing'
                else:
                    trend = 'stable'
            else:
                trend = 'stable'

            results.append({
                'item_id': str(recent.iloc[-1]['Item_ID']),
                'item_name': item_name,
                'category': recent.iloc[-1]['Category'],
                'price': float(recent.iloc[-1]['R_Rate']) if pd.notna(recent.iloc[-1]['R_Rate']) else 0,
                'purchase_price': float(recent.iloc[-1]['W_Rate']) if pd.notna(recent.iloc[-1]['W_Rate']) else 0,
                'prediction': round(avg_sales, 1),
                'confidence': 0.8,
                'statistics': {
                    'low_sales': round(min(sales_values), 1),
                    'high_sales': round(max(sales_values), 1),
                    'average_sales': round(avg_sales, 1),
                    'trend': trend,
                },
                'monthly_data': monthly_data,
            })

        return results
