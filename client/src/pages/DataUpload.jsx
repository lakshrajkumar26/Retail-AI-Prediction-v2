import { useState, useEffect, useRef } from "react";
import { getDataFormat, uploadMonthlyData, retrainModel, checkHealth, getDataPreview, getTrainingStatus, reloadForecaster } from "../api";
import { modelEvents } from "../services/modelEvents";
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
  const [trainingStatusData, setTrainingStatusData] = useState({status: "idle", progress: 0, message: ""});
  const [dbStats, setDbStats] = useState(null);
  const [loadingDbStats, setLoadingDbStats] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [reloadResult, setReloadResult] = useState(null);

  // Form fields
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedCategory, setSelectedCategory] = useState("Grocery");

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Poll training status
  const prevStatus = useRef("idle");

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await getTrainingStatus();
        if (data && data.status) {
          // Detect transition to "completed" and notify all pages
          if (data.status === "completed" && prevStatus.current === "training") {
            modelEvents.notifyModelRetrained();
          }
          prevStatus.current = data.status;
          setTrainingStatusData(data);
        }
      } catch (e) {
        console.error(e);
      }
    };

    const interval = setInterval(fetchStatus, 2000);
    fetchStatus();

    return () => clearInterval(interval);
  }, []);

  // Initial load
  useEffect(() => {
    loadDataFormat();

    const performHealthCheck = async () => {
      try {
        const data = await checkHealth();
        setModelHealth({
          status: data.status,
          message: data.status === "healthy" ? "Model API is healthy" : "Model API not ready",
          timestamp: new Date().toLocaleTimeString(),
          isHealthy: data.status === "healthy"
        });
      } catch (e) {
        setModelHealth({
          status: "error",
          message: "Model API not responding",
          timestamp: new Date().toLocaleTimeString(),
          isHealthy: false
        });
      }
    };
    performHealthCheck();
  }, []);

  const loadDataFormat = async () => {
    try {
      const data = await getDataFormat();
      setDataFormat(data);
    } catch (error) {
      console.error("Failed to load data format:", error);
    }
  };

  const checkUploadedFiles = async () => {
    setLoadingDbStats(true);
    try {
      const data = await getDataPreview(10);
      setDbStats(data);
    } catch (error) {
      console.error("Error checking files:", error);
      alert("Error connecting to backend. Make sure the server is running.");
    } finally {
      setLoadingDbStats(false);
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

  const handleUpload = async (force = false) => {
    if (!file) {
      setUploadResult({ error: "Please select a file first" });
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const result = await uploadMonthlyData(file, selectedYear, selectedMonth, selectedCategory, force);

      if (result.status === "conflict") {
        setUploading(false);
        if (window.confirm(result.message)) {
          handleUpload(true);
        } else {
          setUploadResult({ error: "Upload cancelled by user" });
        }
        return;
      }

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
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Failed to upload file";
      setUploadResult({ error: errorMessage });
    } finally {
      setUploading(false);
    }
  };

  const handleRetrain = async () => {
    if (!confirm("This will run the full pipeline: Clean → Feature Engineering → XGBoost Training → Reload Model. This may take 2-5 minutes. Continue?")) {
      return;
    }

    setRetraining(true);
    setRetrainResult(null);

    try {
      const result = await retrainModel();
      setRetrainResult(result);
    } catch (error) {
      console.error("[RETRAIN] Retrain failed:", error);
      setRetrainResult({
        error: error.response?.data?.error || error.message || "Failed to retrain model. The process may have timed out, but retraining might still be in progress. Check the progress bar above."
      });
    } finally {
      setRetraining(false);
    }
  };

  const handleReloadForecaster = async () => {
    setReloading(true);
    setReloadResult(null);
    try {
      const result = await reloadForecaster();
      setReloadResult({ success: true, message: result.message });
    } catch (error) {
      setReloadResult({ success: false, message: error.response?.data?.detail || error.message || "Reload failed" });
    } finally {
      setReloading(false);
    }
  };

  return (
    <div className="data-upload-page">
      <div className="page-header">
        <h1>📤 Data Upload & Model Training</h1>
        <p className="subtitle">
          Upload one or more monthly sales files — data is stored safely in the database. When you're ready, click <strong>Retrain Model</strong> to update the AI forecasts.
        </p>
      </div>

      {/* Training Progress Banner — shows whenever training is running */}
      {(trainingStatusData.status === "training" || trainingStatusData.status === "error") && (
        <div className="model-health-card" style={{marginBottom: '20px', borderLeft: `4px solid ${trainingStatusData.status === 'error' ? '#f44336' : '#4caf50'}`}}>
          <div className="health-content" style={{width: '100%'}}>
            <span className="health-icon">{trainingStatusData.status === 'error' ? '❌' : '⚙️'}</span>
            <div className="health-info" style={{width: '100%'}}>
              <h3>{trainingStatusData.status === 'error' ? 'Training Failed' : 'Retraining in Progress'}</h3>
              <p>{trainingStatusData.message}</p>
              {trainingStatusData.status === 'training' && (
                <>
                  <div style={{width: '100%', height: '12px', backgroundColor: '#333', borderRadius: '6px', overflow: 'hidden', marginTop: '10px'}}>
                    <div style={{width: `${trainingStatusData.progress}%`, height: '100%', backgroundColor: '#4caf50', transition: 'width 0.5s ease'}}></div>
                  </div>
                  <p style={{textAlign: 'right', fontSize: '12px', marginTop: '5px', color: '#aaa'}}>{trainingStatusData.progress}% Complete</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Training Completed Banner */}
      {trainingStatusData.status === "completed" && (
        <div className="model-health-card healthy" style={{marginBottom: '20px', borderLeft: '4px solid #4caf50'}}>
          <div className="health-content">
            <span className="health-icon">✅</span>
            <div className="health-info">
              <h3>Retraining Complete!</h3>
              <p>Model has been retrained with your uploaded data and is now serving updated predictions.</p>
              {trainingStatusData.last_trained_at && (
                <p style={{fontSize: '12px', color: '#aaa', marginTop: '4px'}}>Completed at: {new Date(trainingStatusData.last_trained_at).toLocaleString()}</p>
              )}
            </div>
          </div>
        </div>
      )}

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
            onClick={checkUploadedFiles}
            disabled={loadingDbStats}
            className="btn-secondary btn-small"
          >
            {loadingDbStats ? "Loading..." : "📁 Check Database"}
          </button>
        </div>
      )}

      {/* Database Stats Panel */}
      {dbStats && (
        <div className="model-health-card" style={{marginBottom: '20px', borderLeft: '4px solid #2196f3'}}>
          <div className="health-content" style={{width: '100%'}}>
            <span className="health-icon">📊</span>
            <div className="health-info" style={{width: '100%'}}>
              <h3>Database & Model Overview</h3>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px'}}>
                <div>
                  <p style={{fontSize: '13px', color: '#aaa'}}>Raw Archive (SQLite)</p>
                  <p><strong>{dbStats.db_total?.toLocaleString() || 0}</strong> records</p>
                </div>
                <div>
                  <p style={{fontSize: '13px', color: '#aaa'}}>Training Data (Model)</p>
                  <p><strong>{dbStats.total?.toLocaleString() || 0}</strong> records</p>
                </div>
              </div>

              {dbStats.upload_log && dbStats.upload_log.length > 0 && (
                <div style={{marginTop: '12px', overflowX: 'auto'}}>
                  <p style={{fontSize: '13px', color: '#aaa', marginBottom: '6px'}}>Recent Uploads:</p>
                  <table className="sample-table" style={{fontSize: '12px'}}>
                    <thead>
                      <tr>
                        <th>Filename</th>
                        <th>Year</th>
                        <th>Month</th>
                        <th>Category</th>
                        <th>Uploaded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dbStats.upload_log.slice(0, 5).map((r, i) => (
                        <tr key={i}>
                          <td>{r.filename}</td>
                          <td>{r.year}</td>
                          <td>{r.month}</td>
                          <td>{r.category}</td>
                          <td>{r.upload_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {dbStats.records && dbStats.records.length > 0 && (
                <div style={{marginTop: '12px', overflowX: 'auto'}}>
                  <p style={{fontSize: '13px', color: '#aaa', marginBottom: '6px'}}>Latest Training Records:</p>
                  <table className="sample-table" style={{fontSize: '12px'}}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Item</th>
                        <th>Net Qty</th>
                        <th>Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dbStats.records.slice(0, 5).map((r, i) => (
                        <tr key={i}>
                          <td>{r.date}</td>
                          <td>{r.item_name}</td>
                          <td>{r.quantity}</td>
                          <td>{r.category}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button
                onClick={() => setDbStats(null)}
                className="btn-secondary btn-small"
                style={{marginTop: '10px', fontSize: '12px'}}
              >
                ✕ Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Format Preview Section */}
      <div className="format-preview-card">
        <div className="format-header">
          <h2>📋 Expected Raw Data Format</h2>
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
                  <li><strong>Format:</strong> Excel (.xls, .xlsx) or CSV (.csv) files</li>
                  <li><strong>Content:</strong> Raw monthly sales data from CSD store POS system</li>
                  <li><strong>One file per month</strong> — select the correct Year, Month & Category before uploading</li>
                  <li><strong>Naming:</strong> Any filename works (e.g. "sale_jan_26.xlsx", "06 JUN.xls", "march_data.csv")</li>
                  <li><strong>Duplicate Check:</strong> System will warn you if data for that month already exists</li>
                </ul>
              </div>

              <div className="info-box">
                <h3>📊 Required Columns ({dataFormat?.required_columns?.length || 0} key fields)</h3>
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
            Upload raw sales data for a specific month. The file is stored in the database — <strong>no training happens automatically</strong>.
            Upload as many months as you need, then click <strong>Retrain Model</strong> on the right to update the forecasts.
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
                  <option value={2027}>2027</option>
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
                Uploading raw data for: <strong>{monthNames[selectedMonth - 1]} {selectedYear}</strong> — <strong>{selectedCategory}</strong>
                <span style={{marginLeft: '10px', fontSize: '12px', color: '#64b5f6'}}>💾 Will be saved to database only — retrain manually when ready</span>
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
                  onClick={() => handleUpload(false)}
                  disabled={uploading}
                  className="btn-primary"
                >
                  {uploading ? "Uploading..." : "Upload to Database"}
                </button>
              </div>
            )}

            {uploading && <LoadingSpinner message="Saving to raw data archive..." />}

            {uploadResult && (
              <div
                className={`result-box ${
                  uploadResult.success ? "success" : "error"
                }`}
              >
                {uploadResult.success ? (
                  <>
                    <h3>✅ Data Saved to Database</h3>
                    <div className="result-details">
                      <p><strong>File:</strong> {uploadResult.filename}</p>
                      <p><strong>Period:</strong> {monthNames[uploadResult.month - 1]} {uploadResult.year}</p>
                      <p><strong>Category:</strong> {uploadResult.category}</p>
                      <p className="success-message">{uploadResult.message}</p>
                      <p className="note-message" style={{marginTop: '8px', fontSize: '13px', color: '#64b5f6'}}>
                        💾 File stored. Upload more months or click <strong>Retrain Model</strong> on the right when ready.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <h3>❌ Upload Failed</h3>
                    <p className="error-message">{uploadResult.error || uploadResult.message || "Unknown error occurred"}</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Retrain Model Section */}
        <div className="retrain-card">
          <h2>🤖 Retrain Model with Latest Data</h2>
          <p className="card-description">
            Run the full ML pipeline on all archived data. This cleans raw files, engineers features, trains XGBoost, and reloads the model for live predictions.
          </p>

          <div className="retrain-info">
            <div className="info-item">
              <span className="info-icon">🔄</span>
              <div>
                <h4>Full Pipeline Steps</h4>
                <ul>
                  <li><strong>Step 1:</strong> Clean & Group raw files for each year/category (clean_and_group.py)</li>
                  <li><strong>Step 2:</strong> Prepare master training dataset (prepare_dataset.py)</li>
                  <li><strong>Step 3:</strong> Train XGBoost model with 18-feature schema (kaggle_xgboost_pipeline.py)</li>
                  <li><strong>Step 4:</strong> Hot-reload new model into the live API</li>
                </ul>
              </div>
            </div>

            <div className="info-item">
              <span className="info-icon">⏱️</span>
              <div>
                <h4>Expected Duration</h4>
                <p>Full pipeline takes 2-5 minutes depending on dataset size. The progress bar above will track each step in real-time. The API remains available during training.</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleRetrain}
            disabled={retraining || trainingStatusData.status === "training"}
            className="btn-primary btn-large"
          >
            {retraining || trainingStatusData.status === "training"
              ? "⏳ Training in Progress..."
              : "🔄 Retrain Model with Latest Data"}
          </button>

          {retraining && (
            <div className="retrain-progress">
              <LoadingSpinner message="Pipeline running... Check the progress bar at the top" />
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

          {/* Refresh Stock Data — quick reload without full retrain */}
          <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(100, 181, 246, 0.05)', borderRadius: '10px', border: '1px solid rgba(100, 181, 246, 0.2)' }}>
            <h4 style={{ color: '#64b5f6', marginBottom: '6px' }}>🔄 Refresh Stock Data</h4>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '12px' }}>
              If stock values in predictions look incorrect, click this to reload the latest training data and refresh current stock levels — <strong>no retraining needed</strong>. Takes a few seconds.
            </p>
            <button
              onClick={handleReloadForecaster}
              disabled={reloading}
              className="btn-secondary"
              style={{ marginBottom: reloadResult ? '10px' : '0' }}
            >
              {reloading ? '⏳ Refreshing...' : '🔃 Refresh Stock Data Now'}
            </button>
            {reloadResult && (
              <div className={`result-box ${reloadResult.success ? 'success' : 'error'}`} style={{ marginTop: '8px', padding: '10px 14px' }}>
                {reloadResult.success
                  ? <p className="success-message">✅ {reloadResult.message}</p>
                  : <p className="error-message">❌ {reloadResult.message}</p>
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="instructions-card">
        <h2>📋 How It Works</h2>
        <div className="instructions-content">
          <div className="instruction-step">
            <span className="step-number">1</span>
            <div>
              <h3>Upload Raw Sales Data</h3>
              <p>
                Select the year, month, and category (Grocery or Liquor), then upload your raw Excel/CSV file from the CSD POS system.
                The file is saved to <strong>data/&lt;Year&gt;/&lt;Category&gt; &lt;Year&gt;/</strong> and archived in the SQLite database.
                <strong>No model training happens at this step.</strong>
              </p>
            </div>
          </div>

          <div className="instruction-step">
            <span className="step-number">2</span>
            <div>
              <h3>Upload All Months You Have</h3>
              <p>
                You can upload as many months as needed before retraining. Each file is stored independently in the database.
                If you upload the same month/year/category twice, you will be asked to confirm the overwrite.
              </p>
            </div>
          </div>

          <div className="instruction-step">
            <span className="step-number">3</span>
            <div>
              <h3>Retrain Model When Ready</h3>
              <p>
                Once you've uploaded all your files, click <strong>"🔄 Retrain Model with Latest Data"</strong> on the right.
                This runs the full pipeline: <code>clean_and_group.py</code> → <code>prepare_dataset.py</code> → <code>kaggle_xgboost_pipeline.py</code>,
                then hot-reloads the new model. The progress bar at the top tracks each step in real-time.
              </p>
            </div>
          </div>

          <div className="instruction-step">
            <span className="step-number">4</span>
            <div>
              <h3>Verify & Use Updated Predictions</h3>
              <p>
                Click <strong>"📁 Check Database"</strong> to verify new records are in the training data.
                Then navigate to <strong>Bulk Order Predictions</strong> to see updated demand forecasts
                reflecting the newly trained model.
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
              <h4>Batch Upload Workflow</h4>
              <p>Upload all months you have first — Jan, Feb, Mar, etc. — then hit Retrain once. Training on all data together gives better accuracy than training after each file.</p>
            </div>
          </div>
          <div className="tip-item">
            <span className="tip-icon">🔒</span>
            <div>
              <h4>Duplicate Protection</h4>
              <p>Uploading the same month/year/category will trigger a confirmation prompt. Your existing data won't be silently overwritten.</p>
            </div>
          </div>
          <div className="tip-item">
            <span className="tip-icon">📊</span>
            <div>
              <h4>Key Column: Net_Qty</h4>
              <p>Net_Qty (Qty − Refund_Qty) is the most critical field for predictions. Ensure this column is accurate in every upload.</p>
            </div>
          </div>
          <div className="tip-item">
            <span className="tip-icon">🎯</span>
            <div>
              <h4>Retrain Controls Training Timing</h4>
              <p>You decide when training happens. Upload as many files as needed, review them with "Check Database", then retrain once everything looks correct.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataUpload;
