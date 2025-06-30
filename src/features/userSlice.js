import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { setBasketItems } from "./basketSlice";

const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Failed to parse JWT", e);
    return null;
  }
};

// Функция для получения начального состояния с учетом оффлайн-режима
const getInitialState = () => {
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('userData');
  let user = null;
  let favorites = [];
  let orders = []; // Добавляем заказы
  let isInitialized = false;

  if (token && userData) {
    try {
      user = JSON.parse(userData);
      isInitialized = true;
      
      // Загрузка избранного из localStorage
      const userFavorites = localStorage.getItem(`favorites_${user.id}`);
      if (userFavorites) {
        favorites = JSON.parse(userFavorites);
      }
      
      // Загрузка заказов из localStorage
      const userOrders = localStorage.getItem(`orders_${user.id}`);
      if (userOrders) {
        orders = JSON.parse(userOrders);
      }
    } catch (e) {
      console.error('Error parsing saved user data:', e);
    }
  }

  return {
    user,
    token,
    favorites,
    orders, // Добавляем заказы в начальное состояние
    isInitialized,
    error: null,
    status: 'idle',
  };
};

const initialState = getInitialState();

export const initializeUser = createAsyncThunk(
  'user/initialize',
  async (_, { dispatch, rejectWithValue }) => {
    const token = localStorage.getItem("token");
    
    if (!token) {
      return { user: null, token: null, favorites: [], orders: [], isInitialized: true };
    }

    try {
      const res = await fetch('/api/auth/check', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        // Оставляем токен для оффлайн-режима, если статус не 401
        if (res.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("userData");
        }
        throw new Error("Invalid token");
      }

      const user = await res.json();
      localStorage.setItem("currentUserId", user.id);
      localStorage.setItem("userData", JSON.stringify(user));

      // Загрузка избранного
      let favorites = [];
      try {
        const favoritesRes = await fetch('/api/favorites', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (favoritesRes.ok) {
          favorites = await favoritesRes.json();
          localStorage.setItem(`favorites_${user.id}`, JSON.stringify(favorites));
        }
      } catch (favoritesError) {
        console.warn("Failed to load favorites", favoritesError);
      }

      // Загрузка заказов
      let orders = [];
      try {
        const ordersRes = await fetch('/api/orders', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (ordersRes.ok) {
          orders = await ordersRes.json();
          localStorage.setItem(`orders_${user.id}`, JSON.stringify(orders));
        }
      } catch (ordersError) {
        console.warn("Failed to load orders", ordersError);
      }

      // Загрузка корзины
      try {
        const basketRes = await fetch('/api/basket', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (basketRes.ok) {
          const basket = await basketRes.json();
          dispatch(setBasketItems(basket.map(item => ({
            build_id: item.build_id,
            cart_id: item.id,
            name: item.name,
            img: item.image_url,
            total_price: item.total_price,
            quantity: item.quantity,
          }))));
        }
      } catch (basketError) {
        console.warn("Failed to load basket", basketError);
      }

      return { 
        user, 
        token, 
        favorites,
        orders, // Возвращаем заказы
        isInitialized: true 
      };
    } catch (error) {
      // Оффлайн режим - используем сохраненные данные
      const userData = localStorage.getItem("userData");
      if (userData) {
        const user = JSON.parse(userData);
        const favorites = JSON.parse(localStorage.getItem(`favorites_${user.id}`) || '[]');
        const orders = JSON.parse(localStorage.getItem(`orders_${user.id}`) || '[]');
        return { 
          user, 
          token, 
          favorites,
          orders, // Возвращаем заказы в оффлайн-режиме
          isInitialized: true 
        };
      }
      
      return rejectWithValue(error.message);
    }
  }
);

export const addFavoriteAsync = createAsyncThunk(
  'user/addFavorite',
  async (build, { getState, rejectWithValue }) => {
    const token = getState().user.token;
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ build_id: build.id }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        return rejectWithValue(errorData.message || 'Failed to add favorite');
      }
      
      return await res.json();
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const removeFavoriteAsync = createAsyncThunk(
  'user/removeFavorite',
  async (favoriteId, { getState, rejectWithValue }) => {
    const token = getState().user.token;
    try {
      const res = await fetch(`/api/favorites/${favoriteId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        return rejectWithValue(errorData.message || 'Failed to remove favorite');
      }
      
      return favoriteId;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const changePassword = createAsyncThunk(
  'user/changePassword',
  async ({ currentPassword, newPassword }, { getState, rejectWithValue }) => {
    const { token } = getState().user;
    
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to change password');
      }

      return await res.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateFavoriteAsync = createAsyncThunk(
  'user/updateFavorite',
  async ({ buildId, updatedBuild }, { rejectWithValue }) => {
    try {
      const res = await fetch(`/api/builds/${buildId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedBuild),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        return rejectWithValue(errorData.message || 'Failed to update favorite');
      }
      
      return await res.json();
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const refreshToken = createAsyncThunk(
  'user/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    const { token } = getState().user;
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Не удалось обновить токен');
      }
      const data = await res.json();
      // Сохраняем новый токен
      localStorage.setItem('token', data.token);
      return data.token;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser(state, action) {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isInitialized = true;
      
      localStorage.setItem("token", token);
      localStorage.setItem("currentUserId", user.id);
      localStorage.setItem("userData", JSON.stringify(user));
    },
    logout(state) {
      const userId = state.user?.id;
      
      if (userId) {
        localStorage.removeItem(`basket_${userId}`);
        localStorage.removeItem(`favorites_${userId}`);
        localStorage.removeItem(`orders_${userId}`); // Удаляем заказы
      }
      
      state.user = null;
      state.token = null;
      state.favorites = [];
      state.orders = []; // Очищаем заказы
      state.isInitialized = true;
      
      localStorage.removeItem("token");
      localStorage.removeItem("currentUserId");
      localStorage.removeItem("userData");
    },
    setFavorites(state, action) {
      state.favorites = action.payload;
      if (state.user) {
        localStorage.setItem(`favorites_${state.user.id}`, JSON.stringify(action.payload));
      }
    },
    addFavorite(state, action) {
      state.favorites.push(action.payload);
      if (state.user) {
        localStorage.setItem(`favorites_${state.user.id}`, JSON.stringify(state.favorites));
      }
    },
    removeFavorite(state, action) {
      state.favorites = state.favorites.filter(fav => fav.id !== action.payload);
      if (state.user) {
        localStorage.setItem(`favorites_${state.user.id}`, JSON.stringify(state.favorites));
      }
    },
    // Добавляем редьюсер для заказов
    addOrder(state, action) {
      state.orders.push(action.payload);
      if (state.user) {
        localStorage.setItem(`orders_${state.user.id}`, JSON.stringify(state.orders));
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeUser.pending, (state) => {
        state.isInitialized = false;
        state.error = null;
      })
      .addCase(initializeUser.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.favorites = action.payload.favorites || [];
          state.orders = action.payload.orders || []; // Устанавливаем заказы
          state.isInitialized = true;
          
          if (state.user) {
            localStorage.setItem("currentUserId", action.payload.user.id);
            localStorage.setItem(`favorites_${action.payload.user.id}`, JSON.stringify(action.payload.favorites || []));
            localStorage.setItem(`orders_${action.payload.user.id}`, JSON.stringify(action.payload.orders || []));
          }
        } else {
          state.user = null;
          state.token = null;
          state.favorites = [];
          state.orders = []; // Очищаем заказы
          state.isInitialized = true;
        }
      })
      .addCase(initializeUser.rejected, (state, action) => {
        state.isInitialized = true;
        state.error = action.payload;
        state.user = null;
        state.token = null;
        state.favorites = [];
        state.orders = []; // Очищаем заказы
      })
      .addCase(addFavoriteAsync.fulfilled, (state, action) => {
        state.favorites.push(action.payload);
        if (state.user) {
          localStorage.setItem(`favorites_${state.user.id}`, JSON.stringify(state.favorites));
        }
      })
      .addCase(addFavoriteAsync.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(removeFavoriteAsync.fulfilled, (state, action) => {
        state.favorites = state.favorites.filter(fav => fav.id !== action.payload);
        if (state.user) {
          localStorage.setItem(`favorites_${state.user.id}`, JSON.stringify(state.favorites));
        }
      })
      .addCase(removeFavoriteAsync.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(changePassword.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.status = 'succeeded';
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(updateFavoriteAsync.fulfilled, (state, action) => {
        const updatedBuild = action.payload;
        state.favorites = state.favorites.map(fav => 
          fav.id === updatedBuild.id ? updatedBuild : fav
        );
        if (state.user) {
          localStorage.setItem(`favorites_${state.user.id}`, JSON.stringify(state.favorites));
        }
      })
      .addCase(updateFavoriteAsync.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.token = action.payload;
      });
  },
});

export const {
  setUser,
  logout,
  setFavorites,
  addFavorite,
  removeFavorite,
  addOrder, 
} = userSlice.actions;
export default userSlice.reducer;