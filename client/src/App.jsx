import { useState } from "react";
import Dashboard from "./pages/Dashboard/Dashboard";
import BulkPrediction from "./pages/BulkPrediction/BulkPrediction";
import Analytics from "./pages/Analytics";
import BudgetAllocator from "./pages/BudgetAllocator";
import Database from "./pages/Database";
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
        {activeView === "analytics" && <Analytics />}
        {activeView === "budget" && <BudgetAllocator />}
        {activeView === "database" && <Database />}
        {activeView === "upload" && <DataUpload />}
      </main>
    </div>
  );
}

export default App;
