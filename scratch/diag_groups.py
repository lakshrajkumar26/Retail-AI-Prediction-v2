import sqlite3
import pandas as pd

conn = sqlite3.connect('converted_dataset/inventory_sales.db')

# Check groups in master_training_data
print("=== master_training_data Group distribution ===")
df = pd.read_sql_query("SELECT [Group], Category, count(*) as count FROM master_training_data GROUP BY [Group], Category ORDER BY [Group]", conn)
print(df)

# Check avg Net_Qty per group
print("\n=== Average Net_Qty by Group in master_training_data ===")
df2 = pd.read_sql_query("SELECT [Group], avg(Net_Qty) as avg_qty, sum(Net_Qty) as total_qty, count(*) as rows FROM master_training_data GROUP BY [Group]", conn)
print(df2)

# Check what month has data
print("\n=== Latest months in master_training_data ===")
df3 = pd.read_sql_query("SELECT Year, Month, count(*) FROM master_training_data GROUP BY Year, Month ORDER BY Year DESC, Month DESC LIMIT 5", conn)
print(df3)

conn.close()
