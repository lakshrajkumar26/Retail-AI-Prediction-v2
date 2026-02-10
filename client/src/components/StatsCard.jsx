import "./StatsCard.css";

const StatsCard = ({ title, value, icon, trend, trendUp }) => {
  return (
    <div className="stats-card">
      <div className="stats-header">
        <span className="stats-title">{title}</span>
        <span className="stats-icon">{icon}</span>
      </div>
      <div className="stats-value">{value}</div>
      {trend && (
        <div className={`stats-trend ${trendUp ? "trend-up" : "trend-down"}`}>
          <span>{trendUp ? "↑" : "↓"}</span>
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
};

export default StatsCard;
