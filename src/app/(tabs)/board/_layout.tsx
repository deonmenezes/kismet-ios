import { Stack } from "expo-router";
import { useStackOptions } from "@/components/stack-options";

export default function BoardStack() {
  const options = useStackOptions();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={{ title: "Village Board" }} />
    </Stack>
  );
}
