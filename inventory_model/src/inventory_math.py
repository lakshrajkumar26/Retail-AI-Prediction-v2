import numpy as np

def calculate_inventory(df,
                        lead_time_weeks=1,
                        service_level=1.65):
    """
    lead_time_weeks: supplier delivery time
    service_level:
        1.28 → 90%
        1.65 → 95%
        2.05 → 98%
    """

    # -----------------------------
    # Average weekly demand
    # -----------------------------
    df['avg_weekly_demand'] = (
        df.groupby(['store_id','product_id'])['predicted_weekly_demand']
          .transform('mean')
    )

    # -----------------------------
    # Demand variability
    # -----------------------------
    df['demand_std'] = (
        df.groupby(['store_id','product_id'])['predicted_weekly_demand']
          .transform('std')
          .fillna(0)
    )

    # -----------------------------
    # Safety stock
    # -----------------------------
    df['safety_stock'] = (
        service_level *
        df['demand_std'] *
        np.sqrt(lead_time_weeks)
    )

    # -----------------------------
    # Reorder point (ROP)
    # -----------------------------
    df['reorder_point'] = (
        (df['avg_weekly_demand'] * lead_time_weeks) +
        df['safety_stock']
    )

    # -----------------------------
    # Order quantity
    # -----------------------------
    df['order_quantity'] = np.maximum(
        df['reorder_point'] - df['inventory_level'],
        0
    ).round()

    # -----------------------------
    # Stock-out risk flag
    # -----------------------------
    df['stockout_risk'] = np.where(
        df['inventory_level'] < df['reorder_point'],
        1,
        0
    )

    return df
