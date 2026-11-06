import React,{useCallback,useState} from 'react';
import {ActivityIndicator,ScrollView,Text,View} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {api} from '../../src/api/client';
import {useAuth} from '../../src/auth/AuthProvider';
import {Avatar} from '../../src/components/Avatar';
import {Card,Notice,ScreenTitle} from '../../src/components/UI';
import {colors} from '../../src/theme/tokens';
import {Pressable} from 'react-native';
type Person={id:string;full_name:string;email?:string;avatar_url?:string};
type Role='student'|'teacher'|'tutor';
const roles:{id:Role;label:string}[]=[{id:'student',label:'Alumnos'},{id:'teacher',label:'Docentes'},{id:'tutor',label:'Tutores'}];
export default function People(){const {user}=useAuth();const [role,setRole]=useState<Role>('student'),[people,setPeople]=useState<Person[]>([]),[total,setTotal]=useState(0),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const load=useCallback(async()=>{setLoading(true);try{const r=await api.get<{items:Person[];total:number}>(`/career-management/people?role=${role}&limit=100`);setPeople(r.items);setTotal(r.total);setError('');}catch(e){setError(e instanceof Error?e.message:'Error de conexión');}finally{setLoading(false);}},[role]);
 useFocusEffect(useCallback(()=>{if(user?.role==='career_admin')void load();},[load,user?.role]));
 if(user?.role!=='career_admin')return null;
 return <ScrollView contentContainerStyle={{padding:22,paddingTop:60,paddingBottom:45}}><ScreenTitle title="Personas" subtitle="Alumnos, docentes y tutores de tu carrera."/><View style={{flexDirection:'row',gap:8,marginBottom:20}}>{roles.map(r=><Pressable key={r.id} onPress={()=>setRole(r.id)} style={{flex:1,paddingVertical:13,alignItems:'center',borderRadius:14,backgroundColor:role===r.id?colors.mint:colors.white}}><Text style={{color:colors.navy,fontWeight:'700',fontSize:12}}>{r.label}</Text></Pressable>)}</View><Text style={{color:colors.muted,marginBottom:12}}>{total} registros · Primeros 100</Text>{loading?<ActivityIndicator color={colors.primary}/>:null}{error?<Notice message={error}/>:null}{!loading&&!people.length?<Card><Text>No hay personas registradas con este rol.</Text></Card>:null}{people.map(p=><Card key={p.id}><View style={{flexDirection:'row',alignItems:'center',gap:13}}><Avatar name={p.full_name} uri={p.avatar_url} size={50}/><View style={{flex:1}}><Text style={{fontWeight:'800',fontSize:16,color:colors.navy}}>{p.full_name}</Text><Text style={{color:colors.muted}}>{p.email}</Text></View></View></Card>)}</ScrollView>;
}
