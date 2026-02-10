from fastapi import FastAPI, Body
from pydantic import BaseModel
import pandas as pd
import numpy as np
import joblib
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

from features import create_features

# =========================================================
# 📁 PATH SETUP
# =========================================================
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "data"

# =========================================================
# 🤖 LOAD MODEL & ENCODERS (YOUR TRAINED MODEL)
# =========================================================
model = joblib.load(MODEL_DIR / "demand_model.pkl")
encoders = joblib.load(MODEL_DIR / "encoders.pkl")

# =========================================================
# 🚀 FASTAPI APP
# =========================================================
app = FastAPI(
    title="Retail Weekly Demand & Inventory Intelligence API",
    description="XGBoost-based demand forecasting with explainability",
    version="1.0"
)

# =========================================================
# 🌐 CORS
# =========================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# 📥 INPUT SCHEMAS
# =========================================================
class PredictInput(BaseModel):
    date: str
    store_id: str
    product_id: str
    category: str
    region: str
    weather_condition: str
    seasonality: str
    inventory_level: int
    price: float
    discount: float
    competitor_pricing: float
    holiday_promotion: int


class ForecastInput(BaseModel):
    store_id: str
    product_id: str
    months: int = 3


class ContextPredictionInput(BaseModel):
    store_id: str
    product_id: str
    prediction_for_date: str

    category: str
    region: str
    weather_condition: str
    seasonality: str

    inventory_level: int
    price: float
    discount: float
    competitor_pricing: float
    holiday_promotion: int


# =========================================================
# 🧠 FEATURE ORDER (MUST MATCH TRAINING)
# =========================================================
FEATURES = [
    'store_id','product_id','category','region',
    'inventory_level','price','discount',
    'competitor_pricing','holiday_promotion',
    'seasonality','is_weekend','week','month',
    'lag_7','lag_14','lag_30','lag_60',
    'rolling_mean_7','rolling_mean_30'
]

# =========================================================
# 🛠 HELPER
# =========================================================
def prepare_single_row(df: pd.DataFrame) -> pd.DataFrame:
    for col, le in encoders.items():
        df[col] = le.transform(df[col].astype(str))

    df['lag_7'] = 0
    df['lag_14'] = 0
    df['lag_30'] = 0
    df['lag_60'] = 0
    df['rolling_mean_7'] = 0
    df['rolling_mean_30'] = 0

    df['week'] = df['date'].dt.isocalendar().week.astype(int)
    df['month'] = df['date'].dt.month
    df['is_weekend'] = df['date'].dt.weekday.isin([5, 6]).astype(int)

    return df

# =========================================================
# 1️⃣ BASIC PREDICTION
# =========================================================
@app.post("/predict")
def predict(data: PredictInput):

    df = pd.DataFrame([{
        "date": pd.to_datetime(data.date),
        "store_id": data.store_id,
        "product_id": data.product_id,
        "category": data.category,
        "region": data.region,
        "weather_condition": data.weather_condition,
        "seasonality": data.seasonality,
        "inventory_level": data.inventory_level,
        "price": data.price,
        "discount": data.discount,
        "competitor_pricing": data.competitor_pricing,
        "holiday_promotion": data.holiday_promotion
    }])

    df = prepare_single_row(df)
    weekly_demand = float(np.expm1(model.predict(df[FEATURES])[0]))

    return {
        "time_window": "Next 7 days",
        "predicted_weekly_demand": round(weekly_demand, 2)
    }

