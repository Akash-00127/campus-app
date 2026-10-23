import * as SecureStore from './secure';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createContext,useContext,useEffect,useState,useRef,type ReactNode} from 'react';
import {type Product,type Profile,type UserSession,request} from './api';
export type Line={product:Product;quantity:number;note?:string};
type State={ready:boolean;session:UserSession|null;cart:Line[];saved:Product[];signIn:(s:UserSession)=>Promise<void>;signOut:()=>Promise<void>;forget:()=>Promise<void>;add:(p:Product)=>boolean;replace:(p:Product)=>void;replaceCart:(lines:Line[])=>void;quantity:(id:string,n:number)=>void;note:(id:string,n:string)=>void;toggleSaved:(p:Product)=>void;clear:()=>void};
const Context=createContext<State|null>(null);const KEY='campus-drop-session';
export function SessionProvider({children}:{children:ReactNode}){
 const [ready,setReady]=useState(false),[session,setSession]=useState<UserSession|null>(null),[cart,setCart]=useState<Line[]>([]),[saved,setSaved]=useState<Product[]>([]),[loaded,setLoaded]=useState('');
 const writes=useRef(Promise.resolve());
 async function restore(s:UserSession){
  setLoaded('');const raw=await AsyncStorage.getItem('campus-shopping-'+s.user.id);let state:any={};try{state=JSON.parse(raw||'{}')}catch{}
  setCart(Array.isArray(state.cart)?state.cart:[]);setSaved(Array.isArray(state.saved)?state.saved:[]);setSession(s);setLoaded(s.user.id);
 }
 useEffect(()=>{SecureStore.getItemAsync(KEY).then(async raw=>{if(raw){try{const s=JSON.parse(raw) as UserSession;if(s.accessToken&&s.user){const user=await request<Profile>('/auth/me',s.accessToken);const verified={...s,user};await SecureStore.setItemAsync(KEY,JSON.stringify(verified));await restore(verified)}}catch{await SecureStore.deleteItemAsync(KEY)}}}).catch(()=>{}).finally(()=>setReady(true));},[]);
 useEffect(()=>{if(!session||loaded!==session.user.id)return;const key='campus-shopping-'+session.user.id;const value=JSON.stringify({cart,saved});writes.current=writes.current.catch(()=>{}).then(()=>AsyncStorage.setItem(key,value));},[cart,saved,session,loaded]);
 async function signIn(s:UserSession){await SecureStore.setItemAsync(KEY,JSON.stringify(s));await restore(s)}
 async function forget(){await writes.current.catch(()=>{});await SecureStore.deleteItemAsync(KEY);setLoaded('');setSession(null);setCart([]);setSaved([])}
 async function signOut(){try{if(session)await request('/auth/logout',session.accessToken,'POST')}finally{await forget()}}
 function add(p:Product){if(cart[0]&&cart[0].product.vendorId!==p.vendorId)return false;setCart(lines=>{const found=lines.some(l=>l.product.id===p.id);return found?lines.map(l=>l.product.id===p.id?{...l,product:p,quantity:Math.min(50,l.quantity+1)}:l):[...lines,{product:p,quantity:1}]});return true}
 return <Context.Provider value={{ready,session,cart,saved,signIn,signOut,forget,add,replace:p=>setCart([{product:p,quantity:1}]),replaceCart:setCart,quantity:(id,n)=>setCart(lines=>n<=0?lines.filter(l=>l.product.id!==id):lines.map(l=>l.product.id===id?{...l,quantity:Math.min(50,n)}:l)),note:(id,n)=>setCart(lines=>lines.map(l=>l.product.id===id?{...l,note:n}:l)),toggleSaved:p=>setSaved(rows=>rows.some(r=>r.id===p.id)?rows.filter(r=>r.id!==p.id):[p,...rows]),clear:()=>setCart([])}}>{children}</Context.Provider>
}
export function useSession(){const c=useContext(Context);if(!c)throw new Error('Session provider missing');return c}
