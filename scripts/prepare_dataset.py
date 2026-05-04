"""
Demand Forecasting Dataset Preparation
========================================
Consolidates all monthly cleaned CSD Grocery and Liquor datasets,
handles missing months by imputing an epsilon value (1 unit),
and engineers predictive features (Lags, Margins, Rolling Averages).
"""

import pandas as pd
import numpy as np
import os
import glob
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
OUTPUT_FILE = os.path.join(DATA_DIR, 'master_training_data.csv')

MONTH_MAP = {
    'jan': 1, 'january': 1,
    'feb': 2, 'february': 2,
    'mar': 3, 'march': 3,
    'apr': 4, 'april': 4,
    'may': 5,
    'jun': 6, 'june': 6,
    'jul': 7, 'july': 7,
    'aug': 8, 'august': 8,
    'sep': 9, 'september': 9,
    'oct': 10, 'october': 10,
    'nov': 11, 'november': 11,
    'dec': 12, 'december': 12
}

def load_data():
    print("Scanning for cleaned files...")
    all_files = [f for f in glob.glob(os.path.join(DATA_DIR, '**', 'cleaned', '*.xlsx'), recursive=True) 
                 if not os.path.basename(f).startswith('~$')]
    
    print(f"Found {len(all_files)} files to concatenate.")
    
    dfs = []
    for f in all_files:
        filename = os.path.basename(f)
        
        # Extract Month
        m = re.search(r'(jan|feb|mar|apr|may|jun|july|jul|aug|sep|oct|nov|dec)', filename, re.I)
        month_str = m.group(1).lower() if m else 'unknown'
        
        # Extract Year
        y = re.search(r'(24|25)', filename)
        year_str = '20' + y.group(1) if y else 'unknown'
        
        # Determine Category
        cat = 'Liquor' if 'liq' in filename.lower() else 'Grocery'
        
        df = pd.read_excel(f)
        df = df[df['S.No'] != 'Group Total'].copy()
        
        df['Month_Str'] = month_str
        df['Year'] = int(year_str) if year_str != 'unknown' else 2024
        df['Category'] = cat
        dfs.append(df)

    master = pd.concat(dfs, ignore_index=True)
    return master

