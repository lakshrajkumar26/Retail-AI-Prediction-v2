import { useState, useEffect, useRef, useMemo } from 'react';
import './ScalableDataTable.css';

const ScalableDataTable = ({
  data = [],
  columns = [],
  onLoadMore,
  hasMore = false,
  isLoading = false,
  totalRecords = 0,
  currentPage = 1,
  onExport,
  onPredictPreviousYears,
  onPredictLastNMonths,
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [selectedRows, setSelectedRows] = useState(new Set());
  const observerTarget = useRef(null);
  const tableBodyRef = useRef(null);
  const requestLockRef = useRef(false);

  const displayedData = useMemo(() => {
    const sorted = [...data];
    if (!sortConfig.key) return sorted;

    sorted.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal ?? '').toLowerCase();
      const bStr = String(bVal ?? '').toLowerCase();
      return sortConfig.direction === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });

    return sorted;
  }, [data, sortConfig]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !requestLockRef.current) {
          requestLockRef.current = true;
          
          // Debounce: wait 300ms before allowing next request
          setTimeout(() => {
            requestLockRef.current = false;
          }, 300);
          
          onLoadMore?.(currentPage + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, currentPage, onLoadMore]);

  // Handle sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Handle row selection
  const handleSelectRow = (rowId) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowId)) {
      newSelected.delete(rowId);
    } else {
      newSelected.add(rowId);
    }
    setSelectedRows(newSelected);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedRows.size === displayedData.length) {
      setSelectedRows(new Set());
    } else {
      const allIds = new Set(displayedData.map((_, idx) => idx));
      setSelectedRows(allIds);
    }
  };

  // Format cell value
  const formatCellValue = (value, column) => {
    if (value === null || value === undefined) return '-';

    if (column.type === 'currency') {
      return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    }

    if (column.type === 'number') {
      return Number(value).toLocaleString('en-IN');
    }

    if (column.type === 'percentage') {
      return `${Number(value).toFixed(2)}%`;
    }

    if (column.type === 'date') {
      return new Date(value).toLocaleDateString('en-IN');
    }

    if (column.type === 'status') {
      const statusColors = {
        'CRITICAL': '#ef4444',
        'LOW': '#f59e0b',
        'ADEQUATE': '#10b981',
        'EXCESS': '#6366f1'
      };
      return (
        <span className="status-badge" style={{ backgroundColor: statusColors[value] || '#94a3b8' }}>
          {value}
        </span>
      );
    }

    return String(value);
  };

  // Get sort indicator
  const getSortIndicator = (columnKey) => {
    if (sortConfig.key !== columnKey) return ' ⇅';
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className="scalable-data-table">
      {/* Table Controls */}
      <div className="table-controls">
        <div className="controls-left">
          <span className="record-count">
            Showing {displayedData.length} of {totalRecords} records
          </span>
          {selectedRows.size > 0 && (
            <span className="selected-count">
              {selectedRows.size} selected
            </span>
          )}
        </div>

        <div className="controls-right">
          <button
            className="btn-action"
            onClick={() => onPredictPreviousYears?.()}
            title="Predict based on same month across previous years"
          >
            📅 Predict Previous Years
          </button>
          <button
            className="btn-action"
            onClick={() => onPredictLastNMonths?.()}
            title="Predict based on last N months"
          >
            📊 Predict Last N Months
          </button>
          <button
            className="btn-action"
            onClick={() => onExport?.(displayedData)}
            title="Export visible data to CSV"
          >
            📥 Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th className="checkbox-col">
                <input
                  type="checkbox"
                  checked={selectedRows.size === displayedData.length && displayedData.length > 0}
                  onChange={handleSelectAll}
                  title="Select all visible rows"
                />
              </th>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`sortable ${sortConfig.key === col.key ? 'sorted' : ''}`}
                  onClick={() => handleSort(col.key)}
                  title={`Click to sort by ${col.label}`}
                >
                  {col.label}
                  {col.sortable !== false && getSortIndicator(col.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody ref={tableBodyRef}>
            {displayedData.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={columns.length + 1} className="empty-cell">
                  <div className="empty-state">
                    <span className="empty-icon">📭</span>
                    <p>No data available</p>
                  </div>
                </td>
              </tr>
            ) : (
              displayedData.map((row, idx) => (
                <tr key={idx} className={selectedRows.has(idx) ? 'selected' : ''}>
                  <td className="checkbox-col">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(idx)}
                      onChange={() => handleSelectRow(idx)}
                    />
                  </td>
                  {columns.map(col => (
                    <td key={col.key} className={`col-${col.type || 'text'}`}>
                      {formatCellValue(row[col.key], col)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Loading indicator for infinite scroll */}
      {isLoading && (
        <div className="loading-more">
          <div className="spinner-small"></div>
          <span>Loading more records...</span>
        </div>
      )}

      {/* Intersection observer target */}
      <div ref={observerTarget} className="observer-target" />

      {/* End of data message */}
      {!hasMore && displayedData.length > 0 && (
        <div className="end-of-data">
          ✓ All {totalRecords} records loaded
        </div>
      )}
    </div>
  );
};

export default ScalableDataTable;
