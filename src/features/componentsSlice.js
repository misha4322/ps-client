import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchComponents = createAsyncThunk(
  'components/fetchAll',
  async (_, { rejectWithValue }) => {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const res = await fetch('http://localhost:3001/api/components');
        if (!res.ok) throw new Error('Не удалось загрузить компоненты');
        const data = await res.json();
        localStorage.setItem("cachedComponents", JSON.stringify(data));
        return data;
      } catch (error) {
        attempt++;
        if (attempt === maxRetries) {
          const cached = localStorage.getItem("cachedComponents");
          if (cached) {
            return JSON.parse(cached);
          }
          return rejectWithValue(error.message);
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
);

const componentsSlice = createSlice({
  name: 'components',
  initialState: {
    data: {},
    selectedComponents: {},
    status: 'idle',
    error: null,
  },
  reducers: {
    setSelectedComponents(state, action) {
      state.selectedComponents = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchComponents.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchComponents.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchComponents.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { setSelectedComponents } = componentsSlice.actions;
export default componentsSlice.reducer;