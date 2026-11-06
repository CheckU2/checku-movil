import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, View, Pressable, Share } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { api } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthProvider';
import { Button, Card, Input, Notice, ScreenTitle } from '../../src/components/UI';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/tokens';
import type { ClassItem, SessionItem } from '../../src/types/models';
import { SessionIndicator } from '../../src/components/SessionIndicator';

type Option = { id: string; name?: string; code?: string; full_name?: string; user_id?: string };
type Catalog = { careers: Option[]; subjects: Option[]; groups: Option[]; 'academic-periods': Option[]; teachers: Option[]; assigned_career_id?: string | null };
const errorText = (e: unknown) => e instanceof Error ? e.message : 'No se pudo completar la operación.';
const display = (o: Option) => o.full_name || o.name || o.code || 'Sin nombre';

function Choice({ title, options, value, onSelect }: {title: string; options: Option[]; value: string; onSelect: (id: string) => void}) {
  const [expanded, setExpanded] = useState(false);
  const current = options.find(x => x.id === value);
  return <View style={{marginBottom: 12}}>
    <Text style={{fontWeight: '700', color: colors.navy, marginBottom: 7}}>{title}</Text>
    <Pressable accessibilityRole="button" onPress={() => setExpanded(!expanded)} style={styles.choice}>
      <Text style={{color: current ? colors.navy : colors.muted, flex: 1}}>{current ? display(current) : `Seleccionar ${title.toLowerCase()}`}</Text>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary}/>
    </Pressable>
    {expanded ? <View style={styles.options}>{options.length ? options.map(o => <Pressable key={o.id} onPress={() => {onSelect(o.id); setExpanded(false);}} style={styles.option}><Text style={{color: colors.navy}}>{display(o)}</Text></Pressable>) : <Text style={{color: colors.muted, padding: 12}}>No hay opciones disponibles.</Text>}</View> : null}
  </View>;
}

