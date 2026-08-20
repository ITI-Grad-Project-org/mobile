import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { AppState } from 'react-native';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import authReducer from './authSlice';
import activeTenantReducer from './activeTenantSlice';
import membershipsReducer from './membershipsSlice';
import chatUiReducer from './chatUiSlice';
import checkinReviewsReducer from './checkinReviewsSlice';
import assistantReducer from './assistantSlice';
import { baseApi } from '@/api/baseApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    activeTenant: activeTenantReducer,
    memberships: membershipsReducer,
    chatUi: chatUiReducer,
    checkinReviews: checkinReviewsReducer,
    assistant: assistantReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(baseApi.middleware),
});

/**
 * RTK Query's default listeners bind to DOM `window` focus events, which don't
 * exist in React Native — so app foreground is dispatched off AppState instead.
 *
 * This only makes the signal available. Nothing refetches on its own: an
 * endpoint has to opt in with `refetchOnFocus` at its call site, so this is not
 * an app-wide refetch storm every time the app is reopened.
 */
setupListeners(store.dispatch, (dispatch, actions) => {
  const subscription = AppState.addEventListener('change', (state) => {
    dispatch(state === 'active' ? actions.onFocus() : actions.onFocusLost());
  });
  return () => subscription.remove();
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
