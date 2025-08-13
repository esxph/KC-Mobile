import { Alert } from 'react-native';
import { Box, Heading, Button, VStack, Text, HStack, Switch } from '@gluestack-ui/themed';
import { Screen } from '../../lib/Screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clearTokens } from '../../lib/auth';
import { router } from 'expo-router';
import { useAppColorMode } from '../../lib/ui';

export default function Settings() { 
  const { colorMode, setColorMode } = useAppColorMode();
  const insets = useSafeAreaInsets();
  const signOut = async () => { 
    try {
      await clearTokens();
      router.replace('/');
    } catch (e: any) {
      Alert.alert('Logout failed', e.message || 'Unknown error');
    }
  };
  return (
    <Screen>
      <Box flex={1} p="$4" style={{ paddingTop: insets.top + 12 }}>
        <VStack space="lg">
          <Heading size="lg">Ajustes</Heading>
          <HStack alignItems="center" justifyContent="space-between" borderRadius="$lg">
            <Text>Dark mode</Text>
            <Switch value={colorMode === 'dark'} onValueChange={(v)=> setColorMode(v ? 'dark' as const : 'light' as const)} />
          </HStack>
          <Button borderRadius="$full" action="negative" onPress={signOut}>
            <Button.Text>Cerrar sesión</Button.Text>
          </Button>
        </VStack>
      </Box>
    </Screen>
  ); 
}
