import React from 'react';
import './FiltersBar.css';

const FiltersBar = ({ 
  filters, 
  onFilterChange, 
  onExport, 
  predictionDate, 
  onDateChange,
  totalItems,
  filteredItems,
  budget,
  onBudgetChange,
  budgetSummary
}) => {
  const [budgetInput, setBudgetInput] = React.useState(budget ? (budget / 100000).toFixed(1) : '');

  const handleBudgetChange = (e) => {
    const value = e.target.value;
    setBudgetInput(value);
    
    if (value === '' || value === '0') {
      onBudgetChange(null);
    } else {
      const budgetInRupees = parseFloat(value) * 100000; // Convert lakhs to rupees
      onBudgetChange(budgetInRupees);
    }
  };

  return (
    <div className="filters-bar">
      <div className="filters-row">
        <div className="filter-group">
          <label htmlFor="prediction-date">Prediction Date</label>
          <input
            id="prediction-date"
            type="date"
            value={predictionDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="date-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="search">Search Items</label>
          <input
            id="search"
            type="text"
            placeholder="Search by name..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="budget">💰 Budget (Lakhs)</label>
          <input
            id="budget"
            type="number"
            placeholder="e.g., 10 for 10 lakhs"
            value={budgetInput}
            onChange={handleBudgetChange}
            min="0"
            step="0.5"
            className="budget-input"
          />
          {budgetSummary && (
            <div className="budget-info">
              ✓ {budgetSummary.itemsSelected} items | ₹{Math.round(budgetSummary.spent).toLocaleString()} spent
            </div>
          )}
        </div>

        <div className="filter-group">
          <label htmlFor="budget-strategy">Budget Strategy</label>
          <select
            id="budget-strategy"
            value={filters.budgetStrategy || 'greedy'}
            onChange={(e) => onFilterChange('budgetStrategy', e.target.value)}
            className="filter-select"
          >
            <option value="greedy">Greedy (Top demand overall)</option>
            <option value="by_category">Distribute by Category</option>
            <option value="by_group">Distribute by Group</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={filters.category}
            onChange={(e) => onFilterChange('category', e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            <option value="Grocery">Grocery</option>
            <option value="Liquor">Liquor</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="stock-status">Stock Status</label>
          <select
            id="stock-status"
            value={filters.stockStatus}
            onChange={(e) => onFilterChange('stockStatus', e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="critical">🚨 Critical</option>
            <option value="low">⚠️ Low</option>
            <option value="adequate">✅ Adequate</option>
            <option value="excess">📦 Excess</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="trend">Trend</label>
          <select
            id="trend"
            value={filters.trend}
            onChange={(e) => onFilterChange('trend', e.target.value)}
            className="filter-select"
          >
            <option value="all">All Trends</option>
            <option value="increasing">📈 Increasing</option>
            <option value="stable">➡️ Stable</option>
            <option value="decreasing">📉 Decreasing</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="sort">Sort By</label>
          <select
            id="sort"
            value={filters.sortBy}
            onChange={(e) => onFilterChange('sortBy', e.target.value)}
            className="filter-select"
          >
            <option value="priority">Priority</option>
            <option value="name">Name</option>
            <option value="demand">Demand</option>
            <option value="stock">Stock</option>
            <option value="confidence">Confidence</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Order</label>
          <button
            onClick={() => onFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
            className="sort-order-btn"
            title={filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            {filters.sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        <div className="filter-group">
          <label>&nbsp;</label>
          <button onClick={onExport} className="export-btn">
            📥 Export All Data
          </button>
        </div>
      </div>

      <div className="results-info">
        Showing {filteredItems} of {totalItems} items
        {budgetSummary && (
          <span className="budget-summary">
            | 💰 Budget: ₹{budgetSummary.budget.toLocaleString()} | Spent: ₹{budgetSummary.spent.toLocaleString()} | Remaining: ₹{budgetSummary.remaining.toLocaleString()}
            {Array.isArray(budgetSummary.groups) && budgetSummary.groups.length > 0 ? (
              <> | Split: {budgetSummary.groups.slice(0, 3).map(g => `${g.key} ₹${Math.round(g.spent).toLocaleString()}`).join(' • ')}{budgetSummary.groups.length > 3 ? ' • …' : ''}</>
            ) : null}
          </span>
        )}
      </div>
    </div>
  );
};

export default FiltersBar;
