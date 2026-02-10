import axios from "axios";

const API = "http://127.0.0.1:8000";

export const getHistory = async (store, product) => {
  const res = await axios.get(`${API}/history/${store}/${product}`);
  return res.data;
};

export const getForecast = async (store, product, months) => {
  const res = await axios.post(`${API}/forecast`, {
    store_id: store,
    product_id: product,
    months: months
  });
  return res.data;
};

export const getStores = async () => {
  const res = await axios.get(`${API}/stores`);
  return res.data;
};

export const getProducts = async (storeId) => {
  const res = await axios.get(`${API}/products/${storeId}`);
  return res.data;
};

export const predictWithContext = async (data) => {
  const res = await axios.post(`${API}/predict_with_context`, data);
  return res.data;
};

export const getBulkPrediction = async (storeId, predictionDate) => {
  const res = await axios.post(`${API}/bulk_predict`, {
    store_id: storeId,
    prediction_date: predictionDate
  });
  return res.data;
};

export const uploadData = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await axios.post(`${API}/upload_data`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

export const trainModel = async (storeId) => {
  const res = await axios.post(`${API}/train_model`, {
    store_id: storeId
  });
  return res.data;
};

export const getTrainingStatus = async () => {
  const res = await axios.get(`${API}/training_status`);
  return res.data;
};
