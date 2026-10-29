import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { api } from '../../../src/api/client';
import { Card, Notice, ScreenTitle } from '../../../src/components/UI';
import { colors } from '../../../src/theme/tokens';
import type { ClassItem } from '../../../src/types/models';

export default function ClassDetail() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const [item, setItem] = useState<ClassItem | null>(null);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    let mounted = true;
    void api.get<ClassItem[]>(`/classes?limit=100`).then(rows => {
      if (mounted) setItem((Array.isArray(rows) ? rows : []).find(row => row.id === classId) ?? null);
    }).catch(e => { if (mounted) setError(e instanceof Error ? e.message : 'No se pudo cargar.'); });
    return () => { mounted = false; };
  }, [classId]));
  return <ScrollView contentContainerStyle={styles.content}>
    <Stack.Screen options={{ headerShown: true, title: 'Detalle de clase' }} />
    {error ? <Notice message={error} /> : null}
    {!item && !error ? <ActivityIndicator color={colors.primary} /> : null}
    {item ? <><ScreenTitle title={item.subject_name || 'Materia'} subtitle={item.group_name || 'Grupo'} />
      <Card><Text style={styles.label}>Docente</Text><Text style={styles.value}>{item.teacher_name || 'Por confirmar'}</Text></Card>
      <Card><Text style={styles.label}>Periodo</Text><Text style={styles.value}>{item.period_name || 'Sin asignar'}</Text></Card>
      <Card><Text style={styles.label}>Estado</Text><Text style={styles.value}>{item.status || 'Sin información'}</Text></Card>
    </> : null}
  </ScrollView>;
}
const styles = StyleSheet.create({ content: { padding: 22, paddingTop: 26 }, label: { color: colors.muted }, value: { color: colors.navy, fontSize: 18, fontWeight: '700', marginTop: 8 } });
