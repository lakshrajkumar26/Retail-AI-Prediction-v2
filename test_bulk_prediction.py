"""
Test script for the bulk prediction endpoint
Run this after starting the API server
"""
import requests
import json
from datetime import datetime

API_URL = "http://127.0.0.1:8000"

def test_bulk_prediction():
    print("🧪 Testing Bulk Prediction Endpoint\n")
    print("="*60)
    
    # Test data
    payload = {
        "store_id": "S001",
        "prediction_date": "2024-01-15"
    }
    
    print(f"📤 Sending request to: {API_URL}/bulk_predict")
    print(f"📦 Payload: {json.dumps(payload, indent=2)}\n")
    
    try:
        response = requests.post(f"{API_URL}/bulk_predict", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            
            print("✅ SUCCESS! Bulk prediction generated\n")
            print("="*60)
            
            # Display Summary
            print("\n📊 SUMMARY")
            print("-"*60)
            summary = data['summary']
            print(f"Store ID: {data['store_id']}")
            print(f"Prediction Date: {data['prediction_date']}")
            print(f"Total Products: {summary['total_products']}")
            print(f"Critical Stock: {summary['critical_stock']} 🚨")
            print(f"Low Stock: {summary['low_stock']} ⚠️")
            print(f"Adequate Stock: {summary['adequate_stock']} ✅")
            print(f"Excess Stock: {summary['excess_stock']} 📦")
            print(f"Total Order Value: {summary['currency']}{summary['total_order_value']:,.2f}")
            print(f"Revenue at Risk: {summary['currency']}{summary['total_revenue_at_risk']:,.2f}")
            
            # Display Top 5 Products
            print("\n📋 TOP 5 PRODUCTS (by priority)")
            print("-"*60)
            predictions = data['predictions'][:5]
            
            for i, product in enumerate(predictions, 1):
                print(f"\n{i}. Product: {product['product_id']}")
                print(f"   Status: {product['status']} (Priority: {product['priority']})")
                print(f"   Current Stock: {product['current_stock']} units")
                print(f"   Predicted Demand: {product['predicted_demand']} units")
                print(f"   Recommended Order: {product['recommended_order']} units")
                print(f"   Order Value: ₹{product['recommended_order'] * product['price']:,.2f}")
                print(f"   Confidence: {product['confidence']}")
                
                if product['shortage'] > 0:
                    print(f"   ⚠️ Shortage: {product['shortage']} units")
                    print(f"   💰 Revenue at Risk: ₹{product['lost_revenue_risk']:,.2f}")
            
            # Display Critical Products
            critical_products = [p for p in data['predictions'] if p['status'] == 'CRITICAL']
            if critical_products:
                print("\n🚨 CRITICAL STOCK ALERTS")
                print("-"*60)
                for product in critical_products:
                    print(f"⚠️ {product['product_id']}: Order {product['recommended_order']} units IMMEDIATELY!")
            
            print("\n" + "="*60)
            print("✅ Test completed successfully!")
            print("="*60)
            
            # Save to file
            with open('bulk_prediction_result.json', 'w') as f:
                json.dump(data, f, indent=2)
            print("\n💾 Full results saved to: bulk_prediction_result.json")
            
        else:
            print(f"❌ Failed with status code: {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to API server")
        print("Make sure the API is running on http://127.0.0.1:8000")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_bulk_prediction()
