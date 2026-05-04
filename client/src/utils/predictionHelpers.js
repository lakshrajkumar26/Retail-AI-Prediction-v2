/**
 * Helper functions for prediction data processing
 */

/**
 * Safe number conversion - handles NaN, null, undefined
 */
export const safeNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined || isNaN(value)) {
    return defaultValue;
  }
  return Number(value);
};

/**
 * Get trend label with emoji
 */
export const getTrendLabel = (trend) => {
  if (trend === 'increasing') return '📈 Increasing';
  if (trend === 'decreasing') return '📉 Decreasing';
  return '➡️ Stable';
};

/**
 * Get trend emoji only
 */
export const getTrendEmoji = (trend) => {
  if (trend === 'increasing') return '📈';
  if (trend === 'decreasing') return '📉';
  return '➡️';
};

/**
 * Get stock status
 */
export const getStockStatus = (currentStock, predictedDemand) => {
  const stock = safeNumber(currentStock);
  const demand = safeNumber(predictedDemand);
  
  if (stock === 0) return { label: 'Out of Stock', class: 'critical', emoji: '🚨' };
  if (stock < demand * 0.5) return { label: 'Critical', class: 'critical', emoji: '🚨' };
  if (stock < demand) return { label: 'Low', class: 'low', emoji: '⚠️' };
  if (stock < demand * 1.5) return { label: 'Adequate', class: 'adequate', emoji: '✅' };
  return { label: 'Excess', class: 'excess', emoji: '📦' };
};

/**
 * Get confidence level
 */
export const getConfidenceLevel = (confidence) => {
  // Hardcoded to 80% (High) as per user request
  return { label: 'High', class: 'high' };
};

/**
 * Format month name from number
 */
export const getMonthName = (monthNumber) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNumber - 1] || 'Unknown';
};

/**
 * Format short month name
 */
export const getShortMonthName = (monthNumber) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[monthNumber - 1] || 'N/A';
};

/**
 * Calculate order priority
 */
export const getOrderPriority = (currentStock, predictedDemand, trend) => {
  const stock = safeNumber(currentStock);
  const demand = safeNumber(predictedDemand);
  
  if (stock === 0) return { label: 'Urgent', class: 'urgent', priority: 1 };
  if (stock < demand * 0.5) return { label: 'High', class: 'high', priority: 2 };
  if (stock < demand) return { label: 'Medium', class: 'medium', priority: 3 };
  if (trend === 'increasing' && stock < demand * 1.5) return { label: 'Low', class: 'low', priority: 4 };
  return { label: 'None', class: 'none', priority: 5 };
};

/**
 * Process prediction data for display
 */
export const processPrediction = (prediction) => {
  if (!prediction) return null;
  
  // Backend returns 'prediction', frontend uses 'final_prediction'
  const finalPrediction = safeNumber(prediction.final_prediction || prediction.prediction);
  const currentStock = safeNumber(prediction.current_stock);
  const confidence = prediction.confidence || 0.8;
  const growthRate = safeNumber(prediction.growth_rate);
  const trend = prediction.trend || prediction.statistics?.trend || 'stable';
  
  // Build all_monthly_data and historical_stats from historical_sales if needed
  let all_monthly_data = prediction.all_monthly_data || [];
  let historical_stats = prediction.historical_stats || { min: 0, max: 0, avg: 0, count: 0 };
  
  if (prediction.historical_sales && all_monthly_data.length === 0) {
    let sum = 0, count = 0, min = Infinity, max = -Infinity;
    Object.keys(prediction.historical_sales).forEach(yr => {
      Object.keys(prediction.historical_sales[yr]).forEach(mo => {
        const sales = prediction.historical_sales[yr][mo];
        all_monthly_data.push({
          year: parseInt(yr),
          month: parseInt(mo),
          sales: sales
        });
        sum += sales;
        count++;
        if (sales < min) min = sales;
        if (sales > max) max = sales;
      });
    });
    // Sort descending (newest first)
    all_monthly_data.sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
    
    if (count > 0) {
      historical_stats = {
        min, max, avg: sum / count, count: Object.keys(prediction.historical_sales).length
      };
    } else {
      historical_stats = { min: 0, max: 0, avg: 0, count: 0 };
    }
  }

  // Yearly stats
  let yearly_stats = prediction.yearly_stats;
  if (!yearly_stats && all_monthly_data.length > 0) {
    const years = new Set(all_monthly_data.map(d => d.year)).size;
    const totalSales = all_monthly_data.reduce((acc, d) => acc + d.sales, 0);
    yearly_stats = { average: years > 0 ? totalSales / years : 0 };
  }
  
  return {
    ...prediction,
    all_monthly_data,
    historical_stats,
    yearly_stats,
    final_prediction: finalPrediction,
    predicted_demand: finalPrediction,
    current_stock: currentStock,
    confidence: confidence,
    growth_rate: growthRate,
    trend: trend,
    recommended_order: Math.max(0, Math.round(finalPrediction - currentStock)),
    stock_status: getStockStatus(currentStock, finalPrediction),
    confidence_level: getConfidenceLevel(confidence),
    order_priority: getOrderPriority(currentStock, finalPrediction, trend),
    trend_label: getTrendLabel(trend),
    trend_emoji: getTrendEmoji(trend),
  };
};

