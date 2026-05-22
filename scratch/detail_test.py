import urllib.request
import json

def post(url, data):
    req = urllib.request.Request(url, method="POST")
    req.add_header('Content-Type', 'application/json')
    body = json.dumps(data).encode('utf-8')
    response = urllib.request.urlopen(req, body, timeout=10)
    return json.loads(response.read().decode('utf-8'))

# Test budget allocation in detail
print("=== Budget Allocation Detail ===")
budget_result = post("http://localhost:8002/budget/allocate", {"budget": 500000, "month": 6, "year": 2026})
print(f"Total groups: {len(budget_result['groups'])}")
for g in budget_result['groups']:
    print(f"  Group {g['group']}: label={g['label']}, items={g['item_count']}, "
          f"allocated=₹{g['allocated_budget']:,.0f}, weight={g['weight']}%, "
          f"coverage={g['coverage_pct']}%, demand={g['avg_monthly_demand']}")
    print(f"    Top products: {[p['name'][:30] for p in g.get('top_products', [])[:2]]}")

print("\n=== 3-Month Aggregate Detail ===")
agg_result = post("http://localhost:8002/predict-future-aggregate", {"prediction_date": "2026-06-01", "n_months": 3})
print(f"Total predictions: {agg_result['total']}")
if agg_result['predictions']:
    p = agg_result['predictions'][0]
    print(f"Sample prediction keys: {list(p.keys())}")
    print(f"Sample: {p}")
