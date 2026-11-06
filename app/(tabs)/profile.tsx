import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { request } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthProvider';
import { Avatar } from '../../src/components/Avatar';
import { Button, Card, Input, Notice, ScreenTitle } from '../../src/components/UI';
import { colors } from '../../src/theme/tokens';
import type { ApiEnvelope, Role, User } from '../../src/types/models';
const roles: Record<Role,string> = { student:'Alumno',teacher:'Docente',tutor:'Tutor',career_admin:'Administrador de carrera',admin:'Administrador',super_admin:'Administrador general' };
const palette = ['#35AD8B','#172B4D','#6B8ED9','#D58D89','#8C79BC','#D4A458'];
export default function Profile() {
 const {user, signOut, refreshUser} = useAuth();
 const [edit,setEdit]=useState(false), [settings,setSettings]=useState(false), [busy,setBusy]=useState(false);
 const [name,setName]=useState(''), [bio,setBio]=useState(''), [banner,setBanner]=useState('#35AD8B');
 const [avatar,setAvatar]=useState<string|null|undefined>(undefined), [error,setError]=useState('');
 const [oldPassword,setOldPassword]=useState(''), [newPassword,setNewPassword]=useState('');
 const openEdit=()=>{setName(user?.full_name??'');setBio(user?.bio??'');setBanner(user?.banner_color??colors.primary);setAvatar(undefined);setError('');setEdit(true);};
 const pickPhoto=async()=>{
  const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
  if(!permission.granted){Alert.alert('Permiso requerido','Autoriza el acceso a tus fotografías.');return;}
  const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:0.35,base64:true});
  if(result.canceled)return;
  const item=result.assets[0];
  if(!item.base64)return Alert.alert('Error','No se pudo leer la imagen.');
  const value=`data:image/jpeg;base64,${item.base64}`;
  if(value.length>330000)return Alert.alert('Imagen demasiado grande','Selecciona una imagen más pequeña (máximo 250 KB).');
  setAvatar(value);
 };
 const save=async()=>{setBusy(true);setError('');try{
  const payload:Record<string,unknown>={full_name:name.trim(),bio:bio.trim(),banner_color:banner};
  if(avatar!==undefined)payload.avatar=avatar;
  await request<ApiEnvelope<User>>('/auth/profile',{method:'PATCH',body:JSON.stringify(payload)});
  await refreshUser();setEdit(false);
 }catch(e){setError(e instanceof Error?e.message:'No se pudo actualizar el perfil.');}finally{setBusy(false);}};
 const changePassword=async()=>{setBusy(true);setError('');try{
  await request('/auth/change-password',{method:'PATCH',body:JSON.stringify({current_password:oldPassword,new_password:newPassword})});
  setSettings(false);setOldPassword('');setNewPassword('');Alert.alert('Contraseña actualizada','Inicia sesión nuevamente para continuar.');await signOut();
 }catch(e){setError(e instanceof Error?e.message:'No se pudo cambiar la contraseña.');}finally{setBusy(false);}};
 return <View style={{flex:1}}><ScrollView contentContainerStyle={styles.content}>
  <ScreenTitle title="Mi perfil" subtitle="Tu identidad en CheckU" />
  <View style={[styles.banner,{backgroundColor:user?.banner_color||colors.primary}]} />
  <View style={styles.identity}><Avatar name={user?.full_name||'Usuario'} uri={user?.avatar_url||user?.avatar} size={96}/>
   <Text style={styles.name}>{user?.full_name||'Usuario'}</Text><Text style={styles.role}>{user?roles[user.role]:''}</Text>
   <Text style={styles.bio}>{user?.bio||'Sin descripción por ahora.'}</Text>
   <Button title="Editar perfil" onPress={openEdit}/></View>
  <Card><View style={styles.line}><Ionicons name="mail-outline" size={21} color={colors.primary}/><View><Text style={styles.label}>Correo electrónico</Text><Text style={styles.value}>{user?.email||'—'}</Text></View></View></Card>
  <Card onPress={()=>{setError('');setSettings(true);}}><View style={styles.line}><Ionicons name="settings-outline" size={23} color={colors.primary}/><View style={{flex:1}}><Text style={styles.value}>Configuración y seguridad</Text><Text style={styles.label}>Cambiar contraseña y administrar tu cuenta</Text></View><Ionicons name="chevron-forward" size={19} color={colors.muted}/></View></Card>
  <Button title="Cerrar sesión" secondary onPress={()=>void signOut()}/>
 </ScrollView>
 <Modal visible={edit} animationType="slide" onRequestClose={()=>setEdit(false)}><ScrollView contentContainerStyle={styles.modal}>
  <Button title="Volver al perfil" secondary onPress={()=>setEdit(false)}/><ScreenTitle title="Editar perfil" subtitle="Personaliza cómo te ven en tus clases." />
  <Pressable onPress={()=>void pickPhoto()} style={{alignSelf:'center',alignItems:'center',marginBottom:22}}><Avatar name={name} uri={avatar===undefined?(user?.avatar_url||user?.avatar):avatar} size={100}/><Text style={styles.role}>Cambiar fotografía</Text></Pressable>
  <Text style={styles.label}>Nombre completo</Text><Input value={name} onChangeText={setName} maxLength={120}/>
  <Text style={styles.label}>Acerca de mí (opcional)</Text><Input value={bio} onChangeText={setBio} multiline maxLength={400} style={{minHeight:110,textAlignVertical:'top',paddingTop:14}} placeholder="Cuéntales algo a tus compañeros"/>
  <Text style={styles.label}>Color de portada</Text><View style={styles.palette}>{palette.map(c=><Pressable key={c} onPress={()=>setBanner(c)} style={[styles.swatch,{backgroundColor:c},banner===c&&{borderWidth:3,borderColor:colors.navy}]}/>)}</View>
  {error?<Notice message={error}/>:null}<Button title="Guardar cambios" busy={busy} onPress={()=>void save()}/>
 </ScrollView></Modal>
 <Modal visible={settings} animationType="slide" onRequestClose={()=>setSettings(false)}><ScrollView contentContainerStyle={styles.modal}>
  <Button title="Volver al perfil" secondary onPress={()=>setSettings(false)}/><ScreenTitle title="Configuración" subtitle="Seguridad de tu cuenta" />
  <Card><Text style={styles.value}>Cambiar contraseña</Text><Text style={styles.label}>Utiliza al menos 12 caracteres para la nueva contraseña.</Text>
  <Input placeholder="Contraseña actual" secureTextEntry value={oldPassword} onChangeText={setOldPassword}/>
  <Input placeholder="Nueva contraseña" secureTextEntry value={newPassword} onChangeText={setNewPassword}/>
  {error?<Notice message={error}/>:null}<Button title="Actualizar contraseña" busy={busy} onPress={()=>void changePassword()}/></Card>
 </ScrollView></Modal>
 </View>;
}
const styles=StyleSheet.create({content:{padding:22,paddingTop:60,paddingBottom:60},banner:{height:155,borderRadius:26},identity:{backgroundColor:'#FFFFFF',borderRadius:24,marginTop:-38,marginHorizontal:12,padding:22,alignItems:'center',marginBottom:18,borderWidth:1,borderColor:colors.border},name:{fontSize:25,fontWeight:'800',color:colors.navy,marginTop:12,textAlign:'center'},role:{fontSize:14,color:colors.primary,fontWeight:'800',marginTop:7},bio:{color:colors.muted,textAlign:'center',marginVertical:15,lineHeight:21},line:{flexDirection:'row',alignItems:'center',gap:14},label:{color:colors.muted,fontSize:13,marginBottom:7},value:{color:colors.navy,fontWeight:'700',fontSize:16},modal:{padding:24,paddingTop:58,paddingBottom:60},palette:{flexDirection:'row',gap:12,marginVertical:15,flexWrap:'wrap'},swatch:{width:43,height:43,borderRadius:23}});
