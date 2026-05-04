import {
  AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, ResponsiveContainer
} from "recharts";

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const value = data.final_prediction || data.expected_demand || 0;
    return (
      <div style={{
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: "8px",
        padding: "12px",
      }}>
        <p style={{ color: "#cbd5e1", marginBottom: "8px", fontSize: "0.875rem" }}>
          {data.display_name || data.item_name || `Item`}
        </p>
        <p style={{ color: "#8b5cf6", fontSize: "0.875rem" }}>
          Prediction: {Math.round(value)} units
        </p>
        {data.method && (
          <p style={{ color: "#10b981", fontSize: "0.75rem" }}>
            Method: {data.method}
          </p>
        )}
      </div>
    );
  }
  return null;
};

const ForecastChart = ({ data }) => {
  // Ensure data is always an array
  let chartData = Array.isArray(data) ? data : [];
  
  if (chartData.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '300px',
        color: '#94a3b8',
        fontSize: '14px'
      }}>
        No forecast data available
      </div>
    );
  }

  // If we have multiple items, show top 10 by prediction
  if (chartData.length > 1) {
    chartData = chartData
      .sort((a, b) => (b.final_prediction || 0) - (a.final_prediction || 0))
      .slice(0, 10)
      .map((item, idx) => ({
        ...item,
        display_name: item.item_name ? item.item_name.substring(0, 15) : `Item ${idx + 1}`
      }));
  } else {
    // Single item - show as a bar
    chartData = chartData.map((item) => ({
      ...item,
      display_name: item.item_name || 'Forecast'
    }));
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis 
          dataKey="display_name" 
          stroke="#94a3b8"
          style={{ fontSize: "0.75rem" }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          stroke="#94a3b8"
          style={{ fontSize: "0.75rem" }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="final_prediction"
          stroke="#8b5cf6"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorDemand)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default ForecastChart;
