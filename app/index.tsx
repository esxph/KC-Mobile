import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Gate() {
  const [initial, setInitial] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session); setInitial(false);
    });
    supabase.auth.getSession().then(({ data }) => { setSignedIn(!!data.session); setInitial(false); });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  if (initial) return null;
  return signedIn ? <Redirect href="/(tabs)/reports" /> : <Redirect href="/(auth)" />;
}
