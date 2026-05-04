import os
import pandas as pd
import numpy as np
import shutil

MASTER_PATH = "data/master_training_data.csv"
BACKUP_PATH = "data/master_training_data_backup.csv"
GROCERY_PATH = "data/2026/Grocery 2026"
LIQUOR_PATH = "data/2026/Liquor 2026"

MONTH_MAP = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4,
    'may': 5, 'jun': 6, 'jul': 7, 'aug': 8,
    'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
}

print("1. Loading original master training data...")
master_df = pd.read_csv(MASTER_PATH)
master_df['Date'] = pd.to_datetime(master_df['Date'])

# Create item name to Item_ID map to keep IDs consistent
item_id_map = master_df.set_index('Item_Name')['Item_ID'].to_dict()

# Identify highest ID to assign new ones if necessary
max_item_id = 0
for v in item_id_map.values():
    if isinstance(v, str) and v.isdigit():
        max_item_id = max(max_item_id, int(v))
    elif isinstance(v, (int, float)) and not np.isnan(v):
        max_item_id = max(max_item_id, int(v))

new_data_frames = []

def process_folder(folder_path, category):
    global max_item_id
    if not os.path.exists(folder_path):
        return
    for filename in os.listdir(folder_path):
        if not filename.endswith('.xlsx'):
            continue
        print(f"   Processing {filename}...")
        
        # Parse month and year from filename
        parts = filename.split('_')
        month_str = ""
        year_str = ""
        for p in parts:
            if p in MONTH_MAP:
                month_str = p
            elif p.isdigit() and len(p) == 2:
                year_str = p
        
        if not month_str or not year_str:
            print(f"     Could not parse date from {filename}, skipping.")
            continue
            
        month = MONTH_MAP[month_str]
        year = int("20" + year_str)
        
        df = pd.read_excel(os.path.join(folder_path, filename))
        
        # Build necessary columns
        df['Month'] = month
        df['Year'] = year
        df['Quarter'] = (month - 1) // 3 + 1
        df['Date'] = pd.to_datetime(f"{year}-{month:02d}-01")
        df['Category'] = category
        df['Margin_Abs'] = df['Profit']
        df['Margin_Pct'] = np.where(df['R_Amt'] > 0, df['Profit'] / df['R_Amt'], 0)
        
        # Assign Item IDs
        item_ids = []
        for name in df['Item_Name']:
            if name in item_id_map:
                item_ids.append(item_id_map[name])
            else:
                max_item_id += 1
                item_id_map[name] = str(max_item_id)
                item_ids.append(str(max_item_id))
        df['Item_ID'] = item_ids
        
        new_data_frames.append(df)

print("2. Ingesting new 2026 data...")
process_folder(GROCERY_PATH, 'Grocery')
process_folder(LIQUOR_PATH, 'Liquor')

if not new_data_frames:
    print("No new valid data found.")
    exit(0)

new_df = pd.concat(new_data_frames, ignore_index=True)

# Align columns with master schema
master_cols = master_df.columns.tolist()
for col in master_cols:
    if col not in new_df.columns:
        if col.startswith('Lag_') or col == 'Rolling_Mean_3M' or col == 'Time_Index':
            new_df[col] = np.nan
        else:
            new_df[col] = 0

new_df = new_df[master_cols]

print("3. Merging datasets...")
combined_df = pd.concat([master_df, new_df], ignore_index=True)

print("4. Re-calculating time-series features (Sorting and Lagging)...")
# Time_Index
combined_df['Time_Index'] = (combined_df['Year'] - 2024) * 12 + combined_df['Month']

# Sort chronologically for lagging
combined_df = combined_df.sort_values(by=['Item_Name', 'Date']).reset_index(drop=True)

# Group by Item_Name and shift
print("   Calculating lags...")
combined_df['Lag_1'] = combined_df.groupby('Item_Name')['Net_Qty'].shift(1).fillna(0)
combined_df['Lag_2'] = combined_df.groupby('Item_Name')['Net_Qty'].shift(2).fillna(0)
combined_df['Lag_3'] = combined_df.groupby('Item_Name')['Net_Qty'].shift(3).fillna(0)

print("   Calculating rolling mean...")
combined_df['Rolling_Mean_3M'] = (combined_df['Lag_1'] + combined_df['Lag_2'] + combined_df['Lag_3']) / 3.0

print("5. Backing up original master file...")
shutil.copyfile(MASTER_PATH, BACKUP_PATH)

print("6. Saving updated master file...")
combined_df.to_csv(MASTER_PATH, index=False)
print(f"Success! Master data updated. Total rows: {len(combined_df)} (Added {len(new_df)} rows).")