def prepare_and_engineer(df):
    print("\nStarting Feature Engineering...")
    
    # 1. Clean missing Net_Qty
    initial_rows = len(df)
    df = df.dropna(subset=['Net_Qty'])
    print(f"Dropped {initial_rows - len(df)} rows with NaN Net_Qty.")
    
    # 2. Time Features
    df['Month'] = df['Month_Str'].map(MONTH_MAP)
    df['Date'] = pd.to_datetime(df['Year'].astype(str) + '-' + df['Month'].astype(str).str.zfill(2) + '-01')
    df = df.sort_values('Date')
    
    df['Quarter'] = df['Date'].dt.quarter
    
    # Time index (1 to N representing chronological months)
    unique_dates = sorted(df['Date'].unique())
    date_to_idx = {d: i+1 for i, d in enumerate(unique_dates)}
    df['Time_Index'] = df['Date'].map(date_to_idx)
    
    # 3. Pricing Features
    df['Margin_Abs'] = df['R_Rate'] - df['W_Rate']
    df['Margin_Pct'] = np.where(df['W_Rate'] > 0, df['Margin_Abs'] / df['W_Rate'], 0)
    
    # We need a unique identifier for items
    df['Item_ID'] = df['GP_Index_No'].astype(str) + "_" + df['pluno'].astype(str)
    
    print("\nAggregating duplicates...")
    # Aggregate duplicates per Item_ID and Date
    agg_funcs = {
        'Net_Qty': 'sum',
        'Qty': 'sum',
        'Refund_Qty': 'sum',
        'R_Amt': 'sum',
        'W_Amt': 'sum',
        'Profit': 'sum',
        'O_B': 'sum',
        'Closing_Stock': 'sum',
        'Net_Tax': 'sum',
        'W_Rate': 'mean',
        'R_Rate': 'mean',
        'Margin_Abs': 'mean',
        'Margin_Pct': 'mean',
        'GP_Index_No': 'first',
        'pluno': 'first',
        'Item_Name': 'first',
        'Group': 'first',
        'Category': 'first',
        'Month': 'first',
        'Year': 'first',
        'Quarter': 'first',
        'Time_Index': 'first'
    }
    
    # Only aggregate columns that exist
    agg_cols = {k: v for k, v in agg_funcs.items() if k in df.columns}
    df_agg = df.groupby(['Item_ID', 'Date'], as_index=False).agg(agg_cols)
    print(f"Aggregated {len(df)} rows to {len(df_agg)} unique Item-Date rows.")
    
    print("\nReindexing to handle Missing/Zero Demand months...")
    # 4. Impute Missing Months
    # Create a complete grid of (Item_ID x Date)
    all_items = df_agg['Item_ID'].unique()
    all_dates = df_agg['Date'].unique()
    idx = pd.MultiIndex.from_product([all_items, all_dates], names=['Item_ID', 'Date'])
    
    # Set index to Item_ID and Date
    df_indexed = df_agg.set_index(['Item_ID', 'Date'])
    
    # Reindex
    df_full = df_indexed.reindex(idx)
    
    # Fill missing Net_Qty with epsilon = 1.0
    epsilon = 1.0
    missing_demand_count = df_full['Net_Qty'].isna().sum()
    df_full['Net_Qty'] = df_full['Net_Qty'].fillna(epsilon)
    print(f"Imputed {missing_demand_count} missing item-months with demand = {epsilon}")
    
    # Reset index so we can fill metadata easily
    df_full = df_full.reset_index()
    
    # For imputed rows, they are missing metadata (Item_Name, Group, Category, Rates)
    # We can group by Item_ID and forward-fill / backward-fill
    metadata_cols = ['GP_Index_No', 'pluno', 'Item_Name', 'Group', 'Category', 
                     'W_Rate', 'R_Rate', 'Margin_Abs', 'Margin_Pct']
    
    df_full[metadata_cols] = df_full.groupby('Item_ID')[metadata_cols].ffill()
    df_full[metadata_cols] = df_full.groupby('Item_ID')[metadata_cols].bfill()
    
    # Recompute time features for the newly added rows
    df_full['Month'] = df_full['Date'].dt.month
    df_full['Year'] = df_full['Date'].dt.year
    df_full['Quarter'] = df_full['Date'].dt.quarter
    df_full['Time_Index'] = df_full['Date'].map(date_to_idx)
    
    # 5. Lag Features and Rolling Averages
    print("Calculating Lags and Rolling Averages...")
    df_full = df_full.sort_values(by=['Item_ID', 'Date'])
    
    # Lag 1, 2, 3
    df_full['Lag_1'] = df_full.groupby('Item_ID')['Net_Qty'].shift(1)
    df_full['Lag_2'] = df_full.groupby('Item_ID')['Net_Qty'].shift(2)
    df_full['Lag_3'] = df_full.groupby('Item_ID')['Net_Qty'].shift(3)
    
    # Rolling 3-month average
    df_full['Rolling_Mean_3M'] = df_full.groupby('Item_ID')['Net_Qty'].transform(
        lambda x: x.shift(1).rolling(window=3, min_periods=1).mean()
    )
    
    print(f"\nFinal Dataset Size: {df_full.shape[0]} rows x {df_full.shape[1]} columns")
    return df_full


def main():
    print("=" * 60)
    print("CSD Data Pipeline: Preparation & Feature Engineering")
    print("=" * 60)
    
    df_raw = load_data()
    df_final = prepare_and_engineer(df_raw)
    
    print("\nSaving to CSV...")
    df_final.to_csv(OUTPUT_FILE, index=False)
    print(f"[DONE] File saved to: {OUTPUT_FILE}")
    
    print("\n--- Quick Stats ---")
    print("Total Unique Items:", df_final['Item_ID'].nunique())
    print("Date Range:", df_final['Date'].min().strftime('%Y-%m'), "to", df_final['Date'].max().strftime('%Y-%m'))
    print("Target Variable (Net_Qty) Mean:", round(df_final['Net_Qty'].mean(), 2))
    
if __name__ == '__main__':
    main()
