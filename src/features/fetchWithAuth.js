import store from '../app/store';
import { API_ENDPOINTS } from '../api/config';
import { refreshToken } from '../features/userSlice';

export async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('token');
  if (!options.headers) options.headers = {};
  if (token) options.headers.Authorization = `Bearer ${token}`;

  let res = await fetch(`${API_ENDPOINTS.BASE}${url}`, options);

  if (res.status === 401) {
    try {

      const newToken = await store.dispatch(refreshToken()).unwrap();
      options.headers.Authorization = `Bearer ${newToken}`;
      res = await fetch(`${API_ENDPOINTS.BASE}${url}`, options);
    } catch {
      store.dispatch(logout());
      throw new Error('Session expired. Please login again.');
    }
  }
  return res;
}