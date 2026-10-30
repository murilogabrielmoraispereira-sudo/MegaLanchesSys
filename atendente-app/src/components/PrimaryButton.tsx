import { ActivityIndicator, Pressable, Text } from "react-native";
import { colors, commonStyles } from "../styles/theme";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  secondary?: boolean;
};

export function PrimaryButton({ title, onPress, disabled, loading, secondary }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        commonStyles.button,
        secondary && commonStyles.buttonSecondary,
        (disabled || loading) && { opacity: 0.55 },
        pressed && { opacity: 0.82, transform: [{ scale: 0.99 }] },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.primary : "#fff"} />
      ) : (
        <Text style={[commonStyles.buttonText, secondary && commonStyles.buttonSecondaryText]}>{title}</Text>
      )}
    </Pressable>
  );
}
