import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthProvider';
import { Avatar } from '../../src/components/Avatar';
import { CareerHome } from '../../src/components/CareerHome';
import { SessionIndicator } from '../../src/components/SessionIndicator';
import { Button, Card, ScreenTitle } from '../../src/components/UI';
import { colors } from '../../src/theme/tokens';
import type { ClassItem, SessionItem } from '../../src/types/models';
export default function Home(){
 const {user}=useAuth();const [classes,setClasses]=useState<ClassItem[]>([]),[sessions,setSessions]=useState<SessionItem[]>([]),[loading,setLoading]=useState(true);
 const staff=user?.role!=='student';
 useFocusEffect(useCallback(()=>{let alive=true;setLoading(true);
  Promise.allSettled([api.get<ClassItem[]|{items:ClassItem[]}>('/classes?limit=50'),api.get<SessionItem[]|{items:SessionItem[]}>('/sessions?limit=30')])
  .then(([c,s])=>{if(!alive)return;
   if(c.status==='fulfilled')setClasses(Array.isArray(c.value)?c.value:c.value.items??[]);
   if(s.status==='fulfilled')setSessions(Array.isArray(s.value)?s.value:s.value.items??[]);
  }).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[staff]));
 const live=sessions.filter(s=>['active','in_progress','open'].includes(s.status??''));
 if(user?.role==='career_admin')return <CareerHome/>;
 return <ScrollView contentContainerStyle={styles.content}>
  <View style={styles.header}><View style={{flex:1}}><Text style={styles.eyebrow}>CHECKU</Text><ScreenTitle title={`Hola, ${user?.full_name?.split(' ')[0]??'bienvenido'}`} subtitle="Tu día académico, de un vistazo" /></View><Avatar name={user?.full_name??'Usuario'} uri={user?.avatar||user?.avatar_url} size={56}/></View>
  <View style={styles.hero}><Ionicons name="school-outline" color={colors.white} size={30}/><Text style={styles.heroTitle}>Todo listo para tus clases</Text><Text style={styles.heroText}>Consulta tus materias, participa y mantén al día tu asistencia.</Text></View>
  {loading?<ActivityIndicator color={colors.primary}/>:null}
  <View style={styles.stats}><View style={styles.stat}><Text style={styles.number}>{classes.length}</Text><Text style={styles.label}>Mis clases</Text></View><View style={styles.stat}><Text style={styles.number}>{live.length}</Text><Text style={styles.label}>Sesiones activas</Text></View></View>
  {live.length>0?<><Text style={styles.section}>En curso</Text>{live.slice(0,3).map(s=><Card key={s.id} onPress={()=>router.push(user?.role==='student'? '/(tabs)/attendance' : '/(tabs)/sessions')}><View style={styles.row}><Ionicons name="radio-button-on-outline" color={colors.primary} size={22}/><View style={{flex:1}}><Text style={styles.cardTitle}>{s.subject_name||'Sesión activa'}</Text><Text style={styles.label}>{s.group_name||'Grupo'}</Text><SessionIndicator status={s.status}/></View></View></Card>)}</>:null}
  <Text style={styles.section}>Tus clases</Text>
  {classes.length===0&&!loading?<Card><Text style={styles.label}>Todavía no tienes clases registradas.</Text></Card>:null}
  {classes.slice(0,3).map(c=><Card key={c.id} onPress={()=>router.push({pathname:'/classes/[classId]',params:{classId:c.id}})}><View style={styles.row}><View style={styles.classIcon}><Ionicons name="book-outline" size={23} color={colors.primary}/></View><View style={{flex:1}}><Text style={styles.cardTitle}>{c.subject_name||'Materia'}</Text><Text style={styles.label}>{c.group_name||'Grupo'} · {c.teacher_name||'Docente por confirmar'}</Text>{live.some(s=>s.class_id===c.id)?<SessionIndicator status="active"/>:null}</View><Ionicons name="chevron-forward" size={18} color={colors.muted}/></View></Card>)}
  <Text style={styles.section}>Accesos rápidos</Text><Button title="Ver todas mis clases" onPress={()=>router.push('/(tabs)/classes')}/>
  {user?.role==='tutor'?<Button title="Mensajes y justificantes" secondary onPress={()=>router.push('/(tabs)/messages')}/>:user?.role==='student'?<Button title="Registrar asistencia" secondary onPress={()=>router.push('/(tabs)/attendance')}/>:<Button title="Gestionar sesiones" secondary onPress={()=>router.push(user?.role==='student'? '/(tabs)/attendance' : '/(tabs)/sessions')}/>}
 </ScrollView>;
}
const styles=StyleSheet.create({content:{padding:22,paddingTop:58,paddingBottom:50},header:{flexDirection:'row',gap:10,alignItems:'flex-start'},eyebrow:{fontSize:12,fontWeight:'800',letterSpacing:2,color:colors.primary,marginBottom:8},hero:{backgroundColor:colors.navy,padding:24,borderRadius:26,marginBottom:20},heroTitle:{color:colors.white,fontWeight:'800',fontSize:23,marginTop:14},heroText:{color:'#D6E7E4',lineHeight:21,marginTop:8},stats:{flexDirection:'row',gap:12},stat:{flex:1,backgroundColor:colors.white,borderRadius:22,padding:19,borderWidth:1,borderColor:colors.border},number:{fontSize:29,fontWeight:'800',color:colors.primary},label:{fontSize:13,color:colors.muted,marginTop:5},section:{fontSize:19,fontWeight:'800',color:colors.navy,marginTop:24,marginBottom:13},row:{flexDirection:'row',alignItems:'center',gap:12},cardTitle:{fontSize:16,fontWeight:'800',color:colors.navy},classIcon:{width:46,height:46,borderRadius:15,backgroundColor:colors.mint,justifyContent:'center',alignItems:'center'}});
