"""
Deep diagnosis of budget allocation group issue.
Group II has avg_qty = 56.9 (vs other groups 2-10), so it's getting ~98% of budget.
This is because:
- Group II items happen to have high raw Net_Qty in the historical data
- The budget allocator uses avg_monthly_demand (sum of item means) * avg_price as "cost"
- Group II items have much higher avg Net_Qty PER ITEM than other groups

Let's confirm:
"""
import sqlite3
import pandas as pd

conn = sqlite3.connect('converted_dataset/inventory_sales.db')

# Check avg qty per ITEM per group (not per record)
print("=== Avg Net_Qty per ITEM per Group ===")
df = pd.read_sql_query("""
    SELECT [Group], 
           count(DISTINCT Item_Name) as items,
           avg(Net_Qty) as avg_qty_per_record,
           sum(Net_Qty) / count(DISTINCT Item_Name) as avg_qty_per_item
    FROM master_training_data 
    GROUP BY [Group]
    ORDER BY avg_qty_per_item DESC
""", conn)
print(df)

# Check what specific Group II items look like
print("\n=== Top 10 Group II items by Avg Net_Qty ===")
df2 = pd.read_sql_query("""
    SELECT Item_Name, avg(Net_Qty) as avg_qty, R_Rate
    FROM master_training_data 
    WHERE [Group] = 'II'
    GROUP BY Item_Name
    ORDER BY avg_qty DESC
    LIMIT 10
""", conn)
print(df2)

# Check Group V items  
print("\n=== Top 10 Group V items by Avg Net_Qty ===")
df3 = pd.read_sql_query("""
    SELECT Item_Name, avg(Net_Qty) as avg_qty, R_Rate
    FROM master_training_data 
    WHERE [Group] = 'V'
    GROUP BY Item_Name
    ORDER BY avg_qty DESC
    LIMIT 5
""", conn)
print(df3)

conn.close()
