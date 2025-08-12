import { Alert } from 'react-native';
import { Box, Heading, Button, VStack, Text, HStack, Switch } from '@gluestack-ui/themed';
import { Screen } from '../../lib/Screen';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import { useAppColorMode } from '../../lib/ui';

export default function Settings() { 
  const { colorMode, setColorMode } = useAppColorMode();
  const signOut = async () => { 
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace('/');
    } catch (e: any) {
      Alert.alert('Logout failed', e.message || 'Unknown error');
    }
  };
  return (
    <Screen>
      <Box flex={1} p="$4">
        <VStack space="lg">
          <Heading size="lg">Settings</Heading>
          <HStack alignItems="center" justifyContent="space-between" borderRadius="$lg">
            <Text>Dark mode</Text>
            <Switch value={colorMode === 'dark'} onValueChange={(v)=> setColorMode(v ? 'dark' as const : 'light' as const)} />
          </HStack>
          <Button borderRadius="$full" action="negative" onPress={signOut}>
            <Button.Text>Sign out</Button.Text>
          </Button>
        </VStack>
      </Box>
    </Screen>
  ); 
}
