import sys
import time

sys.path.append(r"d:\sahil\Product_demand_forecasting\Retail-AI-Prediction-v2")

from inventory_model_secondary.src.api_production import _run_retraining_task, global_training_status

print("Starting native retraining task synchronously...")
_run_retraining_task(triggered_by="manual_script")

print("Retraining completed!")
print(f"Final Status: {global_training_status}")
