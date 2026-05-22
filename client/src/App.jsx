import { useState, useEffect, useRef } from "react";
import Dashboard from "./pages/Dashboard/Dashboard";
import BulkPrediction from "./pages/BulkPrediction/BulkPrediction";
import Analytics from "./pages/Analytics";
import BudgetAllocator from "./pages/BudgetAllocator";
import Database from "./pages/Database";
import DataUpload from "./pages/DataUpload";
import Sidebar from "./components/Sidebar";
import { getTrainingStatus } from "./api";
import { modelEvents } from "./services/modelEvents";
import "./App.css";

function App() {
  const [activeView, setActiveView] = useState("dashboard");
  const [trainingStatus, setTrainingStatus] = useState({ status: "idle", progress: 0, message: "" });
  const prevStatus = useRef("idle");

  // Global training status poller — shows banner on all pages
  useEffect(() => {
    const poll = async () => {
      try {
        const data = await getTrainingStatus();
        if (data?.status) {
          if (data.status === "completed" && prevStatus.current === "training") {
            modelEvents.notifyModelRetrained();
          }
          prevStatus.current = data.status;
          setTrainingStatus(data);
        }
      } catch (e) { /* ignore */ }
    };
    const id = setInterval(poll, 3000);
    poll();
    return () => clearInterval(id);
  }, []);

  const isTraining = trainingStatus.status === "training";

  return (
    <div className="app-container">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />

      {/* Global training banner — visible across all pages */}
      {isTraining && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
          background: "linear-gradient(90deg, #1a2e1a 0%, #0f2818 100%)",
          borderBottom: "2px solid #4caf50",
          padding: "6px 20px",
          display: "flex", alignItems: "center", gap: "12px",
          fontSize: "13px", color: "#e0e0e0",
        }}>
          <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⚙️</span>
          <span><strong style={{ color: "#4caf50" }}>Retraining:</strong> {trainingStatus.message}</span>
          <div style={{ flex: 1, height: "6px", background: "#333", borderRadius: "3px", overflow: "hidden" }}>
            <div style={{ width: `${trainingStatus.progress}%`, height: "100%", background: "#4caf50", transition: "width 0.5s ease" }} />
          </div>
          <span style={{ color: "#4caf50", fontWeight: 600 }}>{trainingStatus.progress}%</span>
        </div>
      )}

      <main className="main-content" style={isTraining ? { paddingTop: "36px" } : {}}>
        {activeView === "dashboard" && <Dashboard />}
        {activeView === "bulk" && <BulkPrediction />}
        {activeView === "analytics" && <Analytics />}
        {activeView === "budget" && <BudgetAllocator />}
        {activeView === "database" && <Database />}
        {activeView === "upload" && <DataUpload />}
      </main>
    </div>
  );
}

export default App;
