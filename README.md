# Run Code

- python -m uvicorn inventory_model_secondary.src.api_production:app --reload --port 8002
- npm run dev


# 🎯 Retail AI Prediction - Demand Forecasting System

Production-ready ML system for inventory demand forecasting using Hybrid Prophet + XGBoost with advanced analytics.

## ✨ Features

### Core Predictions
- **Bulk Predictions**: Forecast demand for 1000+ products
- **Pagination & Infinite Scroll**: Fast loading with 50 items at a time
- **Previous Years Analysis**: Compare same month across all years
- **Last N Months Analysis**: Trend analysis for recent months
- **Confidence Scoring**: Know which predictions are reliable

### Analytics & Visualization
- **Expandable Details**: Click to see full analysis with charts
- **Statistics Cards**: Low/High/Average sales, units, trends
- **Bar Charts**: Visual representation of sales patterns
- **Confidence Analysis**: Understand why predictions are accurate/inaccurate
- **Export to CSV**: Download predictions with detailed breakdowns

### Dashboard
- Real-time analytics
- Category-wise distribution
- Year-wise trends
- Top items by sales/revenue
- Historical analysis

---

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Clone repository
git clone <your-repo-url>
cd <repo-name>

# Build and start
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

Access at: **http://localhost**

### Manual Setup

#### Backend
```bash
# Install dependencies
pip install -r requirements.txt

# Start backend
python -m uvicorn inventory_model_secondary.src.api_production:app --reload --port 8001
```

#### Frontend
```bash
cd client
npm install
npm run dev
```

Access at: **http://localhost:5173**

---

## 📦 Tech Stack

- **Frontend**: React 18 + Vite + Recharts
- **Backend**: FastAPI + Python 3.11
- **ML Models**: Prophet + XGBoost (Hybrid)
- **Database**: SQLite
- **Proxy**: Nginx
- **Deployment**: Docker + Docker Compose

---

## 🔌 API Endpoints

### Health & Stats
- `GET /health` - Health check
- `GET /stats` - Database statistics
- `GET /all_items` - All items with stats

### Predictions
- `POST /predict` - Get predictions for specific date
- `POST /predict-paginated` - Paginated predictions (50 per page)
- `POST /predict-previous-years` - Analyze same month across years
- `POST /predict-last-n-months` - Analyze last N months trend

### Data Management
- `POST /upload-data` - Upload sales data (CSV/Excel)
- `POST /retrain` - Retrain ML models with new data

---

## 📊 Model Performance

### Accuracy Metrics
- **Overall Accuracy**: 89.2%
- **High Confidence Items**: ~800 (80%)
- **Medium Confidence**: ~150 (15%)
- **Low Confidence**: ~50 (5%)

### Confidence Levels
| Score | Level | Meaning |
|-------|-------|---------|
| 80-100% | 🟢 High | Reliable predictions |
| 60-79% | 🟡 Medium | Use with caution |
| 50-59% | 🔴 Low | Investigate further |

### Confidence Formula
```
Confidence = 1 - (Standard Deviation / Average Sales)
Confidence = max(0.5, Confidence)  # Minimum 50%
```

---

## 🧪 Testing

### Test Prediction Accuracy
```bash
python test_accuracy.py
```

This will:
1. Test 100 random products
2. Compare predictions with actual sales
3. Calculate error rates
4. Show confidence analysis
5. Generate accuracy report

### Manual Testing
1. Open: http://localhost
2. Click "📈 Predictions"
3. Click "📅 Predict Previous Years"
4. Select date and generate
5. Click "View" on any product
6. Verify:
   - Statistics are correct
   - Charts display properly
   - Confidence analysis makes sense

---

## 📁 Project Structure

