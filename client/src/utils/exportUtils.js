/**
 * Export utilities for data table
 * Supports CSV, JSON, and Excel formats
 */

export const exportToCSV = (data, filename = 'export.csv') => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvRows = [];

  // Add headers
  csvRows.push(headers.map(h => `"${h}"`).join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '""';

      const stringValue = String(value);
      // Escape quotes and wrap in quotes if contains comma or newline
      const escaped = stringValue.replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  const csv = csvRows.join('\n');
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
};

export const exportToJSON = (data, filename = 'export.json') => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  const json = JSON.stringify(data, null, 2);
  downloadFile(json, filename, 'application/json;charset=utf-8;');
};

export const exportToExcel = async (data, filename = 'export.xlsx') => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  try {
    // Dynamically import xlsx library
    const XLSX = await import('xlsx');

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');

    // Auto-size columns
    const colWidths = Object.keys(data[0]).map(key => ({
      wch: Math.max(
        key.length,
        Math.max(...data.map(row => String(row[key] || '').length))
      ) + 2
    }));
    ws['!cols'] = colWidths;

    // Write file
    XLSX.writeFile(wb, filename);
  } catch (error) {
    console.error('Excel export failed:', error);
    alert('Excel export requires xlsx library. Falling back to CSV.');
    exportToCSV(data, filename.replace('.xlsx', '.csv'));
  }
};

export const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

export const generatePredictionReport = (predictions, reportType = 'previous_years') => {
  /**
   * Generate a formatted report for predictions with cost calculations
   */
  const timestamp = new Date().toLocaleString('en-IN');
  const reportData = [];

  // Add header
  reportData.push({
    'Report Type': reportType === 'previous_years' ? 'Previous Years Analysis' : 'Last N Months Analysis',
    'Generated': timestamp,
    'Total Items': predictions.length
  });

  reportData.push({}); // Empty row for spacing

  let totalNetRevenue = 0;
  let totalExpectedProfit = 0;

  // Add predictions
  for (const pred of predictions) {
    const salesPrice = pred.price || 0;
    const purchasePrice = pred.purchase_price || 0;
    const predictedDemand = pred.prediction || 0;
    
    const expectedRevenue = salesPrice * predictedDemand;
    const expectedCost = purchasePrice * predictedDemand;
    const expectedProfit = expectedRevenue - expectedCost;
    const profitMargin = purchasePrice > 0 ? ((salesPrice - purchasePrice) / purchasePrice) * 100 : 0;
    
    totalNetRevenue += expectedRevenue;
    totalExpectedProfit += expectedProfit;

    if (reportType === 'previous_years') {
      reportData.push({
        'Item Name': pred.item_name,
        'Target Month': pred.target_month,
        'Purchase Price (₹)': purchasePrice.toFixed(2),
        'Sales Price (₹)': salesPrice.toFixed(2),
        'Predicted Demand (Units)': Math.round(predictedDemand),
        'Total Expected Revenue (₹)': expectedRevenue.toFixed(2),
        'Expected Profit (₹)': expectedProfit.toFixed(2),
        'Profit Margin (%)': `${profitMargin.toFixed(2)}%`,
        'Low Sales': pred.statistics?.low_sales || 0,
        'High Sales': pred.statistics?.high_sales || 0,
        'Average Sales': pred.statistics?.average_sales || 0,
        'Trend': pred.statistics?.trend || 'N/A'
      });

      // Add yearly breakdown
      if (pred.yearly_data && pred.yearly_data.length > 0) {
        reportData.push({
          'Item Name': `${pred.item_name} - Yearly Breakdown`,
          'Year': 'Year',
          'Month': 'Month',
          'Units': 'Units',
          'Sales (₹)': 'Sales'
        });

        for (const year of pred.yearly_data) {
          reportData.push({
            'Item Name': '',
            'Year': year.year,
            'Month': year.month,
            'Units': year.units,
            'Sales (₹)': year.sales.toFixed(2)
          });
        }
      }
    } else {
      reportData.push({
        'Item Name': pred.item_name,
        'Months Analyzed': pred.n_months,
        'Purchase Price (₹)': purchasePrice.toFixed(2),
        'Sales Price (₹)': salesPrice.toFixed(2),
        'Predicted Demand (Units)': Math.round(predictedDemand),
        'Total Expected Revenue (₹)': expectedRevenue.toFixed(2),
        'Expected Profit (₹)': expectedProfit.toFixed(2),
        'Profit Margin (%)': `${profitMargin.toFixed(2)}%`,
        'Low Sales': pred.statistics?.low_sales || 0,
        'High Sales': pred.statistics?.high_sales || 0,
        'Average Sales': pred.statistics?.average_sales || 0,
        'Trend': pred.statistics?.trend || 'N/A'
      });

      // Add monthly breakdown
      if (pred.monthly_data && pred.monthly_data.length > 0) {
        reportData.push({
          'Item Name': `${pred.item_name} - Monthly Breakdown`,
          'Date': 'Date',
          'Year': 'Year',
          'Month': 'Month',
          'Units': 'Units',
          'Sales (₹)': 'Sales'
        });

        for (const month of pred.monthly_data) {
          reportData.push({
            'Item Name': '',
            'Date': month.date,
            'Year': month.year,
            'Month': month.month,
            'Units': month.units,
            'Sales (₹)': month.sales.toFixed(2)
          });
        }
      }
    }

    reportData.push({}); // Empty row for spacing
  }

  // Add summary section
  reportData.push({});
  reportData.push({
    'SUMMARY': '═══════════════════════════════════════',
    'Total Items': predictions.length,
    'Total Predicted Demand': Math.round(predictions.reduce((sum, p) => sum + (p.prediction || 0), 0)),
    'Total Expected Revenue (₹)': totalNetRevenue.toFixed(2),
    'Total Expected Profit (₹)': totalExpectedProfit.toFixed(2)
  });

  return reportData;
};

export const exportPredictionReport = (predictions, reportType = 'previous_years', format = 'csv') => {
  const reportData = generatePredictionReport(predictions, reportType);
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `prediction-report-${reportType}-${timestamp}`;

  if (format === 'csv') {
    exportToCSV(reportData, `${filename}.csv`);
  } else if (format === 'json') {
    exportToJSON(reportData, `${filename}.json`);
  } else if (format === 'xlsx') {
    exportToExcel(reportData, `${filename}.xlsx`);
  }
};

export const generateSummaryStats = (data) => {
  /**
   * Generate summary statistics from data array
   */
  if (!data || data.length === 0) {
    return {
      total: 0,
      average: 0,
      min: 0,
      max: 0,
      sum: 0
    };
  }

  const values = data.filter(v => typeof v === 'number' && !isNaN(v));

  if (values.length === 0) {
    return {
      total: data.length,
      average: 0,
      min: 0,
      max: 0,
      sum: 0
    };
  }

  const sum = values.reduce((a, b) => a + b, 0);
  const average = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  return {
    total: data.length,
    average: Math.round(average * 100) / 100,
    min,
    max,
    sum: Math.round(sum * 100) / 100
  };
};
