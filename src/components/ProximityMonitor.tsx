import React, { useEffect, useRef, useState } from 'react';
import { Alert, PermissionsAndroid, Platform, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { Button, Card } from './UI';
import { colors } from '../theme/tokens';

type Config = { service_uuid: string; grace_seconds: number };
type Result = { state: string; remaining_seconds: number };
type Kind = 'inside' | 'outside' | 'uncertain';
let ble: typeof import('../../modules/checku-ble/src') | null = null;
try { ble = require('../../modules/checku-ble/src'); } catch { /* Expo Go */ }

// RSSI is NOT a meter measurement. This threshold is experimental and needs calibration.
const SCAN_MS = 4500;
const CYCLE_MS = 15000;
async function permissions() {
  if (Platform.OS !== 'android') return false;
  const requested = Number(Platform.Version) >= 31
    ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
    : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
  const results = await PermissionsAndroid.requestMultiple(requested);
  return Object.values(results).every(v => v === PermissionsAndroid.RESULTS.GRANTED);
}
export function ProximityMonitor({ sessionId, active }: { sessionId: string; active: boolean }) {
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState('off');
  const [detail, setDetail] = useState('Activa Bluetooth para detectar el teléfono del docente.');
  const [remaining, setRemaining] = useState<number | null>(null);
  const lastSent = useRef<{ kind: Kind | ''; at: number }>({ kind: '', at: 0 });
  const lastNear = useRef(0);
  const missed = useRef(0);
  const baseline = useRef<number | null>(null);
  const calibration = useRef<number[]>([]);
  useEffect(() => { setEnabled(false); setMode('off'); lastSent.current = { kind: '', at: 0 }; lastNear.current = 0; missed.current = 0; baseline.current = null; calibration.current = []; }, [sessionId]);
  useEffect(() => {
    if (!enabled || !active || !sessionId) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let config: Config | null = null;
    let sending = false;
    const report = async (kind: Kind, description: string) => {
      const now = Date.now();
      if (!live || sending || (lastSent.current.kind === kind && now - lastSent.current.at < (kind === 'outside' ? 20000 : 60000))) return;
      sending = true;
      try {
        const result = await api.post<Result>(`/proximity/sessions/${sessionId}/events`, { kind });
        if (!live) return;
        setMode(result.state); setRemaining(result.state === 'observing' ? result.remaining_seconds : null);
        setDetail(description); lastSent.current = { kind, at: Date.now() };
      } catch (e) { if (live) { setMode('uncertain'); setDetail(e instanceof Error ? e.message : 'Sin conexión con el servidor.'); } }
      finally { sending = false; }
    };
    const cycle = async () => {
      if (!live || !config || !ble) return;
      try {
        await ble.CheckuBle.startScan(config.service_uuid);
        timer = setTimeout(() => {
          if (!live || !ble) return;
          const signal = ble.CheckuBle.getSignal();
          ble.CheckuBle.stopScan();
          let kind: Kind = 'uncertain';
          let description = 'Señal Bluetooth no disponible. No se marca abandono sin lecturas suficientes.';
          if (signal.bluetoothEnabled && signal.scanning && signal.samples >= 2 && signal.medianRssi !== null) {
            missed.current = 0;
            const rssi = signal.medianRssi;
            if (baseline.current === null) {
              calibration.current.push(rssi);
              if (calibration.current.length >= 3) {
                baseline.current = [...calibration.current].sort((a,b) => a-b)[1];
                lastNear.current = Date.now();
                kind = 'inside';
                description = `Referencia BLE calibrada (${baseline.current} dBm). Permanece cerca del docente para iniciar.`;
              } else {
                description = `Calibrando señal cerca del docente (${calibration.current.length}/3).`;
              }
            } else if (rssi >= Math.max(-90, Math.min(-45, baseline.current - 12))) {
              kind = 'inside'; lastNear.current = Date.now();
              description = `Teléfono docente detectado · señal ${rssi} dBm. Presente.`;
            } else {
              kind = 'outside';
              description = `Señal débil (${rssi} dBm). En observación si persiste 2 minutos.`;
            }
          } else if (signal.bluetoothEnabled && signal.scanning) {
            missed.current += 1;
            // 3 consecutive misses, and only after an earlier confirmed near signal.
            // Even then we avoid treating missing BLE as proven departure.
            if (baseline.current !== null && missed.current >= 3 && lastNear.current > 0) {
              kind = 'outside';
              description = `Se perdió la señal BLE durante ${missed.current} comprobaciones. Posible salida; sujeto a revisión docente.`;
            } else {
              description = `Sin señal detectable (${missed.current} comprobaciones). Revisa Bluetooth y mantén CheckU abierta.`;
            }
          }
          void report(kind, description);
          timer = setTimeout(() => { void cycle(); }, CYCLE_MS - SCAN_MS);
        }, SCAN_MS);
      } catch (e) {
        if (live) { setMode('uncertain'); setDetail(e instanceof Error ? e.message : 'Bluetooth no disponible.'); }
      }
    };
    (async () => {
      try {
        if (!ble || Platform.OS !== 'android') throw new Error('Necesitas un APK de desarrollo, no Expo Go.');
        if (!await permissions()) throw new Error('Autoriza los permisos de Bluetooth para el seguimiento.');
        config = await api.get<Config>(`/proximity/sessions/${sessionId}/ble/config`);
        if (!live) return;
        setDetail('Buscando señal Bluetooth del docente…');
        await cycle();
      } catch (e) { if (live) { setEnabled(false); setMode('uncertain'); setDetail(e instanceof Error ? e.message : 'No se pudo iniciar el seguimiento.'); } }
    })();
    return () => { live = false; if (timer) clearTimeout(timer); try { ble?.CheckuBle.stopScan(); } catch {} };
  }, [enabled, active, sessionId]);
  const color = mode === 'possible_abandonment' ? '#C0392B' : mode === 'observing' ? '#D18C19' : mode === 'present' ? '#22865E' : '#6F7F8A';
  const title = mode === 'present' ? 'Presente' : mode === 'observing' ? 'En observación' : mode === 'possible_abandonment' ? 'Posible abandono · revisar' : mode === 'uncertain' ? 'Señal no disponible' : 'Sin seguimiento';
  return <Card>
    <Text style={styles.title}>Permanencia · Bluetooth</Text>
    <View style={styles.row}><View style={[styles.dot, { backgroundColor: color }]} /><Text style={[styles.status, { color }]}>{title}</Text></View>
    {remaining !== null ? <Text style={styles.timer}>Tolerancia restante: {remaining} segundos</Text> : null}
    <Text style={styles.body}>{detail}</Text>
    <Text style={styles.warning}>Prueba Android: umbral BLE experimental (~1 m, sin garantía métrica) y 2 minutos de tolerancia. Tres pérdidas consecutivas tras una calibración cercana pueden iniciar observación; es solo un indicio, no prueba de abandono. Mantén CheckU abierta. El docente revisa los eventos; no se cambia la asistencia automáticamente.</Text>
    <Button title={enabled ? 'Detener seguimiento' : 'Iniciar seguimiento Bluetooth'} secondary={enabled} onPress={() => enabled ? setEnabled(false) : Alert.alert('Seguimiento Bluetooth', 'CheckU detectará localmente la señal de la sesión del docente. No se envía tu ubicación GPS. Mantén la app abierta.', [{ text: 'Cancelar' }, { text: 'Continuar', onPress: () => setEnabled(true) }])} />
  </Card>;
}
const styles = StyleSheet.create({ title: { fontSize: 17, fontWeight: '800', color: colors.navy }, row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }, dot: { width: 10, height: 10, borderRadius: 5 }, status: { fontSize: 16, fontWeight: '800' }, timer: { color: '#D18C19', marginTop: 8, fontWeight: '700' }, body: { color: colors.navy, marginTop: 12, lineHeight: 20 }, warning: { color: colors.muted, marginTop: 10, lineHeight: 19, fontSize: 12 } });
