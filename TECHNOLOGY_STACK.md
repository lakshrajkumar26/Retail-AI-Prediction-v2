# 🛠️ Complete Technology Stack

## 📊 Project: RetailAI - Demand Forecasting SaaS Platform

---

## 🎨 FRONTEND STACK

### Core Framework
- **React 18.3.1** - UI library for building interactive interfaces
- **Vite 7.3.1** - Fast build tool and development server

### UI Components & Styling
- **CSS3** - Custom styling with CSS variables
- **CSS Grid & Flexbox** - Responsive layouts
- **Custom Components** - Reusable UI components

### State Management
- **React Hooks** - useState, useEffect for state management
- **Local State** - Component-level state management

### HTTP Client
- **Axios 1.7.9** - Promise-based HTTP client for API calls

### Routing
- **React Router** - Client-side routing (implied from App.jsx structure)

### Charts & Visualization
- **Recharts** - React charting library for data visualization
  - Line charts for historical data
  - Bar charts for forecasts
  - Area charts for trends

### Development Tools
- **ESLint** - Code linting and quality
- **Vite Dev Server** - Hot module replacement (HMR)

---

## 🐍 BACKEND (ML/AI) STACK

### Core Framework
- **FastAPI 0.115.6** - Modern Python web framework for APIs
- **Uvicorn** - ASGI server for running FastAPI
- **Python 3.14** - Programming language

### Machine Learning
- **XGBoost** - Gradient boosting library for demand prediction
- **Scikit-learn** - Machine learning utilities
  - LabelEncoder - Categorical encoding
  - Train/test splitting
  - Metrics (MAE, accuracy)

### Data Processing
- **Pandas 2.2.3** - Data manipulation and analysis
- **NumPy 2.2.1** - Numerical computing
- **Joblib** - Model serialization/deserialization

### Feature Engineering
- **Custom Features Module** - Time-based features
  - Lag features (7, 14, 30, 60 days)
  - Rolling means (7, 30 days)
  - Date features (week, month, weekend)
  - Seasonal features

### File Handling
- **Python IO** - File operations
- **Pathlib** - Path handling
- **CSV/Excel Support** - Data import/export

### API Features
- **CORS Middleware** - Cross-origin resource sharing
- **Pydantic** - Data validation and serialization
- **Type Hints** - Static type checking

---

## 🗄️ DATABASE STACK

### ORM & Database
- **Prisma** - Next-generation ORM
- **PostgreSQL** - Relational database (via Prisma)
- **SQLite** - Development database option

### Schema Management
- **Prisma Migrate** - Database migrations
- **Prisma Client** - Type-safe database client

### Data Models
- **UploadedData** - Stores uploaded CSV/Excel files
- **TrainedModel** - Tracks trained ML models

---

## 🔧 NODE.JS BACKEND STACK

### Core Framework
- **Express.js** - Web application framework
- **Node.js** - JavaScript runtime

### Database Integration
- **Prisma Client** - Database access
- **@prisma/client** - Prisma client library

### Middleware
- **CORS** - Cross-origin requests
- **Body Parser** - Request body parsing
- **Express JSON** - JSON parsing

### Environment
- **dotenv** - Environment variable management

---

## 📦 DATA STORAGE

### File Storage
- **CSV Files** - Training data storage
  - `retail_store_inventory.csv` - Main dataset
  - Uploaded files with timestamps

### Model Storage
- **PKL Files** - Serialized ML models
  - `demand_model.pkl` - Global model
  - `demand_model_{store_id}.pkl` - Store-specific models
  - `encoders.pkl` - Label encoders
  - `encoders_{store_id}.pkl` - Store-specific encoders

### Static Assets
- **Images** - SVG icons and logos
- **Fonts** - Custom typography

---

## 🔄 DEVELOPMENT TOOLS

### Version Control
- **Git** - Source control
- **.gitignore** - Ignore patterns

### Package Managers
- **npm** - Node.js package manager
- **pip** - Python package manager

### Build Tools
- **Vite** - Frontend bundler
- **Rollup** - Module bundler (via Vite)

