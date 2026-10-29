import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/auth/AuthProvider';
import { Button, Card, ScreenTitle } from '../../src/components/UI';
import { colors } from '../../src/theme/tokens';
import type { Role } from '../../src/types/models';

const roles: Record<Role, string> = {
  student: 'Alumno', teacher: 'Docente', tutor: 'Tutor',
  career_admin: 'Administrador de carrera', admin: 'Administrador', super_admin: 'Administrador general',
};
export default function Profile() {
  const { user, signOut } = useAuth();
  return <ScrollView contentContainerStyle={styles.content}>
    <ScreenTitle title="Mi perfil" subtitle="Tu información en CheckU." />
    <View style={[styles.banner, { backgroundColor: user?.banner_color || colors.primary }]} />
    <Card><View style={styles.avatar}><Text style={styles.initial}>{user?.full_name?.charAt(0) || 'U'}</Text></View>
      <Text style={styles.name}>{user?.full_name || 'Usuario'}</Text>
      <Text style={styles.role}>{user ? roles[user.role] : ''}</Text>
      <Text style={styles.bio}>{user?.bio || 'Bienvenido a tu espacio universitario.'}</Text>
    </Card>
    <Button title="Cerrar sesión" secondary onPress={() => void signOut()} />
  </ScrollView>;
}
const styles = StyleSheet.create({
  content: { padding: 22, paddingTop: 60 }, banner: { height: 135, borderRadius: 24, marginBottom: 12 },
  avatar: { backgroundColor: colors.mint, width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  initial: { fontSize: 30, fontWeight: '800', color: colors.navy },
  name: { fontSize: 23, fontWeight: '800', color: colors.navy }, role: { color: colors.primary, marginTop: 6, fontWeight: '700' },
  bio: { color: colors.muted, marginTop: 14 },
});
