import { useState, useEffect } from "react";
import { uploadData, trainModel, getTrainingStatus } from "../api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./DataUpload.css";

const DataUpload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [training, setTraining] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [trainingResult, setTrainingResult] = useState(null);
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [selectedStore, setSelectedStore] = useState("all");

  useEffect(() => {
    loadTrainingStatus();
  }, []);

  const loadTrainingStatus = async () => {
    try {
      const data = await getTrainingStatus();
      setTrainingStatus(data);
    } catch (error) {
      console.error("Failed to load training status:", error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = [
        "text/csv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];
      if (validTypes.includes(selectedFile.type) || 
          selectedFile.name.endsWith('.csv') || 
          selectedFile.name.endsWith('.xlsx') || 
          selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile);
        setUploadResult(null);
      } else {
        alert("Please select a CSV or Excel file");
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first");
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const result = await uploadData(file);
      setUploadResult(result);
      if (result.success) {
        setFile(null);
        // Reset file input
        document.getElementById("file-input").value = "";
      }
    } catch (error) {
      setUploadResult({ error: "Failed to upload file" });
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleTrain = async () => {
    setTraining(true);
    setTrainingResult(null);

    try {
      const result = await trainModel(selectedStore);
      setTrainingResult(result);
      if (result.success) {
        loadTrainingStatus();
      }
    } catch (error) {
      setTrainingResult({ error: "Failed to train model" });
      console.error(error);
    } finally {
      setTraining(false);
    }
  };

  return (
    <div className="data-upload-page">
      <div className="page-header">
        <h1>📤 Data Upload & Model Training</h1>
        <p className="subtitle">
          Upload your store data and train custom AI models
        </p>
      </div>

      <div className="upload-grid">
        {/* Upload Section */}
        <div className="upload-card">
          <h2>📁 Upload Store Data</h2>
          <p className="card-description">
            Upload CSV or Excel file with your store's sales data. The file should include columns like Date, Store ID, Product ID, Category, Units Sold, Price, etc.
          </p>

          <div className="upload-area">
            <input
              id="file-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="file-input"
            />
            <label htmlFor="file-input" className="file-label">
              <span className="upload-icon">📄</span>
              <span className="upload-text">
                {file ? file.name : "Click to select file or drag and drop"}
              </span>
              <span className="upload-hint">CSV or Excel files only</span>
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

          {uploading && <LoadingSpinner message="Uploading data..." />}

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
                    <p>
                      <strong>Stores:</strong> {uploadResult.stores.join(", ")}
                    </p>
                    <p>
                      <strong>Records:</strong> {uploadResult.records}
                    </p>
                    <p>
                      <strong>Date Range:</strong>{" "}
                      {uploadResult.date_range.start} to{" "}
                      {uploadResult.date_range.end}
                    </p>
                    <p className="success-message">{uploadResult.message}</p>
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

        {/* Training Section */}
        <div className="training-card">
          <h2>🤖 Train AI Model</h2>
          <p className="card-description">
            Train a custom AI model for your store(s). Each store can have its own model trained on its specific patterns.
          </p>

          <div className="training-options">
            <div className="form-group">
              <label>Select Store to Train</label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="form-input"
              >
                <option value="all">All Stores (Global Model)</option>
                {uploadResult?.stores?.map((store) => (
                  <option key={store} value={store}>
                    Store {store}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleTrain}
              disabled={training}
              className="btn-primary btn-large"
            >
              {training ? "Training..." : "Start Training"}
            </button>
          </div>

          {training && <LoadingSpinner message="Training model... This may take a few minutes" />}

          {trainingResult && (
            <div
              className={`result-box ${
                trainingResult.success ? "success" : "error"
              }`}
            >
              {trainingResult.success ? (
                <>
                  <h3>✅ Training Successful!</h3>
                  <p className="success-message">{trainingResult.message}</p>
                  {trainingResult.results && (
                    <div className="training-results">
                      {trainingResult.results.map((result, idx) => (
                        <div key={idx} className="training-result-item">
                          <h4>Store: {result.store_id}</h4>
                          <p>Records: {result.records}</p>
                          <p>Accuracy: {result.accuracy}%</p>
                          <p>MAE: {result.mae}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h3>❌ Training Failed</h3>
                  <p className="error-message">{trainingResult.error}</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Training Status */}
      {trainingStatus && trainingStatus.total_models > 0 && (
        <div className="status-card">
          <h2>📊 Trained Models Status</h2>
          <div className="models-grid">
            {trainingStatus.models.map((model, idx) => (
              <div key={idx} className="model-card">
                <div className="model-header">
                  <span className="model-icon">
                    {model.store_id === "GLOBAL" ? "🌐" : "🏪"}
                  </span>
                  <h3>{model.store_id === "GLOBAL" ? "Global Model" : `Store ${model.store_id}`}</h3>
                </div>
                <div className="model-details">
                  <p>
                    <strong>Trained:</strong> {model.trained_at}
                  </p>
                  <p>
                    <strong>Size:</strong> {model.size_mb} MB
                  </p>
                  <p>
                    <strong>Model File:</strong> {model.model_file}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="instructions-card">
        <h2>📋 Instructions</h2>
        <div className="instructions-content">
          <div className="instruction-step">
            <span className="step-number">1</span>
            <div>
              <h3>Prepare Your Data</h3>
              <p>
                Your Excel/CSV file should have these columns: Date, Store ID,
                Product ID, Category, Region, Inventory Level, Units Sold,
                Price, Discount, Weather Condition, Holiday/Promotion,
                Competitor Pricing, Seasonality
              </p>
            </div>
          </div>

          <div className="instruction-step">
            <span className="step-number">2</span>
            <div>
              <h3>Upload Data</h3>
              <p>
                Click the upload area to select your file. The system will
                validate and save your data. Multiple stores can be in one file.
              </p>
            </div>
          </div>

          <div className="instruction-step">
            <span className="step-number">3</span>
            <div>
              <h3>Train Model</h3>
              <p>
                Choose to train a model for a specific store or all stores.
                Each store gets its own model trained on its unique patterns.
              </p>
            </div>
          </div>

          <div className="instruction-step">
            <span className="step-number">4</span>
            <div>
              <h3>Use Predictions</h3>
              <p>
                Once trained, go to the Bulk Orders or Smart Prediction pages
                to get AI-powered recommendations using your custom model.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataUpload;
