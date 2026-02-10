import {
  AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, ResponsiveContainer
} from "recharts";

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: "8px",
        padding: "12px",
      }}>
        <p style={{ color: "#cbd5e1", marginBottom: "8px", fontSize: "0.875rem" }}>
          Week {payload[0].payload.week}
        </p>
        <p style={{ color: "#8b5cf6", fontSize: "0.875rem" }}>
          Expected: {payload[0].value} units
        </p>
      </div>
    );
  }
  return null;
};

const ForecastChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis 
          dataKey="week" 
          stroke="#94a3b8"
          style={{ fontSize: "0.75rem" }}
        />
        <YAxis 
          stroke="#94a3b8"
          style={{ fontSize: "0.75rem" }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="expected_demand"
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
