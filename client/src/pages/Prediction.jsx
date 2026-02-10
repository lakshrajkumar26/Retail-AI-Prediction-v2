import { useState } from "react";
import { predictWithContext } from "../api";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import "./Prediction.css";

const Prediction = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const [formData, setFormData] = useState({
    store_id: "S001",
    product_id: "P0001",
    prediction_for_date: new Date().toISOString().split("T")[0],
    category: "Groceries",
    region: "North",
    weather_condition: "Sunny",
    seasonality: "Summer",
    inventory_level: 100,
    price: 50.0,
    discount: 10.0,
    competitor_pricing: 55.0,
    holiday_promotion: 0,
  });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === "number" ? parseFloat(value) : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await predictWithContext(formData);
      setResult(data);
    } catch (err) {
      setError("Failed to get prediction. Please check if the API is running.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "CRITICAL_LOW":
        return "#ef4444";
      case "LOW":
        return "#f59e0b";
      case "ADEQUATE":
        return "#10b981";
      case "EXCESS":
        return "#6366f1";
      default:
        return "#94a3b8";
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case "ORDER_IMMEDIATELY":
        return "#ef4444";
      case "ORDER_SOON":
        return "#f59e0b";
      case "MONITOR":
        return "#10b981";
      case "NO_ORDER_NEEDED":
        return "#6366f1";
      default:
        return "#94a3b8";
    }
  };

  return (
    <div className="prediction-page">
      <div className="page-header">
        <h1>Smart Stock Prediction</h1>
        <p className="subtitle">Get AI-powered stock recommendations for your store</p>
      </div>

      <div className="prediction-layout">
        {/* Input Form */}
        <div className="prediction-form-card">
          <h2>Enter Product Details</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-grid-2col">
              <div className="form-group">
                <label>Store ID</label>
                <input
                  type="text"
                  name="store_id"
                  value={formData.store_id}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label>Product ID</label>
                <input
                  type="text"
                  name="product_id"
                  value={formData.product_id}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label>Prediction Date</label>
                <input
                  type="date"
                  name="prediction_for_date"
                  value={formData.prediction_for_date}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="Groceries">Groceries</option>
                  <option value="Toys">Toys</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Clothing">Clothing</option>
                </select>
              </div>

              <div className="form-group">
                <label>Region</label>
                <select
                  name="region"
                  value={formData.region}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="North">North</option>
                  <option value="South">South</option>
                  <option value="East">East</option>
                  <option value="West">West</option>
                </select>
              </div>

              <div className="form-group">
                <label>Weather</label>
                <select
                  name="weather_condition"
                  value={formData.weather_condition}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="Sunny">Sunny</option>
                  <option value="Rainy">Rainy</option>
                  <option value="Cloudy">Cloudy</option>
                  <option value="Snowy">Snowy</option>
                </select>
              </div>

              <div className="form-group">
                <label>Season</label>
                <select
                  name="seasonality"
                  value={formData.seasonality}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="Summer">Summer</option>
                  <option value="Winter">Winter</option>
                  <option value="Autumn">Autumn</option>
                  <option value="Spring">Spring</option>
                  <option value="Festive">Festive</option>
                </select>
              </div>

              <div className="form-group">
                <label>Current Stock (units)</label>
                <input
                  type="number"
                  name="inventory_level"
                  value={formData.inventory_level}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label>Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label>Discount (%)</label>
                <input
                  type="number"
                  step="0.01"
                  name="discount"
                  value={formData.discount}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Competitor Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  name="competitor_pricing"
                  value={formData.competitor_pricing}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Holiday/Promotion</label>
                <select
                  name="holiday_promotion"
                  value={formData.holiday_promotion}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value={0}>No</option>
                  <option value={1}>Yes</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn-primary btn-large" disabled={loading}>
              {loading ? "Analyzing..." : "Get Prediction"}
            </button>
          </form>
        </div>

        {/* Results */}
        {loading && <LoadingSpinner message="Analyzing your inventory..." />}
        
        {error && <ErrorMessage message={error} onRetry={handleSubmit} />}

        {result && !loading && (
          <div className="prediction-results">
            {/* Summary Card */}
            <div className="result-card summary-card">
              <div className="card-header">
                <h2>📊 Stock Analysis Summary</h2>
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(result.summary.stock_status) }}
                >
                  {result.summary.stock_status.replace("_", " ")}
                </span>
              </div>
              
              <div className="summary-content">
                <div className="summary-message">{result.summary.message}</div>
                <div className="summary-explanation">{result.summary.simple_explanation}</div>
                
                <div className="summary-stats">
                  <div className="stat-item">
                    <span className="stat-label">Current Stock</span>
                    <span className="stat-value">{result.summary.current_stock} units</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Predicted Sales</span>
                    <span className="stat-value">{result.summary.predicted_sales_this_week} units</span>
                  </div>
                </div>

                <div
                  className="action-badge"
                  style={{ backgroundColor: getActionColor(result.summary.action_needed) }}
                >
                  {result.summary.action_needed.replace("_", " ")}
                </div>
              </div>
            </div>

            {/* Recommendation Card */}
            <div className="result-card">
              <h3>📦 Stock Recommendation</h3>
              <div className="recommendation-grid">
                <div className="rec-item">
                  <span className="rec-icon">🛒</span>
                  <div>
                    <div className="rec-label">Order Quantity</div>
                    <div className="rec-value">{result.stock_recommendation.recommended_order_quantity} units</div>
                  </div>
                </div>
                <div className="rec-item">
                  <span className="rec-icon">⚠️</span>
                  <div>
                    <div className="rec-label">Shortage</div>
                    <div className="rec-value">{result.stock_recommendation.shortage_units} units</div>
                  </div>
                </div>
                <div className="rec-item">
                  <span className="rec-icon">📈</span>
                  <div>
                    <div className="rec-label">Surplus</div>
                    <div className="rec-value">{result.stock_recommendation.surplus_units} units</div>
                  </div>
                </div>
                <div className="rec-item">
                  <span className="rec-icon">🛡️</span>
                  <div>
                    <div className="rec-label">Safety Stock</div>
                    <div className="rec-value">{result.stock_recommendation.safety_stock_needed} units</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Demand Estimates */}
            <div className="result-card">
              <h3>📈 Demand Estimates</h3>
              
              <div className="estimate-section">
                <h4>This Week</h4>
                <div className="estimate-range">
                  <div className="estimate-item">
                    <span className="estimate-label">Low</span>
                    <span className="estimate-value">{result.demand_estimates.this_week.low}</span>
                  </div>
                  <div className="estimate-item highlight">
                    <span className="estimate-label">Average</span>
                    <span className="estimate-value">{result.demand_estimates.this_week.average}</span>
                  </div>
                  <div className="estimate-item">
                    <span className="estimate-label">High</span>
                    <span className="estimate-value">{result.demand_estimates.this_week.high}</span>
                  </div>
                </div>
                <div className="confidence-text">
                  Confidence: {result.demand_estimates.this_week.confidence}
                </div>
              </div>

              <div className="estimate-section">
                <h4>This Month (4 Weeks)</h4>
                <div className="estimate-range">
                  <div className="estimate-item">
                    <span className="estimate-label">Low</span>
                    <span className="estimate-value">{result.demand_estimates.this_month.low}</span>
                  </div>
                  <div className="estimate-item highlight">
                    <span className="estimate-label">Average</span>
                    <span className="estimate-value">{result.demand_estimates.this_month.average}</span>
                  </div>
                  <div className="estimate-item">
                    <span className="estimate-label">High</span>
                    <span className="estimate-value">{result.demand_estimates.this_month.high}</span>
                  </div>
                </div>
                <div className="explanation-text">
                  {result.demand_estimates.this_month.explanation}
                </div>
              </div>
            </div>

            {/* Financial Impact */}
            <div className="result-card financial-card">
              <h3>💰 Financial Impact</h3>
              <div className="financial-grid">
                <div className="financial-item">
                  <span className="financial-icon">💵</span>
                  <div>
                    <div className="financial-label">Expected Revenue</div>
                    <div className="financial-value">
                      {result.financial_impact.currency}{result.financial_impact.expected_revenue}
                    </div>
                  </div>
                </div>
                <div className="financial-item danger">
                  <span className="financial-icon">⚠️</span>
                  <div>
                    <div className="financial-label">Potential Lost Revenue</div>
                    <div className="financial-value">
                      {result.financial_impact.currency}{result.financial_impact.potential_lost_revenue}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Prediction;
