// src/utils/storage.js
import * as SecureStore from 'expo-secure-store';

const KEYS = { TOKEN: 'pb_jwt', USER: 'pb_user' };

export const Storage = {
  async save(token, user) {
    await SecureStore.setItemAsync(KEYS.TOKEN, token);
    await SecureStore.setItemAsync(KEYS.USER, JSON.stringify(user));
  },
  async getToken() {
    return await SecureStore.getItemAsync(KEYS.TOKEN);
  },
  async getUser() {
    const raw = await SecureStore.getItemAsync(KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  },
  async clear() {
    await SecureStore.deleteItemAsync(KEYS.TOKEN);
    await SecureStore.deleteItemAsync(KEYS.USER);
  },
};
