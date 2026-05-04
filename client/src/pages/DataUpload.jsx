import { useState, useEffect } from "react";
import { getDataFormat, uploadMonthlyData, retrainModel } from "../api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./DataUpload.css";

const DataUpload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [retrainResult, setRetrainResult] = useState(null);
  const [dataFormat, setDataFormat] = useState(null);
  const [showFormatPreview, setShowFormatPreview] = useState(true);
  const [modelHealth, setModelHealth] = useState(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  
  // Form fields
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedCategory, setSelectedCategory] = useState("Grocery");
  
  useEffect(() => {
    loadDataFormat();
    checkModelHealth();
    
    // Set up health check every 30 seconds
    const healthCheckInterval = setInterval(checkModelHealth, 30000);
    return () => clearInterval(healthCheckInterval);
  }, []);

  const loadDataFormat = async () => {
    try {
      const data = await getDataFormat();
      setDataFormat(data);
    } catch (error) {
      console.error("Failed to load data format:", error);
    }
  };

  const checkModelHealth = async () => {
    setCheckingHealth(true);
    try {
      const baseURL = window.location.port === '5016' 
        ? '/api'  // Docker - use nginx proxy
        : 'http://localhost:8002';  // Local dev - direct to backend
      
      const response = await fetch(`${baseURL}/health`);
      const data = await response.json();
      const isHealthy = data.status === "healthy";
      setModelHealth({
        status: data.status,
        message: isHealthy
          ? "Model API is healthy"
          : (data.startup_error ? `Model not ready: ${data.startup_error}` : "Model API not ready"),
        timestamp: new Date().toLocaleTimeString(),
        isHealthy
      });
    } catch {
      setModelHealth({
        status: "error",
        message: "Model API not responding",
        timestamp: new Date().toLocaleTimeString(),
        isHealthy: false
      });
    } finally {
      setCheckingHealth(false);
    }
  };

  const checkUploadedFiles = async () => {
    try {
      const baseURL = window.location.port === '5016' 
        ? '/api'  // Docker - use nginx proxy
        : 'http://localhost:8002';  // Local dev - direct to backend
      
      const response = await fetch(`${baseURL}/data-preview?limit=10`);
      const data = await response.json();
      console.log("📁 Files in data directory:", data);
      alert(`Data Preview:\n\nTotal Records: ${data.total || 0}\n\nColumns: ${data.columns?.join(', ') || 'N/A'}\n\nSample records loaded successfully`);
    } catch (error) {
      console.error("Error checking files:", error);
      alert("Error checking files. Check console for details.");
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = [
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/csv",
        "application/csv",
        "text/comma-separated-values"
      ];
      if (validTypes.includes(selectedFile.type) || 
          selectedFile.name.endsWith('.xlsx') || 
          selectedFile.name.endsWith('.xls') ||
          selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setUploadResult(null);
      } else {
        setUploadResult({ error: "Please select an Excel (.xls, .xlsx) or CSV (.csv) file" });
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadResult({ error: "Please select a file first" });
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      console.log("Starting upload with:", {
        filename: file.name,
        year: selectedYear,
        month: selectedMonth,
        category: selectedCategory
      });
      
      const result = await uploadMonthlyData(file, selectedYear, selectedMonth, selectedCategory);
      
      console.log("Upload result:", result);
      setUploadResult({
        ...result,
        success: result.status === "success",
        filename: file.name,
        year: selectedYear,
        month: selectedMonth,
        category: selectedCategory
      });
      
      if (result.status === "success") {
        setFile(null);
        document.getElementById("file-input").value = "";
      }
    } catch (error) {
      console.error("Upload error details:", error);
      const errorMessage = error.response?.data?.error || error.message || "Failed to upload file";
      setUploadResult({ error: errorMessage });
    } finally {
      setUploading(false);
    }
  };

  const handleRetrain = async () => {
    if (!confirm("This will reload all data and update predictions. This may take 1-2 minutes. Continue?")) {
      return;
    }

    setRetraining(true);
    setRetrainResult(null);

    try {
      console.log("[RETRAIN] Starting model retraining...");
      const result = await retrainModel();
      console.log("[RETRAIN] Retrain completed:", result);
      setRetrainResult(result);
      
      // Refresh model health after successful retrain
      if (result.status === "success" || result.status === "info") {
        setTimeout(() => checkModelHealth(), 2000);
      }
    } catch (error) {
      console.error("[RETRAIN] Retrain failed:", error);
      setRetrainResult({ 
        error: error.response?.data?.error || error.message || "Failed to retrain model. The process may have timed out, but retraining might still be in progress. Check model health status." 
      });
    } finally {
      setRetraining(false);
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="data-upload-page">
      <div className="page-header">
        <h1>📤 Data Upload & Model Training</h1>
        <p className="subtitle">
          Upload monthly sales data and retrain the AI model with latest information
        </p>
      </div>

      {/* Model Health Status */}
      {modelHealth && (
        <div className={`model-health-card ${modelHealth.isHealthy ? 'healthy' : 'unhealthy'}`}>
          <div className="health-content">
            <span className="health-icon">{modelHealth.isHealthy ? '✅' : '❌'}</span>
            <div className="health-info">
              <h3>Model Status</h3>
              <p>{modelHealth.message}</p>
              <span className="health-time">Last checked: {modelHealth.timestamp}</span>
            </div>
          </div>
          <button 
            onClick={checkModelHealth}
            disabled={checkingHealth}
            className="btn-secondary btn-small"
          >
            {checkingHealth ? "Checking..." : "Check Now"}
          </button>
          <button 
            onClick={checkUploadedFiles}
            className="btn-secondary btn-small"
          >
            📁 Check Files
          </button>
        </div>
      )}

      {/* Format Preview Section - Always Visible */}
      <div className="format-preview-card">
        <div className="format-header">
          <h2>📋 Expected Excel Format</h2>
          <button 
            className="btn-secondary"
            onClick={() => setShowFormatPreview(!showFormatPreview)}
          >
            {showFormatPreview ? "Hide Format" : "Show Format"}
          </button>
        </div>

        {showFormatPreview && dataFormat && (
          <div className="format-content">
            <div className="format-info">
              <div className="info-box">
                <h3>📄 File Requirements</h3>
                <ul>
                  <li><strong>Format:</strong> Excel or CSV files</li>
                  <li><strong>File Types:</strong> .xls, .xlsx, .csv</li>
                  <li><strong>One file per month</strong> - System will overwrite existing data</li>
                  <li><strong>Naming:</strong> Use format like "06 JUN.xls", "sale jun 24.xlsx", or "march_2026.csv"</li>
                </ul>
              </div>

              <div className="info-box">
                <h3>📊 Required Columns (15 total)</h3>
                <div className="columns-grid">
                  {dataFormat?.required_columns?.map((col, idx) => (
                    <div key={idx} className="column-item">
                      <strong>{col.name}</strong>
                      <span className="column-type">{col.type}</span>
                      <p>{col.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="sample-data-section">
              <h3>📝 Sample Data Row</h3>
              <div className="sample-table-wrapper">
                <table className="sample-table">
                  <thead>
                    <tr>
                      {dataFormat?.sample_data?.[0] && Object.keys(dataFormat.sample_data[0]).map((key, idx) => (
                        <th key={idx}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {dataFormat?.sample_data?.[0] && Object.values(dataFormat.sample_data[0]).map((val, idx) => (
                        <td key={idx}>{val}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="important-notes">
              <h3>⚠️ Important Notes</h3>
              <ul>
                {dataFormat?.notes?.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Upload Section */}
      <div className="upload-section-grid">
        <div className="upload-card">
          <h2>📁 Upload Monthly Sales Data</h2>
          <p className="card-description">
            Upload Excel file with monthly sales data. Select the year, month, and category for the data you're uploading.
          </p>

          <div className="upload-form">
            <div className="form-row">
              <div className="form-group">
                <label>Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="form-input"
                >
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                </select>
              </div>

              <div className="form-group">
                <label>Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="form-input"
                >
                  {monthNames.map((month, idx) => (
                    <option key={idx} value={idx + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="form-input"
                >
                  <option value="Grocery">Grocery</option>
                  <option value="Liquor">Liquor</option>
                </select>
              </div>
            </div>

            <div className="upload-info-banner">
              <span className="info-icon">ℹ️</span>
              <span>
                Uploading data for: <strong>{monthNames[selectedMonth - 1]} {selectedYear}</strong> - <strong>{selectedCategory}</strong>
              </span>
            </div>

            <div className="upload-area">
              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="file-input"
              />
              <label htmlFor="file-input" className="file-label">
                <span className="upload-icon">📄</span>
                <span className="upload-text">
                  {file ? file.name : "Click to select Excel or CSV file"}
                </span>
                <span className="upload-hint">Excel (.xls, .xlsx) or CSV (.csv) files</span>
              </label>
            </div>

            {file && (
              <div className="file-info">
                <div className="file-details">
                  <span className="file-name">📎 {file.name}</span>
                  <span className="file-size">
                    {(file.size / 1024).toFixed(2)} KB
                  </span>
                </div>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="btn-primary"
                >
                  {uploading ? "Uploading..." : "Upload Data"}
                </button>
              </div>
            )}

            {uploading && <LoadingSpinner message="Uploading monthly data..." />}

            {uploadResult && (
              <div
                className={`result-box ${
                  uploadResult.success ? "success" : "error"
                }`}
              >
                {uploadResult.success ? (
                  <>
                    <h3>✅ Upload Successful!</h3>
                    <div className="result-details">
                      <p><strong>File:</strong> {uploadResult.filename}</p>
                      <p><strong>Period:</strong> {monthNames[uploadResult.month - 1]} {uploadResult.year}</p>
                      <p><strong>Category:</strong> {uploadResult.category}</p>
                      <p className="success-message">{uploadResult.message}</p>
                      <p className="note-message">{uploadResult.note}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <h3>❌ Upload Failed</h3>
                    <p className="error-message">{uploadResult.error}</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Retrain Model Section */}
        <div className="retrain-card">
          <h2>🤖 Retrain AI Model</h2>
          <p className="card-description">
            After uploading new data, retrain the model to update all predictions with the latest information.
          </p>

          <div className="retrain-info">
            <div className="info-item">
              <span className="info-icon">🔄</span>
              <div>
                <h4>What happens during retraining?</h4>
                <ul>
                  <li>Reloads all Excel files from data folder</li>
                  <li>Processes and analyzes all sales records</li>
                  <li>Updates item profiles and patterns</li>
                  <li>Recalculates seasonal factors and trends</li>
                  <li>Updates all predictions immediately</li>
                </ul>
              </div>
            </div>

            <div className="info-item">
              <span className="info-icon">⏱️</span>
              <div>
                <h4>Processing Time</h4>
                <p>Retraining takes 30-60 seconds to process all data. The system will remain available during this time.</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleRetrain}
            disabled={retraining}
            className="btn-primary btn-large"
          >
            {retraining ? "⏳ Retraining Model... (This may take 1-2 minutes)" : "🔄 Retrain Model with Latest Data"}
          </button>

          {retraining && (
            <div className="retrain-progress">
              <LoadingSpinner message="Retraining model with latest data... This may take 1-2 minutes" />
              <div className="progress-info">
                <p>✓ Loading all data from database</p>
                <p>✓ Engineering features</p>
                <p>✓ Training XGBoost model</p>
                <p>✓ Evaluating model performance</p>
                <p>⏳ Please wait, do not refresh the page...</p>
              </div>
            </div>
          )}

          {retrainResult && (
            <div
              className={`result-box ${
                retrainResult.status === "success" || retrainResult.status === "info" ? "success" : "error"
              }`}
            >
              {retrainResult.status === "success" || retrainResult.status === "info" ? (
                <>
                  <h3>{retrainResult.status === "success" ? "✅ Model Retrained Successfully!" : "ℹ️ Retrain Info"}</h3>
                  <div className="result-details">
                    <p className="success-message">{retrainResult.message}</p>
                    {retrainResult.note && <p className="note-message">{retrainResult.note}</p>}
                  </div>
                </>
              ) : (
                <>
                  <h3>❌ Retraining Failed</h3>
                  <p className="error-message">{retrainResult.error}</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="instructions-card">
        <h2>📋 Step-by-Step Instructions</h2>
        <div className="instructions-content">
          <div className="instruction-step">
            <span className="step-number">1</span>
            <div>
              <h3>Prepare Your Data File</h3>
              <p>
                Ensure your file (Excel .xls/.xlsx or CSV .csv) follows the required format (click "Show Format" above to see details).
                The file should contain all required columns, especially <strong>Net_Qty</strong> which contains actual units sold.
                CSV files should be comma-separated with headers in the first row.
              </p>
            </div>
          </div>

          <div className="instruction-step">
            <span className="step-number">2</span>
            <div>
              <h3>Select Period and Category</h3>
              <p>
                Choose the year, month, and category (Grocery or Liquor) for the data you're uploading.
                The system will save the file in the correct location and overwrite any existing data for that period.
              </p>
            </div>
          </div>

          <div className="instruction-step">
            <span className="step-number">3</span>
            <div>
              <h3>Upload the File</h3>
              <p>
                Click the upload area to select your Excel or CSV file, then click "Upload Data".
                The system will validate and save your file to the appropriate folder.
              </p>
            </div>
          </div>

          <div className="instruction-step">
            <span className="step-number">4</span>
            <div>
              <h3>Retrain the Model</h3>
              <p>
                After uploading new data, click "Retrain Model" to update all predictions.
                This will reload all data files and recalculate patterns, trends, and forecasts.
              </p>
            </div>
          </div>

          <div className="instruction-step">
            <span className="step-number">5</span>
            <div>
              <h3>View Updated Predictions</h3>
              <p>
                Go to the "Bulk Order Predictions" page to see updated forecasts based on your new data.
                All predictions will now reflect the latest sales patterns and trends.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="tips-card">
        <h2>💡 Quick Tips</h2>
        <div className="tips-grid">
          <div className="tip-item">
            <span className="tip-icon">📅</span>
            <div>
              <h4>Monthly Updates</h4>
              <p>Upload data at the end of each month to keep predictions accurate and up-to-date.</p>
            </div>
          </div>
          <div className="tip-item">
            <span className="tip-icon">🔄</span>
            <div>
              <h4>Overwrite Protection</h4>
              <p>Uploading data for the same month/year/category will replace the existing file - use this to correct errors.</p>
            </div>
          </div>
          <div className="tip-item">
            <span className="tip-icon">📊</span>
            <div>
              <h4>Data Quality</h4>
              <p>Ensure Net_Qty column is accurate - this is the most important field for predictions.</p>
            </div>
          </div>
          <div className="tip-item">
            <span className="tip-icon">⚡</span>
            <div>
              <h4>Immediate Effect</h4>
              <p>After retraining, all predictions update immediately - no need to restart the system.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataUpload;
