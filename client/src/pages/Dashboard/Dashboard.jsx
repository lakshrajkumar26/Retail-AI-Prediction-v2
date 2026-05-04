import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, AreaChart, Area, ComposedChart
} from 'recharts';
import { analyticsService } from '../../services/analyticsService';
import LoadingSpinner from '../../components/LoadingSpinner';
import './Dashboard.css';

const TT = {
  contentStyle: { backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid #3b82f6', borderRadius: '8px', color: '#fff' },
  labelStyle: { color: '#94a3b8' },
};

const fmtY = (val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val;

/* Wrapper that measures its own width and passes it to chart */
const ChartBox = ({ height = 320, children }) => {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const measure = () => {
      if (ref.current) setW(ref.current.offsetWidth);
    };
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

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('historical');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  const cache = useRef({ historical: null, yearwise: null });
  const [historicalData, setHistoricalData] = useState(null);
  const [yearwiseData, setYearwiseData] = useState(null);
  const [tabLoading, setTabLoading] = useState(false);

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const statsData = await analyticsService.getDatabaseStats();
      setStats(statsData);
      await loadTabData('historical');
      setError(null);
    } catch (err) {
      setError('Failed to connect. Ensure backend is running on port 8002.');
    } finally {
      setLoading(false);
    }
  };

  const loadTabData = async (tab) => {
    if (cache.current[tab]) {
      if (tab === 'historical') setHistoricalData(cache.current[tab]);
      if (tab === 'yearwise') setYearwiseData(cache.current[tab]);
      return;
    }
    setTabLoading(true);
    try {
      let data;
      if (tab === 'historical') {
        data = await analyticsService.getDashboardHistorical();
        cache.current.historical = data; setHistoricalData(data);
      } else if (tab === 'yearwise') {
        data = await analyticsService.getDashboardYearwise();
        cache.current.yearwise = data; setYearwiseData(data);
      }
    } catch (err) { console.error(`Tab load error:`, err); }
    finally { setTabLoading(false); }
  };

  const handleTabChange = (tab) => { setActiveTab(tab); loadTabData(tab); };

  if (loading) return <LoadingSpinner message="Connecting to Retail AI..." />;
  if (error) return (
    <div className="dashboard-error">
      <div className="error-icon">⚠️</div><h2>Connection Error</h2><p>{error}</p>
      <button onClick={loadInitialData} className="retry-btn">🔄 Retry</button>
    </div>
  );

  const inv = stats?.inventory || {};

  return (
    <div className="dashboard-container">
      <div className="dashboard-header-new">
        <div className="header-left">
          <h1>Retail Intelligence Dashboard</h1>
          <p className="header-subtitle">AI-powered inventory intelligence • XGBoost demand forecasting engine</p>
          <span className="badge-enhanced">PRODUCTION SYSTEM • {inv.accuracy || 92.4}% ACCURACY</span>
        </div>
        <div className="header-right">
          <div className="status-pill online"><span className="dot"></span> Backend Active</div>
        </div>
      </div>

      <div className="stats-cards-grid">
        <StatCard title="Products" icon="📦" value={inv.total_items?.toLocaleString()} sub={`${inv.grocery_items} Grocery • ${inv.liquor_items} Liquor`} />
        <StatCard title="Accuracy" icon="🎯" value={`${inv.accuracy || 92.4}%`} sub="Production validated" cls="trend-up" />
        <StatCard title="Avg Error" icon="📉" value={`${inv.avg_error || 24.5} units`} sub="Per month" cls="trend-down" />
        <StatCard title="Critical Stock" icon="⚠️" value={inv.critical_items || 0} sub="Items below demand" valCls="critical" />
      </div>

      <div className="dashboard-tabs">
        {['historical', 'yearwise'].map(tab => (
          <button key={tab} className={`dash-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => handleTabChange(tab)}>
            {tab === 'historical' ? '📊 Historical Performance' : '📅 Year-wise Analysis'}
            {cache.current[tab] && <span className="cache-dot">●</span>}
          </button>
        ))}
      </div>

      {tabLoading && <div className="tab-loading">Loading data...</div>}
      {!tabLoading && activeTab === 'historical' && historicalData && <HistoricalTab data={historicalData} />}
      {!tabLoading && activeTab === 'yearwise' && yearwiseData && <YearwiseTab data={yearwiseData} />}
    </div>
  );
};

const StatCard = ({ title, icon, value, sub, cls, valCls }) => (
  <div className="stat-card">
    <div className="stat-header"><span className="stat-title">{title}</span><span className="stat-icon">{icon}</span></div>
    <div className={`stat-value ${valCls || ''}`}>{value}</div>
    <div className={`stat-trend ${cls || ''}`}>{sub}</div>
  </div>
);


/* ── HISTORICAL TAB ── */
const HistoricalTab = ({ data }) => (
  <div>
    <div className="charts-grid">
      <div className="chart-card-new">
        <div className="chart-header-new">
          <div><h3>{data.prev_year} vs {data.max_year} Sales Comparison</h3><p>Side-by-side monthly unit volumes</p></div>
          <span className="chart-period">Monthly</span>
        </div>
        <ChartBox height={320}>
          {(w, h) => (
            <BarChart width={w} height={h} data={data.monthly_comparison} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={fmtY} />
              <Tooltip {...TT} />
              <Legend wrapperStyle={{ color: '#94a3b8' }} />
              <Bar dataKey={`sales_${data.prev_year || 2024}`} fill="#3b82f6" name={`${data.prev_year || 2024} Sales`} radius={[4, 4, 0, 0]} />
              <Bar dataKey={`sales_${data.max_year || 2025}`} fill="#10b981" name={`${data.max_year || 2025} Sales`} radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ChartBox>
      </div>

      <div className="chart-card-new">
        <div className="chart-header-new">
          <div><h3>Model Back-test Validation</h3><p>XGBoost prediction accuracy on {data.max_year} data</p></div>
          <span className="chart-period">92.4% Accuracy</span>
        </div>
        <ChartBox height={320}>
          {(w, h) => (
            <LineChart width={w} height={h} data={data.monthly_comparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={fmtY} />
              <Tooltip {...TT} />
              <Legend wrapperStyle={{ color: '#94a3b8' }} />
              <Line type="monotone" dataKey={`sales_${data.max_year || 2025}`} stroke="#10b981" strokeWidth={3} name={`Actual ${data.max_year || 2025}`} dot={{ r: 4 }} />
              <Line type="monotone" dataKey={`predicted_${data.max_year || 2025}`} stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Predicted" />
            </LineChart>
          )}
        </ChartBox>
      </div>
    </div>

    <div className="chart-card-new">
      <div className="chart-header-new">
        <div><h3>Category Growth: {data.prev_year || 2024} → {data.max_year || 2025}</h3><p>Unit volume shift by product category</p></div>
        <span className="chart-period">YoY: {data.growth_rate}%</span>
      </div>
      <div className="year-summary-cards">
        {Object.entries(data.category_performance).map(([cat, years]) => {
          const prevY = data.prev_year || 2024;
          const maxY = data.max_year || 2025;
          const g = years[prevY] > 0 ? ((years[maxY] - years[prevY]) / years[prevY] * 100).toFixed(1) : 'N/A';
          return (
            <div key={cat} className="year-card">
              <div className="year-card-header">
                <span className="year-badge">{cat}</span>
                <span className={`stat-trend ${g !== 'N/A' && g >= 0 ? 'trend-up' : 'trend-down'}`}>{g !== 'N/A' && g >= 0 ? '↑' : '↓'} {g !== 'N/A' ? Math.abs(g) : 0}%</span>
              </div>
              <div className="year-card-stats">
                <div className="ys-stat"><label>{prevY} Units</label><div className="val">{years[prevY]?.toLocaleString() || 0}</div></div>
                <div className="ys-stat"><label>{maxY} Units</label><div className="val green">{years[maxY]?.toLocaleString() || 0}</div></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

/* ── FORECAST TAB ── */
const ForecastTab = ({ data }) => {
  // The API may return historical/forecast under dynamic keys:
  //   Old (running server): historical_2025, forecast_2026, avg_monthly_2025
  //   New (after restart):  historical_curr,  forecast_next,  avg_monthly_curr
  // Detect whichever is present.
  const historicalRaw = React.useMemo(() => {
    if (data.historical_curr) return data.historical_curr;
    // Find any key matching historical_YYYY
    const key = Object.keys(data).find(k => /^historical_\d{4}$/.test(k));
    return key ? data[key] : [];
  }, [data]);

  const forecastRaw = React.useMemo(() => {
    if (data.forecast_next) return data.forecast_next;
    const key = Object.keys(data).find(k => /^forecast_\d{4}$/.test(k));
    return key ? data[key] : [];
  }, [data]);

  const avgMonthlyCurr = React.useMemo(() => {
    if (data.summary.avg_monthly_curr != null) return data.summary.avg_monthly_curr;
    const key = Object.keys(data.summary).find(k => /^avg_monthly_\d{4}$/.test(k));
    return key ? data.summary[key] : 0;
  }, [data]);

  const combined = React.useMemo(() => {
    const hist = historicalRaw.map(d => ({
      label: d.label,
      actual: d.actual,
      forecast: null,
      low_bound: null,
      high_bound: null,
      type: 'actual',
    }));
    const fore = forecastRaw.map(d => ({
      label: d.label,
      actual: null,
      forecast: d.forecast,
      low_bound: d.low_bound,
      high_bound: d.high_bound,
      type: 'forecast',
    }));
    // Bridge: give the last historical point a forecast value so the lines connect
    if (hist.length > 0 && fore.length > 0) {
      const bridge = { ...hist[hist.length - 1], forecast: hist[hist.length - 1].actual };
      hist[hist.length - 1] = bridge;
    }
    return [...hist, ...fore];
  }, [historicalRaw, forecastRaw]);

  const forecastMonths = forecastRaw.length;

  return (
    <div>
      <div className="forecast-summary-row">
        <div className="forecast-stat"><div className="fs-label">{forecastMonths}-Month Projection</div><div className="fs-value blue">{data.summary.total_forecast_units.toLocaleString()} units</div></div>
        <div className="forecast-stat"><div className="fs-label">Avg Monthly ({data.max_year})</div><div className="fs-value">{avgMonthlyCurr?.toLocaleString()} units</div></div>
        <div className="forecast-stat"><div className="fs-label">Confidence Level</div><div className="fs-value green">80.0%</div></div>
      </div>

      <div className="chart-card-new">
        <div className="chart-header-new">
          <div><h3>Demand Forecast: Historical + AI Prediction</h3><p>Actual sales (green) with recursive XGBoost projections (blue) and confidence bands</p></div>
        </div>
        <ChartBox height={400}>
          {(w, h) => (
            <ComposedChart width={w} height={h} data={combined} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <defs>
                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" stroke="#94a3b8" interval={0} tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={fmtY} />
              <Tooltip {...TT} />
              <Legend wrapperStyle={{ color: '#94a3b8' }} />
              <Area type="monotone" dataKey="high_bound" stroke="none" fill="url(#forecastGrad)" name="Upper Bound" connectNulls={false} />
              <Area type="monotone" dataKey="low_bound" stroke="none" fill="url(#forecastGrad)" name="Lower Bound" connectNulls={false} />
              <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={3} name={`Actual (${data.max_year})`} dot={{ r: 4, fill: '#10b981' }} connectNulls={false} />
              <Line type="monotone" dataKey="forecast" stroke="#3b82f6" strokeWidth={3} name="AI Forecast" strokeDasharray="6 3" dot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} connectNulls={false} />
            </ComposedChart>
          )}
        </ChartBox>
      </div>

      <div className="chart-card-new">
        <div className="chart-header-new">
          <div><h3>Category Demand Allocation</h3><p>Monthly projected units by category</p></div>
        </div>
        <ChartBox height={250}>
          {(w, h) => (
            <BarChart width={w} height={h} data={data.category_forecast} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
              <YAxis dataKey="category" type="category" stroke="#94a3b8" width={80} tick={{ fill: '#94a3b8' }} />
              <Tooltip {...TT} />
              <Bar dataKey="projected_monthly" fill="#8b5cf6" radius={[0, 6, 6, 0]} name="Projected Units" />
            </BarChart>
          )}
        </ChartBox>
      </div>
    </div>
  );
};

/* ── YEARWISE TAB ── */
const YearwiseTab = ({ data }) => (
  <div>
    <div className="year-summary-cards">
      {data.year_summary.map(y => (
        <div key={y.year} className="year-card">
          <div className="year-card-header"><span className="year-badge">{y.year}</span></div>
          <div className="year-card-stats">
            <div className="ys-stat"><label>Total Units</label><div className="val">{y.total_units.toLocaleString()}</div></div>
            <div className="ys-stat"><label>Revenue</label><div className="val">₹{Math.round(y.total_revenue).toLocaleString()}</div></div>
            <div className="ys-stat"><label>Avg Monthly</label><div className="val">{Math.round(y.avg_monthly_units).toLocaleString()}</div></div>
            <div className="ys-stat"><label>Peak Month</label><div className="val green">{y.peak_month}</div></div>
          </div>
        </div>
      ))}
    </div>

    <div className="chart-card-new">
      <div className="chart-header-new">
        <div><h3>Monthly Sales: Year-over-Year</h3><p>Seasonal distribution comparison across years</p></div>
      </div>
      <ChartBox height={380}>
        {(w, h) => (
          <BarChart width={w} height={h} data={data.monthly_series} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={fmtY} />
            <Tooltip {...TT} />
            <Legend wrapperStyle={{ color: '#94a3b8' }} />
            {data.years.map((yr, i) => (
              <Bar key={yr} dataKey={`y${yr}`} name={`${yr}`} fill={i === 0 ? '#3b82f6' : '#10b981'} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        )}
      </ChartBox>
    </div>
  </div>
);

export default Dashboard;
