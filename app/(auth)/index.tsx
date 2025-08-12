import { useState } from 'react';
import { View, TextInput, Text } from 'react-native';
import { Box, Heading, VStack, Input, Button, Text as GSText } from '@gluestack-ui/themed';
import { Screen } from '../../lib/Screen';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLogin = async () => {
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.replace('/(tabs)/reports');
  };

  return (
    <Screen>
      <Box flex={1} px="$4" justifyContent="center">
        <VStack space="lg">
          <Heading size="lg">Login</Heading>
          <Input borderRadius="$full">
            <Input.Input placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          </Input>
          <Input borderRadius="$full">
            <Input.Input placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
          </Input>
          {error ? <GSText color="$red600">{error}</GSText> : null}
          <Button borderRadius="$full" isDisabled={loading} onPress={onLogin}>
            <Button.Text>{loading ? '...' : 'Sign in'}</Button.Text>
          </Button>
        </VStack>
      </Box>
    </Screen>
  );
}