# =========================================================
# 2️⃣ PREDICT WITH FULL CONTEXT (MAIN ENDPOINT)
# =========================================================
@app.post("/predict_with_context")
def predict_with_context(
    data: ContextPredictionInput = Body(...)
):

    target_date = pd.to_datetime(data.prediction_for_date)

    hist = pd.read_csv(DATA_DIR / "retail_store_inventory.csv")
    hist.columns = hist.columns.str.lower().str.replace(" ", "_").str.replace("/", "_")
    hist['date'] = pd.to_datetime(hist['date'])

    hist = hist[
        (hist['store_id'] == data.store_id) &
        (hist['product_id'] == data.product_id)
    ]

    for col, le in encoders.items():
        hist[col] = le.transform(hist[col].astype(str))

    hist = create_features(hist)

    hist['predicted'] = np.expm1(model.predict(hist[FEATURES]))
    hist['actual'] = hist['units_sold_7d']

    hist['error_pct'] = abs(hist['predicted'] - hist['actual']) / hist['actual'] * 100
    mean_error = hist['error_pct'].tail(30).mean()

    # Time windows
    last_7_days = hist.sort_values("date").tail(7)[['date','predicted','actual']].copy()
    last_7_days['date'] = last_7_days['date'].dt.strftime('%Y-%m-%d')
    
    last_6_weeks = hist.set_index("date").resample("W-SUN").mean().tail(6)[['predicted','actual']].copy()
    last_6_weeks.index = last_6_weeks.index.strftime('%Y-%m-%d')
    
    last_3_months = hist.set_index("date").resample("ME").mean().tail(3)[['predicted','actual']].copy()
    last_3_months.index = last_3_months.index.strftime('%Y-%m-%d')

    # Prediction input
    input_df = pd.DataFrame([{
        "date": target_date,
        "store_id": data.store_id,
        "product_id": data.product_id,
        "category": data.category,
        "region": data.region,
        "weather_condition": data.weather_condition,
        "seasonality": data.seasonality,
        "inventory_level": data.inventory_level,
        "price": data.price,
        "discount": data.discount,
        "competitor_pricing": data.competitor_pricing,
        "holiday_promotion": data.holiday_promotion
    }])

    input_df = prepare_single_row(input_df)
    prediction = float(np.expm1(model.predict(input_df[FEATURES])[0]))

    # Calculate stock recommendations
    current_stock = data.inventory_level
    predicted_demand = round(prediction, 2)
    
    # With error margin (conservative estimate)
    low_estimate = round(prediction * (1 - mean_error/100), 2)
    high_estimate = round(prediction * (1 + mean_error/100), 2)
    
    # Stock status
    shortage = max(predicted_demand - current_stock, 0)
    surplus = max(current_stock - predicted_demand, 0)
    
    # Determine stock status
    if current_stock < low_estimate:
        stock_status = "CRITICAL_LOW"
        stock_message = f"⚠️ URGENT: Stock critically low! You have {current_stock} units but need at least {low_estimate} units."
        action_needed = "ORDER_IMMEDIATELY"
        recommended_order = round(high_estimate - current_stock + (high_estimate * 0.2))  # Add 20% buffer
    elif current_stock < predicted_demand:
        stock_status = "LOW"
        stock_message = f"⚡ Stock is low. You have {current_stock} units but predicted demand is {predicted_demand} units."
        action_needed = "ORDER_SOON"
        recommended_order = round(predicted_demand - current_stock + (predicted_demand * 0.15))  # Add 15% buffer
    elif current_stock < high_estimate:
        stock_status = "ADEQUATE"
        stock_message = f"✅ Stock is adequate. You have {current_stock} units for predicted demand of {predicted_demand} units."
        action_needed = "MONITOR"
        recommended_order = round(max(high_estimate - current_stock, 0))
    else:
        stock_status = "EXCESS"
        stock_message = f"📦 Stock is high. You have {current_stock} units, which is {surplus} units more than predicted demand."
        action_needed = "NO_ORDER_NEEDED"
        recommended_order = 0

    # Calculate monthly estimate (4 weeks)
    monthly_demand_low = round(low_estimate * 4, 2)
    monthly_demand_avg = round(predicted_demand * 4, 2)
    monthly_demand_high = round(high_estimate * 4, 2)
    
    # Revenue impact
    potential_revenue = round(predicted_demand * data.price, 2)
    lost_revenue_if_stockout = round(shortage * data.price, 2)
    
    # Simple explanation for shopkeeper
    if shortage > 0:
        simple_explanation = (
            f"You currently have {current_stock} units in stock. "
            f"Based on past sales, you will likely sell {predicted_demand} units this week. "
            f"This means you are SHORT by {round(shortage, 2)} units. "
            f"Order at least {recommended_order} units to avoid losing ₹{lost_revenue_if_stockout} in sales."
        )
    elif surplus > 0:
        simple_explanation = (
            f"You currently have {current_stock} units in stock. "
            f"Based on past sales, you will likely sell {predicted_demand} units this week. "
            f"You have EXTRA {round(surplus, 2)} units, which is good for safety stock."
        )
    else:
        simple_explanation = (
            f"You currently have {current_stock} units in stock. "
            f"Based on past sales, you will likely sell {predicted_demand} units this week. "
            f"Your stock level is PERFECT for this week's demand."
        )

    return {
        "prediction_for_date": data.prediction_for_date,
        "predicted_demand": predicted_demand,
        
        # Simple summary for shopkeeper
        "summary": {
            "current_stock": current_stock,
            "predicted_sales_this_week": predicted_demand,
            "stock_status": stock_status,
            "message": stock_message,
            "simple_explanation": simple_explanation,
            "action_needed": action_needed
        },
        
        # Stock recommendations
        "stock_recommendation": {
            "recommended_order_quantity": recommended_order,
            "shortage_units": round(shortage, 2),
            "surplus_units": round(surplus, 2),
            "safety_stock_needed": round(high_estimate - predicted_demand, 2)
        },
        
        # Demand estimates with error margin
        "demand_estimates": {
            "this_week": {
                "low": low_estimate,
                "average": predicted_demand,
                "high": high_estimate,
                "confidence": f"{100 - mean_error:.1f}%"
            },
            "this_month": {
                "low": monthly_demand_low,
                "average": monthly_demand_avg,
                "high": monthly_demand_high,
                "explanation": f"Based on 4 weeks, you will sell between {monthly_demand_low} to {monthly_demand_high} units this month"
            }
        },
        
        # Financial impact
        "financial_impact": {
            "expected_revenue": potential_revenue,
            "potential_lost_revenue": lost_revenue_if_stockout,
            "currency": "₹"
        },
        
        # Model confidence
        "confidence_interval": {
            "avg_error_percent": round(mean_error, 2),
            "low": low_estimate,
            "high": high_estimate
        },

        # Historical performance
        "performance_context": {
            "last_7_days": last_7_days.round(2).to_dict("records"),
            "last_6_weeks": last_6_weeks.round(2).reset_index().to_dict("records"),
            "last_3_months": last_3_months.round(2).reset_index().to_dict("records")
        }
    }

