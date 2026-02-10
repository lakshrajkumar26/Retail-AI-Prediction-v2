import pandas as pd
import numpy as np

def create_features(df):
    """
    Creates time-based and lag features for demand forecasting.
    """
    df = df.sort_values(['store_id', 'product_id', 'date']).copy()
    
    # =========================
    # Weekly aggregation
    # =========================
    df['units_sold_7d'] = (
        df.groupby(['store_id', 'product_id'])['units_sold']
          .transform(lambda x: x.rolling(7, min_periods=1).sum())
    )
    
    # =========================
    # Log transform target
    # =========================
    df['log_units_sold_7d'] = np.log1p(df['units_sold_7d'])
    
    # =========================
    # Date features
    # =========================
    df['week'] = df['date'].dt.isocalendar().week.astype(int)
    df['month'] = df['date'].dt.month
    df['is_weekend'] = df['date'].dt.weekday.isin([5, 6]).astype(int)
    
    # =========================
    # Lag features
    # =========================
    df['lag_7'] = (
        df.groupby(['store_id', 'product_id'])['units_sold_7d']
          .shift(7)
          .fillna(0)
    )
    
    df['lag_14'] = (
        df.groupby(['store_id', 'product_id'])['units_sold_7d']
          .shift(14)
          .fillna(0)
    )
    
    df['lag_30'] = (
        df.groupby(['store_id', 'product_id'])['units_sold_7d']
          .shift(30)
          .fillna(0)
    )
    
    df['lag_60'] = (
        df.groupby(['store_id', 'product_id'])['units_sold_7d']
          .shift(60)
          .fillna(0)
    )
    
    # =========================
    # Rolling mean features
    # =========================
    df['rolling_mean_7'] = (
        df.groupby(['store_id', 'product_id'])['units_sold_7d']
          .transform(lambda x: x.rolling(7, min_periods=1).mean())
    )
    
    df['rolling_mean_30'] = (
        df.groupby(['store_id', 'product_id'])['units_sold_7d']
          .transform(lambda x: x.rolling(30, min_periods=1).mean())
    )
    
    return df
