import { useState } from 'react';
import { View, TextInput, Text } from 'react-native';
import { Box, Heading, VStack, Input, Button, Text as GSText } from '@gluestack-ui/themed';
import { Screen } from '../../lib/Screen';
import { loginWithCredentials } from '../../lib/auth';
import { router } from 'expo-router';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLogin = async () => {
    setLoading(true); setError(null);
    try {
      await loginWithCredentials(email, password);
    } catch (e: any) {
      setLoading(false);
      setError(e.message || 'Login failed');
      return;
    }
    setLoading(false);
    router.replace('/(tabs)/reports');
  };

  return (
    <Screen>
      <Box flex={1} px="$4" justifyContent="center">
      <VStack space="lg">
        <Heading size="3xl" alignSelf="center">CiviLog</Heading>
        <Heading size="lg" alignSelf="center">Iniciar sesión</Heading>
          <Input borderRadius="$full">
            <Input.Input placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          </Input>
          <Input borderRadius="$full">
            <Input.Input placeholder="Contraseña" secureTextEntry value={password} onChangeText={setPassword} />
          </Input>
          {error ? <GSText color="$red600">{error}</GSText> : null}
          <Button borderRadius="$full" isDisabled={loading} onPress={onLogin}>
            <Button.Text>{loading ? '...' : 'Entrar'}</Button.Text>
          </Button>
        </VStack>
      </Box>
    </Screen>
  );
}
