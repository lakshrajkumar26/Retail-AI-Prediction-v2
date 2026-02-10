# 📊 Model Accuracy Guide

## Understanding Your Model's Performance

### 🎯 Quick Answer: How Accurate Is My Model?

Run this command to find out:
```bash
python test_model_accuracy.py
```

Or manually:
```bash
cd inventory_model/src
python evaluate_model.py
```

---

## 📈 What Gets Evaluated

### 1. Data Split Strategy

**Your model uses TIME-BASED SPLITTING:**
```python
split_date = df['date'].quantile(0.80)  # 80% for training, 20% for validation
```

**Why time-based?**
- ✅ Realistic: Tests on future data (like real predictions)
- ✅ No data leakage: Past doesn't see future
- ✅ Proper evaluation: Mimics production use

**Example:**
```
Training Data:   Jan 1 - Oct 15 (80% of dates)
Validation Data: Oct 16 - Dec 31 (20% of dates)
```

### 2. Accuracy Metrics Explained

#### A. Overall Accuracy (%)
```
Accuracy = (1 - MAPE) × 100
```

**What it means:**
- **90%+** = 🌟 Excellent! Predictions are highly reliable
- **80-90%** = ✅ Good! Predictions are reliable
- **70-80%** = ⚠️ Moderate. Acceptable but could improve
- **<70%** = ❌ Poor. Needs retraining

**Example:**
```
If accuracy is 85%, it means:
- On average, predictions are within 15% of actual values
- Out of 100 units predicted, expect ±15 units error
```

#### B. MAE (Mean Absolute Error)
```
MAE = Average of |Predicted - Actual|
```

**What it means:**
- Average error in units
- Lower is better
- Easy to interpret

**Example:**
```
MAE = 5.2 units
→ On average, predictions are off by 5.2 units
→ If actual is 50 units, prediction might be 45-55 units
```

#### C. RMSE (Root Mean Squared Error)
```
RMSE = √(Average of (Predicted - Actual)²)
```

**What it means:**
- Penalizes large errors more
- Always ≥ MAE
- Lower is better

**Example:**
```
MAE = 5.2, RMSE = 7.8
→ Some predictions have larger errors
→ Model is generally good but has occasional big misses
```

#### D. R² Score (R-Squared)
```
R² = 1 - (Sum of Squared Errors / Total Variance)
```

**What it means:**
- How well model explains variance
- Range: -∞ to 1.0
- **1.0** = Perfect predictions
- **0.8+** = Very good
- **0.5-0.8** = Moderate
- **<0.5** = Poor

**Example:**
```
R² = 0.85
→ Model explains 85% of variance in demand
→ 15% is due to random factors or missing features
```

#### E. MAPE (Mean Absolute Percentage Error)
```
MAPE = Average of |Predicted - Actual| / Actual × 100
```

**What it means:**
- Error as percentage
- Industry standard metric
- Lower is better

**Example:**
```
MAPE = 15%
→ Predictions are off by 15% on average
→ Accuracy = 100% - 15% = 85%
```

---

## 🔍 What Your Training Shows

### Training Output Example:

```
============================================================
📊 MODEL EVALUATION RESULTS
============================================================

📈 TRAINING SET PERFORMANCE:
   Records: 800
   MAE (Mean Absolute Error): 4.23 units
   RMSE (Root Mean Squared Error): 6.15 units
   R² Score: 0.8756
   MAPE (Mean Absolute % Error): 12.34%
   ✅ ACCURACY: 87.66%

📉 VALIDATION SET PERFORMANCE:
   Records: 200
   MAE (Mean Absolute Error): 5.67 units
   RMSE (Root Mean Squared Error): 8.21 units
   R² Score: 0.8423
   MAPE (Mean Absolute % Error): 14.52%
   ✅ ACCURACY: 85.48%

🎯 DATA SPLIT:
   Split Date: 2023-10-15
   Training: 800 records (80.0%)
   Validation: 200 records (20.0%)

📊 PREDICTION RANGE:
   Training - Min: 2.45, Max: 156.78, Mean: 45.23
   Validation - Min: 3.12, Max: 142.56, Mean: 43.89

🎓 MODEL INTERPRETATION:
   ✅ GOOD! Model is reliable (85.5%)
```

### What This Tells You:

1. **Training Accuracy (87.66%) > Validation Accuracy (85.48%)**
   - ✅ Normal! Model performs slightly worse on unseen data
   - ✅ Small gap (2%) = Good generalization
   - ⚠️ Large gap (>10%) = Overfitting

2. **Validation Accuracy = 85.48%**
   - ✅ This is your TRUE model accuracy
   - ✅ Use this for production expectations
   - ✅ 85% is GOOD for retail demand forecasting

3. **R² Score = 0.8423**
   - ✅ Model explains 84% of demand variance
   - ✅ Strong predictive power

---

## 📊 Comprehensive Evaluation

### Run Full Evaluation:

```bash
cd inventory_model/src
python evaluate_model.py
```

### What You'll See:

#### 1. Overall Performance
```
📊 OVERALL MODEL PERFORMANCE
   Total Records: 1,000
   MAE: 5.67 units
   RMSE: 8.21 units
   R² Score: 0.8423
   MAPE: 14.52%
   ✅ ACCURACY: 85.48%
```

#### 2. Per-Store Accuracy
```
📍 ACCURACY BY STORE

✅ Store S001:
   Records: 200
   Accuracy: 87.23%
   MAE: 4.89 units
   R² Score: 0.8654

✅ Store S002:
   Records: 200
   Accuracy: 84.56%
   MAE: 6.12 units
   R² Score: 0.8312
```

