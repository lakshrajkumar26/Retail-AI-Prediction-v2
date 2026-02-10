import { useState, useEffect } from "react";
import { getBulkPrediction, getStores } from "../api";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import "./BulkPrediction.css";

const BulkPrediction = () => {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState("S001");
  const [predictionDate, setPredictionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [expandedProduct, setExpandedProduct] = useState(null);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const data = await getStores();
      setStores(data.stores || []);
    } catch (error) {
      console.error("Failed to load stores:", error);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setExpandedProduct(null);
    try {
      const data = await getBulkPrediction(selectedStore, predictionDate);
      setResult(data);
    } catch (err) {
      setError("Failed to generate predictions. Please check if the API is running.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "CRITICAL":
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

  const getStatusIcon = (status) => {
    switch (status) {
      case "CRITICAL":
        return "🚨";
      case "LOW":
        return "⚠️";
      case "ADEQUATE":
        return "✅";
      case "EXCESS":
        return "📦";
      default:
        return "ℹ️";
    }
  };

  const toggleExpand = (productId) => {
    setExpandedProduct(expandedProduct === productId ? null : productId);
  };

  return (
    <div className="bulk-prediction-page">
      <div className="page-header">
        <h1>📋 Bulk Order Predictions</h1>
        <p className="subtitle">
          Get order recommendations for all products in your store
        </p>
      </div>

      {/* Input Form */}
      <div className="bulk-form-card">
        <div className="form-row">
          <div className="form-group">
            <label>Select Store</label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="form-input"
            >
              {stores.map((store) => (
                <option key={store} value={store}>
                  Store {store}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Prediction Date</label>
            <input
              type="date"
              value={predictionDate}
              onChange={(e) => setPredictionDate(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>&nbsp;</label>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? "Generating..." : "Generate Predictions"}
            </button>
          </div>
        </div>
      </div>

      {loading && <LoadingSpinner message="Analyzing all products..." />}

      {error && <ErrorMessage message={error} onRetry={handleGenerate} />}

      {result && !loading && (
        <>
          {/* Summary Cards */}
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-icon">📦</div>
              <div className="summary-content">
                <div className="summary-label">Total Products</div>
                <div className="summary-value">{result.summary.total_products}</div>
              </div>
            </div>

            <div className="summary-card critical">
              <div className="summary-icon">🚨</div>
              <div className="summary-content">
                <div className="summary-label">Critical Stock</div>
                <div className="summary-value">{result.summary.critical_stock}</div>
              </div>
            </div>

            <div className="summary-card warning">
              <div className="summary-icon">⚠️</div>
              <div className="summary-content">
                <div className="summary-label">Low Stock</div>
                <div className="summary-value">{result.summary.low_stock}</div>
              </div>
            </div>

            <div className="summary-card success">
              <div className="summary-icon">💰</div>
              <div className="summary-content">
                <div className="summary-label">Total Order Value</div>
                <div className="summary-value">
                  {result.summary.currency}
                  {result.summary.total_order_value.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="summary-card danger">
              <div className="summary-icon">⚡</div>
              <div className="summary-content">
                <div className="summary-label">Revenue at Risk</div>
                <div className="summary-value">
                  {result.summary.currency}
                  {result.summary.total_revenue_at_risk.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Products Table */}
          <div className="products-table-card">
            <div className="table-header">
              <h2>📊 Product Order Recommendations</h2>
              <div className="table-actions">
                <button className="btn-secondary">Export to CSV</button>
                <button className="btn-secondary">Print Report</button>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Product ID</th>
                    <th>Category</th>
                    <th>Current Stock</th>
                    <th>Predicted Demand</th>
                    <th>Order Quantity</th>
                    <th>Order Value</th>
                    <th>Confidence</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {result.predictions.map((product) => (
                    <>
                      <tr
                        key={product.product_id}
                        className={`product-row ${
                          expandedProduct === product.product_id ? "expanded" : ""
                        }`}
                      >
                        <td>
                          <span
                            className="status-badge"
                            style={{
                              backgroundColor: getStatusColor(product.status),
                            }}
                          >
                            {getStatusIcon(product.status)} {product.status}
                          </span>
                        </td>
                        <td className="product-id">{product.product_id}</td>
                        <td>{product.category}</td>
                        <td>{product.current_stock}</td>
                        <td className="predicted-value">
                          {product.predicted_demand}
                        </td>
                        <td className="order-qty">
                          <strong>{product.recommended_order}</strong>
                        </td>
                        <td>₹{(product.recommended_order * product.price).toFixed(2)}</td>
                        <td>
                          <span className="confidence-badge">
                            {product.confidence}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-explain"
                            onClick={() => toggleExpand(product.product_id)}
                          >
                            {expandedProduct === product.product_id
                              ? "Hide"
                              : "Explain"}
                          </button>
                        </td>
                      </tr>

                      {expandedProduct === product.product_id && (
                        <tr className="expanded-row">
                          <td colSpan="9">
                            <div className="expanded-content">
                              {/* Demand Projections */}
                              <div className="projections-section">
                                <h3>📊 Demand Projections Breakdown</h3>
                                <p className="section-note">
                                  All estimates include Low (conservative), Average (most likely), and High (optimistic) scenarios
                                </p>
                                
                                <div className="projection-grid">
                                  {/* Daily Average */}
                                  <div className="projection-card">
                                    <div className="projection-header">
                                      <span className="projection-icon">📆</span>
                                      <div>
                                        <h5>Daily Average</h5>
                                        <p className="projection-subtitle">
                                          {product.demand_breakdown.daily_average.explanation}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="projection-values">
                                      <div className="proj-value">
                                        <span>Low</span>
                                        <strong>{product.demand_breakdown.daily_average.low}</strong>
                                      </div>
                                      <div className="proj-value highlight">
                                        <span>Average</span>
                                        <strong>{product.demand_breakdown.daily_average.average}</strong>
                                      </div>
                                      <div className="proj-value">
                                        <span>High</span>
                                        <strong>{product.demand_breakdown.daily_average.high}</strong>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Weekly */}
                                  <div className="projection-card">
                                    <div className="projection-header">
                                      <span className="projection-icon">📅</span>
                                      <div>
                                        <h5>Weekly (7 Days)</h5>
                                        <p className="projection-subtitle">
                                          {product.demand_breakdown.weekly.explanation}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="projection-values">
                                      <div className="proj-value">
                                        <span>Low</span>
                                        <strong>{product.demand_breakdown.weekly.low}</strong>
                                      </div>
                                      <div className="proj-value highlight">
                                        <span>Average</span>
                                        <strong>{product.demand_breakdown.weekly.average}</strong>
                                      </div>
                                      <div className="proj-value">
                                        <span>High</span>
                                        <strong>{product.demand_breakdown.weekly.high}</strong>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Monthly */}
                                  <div className="projection-card">
                                    <div className="projection-header">
                                      <span className="projection-icon">📅</span>
                                      <div>
                                        <h5>Monthly (30 Days)</h5>
                                        <p className="projection-subtitle">
                                          {product.demand_breakdown.monthly.explanation}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="projection-values">
                                      <div className="proj-value">
                                        <span>Low</span>
                                        <strong>{product.demand_breakdown.monthly.low}</strong>
                                      </div>
                                      <div className="proj-value highlight">
                                        <span>Average</span>
                                        <strong>{product.demand_breakdown.monthly.average}</strong>
                                      </div>
                                      <div className="proj-value">
                                        <span>High</span>
                                        <strong>{product.demand_breakdown.monthly.high}</strong>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Quarterly */}
                                  <div className="projection-card">
                                    <div className="projection-header">
                                      <span className="projection-icon">📊</span>
                                      <div>
                                        <h5>Quarterly (90 Days)</h5>
                                        <p className="projection-subtitle">
                                          {product.demand_breakdown.quarterly.explanation}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="projection-values">
                                      <div className="proj-value">
                                        <span>Low</span>
                                        <strong>{product.demand_breakdown.quarterly.low}</strong>
                                      </div>
                                      <div className="proj-value highlight">
                                        <span>Average</span>
                                        <strong>{product.demand_breakdown.quarterly.average}</strong>
                                      </div>
                                      <div className="proj-value">
                                        <span>High</span>
                                        <strong>{product.demand_breakdown.quarterly.high}</strong>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Financial & Historical */}
                              <div className="bottom-sections">
                                <div className="financial-section">
                                  <h4>💰 Financial Impact</h4>
                                  <div className="financial-stats">
                                    <div className="financial-item">
                                      <span>Expected Revenue:</span>
                                      <strong className="success">
                                        ₹{product.potential_revenue}
                                      </strong>
                                    </div>
                                    <div className="financial-item">
                                      <span>Revenue at Risk:</span>
                                      <strong className="danger">
                                        ₹{product.lost_revenue_risk}
                                      </strong>
                                    </div>
                                    <div className="financial-item">
                                      <span>Unit Price:</span>
                                      <strong>₹{product.price}</strong>
                                    </div>
                                  </div>
                                </div>

                                <div className="history-section">
                                  <h4>📊 Last 4 Weeks Performance</h4>
                                  <table className="history-table">
                                    <thead>
                                      <tr>
                                        <th>Date</th>
                                        <th>Predicted</th>
                                        <th>Actual</th>
                                        <th>Accuracy</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {product.last_4_weeks.map((week, idx) => {
                                        const accuracy =
                                          week.actual > 0
                                            ? (
                                                (1 -
                                                  Math.abs(
                                                    week.predicted - week.actual
                                                  ) /
                                                    week.actual) *
                                                100
                                              ).toFixed(1)
                                            : "N/A";
                                        return (
                                          <tr key={idx}>
                                            <td>{week.date}</td>
                                            <td>{week.predicted}</td>
                                            <td>{week.actual}</td>
                                            <td>
                                              <span className="accuracy-badge">
                                                {accuracy}%
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BulkPrediction;
