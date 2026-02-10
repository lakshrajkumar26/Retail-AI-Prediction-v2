# 📋 How to Use Bulk Order Predictions

## Quick Start Guide

### Step 1: Make Sure Servers Are Running

**Backend API:**
```bash
cd inventory_model/src
python -m uvicorn api:app --reload --port 8000
```
You should see: `Uvicorn running on http://127.0.0.1:8000`

**Frontend:**
```bash
cd client
npm run dev
```
You should see: `Local: http://localhost:5173/`

### Step 2: Open the App
Open your browser and go to: **http://localhost:5173**

### Step 3: Navigate to Bulk Predictions
Click on **"📋 Bulk Predictions"** in the left sidebar

### Step 4: Generate Predictions

You'll see a form at the top with:
1. **Select Store** dropdown - Choose S001, S002, S003, S004, or S005
2. **Prediction Date** - Choose the date you want predictions for
3. **Generate Predictions** button - **CLICK THIS!**

### Step 5: View Results

After clicking "Generate Predictions", you'll see:

#### Summary Cards (Top Section):
- 📦 **Total Products** - How many products analyzed
- 🚨 **Critical Stock** - Products that need immediate ordering
- ⚠️ **Low Stock** - Products that need ordering soon
- 💰 **Total Order Value** - How much money you need to order
- ⚡ **Revenue at Risk** - Money you'll lose if you don't order

#### Product Table (Bottom Section):
Each row shows a product with:
- **Status** - Color-coded badge (Red=Critical, Orange=Low, Green=Adequate, Blue=Excess)
- **Product ID** - The product code
- **Category** - Product category
- **Current Stock** - How many units you have now
- **Predicted Demand** - How many units you'll sell
- **Order Quantity** - How many units to order
- **Order Value** - Cost to order this product
- **Confidence** - How accurate the prediction is
- **Explain Button** - Click to see detailed breakdown

### Step 6: View Detailed Analysis

Click the **"Explain"** button next to any product to see:

#### 📊 Demand Projections Breakdown
Four timeframes with Low/Average/High estimates:
- **Daily Average** - Sales per day
- **Weekly (7 Days)** - Sales for next week
- **Monthly (30 Days)** - Sales for next month
- **Quarterly (90 Days)** - Sales for next 3 months

#### 💰 Financial Impact
- **Expected Revenue** - Money you'll make from sales
- **Revenue at Risk** - Money you'll lose if out of stock
- **Unit Price** - Price per unit

#### 📊 Last 4 Weeks Performance
Table showing:
- Date
- Predicted sales
- Actual sales
- Accuracy percentage

## 🎯 Understanding the Results

### Status Colors:
- 🚨 **CRITICAL (Red)** - Order immediately! Stock is critically low
- ⚠️ **LOW (Orange)** - Order soon. Stock is running low
- ✅ **ADEQUATE (Green)** - Stock is good. Monitor it
- 📦 **EXCESS (Blue)** - Too much stock. No order needed

### Order Recommendations:
The system calculates how many units to order based on:
- Current stock level
- Predicted demand
- Historical accuracy
- Safety buffer (extra units for uncertainty)

### Confidence Levels:
- **90%+** - Very reliable prediction
- **80-90%** - Good prediction
- **70-80%** - Moderate prediction
- **<70%** - Less reliable (new product or irregular sales)

## 💡 Tips

1. **Start with today's date** to see current recommendations
2. **Try different stores** to compare inventory needs
3. **Check Critical items first** - they need immediate attention
4. **Use the Explain button** to understand why the system recommends certain quantities
5. **Look at historical accuracy** to trust the predictions
6. **Consider the Low/High estimates** for conservative/optimistic planning

## 🔄 Refresh Data

To get updated predictions:
1. Change the store or date
2. Click "Generate Predictions" again
3. The system will recalculate everything

## ❓ Troubleshooting

**Problem:** Page shows zeros
**Solution:** Click "Generate Predictions" button!

**Problem:** Error message appears
**Solution:** Check if backend API is running on port 8000

**Problem:** No stores in dropdown
**Solution:** Backend API might be down. Check console for errors.

**Problem:** Predictions seem wrong
**Solution:** Check if you have enough historical data (need at least 100 records per store)

## 🎉 You're Ready!

Now you can:
- ✅ See which products need ordering
- ✅ Know exactly how much to order
- ✅ Understand the financial impact
- ✅ Make data-driven inventory decisions
- ✅ Avoid stockouts and lost revenue

**Happy predicting! 🚀**
