import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius } from '../theme/tokens';

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return <View style={{ marginBottom: 24 }}><Text style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>;
}
export function Card({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) {
  return <Pressable onPress={onPress} disabled={!onPress} style={styles.card}>{children}</Pressable>;
}
export function Button({ title, onPress, busy = false, secondary = false }: {
  title: string; onPress: () => void; busy?: boolean; secondary?: boolean;
}) {
  return <Pressable disabled={busy} onPress={onPress} style={[styles.button, secondary && styles.secondary]}>
    {busy ? <ActivityIndicator color={secondary ? colors.navy : colors.white} /> :
      <Text style={[styles.buttonText, secondary && { color: colors.navy }]}>{title}</Text>}
  </Pressable>;
}
export function Input(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput placeholderTextColor={colors.muted} {...props} style={[styles.input, props.style]} />;
}
export function Notice({ message }: { message: string }) {
  return <Text style={{ color: colors.danger, marginVertical: 12 }}>{message}</Text>;
}
const styles = StyleSheet.create({
  title: { fontSize: 32, fontWeight: '800', color: colors.navy },
  subtitle: { color: colors.muted, marginTop: 5, fontSize: 14 },
  card: { backgroundColor: colors.white, borderRadius: radius.card, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  button: { minHeight: 52, backgroundColor: colors.primary, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginVertical: 6 },
  secondary: { backgroundColor: colors.mint },
  buttonText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  input: { backgroundColor: colors.white, borderRadius: radius.button, borderWidth: 1, borderColor: colors.border, minHeight: 54, paddingHorizontal: 16, marginBottom: 12, color: colors.navy },
});
