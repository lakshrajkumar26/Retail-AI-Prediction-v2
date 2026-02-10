import {
  LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, ResponsiveContainer, Legend
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
          {payload[0].payload.date}
        </p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color, fontSize: "0.875rem" }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const HistoryChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis 
          dataKey="date" 
          stroke="#94a3b8"
          style={{ fontSize: "0.75rem" }}
        />
        <YAxis 
          stroke="#94a3b8"
          style={{ fontSize: "0.75rem" }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ fontSize: "0.875rem", color: "#cbd5e1" }}
        />
        <Line
          dataKey="units_sold_7d"
          stroke="#6366f1"
          strokeWidth={2}
          name="Actual Sales"
          dot={{ fill: "#6366f1", r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          dataKey="predicted"
          stroke="#10b981"
          strokeWidth={2}
          name="Predicted Sales"
          dot={{ fill: "#10b981", r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default HistoryChart;