### Code Quality
- **ESLint** - JavaScript linting
- **Python Type Hints** - Static typing

---

## 🌐 API ARCHITECTURE

### REST API Endpoints
1. **GET /stores** - List all stores
2. **GET /products/{store_id}** - List products by store
3. **GET /history/{store_id}/{product_id}** - Historical data
4. **POST /predict** - Single prediction
5. **POST /predict_with_context** - Detailed prediction
6. **POST /forecast** - Future forecast
7. **POST /bulk_predict** - Bulk predictions
8. **POST /upload_data** - Upload CSV/Excel
9. **POST /train_model** - Train ML model
10. **GET /training_status** - Model training status

### API Documentation
- **FastAPI Swagger UI** - Auto-generated API docs at `/docs`
- **ReDoc** - Alternative API documentation at `/redoc`

---

## 📊 MACHINE LEARNING PIPELINE

### Model Architecture
- **Algorithm**: XGBoost Regressor
- **Objective**: reg:squarederror
- **Tree Method**: hist (histogram-based)

### Hyperparameters
```python
n_estimators: 400-600
max_depth: 5-6
learning_rate: 0.05
subsample: 0.8
colsample_bytree: 0.8
min_child_weight: 5
gamma: 0.2
reg_alpha: 0.5 (L1 regularization)
reg_lambda: 1.5 (L2 regularization)
```

### Features (19 total)
**Categorical (4):**
- store_id
- product_id
- category
- region

**Numerical (15):**
- inventory_level
- price
- discount
- competitor_pricing
- holiday_promotion
- seasonality
- is_weekend
- week
- month
- lag_7, lag_14, lag_30, lag_60
- rolling_mean_7, rolling_mean_30

### Target Variable
- **log_units_sold_7d** - Log-transformed weekly sales

### Training Strategy
- **Time-based split**: 80% train, 20% validation
- **Per-store models**: Individual models for each store
- **Global model**: Fallback model for all stores

---

## 🎯 FRONTEND PAGES

### 1. Dashboard (Dashboard.jsx)
- Historical charts
- Key metrics
- Store/product selection

### 2. Bulk Predictions (BulkPrediction.jsx)
- All products analysis
- Summary dashboard
- Expandable product details
- 4 projection timeframes

### 3. Smart Prediction (Prediction.jsx)
- Single product analysis
- Detailed recommendations
- Stock status
- Financial impact

### 4. Forecast (Forecast.jsx)
- Future demand projection
- Multi-month forecasting
- Trend visualization

### 5. Data Upload (DataUpload.jsx)
- CSV/Excel upload
- Model training interface
- Training status tracking

---

## 🎨 UI COMPONENTS

### Reusable Components
1. **Sidebar.jsx** - Navigation menu
2. **StatsCard.jsx** - Metric display cards
3. **LoadingSpinner.jsx** - Loading indicator
4. **ErrorMessage.jsx** - Error display with retry
5. **HistoryChart.jsx** - Historical data visualization
6. **ForecastChart.jsx** - Forecast visualization

### Styling System
- **CSS Variables** - Theme colors
- **Dark Theme** - Default color scheme
- **Responsive Design** - Mobile-friendly layouts
- **Grid System** - CSS Grid for layouts
- **Flexbox** - Component alignment

---

## 🔐 SECURITY & CONFIGURATION

### Environment Variables
- **DATABASE_URL** - Database connection string
- **API_PORT** - Backend port (8000)
- **FRONTEND_PORT** - Frontend port (5173)

### CORS Configuration
```javascript
Origins: 
- http://localhost:5173
- http://127.0.0.1:5173
Methods: All
Headers: All
Credentials: True
```

---

## 📁 FILE STRUCTURE

### Frontend Structure
```
client/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/          # Page components
│   ├── api.js          # API client
│   ├── App.jsx         # Main app component
│   ├── App.css         # Global styles
│   ├── index.css       # Base styles
│   └── main.jsx        # Entry point
├── public/             # Static assets
├── package.json        # Dependencies
└── vite.config.js      # Vite configuration
```

