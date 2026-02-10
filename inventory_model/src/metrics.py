"""
Advanced Metrics Module with Zero-Demand Handling
Implements MAPE, SMAPE, WAPE, and other robust metrics
"""

import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


def calculate_mape(y_true, y_pred, exclude_zeros=True):
    """
    Calculate Mean Absolute Percentage Error (MAPE)
    
    Args:
        y_true: Actual values
        y_pred: Predicted values
        exclude_zeros: If True, exclude zero-demand rows from calculation
    
    Returns:
        MAPE value (percentage)
    """
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    
    if exclude_zeros:
        # Exclude rows where actual demand is zero
        mask = y_true != 0
        y_true = y_true[mask]
        y_pred = y_pred[mask]
    
    if len(y_true) == 0:
        return 0.0
    
    # Avoid division by zero
    with np.errstate(divide='ignore', invalid='ignore'):
        mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100
        # Handle inf/nan
        if np.isnan(mape) or np.isinf(mape):
            return 0.0
    
    return mape


def calculate_smape(y_true, y_pred):
    """
    Calculate Symmetric Mean Absolute Percentage Error (SMAPE)
    Better for zero-demand handling - uses sum of actual and predicted in denominator
    
    Args:
        y_true: Actual values
        y_pred: Predicted values
    
    Returns:
        SMAPE value (percentage)
    """
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    
    # SMAPE formula: 100 * mean(|actual - predicted| / (|actual| + |predicted|))
    denominator = np.abs(y_true) + np.abs(y_pred)
    
    # Avoid division by zero
    mask = denominator != 0
    if mask.sum() == 0:
        return 0.0
    
    smape = 100 * np.mean(np.abs(y_true[mask] - y_pred[mask]) / denominator[mask])
    
    return smape


def calculate_wape(y_true, y_pred):
    """
    Calculate Weighted Absolute Percentage Error (WAPE)
    Also known as MAD/Mean ratio - robust to zero demand
    
    Args:
        y_true: Actual values
        y_pred: Predicted values
    
    Returns:
        WAPE value (percentage)
    """
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    
    # WAPE formula: 100 * sum(|actual - predicted|) / sum(|actual|)
    total_actual = np.sum(np.abs(y_true))
    
    if total_actual == 0:
        return 0.0
    
    wape = 100 * np.sum(np.abs(y_true - y_pred)) / total_actual
    
    return wape


def calculate_mase(y_true, y_pred, y_train):
    """
    Calculate Mean Absolute Scaled Error (MASE)
    Scale-independent metric, good for comparing across different series
    
    Args:
        y_true: Actual values (test set)
        y_pred: Predicted values (test set)
        y_train: Training set values (for scaling)
    
    Returns:
        MASE value
    """
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    y_train = np.array(y_train)
    
    # Calculate MAE of predictions
    mae_pred = np.mean(np.abs(y_true - y_pred))
    
    # Calculate MAE of naive forecast (using training data)
    if len(y_train) < 2:
        return mae_pred
    
    mae_naive = np.mean(np.abs(np.diff(y_train)))
    
    if mae_naive == 0:
        return 0.0
    
    mase = mae_pred / mae_naive
    
    return mase


