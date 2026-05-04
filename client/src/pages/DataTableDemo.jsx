import React, { useState, useCallback, useEffect } from 'react';
import ScalableDataTable from '../components/DataTable/ScalableDataTable';
import {
  PredictPreviousYearsModal,
  PredictLastNMonthsModal,
  ExportModal
} from '../components/DataTable/PredictionModals';
import { exportToCSV, exportPredictionReport } from '../utils/exportUtils';
import LoadingSpinner from '../components/LoadingSpinner';
import './DataTableDemo.css';

const DataTableDemo = () => {
  const [data, setData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalRecords, setTotalRecords] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Modal states
  const [showPreviousYearsModal, setShowPreviousYearsModal] = useState(false);
  const [showLastNMonthsModal, setShowLastNMonthsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [predictionLoading, setPredictionLoading] = useState(false);

  // Table columns
  const columns = [
    { key: 'item_name', label: 'Product Name', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'current_stock', label: 'Current Stock', type: 'number', sortable: true },
    { key: 'final_prediction', label: 'Predicted Demand', type: 'number', sortable: true },
    { key: 'recommended_order', label: 'Recommended Order', type: 'number', sortable: true },
    { key: 'price', label: 'Unit Price', type: 'currency', sortable: true },
    { key: 'confidence', label: 'Confidence', type: 'percentage', sortable: true }
  ];

  const loadData = useCallback(async (page) => {
    try {
      setIsLoading(page === 1);
      setIsLoadingMore(page > 1);

      // Simulate API call - replace with actual API
      const response = await fetch(
        `/api/predict-paginated?page=${page}&page_size=${pageSize}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prediction_date: new Date().toISOString().split('T')[0] })
        }
      );

      const result = await response.json();

      if (page === 1) {
        setData(result.predictions || []);
      } else {
        setData(prev => [...prev, ...(result.predictions || [])]);
      }

      setTotalRecords(result.pagination?.total_items || 0);
      setHasMore(result.pagination?.has_next || false);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [pageSize]);

  // Load initial data
  useEffect(() => {
    loadData(1);
  }, [loadData]);

  const handleLoadMore = useCallback((nextPage) => {
    loadData(nextPage);
  }, [loadData]);

  const handleExport = (exportData) => {
    const filename = `predictions-${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(exportData, filename);
  };

  const handlePredictPreviousYears = async (params) => {
    setPredictionLoading(true);
    try {
      // Get selected items from data
      const items = data.map(d => d.item_name);

      // Call API
      const response = await fetch('/api/predict-previous-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          target_date: params.date
        })
      });

      const predictions = await response.json();

      // Export report
      exportPredictionReport(predictions, 'previous_years', 'csv');

      alert(`Generated predictions for ${predictions.length} items`);
    } catch (error) {
      console.error('Prediction failed:', error);
      alert('Failed to generate predictions');
    } finally {
      setPredictionLoading(false);
    }
  };

  const handlePredictLastNMonths = async (params) => {
    setPredictionLoading(true);
    try {
      // Get selected items from data
      const items = data.map(d => d.item_name);

      // Call API
      const response = await fetch('/api/predict-last-n-months', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          n_months: params.months
        })
      });

      const predictions = await response.json();

      // Export report
      exportPredictionReport(predictions, 'last_n_months', 'csv');

      alert(`Generated predictions for ${predictions.length} items`);
    } catch (error) {
      console.error('Prediction failed:', error);
      alert('Failed to generate predictions');
    } finally {
      setPredictionLoading(false);
    }
  };

  return (
    <div className="data-table-demo">
      <div className="demo-header">
        <h1>📊 Scalable Data Table System</h1>
        <p>High-performance table with pagination, infinite scroll, and advanced predictions</p>
      </div>

      {isLoading && <LoadingSpinner message="Loading predictions..." />}

      {!isLoading && (
        <>
          <ScalableDataTable
            data={data}
            columns={columns}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
            isLoading={isLoadingMore}
            totalRecords={totalRecords}
            currentPage={currentPage}
            pageSize={pageSize}
            onExport={handleExport}
            onPredictPreviousYears={() => setShowPreviousYearsModal(true)}
            onPredictLastNMonths={() => setShowLastNMonthsModal(true)}
          />

          {/* Modals */}
          <PredictPreviousYearsModal
            isOpen={showPreviousYearsModal}
            onClose={() => setShowPreviousYearsModal(false)}
            onSubmit={handlePredictPreviousYears}
            isLoading={predictionLoading}
          />

          <PredictLastNMonthsModal
            isOpen={showLastNMonthsModal}
            onClose={() => setShowLastNMonthsModal(false)}
            onSubmit={handlePredictLastNMonths}
            isLoading={predictionLoading}
          />

          <ExportModal
            isOpen={showExportModal}
            onClose={() => setShowExportModal(false)}
            onSubmit={() => {
              // Handle export with options
              handleExport(data);
              setShowExportModal(false);
            }}
            isLoading={false}
            totalRecords={totalRecords}
          />
        </>
      )}

      {/* Features Overview */}
      <div className="features-section">
        <h2>✨ Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>High Performance</h3>
            <p>Loads 50 records instantly with infinite scroll for seamless browsing</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Advanced Sorting</h3>
            <p>Click column headers to sort by any field - numbers, text, currency</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">✅</div>
            <h3>Row Selection</h3>
            <p>Select individual rows or all visible rows for batch operations</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📅</div>
            <h3>Previous Years Prediction</h3>
            <p>Analyze same month across all years to forecast demand accurately</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📈</div>
            <h3>Last N Months Prediction</h3>
            <p>Use recent trends to predict future demand with confidence scores</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📥</div>
            <h3>Smart Export</h3>
            <p>Export all data with filters, analytics, and detailed reports</p>
          </div>
        </div>
      </div>

      {/* Performance Tips */}
      <div className="tips-section">
        <h2>💡 Performance Tips</h2>
        <ul>
          <li>Initial load shows 50 records for instant display</li>
          <li>Scroll to bottom automatically loads next batch</li>
          <li>Debouncing prevents duplicate API calls</li>
          <li>Sorting happens client-side for visible data</li>
          <li>Export fetches all data in background</li>
          <li>Predictions run asynchronously without blocking UI</li>
        </ul>
      </div>
    </div>
  );
};

export default DataTableDemo;
