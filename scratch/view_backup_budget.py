import codecs

path = r"d:\sahil\Product_demand_forecasting\Retail-AI-Prediction-v2\inventory_model_secondary\src\api_production.py.backup"
with codecs.open(path, "r", "utf-16le") as f:
    lines = f.readlines()

for idx in range(1125, min(1260, len(lines))):
    print(f"{idx+1}: {lines[idx]}", end="")
