import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthProvider';
import { Button, Card, Input, Notice, ScreenTitle } from '../../src/components/UI';
import { colors } from '../../src/theme/tokens';

type Student = { id: string; name: string };
type SessionOption = { id: string; class_id: string; label: string; teacher_name: string; students: Student[] };
type Message = { id: string; author_role: string; message: string; created_at: string };
type Case = { id: string; student_id: string; student_name?: string; session_id: string; reason: string; status: string; created_at: string; messages?: Message[]; resolution_comment?: string };
const err = (e: unknown) => e instanceof Error ? e.message : 'No se pudo completar la operación';
const stateName: Record<string, string> = {pending:'Pendiente',approved:'Justificada',rejected:'Rechazada',cancelled:'Cancelada',needs_information:'Solicitan información'};

export default function Messages() {
 const {user} = useAuth(); const tutor = user?.role === 'tutor'; const teacher = user?.role === 'teacher';
 const [cases,setCases]=useState<Case[]>([]); const [options,setOptions]=useState<SessionOption[]>([]);
 const [pending,setPending]=useState(0); const [loading,setLoading]=useState(true); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
 const [creating,setCreating]=useState(false); const [session,setSession]=useState(''); const [student,setStudent]=useState(''); const [reason,setReason]=useState('');
 const [attendanceStatus,setAttendanceStatus]=useState<'excused'|'present'>('excused'); const [selected,setSelected]=useState<Case|null>(null); const [message,setMessage]=useState(''); const [resolution,setResolution]=useState('');
 const load=useCallback(async()=>{
  try { const result=await api.get<Case[]>('/justifications?limit=100'); setCases(result); setPending(result.filter(c=>['pending','needs_information'].includes(c.status)).length); setError('');
   if(tutor) {const o=await api.get<{sessions:SessionOption[]}>('/justifications/options');setOptions(o.sessions);}
  } catch(e){setError(err(e));} finally {setLoading(false);}
 },[tutor]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
 const current=options.find(x=>x.id===session);
 const sendRequest=async()=>{if(!session||!student||reason.trim().length<5){Alert.alert('Faltan datos','Selecciona la sesión, el alumno y escribe un motivo de al menos cinco caracteres.');return;}
  setBusy(true);try{await api.post('/justifications',{session_id:session,student_id:student,reason:reason.trim()});setCreating(false);setSession('');setStudent('');setReason('');await load();Alert.alert('Solicitud enviada','El docente podrá revisar la falta y responder.');}catch(e){Alert.alert('No se pudo enviar',err(e));}finally{setBusy(false);}};
 const openCase=async(c:Case)=>{setSelected(c);setMessage('');setResolution('');setAttendanceStatus('excused');try{const updated=await api.get<Case>(`/justifications/${c.id}`);setSelected(updated);}catch(e){Alert.alert('Error',err(e));}};
 const sendMessage=async()=>{if(!selected||!message.trim())return;setBusy(true);try{await api.post(`/justifications/${selected.id}/messages`,{message:message.trim()});setMessage('');const updated=await api.get<Case>(`/justifications/${selected.id}`);setSelected(updated);await load();}catch(e){Alert.alert('Error',err(e));}finally{setBusy(false);}};
 const decide=async(action:'approve'|'reject')=>{if(!selected)return;if(action==='reject'&&resolution.trim().length<5){Alert.alert('Motivo requerido','Explica el rechazo con al menos cinco caracteres.');return;}
  setBusy(true);try{await api.post(`/justifications/${selected.id}/${action}`,{comment:resolution.trim(),attendance_status:attendanceStatus});setSelected(null);await load();Alert.alert('Listo',action==='approve'?(attendanceStatus==='present'?'Alumno marcado como presente.':'Falta justificada.'):'Solicitud rechazada.');}catch(e){Alert.alert('No se pudo resolver',err(e));}finally{setBusy(false);}};
 if(!tutor&&!teacher)return <View style={{flex:1,padding:24,justifyContent:'center'}}><Text>Esta sección está disponible para tutores y docentes.</Text></View>;
 return <View style={{flex:1,backgroundColor:'#F5F8F8'}}><ScrollView contentContainerStyle={{padding:22,paddingTop:58,paddingBottom:90}}>
  <ScreenTitle title={tutor?'Mensajes':'Notificaciones y justificantes'} subtitle={tutor?'Solicita justificaciones y conversa con los docentes.':'Solicitudes de tutores. Abre una para responder y cambiar la asistencia.'}/>{teacher&&pending>0?<Card><Text style={{color:colors.navy,fontWeight:'800'}}>Tienes {pending} solicitud{pending===1?'':'es'} pendiente{pending===1?'':'s'} de revisar</Text></Card>:null}
  {tutor?<Button title="+ Solicitar justificante" onPress={()=>setCreating(true)}/>:null}
  {error?<Notice message={error}/>:null}
  {loading?<ActivityIndicator color={colors.primary}/>:null}
  {!loading&&cases.length===0?<Card><Text style={{color:colors.muted}}>Todavía no hay solicitudes. {tutor?'Selecciona una sesión para escribir al docente.':''}</Text></Card>:null}
  {cases.map(c=><Card key={c.id} onPress={()=>void openCase(c)}><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8}}><Text style={{fontSize:16,fontWeight:'800',color:colors.navy,flex:1}}>Justificante · {c.student_name || 'Alumno'}</Text><Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary}/></View><Text style={{marginTop:8,color:colors.muted}} numberOfLines={2}>{c.reason}</Text><View style={{flexDirection:'row',justifyContent:'space-between',marginTop:12}}><Text style={{color: c.status==='approved'?'#24845B':c.status==='rejected'?colors.danger:'#BA8028',fontWeight:'700'}}>{stateName[c.status]||c.status}</Text><Text style={{color:colors.muted}}>{c.messages?.length??0} mensajes</Text></View></Card>)}
 </ScrollView>
 <Modal visible={creating} animationType="slide" onRequestClose={()=>setCreating(false)}><ScrollView contentContainerStyle={{padding:22,paddingTop:54,paddingBottom:40}} keyboardShouldPersistTaps="handled"><ScreenTitle title="Nueva solicitud" subtitle="Elige una sesión y el alumno cuya falta deseas justificar."/>
  <Text style={{fontWeight:'800',color:colors.navy,marginBottom:8}}>Sesión · Docente</Text>
  {options.length===0?<Notice message="No hay sesiones disponibles en tus clases asignadas."/>:options.map(o=><Pressable key={o.id} onPress={()=>{setSession(o.id);setStudent('');}} style={{padding:13,marginBottom:7,borderRadius:12,backgroundColor:session===o.id?colors.mint:'#FFF',borderWidth:1,borderColor:session===o.id?colors.primary:colors.border}}><Text style={{fontWeight:'700',color:colors.navy}}>{o.label}</Text><Text style={{color:colors.muted}}>{o.teacher_name}</Text></Pressable>)}
  {current?<><Text style={{fontWeight:'800',color:colors.navy,marginVertical:12}}>Alumno</Text>{current.students.map(s=><Pressable key={s.id} onPress={()=>setStudent(s.id)} style={{padding:12,marginBottom:6,borderRadius:12,backgroundColor:student===s.id?colors.mint:'#FFF',borderWidth:1,borderColor:student===s.id?colors.primary:colors.border}}><Text style={{color:colors.navy}}>{s.name}</Text></Pressable>)}</>:null}
  <Text style={{fontWeight:'800',color:colors.navy,marginTop:12,marginBottom:8}}>Motivo de la falta</Text><Input value={reason} onChangeText={setReason} multiline style={{minHeight:110,textAlignVertical:'top',paddingTop:12}} placeholder="Describe el motivo de la ausencia"/>
  <Button title="Enviar al docente" busy={busy} onPress={()=>void sendRequest()}/><Button title="Cancelar" secondary onPress={()=>setCreating(false)}/>
 </ScrollView></Modal>
 <Modal visible={!!selected} animationType="slide" onRequestClose={()=>setSelected(null)}><ScrollView contentContainerStyle={{padding:22,paddingTop:54,paddingBottom:40}} keyboardShouldPersistTaps="handled"><ScreenTitle title="Conversación" subtitle={selected?stateName[selected.status]||selected.status:''}/>
  <Card><Text style={{color:colors.navy,fontWeight:'800'}}>Motivo de la solicitud</Text><Text style={{color:colors.muted,marginTop:8}}>{selected?.reason}</Text>{selected?.resolution_comment?<Text style={{marginTop:12,color:colors.navy}}>Resolución: {selected.resolution_comment}</Text>:null}</Card>
  {(selected?.messages??[]).map(m=><View key={m.id} style={{padding:14,marginBottom:9,backgroundColor:m.author_role===user?.role?colors.mint:'#FFF',borderRadius:16,borderWidth:1,borderColor:colors.border}}><Text style={{color:colors.muted,fontSize:12,fontWeight:'700'}}>{m.author_role==='teacher'?'Docente':'Tutor'}</Text><Text style={{color:colors.navy,marginTop:5}}>{m.message}</Text></View>)}
  <Input value={message} onChangeText={setMessage} multiline placeholder="Escribe un mensaje..."/><Button title="Enviar mensaje" busy={busy} onPress={()=>void sendMessage()}/>
  {teacher&&selected&&['pending','needs_information'].includes(selected.status)?<><Text style={{color:colors.navy,fontWeight:'800',marginTop:16}}>Estado de asistencia al aprobar</Text>
  <View style={{flexDirection:'row',gap:10,marginTop:8}}>
   {([{value:'excused',label:'Justificada'},{value:'present',label:'Presente'}] as const).map(o=><Pressable key={o.value} onPress={()=>setAttendanceStatus(o.value)} style={{flex:1,padding:14,borderRadius:12,borderWidth:1,borderColor:attendanceStatus===o.value?colors.primary:colors.border,backgroundColor:attendanceStatus===o.value?colors.mint:'#FFF'}}><Text style={{textAlign:'center',color:colors.navy,fontWeight:'700'}}>{o.label}</Text></Pressable>)}
  </View>
  <Text style={{color:colors.muted,marginTop:8,marginBottom:8}}>Selecciona Presente solo si verificaste que el alumno asistió. Para una falta justificada, conserva Justificada.</Text>
  <Text style={{color:colors.navy,fontWeight:'800',marginTop:20,marginBottom:8}}>Resolución del docente</Text><Input value={resolution} onChangeText={setResolution} placeholder="Comentario (obligatorio al rechazar)"/><Button title={attendanceStatus==='present'?'Aprobar y marcar presente':'Aprobar como justificada'} busy={busy} onPress={()=>void decide('approve')}/><Button title="Rechazar solicitud" secondary busy={busy} onPress={()=>void decide('reject')}/></>:null}
  <Button title="Cerrar" secondary onPress={()=>setSelected(null)}/>
 </ScrollView></Modal>
 </View>;
}
