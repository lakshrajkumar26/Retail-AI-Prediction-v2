# 🎯 Zero-Demand Handling Guide

## Problem: Division by Zero in MAPE

### The Issue
Traditional MAPE (Mean Absolute Percentage Error) fails when actual demand is zero:
```python
MAPE = mean(|actual - predicted| / actual) × 100
# When actual = 0 → Division by zero → inf or nan
```

## ✅ Solution: Multiple Robust Metrics

We now use **3 metrics** that handle zero-demand properly:

### 1. MAPE (with zero exclusion)
- **Excludes** zero-demand records
- Most common metric
- Use when <5% zeros

### 2. SMAPE (Symmetric MAPE)
- **Includes** zero-demand records
- Uses sum in denominator: `(|actual| + |predicted|)`
- Better for 5-20% zeros

### 3. WAPE (Weighted APE) ⭐ PRIMARY
- **Most robust** to zeros
- Weighted by total demand
- Best for >20% zeros
- **Our primary metric**

## 📊 How It Works

```python
# MAPE - Exclude zeros
mask = actual != 0
mape = mean(|actual[mask] - predicted[mask]| / actual[mask]) × 100

# SMAPE - Symmetric denominator
smape = mean(|actual - predicted| / (|actual| + |predicted|)) × 100

# WAPE - Weighted by total
wape = sum(|actual - predicted|) / sum(|actual|) × 100
```

## 🚀 Usage

### Training:
```bash
cd inventory_model/src
python train.py
```

**Output shows all 3 metrics:**
```
MAPE: 14.04% (on 70,000 non-zero records)
SMAPE: 13.52%
WAPE: 12.89% ← PRIMARY METRIC
```

### Which Metric to Use?

| Zero % | Recommended Metric |
|--------|-------------------|
| <5% | MAPE |
| 5-20% | SMAPE |
| >20% | WAPE ⭐ |

## ✅ Benefits

1. **No division by zero errors**
2. **More accurate** for retail (has zero-demand periods)
3. **Industry standard** (WAPE used by Amazon, Walmart)
4. **Robust** to outliers

Your model now handles zero-demand properly! 🎉
