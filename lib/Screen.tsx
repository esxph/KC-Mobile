import React from 'react';
import { Box } from '@gluestack-ui/themed';
import { useAppColorMode } from './ui';

export function Screen({ children }: { children: React.ReactNode }) {
  const { colorMode } = useAppColorMode();
  const bg = colorMode === 'dark' ? '#0b0b0b' : '#ffffff';
  return (
    <Box flex={1} bg={bg}>
      {children}
    </Box>
  );
}

