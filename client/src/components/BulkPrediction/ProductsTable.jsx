import React from 'react';
import ProductRow from './ProductRow';
import './ProductsTable.css';

const ProductsTable = ({ products, expandedId, onToggleExpand, predictionDate }) => {
  if (products.length === 0) {
    return (
      <div className="no-results">
        <div className="no-results-icon">🔍</div>
        <h3>No products found</h3>
        <p>Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="products-table-container">
      <table className="products-table">
        <thead>
          <tr>
            <th></th>
            <th>Product/Item</th>
            <th>Category</th>
            <th>Current Stock</th>
            <th>Predicted Demand</th>
            <th>Trend</th>
            <th>Order Quantity</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <ProductRow
              key={product.item_id || product.item_name}
              product={product}
              isExpanded={expandedId === (product.item_id || product.item_name)}
              onToggleExpand={onToggleExpand}
              predictionDate={predictionDate}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductsTable;