/**
 * Filter predictions
 */
export const filterPredictions = (predictions, filters) => {
  let filtered = [...predictions];
  
  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(p => 
      p.item_name?.toLowerCase().includes(searchLower)
    );
  }
  
  // Category filter
  if (filters.category && filters.category !== 'all') {
    filtered = filtered.filter(p => p.category === filters.category);
  }
  
  // Stock status filter
  if (filters.stockStatus && filters.stockStatus !== 'all') {
    filtered = filtered.filter(p => p.stock_status.class === filters.stockStatus);
  }
  
  // Trend filter
  if (filters.trend && filters.trend !== 'all') {
    filtered = filtered.filter(p => p.trend === filters.trend);
  }
  
  return filtered;
};

/**
 * Sort predictions
 */
export const sortPredictions = (predictions, sortBy, sortOrder) => {
  const sorted = [...predictions];
  
  sorted.sort((a, b) => {
    let aVal, bVal;
    
    switch (sortBy) {
      case 'name':
        aVal = a.item_name || '';
        bVal = b.item_name || '';
        return sortOrder === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      
      case 'demand':
        aVal = a.final_prediction;
        bVal = b.final_prediction;
        break;
      
      case 'stock':
        aVal = a.current_stock;
        bVal = b.current_stock;
        break;
      
      case 'priority':
        aVal = a.order_priority.priority;
        bVal = b.order_priority.priority;
        break;
      
      case 'confidence':
        aVal = a.confidence;
        bVal = b.confidence;
        break;
      
      default:
        return 0;
    }
    
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });
  
  return sorted;
};

/**
 * Calculate summary statistics
 */
export const calculateSummary = (predictions) => {
  const totalItems = predictions.length;
  const criticalItems = predictions.filter(p => p.stock_status.class === 'critical').length;
  const lowStockItems = predictions.filter(p => p.stock_status.class === 'low').length;
  const adequateItems = predictions.filter(p => p.stock_status.class === 'adequate').length;
  
  const totalDemand = predictions.reduce((sum, p) => sum + p.final_prediction, 0);
  const totalStock = predictions.reduce((sum, p) => sum + p.current_stock, 0);
  const totalOrderValue = predictions.reduce((sum, p) => {
    const orderQty = Math.max(0, p.final_prediction - p.current_stock);
    const price = safeNumber(p.price);
    return sum + (orderQty * price);
  }, 0);
  
  const increasingTrend = predictions.filter(p => p.trend === 'increasing').length;
  const decreasingTrend = predictions.filter(p => p.trend === 'decreasing').length;
  const stableTrend = predictions.filter(p => p.trend === 'stable').length;
  
  return {
    totalItems,
    criticalItems,
    lowStockItems,
    adequateItems,
    totalDemand: Math.round(totalDemand),
    totalStock: Math.round(totalStock),
    totalOrderValue: Math.round(totalOrderValue),
    increasingTrend,
    decreasingTrend,
    stableTrend,
    avgConfidence: 0.8, // Hardcoded as per user request
  };
};

/**
 * Allocate a budget across items.
 *
 * Strategies:
 * - "greedy": take highest-demand items until budget ends
 * - "by_category": split budget across Category by demand-weighted cost share
 * - "by_group": split budget across Group by demand-weighted cost share
 */
