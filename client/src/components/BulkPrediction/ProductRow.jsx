import React from 'react';
import ExpandedDetails from './ExpandedDetails';
import './ProductRow.css';

const ProductRow = ({ product, isExpanded, onToggleExpand, predictionDate }) => {
  const stockStatus = product.stock_status;
  const orderPriority = product.order_priority;
  
  return (
    <>
      <tr className={`product-row ${stockStatus.class}`}>
        <td>
          <span className={`status-indicator ${stockStatus.class}`}>
            {stockStatus.emoji}
          </span>
        </td>
        <td>
          <div className="product-name">
            {product.item_name}
          </div>
        </td>
        <td>
          <span className={`category-badge ${product.category?.toLowerCase()}`}>
            {product.category}
          </span>
        </td>
        <td>
          <span className="stock-value">
            {product.stock_data_available === false
              ? <span style={{ color: '#64748b', fontSize: '0.85em' }} title="No recent stock data available">–</span>
              : Math.round(product.current_stock)
            }
          </span>
        </td>
        <td>
          <span className="demand-value">{Math.round(product.final_prediction)}</span>
        </td>
        <td>
          <span className={`trend-badge ${product.trend}`}>
            {product.trend_emoji} {product.trend}
          </span>
        </td>
        <td>
          <span className={`order-badge ${orderPriority.class}`}>
            {Math.round(product.recommended_order)}
          </span>
        </td>
        <td>
          <button
            onClick={() => onToggleExpand(product.item_id || product.item_name)}
            className="expand-btn"
            title={isExpanded ? 'Hide Details' : 'Show Details'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr className="expanded-row">
          <td colSpan="8">
            <ExpandedDetails product={product} predictionDate={predictionDate} />
          </td>
        </tr>
      )}
    </>
  );
};

export default ProductRow;