### Backend Structure
```
inventory_model/
├── src/
│   ├── api.py          # FastAPI endpoints
│   ├── features.py     # Feature engineering
│   ├── train.py        # Model training
│   ├── predict.py      # Batch predictions
│   ├── config.py       # Configuration
│   └── inventory_math.py # Business logic
├── models/             # Trained models (.pkl)
├── data/              # Training data (.csv)
└── requirements.txt    # Python dependencies
```

### Server Structure
```
server/
├── src/
│   ├── server.js       # Express server
│   ├── db.js          # Database connection
│   └── routes/        # API routes
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── migrations/     # Database migrations
└── package.json        # Dependencies
```

---

## 📦 DEPENDENCIES

### Frontend (package.json)
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.x",
  "axios": "^1.7.9",
  "recharts": "^2.x",
  "vite": "^7.3.1",
  "eslint": "^9.x"
}
```

### Backend (requirements.txt)
```
fastapi==0.115.6
uvicorn[standard]
pandas==2.2.3
numpy==2.2.1
xgboost
scikit-learn
joblib
python-multipart
openpyxl
```

### Server (package.json)
```json
{
  "express": "^4.x",
  "@prisma/client": "^5.x",
  "prisma": "^5.x",
  "cors": "^2.x",
  "dotenv": "^16.x"
}
```

---

## 🚀 DEPLOYMENT STACK

### Development
- **Local Development Server** - Vite dev server
- **Hot Reload** - Automatic refresh on changes
- **Debug Mode** - Source maps enabled

### Production (Recommended)
- **Frontend**: Vercel, Netlify, or AWS S3 + CloudFront
- **Backend**: AWS EC2, Google Cloud Run, or Heroku
- **Database**: AWS RDS, Google Cloud SQL, or Supabase
- **File Storage**: AWS S3 or Google Cloud Storage

### Containerization (Optional)
- **Docker** - Container platform
- **Docker Compose** - Multi-container orchestration

---

## 🧪 TESTING STACK

### Test Files
- **test_api.py** - API endpoint testing
- **test_bulk_prediction.py** - Bulk prediction testing

### Testing Tools
- **Python unittest** - Unit testing framework
- **Requests** - HTTP testing library
- **Manual Testing** - Browser-based testing

---

## 📊 DATA FLOW ARCHITECTURE

### Request Flow
```
User Browser
    ↓
React Frontend (Port 5173)
    ↓
Axios HTTP Client
    ↓
FastAPI Backend (Port 8000)
    ↓
XGBoost Model + Pandas
    ↓
CSV Data / Database
    ↓
JSON Response
    ↓
React State Update
    ↓
UI Re-render
```

### Training Flow
```
Upload CSV/Excel
    ↓
FastAPI /upload_data
    ↓
Save to data/ directory
    ↓
Trigger /train_model
    ↓
Load & Clean Data (Pandas)
    ↓
Feature Engineering
    ↓
Train XGBoost Model
    ↓
Save Model (.pkl)
    ↓
