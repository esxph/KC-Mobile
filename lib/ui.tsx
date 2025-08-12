import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { GluestackUIProvider, config as defaultConfig } from '@gluestack-ui/themed';
import config from '../gluestack-ui.config';
import { useColorScheme, View, Platform } from 'react-native';

type ColorMode = 'light' | 'dark';
type AppColorModeContextValue = { colorMode: ColorMode; setColorMode: (mode: ColorMode) => void };

const AppColorModeContext = createContext<AppColorModeContextValue | undefined>(undefined);

export function useAppColorMode(): AppColorModeContextValue {
  const ctx = useContext(AppColorModeContext);
  if (!ctx) throw new Error('useAppColorMode must be used within UIProvider');
  return ctx;
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const [colorMode, setColorMode] = useState<ColorMode>(scheme === 'dark' ? 'dark' : 'light');
  useEffect(() => {
    setColorMode(scheme === 'dark' ? 'dark' : 'light');
  }, [scheme]);

  const finalConfig = (config as any) || (defaultConfig as any);

  const value = useMemo(() => ({ colorMode, setColorMode }), [colorMode]);

  // Sync web <body> background to avoid white gutters when toggling dark mode
  useEffect(() => {
    if (Platform.OS === 'web') {
      try {
        const bg = colorMode === 'dark' ? '#0b0b0b' : '#ffffff';
        // @ts-ignore
        document.body.style.backgroundColor = bg;
        // @ts-ignore
        document.documentElement.style.backgroundColor = bg;
        // ensure data-theme attribute is set for CSS to react
        // @ts-ignore
        document.documentElement.setAttribute('data-theme', colorMode);
        // @ts-ignore
        document.body.setAttribute('data-theme', colorMode);
        // also set CSS variable at root to cover nested containers
        // @ts-ignore
        document.documentElement.style.setProperty('--app-bg', bg);
        // meta theme-color for PWA tint
        // @ts-ignore
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', bg);
      } catch {}
    }
  }, [colorMode]);

  return (
    <AppColorModeContext.Provider value={value}>
      <GluestackUIProvider config={finalConfig} colorMode={colorMode}>
        <View style={{ flex: 1, backgroundColor: colorMode === 'dark' ? '#0b0b0b' : '#ffffff' }}>
          {children}
        </View>
      </GluestackUIProvider>
    </AppColorModeContext.Provider>
  );
}
