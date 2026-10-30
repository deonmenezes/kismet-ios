import { useState } from "react";
import { TextInput } from "react-native";
import { useColors } from "@/theme/colors";

type FieldProps = React.ComponentProps<typeof TextInput> & { big?: boolean };

export function Field({ big, style, ...props }: FieldProps) {
  const c = useColors();
  const [focus, setFocus] = useState(false);
  return (
    <TextInput
      placeholderTextColor={c.muted}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={[
        {
          color: c.ink,
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: focus ? c.ink : c.lineStrong,
          borderRadius: 14,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontSize: big ? 20 : 17,
        },
        // Web only: the browser's own focus ring would cover the coral focus border.
        process.env.EXPO_OS === "web" ? ({ outlineStyle: "none" } as object) : null,
        style,
      ]}
      {...props}
    />
  );
}
