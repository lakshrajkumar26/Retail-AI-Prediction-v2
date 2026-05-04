import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './TopItemsChart.css';

const CustomTooltip = ({ active, payload, sortBy }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-tooltip">
        <p className="tooltip-title">{data.fullName}</p>
        <p className="tooltip-value">
          {sortBy === 'total_sold' && `${data.value.toLocaleString()} units`}
          {sortBy === 'revenue' && `Rs ${Math.round(data.value).toLocaleString()}`}
        </p>
        <p className="tooltip-category">{data.category}</p>
      </div>
    );
  }
  return null;
};

const TopItemsChart = ({ items, sortBy = 'total_sold' }) => {
  if (!items || items.length === 0) {
    return (
      <div className="no-data">
        <p>No items data available</p>
      </div>
    );
  }

  const chartData = items.map((item, index) => ({
    name: item.item_name?.length > 25 ? `${item.item_name.substring(0, 25)}...` : item.item_name,
    fullName: item.item_name,
    value: item[sortBy] || 0,
    category: item.category,
    rank: index + 1,
  }));

  const getBarColor = (index) => {
    if (index === 0) return '#fbbf24';
    if (index === 1) return '#94a3b8';
    if (index === 2) return '#fb923c';
    return '#3b82f6';
  };

  return (
    <div className="top-items-chart">
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            type="number"
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            width={140}
          />
          <Tooltip content={<CustomTooltip sortBy={sortBy} />} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
          <Bar dataKey="value" radius={[0, 8, 8, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TopItemsChart;
