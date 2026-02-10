# 📤 Data Upload & Per-Store Training Guide

## ✅ What's Implemented

### 1. **Data Upload System**
- Upload CSV or Excel files with store data
- Automatic data validation
- Saves to database and CSV
- Supports multiple stores in one file
- Appends to existing data (no duplicates)

### 2. **Per-Store Model Training**
- Each store gets its own AI model
- Trained on store-specific patterns
- Global model for all stores combined
- Automatic accuracy calculation

### 3. **Model Management**
- View all trained models
- See training status and accuracy
- Track model file sizes
- Last trained timestamp

## 🎯 How It Works

### Current vs New System

**Before (Current):**
- ❌ Single model for all stores
- ❌ No data upload feature
- ❌ Direct CSV reading only
- ❌ No per-store patterns

**After (New):**
- ✅ Per-store models + Global model
- ✅ Upload CSV/Excel via UI
- ✅ Database storage
- ✅ Store-specific patterns learned

## 📋 Features

### Backend Endpoints

1. **POST /upload_data**
   - Upload CSV or Excel file
   - Validates required columns
   - Saves to database
   - Returns upload summary

2. **POST /train_model**
   - Train model for specific store or all stores
   - Input: `{ "store_id": "S001" }` or `{ "store_id": "all" }`
   - Creates store-specific model files
   - Returns training results with accuracy

3. **GET /training_status**
   - Lists all trained models
   - Shows model info (size, date, accuracy)
   - Identifies store-specific vs global models

### Frontend Page

**📤 Upload Data** (New sidebar menu item)

**Features:**
- Drag & drop file upload
- File validation (CSV/Excel only)
- Upload progress indicator
- Training interface
- Model status dashboard
- Step-by-step instructions

## 🚀 Usage Guide

### Step 1: Prepare Your Data

Your Excel/CSV file should have these columns:

| Column | Description | Example |
|--------|-------------|---------|
| Date | Transaction date | 2024-01-15 |
| Store ID | Unique store identifier | S001 |
| Product ID | Unique product identifier | P0001 |
| Category | Product category | Groceries |
| Region | Store region | North |
| Inventory Level | Current stock | 100 |
| Units Sold | Units sold | 25 |
| Units Ordered | Units ordered | 50 |
| Demand Forecast | Forecasted demand | 30.5 |
| Price | Unit price | 50.00 |
| Discount | Discount percentage | 10 |
| Weather Condition | Weather | Sunny |
| Holiday/Promotion | 0 or 1 | 1 |
| Competitor Pricing | Competitor price | 55.00 |
| Seasonality | Season | Summer |

### Step 2: Upload Data

1. Go to **📤 Upload Data** in sidebar
2. Click upload area or drag file
3. Select your CSV/Excel file
4. Click **"Upload Data"** button
5. Wait for confirmation

**Result:**
- Data saved to database
- Shows stores found
- Shows record count
- Shows date range

### Step 3: Train Model

1. Select store from dropdown:
   - **"All Stores"** - Trains global model
   - **"Store S001"** - Trains only for S001
2. Click **"Start Training"**
3. Wait for training to complete (1-5 minutes)

**Result:**
- Model file created: `demand_model_S001.pkl`
- Encoder file created: `encoders_S001.pkl`
- Shows accuracy percentage
- Shows MAE (Mean Absolute Error)

### Step 4: Use Predictions

Once trained, the system automatically uses:
- **Store-specific model** if available for that store
- **Global model** as fallback

Go to:
- **Bulk Orders** - Get predictions for all products
- **Smart Prediction** - Get detailed single product prediction

## 🔧 Technical Details

### Model Files

**Per-Store Models:**
```
models/
├── demand_model_S001.pkl      # Store S001 model
├── encoders_S001.pkl           # Store S001 encoders
├── demand_model_S002.pkl      # Store S002 model
├── encoders_S002.pkl           # Store S002 encoders
└── ...
```

**Global Model:**
```
models/
├── demand_model.pkl            # Global model (all stores)
└── encoders.pkl                # Global encoders
```

### Training Process

1. **Data Loading**: Reads from uploaded CSV
2. **Store Filtering**: Filters data for specific store
3. **Data Cleaning**: Removes invalid records
4. **Encoding**: Label encodes categorical variables
5. **Feature Engineering**: Creates time-based features
6. **Train/Test Split**: 80/20 time-based split
7. **Model Training**: XGBoost with optimized parameters
8. **Evaluation**: Calculates MAE and accuracy
9. **Model Saving**: Saves model and encoders

### Per-Store Benefits

1. **Better Accuracy**: Each store has unique patterns
2. **Localized Predictions**: Considers store-specific factors
3. **Scalability**: Add new stores without retraining all
4. **Flexibility**: Update individual store models

## 📊 Example Workflow

### Scenario: New Store S005

1. **Upload Data**
   ```
   Upload: store_S005_data.xlsx
   Result: 500 records uploaded for Store S005
   ```

2. **Train Model**
   ```
   Select: Store S005
   Click: Start Training
   Result: Model trained with 92.5% accuracy
   ```

3. **Get Predictions**
   ```
   Go to: Bulk Orders
   Select: Store S005
   Result: Predictions using S005-specific model
   ```

## 🎯 Database Schema

```prisma
model UploadedData {
  id                  Int      @id @default(autoincrement())
  storeId             String
  productId           String
  date                DateTime
  category            String
  region              String
  inventoryLevel      Int
  unitsSold           Int
  price               Float
  discount            Float
  // ... other fields
  uploadedAt          DateTime @default(now())
  
  @@index([storeId])
  @@index([productId])
}

model TrainedModel {
  id          Int      @id @default(autoincrement())
  storeId     String   @unique
  modelPath   String
  accuracy    Float
  trainedAt   DateTime @default(now())
}
```

## 🔍 API Examples

### Upload Data
```bash
curl -X POST http://127.0.0.1:8000/upload_data \
  -F "file=@store_data.csv"
```

### Train Model for Specific Store
```bash
curl -X POST http://127.0.0.1:8000/train_model \
  -H "Content-Type: application/json" \
  -d '{"store_id": "S001"}'
```

### Train All Stores
```bash
curl -X POST http://127.0.0.1:8000/train_model \
  -H "Content-Type: application/json" \
  -d '{"store_id": "all"}'
```

### Get Training Status
```bash
curl http://127.0.0.1:8000/training_status
```

## ✅ Verification

To verify per-store training is working:

1. **Check Model Files**
   ```bash
   ls inventory_model/models/
   # Should see: demand_model_S001.pkl, demand_model_S002.pkl, etc.
   ```

2. **Check Training Status**
   - Go to Upload Data page
   - Scroll to "Trained Models Status"
   - Should see individual store models listed

3. **Test Predictions**
   - Go to Bulk Orders
   - Select a store with trained model
   - Predictions should use store-specific model

## 🚀 Next Steps

1. **Restart API Server**
   ```bash
   cd inventory_model
   uvicorn src.api:app --reload --port 8000
   ```

2. **Refresh Frontend**
   - Browser should auto-reload
   - Or refresh manually

3. **Test Upload**
   - Click "📤 Upload Data" in sidebar
   - Upload your CSV/Excel file
   - Train model for your store

## 📝 Notes

- **Minimum Data**: Need at least 100 records per store to train
- **Training Time**: 1-5 minutes depending on data size
- **File Size**: Supports files up to 100MB
- **Formats**: CSV, XLSX, XLS supported
- **Duplicates**: Automatically handled (keeps latest)

---

**Status**: ✅ Fully Implemented  
**Version**: 1.3.0  
**Last Updated**: February 2026