def calculate_all_metrics(y_true, y_pred, y_train=None, exclude_zeros=True):
    """
    Calculate all metrics at once
    
    Args:
        y_true: Actual values
        y_pred: Predicted values
        y_train: Training set values (optional, for MASE)
        exclude_zeros: If True, exclude zero-demand rows from MAPE
    
    Returns:
        Dictionary with all metrics
    """
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    
    # Basic metrics
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    
    # R² score (handle edge cases)
    try:
        r2 = r2_score(y_true, y_pred)
    except:
        r2 = 0.0
    
    # Percentage-based metrics
    mape = calculate_mape(y_true, y_pred, exclude_zeros=exclude_zeros)
    smape = calculate_smape(y_true, y_pred)
    wape = calculate_wape(y_true, y_pred)
    
    # MASE (if training data provided)
    mase = None
    if y_train is not None:
        mase = calculate_mase(y_true, y_pred, y_train)
    
    # Calculate accuracies
    mape_accuracy = max(0, min(100, 100 - mape))
    smape_accuracy = max(0, min(100, 100 - smape))
    wape_accuracy = max(0, min(100, 100 - wape))
    
    # Count zero-demand records
    zero_count = np.sum(y_true == 0)
    zero_pct = (zero_count / len(y_true)) * 100 if len(y_true) > 0 else 0
    
    # Count records used in MAPE (non-zero)
    mape_records = len(y_true) - zero_count if exclude_zeros else len(y_true)
    
    metrics = {
        # Basic metrics
        'mae': mae,
        'rmse': rmse,
        'r2': r2,
        
        # Percentage metrics
        'mape': mape,
        'smape': smape,
        'wape': wape,
        'mase': mase,
        
        # Accuracies
        'mape_accuracy': mape_accuracy,
        'smape_accuracy': smape_accuracy,
        'wape_accuracy': wape_accuracy,
        
        # Data info
        'total_records': len(y_true),
        'zero_records': zero_count,
        'zero_percentage': zero_pct,
        'mape_records': mape_records,
        
        # Statistics
        'mean_actual': np.mean(y_true),
        'mean_predicted': np.mean(y_pred),
        'std_actual': np.std(y_true),
        'std_predicted': np.std(y_pred),
    }
    
    return metrics


def print_metrics(metrics, title="METRICS"):
    """
    Pretty print metrics
    
    Args:
        metrics: Dictionary from calculate_all_metrics
        title: Title to display
    """
    print(f"\n{'='*70}")
    print(f"📊 {title}")
    print(f"{'='*70}")
    
    print(f"\n📈 BASIC METRICS:")
    print(f"   Total Records: {metrics['total_records']:,}")
    print(f"   Zero-Demand Records: {metrics['zero_records']:,} ({metrics['zero_percentage']:.1f}%)")
    print(f"   MAE (Mean Absolute Error): {metrics['mae']:.2f} units")
    print(f"   RMSE (Root Mean Squared Error): {metrics['rmse']:.2f} units")
    print(f"   R² Score: {metrics['r2']:.4f}")
    
    print(f"\n📊 PERCENTAGE-BASED METRICS:")
    print(f"   MAPE (Mean Absolute % Error): {metrics['mape']:.2f}%")
    print(f"      → Calculated on {metrics['mape_records']:,} non-zero records")
    print(f"      → Accuracy: {metrics['mape_accuracy']:.2f}%")
    
    print(f"\n   SMAPE (Symmetric MAPE): {metrics['smape']:.2f}%")
    print(f"      → Better for zero-demand handling")
    print(f"      → Accuracy: {metrics['smape_accuracy']:.2f}%")
    
    print(f"\n   WAPE (Weighted APE): {metrics['wape']:.2f}%")
    print(f"      → Most robust to zeros")
    print(f"      → Accuracy: {metrics['wape_accuracy']:.2f}%")
    
    if metrics['mase'] is not None:
        print(f"\n   MASE (Mean Absolute Scaled Error): {metrics['mase']:.4f}")
        print(f"      → <1.0 = Better than naive forecast")
        print(f"      → >1.0 = Worse than naive forecast")
    
    print(f"\n📊 PREDICTION STATISTICS:")
    print(f"   Mean Actual: {metrics['mean_actual']:.2f} units")
    print(f"   Mean Predicted: {metrics['mean_predicted']:.2f} units")
    print(f"   Std Actual: {metrics['std_actual']:.2f} units")
    print(f"   Std Predicted: {metrics['std_predicted']:.2f} units")
    
    # Determine best metric to use
    print(f"\n🎯 RECOMMENDED ACCURACY METRIC:")
    if metrics['zero_percentage'] > 20:
        print(f"   ⚠️  High zero-demand ({metrics['zero_percentage']:.1f}%)")
        print(f"   ✅ Use WAPE: {metrics['wape_accuracy']:.2f}% accuracy")
        print(f"   ✅ Use SMAPE: {metrics['smape_accuracy']:.2f}% accuracy")
    elif metrics['zero_percentage'] > 5:
        print(f"   ⚠️  Moderate zero-demand ({metrics['zero_percentage']:.1f}%)")
        print(f"   ✅ Use SMAPE: {metrics['smape_accuracy']:.2f}% accuracy")
        print(f"   ✅ Use WAPE: {metrics['wape_accuracy']:.2f}% accuracy")
    else:
        print(f"   ✅ Low zero-demand ({metrics['zero_percentage']:.1f}%)")
        print(f"   ✅ Use MAPE: {metrics['mape_accuracy']:.2f}% accuracy")
    
    print(f"\n{'='*70}")


