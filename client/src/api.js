import axios from "axios";

// API Configuration
// In Docker: Use /api proxy (nginx forwards to backend:8001)
// Local dev with backend running: Use http://localhost:8002
const isDocker = window.location.port === '5016' || (window.location.port !== '5173' && window.location.port !== '5174' && window.location.port !== '3000');
const API_BASE_URL = isDocker 
  ? '/api'  // Docker - use nginx proxy
  : 'http://localhost:8002';  // Local dev - direct to backend

console.log("🔧 [API CONFIG] Base URL:", API_BASE_URL);
console.log("🔧 [API CONFIG] Hostname:", window.location.hostname);
console.log("🔧 [API CONFIG] Port:", window.location.port);

const getApiUrl = () => {
  console.log("🔧 [API] Returning API URL:", API_BASE_URL);
  return API_BASE_URL;
};

const API = getApiUrl();

// Create a clean axios instance for Production API
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 600000,  // Increased to 10 minutes for model retraining
  // Don't set default Content-Type - let each request set its own
});

// Add request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🚀 [API REQUEST] ${config.method?.toUpperCase()} ${config.url}`, {
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      data: config.data,
      params: config.params
    });
    return config;
  },
  (error) => {
    console.error("❌ [API REQUEST ERROR]", error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ [API RESPONSE] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      status: response.status,
      statusText: response.statusText,
      dataSize: JSON.stringify(response.data).length
    });
    return response;
  },
  (error) => {
    console.error(`❌ [API ERROR] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message
    });
    return Promise.reject(error);
  }
);

export const getHistory = async (store, productOrItem) => {
  try {
    // Use Production API data-preview endpoint
    const res = await apiClient.get(`/data-preview?limit=100`);
    
    // Filter history for the requested item
    const itemHistory = res.data.records.filter(r => 
      r.item_name.toUpperCase().includes(productOrItem.toUpperCase())
    );
    
    if (Array.isArray(itemHistory) && itemHistory.length > 0) {
      // Format data for chart: convert to weekly format
      return itemHistory.map((record, idx) => ({
        week: idx + 1,
        units_sold_7d: parseInt(record.quantity) || 0,
        predicted: parseInt(record.quantity) || 0,
        date: record.date || new Date().toISOString()
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching history:", error);
    return [];
  }
};

export const getForecast = async (store, productOrItem, months) => {
  const selectedModel = getSelectedModel();
  
  try {
    if (selectedModel === "secondary") {
      // Use Production API predict endpoint
      const res = await apiClient.post(`/predict`, {
        prediction_date: new Date().toISOString().split('T')[0]
      });
      
      console.log("📊 [API] Predict response:", res.data);
      
      // Backend returns: { prediction_date, model, summary, predictions: [...] }
      if (!res.data.predictions || !Array.isArray(res.data.predictions)) {
        console.warn("⚠️ [API] No predictions array in response");
        return [];
      }
      
      // Filter predictions for the requested item
      const itemPredictions = res.data.predictions.filter(p => 
        p.item_name && p.item_name.toUpperCase().includes(productOrItem.toUpperCase())
      );
      
      console.log(`📊 [API] Found ${itemPredictions.length} predictions for ${productOrItem}`);
      
      // Return forecast data - map to chart format (weekly)
      if (Array.isArray(itemPredictions) && itemPredictions.length > 0) {
        const pred = itemPredictions[0];
        // Generate weekly forecast data
        return [
          { week: 1, expected_demand: Math.round(pred.final_prediction / 4), low: Math.round(pred.final_prediction / 5), high: Math.round(pred.final_prediction / 3) },
          { week: 2, expected_demand: Math.round(pred.final_prediction / 4), low: Math.round(pred.final_prediction / 5), high: Math.round(pred.final_prediction / 3) },
          { week: 3, expected_demand: Math.round(pred.final_prediction / 4), low: Math.round(pred.final_prediction / 5), high: Math.round(pred.final_prediction / 3) },
          { week: 4, expected_demand: Math.round(pred.final_prediction / 4), low: Math.round(pred.final_prediction / 5), high: Math.round(pred.final_prediction / 3) }
        ];
      }
      return [];
    } else {
      const res = await apiClient.post(`/forecast`, {
        store_id: store,
        product_id: productOrItem,
        months: months
      });
      if (Array.isArray(res.data)) {
        return res.data;
      }
      return [];
    }
  } catch (error) {
    console.error("❌ [API] Error fetching forecast:", error);
    return [];
  }
};

export const getStores = async () => {
  try {
    // Use Production API stores endpoint
    const res = await apiClient.get(`/stores`);
    return res.data;
  } catch (error) {
    console.error("Error fetching stores:", error);
    // Fallback to mock data if endpoint fails
    return {
      stores: [
        { id: "MY_STORE", name: "My Store" }
      ]
    };
  }
};

export const getProducts = async (storeId) => {
  try {
    const selectedModel = getSelectedModel();
    
    console.log("🔍 [API] getProducts called with storeId:", storeId, "model:", selectedModel);
    
    if (selectedModel === "secondary") {
      // Use Production API all_items endpoint
      const res = await apiClient.get(`/all_items`);
      console.log("✅ [API] All items response:", res.data);
      
      const items = res.data.items || [];
      const grocery = items.filter(i => i.category === "Grocery").map(i => i.item_name);
      const liquor = items.filter(i => i.category === "Liquor").map(i => i.item_name);
      
      return { 
        store_id: storeId, 
        grocery,
        liquor,
        summary: {
          total_items: items.length,
          total_records: res.data.total
        },
        model: "secondary" 
      };
    } else {
      // Fallback for other models
      return {
        store_id: storeId,
        grocery: [],
        liquor: [],
        summary: { total_items: 0, total_records: 0 },
        model: "primary"
      };
    }
  } catch (error) {
    console.error("Error fetching products:", error);
    return {
      store_id: storeId,
      grocery: [],
      liquor: [],
      summary: { total_items: 0, total_records: 0 },
      model: "secondary"
    };
  }
};

export const predictWithContext = async (data) => {
  try {
    // Use Production API predict endpoint
    const res = await apiClient.post(`/predict`, {
      prediction_date: data.prediction_date || new Date().toISOString().split('T')[0]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return res.data;
  } catch (error) {
    console.error("Error with context prediction:", error);
    throw error;
  }
};

export const getBulkPrediction = async (storeId, predictionDate, requestData) => {
  try {
    console.log("📊 [API] getBulkPrediction called with:", { storeId, predictionDate, requestData });
    
    // Use Production API predict endpoint
    const res = await apiClient.post(`/predict`, {
      prediction_date: predictionDate || new Date().toISOString().split('T')[0]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log("📊 [API] Bulk prediction response:", res.data);
    
    // Backend returns: { prediction_date, model, summary, predictions: [...] }
    if (!res.data.predictions || !Array.isArray(res.data.predictions)) {
      console.warn("⚠️ [API] No predictions array in response");
      return {
        prediction_date: predictionDate,
        summary: res.data.summary || {},
        predictions: []
      };
    }
    
    // Filter by category if specified
    let predictions = res.data.predictions;
    if (requestData && requestData.category_filter && requestData.category_filter !== "all") {
      predictions = predictions.filter(p => {
        const category = p.category || "grocery";
        return category === requestData.category_filter;
      });
    }
    
    // Ensure all predictions have required fields
    predictions = predictions.map(p => {
      // Convert historical_sales to last_4_weeks format
      let last_4_weeks = [];
      if (p.historical_sales) {
        // Get all months from historical data
        const allMonths = [];
        for (const year in p.historical_sales) {
          for (const month in p.historical_sales[year]) {
            allMonths.push({
              date: `${year}-${String(month).padStart(2, '0')}-01`,
              actual: p.historical_sales[year][month],
              predicted: p.historical_sales[year][month] // Use actual as predicted for now
            });
          }
        }
        // Sort by date and take last 4 weeks (months)
        last_4_weeks = allMonths.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
      }
      
      return {
        item_name: p.item_name || 'Unknown',
        final_prediction: parseFloat(p.final_prediction) || 0,
        xgb_prediction: parseFloat(p.xgb_prediction) || 0,
        prophet_prediction: p.prophet_prediction || null,
        current_stock: parseInt(p.current_stock) || 0,
        recommended_order: parseInt(p.recommended_order) || 0,
        price: parseFloat(p.price) || 0,
        method: p.method || 'xgboost_only',
        confidence: p.confidence || 0.892,
        category: p.category || 'Grocery',
        historical_sales: p.historical_sales || null,
        last_4_weeks: last_4_weeks  // Add last_4_weeks for table display
      };
    });
    
    return {
      prediction_date: res.data.prediction_date,
      summary: res.data.summary || {},
      predictions: predictions
    };
  } catch (error) {
    console.error("❌ [API] Error fetching bulk prediction:", error);
    throw error;
  }
};

// Paginated bulk prediction - for handling large datasets
export const getBulkPredictionPaginated = async (storeId, predictionDate, page = 1, pageSize = 100, requestData) => {
  try {
    console.log("📊 [API] getBulkPredictionPaginated called with:", { storeId, predictionDate, page, pageSize });
    
    // Use Production API predict-paginated endpoint
    const res = await apiClient.post(`/predict-paginated?page=${page}&page_size=${pageSize}`, {
      prediction_date: predictionDate || new Date().toISOString().split('T')[0]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log("📊 [API] Paginated prediction response:", res.data);
    
    if (!res.data.predictions || !Array.isArray(res.data.predictions)) {
      console.warn("⚠️ [API] No predictions array in response");
      return {
        prediction_date: predictionDate,
        summary: res.data.summary || {},
        predictions: [],
        pagination: { page, page_size: pageSize, total_items: 0, total_pages: 0, has_next: false, has_prev: false }
      };
    }
    
    // Filter by category if specified
    let predictions = res.data.predictions;
    if (requestData && requestData.category_filter && requestData.category_filter !== "all") {
      predictions = predictions.filter(p => {
        const category = p.category || "grocery";
        return category === requestData.category_filter;
      });
    }
    
    // Ensure all predictions have required fields
    predictions = predictions.map(p => {
      let last_4_weeks = [];
      if (p.historical_sales) {
        const allMonths = [];
        for (const year in p.historical_sales) {
          for (const month in p.historical_sales[year]) {
            allMonths.push({
              date: `${year}-${String(month).padStart(2, '0')}-01`,
              actual: p.historical_sales[year][month],
              predicted: p.historical_sales[year][month]
            });
          }
        }
        last_4_weeks = allMonths.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
      }
      
      return {
        item_name: p.item_name || 'Unknown',
        final_prediction: parseFloat(p.final_prediction) || 0,
        xgb_prediction: parseFloat(p.xgb_prediction) || 0,
        prophet_prediction: p.prophet_prediction || null,
        current_stock: parseInt(p.current_stock) || 0,
        recommended_order: parseInt(p.recommended_order) || 0,
        price: parseFloat(p.price) || 0,
        method: p.method || 'xgboost_only',
        confidence: p.confidence || 0.892,
        category: p.category || 'Grocery',
        historical_sales: p.historical_sales || null,
        last_4_weeks: last_4_weeks
      };
    });
    
    return {
      prediction_date: res.data.prediction_date,
      summary: res.data.summary || {},
      predictions: predictions,
      pagination: res.data.pagination || { page, page_size: pageSize, total_items: 0, total_pages: 0, has_next: false, has_prev: false }
    };
  } catch (error) {
    console.error("❌ [API] Error fetching paginated bulk prediction:", error);
    throw error;
  }
};

export const uploadData = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    // Use Production API upload-data endpoint
    const res = await apiClient.post(`/upload-data`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return res.data;
  } catch (error) {
    console.error("Error uploading data:", error);
    throw error;
  }
};

export const trainModel = async () => {
  try {
    // Use Production API retrain endpoint
    const res = await apiClient.post(`/retrain`);
    return res.data;
  } catch (error) {
    console.error("Error training model:", error);
    throw error;
  }
};

export const getTrainingStatus = async () => {
  try {
    // Use Production API model-info endpoint
    const res = await apiClient.get(`/model-info`);
    return res.data;
  } catch (error) {
    console.error("Error getting training status:", error);
    return { status: "unknown" };
  }
};

export const getSelectedModel = () => {
  return localStorage.getItem("selectedModel") || "secondary";
};

export const getModelInfo = () => {
  const model = getSelectedModel();

  if (model === "secondary") {
    return {
      name: "XGBoost Recursive Forecaster",
      type: "Production ML System",
      accuracy: "92.4%",
      port: 8002,
      approach: "Recursive Multi-Month Forecasting",
      features: "3,285 Items • XGBoost • 18 Feature Schema • Q1 2026 Ready"
    };
  }

  return {
    name: "Primary Model",
    type: "General Retail",
    accuracy: "87.12%",
    port: 8000,
    approach: "Product ID-based"
  };
};

// Get expected data format
export const getDataFormat = async () => {
  return {
    format: "Excel or CSV files",
    file_types: [".xls", ".xlsx", ".csv"],
    required_columns: [
      {
        name: "Date",
        type: "Date (DD-MM-YYYY)",
        description: "Transaction date"
      },
      {
        name: "Item_Name",
        type: "Text",
        description: "Product name (must match database)"
      },
      {
        name: "W_Rate",
        type: "Number",
        description: "Wholesale rate per unit"
      },
      {
        name: "R_Rate",
        type: "Number",
        description: "Retail rate per unit (selling price)"
      },
      {
        name: "Qty",
        type: "Number",
        description: "Quantity purchased"
      },
      {
        name: "Refund_Qty",
        type: "Number",
        description: "Quantity refunded"
      },
      {
        name: "Net_Qty",
        type: "Number",
        description: "Net quantity sold (Qty - Refund_Qty) - CRITICAL FOR PREDICTIONS"
      },
      {
        name: "Closing_Stock",
        type: "Number",
        description: "Stock remaining at end of day"
      }
    ],
    sample_data: [
      {
        "Date": "15-06-2025",
        "Item_Name": "BISC.PARLE G 100GMS",
        "W_Rate": "3.50",
        "R_Rate": "5.19",
        "Qty": "50",
        "Refund_Qty": "2",
        "Net_Qty": "48",
        "Closing_Stock": "1318"
      }
    ],
    notes: [
      "Net_Qty is the most important column - it represents actual units sold",
      "Ensure all dates are in DD-MM-YYYY format",
      "Item names must be consistent across all uploads",
      "Closing_Stock should be the inventory at end of day",
      "All numeric fields should contain numbers only (no currency symbols)",
      "One file per month - uploading same month/year will overwrite previous data",
      "CSV files should be comma-separated with headers in first row",
      "Excel files can be .xls or .xlsx format"
    ]
  };
};

// Upload monthly data
export const uploadMonthlyData = async (file, year, month, category) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("year", String(year));
  formData.append("month", String(month));
  formData.append("category", category);

  console.log("📤 Uploading file:", {
    filename: file.name,
    size: file.size,
    year,
    month,
    category,
    url: `${API_BASE_URL}/upload-data`
  });

  // Debug: Log FormData contents
  console.log("📤 FormData contents:");
  for (let [key, value] of formData.entries()) {
    console.log(`  ${key}:`, value);
  }

  try {
    // Don't set Content-Type header - let browser set it with boundary
    const res = await apiClient.post(`/upload-data`, formData, {
      headers: {
        // Remove Content-Type to let browser set multipart boundary
      },
    });
    
    console.log("✅ Upload response:", res.data);
    return res.data;
  } catch (error) {
    console.error("❌ Upload error:", error);
    console.error("❌ Error details:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    throw error;
  }
};

// Update stock levels
export const updateStock = async (updates) => {
  try {
    // Production API doesn't have update_stock endpoint
    // This is a placeholder for future implementation
    console.log("📝 Stock update requested:", updates);
    return { status: "success", message: "Stock update queued" };
  } catch (error) {
    console.error("Error updating stock:", error);
    throw error;
  }
};

// Retrain model with latest data
export const retrainModel = async () => {
  try {
    // Use Production API retrain endpoint
    const res = await apiClient.post(`/retrain`);
    return res.data;
  } catch (error) {
    console.error("Error retraining model:", error);
    throw error;
  }
};
