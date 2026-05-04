import { useState, useEffect } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import "./Database.css";

const Database = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedYear, setSelectedYear] = useState("2025");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("overview"); // overview, all-items, top-sellers
  const [allItems, setAllItems] = useState([]);
  const [topSellers, setTopSellers] = useState({ grocery: [], liquor: [] });

  useEffect(() => {
    loadDatabaseInfo();
  }, []);

  const loadDatabaseInfo = async () => {
    try {
      setLoading(true);
      const baseURL = window.location.port === '5016' 
        ? '/api'  // Docker - use nginx proxy
        : 'http://localhost:8002';  // Local dev - direct to backend
      
      const response = await fetch(`${baseURL}/`);
      const info = await response.json();
      
      // Fetch items data
      const itemsResponse = await fetch(`${baseURL}/items`);
      const itemsData = await itemsResponse.json();
      
      // Fetch all items with details
      const allItemsResponse = await fetch(`${baseURL}/all_items`);
      let allItemsList = [];
      if (allItemsResponse.ok) {
        const allItemsData = await allItemsResponse.json();
        allItemsList = allItemsData.items || [];
      }
      
      setData({
        ...info,
        items: itemsData
      });
      
      setAllItems(allItemsList);
      
      // Extract top 10 sellers for each category
      if (allItemsList.length > 0) {
        const groceryItems = allItemsList.filter(item => item.category === 'Grocery').sort((a, b) => b.total_sold - a.total_sold).slice(0, 10);
        const liquorItems = allItemsList.filter(item => item.category === 'Liquor').sort((a, b) => b.total_sold - a.total_sold).slice(0, 10);
        setTopSellers({ grocery: groceryItems, liquor: liquorItems });
      }
    } catch (error) {
      console.error("Failed to load database info:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading database information..." />;
  }

  if (!data) {
    return (
      <div className="database-page">
        <div className="error-message">Failed to load database information</div>
      </div>
    );
  }

  const exportToCSV = (items, filename) => {
    if (!items || items.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = Object.keys(items[0]);
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add data rows
    for (const row of items) {
      const values = headers.map(header => {
        const value = row[header];
        const escaped = ('' + value).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }
    
    const csv = csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFilteredItems = () => {
    let filtered = allItems;
    
    if (selectedCategory !== "all") {
      filtered = filtered.filter(item => 
        item.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Year filter: keep items whose available date range intersects the selected year
    if (selectedYear) {
      const y = parseInt(selectedYear);
      filtered = filtered.filter(item => {
        const firstY = item.first_date ? new Date(item.first_date).getFullYear() : null;
        const lastY = item.last_date ? new Date(item.last_date).getFullYear() : null;
        if (firstY === null || Number.isNaN(firstY) || lastY === null || Number.isNaN(lastY)) return true;
        return y >= firstY && y <= lastY;
      });
    }
    
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered.sort((a, b) => b.total_sold - a.total_sold);
  };

  return (
    <div className="database-page">
      <div className="page-header">
        <h1>📊 Database Overview</h1>
        <p className="subtitle">
          Complete inventory database with all items organized by category and time period
        </p>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-icon">📦</div>
          <div className="card-content">
            <div className="card-label">Total Items</div>
            <div className="card-value">{data.inventory?.total_items || 0}</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">🛒</div>
          <div className="card-content">
            <div className="card-label">Grocery Items</div>
            <div className="card-value">{data.inventory?.grocery_items || 0}</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">🍷</div>
          <div className="card-content">
            <div className="card-label">Liquor Items</div>
            <div className="card-value">{data.inventory?.liquor_items || 0}</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">⚠️</div>
          <div className="card-content">
            <div className="card-label">Critical Stock</div>
            <div className="card-value critical">{data.inventory?.critical_items || 0}</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="database-controls">
        <div className="control-group">
          <label>Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="control-select"
          >
            <option value="all">All Categories</option>
            <option value="grocery">Grocery Only</option>
            <option value="liquor">Liquor Only</option>
          </select>
        </div>

        <div className="control-group">
          <label>Year:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="control-select"
          >
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
        </div>

        <div className="control-group search">
          <input
            type="text"
            placeholder="🔍 Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="view-mode-toggle">
          <button
            className={`mode-btn ${viewMode === "overview" ? "active" : ""}`}
            onClick={() => setViewMode("overview")}
          >
            📊 Overview
          </button>
          <button
            className={`mode-btn ${viewMode === "top-sellers" ? "active" : ""}`}
            onClick={() => setViewMode("top-sellers")}
          >
            🏆 Top 10 Sellers
          </button>
          <button
            className={`mode-btn ${viewMode === "all-items" ? "active" : ""}`}
            onClick={() => setViewMode("all-items")}
          >
            📋 View All Items
          </button>
        </div>
      </div>

      {/* Conditional Content Based on View Mode */}
      {viewMode === "overview" && (
        <>
          {/* Category Breakdown */}
          <div className="category-breakdown">
            <h2>📂 Category Breakdown</h2>
            <div className="breakdown-grid">
              <div className="breakdown-card">
                <h3>🛒 Grocery Items</h3>
                <div className="breakdown-content">
                  <div className="stat-row">
                    <span>Total Items:</span>
                    <strong>{data.items?.grocery?.total || 0}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Top Seller:</span>
                    <strong>{data.items?.grocery?.top_seller || "N/A"}</strong>
                  </div>
                  <div className="items-preview">
                    <p className="preview-label">Sample Items:</p>
                    <ul>
                      {data.items?.grocery?.items?.slice(0, 5).map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="breakdown-card">
                <h3>🍷 Liquor Items</h3>
                <div className="breakdown-content">
                  <div className="stat-row">
                    <span>Total Items:</span>
                    <strong>{data.items?.liquor?.total || 0}</strong>
                  </div>
                  <div className="stat-row">
                    <span>Top Seller:</span>
                    <strong>{data.items?.liquor?.top_seller || "N/A"}</strong>
                  </div>
                  <div className="items-preview">
                    <p className="preview-label">Sample Items:</p>
                    <ul>
                      {data.items?.liquor?.items?.slice(0, 5).map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {viewMode === "top-sellers" && (
        <>
          {/* Top 10 Sellers */}
          <div className="top-sellers-section">
            <div className="sellers-grid">
              {/* Grocery Top Sellers */}
              <div className="sellers-card">
                <h2>🛒 Top 10 Grocery Sellers</h2>
                <div className="sellers-table-wrapper">
                  <table className="sellers-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Product Name</th>
                        <th>Units Sold</th>
                        <th>Revenue</th>
                        <th>Avg Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topSellers.grocery.map((item, idx) => (
                        <tr key={idx}>
                          <td className="rank">#{idx + 1}</td>
                          <td className="product-name">{item.item_name}</td>
                          <td className="units">{item.total_sold?.toLocaleString() || 0}</td>
                          <td className="revenue">₹{(item.revenue || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                          <td className="price">₹{(item.avg_price || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button 
                  className="btn-export"
                  onClick={() => exportToCSV(topSellers.grocery, 'top_10_grocery_sellers.csv')}
                >
                  📥 Export Grocery Top 10
                </button>
              </div>

              {/* Liquor Top Sellers */}
              <div className="sellers-card">
                <h2>🍷 Top 10 Liquor Sellers</h2>
                <div className="sellers-table-wrapper">
                  <table className="sellers-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Product Name</th>
                        <th>Units Sold</th>
                        <th>Revenue</th>
                        <th>Avg Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topSellers.liquor.map((item, idx) => (
                        <tr key={idx}>
                          <td className="rank">#{idx + 1}</td>
                          <td className="product-name">{item.item_name}</td>
                          <td className="units">{item.total_sold?.toLocaleString() || 0}</td>
                          <td className="revenue">₹{(item.revenue || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                          <td className="price">₹{(item.avg_price || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button 
                  className="btn-export"
                  onClick={() => exportToCSV(topSellers.liquor, 'top_10_liquor_sellers.csv')}
                >
                  📥 Export Liquor Top 10
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {viewMode === "all-items" && (
        <>
          {/* All Items Listing */}
          <div className="all-items-section">
            <div className="all-items-header">
              <h2>📋 All Items ({getFilteredItems().length})</h2>
              <button 
                className="btn-export"
                onClick={() => exportToCSV(getFilteredItems(), 'all_items.csv')}
              >
                📥 Export All Items
              </button>
            </div>
            
            <div className="all-items-table-wrapper">
              <table className="all-items-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Units Sold</th>
                    <th>Revenue</th>
                    <th>Avg Price</th>
                    <th>Current Stock</th>
                    <th>Stock Status</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredItems().map((item, idx) => (
                    <tr key={idx}>
                      <td className="product-name">{item.item_name}</td>
                      <td className="category">{item.category}</td>
                      <td className="units">{item.total_sold?.toLocaleString() || 0}</td>
                      <td className="revenue">₹{(item.revenue || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                      <td className="price">₹{(item.avg_price || 0).toFixed(2)}</td>
                      <td className="stock">{item.current_stock || 0}</td>
                      <td className="status">
                        <span className={`status-badge ${item.stock_status?.toLowerCase() || 'adequate'}`}>
                          {item.stock_status || 'Adequate'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Data Period Info */}
      <div className="data-period-card">
        <h2>📅 Data Period</h2>
        <div className="period-content">
          <div className="period-item">
            <span className="period-label">Coverage:</span>
            <span className="period-value">{data.data_period}</span>
          </div>
          <div className="period-item">
            <span className="period-label">Status:</span>
            <span className="period-value status-ready">✅ {data.status}</span>
          </div>
          <div className="period-item">
            <span className="period-label">Model:</span>
            <span className="period-value">{data.model}</span>
          </div>
          <div className="period-item">
            <span className="period-label">Version:</span>
            <span className="period-value">{data.version}</span>
          </div>
        </div>
      </div>

      {/* Features Info */}
      <div className="features-card">
        <h2>✨ System Features</h2>
        <div className="features-grid">
          <div className="feature-item">
            <span className="feature-icon">🎯</span>
            <div>
              <h4>Business Intelligence</h4>
              <p>{data.business_intelligence === "enabled" ? "✅ Enabled" : "❌ Disabled"}</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🤖</span>
            <div>
              <h4>Enhanced Predictions</h4>
              <p>{data.enhanced_predictions === "active" ? "✅ Active" : "❌ Inactive"}</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📊</span>
            <div>
              <h4>Real Data Analysis</h4>
              <p>✅ 22,384 transactions</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🔄</span>
            <div>
              <h4>Auto-Retraining</h4>
              <p>✅ Available</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <h2>📈 Quick Statistics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-title">Data Quality</div>
            <div className="stat-value">High</div>
            <div className="stat-description">22,384 verified transactions</div>
          </div>
          <div className="stat-card">
            <div className="stat-title">Coverage</div>
            <div className="stat-value">24 Months</div>
            <div className="stat-description">2024-2025 complete data</div>
          </div>
          <div className="stat-card">
            <div className="stat-title">Categories</div>
            <div className="stat-value">2</div>
            <div className="stat-description">Grocery & Liquor</div>
          </div>
          <div className="stat-card">
            <div className="stat-title">Accuracy</div>
            <div className="stat-value">{data.inventory?.accuracy || 92.4}%</div>
            <div className="stat-description">Average prediction accuracy</div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="instructions-card">
        <h2>📋 How to Use Database</h2>
        <div className="instructions-list">
          <div className="instruction-item">
            <span className="instruction-number">1</span>
            <div>
              <h4>View All Items</h4>
              <p>See complete inventory organized by category and time period</p>
            </div>
          </div>
          <div className="instruction-item">
            <span className="instruction-number">2</span>
            <div>
              <h4>Search Items</h4>
              <p>Use search to find specific products quickly</p>
            </div>
          </div>
          <div className="instruction-item">
            <span className="instruction-number">3</span>
            <div>
              <h4>Filter by Category</h4>
              <p>View only Grocery or Liquor items</p>
            </div>
          </div>
          <div className="instruction-item">
            <span className="instruction-number">4</span>
            <div>
              <h4>Analyze Trends</h4>
              <p>Use charts to visualize sales patterns and trends</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Database;
