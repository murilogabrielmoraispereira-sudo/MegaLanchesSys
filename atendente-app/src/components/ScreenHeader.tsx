import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { commonStyles } from "../styles/theme";

type Props = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export function ScreenHeader({ title, subtitle, action }: Props) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={commonStyles.eyebrow}>MEGA LANCHES</Text>
        <Text style={commonStyles.title}>{title}</Text>
        {!!subtitle && <Text style={commonStyles.subtitle}>{subtitle}</Text>}
      </View>
      {action}
    </View>
  );
}
