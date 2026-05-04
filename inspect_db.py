import sqlite3
import pandas as pd

conn = sqlite3.connect('converted_dataset/inventory_sales.db')
tables = pd.read_sql_query("SELECT name FROM sqlite_master WHERE type='table';", conn)
print('Tables:', tables['name'].tolist())

for table in tables['name']:
    print(f'\n--- Schema for {table} ---')
    schema = pd.read_sql_query(f"PRAGMA table_info({table});", conn)
    print(schema[['name', 'type']])
    print(f'\n--- Sample data from {table} ---')
    try:
        sample = pd.read_sql_query(f"SELECT * FROM {table} LIMIT 3;", conn)
        print(sample)
    except Exception as e:
        print('Error:', e)
