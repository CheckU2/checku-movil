import React, { useEffect, useState } from 'react';
import { Alert, PermissionsAndroid, Platform, Text } from 'react-native';
import { api } from '../api/client';
import { Button, Card } from './UI';
import { colors } from '../theme/tokens';

type Config = { service_uuid: string; grace_seconds: number };
let ble: typeof import('../../modules/checku-ble/src') | null = null;
try { ble = require('../../modules/checku-ble/src'); } catch { /* Expo Go / web */ }

async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (Number(Platform.Version) >= 31) {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return Object.values(result).every(v => v === PermissionsAndroid.RESULTS.GRANTED);
  }
  return true;
}

export function TeacherAnchor({ sessionId, onSaved }: { sessionId: string; onSaved?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(false);
  const [detail, setDetail] = useState('El docente puede emitir una señal Bluetooth de esta sesión, como un dispositivo cercano de Quick Share.');
  useEffect(() => {
    setActive(false);
    return () => { try { ble?.CheckuBle.stopAdvertising(); } catch {} };
  }, [sessionId]);
  const start = async () => {
    if (!ble || Platform.OS !== 'android') { Alert.alert('Compilación requerida', 'BLE requiere un APK de desarrollo; no funciona en Expo Go.'); return; }
    setBusy(true);
    try {
      if (!await requestBluetoothPermissions()) throw new Error('Autoriza los permisos de Bluetooth.');
      const config = await api.post<Config>(`/proximity/sessions/${sessionId}/ble/start`, {});
      await ble.CheckuBle.startAdvertising(config.service_uuid);
      await new Promise(resolve => setTimeout(resolve, 900));
      const status = ble.CheckuBle.advertisingStatus();
      if (!status.active) throw new Error(`No se pudo iniciar la emisión BLE (código ${status.error ?? 'desconocido'}).`);
      setActive(true);
      setDetail('Emitiendo la señal BLE de esta sesión. Deja este teléfono en el salón, con Bluetooth encendido y CheckU abierto.');
      onSaved?.();
    } catch (e) { setDetail(e instanceof Error ? e.message : 'No se pudo iniciar Bluetooth.'); }
    finally { setBusy(false); }
  };
  const stop = () => { try { ble?.CheckuBle.stopAdvertising(); } catch {} setActive(false); setDetail('Emisión detenida. Los alumnos verán señal no disponible.'); };
  return <Card>
    <Text style={{ fontWeight: '800', fontSize: 17, color: colors.navy }}>Teléfono docente · Bluetooth</Text>
    <Text style={{ color: colors.muted, lineHeight: 20, marginVertical: 10 }}>El teléfono anuncia una señal única para esta sesión. No necesitas GPS ni emparejar los teléfonos. Mantén la aplicación abierta durante la prueba.</Text>
    <Text style={{ color: active ? '#22865E' : colors.navy, marginBottom: 10 }}>{active ? '● Emitiendo señal' : '○ Emisor detenido'} · {detail}</Text>
    <Button title={active ? 'Detener señal Bluetooth' : 'Activar señal Bluetooth'} busy={busy} secondary={active} onPress={() => void (active ? stop() : start())} />
  </Card>;
}
