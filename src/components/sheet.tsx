import { createContext, use, useEffect, useRef, useState, type ReactNode } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { serif, useColors } from "@/theme/colors";

// One cross-platform action sheet / confirm dialog (Alert.alert does nothing on web).
export type SheetAction = { label: string; destructive?: boolean; primary?: boolean; onPress: () => void };
export type SheetSpec = { title: string; message?: string; actions: SheetAction[]; cancelLabel?: string };

const SheetContext = createContext<((spec: SheetSpec) => void) | null>(null);
const ToastContext = createContext<((text: string) => void) | null>(null);

export function SheetProvider({ children }: { children: ReactNode }) {
  const [spec, setSpec] = useState<SheetSpec | null>(null);
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const c = useColors();
  const insets = useSafeAreaInsets();
  const close = () => setSpec(null);
  const showToast = (text: string) => setToast((t) => ({ text, n: (t?.n ?? 0) + 1 }));

  useEffect(() => {
    if (!toast) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast]);

  return (
    <SheetContext value={setSpec}>
     <ToastContext value={showToast}>
      {children}
      {toast && (
        <Animated.View
          key={toast.n}
          entering={FadeInUp.springify()}
          exiting={FadeOutUp}
          pointerEvents="box-none"
          style={{ position: "absolute", top: insets.top + 8, left: 16, right: 16, alignItems: "center", zIndex: 1000 }}
        >
          <Pressable
            accessibilityRole="alert"
            onPress={() => setToast(null)}
            style={{
              backgroundColor: c.ink,
              borderRadius: 18,
              paddingHorizontal: 16,
              paddingVertical: 12,
              maxWidth: 520,
                          }}
          >
            <Text selectable style={{ color: c.bg, fontSize: 14, fontWeight: "600", lineHeight: 20 }}>
              {toast.text}
            </Text>
          </Pressable>
        </Animated.View>
      )}
      <Modal visible={Boolean(spec)} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
        <Pressable accessibilityLabel="Close" onPress={close} style={{ flex: 1, backgroundColor: c.scrim, justifyContent: "flex-end" }}>
          <Pressable
            onPress={() => undefined}
            style={{
              backgroundColor: c.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              borderCurve: "continuous",
              paddingTop: 24,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
              gap: 10,
              width: "100%",
              maxWidth: 560,
              alignSelf: "center",
            }}
          >
            {spec && (
              <>
                <View style={{ gap: 4, paddingHorizontal: 4, paddingBottom: 6 }}>
                  <Text style={{ color: c.ink, fontFamily: serif.title, fontSize: 24, lineHeight: 30, textAlign: "center" }}>{spec.title}</Text>
                  {spec.message ? (
                    <Text style={{ color: c.muted, fontSize: 15, lineHeight: 21, textAlign: "center" }}>{spec.message}</Text>
                  ) : null}
                </View>
                {spec.actions.map((a) => (
                  <Pressable
                    key={a.label}
                    accessibilityRole="button"
                    onPress={() => {
                      close();
                      a.onPress();
                    }}
                    style={({ pressed }) => ({
                      minHeight: 52,
                      borderRadius: 999,
                      backgroundColor: a.primary ? c.coral : "transparent",
                      borderWidth: a.primary ? 0 : 1,
                      borderColor: c.lineStrong,
                      opacity: pressed ? 0.8 : 1,
                      alignItems: "center",
                      justifyContent: "center",
                    })}
                  >
                    <Text style={{ color: a.primary ? c.onAccent : a.destructive ? c.coralInk : c.ink, fontSize: 16, fontWeight: "600" }}>{a.label}</Text>
                  </Pressable>
                ))}
                <Pressable
                  accessibilityRole="button"
                  onPress={close}
                  style={{ minHeight: 52, alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ color: c.muted, fontSize: 16, fontWeight: "500" }}>{spec.cancelLabel ?? "Cancel"}</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
     </ToastContext>
    </SheetContext>
  );
}

export function useSheet() {
  const show = use(SheetContext);
  if (!show) throw new Error("useSheet must be used inside SheetProvider");
  return show;
}

export function useToast() {
  const show = use(ToastContext);
  if (!show) throw new Error("useToast must be used inside SheetProvider");
  return show;
}
