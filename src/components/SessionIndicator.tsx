import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
const palette: Record<string, { color: string; text: string }> = {
  active: { color: '#1FAD75', text: 'En curso' },
  scheduled: { color: '#E4A13D', text: 'Programada' },
  closed: { color: '#8592A0', text: 'Finalizada' },
  present: { color: '#1FAD75', text: 'Presente' },
  observing: { color: '#E4A13D', text: 'En observación' },
  possible_abandonment: { color: '#D44747', text: 'Posible abandono' },
  uncertain: { color: '#8592A0', text: 'GPS incierto' },
};
export function SessionIndicator({ status }: { status?: string }) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!['active', 'observing', 'possible_abandonment'].includes(status || '')) { opacity.setValue(1); return; }
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.2, duration: 750, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
    ]));
    anim.start(); return () => anim.stop();
  }, [status, opacity]);
  const item = palette[status || ''] || { color: '#8592A0', text: status || 'Sin estado' };
  return <View style={styles.row}><Animated.View style={[styles.dot, { backgroundColor: item.color, opacity }]} /><Text style={[styles.text, { color: item.color }]}>{item.text}</Text></View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }, dot: { width: 9, height: 9, borderRadius: 5 }, text: { fontSize: 12, fontWeight: '800' } });