export const allocateBudget = (predictions, budgetRupees, strategy = 'greedy') => {
  const budget = safeNumber(budgetRupees, 0);
  if (!Array.isArray(predictions) || predictions.length === 0 || budget <= 0) {
    return { items: predictions || [], summary: null };
  }

  const itemCost = (p) => safeNumber(p.final_prediction) * safeNumber(p.price);
  const itemDemand = (p) => safeNumber(p.final_prediction);

  const valid = predictions.filter(p => itemDemand(p) > 0 && itemCost(p) >= 0);

  const baseSummary = {
    budget,
    spent: 0,
    remaining: budget,
    itemsSelected: 0,
    itemsSkipped: 0,
    totalDemand: 0,
    totalRevenue: 0,
    strategy,
    groups: null, // filled for grouped strategies
  };

  // Greedy global selection
  const greedySelect = (items, maxBudget) => {
    const sorted = [...items].sort((a, b) => itemDemand(b) - itemDemand(a));
    let spent = 0;
    const selected = [];
    const skipped = [];

    for (const p of sorted) {
      const cost = itemCost(p);
      if (spent + cost <= maxBudget) {
        selected.push(p);
        spent += cost;
      } else {
        skipped.push(p);
      }
    }
    return { selected, skipped, spent };
  };

  if (strategy === 'greedy') {
    const { selected, skipped, spent } = greedySelect(valid, budget);
    const summary = {
      ...baseSummary,
      spent,
      remaining: Math.max(0, budget - spent),
      itemsSelected: selected.length,
      itemsSkipped: skipped.length,
      totalDemand: selected.reduce((s, p) => s + itemDemand(p), 0),
      totalRevenue: spent,
    };
    return { items: selected, summary };
  }

  const groupField =
    strategy === 'by_category' ? 'category' :
    strategy === 'by_group' ? 'group' :
    null;

  if (!groupField) {
    return { items: predictions, summary: null };
  }

  // Grouped allocation: allocate budget share by demand-weighted cost per group
  const groups = new Map();
  for (const p of valid) {
    const key = (p[groupField] ?? 'Unknown') || 'Unknown';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  const groupWeights = [];
  for (const [key, items] of groups.entries()) {
    const w = items.reduce((s, p) => s + itemCost(p), 0);
    groupWeights.push({ key, weight: w, items });
  }

  const totalWeight = groupWeights.reduce((s, g) => s + g.weight, 0);
  if (totalWeight <= 0) {
    // Fallback when prices are zero (or all costs zero): use pure demand weights
    for (const g of groupWeights) {
      g.weight = g.items.reduce((s, p) => s + itemDemand(p), 0);
    }
  }
  const totalWeight2 = groupWeights.reduce((s, g) => s + g.weight, 0);
  if (totalWeight2 <= 0) {
    // Nothing to allocate meaningfully
    return { items: [], summary: { ...baseSummary, spent: 0, remaining: budget, itemsSelected: 0, itemsSkipped: valid.length, groups: [] } };
  }

  const perGroup = [];
  let selectedAll = [];
  let skippedAll = [];
  let spentAll = 0;

  for (const g of groupWeights) {
    const allocated = (budget * g.weight) / totalWeight2;
    const { selected, skipped, spent } = greedySelect(g.items, allocated);
    perGroup.push({
      key: g.key,
      allocated,
      spent,
      remaining: Math.max(0, allocated - spent),
      itemsSelected: selected.length,
      itemsSkipped: skipped.length,
    });
    selectedAll = selectedAll.concat(selected);
    skippedAll = skippedAll.concat(skipped);
    spentAll += spent;
  }

  // Second pass: use leftover budget across any remaining items (reduces waste)
  let leftover = Math.max(0, budget - spentAll);
  if (leftover > 0 && skippedAll.length > 0) {
    const { selected: extraSelected, spent: extraSpent } = greedySelect(skippedAll, leftover);
    selectedAll = selectedAll.concat(extraSelected);
    spentAll += extraSpent;
    leftover = Math.max(0, budget - spentAll);
  }

  const summary = {
    ...baseSummary,
    spent: spentAll,
    remaining: leftover,
    itemsSelected: selectedAll.length,
    itemsSkipped: Math.max(0, valid.length - selectedAll.length),
    totalDemand: selectedAll.reduce((s, p) => s + itemDemand(p), 0),
    totalRevenue: spentAll,
    groups: perGroup.sort((a, b) => b.spent - a.spent),
  };

  return { items: selectedAll, summary };
};
