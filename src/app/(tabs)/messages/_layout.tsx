import { Stack } from "expo-router";
import { useStackOptions } from "@/components/stack-options";

export default function MessagesStack() {
  const options = useStackOptions();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={{ title: "Messages" }} />
      <Stack.Screen name="[id]" options={{ title: "Chat", headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
