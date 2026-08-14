import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://pos-system-lyart-beta.vercel.app/api';

const getHeaders = (token) => ({ Authorization: `Bearer ${token}` });

/**
 * Fetch sales summary and breakdown.
 * @param {string} token 
 */
export const getSalesSummary = async (token) => {
  const response = await axios.get(`${API_URL}/reports/sales-summary`, {
    headers: getHeaders(token)
  });
  return response.data;
};

/**
 * Fetch top products report.
 * @param {string} token 
 */
export const getTopProducts = async (token) => {
  const response = await axios.get(`${API_URL}/reports/top-products`, {
    headers: getHeaders(token)
  });
  return response.data;
};