# =========================================================
# 3️⃣ HISTORY FOR GRAPHS
# =========================================================
@app.get("/history/{store_id}/{product_id}")
def history(store_id: str, product_id: str):

    df = pd.read_csv(DATA_DIR / "retail_store_inventory.csv")
    df.columns = df.columns.str.lower().str.replace(" ", "_").str.replace("/", "_")
    df['date'] = pd.to_datetime(df['date'])

    df = df[
        (df['store_id'] == store_id) &
        (df['product_id'] == product_id)
    ]

    for col, le in encoders.items():
        if col in df.columns:
            df[col] = le.transform(df[col].astype(str))

    df = create_features(df)
    df['predicted'] = np.expm1(model.predict(df[FEATURES]))

    # Convert date to string for JSON serialization
    result_df = df.sort_values("date")[[
        'date','units_sold_7d','predicted',
        'inventory_level','price','discount'
    ]].copy()
    
    result_df['date'] = result_df['date'].dt.strftime('%Y-%m-%d')
    result_df['units_sold_7d'] = result_df['units_sold_7d'].round(2)
    result_df['predicted'] = result_df['predicted'].round(2)
    result_df['price'] = result_df['price'].round(2)
    result_df['discount'] = result_df['discount'].round(2)
    
    return result_df.to_dict("records")

# =========================================================
# 4️⃣ FUTURE FORECAST
# =========================================================
@app.post("/forecast")
def forecast(data: ForecastInput):

    df = pd.read_csv(DATA_DIR / "retail_store_inventory.csv")
    df.columns = df.columns.str.lower().str.replace(" ", "_").str.replace("/", "_")
    df['date'] = pd.to_datetime(df['date'])

    df = df[
        (df['store_id'] == data.store_id) &
        (df['product_id'] == data.product_id)
    ]

    for col, le in encoders.items():
        if col in df.columns:
            df[col] = le.transform(df[col].astype(str))

    df = create_features(df)
    preds = np.expm1(model.predict(df[FEATURES]))

    weeks = data.months * 4
    future = preds[-weeks:]

    return [
        {
            "week": i + 1,
            "expected_demand": round(float(v), 2)
        }
        for i, v in enumerate(future)
    ]

