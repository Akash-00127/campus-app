import {useState,useCallback} from 'react';
import {useFocusEffect,router} from 'expo-router';
import {Text,View} from 'react-native';
import {request,type Product} from '../src/api';
import {useSession} from '../src/session';
import {Button,Notice,Screen,Title} from '../src/ui';
import {ProductCard} from '../src/storefront';
export default function Saved(){const {saved,session}=useSession();const [items,setItems]=useState<Product[]>([]),[unavailable,setUnavailable]=useState(0);useFocusEffect(useCallback(()=>{let active=true;if(session)Promise.all(saved.map(p=>request<Product>(`/products/${p.id}`,session.accessToken).catch(()=>null))).then(rows=>{if(active){setItems(rows.filter((r):r is Product=>!!r));setUnavailable(rows.filter(r=>!r).length)}});return()=>{active=false}},[saved,session]));return <Screen><Button secondary onPress={()=>router.back()}>← Back</Button><View style={{marginTop:20}}><Title eyebrow="GOOD FINDS, KEPT CLOSE" title="Saved for later" subtitle="Current prices and availability from your campus."/></View><View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between'}}>{items.map(p=><ProductCard key={p.id} product={p}/>)}</View>{!saved.length&&<Notice text="Tap the heart on a product to save it here."/>}{unavailable>0&&<Notice text={`${unavailable} saved items are currently unavailable or could not be loaded.`}/>}</Screen>}
