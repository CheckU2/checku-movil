import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { api } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthProvider';
import { Button, Card, Input, Notice, ScreenTitle } from '../../src/components/UI';
import { colors } from '../../src/theme/tokens';
import type { ClassItem } from '../../src/types/models';

export default function Classes() {
  const { user } = useAuth();
  const [items, setItems] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const data = await api.get<ClassItem[] | { items: ClassItem[] }>('/classes?limit=50');
      setItems(Array.isArray(data) ? data : data.items ?? []); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron cargar las clases.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const join = async () => {
    if (!/^\d{6}$/.test(code)) return setError('El código de clase debe tener 6 dígitos.');
    setBusy(true); setError('');
    try {
      await api.post('/classes/join', { code });
      setOpen(false); setCode(''); await load(); Alert.alert('Listo', 'Te inscribiste correctamente.');
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo agregar la clase.'); }
    finally { setBusy(false); }
  };
  return <View style={styles.root}>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading && items.length > 0} onRefresh={() => void load()} />}>
      <ScreenTitle title="Mis clases" subtitle="Tus materias y grupos, siempre a mano." />
      {user?.role === 'student' ? <Button title="+ Agregar clase" onPress={() => { setError(''); setOpen(true); }} /> : null}
      {error && !open ? <Notice message={error} /> : null}
      {loading && items.length === 0 ? <ActivityIndicator color={colors.primary} /> : null}
      {!loading && items.length === 0 ? <Card><Text>No tienes clases por ahora.</Text></Card> : null}
      {items.map((item, index) => <Card key={item.id} onPress={() => router.push({ pathname: '/classes/[classId]', params: { classId: item.id } })}>
        <View style={[styles.cover, { backgroundColor: index % 2 ? '#C9EAE1' : '#DDECE9' }]} />
        <Text style={styles.name}>{item.subject_name || 'Materia sin nombre'}</Text>
        <Text style={styles.meta}>{item.group_name || 'Grupo sin asignar'}</Text>
        <Text style={styles.meta}>{item.teacher_name || 'Docente por confirmar'}</Text>
      </Card>)}
    </ScrollView>
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <View style={styles.overlay}><View style={styles.sheet}>
        <ScreenTitle title="Agregar clase" subtitle="Ingresa el código de seis dígitos que te dio tu docente." />
        <Input value={code} onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" keyboardType="number-pad" maxLength={6} />
        {error ? <Notice message={error} /> : null}
        <Button title="Unirme a la clase" onPress={() => void join()} busy={busy} />
        <Button title="Cancelar" secondary onPress={() => setOpen(false)} />
      </View></View>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1 }, content: { padding: 22, paddingTop: 60 },
  cover: { height: 80, borderRadius: 16, marginBottom: 14 },
  name: { fontSize: 19, fontWeight: '800', color: colors.navy },
  meta: { color: colors.muted, marginTop: 5 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0007' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 26, paddingBottom: 40 },
});
