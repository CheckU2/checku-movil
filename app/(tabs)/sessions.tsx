import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { api } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthProvider';
import { Avatar } from '../../src/components/Avatar';
import { TeacherAnchor } from '../../src/components/TeacherAnchor';
import { SessionIndicator } from '../../src/components/SessionIndicator';
import { Button, Card, Notice, ScreenTitle } from '../../src/components/UI';
import { colors } from '../../src/theme/tokens';
import type { ClassItem, SessionItem } from '../../src/types/models';

type Challenge = { token?: string; code?: string; expires_at?: string; image?: string };
type Session = SessionItem & { qr?: Challenge; ended_at?: string };
type Student = { student_id: string; full_name: string; avatar_url?: string; status: string; recorded_at?: string };
type Report = { session: Session; students: Student[]; counts: Record<string, number>; departure_tracking?: boolean };
type ProximityState = { student_id: string; full_name: string; state: string; updated_at?: string; requires_review?: boolean };
const roles = ['teacher', 'career_admin', 'admin', 'super_admin'];
const staff = [...roles, 'tutor'];
const statusText: Record<string, string> = { scheduled: 'Programada', active: 'En curso', closed: 'Finalizada', present: 'Presente', late: 'Retardo', absent: 'Falta', excused: 'Justificada', pending: 'Pendiente', abandoned: 'Abandono' };
const label = (value?: string) => statusText[value || ''] || value || 'Sin estado';
const message = (error: unknown) => error instanceof Error ? error.message : 'Ocurrió un error. Intenta nuevamente.';
const qrPayload = (sessionId: string, token: string) => JSON.stringify({ session_id: sessionId, qr_token: token });

