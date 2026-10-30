// expo-secure-store has no web implementation; the web build (used for previews and tests) keeps the
// token in localStorage instead.
const KEY = "agent_dates_token";

const storage = () => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

export const tokenStore = {
  get: async () => storage()?.getItem(KEY) ?? null,
  set: async (token: string) => storage()?.setItem(KEY, token),
  clear: async () => storage()?.removeItem(KEY),
};
