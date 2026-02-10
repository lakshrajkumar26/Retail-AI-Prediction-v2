import "./ErrorMessage.css";

const ErrorMessage = ({ message, onRetry }) => {
  return (
    <div className="error-container">
      <div className="error-content">
        <span className="error-icon">⚠️</span>
        <h3>Oops! Something went wrong</h3>
        <p className="error-message">{message || "Failed to load data"}</p>
        {onRetry && (
          <button onClick={onRetry} className="btn-retry">
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;
