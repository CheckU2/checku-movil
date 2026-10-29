import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/tokens';

type Icon = React.ComponentProps<typeof Ionicons>['name'];
const icons: Record<string, [Icon, Icon]> = {
  index: ['home', 'home-outline'], classes: ['book', 'book-outline'],
  attendance: ['qr-code', 'qr-code-outline'], profile: ['person', 'person-outline'],
};
export default function TabLayout() {
  return <Tabs screenOptions={({ route }) => ({
    headerShown: false, tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.muted,
    tabBarStyle: { height: 66, paddingTop: 8, paddingBottom: 8, backgroundColor: colors.white },
    tabBarIcon: ({ focused, size }) => <Ionicons name={icons[route.name]?.[focused ? 0 : 1] ?? 'ellipse-outline'} color={focused ? colors.primary : colors.muted} size={size} />,
  })}>
    <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
    <Tabs.Screen name="classes" options={{ title: 'Clases' }} />
    <Tabs.Screen name="attendance" options={{ title: 'Asistencia' }} />
    <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
  </Tabs>;
}
