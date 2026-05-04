/**
 * Analytics Service - Handles dashboard analytics API calls
 */

// Use /api proxy in Docker, direct localhost:8001 for local dev
const API_BASE_URL = window.location.port === '5016'
  ? '/api'
  : 'http://localhost:8002';

console.log('[ANALYTICS SERVICE] API Base URL:', API_BASE_URL);

export const analyticsService = {
  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/`);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[ANALYTICS SERVICE] Error getting stats:', error);
      throw error;
    }
  },

  /**
   * Get all items with statistics
   */
  async getAllItems() {
    try {
      const response = await fetch(`${API_BASE_URL}/all_items`);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[ANALYTICS SERVICE] Error getting items:', error);
      throw error;
    }
  },

  /**
   * Get item analytics (patterns, trends, seasonal factors)
   */
  async getItemAnalytics(itemName) {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/item-lookup?q=${encodeURIComponent(itemName)}`);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[ANALYTICS SERVICE] Error getting item analytics:', error);
      throw error;
    }
  },

  /**
   * Get month context for specific item and month
   */
  async getMonthContext(itemName, month) {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/item-month?q=${encodeURIComponent(itemName)}&month=${month}`);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[ANALYTICS SERVICE] Error getting month context:', error);
      throw error;
    }
  },

  /**
   * Get database items list
   */
  async getDatabaseItems() {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/database/items`);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[ANALYTICS SERVICE] Error getting database items:', error);
      throw error;
    }
  },

  /**
   * Get item history
   */
  async getItemHistory(itemName) {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/database/item-lookup?q=${encodeURIComponent(itemName)}`);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[ANALYTICS SERVICE] Error getting item history:', error);
      throw error;
    }
  },

  /**
   * Get monthly sales trends
   */
  async getMonthlySales() {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/monthly-sales`);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[ANALYTICS SERVICE] Error getting monthly sales:', error);
      throw error;
    }
  },

  /**
   * Get top selling products
   */
  async getTopSellers(limit = 5) {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/top-sellers?limit=${limit}`);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[ANALYTICS SERVICE] Error getting top sellers:', error);
      throw error;
    }
  },

  /**
   * Get accuracy statistics
   */
  async getAccuracyStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/accuracy`);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[ANALYTICS SERVICE] Error getting accuracy stats:', error);
      throw error;
    }
  },

  /**
   * Calculate year-wise statistics from items
   */
  calculateYearWiseStats(items) {
    const yearStats = {};
    
    items.forEach(item => {
      const year = new Date(item.date || item.year).getFullYear();
      if (!yearStats[year]) {
        yearStats[year] = {
          totalSales: 0,
          totalRevenue: 0,
          itemCount: 0,
          categories: new Set(),
        };
      }
      
      yearStats[year].totalSales += item.total_sold || 0;
      yearStats[year].totalRevenue += item.revenue || 0;
      yearStats[year].itemCount++;
      if (item.category) yearStats[year].categories.add(item.category);
    });
    
    // Convert Set to array
    Object.keys(yearStats).forEach(year => {
      yearStats[year].categories = Array.from(yearStats[year].categories);
    });
    
    return yearStats;
  },

  /**
   * Calculate category-wise statistics
   */
  calculateCategoryStats(items) {
    const categoryStats = {};
    
    items.forEach(item => {
      const category = item.category || 'Unknown';
      if (!categoryStats[category]) {
        categoryStats[category] = {
          totalSales: 0,
          totalRevenue: 0,
          itemCount: 0,
          avgPrice: 0,
        };
      }
      
      categoryStats[category].totalSales += item.total_sold || 0;
      categoryStats[category].totalRevenue += item.revenue || 0;
      categoryStats[category].itemCount++;
    });
    
    // Calculate average price
    Object.keys(categoryStats).forEach(category => {
      const stats = categoryStats[category];
      stats.avgPrice = stats.totalSales > 0 ? stats.totalRevenue / stats.totalSales : 0;
    });
    
    return categoryStats;
  },

  /**
   * Get top performing items
   */
  getTopItems(items, limit = 10, sortBy = 'total_sold') {
    return [...items]
      .sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0))
      .slice(0, limit);
  },

  /**
   * Calculate monthly trends from history
   */
  calculateMonthlyTrends(history) {
    const monthlyData = {};
    
    history.forEach(record => {
      const date = new Date(record.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          date: monthKey,
          sales: 0,
          count: 0,
        };
      }
      
      monthlyData[monthKey].sales += record.quantity_sold || 0;
      monthlyData[monthKey].count++;
    });
    
    return Object.values(monthlyData).sort((a, b) => a.date.localeCompare(b.date));
  },

  /**
   * Get dashboard historical performance data
   */
  async getDashboardHistorical() {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/dashboard/historical`);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[ANALYTICS SERVICE] Error getting historical data:', error);
      throw error;
    }
  },

  /**
   * Get dashboard forecast data
   */
  async getDashboardForecast() {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/dashboard/forecast`);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[ANALYTICS SERVICE] Error getting forecast data:', error);
      throw error;
    }
  },

  /**
   * Get dashboard year-wise data
   */
  async getDashboardYearwise() {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/dashboard/yearwise`);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[ANALYTICS SERVICE] Error getting yearwise data:', error);
      throw error;
    }
  },

  /**
   * Get deep product analysis
   */
  async getProductAnalysis(itemName) {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/dashboard/product-analysis?item_name=${encodeURIComponent(itemName)}`);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[ANALYTICS SERVICE] Error getting product analysis:', error);
      throw error;
    }
  },
};
