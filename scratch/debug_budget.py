"""
Debug exactly what the budget allocator computes per group — 
print the sum of predictions and avg_price per group.
"""
import sys
sys.path.insert(0, r"d:\sahil\Product_demand_forecasting\Retail-AI-Prediction-v2")

import sqlite3, pandas as pd, numpy as np

conn = sqlite3.connect('converted_dataset/inventory_sales.db')
df = pd.read_sql_query("SELECT * FROM master_training_data", conn)
conn.close()

df['Date'] = pd.to_datetime(df['Date'])
df = df[df['Item_Name'].notna() & (df['Item_Name'] != '') & (df['Item_Name'] != 'None')]
df = df[df['Group'].notna() & (df['Group'] != 'None')]

groups = sorted(df['Group'].unique().tolist())
print("Groups:", groups)

# Simulate what budget allocator computes
target_month = 6
print(f"\n--- Per-group stats for Month {target_month} ---")
total_cost = 0
for grp in groups:
    gdf = df[df['Group'] == grp]
    
    # Items
    items = gdf['Item_Name'].nunique()
    
    # Average price
    avg_price = float(gdf['R_Rate'].mean())
    if avg_price == 0 or np.isnan(avg_price):
        avg_price = float(gdf['W_Rate'].mean())
    
    # Month data
    month_data = gdf[gdf['Month'] == target_month]
    if len(month_data) > 0:
        avg_monthly_demand_hist = float(month_data.groupby('Item_Name')['Net_Qty'].mean().sum())
    else:
        avg_monthly_demand_hist = float(gdf.groupby(['Year', 'Month'])['Net_Qty'].sum().mean())
    
    estimated_cost = avg_monthly_demand_hist * avg_price
    total_cost += estimated_cost
    
    print(f"Group {grp}: items={items}, avg_price=Rs{avg_price:.2f}, "
          f"month_demand={avg_monthly_demand_hist:.0f}, est_cost=Rs{estimated_cost:,.0f}")

print(f"\nTotal estimated cost: Rs{total_cost:,.0f}")
print("\n--- Weights ---")
for grp in groups:
    gdf = df[df['Group'] == grp]
    avg_price = float(gdf['R_Rate'].mean())
    month_data = gdf[gdf['Month'] == target_month]
    if len(month_data) > 0:
        demand = float(month_data.groupby('Item_Name')['Net_Qty'].mean().sum())
    else:
        demand = float(gdf.groupby(['Year', 'Month'])['Net_Qty'].sum().mean())
    cost = demand * avg_price
    weight = (cost / total_cost * 100) if total_cost > 0 else 0
    print(f"Group {grp}: weight={weight:.2f}%")

# Also check what top 5 items per group look like in terms of Net_Qty
print("\n--- Sample item Net_Qty per group (for month) ---")
for grp in groups:
    gdf_month = df[(df['Group'] == grp) & (df['Month'] == target_month)]
    if len(gdf_month) == 0:
        gdf_month = df[df['Group'] == grp]
    top5 = gdf_month.groupby('Item_Name')['Net_Qty'].mean().sort_values(ascending=False).head(3)
    print(f"Group {grp}: {dict(top5)}")
