import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { api } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthProvider';
import { Button, Card, Input, Notice, ScreenTitle } from '../../src/components/UI';
import { colors } from '../../src/theme/tokens';
import type { AttendanceItem } from '../../src/types/models';

export default function Attendance() {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pin, setPin] = useState('');
  const [items, setItems] = useState<AttendanceItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (user?.role !== 'student') { setLoading(false); return; }
    try { const data = await api.get<AttendanceItem[]>('/attendance/me?limit=50'); setItems(Array.isArray(data) ? data : []); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cargar el historial.'); }
    finally { setLoading(false); }
  }, [user?.role]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const checkIn = async (mode: 'code' | 'qr', value: string) => {
    setBusy(true); setError(''); setScanning(false);
    try {
      let token = value.trim();
      if (mode === 'qr') {
        try { const parsed = JSON.parse(token); token = parsed.qr_token ? JSON.stringify(parsed) : token; } catch { /* token simple */ }
      }
      await api.post(`/attendance/${mode}/check-in`, mode === 'code' ? { code: token } : { qr_token: token });
      setPin(''); Alert.alert('Asistencia registrada', 'Tu registro se guardó correctamente.'); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo registrar.'); }
    finally { setBusy(false); }
  };
  const openCamera = async () => {
    const result = permission?.granted ? permission : await requestPermission();
    if (result.granted) setScanning(true);
    else setError('Necesitamos permiso para usar la cámara y leer el código QR.');
  };
  return <ScrollView contentContainerStyle={styles.content}>
    <ScreenTitle title="Asistencia" subtitle="Registra tu presencia y consulta tu historial." />
    {user?.role === 'student' ? <>
      <Card><Text style={styles.heading}>Código temporal</Text>
        <Input value={pin} onChangeText={value => setPin(value.replace(/\D/g, '').slice(0, 4))} placeholder="PIN de 4 dígitos" keyboardType="number-pad" maxLength={4} />
        <Button title="Registrar con PIN" onPress={() => void checkIn('code', pin)} busy={busy || pin.length !== 4} />
      </Card>
      <Card><Text style={styles.heading}>Escanear QR</Text>
        {scanning ? <View style={styles.camera}><CameraView style={{ flex: 1 }} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={busy ? undefined : ({ data }) => void checkIn('qr', data)} /></View> : null}
        <Button title={scanning ? 'Cerrar cámara' : 'Abrir cámara'} secondary onPress={() => scanning ? setScanning(false) : void openCamera()} />
      </Card>
      {error ? <Notice message={error} /> : null}
      <Text style={styles.heading}>Historial</Text>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {!loading && items.length === 0 ? <Card><Text>Todavía no tienes registros.</Text></Card> : null}
      {items.map(row => <Card key={row.id}><Text style={styles.heading}>{row.class?.subject_name || 'Asistencia registrada'}</Text>
        <Text style={styles.muted}>{row.status || 'Sin estado'} · {row.recorded_at ? new Date(row.recorded_at).toLocaleDateString('es-MX') : 'Sin fecha'}</Text></Card>)}
    </> : <Card><Text>El registro de asistencia con PIN o QR está disponible para alumnos.</Text></Card>}
  </ScrollView>;
}
const styles = StyleSheet.create({ content: { padding: 22, paddingTop: 60 }, heading: { fontSize: 18, fontWeight: '800', color: colors.navy, marginBottom: 12 }, camera: { height: 290, borderRadius: 18, overflow: 'hidden', marginVertical: 12 }, muted: { color: colors.muted } });
