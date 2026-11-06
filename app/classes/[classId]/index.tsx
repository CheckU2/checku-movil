import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, Alert, Share } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { api } from '../../../src/api/client';
import { Button, Card, Notice, ScreenTitle } from '../../../src/components/UI';
import { colors } from '../../../src/theme/tokens';
import { Avatar } from '../../../src/components/Avatar';
import { useAuth } from '../../../src/auth/AuthProvider';
import type { ClassItem } from '../../../src/types/models';

export default function ClassDetail() {
  const { user } = useAuth();
  const [tutors, setTutors] = useState<{id: string; user_id?: string; full_name?: string}[]>([]);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const [item, setItem] = useState<ClassItem | null>(null);
  const [error, setError] = useState('');
  const [students, setStudents] = useState<{id: string; full_name: string; avatar_url?: string; email?: string}[]>([]);
  const [rosterError, setRosterError] = useState('');
  useFocusEffect(useCallback(() => {
    let mounted = true;
    void api.get<ClassItem[]>(`/classes?limit=100`).then(rows => {
      if (mounted) setItem((Array.isArray(rows) ? rows : []).find(row => row.id === classId) ?? null);
    }).catch(e => { if (mounted) setError(e instanceof Error ? e.message : 'No se pudo cargar.'); });
    if (user?.role !== 'student') void api.get<{tutors: {id: string; user_id?: string; full_name?: string}[]}>('/classes/options').then(o => {if (mounted) setTutors(o.tutors || []);}).catch(() => {});
    void api.get<{id: string; full_name: string; avatar_url?: string; email?: string}[]>(`/classes/${classId}/students`)
      .then(rows => { if (mounted) setStudents(Array.isArray(rows) ? rows : []); })
      .catch(e => { if (mounted) setRosterError(e instanceof Error ? e.message : 'No se pudo cargar la lista de alumnos.'); });
    return () => { mounted = false; };
  }, [classId, user?.role]));
  const invite = async (tutor: {id: string; user_id?: string; full_name?: string}) => {
    if (!tutor.user_id || inviting) return;
    setInviting(true); setInviteError('');
    try { await api.post(`/classes/${classId}/invite-tutor`, {tutor_user_id: tutor.user_id}); Alert.alert('Invitación enviada', `Se invitó a ${tutor.full_name || 'este tutor'}.`); }
    catch (e) {setInviteError(e instanceof Error ? e.message : 'No se pudo invitar.');}
    finally {setInviting(false);}
  };
  return <ScrollView contentContainerStyle={styles.content}>
    <Stack.Screen options={{ headerShown: true, title: 'Detalle de clase' }} />
    {error ? <Notice message={error} /> : null}
    {!item && !error ? <ActivityIndicator color={colors.primary} /> : null}
    {item ? <><ScreenTitle title={item.subject_name || 'Materia'} subtitle={item.group_name || 'Grupo'} />
      {user?.role !== 'student' && item.join_code ? <Card><Text style={styles.label}>Código para alumnos</Text><Text style={[styles.value, {fontSize: 30, letterSpacing: 5}]}>{item.join_code}</Text><Button title="Compartir código" secondary onPress={() => {void Share.share({message: `Código para unirte a mi clase en CheckU: ${item.join_code}`});}} /></Card> : null}
      {user?.role === 'teacher' ? <Card><Text style={styles.value}>Invitar tutor</Text><Text style={[styles.label, {marginVertical: 8}]}>Selecciona un tutor de tu carrera. Podrá aceptar la invitación desde su cuenta.</Text>{tutors.map(t => <Button key={t.id} title={`Invitar a ${t.full_name || 'tutor'}`} secondary busy={inviting} onPress={() => void invite(t)} />)}{!tutors.length ? <Text style={styles.label}>No hay tutores disponibles en tu carrera.</Text> : null}{inviteError ? <Notice message={inviteError} /> : null}</Card> : null}
      <Card><Text style={styles.label}>Docente</Text><Text style={styles.value}>{item.teacher_name || 'Por confirmar'}</Text></Card>
      <Card><Text style={styles.label}>Periodo</Text><Text style={styles.value}>{item.period_name || 'Sin asignar'}</Text></Card>
      <Card><Text style={styles.label}>Estado</Text><Text style={styles.value}>{item.status || 'Sin información'}</Text></Card>
      <Text style={styles.value}>{user?.role === 'student' ? 'Mis compañeros' : 'Alumnos inscritos'} ({students.length})</Text>
      {!rosterError && students.length === 0 ? <Text style={styles.label}>Todavía no hay alumnos inscritos en esta clase.</Text> : null}
      {rosterError ? <Notice message={rosterError} /> : null}
      {students.map(student => <Card key={student.id}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={student.full_name} uri={student.avatar_url} />
          <View><Text style={styles.value}>{student.full_name}</Text></View>
        </View>
      </Card>)}
    </> : null}
  </ScrollView>;
}
const styles = StyleSheet.create({ content: { padding: 22, paddingTop: 26 }, label: { color: colors.muted }, value: { color: colors.navy, fontSize: 18, fontWeight: '700', marginTop: 8 } });
