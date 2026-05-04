import os

with open('inventory_model_secondary/src/api_production_dashboard_ext.py', 'r', encoding='utf-8') as f:
    ext_content = f.read()

with open('inventory_model_secondary/src/api_production.py', 'r', encoding='utf-8') as f:
    api_content = f.read()

start_idx = api_content.find('@app.get("/analytics/dashboard/historical")')
end_idx = api_content.find('# ============================================================\n# Budget Allocation Engine')

if start_idx != -1 and end_idx != -1:
    ext_chunk = ext_content[ext_content.find('@app.get("/analytics/dashboard/historical")'):]
    new_content = api_content[:start_idx] + ext_chunk + "\n\n" + api_content[end_idx:]
    with open('inventory_model_secondary/src/api_production.py', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully merged dashboard endpoints.")
else:
    print(f"Failed to find indices: start={start_idx}, end={end_idx}")
