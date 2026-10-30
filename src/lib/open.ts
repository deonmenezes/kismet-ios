import { Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";

/** Opens a web page in the in-app browser, falling back to the system browser. Never rejects: resolves false if neither opened. */
export async function openPage(url: string): Promise<boolean> {
  try {
    await WebBrowser.openBrowserAsync(url);
    return true;
  } catch {
    return Linking.openURL(url).then(
      () => true,
      () => false,
    );
  }
}

/** Opens an external link (t.me, wa.me) in its app. Never rejects: resolves false if it couldn't be opened. */
export const openLink = (url: string): Promise<boolean> =>
  Linking.openURL(url).then(
    () => true,
    () => false,
  );
