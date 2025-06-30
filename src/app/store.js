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

export default store;
