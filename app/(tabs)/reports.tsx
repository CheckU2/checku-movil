import React,{useCallback,useState} from 'react';
import {ActivityIndicator,ScrollView,Text,View} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {api} from '../../src/api/client';
import {useAuth} from '../../src/auth/AuthProvider';
import {Button,Card,Notice,ScreenTitle} from '../../src/components/UI';
import {colors} from '../../src/theme/tokens';
type Report={period_days:number;sessions_evaluated:number;statuses:Record<string,number>;attendance_percentage:number|null};
const names:Record<string,string>={present:'Presentes',late:'Retardos',absent:'Faltas',excused:'Justificadas',abandoned:'Posibles abandonos'};
export default function Reports(){const {user}=useAuth();const [days,setDays]=useState(30),[data,setData]=useState<Report|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const load=useCallback(async()=>{setLoading(true);try{setData(await api.get<Report>(`/reports/attendance?days=${days}`));setError('');}catch(e){setError(e instanceof Error?e.message:'No se pudo cargar el reporte');}finally{setLoading(false);}},[days]);
 useFocusEffect(useCallback(()=>{if(user?.role==='career_admin')void load();},[load,user?.role]));if(user?.role!=='career_admin')return null;
 return <ScrollView contentContainerStyle={{padding:22,paddingTop:60,paddingBottom:45}}><ScreenTitle title="Reportes" subtitle="Asistencia registrada en tu carrera."/><View style={{flexDirection:'row',gap:8,marginBottom:14}}>{[7,30,90].map(n=><View key={n} style={{flex:1}}><Button title={`${n} días`} secondary={days!==n} onPress={()=>setDays(n)}/></View>)}</View>{loading?<ActivityIndicator color={colors.primary}/>:null}{error?<Notice message={error}/>:null}{data?<><Card><Text style={{color:colors.muted}}>Asistencia estimada</Text><Text style={{fontSize:38,fontWeight:'900',color:colors.primary,marginTop:8}}>{data.attendance_percentage===null?'Sin datos':`${data.attendance_percentage}%`}</Text><Text style={{color:colors.muted,marginTop:8}}>{data.sessions_evaluated} registros evaluados en los últimos {days} días</Text></Card>{Object.entries(data.statuses||{}).map(([key,value])=><Card key={key}><View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={{color:colors.navy,fontWeight:'700'}}>{names[key]||key}</Text><Text style={{color:colors.primary,fontWeight:'800'}}>{value}</Text></View></Card>)}<Text style={{color:colors.muted,fontSize:12,marginTop:12}}>Los datos reflejan registros disponibles en el backend. Las posibles salidas BLE no equivalen automáticamente a una falta.</Text></>:null}</ScrollView>;
}