def compare_metrics(train_metrics, valid_metrics):
    """
    Compare training vs validation metrics
    
    Args:
        train_metrics: Training set metrics
        valid_metrics: Validation set metrics
    """
    print(f"\n{'='*70}")
    print(f"📊 TRAINING vs VALIDATION COMPARISON")
    print(f"{'='*70}")
    
    print(f"\n📈 ACCURACY COMPARISON:")
    print(f"   {'Metric':<20} {'Training':<15} {'Validation':<15} {'Difference':<15}")
    print(f"   {'-'*65}")
    
    # MAPE
    mape_diff = valid_metrics['mape_accuracy'] - train_metrics['mape_accuracy']
    print(f"   {'MAPE Accuracy':<20} {train_metrics['mape_accuracy']:>6.2f}%        {valid_metrics['mape_accuracy']:>6.2f}%        {mape_diff:>+6.2f}%")
    
    # SMAPE
    smape_diff = valid_metrics['smape_accuracy'] - train_metrics['smape_accuracy']
    print(f"   {'SMAPE Accuracy':<20} {train_metrics['smape_accuracy']:>6.2f}%        {valid_metrics['smape_accuracy']:>6.2f}%        {smape_diff:>+6.2f}%")
    
    # WAPE
    wape_diff = valid_metrics['wape_accuracy'] - train_metrics['wape_accuracy']
    print(f"   {'WAPE Accuracy':<20} {train_metrics['wape_accuracy']:>6.2f}%        {valid_metrics['wape_accuracy']:>6.2f}%        {wape_diff:>+6.2f}%")
    
    print(f"\n📊 ERROR COMPARISON:")
    print(f"   {'Metric':<20} {'Training':<15} {'Validation':<15} {'Difference':<15}")
    print(f"   {'-'*65}")
    
    # MAE
    mae_diff = valid_metrics['mae'] - train_metrics['mae']
    print(f"   {'MAE':<20} {train_metrics['mae']:>10.2f}      {valid_metrics['mae']:>10.2f}      {mae_diff:>+10.2f}")
    
    # RMSE
    rmse_diff = valid_metrics['rmse'] - train_metrics['rmse']
    print(f"   {'RMSE':<20} {train_metrics['rmse']:>10.2f}      {valid_metrics['rmse']:>10.2f}      {rmse_diff:>+10.2f}")
    
    # R²
    r2_diff = valid_metrics['r2'] - train_metrics['r2']
    print(f"   {'R² Score':<20} {train_metrics['r2']:>10.4f}      {valid_metrics['r2']:>10.4f}      {r2_diff:>+10.4f}")
    
    print(f"\n🎓 INTERPRETATION:")
    avg_diff = (abs(mape_diff) + abs(smape_diff) + abs(wape_diff)) / 3
    
    if avg_diff < 2:
        print(f"   ✅ EXCELLENT! Model generalizes very well (avg diff: {avg_diff:.2f}%)")
    elif avg_diff < 5:
        print(f"   ✅ GOOD! Model generalizes well (avg diff: {avg_diff:.2f}%)")
    elif avg_diff < 10:
        print(f"   ⚠️  MODERATE. Some overfitting detected (avg diff: {avg_diff:.2f}%)")
    else:
        print(f"   ❌ POOR. Significant overfitting (avg diff: {avg_diff:.2f}%)")
    
    print(f"\n{'='*70}")