#### 3. Per-Category Accuracy
```
📦 ACCURACY BY CATEGORY

🌟 Category Electronics:
   Records: 300
   Accuracy: 91.23%
   MAE: 3.45 units

✅ Category Clothing:
   Records: 250
   Accuracy: 82.45%
   MAE: 7.23 units
```

#### 4. Time-Based Accuracy
```
📅 ACCURACY OVER TIME

📆 2023-08:
   Records: 150
   Accuracy: 86.34%
   MAE: 5.23 units

📆 2023-09:
   Records: 160
   Accuracy: 84.12%
   MAE: 6.01 units
```

#### 5. Error Analysis
```
🔍 ERROR ANALYSIS

📊 ERROR DISTRIBUTION:
   Mean Error: 0.23 units (slight over-prediction)
   Median Error: 0.12 units
   Std Dev: 8.45 units

🎯 PREDICTIONS WITHIN TOLERANCE:
   Within ±10%: 456 (45.6%)
   Within ±20%: 723 (72.3%)
   Within ±30%: 891 (89.1%)
```

---

## 🎓 Interpreting Results

### Scenario 1: High Accuracy (90%+)
```
✅ ACCURACY: 92.34%
```

**What it means:**
- 🌟 Excellent model!
- Predictions are highly reliable
- Safe for production use
- Model captures demand patterns well

**Action:** Use confidently for ordering decisions

### Scenario 2: Good Accuracy (80-90%)
```
✅ ACCURACY: 85.48%
```

**What it means:**
- ✅ Good model!
- Predictions are reliable
- Suitable for production
- Minor improvements possible

**Action:** Use for production, monitor performance

### Scenario 3: Moderate Accuracy (70-80%)
```
⚠️ ACCURACY: 75.23%
```

**What it means:**
- ⚠️ Acceptable but not great
- Use with caution
- Consider improvements

**Action:**
- Add more training data
- Check for data quality issues
- Consider additional features

### Scenario 4: Poor Accuracy (<70%)
```
❌ ACCURACY: 65.12%
```

**What it means:**
- ❌ Unreliable predictions
- Not recommended for production
- Needs significant improvement

**Action:**
- Collect more data (need 100+ records per store)
- Check data quality
- Verify feature engineering
- Consider different model

---

## 🔧 Improving Accuracy

### 1. More Data
```python
# Current: 1,000 records
# Target: 2,000+ records

# More data = Better patterns = Higher accuracy
```

### 2. Better Data Quality
```python
# Remove outliers
df = df[df['units_sold'] >= 0]  # No negative sales
df = df[df['price'] > 0]        # Valid prices
df = df.dropna()                # No missing values
```

### 3. More Features
```python
# Current features: 19
# Potential additions:
# - Competitor promotions
# - Local events
# - Economic indicators
# - Social media trends
```

### 4. Per-Store Models
```python
# Instead of one global model
# Train separate model for each store
# Better captures store-specific patterns
```

### 5. Hyperparameter Tuning
```python
# Current: Fixed hyperparameters
# Improvement: Grid search or Bayesian optimization
from sklearn.model_selection import GridSearchCV
```

---

## 📁 Generated Files

### 1. model_metrics.pkl
```python
# Saved during training
# Contains: train/validation accuracy, MAE, R², etc.
metrics = joblib.load("models/model_metrics.pkl")
print(metrics['valid_accuracy'])  # 85.48
```

### 2. evaluation_results.pkl
```python
# Saved during evaluation
# Contains: overall, per-store, per-category metrics
results = joblib.load("models/evaluation_results.pkl")
print(results['overall_accuracy'])  # 85.48
```

### 3. prediction_evaluation.csv
```csv
date,store_id,product_id,actual,predicted,error,abs_error,pct_error
2023-10-16,S001,P0001,45.0,47.3,2.3,2.3,5.1
2023-10-16,S001,P0002,32.0,29.8,-2.2,2.2,-6.9
```

---

## 🎯 Quick Reference

### Run Training (with accuracy):
```bash
cd inventory_model/src
python train.py
```

### Run Predictions (with accuracy):
```bash
cd inventory_model/src
python predict.py
```

### Run Full Evaluation:
```bash
cd inventory_model/src
python evaluate_model.py
```

### Quick Test:
```bash
python test_model_accuracy.py
```

---

## 📊 Expected Accuracy Ranges

### By Industry:
- **Retail (Fast-moving)**: 70-85%
- **Retail (Stable)**: 80-90%
- **E-commerce**: 75-85%
- **Manufacturing**: 85-95%

### Your Model:
- **Target**: 80%+ (Good for retail)
- **Excellent**: 90%+
- **Acceptable**: 70-80%
- **Needs Work**: <70%

---

## ✅ Summary

**Your model accuracy is evaluated through:**
1. ✅ Time-based train/validation split (80/20)
2. ✅ Multiple metrics (Accuracy, MAE, RMSE, R², MAPE)
3. ✅ Per-store, per-category, per-time analysis
4. ✅ Error distribution and tolerance analysis

**To check your model:**
```bash
python test_model_accuracy.py
```

**Expected result:**
```
✅ OVERALL MODEL ACCURACY: 85.48%
✅ GOOD MODEL! Predictions are reliable
```

**This means:**
- Your predictions are accurate within ±15% on average
- Safe to use for production ordering decisions
- Model is well-trained and generalizes well

🎉 **You're ready to make data-driven inventory decisions!**
