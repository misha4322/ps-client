export const BASE_URL = 'https://ps-server-production.up.railway.app';

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
  FAVORITE: (id) => `${BASE_URL}/api/favorites/${id}`,
  BASKET_SYNC: `${BASE_URL}/api/basket/sync`,
  BUILD_COMPONENTS: (id) => `${BASE_URL}/api/builds/${id}/components`,
  USER_ORDERS: `${BASE_URL}/api/orders/user`,
};