export default function Sessions() {
  const { user } = useAuth();
  const canCreate = roles.includes(user?.role ?? '');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selected, setSelected] = useState<Session | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [proximityRows, setProximityRows] = useState<ProximityState[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const capture = useRef<ViewShot>(null);

  const load = useCallback(async () => {
    if (!staff.includes(user?.role ?? '')) return;
    setLoading(true);
    try {
      const [sessionRows, classRows] = await Promise.all([
        api.get<Session[]>('/sessions?limit=50'),
        api.get<ClassItem[]>('/classes?limit=100'),
      ]);
      setSessions(Array.isArray(sessionRows) ? sessionRows : []);
      setClasses(Array.isArray(classRows) ? classRows : []);
      setError('');
    } catch (e) { setError(message(e)); }
    finally { setLoading(false); }
  }, [user?.role]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const refreshProximity = async (id: string) => {
    try { setProximityRows(await api.get<ProximityState[]>(`/proximity/sessions/${id}/events`)); }
    catch { setProximityRows([]); }
  };
  const refreshReport = async (id: string) => {
    try { setReport(await api.get<Report>(`/sessions/${id}/report`)); setDetailError(''); }
    catch (e) { setDetailError(message(e)); }
  };
  const openSession = async (session: Session, freshChallenge?: Challenge) => {
    setSelected(session); setChallenge(freshChallenge ?? null); setReport(null); setDetailError('');
    await Promise.all([refreshReport(session.id), refreshProximity(session.id)]);
  };
  const create = async (item: ClassItem) => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const created = await api.post<Session>('/sessions', { class_id: item.id });
      const started = await api.post<Session>(`/sessions/${created.id}/start`, {});
      setCreateOpen(false);
      await load();
      await openSession({ ...created, ...started, subject_name: item.subject_name, group_name: item.group_name }, started.qr);
      if (!started.qr?.token || !started.qr?.code) {
        Alert.alert('Sesión iniciada', 'El servidor no devolvió un QR/PIN nuevo. Puedes renovarlo desde esta sesión.');
      }
    } catch (e) { Alert.alert('No se pudo iniciar la sesión', message(e)); }
    finally { setBusy(false); }
  };
  const rotate = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const next = await api.post<Challenge>(`/sessions/${selected.id}/qr/rotate`, {});
      setChallenge(next);
      setDetailError('');
    } catch (e) { setDetailError(message(e)); }
    finally { setBusy(false); }
  };
  const finish = () => {
    if (!selected || busy) return;
    Alert.alert('Finalizar sesión', 'El QR y el PIN dejarán de funcionar. Podrás consultar el reporte después.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Finalizar', style: 'destructive', onPress: () => void (async () => {
        setBusy(true);
        try {
          const ended = await api.post<Session>(`/sessions/${selected.id}/end`, {});
          setSelected(previous => previous ? { ...previous, ...ended } : ended);
          setChallenge(null);
          await refreshReport(selected.id);
          await load();
        } catch (e) { setDetailError(message(e)); }
        finally { setBusy(false); }
      })() },
    ]);
  };
  const share = async () => {
    if (!selected || !challenge?.token || !challenge.code) return;
    try {
      const uri = await captureRef(capture, { format: 'png', quality: 1 });
      if (!await Sharing.isAvailableAsync()) return Alert.alert('No disponible', 'Este dispositivo no admite compartir imágenes.');
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartir asistencia de CheckU' });
    } catch (e) { Alert.alert('No se pudo compartir', message(e)); }
  };

  if (!staff.includes(user?.role ?? '')) return <View style={styles.content}><ScreenTitle title="Sesiones" subtitle="Esta sección es para personal autorizado." /></View>;
  const active = selected?.status === 'active';
  const validChallenge = !!(active && challenge?.token && challenge?.code && (!challenge.expires_at || new Date(challenge.expires_at).getTime() > Date.now()));
  const classOptions = canCreate ? classes.filter(item => user?.role !== 'teacher' || !!item.id) : [];
  return <View style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenTitle title="Sesiones" subtitle="Gestiona tus clases y consulta la asistencia." />
      {canCreate ? <Button title="Nueva sesión" onPress={() => setCreateOpen(true)} /> : null}
      {error ? <Notice message={error} /> : null}
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {!loading && sessions.length === 0 ? <Card><Text style={styles.muted}>Todavía no hay sesiones registradas.</Text></Card> : null}
      {sessions.map(s => <Card key={s.id} onPress={() => void openSession(s)}>
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={24} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{s.subject_name || 'Sesión de clase'}</Text>
            <Text style={styles.muted}>{s.group_name || 'Grupo'}</Text><SessionIndicator status={s.status} />
            <Text style={styles.muted}>{s.started_at ? new Date(s.started_at).toLocaleString('es-MX') : 'Aún no inicia'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </View>
      </Card>)}
    </ScrollView>
    <Modal visible={createOpen} animationType="slide" onRequestClose={() => setCreateOpen(false)}>
      <ScrollView contentContainerStyle={styles.content}>
        <Button title="Volver" secondary onPress={() => setCreateOpen(false)} />
        <ScreenTitle title="Nueva sesión" subtitle="Selecciona una de tus clases. El PIN y el QR se generarán al iniciar." />
        {classOptions.length === 0 ? <Card><Text style={styles.muted}>No tienes clases disponibles. Primero crea una clase o solicita que te asignen una.</Text></Card> : null}
        {classOptions.map(item => <Card key={item.id} onPress={() => void create(item)}>
          <View style={styles.row}><View style={{ flex: 1 }}><Text style={styles.title}>{item.subject_name || 'Materia'}</Text>
            <Text style={styles.muted}>{item.group_name || 'Grupo'}</Text></View>
            {busy ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="play-circle-outline" size={28} color={colors.primary} />}</View>
        </Card>)}
      </ScrollView>
    </Modal>
    <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
      <ScrollView contentContainerStyle={styles.content}>
        <Button title="Volver a sesiones" secondary onPress={() => { setSelected(null); setChallenge(null); }} />
        <ScreenTitle title={selected?.subject_name || 'Detalle de sesión'} subtitle={`${selected?.group_name || 'Grupo'} · ${label(selected?.status)}`} />
        {detailError ? <Notice message={detailError} /> : null}
        <SessionIndicator status={selected?.status} />
        {active && canCreate && selected ? <TeacherAnchor sessionId={selected.id} /> : null}
        {active && canCreate && validChallenge && selected ? <Card>
          <ViewShot ref={capture} options={{ format: 'png', quality: 1 }} style={styles.qrCard}>
            <Text style={styles.title}>CheckU · Registro de asistencia</Text>
            <Text style={styles.muted}>{selected.subject_name || 'Clase'} · {selected.group_name || 'Grupo'}</Text>
            <QRCode value={qrPayload(selected.id, challenge!.token!)} size={220} backgroundColor="#FFFFFF" color={colors.navy} />
            <Text style={styles.pin}>{challenge!.code}</Text>
            <Text style={styles.muted}>Código temporal</Text>
          </ViewShot>
          <Button title="Compartir QR y PIN" onPress={() => void share()} />
        </Card> : null}
        {active && canCreate && !validChallenge ? <Card><Text style={styles.muted}>No hay un código temporal vigente disponible. Genera uno nuevo para compartirlo.</Text></Card> : null}
        {active && canCreate ? <><Button title="Generar nuevo QR y PIN" secondary busy={busy} onPress={() => void rotate()} /><Button title="Finalizar sesión" busy={busy} onPress={finish} /></> : null}
        {selected && canCreate ? <><Button title="Actualizar estados de proximidad" secondary onPress={() => void refreshProximity(selected.id)} />
          {proximityRows.length ? <Card><Text style={styles.title}>Proximidad experimental</Text><Text style={styles.muted}>Los estados son señales GPS auxiliares; un posible abandono requiere revisión, no cambia la asistencia.</Text>
            {proximityRows.map(r => <View key={r.student_id} style={{ paddingVertical: 8 }}><Text style={{ color: colors.navy, fontWeight: '700' }}>{r.full_name}</Text><SessionIndicator status={r.state} /></View>)}
          </Card> : null}</> : null}
        <Text style={styles.title}>Asistencia ({report?.students?.length ?? 0})</Text>
        {report?.counts ? <Card><Text style={styles.muted}>Presentes: {report.counts.present ?? 0} · Retardos: {report.counts.late ?? 0} · Faltas: {report.counts.absent ?? 0}</Text></Card> : null}
        {report?.students?.map((r, i) => <Card key={r.student_id || String(i)}><View style={styles.row}>
          <Avatar name={r.full_name} uri={r.avatar_url} size={42} />
          <Text style={[styles.title, { flex: 1, fontSize: 15 }]}>{r.full_name}</Text>
          <Text style={styles.muted}>{label(r.status)}</Text>
        </View></Card>)}
        {selected && !report ? <ActivityIndicator color={colors.primary} /> : null}
      </ScrollView>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  content: { padding: 22, paddingTop: 52, paddingBottom: 45 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { color: colors.navy, fontSize: 19, fontWeight: '800', marginBottom: 7 },
  muted: { color: colors.muted, marginTop: 4 },
  pin: { fontSize: 40, letterSpacing: 8, fontWeight: '900', color: colors.navy, marginVertical: 14 },
  qrCard: { backgroundColor: '#FFFFFF', alignItems: 'center', padding: 18, gap: 12, borderRadius: 18 },
});
