import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import Forecast from "./pages/Forecast";
import Prediction from "./pages/Prediction";
import BulkPrediction from "./pages/BulkPrediction";
import DataUpload from "./pages/DataUpload";
import Sidebar from "./components/Sidebar";
import "./App.css";

function App() {
  const [activeView, setActiveView] = useState("dashboard");

  return (
    <div className="app-container">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <main className="main-content">
        {activeView === "dashboard" && <Dashboard />}
        {activeView === "bulk" && <BulkPrediction />}
        {activeView === "forecast" && <Forecast />}
        {activeView === "prediction" && <Prediction />}
        {activeView === "upload" && <DataUpload />}
        {activeView === "inventory" && (
          <div style={{ padding: "2rem" }}>
            <h1>Inventory Management</h1>
            <p style={{ color: "var(--text-muted)" }}>Coming soon...</p>
          </div>
        )}
        {activeView === "analytics" && (
          <div style={{ padding: "2rem" }}>
            <h1>Advanced Analytics</h1>
            <p style={{ color: "var(--text-muted)" }}>Coming soon...</p>
          </div>
        )}
        {activeView === "settings" && (
          <div style={{ padding: "2rem" }}>
            <h1>Settings</h1>
            <p style={{ color: "var(--text-muted)" }}>Coming soon...</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
