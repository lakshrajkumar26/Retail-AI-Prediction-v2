# 📋 Bulk Order Prediction - Complete Guide

## Overview

The Bulk Order Prediction feature allows shopkeepers to get AI-powered order recommendations for **all products** in their store at once, saving time and ensuring optimal inventory levels.

## Features

### 🎯 What You Get

1. **Store-Wide Analysis**
   - Predictions for all products in one click
   - Prioritized by urgency (Critical → Low → Adequate → Excess)
   - Complete order recommendations

2. **Smart Recommendations**
   - Exact order quantities needed
   - Safety stock buffers included
   - Financial impact calculations
   - Confidence levels for each prediction

3. **Detailed Explanations**
   - Click "Explain" button for any product
   - See last 4 weeks performance
   - View demand range (low/average/high)
   - Monthly projections
   - Financial impact breakdown

4. **Summary Dashboard**
   - Total products analyzed
   - Critical stock count
   - Low stock count
   - Total order value
   - Revenue at risk

## How to Use

### Step 1: Access the Page

1. Open the application: http://localhost:5173
2. Click **"📋 Bulk Orders"** in the sidebar

### Step 2: Generate Predictions

1. **Select Store** from dropdown (e.g., S001)
2. **Choose Prediction Date** (defaults to today)
3. Click **"Generate Predictions"** button

### Step 3: Review Results

The page shows:

#### Summary Cards (Top)
- 📦 Total Products
- 🚨 Critical Stock (needs immediate attention)
- ⚠️ Low Stock (order soon)
- 💰 Total Order Value
- ⚡ Revenue at Risk

#### Products Table
Each row shows:
- **Status Badge**: Color-coded urgency
- **Product ID**: Unique identifier
- **Category**: Product category
- **Current Stock**: Units in inventory
- **Predicted Demand**: Expected sales
- **Order Quantity**: Recommended order
- **Order Value**: Cost of order
- **Confidence**: Model accuracy
- **Explain Button**: Click for details

### Step 4: View Detailed Explanation

Click **"Explain"** button on any product to see:

1. **Demand Estimates**
   - Low estimate (conservative)
   - Average estimate (most likely)
   - High estimate (optimistic)

2. **Monthly Projection**
   - 4-week forecast
   - Range of expected demand

3. **Financial Impact**
   - Expected revenue
   - Revenue at risk if stock runs out
   - Unit price

4. **Historical Performance**
   - Last 4 weeks data
   - Predicted vs Actual sales
   - Model accuracy percentage

## Status Indicators

### 🚨 CRITICAL (Red)
- **Meaning**: Stock is critically low
- **Action**: ORDER IMMEDIATELY
- **Calculation**: Current stock < Low estimate
- **Buffer**: 20% safety stock added

### ⚠️ LOW (Orange)
- **Meaning**: Stock is below predicted demand
- **Action**: ORDER SOON
- **Calculation**: Current stock < Predicted demand
- **Buffer**: 15% safety stock added

### ✅ ADEQUATE (Green)
- **Meaning**: Stock is sufficient
- **Action**: MONITOR
- **Calculation**: Current stock between predicted and high estimate
- **Buffer**: Minimal buffer

### 📦 EXCESS (Blue)
- **Meaning**: Stock is more than needed
- **Action**: NO ORDER NEEDED
- **Calculation**: Current stock > High estimate
- **Buffer**: None

## API Endpoint

### POST /bulk_predict

**Request:**
```json
{
  "store_id": "S001",
  "prediction_date": "2024-01-15"
}
```

**Response:**
```json
{
  "store_id": "S001",
  "prediction_date": "2024-01-15",
  "summary": {
    "total_products": 50,
    "critical_stock": 5,
    "low_stock": 10,
    "adequate_stock": 30,
    "excess_stock": 5,
    "total_order_value": 125000.50,
    "total_revenue_at_risk": 15000.00,
    "currency": "₹"
  },
  "predictions": [
    {
      "product_id": "P0001",
      "category": "Groceries",
      "current_stock": 50,
      "predicted_demand": 75.5,
      "low_estimate": 68.2,
      "high_estimate": 82.8,
      "recommended_order": 35,
      "shortage": 25.5,
      "status": "LOW",
      "priority": 2,
      "confidence": "92.5%",
      "price": 50.0,
      "potential_revenue": 3775.0,
      "lost_revenue_risk": 1275.0,
      "last_4_weeks": [...],
      "monthly_estimate": {
        "low": 272.8,
        "average": 302.0,
        "high": 331.2
      }
    }
  ]
}
```

## Testing

### Manual Test
1. Start API: `uvicorn src.api:app --reload --port 8000`
2. Start Frontend: `npm run dev`
3. Navigate to Bulk Orders page
4. Select store and generate predictions

### Automated Test
```bash
python test_bulk_prediction.py
```

This will:
- Test the API endpoint
- Display summary and top 5 products
- Show critical alerts
- Save full results to JSON file

## Use Cases

### 1. Weekly Stock Review
- Run every Monday morning
- Review all products at once
- Place orders for the week

### 2. Month-End Planning
- Generate predictions for next month
- Calculate total budget needed
- Plan procurement schedule

### 3. Emergency Stock Check
- Quick overview of critical items
- Immediate action items highlighted
- Prevent stockouts

### 4. Budget Planning
- See total order value needed
- Understand revenue at risk
- Make informed decisions

## Tips for Shopkeepers

1. **Check Daily**: Run predictions daily for critical items
2. **Use Explain**: Click explain for products you're unsure about
3. **Trust the Priority**: Critical items need immediate attention
4. **Consider Buffers**: Recommended orders include safety stock
5. **Review History**: Check last 4 weeks to verify accuracy
6. **Plan Ahead**: Use monthly estimates for long-term planning

## Export Options (Coming Soon)

- 📄 Export to CSV
- 🖨️ Print Report
- 📧 Email Summary
- 📱 Mobile Notifications

## Troubleshooting

### No Data Showing
- Check if API is running on port 8000
- Verify store ID exists in database
- Check browser console for errors

### Incorrect Predictions
- Ensure historical data is accurate
- Check if model is trained
- Verify date format is correct

### Slow Loading
- Large stores may take 10-20 seconds
- Wait for "Analyzing all products..." message
- Don't refresh during loading

## Technical Details

### How It Works

1. **Data Loading**: Reads historical sales data for the store
2. **Feature Engineering**: Creates time-based features (lags, rolling means)
3. **Prediction**: Uses trained XGBoost model for each product
4. **Recommendation**: Calculates order quantities with safety buffers
5. **Prioritization**: Sorts by urgency (Critical first)

### Model Confidence

- Based on last 30 days prediction accuracy
- Higher confidence = more reliable predictions
- Typical range: 85-95%

### Safety Buffers

- **Critical**: 20% buffer (high risk)
- **Low**: 15% buffer (medium risk)
- **Adequate**: 5% buffer (low risk)
- **Excess**: 0% buffer (no risk)

## Support

For issues or questions:
1. Check API logs: Terminal running uvicorn
2. Check browser console: F12 → Console
3. Run test script: `python test_bulk_prediction.py`
4. Review API docs: http://127.0.0.1:8000/docs

---

**Version**: 1.2.0  
**Last Updated**: February 2026  
**Status**: ✅ Production Ready
