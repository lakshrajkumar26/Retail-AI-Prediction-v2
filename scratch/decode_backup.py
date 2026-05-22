import os

backup_path = r"d:\sahil\Product_demand_forecasting\Retail-AI-Prediction-v2\inventory_model_secondary\src\api_production.py.backup"
utf8_path = r"d:\sahil\Product_demand_forecasting\Retail-AI-Prediction-v2\inventory_model_secondary\src\api_production_utf8.py"

if os.path.exists(backup_path):
    with open(backup_path, 'r', encoding='utf-16le') as f:
        content = f.read()
    with open(utf8_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Decoded successfully!")
else:
    print("Backup file not found.")
