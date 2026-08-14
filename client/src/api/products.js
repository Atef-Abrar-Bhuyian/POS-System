import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getHeaders = (token) => ({ Authorization: `Bearer ${token}` });

export const getProducts = (token, params = {}) =>
  axios.get(`${API_URL}/products`, { headers: getHeaders(token), params }).then(r => r.data);

export const getLowStockProducts = (token) =>
  axios.get(`${API_URL}/products/low-stock`, { headers: getHeaders(token) }).then(r => r.data);

export const getProduct = (token, id) =>
  axios.get(`${API_URL}/products/${id}`, { headers: getHeaders(token) }).then(r => r.data);

export const createProduct = (token, payload) =>
  axios.post(`${API_URL}/products`, payload, { headers: getHeaders(token) }).then(r => r.data);

export const updateProduct = (token, id, payload) =>
  axios.put(`${API_URL}/products/${id}`, payload, { headers: getHeaders(token) }).then(r => r.data);

export const deleteProduct = (token, id) =>
  axios.delete(`${API_URL}/products/${id}`, { headers: getHeaders(token) }).then(r => r.data);
