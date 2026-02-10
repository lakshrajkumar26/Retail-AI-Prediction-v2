"""
Quick API test script to verify all endpoints are working
Run this after starting the API server
"""
import requests

API_URL = "http://127.0.0.1:8000"

def test_endpoints():
    print("🧪 Testing RetailAI API Endpoints\n")
    
    # Test 1: Get stores
    print("1️⃣ Testing GET /stores")
    try:
        response = requests.get(f"{API_URL}/stores")
        if response.status_code == 200:
            print(f"   ✅ Success: {response.json()}")
        else:
            print(f"   ❌ Failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 2: Get products
    print("\n2️⃣ Testing GET /products/S001")
    try:
        response = requests.get(f"{API_URL}/products/S001")
        if response.status_code == 200:
            print(f"   ✅ Success: {response.json()}")
        else:
            print(f"   ❌ Failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 3: Get history
    print("\n3️⃣ Testing GET /history/S001/P0001")
    try:
        response = requests.get(f"{API_URL}/history/S001/P0001")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success: Retrieved {len(data)} records")
        else:
            print(f"   ❌ Failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 4: Forecast
    print("\n4️⃣ Testing POST /forecast")
    try:
        payload = {
            "store_id": "S001",
            "product_id": "P0001",
            "months": 3
        }
        response = requests.post(f"{API_URL}/forecast", json=payload)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success: Generated {len(data)} week forecast")
        else:
            print(f"   ❌ Failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 5: Predict with context
    print("\n5️⃣ Testing POST /predict_with_context")
    try:
        payload = {
            "store_id": "S001",
            "product_id": "P0001",
            "prediction_for_date": "2024-01-15",
            "category": "Groceries",
            "region": "North",
            "weather_condition": "Sunny",
            "seasonality": "Summer",
            "inventory_level": 100,
            "price": 50.0,
            "discount": 10.0,
            "competitor_pricing": 55.0,
            "holiday_promotion": 0
        }
        response = requests.post(f"{API_URL}/predict_with_context", json=payload)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success: Prediction = {data['predicted_demand']} units")
            print(f"   📊 Status: {data['summary']['stock_status']}")
        else:
            print(f"   ❌ Failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print("\n" + "="*50)
    print("✅ API Testing Complete!")
    print("="*50)

if __name__ == "__main__":
    test_endpoints()
