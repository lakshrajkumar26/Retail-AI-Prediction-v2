import sqlite3
import pandas as pd

conn = sqlite3.connect('converted_dataset/inventory_sales.db')
print("master_training_data sample with '/' in GP_Index_No:")
df1 = pd.read_sql_query("SELECT GP_Index_No, [Group], Category, count(*) as count FROM master_training_data WHERE GP_Index_No LIKE '%/%' GROUP BY GP_Index_No, [Group], Category LIMIT 10", conn)
print(df1)

print("\ninventory_sales sample with '/' in GP_Index_No:")
df2 = pd.read_sql_query("SELECT GP_Index_No, [Group], _category, count(*) as count FROM inventory_sales WHERE GP_Index_No LIKE '%/%' GROUP BY GP_Index_No, [Group], _category LIMIT 10", conn)
print(df2)

print("\ninventory_sales count where Group is not null:")
print(pd.read_sql_query("SELECT [Group], count(*) FROM inventory_sales GROUP BY [Group]", conn))

print("\nmaster_training_data count where Group is not null:")
print(pd.read_sql_query("SELECT [Group], count(*) FROM master_training_data GROUP BY [Group]", conn))

conn.close()
