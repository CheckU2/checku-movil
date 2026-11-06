import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { colors } from '../theme/tokens';

const baseUrl = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
export function Avatar({ name, uri, size = 48 }: { name: string; uri?: string | null; size?: number }) {
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setFailed(false);
    void SecureStore.getItemAsync('checku_access').then(value => { if (active) setToken(value); });
    return () => { active = false; };
  }, [uri]);
  const style = { width: size, height: size, borderRadius: size / 2 };
  const url = uri?.startsWith('/api/') ? `${baseUrl}${uri}` : uri;
  const isRemote = !!url && /^(https?:\/\/|data:image\/)/i.test(url);
  const needsAuth = !!uri?.startsWith('/api/');
  if (isRemote && !failed && (!needsAuth || token)) {
    return <Image source={{ uri: url, headers: needsAuth ? { Authorization: `Bearer ${token}` } : undefined }}
      style={style} onError={() => setFailed(true)} />;
  }
  return <View style={[style, styles.fallback]}><Text style={[styles.initial, { fontSize: size * .38 }]}>{name.trim().charAt(0).toUpperCase() || '?'}</Text></View>;
}
const styles = StyleSheet.create({
  fallback: { backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  initial: { fontWeight: '800', color: colors.navy }
});
