import axios from 'axios';

// Backend API Base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Log in a user using email and password.
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<object>} Returns session and user details
 */
export const loginAPI = async (email, password) => {
  const response = await axios.post(`${API_URL}/auth/login`, { email, password });
  return response.data;
};

/**
 * Log out the current user session.
 * @param {string} token - The active user's JWT access token
 * @returns {Promise<object>}
 */
export const logoutAPI = async (token) => {
  const response = await axios.post(
    `${API_URL}/auth/logout`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
  return response.data;
};

/**
 * Get current session user profile details.
 * @param {string} token - The active user's JWT access token
 * @returns {Promise<object>}
 */
export const getCurrentUserAPI = async (token) => {
  const response = await axios.get(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
};