```
.
├── client/                          # Frontend (React)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── BulkPrediction/     # Main predictions page
│   │   │   ├── Dashboard/          # Analytics dashboard
│   │   │   └── ...
│   │   ├── components/             # Reusable components
│   │   ├── services/               # API services
│   │   └── utils/                  # Helper functions
│   └── package.json
│
├── inventory_model_secondary/       # Backend (Python)
│   ├── src/
│   │   ├── api_production.py       # Main API
│   │   ├── advanced_predictions.py # Advanced prediction methods
│   │   ├── hybrid_active.py        # Hybrid ML system
│   │   ├── database_manager.py     # Database operations
│   │   └── ...
│   └── models/                     # Trained ML models
│
├── converted_dataset/              # Database
│   └── inventory_sales.db          # SQLite database
│
├── docker-compose.yml              # Docker orchestration
├── Dockerfile.backend              # Backend container
├── Dockerfile.frontend             # Frontend container
├── nginx.conf                      # Nginx configuration
├── requirements.txt                # Python dependencies
├── README.md                       # This file
├── DEPLOYMENT_GUIDE.md             # Deployment instructions
└── MODEL_EVALUATION_REPORT.md      # Model analysis

```

---

## 🔧 Configuration

### Environment Variables

Create `.env` file (optional):
```env
# Backend
BACKEND_PORT=8001
DATABASE_PATH=converted_dataset/inventory_sales.db

# Frontend
VITE_API_URL=/api

# Nginx
NGINX_PORT=80
```

### Ports

| Service | Internal | External |
|---------|----------|----------|
| Frontend | 5173 | 80 (via nginx) |
| Backend | 8001 | 80/api (via nginx) |
| Nginx | - | 80 |

---

## 📈 Usage Guide

### 1. View Dashboard
- Open application
- See analytics overview
- View category distribution
- Check year-wise trends

### 2. Bulk Predictions
- Click "📈 Predictions"
- Page loads with 50 items
- Scroll down for more (infinite scroll)
- Click "📥 Export All Data" to download

### 3. Previous Years Analysis
- Click "📅 Predict Previous Years"
- Select target date (e.g., 2026-04-01)
- Click "Generate Prediction"
- View results with statistics
- Click "View" for detailed analysis
- See yearly breakdown and charts
- Export to CSV

### 4. Last N Months Analysis
- Click "📊 Predict Last N Months"
- Select number of months (1-24)
- Click "Generate Prediction"
- View results with trend analysis
- Click "View" for detailed analysis
- See monthly breakdown and charts
- Export to CSV

### 5. Upload New Data
- Click "📤 Upload Data"
- Select CSV/Excel file
- Upload and process
- Retrain models if needed

---

## 🐛 Troubleshooting

### Backend Not Starting
```bash
# Check logs
docker-compose logs backend

# Common fixes:
# - Ensure database exists: converted_dataset/inventory_sales.db
# - Ensure models exist: inventory_model_secondary/models/
# - Check port 8001 is available
```

### Frontend Not Loading
```bash
# Check logs
docker-compose logs frontend

# Common fixes:
# - Clear browser cache
# - Check API connection in browser console
# - Verify nginx is routing correctly
```

### Predictions Not Working
```bash
# Test API directly
curl http://localhost/api/health

# Check database
python check_db.py

# Retrain models
python retrain_with_new_data.py
```

---

## 🔄 Updating

### Pull Latest Changes
```bash
git pull origin main
docker-compose down
docker-compose up -d --build
```

### Update Models
```bash
python retrain_with_new_data.py
docker-compose restart backend
```

### Update Database
- Upload new data via UI
- Or replace database file and restart

---

## 📚 Documentation

- **DEPLOYMENT_GUIDE.md** - Detailed deployment instructions
- **MODEL_EVALUATION_REPORT.md** - Model accuracy analysis
- **API Documentation** - Available at http://localhost/api/docs

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

---

## 📄 License

[Your License Here]

---

## 🆘 Support

For issues or questions:
1. Check documentation
2. Review troubleshooting section
3. Check logs: `docker-compose logs`
4. Open an issue on GitHub

---

## ✅ Production Checklist

- [ ] Database populated with data
- [ ] ML models trained
- [ ] Docker images built
- [ ] Services running
- [ ] Health check passes
- [ ] Frontend loads
- [ ] Predictions work
- [ ] Accuracy tested (>85%)
- [ ] SSL/TLS configured (if public)
- [ ] Backups configured
- [ ] Monitoring set up

---

**Version**: 2.0.0  
**Last Updated**: 2026-04-02  
**Status**: Production Ready ✅