# =========================================================
# 5️⃣ PRODUCT LIST
# =========================================================
@app.get("/products/{store_id}")
def products(store_id: str):

    df = pd.read_csv(DATA_DIR / "retail_store_inventory.csv")
    df.columns = df.columns.str.lower().str.replace(" ", "_").str.replace("/", "_")

    products = (
        df[df['store_id'] == store_id]['product_id']
        .unique()
        .tolist()
    )

    return {"store_id": store_id, "products": products}

# =========================================================
# 6️⃣ STORES LIST
# =========================================================
@app.get("/stores")
def get_stores():
    df = pd.read_csv(DATA_DIR / "retail_store_inventory.csv")
    df.columns = df.columns.str.lower().str.replace(" ", "_").str.replace("/", "_")
    
    stores = df['store_id'].unique().tolist()
    return {"stores": stores}

# =========================================================
# 7️⃣ BULK PREDICTION FOR ALL PRODUCTS IN A STORE
# =========================================================
@app.post("/bulk_predict")
def bulk_predict(data: dict):
    """
    Get predictions for all products in a store for a specific date
    Input: { "store_id": "S001", "prediction_date": "2024-01-15" }
    """
    try:
        store_id = data.get("store_id")
        prediction_date = data.get("prediction_date")
        
        if not store_id or not prediction_date:
            return {"error": "store_id and prediction_date are required"}
        
        print(f"Processing bulk prediction for store: {store_id}, date: {prediction_date}")
        
        target_date = pd.to_datetime(prediction_date)
        
        # Load data
        df = pd.read_csv(DATA_DIR / "retail_store_inventory.csv")
        df.columns = df.columns.str.lower().str.replace(" ", "_").str.replace("/", "_")
        df['date'] = pd.to_datetime(df['date'])
        
        print(f"Loaded {len(df)} records from CSV")
        
        # Filter by store
        store_df = df[df['store_id'] == store_id].copy()
        
        if store_df.empty:
            return {"error": f"No data found for store {store_id}"}
        
        print(f"Found {len(store_df)} records for store {store_id}")
        
        # Get unique products
        products = store_df['product_id'].unique()
        print(f"Processing {len(products)} products")
        
        predictions = []
        
        for idx, product_id in enumerate(products):
            try:
                print(f"Processing product {idx+1}/{len(products)}: {product_id}")
                
                # Get product data
                product_df = store_df[store_df['product_id'] == product_id].copy()
                
                # Get original category before encoding
                original_category = product_df['category'].iloc[0]
                
                # Encode categoricals
                for col, le in encoders.items():
                    if col in product_df.columns:
                        product_df[col] = le.transform(product_df[col].astype(str))
                
                # Create features
                product_df = create_features(product_df)
                
                # Get predictions
                product_df['predicted'] = np.expm1(model.predict(product_df[FEATURES]))
                product_df['actual'] = product_df['units_sold_7d']
                
                # Calculate error
                product_df['error_pct'] = abs(product_df['predicted'] - product_df['actual']) / product_df['actual'] * 100
                mean_error = product_df['error_pct'].tail(30).mean()
                
                # Get latest values (before encoding)
                latest_original = store_df[store_df['product_id'] == product_id].sort_values('date').tail(1).iloc[0]
                
                # Make prediction for target date
                prediction_row = pd.DataFrame([{
                    "date": target_date,
                    "store_id": latest_original['store_id'],
                    "product_id": latest_original['product_id'],
                    "category": latest_original['category'],
                    "region": latest_original['region'],
                    "weather_condition": latest_original['weather_condition'],
                    "seasonality": latest_original['seasonality'],
                    "inventory_level": latest_original['inventory_level'],
                    "price": latest_original['price'],
                    "discount": latest_original['discount'],
                    "competitor_pricing": latest_original['competitor_pricing'],
                    "holiday_promotion": latest_original['holiday_promotion']
                }])
                
                prediction_row = prepare_single_row(prediction_row)
                predicted_demand = float(np.expm1(model.predict(prediction_row[FEATURES])[0]))
                
                # Calculate recommendations
                current_stock = int(latest_original['inventory_level'])
                low_estimate = round(predicted_demand * (1 - mean_error/100), 2)
                high_estimate = round(predicted_demand * (1 + mean_error/100), 2)
                
                shortage = max(predicted_demand - current_stock, 0)
                
                # Determine status
                if current_stock < low_estimate:
                    status = "CRITICAL"
                    priority = 1
                    recommended_order = round(high_estimate - current_stock + (high_estimate * 0.2))
                elif current_stock < predicted_demand:
                    status = "LOW"
                    priority = 2
                    recommended_order = round(predicted_demand - current_stock + (predicted_demand * 0.15))
                elif current_stock < high_estimate:
                    status = "ADEQUATE"
                    priority = 3
                    recommended_order = round(max(high_estimate - current_stock, 0))
                else:
                    status = "EXCESS"
                    priority = 4
                    recommended_order = 0
                
                # Historical performance (last 4 weeks)
                last_4_weeks = product_df.sort_values('date').tail(4)[['date', 'predicted', 'actual']].copy()
                last_4_weeks['date'] = last_4_weeks['date'].dt.strftime('%Y-%m-%d')
                
                # Calculate projections
                # Weekly demand is already calculated
                daily_demand = predicted_demand / 7  # Average per day
                
                predictions.append({
                    "product_id": product_id,
                    "category": original_category,
                    "current_stock": current_stock,
                    "predicted_demand": round(predicted_demand, 2),
                    "low_estimate": low_estimate,
                    "high_estimate": high_estimate,
                    "recommended_order": int(recommended_order),
                    "shortage": round(shortage, 2),
                    "status": status,
                    "priority": priority,
                    "confidence": f"{100 - mean_error:.1f}%",
                    "price": float(latest_original['price']),
                    "potential_revenue": round(predicted_demand * float(latest_original['price']), 2),
                    "lost_revenue_risk": round(shortage * float(latest_original['price']), 2),
                    "last_4_weeks": last_4_weeks.round(2).to_dict("records"),
                    "demand_breakdown": {
                        "weekly": {
                            "low": low_estimate,
                            "average": round(predicted_demand, 2),
                            "high": high_estimate,
                            "period": "Next 7 days",
                            "explanation": "Expected sales for the next week"
                        },
                        "daily_average": {
                            "low": round(low_estimate / 7, 2),
                            "average": round(daily_demand, 2),
                            "high": round(high_estimate / 7, 2),
                            "period": "Per day",
                            "explanation": "Average daily sales rate"
                        },
                        "monthly": {
                            "low": round(low_estimate * 4.33, 2),  # 30 days / 7 days
                            "average": round(predicted_demand * 4.33, 2),
                            "high": round(high_estimate * 4.33, 2),
                            "period": "Next 30 days",
                            "explanation": "Expected sales for the next month"
                        },
                        "quarterly": {
                            "low": round(low_estimate * 13, 2),  # ~3 months
                            "average": round(predicted_demand * 13, 2),
                            "high": round(high_estimate * 13, 2),
                            "period": "Next 90 days (3 months)",
                            "explanation": "Expected sales for the next quarter"
                        }
                    }
                })
                
            except Exception as e:
                print(f"Error processing product {product_id}: {e}")
                import traceback
                traceback.print_exc()
                continue
        
        print(f"Successfully processed {len(predictions)} products")
        
        # Sort by priority (critical first)
        predictions.sort(key=lambda x: x['priority'])
        
        # Calculate summary
        total_products = len(predictions)
        critical_count = sum(1 for p in predictions if p['status'] == 'CRITICAL')
        low_count = sum(1 for p in predictions if p['status'] == 'LOW')
        total_order_value = sum(p['recommended_order'] * p['price'] for p in predictions)
        total_revenue_at_risk = sum(p['lost_revenue_risk'] for p in predictions)
        
        result = {
            "store_id": store_id,
            "prediction_date": prediction_date,
            "summary": {
                "total_products": total_products,
                "critical_stock": critical_count,
                "low_stock": low_count,
                "adequate_stock": sum(1 for p in predictions if p['status'] == 'ADEQUATE'),
                "excess_stock": sum(1 for p in predictions if p['status'] == 'EXCESS'),
                "total_order_value": round(total_order_value, 2),
                "total_revenue_at_risk": round(total_revenue_at_risk, 2),
                "currency": "₹"
            },
            "predictions": predictions
        }
        
        print(f"Returning result with {total_products} products")
        return result
        
    except Exception as e:
        print(f"Error in bulk_predict: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
