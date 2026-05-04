import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend
} from "recharts";
import LoadingSpinner from "../components/LoadingSpinner";
import "./Analytics.css";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FULL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const API = () => window.location.port === '5016' ? '/api' : 'http://localhost:8002';

const TT = {
  contentStyle: { backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid #3b82f6', borderRadius: '8px', color: '#fff' },
  labelStyle: { color: '#94a3b8' },
};

const formatProductName = (name) => {
  if (!name) return "";
  return name
    .replace(/"/g, "")
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
};

const ChartBox = ({ height = 300, children }) => {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const measure = () => { if (ref.current) setW(ref.current.offsetWidth); };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  return (
    <div ref={ref} style={{ width: '100%', height, minHeight: height }}>
      {w > 0 && children(w, height)}
    </div>
  );
};

const Analytics = () => {
  const [itemsFull, setItemsFull] = useState([]);   // full objects with metadata
  const [selectedItem, setSelectedItem] = useState("");
  const [searchText, setSearchText] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [productAnalysis, setProductAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [recentSearches, setRecentSearches] = useState([]);
  const analysisCache = useRef({});
  const searchRef = useRef(null);

  useEffect(() => { loadItems(); }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSuggestions([]);
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadItems = async () => {
    try {
      const res = await fetch(`${API()}/all_items`);
      const data = await res.json();
      const list = data.items || [];
      setItemsFull(list);
      if (list.length > 0) {
        setSelectedItem(list[0].item_name);
        setSearchText(formatProductName(list[0].item_name));
      }
    } catch (err) { setError("Failed to load items"); }
    finally { setInitialLoading(false); }
  };

  // Top sellers for "popular" section
  const topSellers = useMemo(() => {
    return [...itemsFull].sort((a, b) => (b.total_sold || 0) - (a.total_sold || 0)).slice(0, 6);
  }, [itemsFull]);

  const loadAnalytics = useCallback(async (itemName) => {
    if (!itemName) return;
    if (analysisCache.current[itemName]) {
      setAnalytics(analysisCache.current[itemName].analytics);
      setProductAnalysis(analysisCache.current[itemName].product);
      return;
    }
    setLoading(true); setError(null);
    try {
      const [aRes, pRes] = await Promise.all([
        fetch(`${API()}/analytics/item-lookup?q=${encodeURIComponent(itemName)}`),
        fetch(`${API()}/analytics/dashboard/product-analysis?item_name=${encodeURIComponent(itemName)}`)
      ]);
      if (!aRes.ok) throw new Error("Item not found");
      const aData = await aRes.json();
      const pData = pRes.ok ? await pRes.json() : null;
      analysisCache.current[itemName] = { analytics: aData, product: pData };
      setAnalytics(aData); setProductAnalysis(pData);
    } catch (err) {
      setError(err.message?.includes("not found") ? "Item not found. Try another." : "Failed to load analytics");
      setAnalytics(null); setProductAnalysis(null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (selectedItem) loadAnalytics(selectedItem); }, [selectedItem, loadAnalytics]);

  const handleSearch = (val) => {
    setSearchText(val);
    if (val.length > 0) {
      const q = val.toLowerCase().replace(/"/g, "");
      const matches = itemsFull.filter(i => 
        (i.item_name || '').toLowerCase().replace(/"/g, "").includes(q)
      ).slice(0, 8);
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  };

  const selectItem = (name) => {
    setSelectedItem(name);
    setSearchText(formatProductName(name));
    setSuggestions([]);
    setSearchFocused(false);
    // Add to recent
    setRecentSearches(prev => {
      const updated = [name, ...prev.filter(n => n !== name)].slice(0, 5);
      return updated;
    });
  };

  const clearSearch = () => {
    setSearchText("");
    setSuggestions([]);
  };

  const yearlyTrend = useMemo(() => {
    if (!analytics?.yearly_trends) return [];
    return Object.entries(analytics.yearly_trends).map(([y, s]) => ({ year: parseInt(y), sales: s })).sort((a, b) => a.year - b.year);
  }, [analytics]);

  const monthPattern = useMemo(() => {
    if (!analytics?.monthly_patterns?.[selectedMonth]) return [];
    return analytics.monthly_patterns[selectedMonth].sort((a, b) => a.year - b.year).map(d => ({ year: d.year, sales: d.sales }));
  }, [analytics, selectedMonth]);

  const seasonalData = useMemo(() => {
    if (!analytics?.seasonal_factors) return [];
    return Object.entries(analytics.seasonal_factors).map(([m, f]) => ({
      monthNum: parseInt(m), month: MONTHS[parseInt(m) - 1], factor: parseFloat(Number(f).toFixed(2))
    })).sort((a, b) => a.monthNum - b.monthNum);
  }, [analytics]);

  const timeSeries = useMemo(() => productAnalysis?.time_series || [], [productAnalysis]);
  const monthlyAvgPattern = useMemo(() => productAnalysis?.monthly_pattern || [], [productAnalysis]);
  const insights = productAnalysis?.key_insights;

  if (initialLoading) return <LoadingSpinner message="Loading product catalog..." />;

  const showDropdown = searchFocused && (suggestions.length > 0 || searchText.length === 0);

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <div>
          <h1>📊 Interactive Product Analytics</h1>
          <p className="subtitle">Deep-dive into any product's sales DNA — trends, seasonality, volatility and more</p>
        </div>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          <span className="product-count-badge">{itemsFull.length.toLocaleString()} products</span>
          <button onClick={() => { analysisCache.current = {}; loadAnalytics(selectedItem); }} className="refresh-btn" disabled={!selectedItem}>🔄 Refresh</button>
        </div>
      </div>

      {/* Enhanced Search Panel */}
      <div className="search-panel" ref={searchRef}>
        <div className="search-panel-inner">
          <div className="search-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </div>
          <input
            className="search-main-input"
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            placeholder="Search products... (e.g. Maggi, Beer, Milk, Soap)"
          />
          {searchText && (
            <button className="search-clear-btn" onClick={clearSearch}>✕</button>
          )}
          <button className="search-clear-btn" style={{ fontSize: '1rem', marginLeft: '4px' }} onClick={() => setSearchFocused(!searchFocused)}>
            ▼
          </button>
          {selectedItem && analysisCache.current[selectedItem] && (
            <span className="search-cached-badge">⚡ Cached</span>
          )}
        </div>

        {/* Dropdown */}
        {showDropdown && (
          <div className="search-results-dropdown">
            {/* If no search text, show popular & recent */}
            {searchText.length === 0 && (
              <>
                {recentSearches.length > 0 && (
                  <div className="search-section">
                    <div className="search-section-title">🕐 Recent Searches</div>
                    {recentSearches.map(name => {
                      const item = itemsFull.find(i => i.item_name === name);
                      return item ? <ProductSuggestionCard key={name} item={item} onClick={() => selectItem(name)} isActive={name === selectedItem} /> : null;
                    })}
                  </div>
                )}
                <div className="search-section">
                  <div className="search-section-title">🔥 Top Selling Products</div>
                  {topSellers.map(item => (
                    <ProductSuggestionCard key={item.item_name} item={item} onClick={() => selectItem(item.item_name)} isActive={item.item_name === selectedItem} />
                  ))}
                </div>
              </>
            )}

            {/* Search results */}
            {searchText.length > 0 && suggestions.length > 0 && (
              <div className="search-section">
                <div className="search-section-title">
                  🔎 {suggestions.length} result{suggestions.length > 1 ? 's' : ''} for "{searchText}"
                </div>
                {suggestions.map(item => (
                  <ProductSuggestionCard key={item.item_name} item={item} onClick={() => selectItem(item.item_name)} query={searchText} isActive={item.item_name === selectedItem} />
                ))}
              </div>
            )}

            {searchText.length > 0 && suggestions.length === 0 && (
              <div className="search-empty">
                <span className="search-empty-icon">🔍</span>
                <p>No products found for "{searchText}"</p>
                <p className="search-empty-hint">Try a shorter keyword like "maggi" or "soap"</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Currently analyzing indicator */}
      {selectedItem && !loading && analytics && (
        <div className="analyzing-strip">
          <span className="analyzing-dot"></span>
          <span>Analyzing: <strong>{formatProductName(selectedItem)}</strong></span>
          {productAnalysis && <span className="analyzing-cat">{productAnalysis.category}</span>}
          {productAnalysis && <span className="analyzing-grp">Group {productAnalysis.group}</span>}
        </div>
      )}

      {loading && <LoadingSpinner message="Crunching sales intelligence..." />}
      {error && <div className="error-message"><span>❌ {error}</span></div>}

      {analytics && !loading && (
        <>
          {/* Key Insight Cards */}
          {insights && (
            <div className="analytics-summary">
              <div className="summary-card" style={{ borderLeft: '4px solid #10b981' }}>
                <div className="card-icon">📈</div>
                <div className="card-content">
                  <div className="card-label">Trend Analysis</div>
                  <div className="card-value" style={{ color: insights.trend.label === 'Growing' ? '#10b981' : insights.trend.label === 'Declining' ? '#ef4444' : '#f59e0b' }}>
                    {insights.trend.label}
                  </div>
                  <div className="card-detail">{insights.trend.growth_rate > 0 ? '+' : ''}{insights.trend.growth_rate}% YoY</div>
                </div>
              </div>
              <div className="summary-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                <div className="card-icon">🌀</div>
                <div className="card-content">
                  <div className="card-label">Volatility</div>
                  <div className="card-value" style={{ color: insights.volatility.label === 'High' ? '#ef4444' : insights.volatility.label === 'Medium' ? '#f59e0b' : '#10b981' }}>
                    {insights.volatility.label}
                  </div>
                  <div className="card-detail">CV: {(insights.volatility.cv * 100).toFixed(1)}% • σ: {insights.volatility.std}</div>
                </div>
              </div>
              <div className="summary-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                <div className="card-icon">❄️</div>
                <div className="card-content">
                  <div className="card-label">Seasonal Pattern</div>
                  <div className="card-value">{insights.seasonal_pattern.peak_month}</div>
                  <div className="card-detail">Peak: {insights.seasonal_pattern.peak_months}</div>
                </div>
              </div>
              <div className="summary-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                <div className="card-icon">⚖️</div>
                <div className="card-content">
                  <div className="card-label">Sales Range</div>
                  <div className="card-value">{insights.sales_range.min} – {insights.sales_range.max}</div>
                  <div className="card-detail">Mean: {insights.sales_range.mean} • Median: {insights.sales_range.median}</div>
                </div>
              </div>
            </div>
          )}

          {/* Chart 1: Full Time Series */}
          {timeSeries.length > 0 && (
            <div className="chart-card">
              <h2>📈 Sales Trend Over Time</h2>
              <p className="chart-description">Complete monthly sales history for {selectedItem}</p>
              <ChartBox height={320}>
                {(w, h) => (
                  <AreaChart width={w} height={h} data={timeSeries}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="label" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} interval={Math.max(0, Math.floor(timeSeries.length / 12))} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip {...TT} />
                    <Area type="monotone" dataKey="units" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#areaGrad)" name="Units Sold" />
                  </AreaChart>
                )}
              </ChartBox>
            </div>
          )}

          {/* Chart 2: Year-wise */}
          <div className="chart-card">
            <h2>📊 Year-wise Sales Analysis</h2>
            <p className="chart-description">Total units sold per year — long-term growth trajectory</p>
            {yearlyTrend.length > 0 ? (
              <ChartBox height={300}>
                {(w, h) => (
                  <BarChart width={w} height={h} data={yearlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="year" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip {...TT} />
                    <Legend wrapperStyle={{ color: '#94a3b8' }} />
                    <Bar dataKey="sales" fill="#3b82f6" radius={[6,6,0,0]} name="Total Units" />
                  </BarChart>
                )}
              </ChartBox>
            ) : <div className="no-data">No yearly data available</div>}
          </div>

          {/* Chart 3: Monthly Average */}
          {monthlyAvgPattern.length > 0 && (
            <div className="chart-card">
              <h2>📅 Monthly Sales Pattern</h2>
              <p className="chart-description">Average units per month across all years — reveals seasonal demand cycles</p>
              <ChartBox height={300}>
                {(w, h) => (
                  <BarChart width={w} height={h} data={monthlyAvgPattern}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip {...TT} />
                    <Bar dataKey="avg_units" fill="#8b5cf6" radius={[6,6,0,0]} name="Avg Units" />
                  </BarChart>
                )}
              </ChartBox>
            </div>
          )}

          {/* Chart 4: Month Deep-dive */}
          <div className="chart-card">
            <h2>📅 Month Deep-dive: {FULL_MONTHS[selectedMonth - 1]}</h2>
            <div className="month-selector">
              <label>Select Month:</label>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="month-select">
                {FULL_MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <p className="chart-description">Sales for {FULL_MONTHS[selectedMonth - 1]} across all years</p>
            {monthPattern.length > 0 ? (
              <ChartBox height={280}>
                {(w, h) => (
                  <BarChart width={w} height={h} data={monthPattern}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="year" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip {...TT} />
                    <Bar dataKey="sales" fill="#10b981" radius={[6,6,0,0]} name="Units Sold" />
                  </BarChart>
                )}
              </ChartBox>
            ) : <div className="no-data">No data for {FULL_MONTHS[selectedMonth - 1]}</div>}
          </div>

          {/* Chart 5: Seasonality */}
          <div className="chart-card">
            <h2>🌍 Seasonality Factors</h2>
            <p className="chart-description">Demand multiplier per month (1.0 = average). Click a bar to drill into that month.</p>
            {seasonalData.length > 0 ? (
              <ChartBox height={300}>
                {(w, h) => (
                  <BarChart width={w} height={h} data={seasonalData}
                    onClick={(e) => { const m = e?.activePayload?.[0]?.payload?.monthNum; if (m) setSelectedMonth(m); }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip {...TT} />
                    <Bar dataKey="factor" fill="#f59e0b" radius={[6,6,0,0]} name="Factor" cursor="pointer" />
                  </BarChart>
                )}
              </ChartBox>
            ) : <div className="no-data">No seasonal data</div>}
          </div>

          {/* Insights */}
          <div className="insights-card">
            <h2>💡 Key Insights for {formatProductName(selectedItem)}</h2>
            <div className="insights-grid">
              <div className="insight-item"><span className="insight-icon">📊</span><div><h4>Trend Analysis</h4><p>Sales are <strong>{analytics.trend_direction}</strong> with <strong>{(analytics.growth_rate * 100).toFixed(1)}%</strong> YoY growth.</p></div></div>
              <div className="insight-item"><span className="insight-icon">📈</span><div><h4>Volatility</h4><p>CV is <strong>{(analytics.statistics.cv * 100).toFixed(1)}%</strong>.{analytics.statistics.cv < 0.3 ? " Stable." : analytics.statistics.cv < 0.6 ? " Moderate." : " Highly volatile."}</p></div></div>
              <div className="insight-item"><span className="insight-icon">🎯</span><div><h4>Seasonal Pattern</h4><p>Peak: <strong>{Math.max(...Object.values(analytics.seasonal_factors || {})).toFixed(2)}</strong> • Low: <strong>{Math.min(...Object.values(analytics.seasonal_factors || {})).toFixed(2)}</strong></p></div></div>
              <div className="insight-item"><span className="insight-icon">📉</span><div><h4>Sales Range</h4><p>From <strong>{Math.round(analytics.statistics.min_sales)}</strong> to <strong>{Math.round(analytics.statistics.max_sales)}</strong> units (mean: {Math.round(analytics.statistics.avg_sales)})</p></div></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* Rich Product Suggestion Card */
const ProductSuggestionCard = ({ item, onClick, query = "", isActive }) => {
  const name = formatProductName(item.item_name || '');
  
  // Highlight matching text
  const highlightMatch = (text, q) => {
    if (!q) return text;
    const safeQ = q.replace(/"/g, "").toLowerCase();
    const idx = text.toLowerCase().indexOf(safeQ);
    if (idx === -1) return text;
    return (<>{text.slice(0, idx)}<mark className="search-highlight">{text.slice(idx, idx + safeQ.length)}</mark>{text.slice(idx + safeQ.length)}</>);
  };

  const avgMonthly = item.months_with_data > 0 ? Math.round((item.total_sold || 0) / item.months_with_data) : 0;

  return (
    <div className={`product-suggestion-card ${isActive ? 'active' : ''}`} onClick={onClick}>
      <div className="psc-left">
        <div className="psc-icon">{item.category === 'Liquor' ? '🍺' : '🛒'}</div>
        <div className="psc-info">
          <div className="psc-name">{highlightMatch(name, query)}</div>
          <div className="psc-meta">
            <span className={`psc-cat ${item.category === 'Liquor' ? 'liquor' : 'grocery'}`}>{item.category}</span>
            <span className="psc-stat">₹{Math.round(item.avg_price || 0)}</span>
            <span className="psc-stat">{item.months_with_data || 0} months</span>
          </div>
        </div>
      </div>
      <div className="psc-right">
        <div className="psc-total">{(item.total_sold || 0).toLocaleString()}</div>
        <div className="psc-label">total sold</div>
        <div className="psc-monthly">{avgMonthly}/mo avg</div>
      </div>
    </div>
  );
};

export default Analytics;
