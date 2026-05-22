import React from 'react';
import './SummaryCards.css';

const SummaryCards = ({ summary, loading }) => {
  if (loading) {
    return (
      <div className="summary-cards">
        <div className="summary-card skeleton">
          <div className="skeleton-text"></div>
        </div>
        <div className="summary-card skeleton">
          <div className="skeleton-text"></div>
        </div>
        <div className="summary-card skeleton">
          <div className="skeleton-text"></div>
        </div>
        <div className="summary-card skeleton">
          <div className="skeleton-text"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="summary-cards">
      <div className="summary-card">
        <div className="card-icon">📦</div>
        <div className="card-content">
          <div className="card-label">Total Items</div>
          <div className="card-value">{summary.totalItems}</div>
          <div className="card-detail">
            <span className="critical-badge">{summary.criticalItems} Critical</span>
            <span className="low-badge">{summary.lowStockItems} Low</span>
          </div>
        </div>
      </div>

      <div className="summary-card">
        <div className="card-icon">📊</div>
        <div className="card-content">
          <div className="card-label">Total Demand</div>
          <div className="card-value">{summary.totalDemand.toLocaleString()}</div>
          <div className="card-detail">
            Current Stock: {summary.totalStock.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="summary-card">
        <div className="card-icon">📈</div>
        <div className="card-content">
          <div className="card-label">Trends</div>
          <div className="card-value">{summary.increasingTrend}</div>
          <div className="card-detail">
            <span>↗️ {summary.increasingTrend}</span>
            <span>➡️ {summary.stableTrend}</span>
            <span>↘️ {summary.decreasingTrend}</span>
          </div>
        </div>
      </div>

      <div className="summary-card">
        <div className="card-icon">💰</div>
        <div className="card-content">
          <div className="card-label">Est. Order Value</div>
          <div className="card-value">₹{Math.round(summary.totalOrderValue).toLocaleString()}</div>
          <div className="card-detail">
            {summary.totalItems} items to restock
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryCards;
