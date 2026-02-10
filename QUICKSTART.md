# 🚀 Quick Start Guide

Get RetailAI up and running in 5 minutes!

## Prerequisites

- Python 3.8+ installed
- Node.js 16+ installed
- pip and npm available

## Step 1: Install Python Dependencies

```bash
cd inventory_model
pip install -r requirements.txt
```

## Step 2: Install Node Dependencies

```bash
cd client
npm install
```

## Step 3: Start the Application

### Option A: Automatic Start (Windows)

Double-click `start.bat` in the root directory. This will start both the API and frontend automatically.

### Option B: Manual Start

**Terminal 1 - Start Python API:**
```bash
cd inventory_model
uvicorn src.api:app --reload --port 8000
```

**Terminal 2 - Start React Frontend:**
```bash
cd client
npm run dev
```

## Step 4: Access the Application

- **Frontend**: http://localhost:5173
- **API Docs**: http://127.0.0.1:8000/docs

## 🎯 What You'll See

1. **Dashboard** - Overview of demand forecasting with charts
2. **Forecast** - Generate custom forecasts for any store/product
3. **Sidebar Navigation** - Easy access to all features

## 🔧 Troubleshooting

### Port Already in Use

If port 8000 or 5173 is already in use:

**For API (port 8000):**
```bash
uvicorn src.api:app --reload --port 8001
```
Then update `client/src/api.js` to use port 8001.

**For Frontend (port 5173):**
```bash
npm run dev -- --port 3000
```

### Module Not Found Errors

Make sure you're in the correct directory:
- Python commands should be run from `inventory_model/`
- npm commands should be run from `client/`

### CORS Errors

The API is configured to allow requests from `http://localhost:5173`. If you change the frontend port, update the CORS settings in `inventory_model/src/api.py`.

## 📊 Sample Data

The application comes with sample retail data in `inventory_model/data/retail_store_inventory.csv`. You can:

- View historical data for Store S001, Product P0001
- Generate forecasts for different time periods
- Explore the interactive charts

## 🎨 UI Features

- **Dark Mode** - Modern, professional design
- **Responsive** - Works on all screen sizes
- **Interactive Charts** - Hover for details
- **Real-time Updates** - Data refreshes automatically

## 🚀 Next Steps

1. Explore the Dashboard to see historical performance
2. Try the Forecast page to generate predictions
3. Check the API documentation at http://127.0.0.1:8000/docs
4. Customize the UI colors in `client/src/App.css`

## 💡 Tips

- Use the store/product dropdowns to switch between different items
- The model is already trained and ready to use
- All predictions are based on XGBoost ML model
- Charts are interactive - hover to see details

## 🆘 Need Help?

- Check the main README.md for detailed documentation
- Visit the API docs for endpoint details
- Open an issue on GitHub for bugs

---

Enjoy using RetailAI! 🎉
