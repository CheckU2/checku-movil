import React,{useCallback,useState} from 'react';
import {ActivityIndicator,ScrollView,Text,View} from 'react-native';
import {router,useFocusEffect} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {api} from '../api/client';
import {useAuth} from '../auth/AuthProvider';
import {Avatar} from './Avatar';
import {Button,Card,Notice,ScreenTitle} from './UI';
import {colors} from '../theme/tokens';
type Overview={career_name:string;groups:number;classes:number;students:number;teachers:number;tutors:number;active_sessions:number;pending_justifications:number};
export function CareerHome(){const {user}=useAuth();const [data,setData]=useState<Overview|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const load=useCallback(async()=>{setLoading(true);try{setData(await api.get<Overview>('/career-management/overview'));setError('');}catch(e){setError(e instanceof Error?e.message:'No se pudo cargar el resumen');}finally{setLoading(false);}},[]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
 const metrics:[string,number,string][]=[['Grupos',data?.groups??0,'people-outline'],['Clases',data?.classes??0,'book-outline'],['Alumnos',data?.students??0,'school-outline'],['Docentes',data?.teachers??0,'person-outline'],['Tutores',data?.tutors??0,'people-circle-outline'],['En curso',data?.active_sessions??0,'radio-outline']];
 return <ScrollView contentContainerStyle={{padding:22,paddingTop:58,paddingBottom:45}}><View style={{flexDirection:'row',alignItems:'center',gap:12}}><View style={{flex:1}}><Text style={{color:colors.primary,fontWeight:'800',letterSpacing:2,marginBottom:7}}>CHECKU · ADMINISTRACIÓN</Text><ScreenTitle title={`Hola, ${user?.full_name?.split(' ')[0]||'administrador'}`} subtitle={data?.career_name||'Tu carrera académica'}/></View><Avatar name={user?.full_name||'Usuario'} uri={user?.avatar||user?.avatar_url} size={54}/></View>
 <View style={{backgroundColor:colors.navy,padding:24,borderRadius:25,marginBottom:20}}><Ionicons name="school-outline" color={colors.mint} size={29}/><Text style={{color:colors.white,fontWeight:'800',fontSize:22,marginTop:12}}>Gestión académica</Text><Text style={{color:'#D7E6E6',marginTop:8,lineHeight:21}}>Administra grupos, organiza clases y supervisa la asistencia de tu carrera.</Text></View>
 {loading?<ActivityIndicator color={colors.primary}/>:null}{error?<Notice message={error}/>:null}
 {data?<><View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>{metrics.map(([label,value,icon])=><View key={label} style={{width:'47%',backgroundColor:colors.white,padding:18,borderRadius:19,borderWidth:1,borderColor:colors.border}}><Ionicons name={icon as any} size={21} color={colors.primary}/><Text style={{fontSize:28,fontWeight:'800',color:colors.navy,marginTop:7}}>{value}</Text><Text style={{color:colors.muted}}>{label}</Text></View>)}</View>{data.pending_justifications>0?<Card><Text style={{fontWeight:'800',color:colors.navy}}>{data.pending_justifications} justificantes pendientes de revisión docente</Text><Text style={{color:colors.muted,marginTop:5}}>Puedes supervisarlos desde los reportes; la resolución corresponde al docente.</Text></Card>:null}</>:null}
 <Text style={{fontSize:19,fontWeight:'800',color:colors.navy,marginTop:22,marginBottom:12}}>Acciones rápidas</Text><Button title="Crear y administrar grupos" onPress={()=>router.push('/(tabs)/groups')}/><Button title="Organizar clases" secondary onPress={()=>router.push('/(tabs)/classes')}/><Button title="Consultar personas" secondary onPress={()=>router.push('/(tabs)/people')}/><Button title="Ver reportes" secondary onPress={()=>router.push('/(tabs)/reports')}/></ScrollView>;
}
