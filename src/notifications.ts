import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import * as Device from 'expo-device';
import { request } from './api';
export function pushUnavailableReason(): string | null {
 if(isRunningInExpoGo())return 'Remote push alerts need a development build. Your notification inbox works normally in Expo Go.';
 if(Platform.OS!=='android')return 'Android push is supported in this build. Your in-app notification inbox remains available.';
 if(!Device.isDevice)return 'Push notifications require a configured physical Android device.';
 if(!Constants.expoConfig?.extra?.firebaseConfigured)return 'Firebase is not configured for this build. Your in-app notification inbox remains available.';
 return null;
}
export async function enablePush(token:string){
 const reason=pushUnavailableReason();if(reason)throw new Error(reason);
 // Do not evaluate the native notifications package while running in Expo Go.
 const Notifications=await import('expo-notifications');
 Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false})});
 await Notifications.setNotificationChannelAsync('orders',{name:'Campus orders',importance:Notifications.AndroidImportance.HIGH,sound:'default'});
 const permission=await Notifications.requestPermissionsAsync();
 if(permission.status!=='granted')throw new Error('Notification permission was not granted. You can enable it in device settings.');
 const native=await Notifications.getDevicePushTokenAsync();
 await request('/notifications/devices',token,'POST',{token:String(native.data),platform:'ANDROID'});
 return Notifications.addPushTokenListener(next=>{void request('/notifications/devices',token,'POST',{token:String(next.data),platform:'ANDROID'}).catch(()=>{})});
}
