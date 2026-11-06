import React, { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { api } from '../../src/api/client';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth/AuthProvider';
import { colors } from '../../src/theme/tokens';

type Icon = React.ComponentProps<typeof Ionicons>['name'];
const icons: Record<string, [Icon, Icon]> = {
  index: ['home', 'home-outline'], classes: ['book', 'book-outline'],
  attendance: ['qr-code', 'qr-code-outline'], messages: ['chatbubbles', 'chatbubbles-outline'], sessions: ['calendar', 'calendar-outline'], groups: ['people', 'people-outline'], people: ['id-card', 'id-card-outline'], reports: ['bar-chart', 'bar-chart-outline'], profile: ['person', 'person-outline'],
};
export default function TabLayout() {
  const { user } = useAuth();
  const [pending, setPending] = useState(0);
  useFocusEffect(useCallback(() => {
    if (user?.role !== 'teacher') { setPending(0); return; }
    let active = true;
    void api.get<{pending:number}>('/justifications/notifications').then(data => {
      if (active) setPending(data.pending || 0);
    }).catch(() => {});
    return () => { active = false; };
  }, [user?.role]));
  const staff = ['teacher', 'tutor', 'career_admin', 'admin', 'super_admin'].includes(user?.role ?? '');
  return <Tabs screenOptions={({ route }) => ({
    headerShown: false, tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.muted,
    tabBarStyle: { height: 66, paddingTop: 8, paddingBottom: 8, backgroundColor: colors.white },
    tabBarIcon: ({ focused, size }) => <Ionicons name={icons[route.name]?.[focused ? 0 : 1] ?? 'ellipse-outline'} color={focused ? colors.primary : colors.muted} size={size} />,
  })}>
    <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
    <Tabs.Screen name="classes" options={{ title: 'Clases' }} />
    <Tabs.Screen name="sessions" options={{ title: "Sesiones", href: staff && user?.role !== 'career_admin' ? undefined : null }} />
    <Tabs.Screen name="groups" options={{ title: 'Grupos', href: user?.role === 'career_admin' ? undefined : null }} />
    <Tabs.Screen name="people" options={{ title: 'Personas', href: null }} />
    <Tabs.Screen name="reports" options={{ title: 'Reportes', href: user?.role === 'career_admin' ? undefined : null }} />
    <Tabs.Screen name="attendance" options={{ title: 'Asistencia', href: ['tutor','career_admin'].includes(user?.role ?? '') ? null : undefined }} />
    <Tabs.Screen name="messages" options={{ title: user?.role === 'tutor' ? 'Mensajes' : 'Avisos', tabBarBadge: user?.role === 'teacher' && pending > 0 ? (pending > 99 ? '99+' : pending) : undefined, href: ['tutor','teacher'].includes(user?.role ?? '') ? undefined : null }} />
    <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
  </Tabs>;
}
