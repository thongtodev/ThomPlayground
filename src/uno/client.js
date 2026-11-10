import {randomId} from '../uuid';
import {createClient} from '@supabase/supabase-js';
const url=(import.meta.env.VITE_SUPABASE_URL||'').trim().replace(/\/(?:rest|auth|storage)\/v1\/?$/i,'').replace(/\/+$/,'');
const key=import.meta.env.VITE_SUPABASE_ANON_KEY;
export const unoClient=url&&key?createClient(url,key,{auth:{storageKey:'thom-uno-auth-v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;
export async function connectUno(){
 if(!unoClient)throw new Error('Chưa cấu hình Supabase cho trò chơi online.');
 const {data:{session}}=await unoClient.auth.getSession();if(session)return session.user.id;
 const {data,error}=await unoClient.auth.signInAnonymously();if(error)throw error;return data.user.id;
}
export async function unoRequest(action,code='',args={},version=null){
 const {data,error}=await unoClient.rpc('uno_room',{action,room_code:code,args,expected_version:version,request_id:randomId()});
 if(error)throw error;return data;
}
