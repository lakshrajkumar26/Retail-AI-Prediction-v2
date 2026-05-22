import urllib.request
import json
import time

BASE = "http://localhost:8002"

def get(path, timeout=10):
    try:
        r = urllib.request.urlopen(f"{BASE}{path}", timeout=timeout)
        return json.loads(r.read().decode()), r.status
    except Exception as e:
        return None, str(e)

def post(path, body, timeout=45):
    try:
        req = urllib.request.Request(f"{BASE}{path}", method="POST")
        req.add_header('Content-Type', 'application/json')
        t0 = time.time()
        r = urllib.request.urlopen(req, json.dumps(body).encode(), timeout=timeout)
        elapsed = time.time() - t0
        return json.loads(r.read().decode()), r.status, elapsed
    except Exception as e:
        return None, str(e), 0

print("=" * 60)
print("FULL SYSTEM VERIFICATION")
print("=" * 60)

# 1. Health
data, status = get("/health")
print(f"\n[1] /health -> {status} | items_loaded={data.get('items_loaded')} | status={data.get('status')}")

# 2. Stats
data, status = get("/stats")
if data:
    print(f"[2] /stats -> {status} | total_items={data.get('total_items')} | accuracy={data.get('accuracy')}")
else:
    print(f"[2] /stats -> FAILED: {status}")

# 3. Predict (paginated - what BulkPrediction page uses)
data, status, t = post("/predict-paginated?page=1&page_size=50", {"prediction_date": "2026-06-01"})
if data:
    preds = data.get('predictions', [])
    pag = data.get('pagination', {})
    print(f"[3] /predict-paginated -> {status} in {t:.1f}s | page={pag.get('page')}, items={len(preds)}, total={pag.get('total_items')}, has_next={pag.get('has_next')}")
    if preds:
        p = preds[0]
        print(f"    Sample: {p.get('item_name')} | group={p.get('group')} | pred={p.get('final_prediction')}")
else:
    print(f"[3] /predict-paginated -> FAILED: {status}")

# 4. Budget Allocate (what BudgetAllocator page uses)
data, status, t = post("/budget/allocate", {"budget": 500000, "month": 6, "year": 2026})
if data:
    groups = data.get('groups', [])
    print(f"[4] /budget/allocate -> {status} in {t:.1f}s | groups={len(groups)}")
    for g in groups:
        print(f"    Group {g['group']}: {g['weight']}% | Rs{g['allocated_budget']:,.0f} | items={g['item_count']}")
else:
    print(f"[4] /budget/allocate -> FAILED: {status}")

# 5. Future Aggregate (what 3-month bulk forecast uses)
data, status, t = post("/predict-future-aggregate", {"prediction_date": "2026-06-01", "n_months": 3})
if data:
    preds = data.get('predictions', [])
    print(f"[5] /predict-future-aggregate -> {status} in {t:.1f}s | items={data.get('total')}")
    if preds:
        p = preds[0]
        print(f"    Sample: {p.get('item_name')} | demand={p.get('final_prediction'):.0f} | price=Rs{p.get('price')}")
else:
    print(f"[5] /predict-future-aggregate -> FAILED: {status}")

print("\n" + "=" * 60)
print("VERIFICATION COMPLETE")
print("=" * 60)
