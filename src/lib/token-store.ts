import * as SecureStore from "expo-secure-store";

const KEY = "agent_dates_token";

// iOS: the token lives in a keychain access group shared with the Kismet iMessage extension
// (plugins/with-messages-extension reads it from Swift with the same service "app:no-auth" and key).
// Builds before 1.0.0 stored it in the app's default group (its application identifier); get() moves it over.
const TEAM = "Q4MU4GRWRD";
const SHARED: SecureStore.SecureStoreOptions =
  process.env.EXPO_OS === "ios"
    ? { accessGroup: `${TEAM}.com.deonmenezes.agentdates.shared`, keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK }
    : {};
const LEGACY: SecureStore.SecureStoreOptions = { accessGroup: `${TEAM}.com.deonmenezes.agentdates` };

async function migrateLegacy(): Promise<string | null> {
  const legacy = await SecureStore.getItemAsync(KEY, LEGACY).catch(() => null);
  if (!legacy) return null;
  try {
    await SecureStore.setItemAsync(KEY, legacy, SHARED);
    await SecureStore.deleteItemAsync(KEY, LEGACY);
  } catch {
    // Keep the old copy; the app still works, only the extension can't see it yet.
  }
  return legacy;
}

export const tokenStore = {
  get: async () => {
    const token = await SecureStore.getItemAsync(KEY, SHARED);
    if (token || process.env.EXPO_OS !== "ios") return token;
    return migrateLegacy();
  },
  set: (token: string) => SecureStore.setItemAsync(KEY, token, SHARED),
  clear: async () => {
    await SecureStore.deleteItemAsync(KEY, SHARED);
    if (process.env.EXPO_OS === "ios") await SecureStore.deleteItemAsync(KEY, LEGACY).catch(() => undefined);
  },
};