export default function Classes() {
  const { user } = useAuth();
  const [items, setItems] = useState<ClassItem[]>([]);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [careerId, setCareerId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [createdCode, setCreatedCode] = useState('');
  const [createError, setCreateError] = useState('');
  const [invitations, setInvitations] = useState<{id: string; class_id: string}[]>([]);
  const canCreate = !!user && user.role !== 'student';
  const openCreator = async () => {
    setCreateOpen(true); setCreatedCode(''); setCreateError('');
    try {
      const options = await api.get<Catalog>('/classes/options');
      setCatalog(options);
      setCareerId(options.assigned_career_id || options.careers[0]?.id || '');
      setSubjectId(''); setGroupId(''); setPeriodId(''); setTeacherId(''); setNewSubject('');
    } catch (e) { setCreateError(errorText(e)); }
  };
  const createClass = async () => {
    if (!careerId || !groupId || !periodId || (!subjectId && !newSubject.trim()) || (user?.role !== 'teacher' && !teacherId)) {
      setCreateError('Completa la carrera, materia, grupo, periodo y docente correspondiente.'); return;
    }
    setBusy(true); setCreateError('');
    try {
      let selectedSubject = subjectId;
      if (newSubject.trim()) {
        const created = await api.post<Option>('/classes/subjects', {name: newSubject.trim(), career_id: careerId});
        selectedSubject = created.id;
      }
      const created = await api.post<{id: string; join_code?: string}>('/classes', {
        career_id: careerId, subject_id: selectedSubject, group_id: groupId, period_id: periodId,
        ...(user?.role === 'teacher' ? {} : {teacher_id: teacherId}),
      });
      setCreatedCode(created.join_code || '');
      await load();
    } catch (e) { setCreateError(errorText(e)); }
    finally { setBusy(false); }
  };
  const load = useCallback(async () => {
    try {
      const data = await api.get<ClassItem[] | { items: ClassItem[] }>('/classes?limit=50');
      setItems(Array.isArray(data) ? data : data.items ?? []); setError('');
      if (user?.role === 'tutor') {try {setInvitations(await api.get<{id: string; class_id: string}[]>('/classes/invitations/mine'));} catch {setInvitations([]);}}
      try { const active = await api.get<SessionItem[]>('/sessions/active'); setActiveIds(active.map(x=>x.class_id).filter((x): x is string => !!x)); } catch { setActiveIds([]); }
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron cargar las clases.'); }
    finally { setLoading(false); }
  }, [user?.role]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const acceptInvitation = async (id: string) => {
    setBusy(true);
    try {await api.post(`/classes/invitations/${id}/accept`, {}); await load(); Alert.alert('Invitación aceptada', 'Ya puedes consultar esta clase.');}
    catch(e) {Alert.alert('No se pudo aceptar', errorText(e));}
    finally {setBusy(false);}
  };
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
      {canCreate ? <Button title="+ Crear clase" onPress={() => void openCreator()} /> : null}
      {user?.role === 'tutor' && invitations.length > 0 ? <Card><Text style={styles.name}>Invitaciones pendientes</Text>{invitations.map(inv => <View key={inv.id} style={{marginTop: 12}}><Text style={styles.meta}>Te invitaron a colaborar en una clase.</Text><Button title="Aceptar invitación" busy={busy} onPress={() => void acceptInvitation(inv.id)} /></View>)}</Card> : null}
      {error && !open ? <Notice message={error} /> : null}
      {loading && items.length === 0 ? <ActivityIndicator color={colors.primary} /> : null}
      {!loading && items.length === 0 ? <Card><Text>No tienes clases por ahora.</Text></Card> : null}
      {items.map((item, index) => <Card key={item.id} onPress={() => router.push({ pathname: '/classes/[classId]', params: { classId: item.id } })}>
        <View style={[styles.cover, { backgroundColor: index % 2 ? '#C9EAE1' : '#DDECE9' }]} />
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={[styles.name,{flex:1}]}>{item.subject_name || 'Materia sin nombre'}</Text><Ionicons name="chevron-forward" size={20} color={colors.primary}/></View>
        <Text style={styles.meta}>{item.group_name || 'Grupo sin asignar'}</Text>{activeIds.includes(item.id) ? <SessionIndicator status="active"/> : null}
        <View style={{flexDirection:'row',alignItems:'center',gap:6,marginTop:8}}><Ionicons name="person-outline" size={16} color={colors.muted}/><Text style={styles.meta}>{item.teacher_name || 'Docente por confirmar'}</Text></View>
      </Card>)}
    </ScrollView>
    <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
      <View style={styles.overlay}><View style={[styles.sheet, {maxHeight: '92%'}]}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <ScreenTitle title={createdCode ? 'Clase creada' : 'Nueva clase'} subtitle={createdCode ? 'Comparte este código con tus alumnos.' : 'Organiza una clase y genera su código de acceso.'} />
          {createdCode ? <>
            <View style={{backgroundColor: '#E5F5EF', padding: 22, borderRadius: 20, alignItems: 'center', marginBottom: 16}}><Text style={{fontSize: 38, fontWeight: '900', color: colors.navy, letterSpacing: 7}}>{createdCode}</Text></View>
            <Button title="Compartir código" onPress={() => {void Share.share({message: `Código para unirte a mi clase en CheckU: ${createdCode}`});}} />
            <Button title="Ver mis clases" secondary onPress={() => setCreateOpen(false)} />
          </> : <>
            {!catalog && !createError ? <ActivityIndicator color={colors.primary} /> : null}
            {catalog ? <>
              <Choice title="Carrera" options={catalog.careers} value={careerId} onSelect={setCareerId} />
              <Choice title="Materia" options={catalog.subjects.filter(x => !careerId || !('career_id' in x) || (x as Option & {career_id?: string}).career_id === careerId)} value={subjectId} onSelect={v => {setSubjectId(v); setNewSubject('');}} />
              <Text style={{color: colors.muted, marginBottom: 8}}>O escribe una materia nueva:</Text>
              <Input value={newSubject} onChangeText={v => {setNewSubject(v); if(v.trim()) setSubjectId('');}} placeholder="Nombre de la nueva materia" />
              <Choice title="Grupo" options={catalog.groups} value={groupId} onSelect={setGroupId} />
              <Choice title="Periodo" options={catalog['academic-periods']} value={periodId} onSelect={setPeriodId} />
              {user?.role !== 'teacher' ? <Choice title="Docente" options={catalog.teachers} value={teacherId} onSelect={setTeacherId} /> : <Text style={{color: colors.muted, marginBottom: 12}}>Docente: tu cuenta actual.</Text>}
            </> : null}
            {createError ? <Notice message={createError} /> : null}
            <Button title="Crear y generar código" busy={busy} onPress={() => void createClass()} />
            <Button title="Cancelar" secondary onPress={() => setCreateOpen(false)} />
          </>}
        </ScrollView>
      </View></View>
    </Modal>
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
  choice: {borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, borderRadius: 14, minHeight: 50, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center'},
  options: {backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginTop: 4, maxHeight: 180},
  option: {padding: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border},
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 26, paddingBottom: 40 },
});
