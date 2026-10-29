import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/auth/AuthProvider';
import { Button, Card, ScreenTitle } from '../../src/components/UI';
import { colors } from '../../src/theme/tokens';

export default function Home() {
  const { user } = useAuth();
  return <ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>CHECKU · UNIVERSIDAD</Text>
    <ScreenTitle title={`Hola, ${user?.full_name?.split(' ')[0] ?? 'bienvenido'}`} subtitle="Todo lo que necesitas para tus clases, en un lugar." />
    <Card><Text style={styles.big}>Tu asistencia, en buenas manos.</Text>
      <Text style={styles.muted}>Consulta tus clases y registra tu presencia sin complicaciones.</Text></Card>
    <Text style={styles.section}>Accesos rápidos</Text>
    <Button title="Mis clases" onPress={() => router.push('/(tabs)/classes')} />
    {user?.role === 'student' ? <Button title="Registrar asistencia" secondary onPress={() => router.push('/(tabs)/attendance')} /> : null}
  </ScrollView>;
}
const styles = StyleSheet.create({
  content: { padding: 22, paddingTop: 60 }, eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 12 },
  big: { fontSize: 24, fontWeight: '800', color: colors.navy, marginBottom: 12 },
  muted: { color: colors.muted, lineHeight: 22 }, section: { color: colors.navy, fontWeight: '800', fontSize: 18, marginVertical: 18 },
});
