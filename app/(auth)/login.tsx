import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/auth/AuthProvider';
import { Button, Input, Notice } from '../../src/components/UI';
import { colors } from '../../src/theme/tokens';

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (!email.trim() || !password) return setError('Completa tu correo y contraseña.');
    setBusy(true); setError('');
    try { await signIn(email, password); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión.'); }
    finally { setBusy(false); }
  };
  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.brand}><Text style={styles.logo}>Check<Text style={{ color: colors.primary }}>U</Text></Text>
        <Text style={styles.tag}>PASE DE LISTA UNIVERSITARIO</Text></View>
      <Text style={styles.heading}>Tu asistencia, más simple.</Text>
      <Text style={styles.description}>Inicia sesión para consultar tus clases y registrar tu asistencia.</Text>
      <Input value={email} onChangeText={setEmail} placeholder="Correo institucional" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Input value={password} onChangeText={setPassword} placeholder="Contraseña" secureTextEntry autoComplete="password" />
      {error ? <Notice message={error} /> : null}
      <Button title="Iniciar sesión" onPress={() => void submit()} busy={busy} />
    </ScrollView>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: 28, justifyContent: 'center' },
  brand: { marginBottom: 50 }, logo: { fontSize: 48, fontWeight: '900', color: colors.navy },
  tag: { color: colors.muted, fontSize: 10, letterSpacing: 2 },
  heading: { fontSize: 36, fontWeight: '800', color: colors.navy, marginBottom: 12 },
  description: { color: colors.muted, lineHeight: 23, marginBottom: 30 },
});
