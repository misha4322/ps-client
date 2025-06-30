import { refreshToken, logout } from './userSlice'; 
import store from '../app/store'; // путь к store

export async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('token');
  if (!options.headers) options.headers = {};
  if (token) options.headers.Authorization = `Bearer ${token}`;

  let res = await fetch(url, options);

  // Проверяем: если токен истёк — обновляем, повторяем запрос
  if (res.status === 401) {
    try {
      const refreshRes = await store.dispatch(refreshToken()).unwrap();
      // обновлённый токен уже положен в localStorage
      options.headers.Authorization = `Bearer ${refreshRes}`;
      res = await fetch(url, options); // повторный запрос
    } catch {
      // не удалось обновить токен — логаут
      store.dispatch(logout());
      throw new Error('Ваша сессия истекла. Авторизуйтесь заново.');
    }
  }
  return res;
}
