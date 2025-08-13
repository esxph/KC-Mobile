import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Box, HStack, Text } from '@gluestack-ui/themed';
import { FileText, Settings, Clock } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppColorMode } from '../../lib/ui';
import { View, TouchableOpacity } from 'react-native';
import { Redirect } from 'expo-router';
import { getAccessToken } from '../../lib/auth';

export default function TabsLayout() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      setAuthed(!!token);
      setChecking(false);
    })();
  }, []);
  const insets = useSafeAreaInsets();
  const { colorMode } = useAppColorMode();

  const CustomTabBar = ({ state, descriptors, navigation }: any) => {
    const iconMap: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
      reports: FileText,
      pending: Clock,
      settings: Settings,
    };
    // Slightly lighter container in dark mode for contrast
    const bg = colorMode === 'dark' ? '#2a2a2a' : '#f2f2f2';
    const activeBg = colorMode === 'dark' ? '#121212' : '#ffffff';
    const activeColor = colorMode === 'dark' ? '#ffffff' : '#000000';
    const inactiveColor = colorMode === 'dark' ? '#c2c2c2' : '#444444';

    return (
      <Box position="absolute" left={0} right={0} bottom={insets.bottom + 12} px="$4">
        <Box bg={bg} borderRadius="$full" p="$1">
          <HStack space="sm" alignItems="center">
            {state.routes.map((route: any, index: number) => {
              const isFocused = state.index === index;
              const onPress = () => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };
              return (
                <TouchableOpacity key={route.key} onPress={onPress} style={{ flex: 1 }} activeOpacity={0.8}>
                  <Box bg={isFocused ? activeBg : 'transparent'} borderRadius="$full" py="$2.5" px="$4" alignItems="center" style={{ overflow: 'hidden' }}>
                    {(() => { const Icon = iconMap[route.name] || FileText; return <Icon size={20} color={isFocused ? activeColor : inactiveColor} />; })()}
                    <Text mt="$1" fontSize={14} fontWeight="$semibold" color={isFocused ? activeColor : inactiveColor}>
                      {descriptors[route.key]?.options?.title ?? route.name}
                    </Text>
                  </Box>
                </TouchableOpacity>
              );
            })}
          </HStack>
        </Box>
      </Box>
    );
  };

  const backgroundColor = colorMode === 'dark' ? '#0b0b0b' : '#ffffff';
  if (checking) return null;
  if (!authed) return <Redirect href="/(auth)" />;
  return (
    <View style={{ flex: 1, backgroundColor }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { position: 'absolute' },
        }}
        tabBar={(props)=> <CustomTabBar {...props} /> }
      >
      <Tabs.Screen name="reports" options={{ title: 'Reportes' }} />
      <Tabs.Screen name="pending" options={{ title: 'Pendiente' }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes' }} />
      </Tabs>
    </View>
  );
}
