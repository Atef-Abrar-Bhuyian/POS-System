import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://pos-system-lyart-beta.vercel.app/api';

const getHeaders = (token) => ({ Authorization: `Bearer ${token}` });

/**
 * Send request to place an order.
 * @param {string} token 
 * @param {object} payload - { items: [{ product_id, qty, unit_price }], payment_method, total_amount }
 */
export const createOrder = async (token, payload) => {
  const response = await axios.post(`${API_URL}/orders`, payload, {
    headers: getHeaders(token)
  });
  return response.data;
};

/**
 * Fetch list of recent orders.
 * @param {string} token 
 * @param {object} [params] - Optional query filters (limit, page)
 */
export const getOrders = async (token, params = {}) => {
  const response = await axios.get(`${API_URL}/orders`, {
    headers: getHeaders(token),
    params
  });
  return response.data;
};

/**
 * Fetch a single order by ID with item and payment details.
 * @param {string} token 
 * @param {string} id 
 */
export const getOrderById = async (token, id) => {
  const response = await axios.get(`${API_URL}/orders/${id}`, {
    headers: getHeaders(token)
  });
  return response.data;
};
