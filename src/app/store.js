import { configureStore } from '@reduxjs/toolkit';
import componentsReducer from '../features/componentsSlice';
import userReducer from '../features/userSlice';
import basketReducer from '../features/basketSlice';

const store = configureStore({
  reducer: {
    components: componentsReducer,
    user: userReducer,
    basket: basketReducer,
  },
});
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
export default store;
