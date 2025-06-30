import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchWithAuth } from '../features/fetchWithAuth';

// Функция для получения ID пользователя с учетом оффлайн-режима
const getUserId = () => {
  const userId = localStorage.getItem("currentUserId");
  return userId || "guest";
};

// Загрузка корзины из localStorage
const loadBasket = () => {
  const userId = getUserId();
  const saved = localStorage.getItem(`basket_${userId}`);
  return saved ? JSON.parse(saved) : [];
};

// Функция синхронизации корзины
const syncBasket = (items) => {
  const userId = getUserId();
  localStorage.setItem(`basket_${userId}`, JSON.stringify(items));
  
  // Автоматическая синхронизация с сервером для авторизованных пользователей
  const token = localStorage.getItem('token');
  if (token) {
    fetch('/api/basket/sync', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items }),
    }).catch(error => {
      console.error('Ошибка синхронизации корзины:', error);
    });
  }
};

export const syncBasketWithServer = createAsyncThunk(
  'basket/syncWithServer',
  async (_, { getState, rejectWithValue }) => {
    const state = getState();
    const token = state.user.token;
    const items = state.basket.items;

    try {
      const res = await fetch('/api/basket/sync', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error('Ошибка синхронизации корзины: ' + (errorData.message || res.status));
      }

      const data = await res.json();
      return data.map(item => ({
        build_id: item.build_id,
        cart_id: item.id,
        name: item.name,
        img: item.image_url,
        total_price: item.total_price,
        quantity: item.quantity,
      }));
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const basketSlice = createSlice({
  name: 'basket',
  initialState: {
    items: loadBasket(),
    status: 'idle',
    error: null,
  },
  reducers: {
    addToBasket: (state, action) => {
      const { build_id, name, img, total_price } = action.payload;
      const existingItem = state.items.find(item => item.build_id === build_id);

      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        state.items.push({ 
          build_id, 
          name, 
          img, 
          total_price, 
          quantity: 1 
        });
      }

      // Используем новую функцию синхронизации
      syncBasket(state.items);
    },
    updateQuantity: (state, action) => {
      const { build_id, change } = action.payload;
      const item = state.items.find(item => item.build_id === build_id);

      if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
          state.items = state.items.filter(i => i.build_id !== build_id);
        }
      }

      // Используем новую функцию синхронизации
      syncBasket(state.items);
    },
    removeFromBasket: (state, action) => {
      state.items = state.items.filter(item => item.build_id !== action.payload);
      
      // Используем новую функцию синхронизации
      syncBasket(state.items);
    },
    clearBasket: (state) => {
      state.items = [];
      
      // Используем новую функцию синхронизации
      syncBasket([]);
    },
    loadUserBasket: (state) => {
      const userId = getUserId();
      const saved = localStorage.getItem(`basket_${userId}`);
      state.items = saved ? JSON.parse(saved) : [];
    },
    setBasketItems: (state, action) => {
      state.items = action.payload;
      
      // Используем новую функцию синхронизации
      syncBasket(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(syncBasketWithServer.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(syncBasketWithServer.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
        
        // Используем новую функцию синхронизации
        syncBasket(action.payload);
      })
      .addCase(syncBasketWithServer.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        
        // Сохраняем текущее состояние корзины при ошибке
        syncBasket(state.items);
      });
  },
});

export const { 
  addToBasket, 
  updateQuantity, 
  removeFromBasket, 
  clearBasket,
  loadUserBasket,
  setBasketItems 
} = basketSlice.actions;
export default basketSlice.reducer;