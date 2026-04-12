import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';

interface TabBarIconProps {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
}

export function TabBarIcon({ name, color }: TabBarIconProps) {
  return (
    <Ionicons
      size={28}
      style={styles.icon}
      name={name}
      color={color}
    />
  );
}

const styles = StyleSheet.create({
  icon: {
    marginBottom: -3,
  },
});
