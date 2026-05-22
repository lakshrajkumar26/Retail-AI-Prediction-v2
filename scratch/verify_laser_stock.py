import sys
sys.path.insert(0, r'd:\sahil\Product_demand_forecasting\Retail-AI-Prediction-v2\inventory_model_secondary\src')

from forecaster import DemandForecaster

print("=== VERIFYING LASER R/BLADE STAINLESS predictions ===")
forecaster = DemandForecaster()
results = forecaster.predict_single_month(6, 2026)

print(f"Total predictions returned: {len(results)}")

matches = [r for r in results if r.get('item_name') and 'LASER' in r['item_name'].upper()]
for m in matches:
    print(f"\nItem: {m['item_name']}")
    print(f"  Item ID: {m['item_id']}")
    print(f"  Price: {m['price']}, Purchase Price: {m['purchase_price']}")
    print(f"  Current Stock (API): {m['current_stock']}")
    print(f"  Stock data available: {m['stock_data_available']}")
    print(f"  Final Prediction: {m['final_prediction']}")
    print(f"  Recommended Order: {m['recommended_order']}")