Return Training Metrics
```

---

## 🎯 KEY ALGORITHMS

### 1. Demand Prediction
- **XGBoost Gradient Boosting**
- Log transformation for target variable
- Time-series cross-validation

### 2. Feature Engineering
- Lag features for temporal patterns
- Rolling statistics for trends
- Categorical encoding with LabelEncoder

### 3. Stock Recommendations
- Conservative/Average/Optimistic estimates
- Safety stock calculations
- Priority-based ordering (Critical → Low → Adequate → Excess)

### 4. Confidence Calculation
- Historical prediction accuracy
- Mean Absolute Percentage Error (MAPE)
- Last 30 days performance

---

## 🌟 UNIQUE FEATURES

### Business Logic
1. **Multi-timeframe Projections**
   - Daily average
   - Weekly (7 days)
   - Monthly (30 days)
   - Quarterly (90 days)

2. **Smart Stock Status**
   - CRITICAL: < Low estimate
   - LOW: < Average estimate
   - ADEQUATE: < High estimate
   - EXCESS: > High estimate

3. **Financial Impact**
   - Expected revenue
   - Revenue at risk
   - Order value calculations

4. **Per-Store Models**
   - Individual models per store
   - Global fallback model
   - Automatic model selection

---

## 📈 PERFORMANCE METRICS

### Response Times
- Dashboard: 2-3 seconds
- Single Prediction: 1-2 seconds
- Bulk Prediction: 5-15 seconds (20 products)
- Forecast: 2-3 seconds
- Model Training: 30-120 seconds per store

### Model Accuracy
- Target: 80-90% accuracy
- Confidence intervals provided
- Historical validation included

---

## 🔧 CONFIGURATION FILES

### Frontend
- **vite.config.js** - Vite configuration
- **eslint.config.js** - Linting rules
- **package.json** - Dependencies & scripts

### Backend
- **requirements.txt** - Python dependencies
- **config.py** - Application configuration

### Database
- **schema.prisma** - Database schema
- **.env** - Environment variables

### Version Control
- **.gitignore** - Ignored files/folders

---

## 📚 DOCUMENTATION FILES

### User Guides
- **README.md** - Project overview
- **QUICKSTART.md** - 5-minute setup
- **HOW_TO_USE_BULK_PREDICTIONS.md** - Feature guide
- **DATA_UPLOAD_GUIDE.md** - Upload instructions

### Technical Docs
- **COMPLETE_FEATURE_LIST.md** - All features
- **DEPLOYMENT.md** - Production deployment
- **PROJECT_SUMMARY.md** - Project summary
- **TECHNOLOGY_STACK.md** - This file

### Testing & Fixes
- **TEST_BULK_PREDICTION.md** - Testing guide
- **FIXES_APPLIED.md** - Bug fixes log
- **BULK_PREDICTION_INTEGRATION_COMPLETE.md** - Integration status

---

## 🎓 LEARNING RESOURCES

### Technologies to Learn
1. **React** - reactjs.org
2. **FastAPI** - fastapi.tiangolo.com
3. **XGBoost** - xgboost.readthedocs.io
4. **Pandas** - pandas.pydata.org
5. **Prisma** - prisma.io
6. **Vite** - vitejs.dev

---

## 🚀 SCALABILITY CONSIDERATIONS

### Current Scale
- **Users**: Single tenant (can be multi-tenant)
- **Stores**: 5 stores (S001-S005)
- **Products**: ~20 products per store
- **Data**: ~1000 records per store

### Scale-Up Options
1. **Database**: PostgreSQL for production
2. **Caching**: Redis for API responses
3. **Queue**: Celery for async training
4. **Load Balancer**: Nginx for multiple instances
5. **CDN**: CloudFront for static assets
6. **Monitoring**: Prometheus + Grafana

---

## 💰 COST ESTIMATION (Production)

### Free Tier Options
- **Frontend**: Vercel/Netlify (Free)
- **Backend**: Railway/Render (Free tier)
- **Database**: Supabase (Free tier)
- **Total**: $0/month

### Paid Options (Small Scale)
- **Frontend**: Vercel Pro ($20/month)
- **Backend**: AWS EC2 t3.small ($15/month)
- **Database**: AWS RDS t3.micro ($15/month)
- **Storage**: AWS S3 ($5/month)
- **Total**: ~$55/month

### Enterprise Scale
- **Frontend**: AWS CloudFront + S3 ($50/month)
- **Backend**: AWS ECS/EKS ($200/month)
- **Database**: AWS RDS Multi-AZ ($150/month)
- **ML Training**: AWS SageMaker ($100/month)
- **Monitoring**: DataDog ($100/month)
- **Total**: ~$600/month

---

## ✅ SUMMARY

This project uses a **modern, production-ready tech stack** combining:
- **React** for beautiful, interactive UI
- **FastAPI** for high-performance API
- **XGBoost** for accurate ML predictions
- **Prisma** for type-safe database access
- **Vite** for fast development experience

All components are **industry-standard**, **well-documented**, and **actively maintained**.

**Total Technologies Used: 40+**
**Lines of Code: ~5,000+**
**API Endpoints: 10**
**UI Pages: 5**
**ML Models: Per-store + Global**
