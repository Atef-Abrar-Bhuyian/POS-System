import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getHeaders = (token) => ({ Authorization: `Bearer ${token}` });

export const getCategories = (token) =>
  axios.get(`${API_URL}/categories`, { headers: getHeaders(token) }).then(r => r.data);

export const createCategory = (token, name) =>
  axios.post(`${API_URL}/categories`, { name }, { headers: getHeaders(token) }).then(r => r.data);

export const deleteCategory = (token, id) =>
  axios.delete(`${API_URL}/categories/${id}`, { headers: getHeaders(token) }).then(r => r.data);
