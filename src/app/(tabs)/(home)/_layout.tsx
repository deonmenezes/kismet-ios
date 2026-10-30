import { Stack } from "expo-router";
import { Wordmark } from "@/components/logo";
import { useStackOptions } from "@/components/stack-options";

export default function HomeStack() {
  const options = useStackOptions();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={{ title: "Your intros", headerTitle: () => <Wordmark height={22} /> }} />
    </Stack>
  );
}
