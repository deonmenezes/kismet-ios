import { useColorScheme } from "react-native";
import { Image } from "expo-image";

/** The Kismet mark (two orbits that make a heart, with a spark), from the brand kit. */
export function Logo({ size = 40 }: { size?: number }) {
  const dark = useColorScheme() === "dark";
  return (
    <Image
      source={dark ? require("../../assets/images/kismet-mark.png") : require("../../assets/images/kismet-mark-light.png")}
      accessibilityLabel="Kismet"
      style={{ width: size, height: size }}
      contentFit="contain"
    />
  );
}

/** Mark + "Kismet" wordmark (E:/kismet-brand svg/logo.svg), for headers. `height` is the wordmark's height. */
export function Wordmark({ height = 28 }: { height?: number }) {
  const dark = useColorScheme() === "dark";
  return (
    <Image
      source={dark ? require("../../assets/images/kismet-logo-dark.png") : require("../../assets/images/kismet-logo.png")}
      accessibilityLabel="Kismet"
      style={{ width: (height * 720) / 186, height }}
      contentFit="contain"
    />
  );
}
