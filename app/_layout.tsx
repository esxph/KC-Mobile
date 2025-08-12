import { Stack } from 'expo-router';
import { UIProvider, useAppColorMode } from '../lib/ui';
import { View, StyleSheet } from 'react-native';

export default function RootLayout() {
  const Background = () => {
    const { colorMode } = useAppColorMode();
    const backgroundColor = colorMode === 'dark' ? '#0b0b0b' : '#ffffff';
    return <View style={[StyleSheet.absoluteFillObject, { backgroundColor }]} />;
  };
  return (
    <UIProvider>
      <Background />
      <Stack screenOptions={{ headerShown: false }} />
    </UIProvider>
  );
}
