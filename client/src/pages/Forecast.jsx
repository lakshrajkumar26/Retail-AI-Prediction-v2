import { useState } from "react";
import { getForecast } from "../api";
import ForecastChart from "../components/ForecastChart";
import "./Forecast.css";

const Forecast = () => {
  const [storeId, setStoreId] = useState("S001");
  const [productId, setProductId] = useState("P0001");
  const [months, setMonths] = useState(3);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await getForecast(storeId, productId, months);
      setForecast(data);
    } catch (error) {
      console.error("Failed to generate forecast:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalDemand = forecast.reduce((sum, f) => sum + f.expected_demand, 0);
  const avgWeekly = forecast.length ? totalDemand / forecast.length : 0;
  const peakWeek = forecast.length
    ? forecast.reduce((max, f) => (f.expected_demand > max.expected_demand ? f : max))
    : null;

  return (
    <div className="forecast-page">
      <div className="page-header">
        <h1>Demand Forecast Generator</h1>
        <p className="subtitle">Generate AI-powered demand forecasts for your inventory</p>
      </div>

      <div className="forecast-form-card">
        <h2>Forecast Parameters</h2>
        <div className="form-grid">
          <div className="form-group">
            <label>Store ID</label>
            <input
              type="text"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              placeholder="e.g., S001"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Product ID</label>
            <input
              type="text"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder="e.g., P0001"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Forecast Period</label>
            <select
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="form-input"
            >
              <option value={1}>1 Month (4 weeks)</option>
              <option value={3}>3 Months (12 weeks)</option>
              <option value={6}>6 Months (24 weeks)</option>
            </select>
          </div>

          <div className="form-group">
            <label>&nbsp;</label>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? "Generating..." : "Generate Forecast"}
            </button>
          </div>
        </div>
      </div>

      {forecast.length > 0 && (
        <>
          <div className="forecast-stats">
            <div className="stat-box">
              <span className="stat-label">Total Demand</span>
              <span className="stat-value">{Math.round(totalDemand)} units</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Avg Weekly</span>
              <span className="stat-value">{Math.round(avgWeekly)} units</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Peak Week</span>
              <span className="stat-value">
                Week {peakWeek?.week} ({Math.round(peakWeek?.expected_demand)} units)
              </span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Forecast Period</span>
              <span className="stat-value">{forecast.length} weeks</span>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h2>Demand Forecast</h2>
              <button className="btn-secondary">Export Data</button>
            </div>
            <ForecastChart data={forecast} />
          </div>

          <div className="forecast-table-card">
            <h2>Detailed Forecast</h2>
            <div className="table-wrapper">
              <table className="forecast-table">
                <thead>
                  <tr>
                    <th>Week</th>
                    <th>Expected Demand</th>
                    <th>Confidence</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.map((item) => (
                    <tr key={item.week}>
                      <td>Week {item.week}</td>
                      <td>{Math.round(item.expected_demand)} units</td>
                      <td>
                        <span className="confidence-badge">High</span>
                      </td>
                      <td>
                        <button className="btn-small">View Details</button>
                      </td>
                    </tr>
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

export default Forecast;
