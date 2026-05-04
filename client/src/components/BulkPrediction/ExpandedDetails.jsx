import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { getShortMonthName } from '../../utils/predictionHelpers';
import './ExpandedDetails.css';

/* Wrapper that measures its own width so Recharts never collapses */
const ChartBox = ({ height = 240, children }) => {
  const ref = React.useRef(null);
  const [w, setW] = React.useState(0);
  React.useEffect(() => {
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

const ExpandedDetails = ({ product, predictionDate }) => {
  const monthName = new Date(predictionDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const shortMonth = new Date(predictionDate).toLocaleDateString('en-US', { month: 'long' });

  // Build chart data from all_monthly_data — newest first, take 12, reverse for chronological
  const monthlyData = React.useMemo(() => {
    const raw = product.all_monthly_data || [];
    if (raw.length === 0) return [];
    return [...raw]
      .slice(0, 12)
      .reverse()
      .map(d => ({
        name: `${getShortMonthName(d.month)} '${(d.year || 2025).toString().slice(2)}`,
        sales: Math.round(d.sales || 0),
      }));
  }, [product.all_monthly_data]);

  const TT = {
    contentStyle: { backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontSize: '12px' },
  };

  return (
    <div className="expanded-details">
      <div className="details-grid">
        {/* Forecast Section */}
        <div className="detail-section forecast-section">
          <h4>📊 {monthName} Forecast</h4>
          <p className="section-subtitle">Based on historical {shortMonth} sales across all years</p>
          
          <div className="forecast-values">
            <div className="forecast-item">
              <span className="forecast-label">Lowest {shortMonth}</span>
              <span className="forecast-value">{Math.round(product.historical_stats?.min || 0)}</span>
              <span className="forecast-sublabel">units (from all years)</span>
            </div>
            
            <div className="forecast-item highlight">
              <span className="forecast-label">Predicted</span>
              <span className="forecast-value main">{Math.round(product.final_prediction)}</span>
              <span className="forecast-sublabel">units</span>
            </div>
            
            <div className="forecast-item">
              <span className="forecast-label">Highest {shortMonth}</span>
              <span className="forecast-value">{Math.round(product.historical_stats?.max || 0)}</span>
              <span className="forecast-sublabel">units (from all years)</span>
            </div>
          </div>
          
          {product.historical_stats?.avg && (
            <div className="historical-context">
              <span>Historical {shortMonth} Average: <strong>{Math.round(product.historical_stats.avg)} units</strong></span>
              <span>• Based on {product.historical_stats.count} year(s) of data</span>
            </div>
          )}
        </div>

        {/* Yearly Statistics */}
        {product.yearly_stats && product.yearly_stats.average > 0 && (
          <div className="detail-section yearly-section">
            <h4>📅 Annual Sales Range</h4>
            <p className="section-subtitle">Absolute lowest and highest sales across all months</p>
            
            <div className="yearly-values">
              <div className="yearly-item">
                <span className="yearly-label">Absolute Lowest</span>
                <span className="yearly-value">
                  {Math.round(product.all_monthly_data?.reduce((min, d) => Math.min(min, d.sales), Infinity) || 0)}
                </span>
                <span className="yearly-sublabel">units (any month)</span>
              </div>
              
              <div className="yearly-item">
                <span className="yearly-label">Yearly Average</span>
                <span className="yearly-value">{Math.round(product.yearly_stats.average)}</span>
                <span className="yearly-sublabel">units/year</span>
              </div>
              
              <div className="yearly-item">
                <span className="yearly-label">Absolute Highest</span>
                <span className="yearly-value">
                  {Math.round(product.all_monthly_data?.reduce((max, d) => Math.max(max, d.sales), 0) || 0)}
                </span>
                <span className="yearly-sublabel">units (any month)</span>
              </div>
            </div>
          </div>
        )}

        {/* ─── Interactive Graphs ─── */}
        <div className="detail-section graphs-section" style={{ gridColumn: '1 / -1', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          {/* Sales Trend Line Chart */}
          <div style={{ flex: '1 1 400px', minWidth: '300px' }}>
            <h4>📈 Sales Trend (Last 12 Months)</h4>
            {monthlyData.length > 0 ? (
              <div style={{ marginTop: '1rem', background: 'rgba(15,23,42,0.3)', borderRadius: '8px', padding: '1rem' }}>
                <ChartBox height={240}>
                  {(w, h) => (
                    <LineChart width={w} height={h} data={monthlyData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#94a3b8' }} tickMargin={8} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fill: '#94a3b8' }} width={40} />
                      <Tooltip {...TT} />
                      <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#0f172a' }} activeDot={{ r: 6 }} name="Units Sold" />
                    </LineChart>
                  )}
                </ChartBox>
              </div>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', background: 'rgba(15,23,42,0.3)', borderRadius: '8px', marginTop: '1rem' }}>
                No historical data available
              </div>
            )}
          </div>
          
          {/* Monthly Breakdown Bar Chart */}
          <div style={{ flex: '1 1 400px', minWidth: '300px' }}>
            <h4>📊 Monthly Breakdown</h4>
            {monthlyData.length > 0 ? (
              <div style={{ marginTop: '1rem', background: 'rgba(15,23,42,0.3)', borderRadius: '8px', padding: '1rem' }}>
                <ChartBox height={240}>
                  {(w, h) => (
                    <BarChart width={w} height={h} data={monthlyData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#94a3b8' }} tickMargin={8} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fill: '#94a3b8' }} width={40} />
                      <Tooltip {...TT} cursor={{ fill: '#1e293b' }} />
                      <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} name="Units Sold" />
                    </BarChart>
                  )}
                </ChartBox>
              </div>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', background: 'rgba(15,23,42,0.3)', borderRadius: '8px', marginTop: '1rem' }}>
                No historical data available
              </div>
            )}
          </div>
        </div>

        {/* Monthly Sales History Table */}
        {product.all_monthly_data && product.all_monthly_data.length > 0 && (
          <div className="detail-section history-section">
            <h4>📊 Monthly Sales History</h4>
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Units Sold</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {product.all_monthly_data.slice(0, 12).map((data, idx) => {
                    const isRecent = idx < 3;
                    const avgSales = product.historical_stats?.avg || 0;
                    
                    return (
                      <tr key={idx} className={isRecent ? 'recent-row' : ''}>
                        <td>{getShortMonthName(data.month)} {data.year}</td>
                        <td className="units-cell">{Math.round(data.sales)} units</td>
                        <td>
                          {isRecent && <span className="badge recent-badge">Recent</span>}
                          {data.sales > avgSales && <span className="badge above-badge">Above Avg</span>}
                          {data.sales < avgSales && <span className="badge below-badge">Below Avg</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpandedDetails;
