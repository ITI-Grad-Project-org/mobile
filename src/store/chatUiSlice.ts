import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export const CLIENT_THREAD = 'me';

interface ChatUiState {
  connected: boolean;
  /** clientId -> the other party is typing. */
  typingByClientId: Record<string, boolean>;
  openClientId: string | null;
}

const initialState: ChatUiState = {
  connected: false,
  typingByClientId: {},
  openClientId: null,
};

const chatUiSlice = createSlice({
  name: 'chatUi',
  initialState,
  reducers: {
    setChatConnected(state, action: PayloadAction<boolean>) {
      state.connected = action.payload;
      if (!action.payload) state.typingByClientId = {};
    },
    setTyping(state, action: PayloadAction<{ clientId: string; isTyping: boolean }>) {
      const { clientId, isTyping } = action.payload;
      if (isTyping) state.typingByClientId[clientId] = true;
      else delete state.typingByClientId[clientId];
    },
    setOpenThread(state, action: PayloadAction<string | null>) {
      state.openClientId = action.payload;
    },
    clearChatUi() {
      return initialState;
    },
  },
});

export const { setChatConnected, setTyping, setOpenThread, clearChatUi } = chatUiSlice.actions;
export default chatUiSlice.reducer;
