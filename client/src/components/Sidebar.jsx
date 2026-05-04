import "./Sidebar.css";

const Sidebar = ({ activeView, setActiveView }) => {
  const menuItems = [
    { id: "dashboard", icon: "📊", label: "Dashboard", category: "Core" },
    { id: "bulk", icon: "📈", label: "Predictions", category: "Core" },
    { id: "analytics", icon: "📉", label: "Analytics", category: "Core" },
    { id: "budget", icon: "💰", label: "Budget Planner", category: "Core" },
    { id: "database", icon: "🗄️", label: "Database", category: "Data" },
    { id: "upload", icon: "📤", label: "Upload Data", category: "Data" },
  ];

  const coreItems = menuItems.filter(item => item.category === "Core");
  const dataItems = menuItems.filter(item => item.category === "Data");

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">🎯</span>
          <span className="logo-text">RetailAI</span>
        </div>
        <div className="logo-subtitle">Analytics + ML</div>
      </div>

      <nav className="sidebar-nav">
        {/* Core Section */}
        <div className="nav-section">
          <div className="nav-section-title">Analytics & Predictions</div>
          {coreItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeView === item.id ? "active" : ""}`}
              onClick={() => setActiveView(item.id)}
              title={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Data Section */}
        <div className="nav-section">
          <div className="nav-section-title">Data Management</div>
          {dataItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeView === item.id ? "active" : ""}`}
              onClick={() => setActiveView(item.id)}
              title={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="system-status">
          <div className="status-indicator online"></div>
          <div className="status-text">
            <div className="status-label">System Status</div>
            <div className="status-value">Ready</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
