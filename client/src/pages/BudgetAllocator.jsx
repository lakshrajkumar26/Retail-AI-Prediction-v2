import { useState, useRef, useEffect } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";
import "./BudgetAllocator.css";

const API = () => (window.location.port === '5016' ? '/api' : 'http://localhost:8002');
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const COLORS = ["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#ec4899"];
const TT = {
  contentStyle: { backgroundColor:'rgba(15,23,42,0.95)', border:'1px solid #3b82f6', borderRadius:'8px', color:'#fff' },
  labelStyle: { color:'#94a3b8' },
};

const ChartBox = ({ height = 300, children }) => {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const m = () => { if (ref.current) setW(ref.current.offsetWidth); };
    m(); window.addEventListener('resize', m);
    return () => window.removeEventListener('resize', m);
  }, []);
  return <div ref={ref} style={{ width:'100%', height, minHeight: height }}>{w > 0 && children(w, height)}</div>;
};

const fmt = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const BudgetAllocator = () => {
  const [budget, setBudget] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2);
  const [year, setYear] = useState(2026);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [originalResult, setOriginalResult] = useState(null);
  const [error, setError] = useState(null);

  const allocate = async () => {
    const b = parseFloat(budget.replace(/,/g, ""));
    if (!b || b <= 0) { setError("Enter a valid budget amount"); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API()}/budget/allocate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget: b, month, year })
      });
      if (!res.ok) throw new Error("Allocation failed");
      const data = await res.json();
      setResult(data);
      setOriginalResult(JSON.parse(JSON.stringify(data)));
    } catch (err) {
      setError("Failed to allocate budget. Ensure backend is running.");
    } finally { setLoading(false); }
  };

  const formatBudgetInput = (val) => {
    const clean = val.replace(/[^\d]/g, "");
    if (!clean) { setBudget(""); return; }
    setBudget(parseInt(clean).toLocaleString("en-IN"));
  };

  const handleGroupBudgetChange = (idx, value, mode = 'amount') => {
    if (!result) return;
    
    const totalBudget = parseFloat(result.budget) || 1;
    let newAmount = 0;
    
    if (mode === 'amount') {
      newAmount = parseFloat(value) || 0;
    } else {
      const percentage = parseFloat(value) || 0;
      newAmount = (totalBudget * percentage) / 100;
    }
    
    const newGroups = [...result.groups];
    newGroups[idx].allocated_budget = newAmount;
    
    // Recalculate units affordable and coverage
    newGroups[idx].units_affordable = newAmount > 0 ? Math.floor(newAmount / newGroups[idx].avg_price) : 0;
    newGroups[idx].coverage_pct = newGroups[idx].avg_monthly_demand > 0 ? 
      Math.min(100, Math.round((newGroups[idx].units_affordable / newGroups[idx].avg_monthly_demand) * 100)) : 100;
    
    // Recalculate global totals
    const totalAllocated = newGroups.reduce((sum, g) => sum + g.allocated_budget, 0);
    const totalAffordable = newGroups.reduce((sum, g) => sum + g.units_affordable, 0);
    
    // Update percentages (weights) for all groups based on the new total or fixed total?
    // The user wants to adjust distribution. Usually total budget is fixed.
    newGroups.forEach(g => {
      g.weight = totalBudget > 0 ? Math.round((g.allocated_budget / totalBudget) * 100) : 0;
    });

    setResult({
      ...result,
      budget: totalAllocated,
      budget_vs_demand: result.total_demand_cost > 0 ? 
        Math.min(100, Math.round((totalAllocated / result.total_demand_cost) * 100)) : 100,
      groups: newGroups,
      summary: {
        ...result.summary,
        total_units_affordable: totalAffordable
      }
    });
  };

  const resetToAI = () => {
    if (originalResult) {
      setResult(JSON.parse(JSON.stringify(originalResult)));
    }
  };

  const exportCSV = () => {
    if (!result) return;
    let csv = "Group,Label,Category,Items,Avg Price (₹),Monthly Demand,Allocated Budget (₹),Units Affordable,Coverage %,Weight %\n";
    result.groups.forEach(g => {
      csv += `${g.group},"${g.label}",${g.category},${g.item_count},${g.avg_price},${g.avg_monthly_demand},${g.allocated_budget},${g.units_affordable},${g.coverage_pct},${g.weight}\n`;
    });
    
    csv += `\n\n--- Product Details ---\n`;
    csv += `Group,Product Name,Total Sold (Historical),Avg Price (₹)\n`;
    result.groups.forEach(g => {
      const productsList = g.products || g.top_products || [];
      productsList.forEach(p => {
        csv += `${g.group},"${p.name}",${p.total_sold},${p.avg_price}\n`;
      });
    });

    csv += `\n\n--- Summary ---\n`;
    csv += `Total Budget,${result.budget}\nMonth,${result.month_name} ${result.year}\n`;
    csv += `Total Demand Cost,${result.total_demand_cost}\nBudget Coverage,${result.budget_vs_demand}%\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget_allocation_${result.month_name}_${result.year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pieData = result?.groups.map((g, i) => ({
    name: `Group ${g.group}`, value: g.allocated_budget, color: COLORS[i % COLORS.length]
  })) || [];

  const barData = result?.groups.map((g, i) => ({
    name: `Grp ${g.group}`, demand: g.avg_monthly_demand, affordable: g.units_affordable, fill: COLORS[i % COLORS.length]
  })) || [];

  return (
    <div className="budget-page">
      <div className="budget-header">
        <div>
          <h1>💰 AI Budget Allocator</h1>
          <p className="subtitle">Enter your monthly procurement budget — AI distributes it across product groups based on predicted demand</p>
        </div>
      </div>

      {/* Input Panel */}
      <div className="budget-input-panel">
        <div className="budget-input-row">
          <div className="budget-field" style={{ flex: 2 }}>
            <label>Monthly Budget</label>
            <div className="budget-currency-input">
              <span className="currency-symbol">₹</span>
              <input className="budget-amount-input" type="text" value={budget}
                onChange={(e) => formatBudgetInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && allocate()}
                placeholder="5,00,000" />
            </div>
          </div>
          <div className="budget-field">
            <label>Target Month</label>
            <select className="budget-select" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="budget-field">
            <label>Year</label>
            <select className="budget-select" value={year} onChange={e => setYear(parseInt(e.target.value))}>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
          </div>
          <button className="allocate-btn" onClick={allocate} disabled={loading || !budget}>
            {loading ? "⏳ Allocating..." : "🚀 Allocate Budget"}
          </button>
        </div>
        {error && <div style={{ color: '#ef4444', marginTop: '1rem', fontSize: '.875rem' }}>❌ {error}</div>}
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Summary Strip */}
          <div className="budget-summary-strip">
            <div className="bs-card">
              <div className="bs-label">Total Budget</div>
              <div className="bs-value green">{fmt(result.budget)}</div>
            </div>
            <div className="bs-card">
              <div className="bs-label">Monthly Demand Cost</div>
              <div className="bs-value">{fmt(result.total_demand_cost)}</div>
              <div className="bs-sub">Estimated cost to meet all demand</div>
            </div>
            <div className="bs-card">
              <div className="bs-label">Budget Coverage</div>
              <div className="bs-value amber">{result.budget_vs_demand}%</div>
              <div className="bs-sub">of total demand fulfilled</div>
            </div>
            <div className="bs-card">
              <div className="bs-label">Units Affordable</div>
              <div className="bs-value blue">{result.summary.total_units_affordable.toLocaleString()}</div>
              <div className="bs-sub">across {result.summary.total_items.toLocaleString()} products</div>
            </div>
            <div className="bs-card">
              <div className="bs-label">Target Period</div>
              <div className="bs-value">{result.month_name} {result.year}</div>
              <div className="bs-sub">{result.summary.total_groups} groups allocated</div>
            </div>
          </div>

          {/* Actions */}
          <div className="export-row" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <button className="export-btn" onClick={exportCSV}>📥 Export Allocation Plan (CSV)</button>
            <button className="export-btn" style={{ background: '#334155' }} onClick={resetToAI}>🔄 Reset to AI Optimal</button>
          </div>

          {/* Charts */}
          <div className="budget-charts-row">
            <div className="pie-card">
              <h3>Budget Distribution</h3>
              <p className="chart-sub">Allocation share by product group</p>
              <ChartBox height={280}>
                {(w, h) => (
                  <PieChart width={w} height={h}>
                    <Pie data={pieData} cx={w/2} cy={120} innerRadius={60} outerRadius={100}
                      paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(v)} {...TT} />
                  </PieChart>
                )}
              </ChartBox>
              <div className="pie-legend">
                {pieData.map((entry, i) => (
                  <div key={i} className="pie-legend-item">
                    <span className="pie-legend-dot" style={{ background: entry.color }}></span>
                    <span>{entry.name}: {fmt(entry.value)} ({result.groups[i]?.weight}%)</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bar-card">
              <h3>Demand vs Affordable Units</h3>
              <p className="chart-sub">Monthly demand volume compared to what the budget can cover</p>
              <ChartBox height={350}>
                {(w, h) => (
                  <BarChart width={w} height={h} data={barData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill:'#94a3b8', fontSize:12 }} />
                    <YAxis stroke="#94a3b8" tick={{ fill:'#94a3b8', fontSize:12 }} />
                    <Tooltip {...TT} />
                    <Bar dataKey="demand" fill="#475569" radius={[4,4,0,0]} name="Monthly Demand" />
                    <Bar dataKey="affordable" fill="#3b82f6" radius={[4,4,0,0]} name="Affordable Units" />
                  </BarChart>
                )}
              </ChartBox>
            </div>
          </div>

          {/* Group Cards */}
          <div className="group-cards-grid">
            {result.groups.map((g, idx) => (
              <div key={g.group} className="group-card">
                <div className="gc-header">
                  <div className="gc-title">{g.label}</div>
                  <span className={`gc-badge ${g.category === 'Liquor' ? 'liquor' : 'grocery'}`}>{g.category}</span>
                </div>
                <div className="gc-amount" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid #334155', paddingBottom: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Allocation (₹)</label>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(30, 41, 59, 0.5)', padding: '4px 8px', borderRadius: '4px' }}>
                        <span style={{ color: '#94a3b8', marginRight: '4px' }}>₹</span>
                        <input 
                          type="number" 
                          value={Math.round(g.allocated_budget)}
                          onChange={(e) => handleGroupBudgetChange(idx, e.target.value, 'amount')}
                          style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.25rem', fontWeight: 'bold', width: '100%', outline: 'none' }}
                        />
                      </div>
                    </div>
                    <div style={{ width: '120px' }}>
                      <label style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Weight (%)</label>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', padding: '6px 10px', borderRadius: '8px' }}>
                        <input 
                          type="number" 
                          value={g.weight}
                          onChange={(e) => handleGroupBudgetChange(idx, e.target.value, 'percentage')}
                          style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.1rem', fontWeight: '900', width: '100%', outline: 'none', textAlign: 'right' }}
                        />
                        <span style={{ color: '#3b82f6', marginLeft: '6px', fontSize: '1.1rem', fontWeight: 'bold' }}>%</span>
                      </div>
                    </div>
                  </div>
                  
                  <input 
                    type="range"
                    min="0"
                    max={result.total_demand_cost || 10000000}
                    step="10000"
                    value={Math.round(g.allocated_budget)}
                    onChange={(e) => handleGroupBudgetChange(idx, e.target.value, 'amount')}
                    style={{ width: '100%', cursor: 'pointer', accentColor: '#3b82f6' }}
                  />
                  
                  <div style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', marginTop: '-0.25rem' }}>
                    <span>Coverage: {g.coverage_pct}%</span>
                    <span>Demand: ₹{Math.round(g.avg_monthly_demand * g.avg_price).toLocaleString("en-IN")}</span>
                  </div>
                </div>
                <div className="gc-pct">{g.weight}% of total budget</div>
                <div className="gc-progress-bar">
                  <div className="gc-progress-fill" style={{ width: `${Math.min(g.weight, 100)}%`, background: COLORS[idx % COLORS.length] }}></div>
                </div>
                <div className="gc-stats">
                  <div><div className="gc-stat-label">Items</div><div className="gc-stat-val">{g.item_count}</div></div>
                  <div><div className="gc-stat-label">Units Affordable</div><div className="gc-stat-val">{g.units_affordable.toLocaleString()}</div></div>
                  <div><div className="gc-stat-label">Coverage</div><div className="gc-stat-val">{g.coverage_pct}%</div></div>
                </div>
                <div className="gc-stats" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div><div className="gc-stat-label">Avg Price</div><div className="gc-stat-val">₹{g.avg_price}</div></div>
                  <div><div className="gc-stat-label">Monthly Demand</div><div className="gc-stat-val">{g.avg_monthly_demand.toLocaleString()}</div></div>
                </div>
                <div className="gc-top-title">🔥 Top Products by Demand</div>
                {g.top_products.map((p, pi) => (
                  <div key={pi} className="gc-top-item">
                    <span className="gc-top-name">{p.name}</span>
                    <span className="gc-top-sold">{p.total_sold.toLocaleString()} sold</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default BudgetAllocator;
