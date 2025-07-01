export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${BASE_URL}/api/auth/login`,
    REGISTER: `${BASE_URL}/api/auth/register`,
    CHECK: `${BASE_URL}/api/auth/check`,
    REFRESH: `${BASE_URL}/api/auth/refresh`,
    CHANGE_PASSWORD: `${BASE_URL}/api/auth/change-password`
  },
  COMPONENTS: `${BASE_URL}/api/components`,
  BUILDS: `${BASE_URL}/api/builds`,
  BASKET: `${BASE_URL}/api/basket`,
  FAVORITES: `${BASE_URL}/api/favorites`,
  ORDERS: `${BASE_URL}/api/orders`,

  BASE: BASE_URL
};