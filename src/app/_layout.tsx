import { useEffect } from "react";
import { AppState, useColorScheme } from "react-native";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { Fraunces_400Regular, Fraunces_400Regular_Italic, Fraunces_600SemiBold, useFonts } from "@expo-google-fonts/fraunces";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import NetInfo from "@react-native-community/netinfo";
import { focusManager, onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { SheetProvider } from "@/components/sheet";
import { palettes } from "@/theme/colors";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (n, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && n < 2,
    },
  },
});

// Refetch when the app comes back to the foreground, and pause queries while offline.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((s) => setOnline(s.isConnected !== false)),
);

function useAppFocus() {
  useEffect(() => {
    if (process.env.EXPO_OS === "web") return;
    const sub = AppState.addEventListener("change", (s) => focusManager.setFocused(s === "active"));
    return () => sub.remove();
  }, []);
}

function RootStack() {
  const { ready: authReady, token } = useAuth();
  // Fraunces ships inside the app bundle (no network). If it ever fails to load, the system font is used.
  const [fontsLoaded, fontError] = useFonts({ Fraunces_400Regular, Fraunces_400Regular_Italic, Fraunces_600SemiBold });
  const ready = authReady && (fontsLoaded || Boolean(fontError));
  const scheme = useColorScheme();
  const c = scheme === "dark" ? palettes.dark : palettes.light;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  // Gate on the stored token so a signed-in resident never sees the welcome screen flash.
  if (!ready) return null;
  const signedIn = Boolean(token);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.bg },
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.ink,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Protected guard={signedIn} redirectTo="/welcome">
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="report"
          options={{
            presentation: "formSheet",
            sheetGrabberVisible: true,
            sheetAllowedDetents: [0.85],
            headerShown: false,
            contentStyle: { backgroundColor: c.bg },
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn} redirectTo="/">
        <Stack.Screen name="welcome" />
        <Stack.Screen name="quiz" options={{ gestureEnabled: false }} />
        <Stack.Screen name="sign-in" options={{ headerShown: true, title: "Sign in" }} />
      </Stack.Protected>
      <Stack.Screen name="u/[token]" />
    </Stack>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  useAppFocus();
  const c = scheme === "dark" ? palettes.dark : palettes.light;
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, primary: c.coral, background: c.bg, card: c.bg, text: c.ink, border: c.line },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.bg }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={theme}>
          <AuthProvider>
            <SheetProvider>
              <RootStack />
              <StatusBar style="auto" />
            </SheetProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
