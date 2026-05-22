import urllib.request
import json
import time

# Test 1: Quick health check
try:
    r = urllib.request.urlopen("http://localhost:8002/health", timeout=5)
    data = json.loads(r.read().decode())
    print("HEALTH:", data['status'], "| Items loaded:", data['items_loaded'])
except Exception as e:
    print("HEALTH FAILED:", e)

# Test 2: Budget Allocate (with 30s timeout - it calls predict_single_month internally)
print("\nTesting /budget/allocate (may take 20-30s)...")
try:
    req = urllib.request.Request("http://localhost:8002/budget/allocate", method="POST")
    req.add_header('Content-Type', 'application/json')
    body = json.dumps({"budget": 500000, "month": 6, "year": 2026}).encode()
    t0 = time.time()
    r = urllib.request.urlopen(req, body, timeout=45)
    elapsed = time.time() - t0
    data = json.loads(r.read().decode())
    print(f"BUDGET ALLOCATE OK in {elapsed:.1f}s")
    print(f"  Groups: {len(data['groups'])}")
    for g in data['groups']:
        print(f"    Group {g['group']}: allocated=Rs{g['allocated_budget']:,.0f} | weight={g['weight']}% | items={g['item_count']}")
except Exception as e:
    print("BUDGET ALLOCATE FAILED:", e)

# Test 3: Predict Future Aggregate (with 30s timeout)
print("\nTesting /predict-future-aggregate (may take 20-30s)...")
try:
    req = urllib.request.Request("http://localhost:8002/predict-future-aggregate", method="POST")
    req.add_header('Content-Type', 'application/json')
    body = json.dumps({"prediction_date": "2026-06-01", "n_months": 3}).encode()
    t0 = time.time()
    r = urllib.request.urlopen(req, body, timeout=45)
    elapsed = time.time() - t0
    data = json.loads(r.read().decode())
    total = data.get('total', 0)
    preds = data.get('predictions', [])
    print(f"AGGREGATE OK in {elapsed:.1f}s | Total items: {total}")
    if preds:
        p = preds[0]
        print(f"  Sample: {p.get('item_name','')} | demand={p.get('final_prediction',0):.0f} | price={p.get('price',0)}")
except Exception as e:
    print("AGGREGATE FAILED:", e)
