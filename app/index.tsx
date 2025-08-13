import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { getAccessToken } from '../lib/auth';

export default function Gate() {
  const [initial, setInitial] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      setSignedIn(!!token);
      setInitial(false);
    })();
  }, []);

  if (initial) return null;
  return signedIn ? <Redirect href="/(tabs)/reports" /> : <Redirect href="/(auth)" />;
}
