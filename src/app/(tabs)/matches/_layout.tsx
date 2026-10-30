import { Stack } from "expo-router";
import { useStackOptions } from "@/components/stack-options";

export default function MatchesStack() {
  const options = useStackOptions();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={{ title: "Matches" }} />
      <Stack.Screen name="[id]" options={{ title: "Your agents' chat", headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
