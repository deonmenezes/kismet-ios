import { Stack } from "expo-router";
import { useStackOptions } from "@/components/stack-options";

export default function MeStack() {
  const options = useStackOptions();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={{ title: "Me" }} />
      <Stack.Screen name="edit" options={{ title: "Edit profile", headerShown: false }} />
      <Stack.Screen name="blocked" options={{ title: "Blocked people", headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
