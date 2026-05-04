/**
 * Prediction Service - Handles all API calls for predictions
 */

// Use /api proxy when running behind nginx (Docker), direct localhost for local dev
// Docker: nginx runs on 5016, proxies /api to backend:8001
// Local: frontend on 5173/5174/3000, backend on 8002
const isDocker = window.location.port === '5016' || window.location.hostname === 'localhost';
const API_BASE_URL = isDocker && window.location.port !== '5173' && window.location.port !== '5174' && window.location.port !== '3000'
  ? '/api'
  : 'http://localhost:8002';

console.log('[PREDICTION SERVICE] API Base URL:', API_BASE_URL);

export const predictionService = {
  /**
   * Get bulk predictions for a specific date
   */
  async getBulkPredictions(predictionDate) {
    try {
      const url = `${API_BASE_URL}/predict`;
      const body = { prediction_date: predictionDate };
      
      console.log('[PREDICTION SERVICE] Calling:', url);
      console.log('[PREDICTION SERVICE] Body:', JSON.stringify(body));
      console.log('[PREDICTION SERVICE] Full URL:', window.location.origin + url);
      console.log('[PREDICTION SERVICE] API_BASE_URL:', API_BASE_URL);
      console.log('[PREDICTION SERVICE] Window location:', {
        origin: window.location.origin,
        hostname: window.location.hostname,
        port: window.location.port,
        protocol: window.location.protocol,
      });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
      });

      console.log('[PREDICTION SERVICE] Response status:', response.status);
      console.log('[PREDICTION SERVICE] Response headers:', {
        'content-type': response.headers.get('content-type'),
        'x-proxy-by': response.headers.get('x-proxy-by'),
        'x-backend-server': response.headers.get('x-backend-server'),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PREDICTION SERVICE] Error response body:', errorText);
        console.error('[PREDICTION SERVICE] Error status:', response.status);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[PREDICTION SERVICE] Success - predictions count:', data.predictions?.length);
      return data;
    } catch (error) {
      console.error('[PREDICTION SERVICE] Error:', error);
      throw error;
    }
  },

  /**
   * Get aggregate future predictions for bulk ordering
   */
  async getFutureAggregatePredictions(predictionDate, nMonths, items = null) {
    try {
      const url = `${API_BASE_URL}/predict-future-aggregate`;
      const body = { 
        prediction_date: predictionDate,
        n_months: nMonths,
        items: items
      };
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[PREDICTION SERVICE] Future Aggregate Error:', error);
      throw error;
    }
  },

  /**
   * Get all items from database
   */
  async getAllItems() {
    try {
      const response = await fetch(`${API_BASE_URL}/all_items`);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[PREDICTION SERVICE] Error:', error);
      throw error;
    }
  },

  /**
   * Export predictions to CSV with historical data and cost calculations
   */
  exportToCSV(predictions, filename = 'predictions.csv') {
    const headers = [
      'Item Name',
      'Category',
      'Purchase Price (₹)',
      'Sales Price (₹)',
      'Current Stock',
      'Predicted Demand (Units)',
      'Total Expected Revenue (₹)',
      'Total Expected Profit (₹)',
      'Profit Margin (%)',
      'Trend',
      'Growth Rate',
      'Recommended Order',
      'Confidence',
      'Prev Year Total Sales',
      'Current Year Total Sales',
      'Month 1 Name',
      'Month 1 Sales',
      'Month 2 Name',
      'Month 2 Sales',
      'Month 3 Name',
      'Month 3 Sales',
    ];

    let totalNetRevenue = 0;
    let totalExpectedProfit = 0;
    let totalPredictedDemand = 0;

    const rows = predictions.map(p => {
      // Get last 3 months data
      const last3Months = p.last_3_months || [];
      
      const salesPrice = p.price || 0;
      const purchasePrice = p.purchase_price || 0;
      const predictedDemand = Math.round(p.final_prediction || 0);
      
      const expectedRevenue = salesPrice * predictedDemand;
      const expectedCost = purchasePrice * predictedDemand;
      const expectedProfit = expectedRevenue - expectedCost;
      const profitMargin = purchasePrice > 0 ? ((salesPrice - purchasePrice) / purchasePrice) * 100 : 0;
      
      totalNetRevenue += expectedRevenue;
      totalExpectedProfit += expectedProfit;
      totalPredictedDemand += predictedDemand;
      
      return [
        p.item_name,
        p.category,
        purchasePrice.toFixed(2),
        salesPrice.toFixed(2),
        p.current_stock || 0,
        predictedDemand,
        expectedRevenue.toFixed(2),
        expectedProfit.toFixed(2),
        `${profitMargin.toFixed(2)}%`,
        p.trend || 'stable',
        `${((p.growth_rate || 0) * 100).toFixed(1)}%`,
        Math.round(p.recommended_order || 0),
        `${((p.confidence || 0) * 100).toFixed(1)}%`,
        p.year_prev_total || 0,
        p.year_curr_total || 0,
        last3Months[0]?.month_name || 'N/A',
        last3Months[0]?.sales || 0,
        last3Months[1]?.month_name || 'N/A',
        last3Months[1]?.sales || 0,
        last3Months[2]?.month_name || 'N/A',
        last3Months[2]?.sales || 0,
      ];
    });

    // Add summary row
    const summaryRow = [
      'TOTAL',
      '',
      '',
      '',
      '',
      totalPredictedDemand,
      totalNetRevenue.toFixed(2),
      totalExpectedProfit.toFixed(2),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      summaryRow.map(cell => `"${cell}"`).join(','),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
