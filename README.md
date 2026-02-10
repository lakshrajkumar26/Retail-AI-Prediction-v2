# 🎯 RetailAI - Demand Forecasting SaaS Platform

A modern, AI-powered retail demand forecasting platform built with React, FastAPI, and XGBoost.

## 🚀 Features

- **Real-time Demand Forecasting** - ML-powered predictions for inventory optimization
- **Interactive Dashboard** - Beautiful, modern UI with real-time charts
- **Multi-store Support** - Manage multiple stores and products
- **Historical Analysis** - Compare actual vs predicted sales
- **Future Forecasting** - Project demand for upcoming weeks/months
- **SaaS-Ready Architecture** - Built for scalability and multi-tenancy

## 📁 Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   └── api.js         # API client
├── inventory_model/       # Python ML backend
│   ├── src/
│   │   ├── api.py         # FastAPI endpoints
│   │   ├── features.py    # Feature engineering
│   │   ├── train.py       # Model training
│   │   └── predict.py     # Batch predictions
│   ├── models/            # Trained models
│   └── data/              # Training data
└── server/                # Node.js backend (optional)
```

## 🛠️ Setup Instructions

### 1. Python Backend (ML API)

```bash
cd inventory_model

# Install dependencies
pip install -r requirements.txt

# Train the model (if not already trained)
python src/train.py

# Start the API server
uvicorn src.api:app --reload --port 8000
```

The API will be available at `http://127.0.0.1:8000`

### 2. React Frontend

```bash
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## 🎨 UI Features

- **Dark Mode Design** - Modern, eye-friendly interface
- **Responsive Layout** - Works on desktop, tablet, and mobile
- **Interactive Charts** - Powered by Recharts
- **Real-time Updates** - Dynamic data loading
- **Smooth Animations** - Polished user experience

## 📊 API Endpoints

### Core Endpoints

- `GET /stores` - List all stores
- `GET /products/{store_id}` - Get products for a store
- `GET /history/{store_id}/{product_id}` - Historical data
- `POST /forecast` - Generate demand forecast
- `POST /predict` - Single prediction
- `POST /predict_with_context` - Prediction with full context

## 🔧 Configuration

### Backend Configuration

Edit `inventory_model/src/config.py`:

```python
DATA_PATH = "data/sales.csv"
MODEL_PATH = "models/demand_model.pkl"
LEAD_TIME_DAYS = 5
Z_SCORE = 1.96
```

### Frontend Configuration

Edit `client/src/api.js` to change API URL:

```javascript
const API = "http://127.0.0.1:8000";
```

## 🚀 Deployment

### Backend Deployment

```bash
# Using Docker
docker build -t retailai-api ./inventory_model
docker run -p 8000:8000 retailai-api

# Or using Gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker src.api:app
```

### Frontend Deployment

```bash
cd client
npm run build

# Deploy the 'dist' folder to your hosting service
# (Vercel, Netlify, AWS S3, etc.)
```

## 📈 Model Performance

- **Algorithm**: XGBoost Regressor
- **Features**: 19 engineered features including lags, rolling means, seasonality
- **Target**: Weekly demand (log-transformed)
- **Validation**: Time-based split (80/20)

## 🎯 SaaS Roadmap

- [ ] User authentication & authorization
- [ ] Multi-tenant database architecture
- [ ] Subscription & billing integration
- [ ] Custom model training per tenant
- [ ] Email alerts & notifications
- [ ] Advanced analytics & reporting
- [ ] API rate limiting
- [ ] Webhook integrations

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this project for commercial purposes.

## 🆘 Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ using React, FastAPI, and XGBoost
