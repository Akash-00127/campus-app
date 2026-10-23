import { Image } from 'react-native';
export function Brand({size=72}:{size?:number}) { return <Image source={require('../assets/campus-drop-logo.png')} accessibilityLabel="Campus Drop logo" resizeMode="contain" style={{width:size,height:size,borderRadius:Math.round(size*.16)}}/>; }
