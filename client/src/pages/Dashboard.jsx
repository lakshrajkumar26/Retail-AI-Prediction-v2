import { useEffect, useState } from "react";
import { getHistory, getForecast, getStores, getProducts } from "../api";
import StatsCard from "../components/StatsCard";
import HistoryChart from "../components/HistoryChart";
import ForecastChart from "../components/ForecastChart";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import "./Dashboard.css";

const Dashboard = () => {
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedStore, setSelectedStore] = useState("S001");
  const [selectedProduct, setSelectedProduct] = useState("P0001");
  const [history, setHistory] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    if (selectedStore) {
      loadProducts(selectedStore);
    }
  }, [selectedStore]);

  useEffect(() => {
    if (selectedStore && selectedProduct) {
      loadData();
    }
  }, [selectedStore, selectedProduct]);

  const loadStores = async () => {
    try {
      const data = await getStores();
      setStores(data.stores || []);
    } catch (error) {
      console.error("Failed to load stores:", error);
      setError("Failed to load stores. Please check if the API is running.");
    }
  };

  const loadProducts = async (storeId) => {
    try {
      const data = await getProducts(storeId);
      setProducts(data.products || []);
    } catch (error) {
      console.error("Failed to load products:", error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [historyData, forecastData] = await Promise.all([
        getHistory(selectedStore, selectedProduct),
        getForecast(selectedStore, selectedProduct, 3),
      ]);
      setHistory(historyData);
      setForecast(forecastData);
    } catch (error) {
      console.error("Failed to load data:", error);
      setError("Failed to load data. Please ensure the API server is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  const avgError = history.length
    ? Math.round(
        history.reduce(
          (sum, d) => sum + Math.abs(d.units_sold_7d - d.predicted),
          0
        ) / history.length
      )
    : 0;

  const accuracy = history.length
    ? Math.round(
        (1 -
          history.reduce(
            (sum, d) => sum + Math.abs(d.units_sold_7d - d.predicted) / d.units_sold_7d,
            0
          ) / history.length) *
          100
      )
    : 0;

  const totalDemand = forecast.reduce((sum, f) => sum + f.expected_demand, 0);

  if (error) {
    return <ErrorMessage message={error} onRetry={loadData} />;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Demand Forecasting Dashboard</h1>
          <p className="subtitle">AI-powered inventory intelligence</p>
        </div>
        <div className="header-actions">
          <select
            className="select-input"
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
          >
            {stores.map((store) => (
              <option key={store} value={store}>
                Store {store}
              </option>
            ))}
          </select>
          <select
            className="select-input"
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
          >
            {products.map((product) => (
              <option key={product} value={product}>
                Product {product}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading dashboard data..." />
      ) : (
        <>
          <div className="stats-grid">
            <StatsCard
              title="Model Accuracy"
              value={`${accuracy}%`}
              icon="🎯"
              trend="+2.5%"
              trendUp={true}
            />
            <StatsCard
              title="Avg Error"
              value={`${avgError} units`}
              icon="📊"
              trend="-1.2%"
              trendUp={true}
            />
            <StatsCard
              title="Forecast Period"
              value={`${forecast.length} weeks`}
              icon="📅"
            />
            <StatsCard
              title="Expected Demand"
              value={`${Math.round(totalDemand)} units`}
              icon="📈"
              trend="+5.3%"
              trendUp={true}
            />
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <div className="chart-header">
                <h2>Historical Performance</h2>
                <span className="chart-badge">Last {history.length} weeks</span>
              </div>
              <HistoryChart data={history} />
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <h2>Demand Forecast</h2>
                <span className="chart-badge">Next {forecast.length} weeks</span>
              </div>
              <ForecastChart data={forecast} />
            </div>
          </div>

          <div className="insights-section">
            <h2>Key Insights</h2>
            <div className="insights-grid">
              <div className="insight-card">
                <span className="insight-icon">💡</span>
                <div>
                  <h3>High Accuracy</h3>
                  <p>Model maintains {accuracy}% accuracy across predictions</p>
                </div>
              </div>
              <div className="insight-card">
                <span className="insight-icon">⚠️</span>
                <div>
                  <h3>Stock Alert</h3>
                  <p>Ensure adequate inventory for upcoming demand spike</p>
                </div>
              </div>
              <div className="insight-card">
                <span className="insight-icon">📊</span>
                <div>
                  <h3>Trend Analysis</h3>
                  <p>Demand showing steady growth pattern</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
