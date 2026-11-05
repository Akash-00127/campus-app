import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Path, Rect, Circle, G } from "react-native-svg";

// Scalable storefront, packed meal and courier artwork for the role chooser.
export function DeliveryScene() {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let active = true, observed = false;
    const start = (reduce:boolean) => {
      progress.stopAnimation();
      if (reduce) { progress.setValue(0.65); return; }
      progress.setValue(0);
      Animated.timing(progress,{toValue:1,duration:7600,easing:Easing.inOut(Easing.cubic),useNativeDriver:true,isInteraction:false}).start();
    };
    const sub=AccessibilityInfo.addEventListener("reduceMotionChanged",v=>{observed=true;start(v)});
    AccessibilityInfo.isReduceMotionEnabled().then(v=>{if(active&&!observed)start(v)}).catch(()=>{});
    return ()=>{active=false;sub.remove();progress.stopAnimation()};
  },[progress]);
  return <View pointerEvents="none" accessible={false} style={styles.scene}>
    <Svg width="100%" height="100%" viewBox="0 0 300 66" preserveAspectRatio="xMinYMid meet">
      <Path d="M2 57H300" stroke="#C5BAE3" strokeWidth="2" strokeDasharray="5 5"/>
      <Rect x="10" y="21" width="50" height="35" rx="4" fill="#FFF3DA"/><Path d="M7 24L14 10H55L63 24Z" fill="#F4A33F"/><Path d="M17 23L22 11M33 23L34 11M49 23L46 11" stroke="white" strokeWidth="5"/>
      <Rect x="16" y="32" width="16" height="24" rx="2" fill="#755C90"/><Rect x="38" y="31" width="16" height="13" rx="2" fill="#FBC880"/>
      <G transform="translate(246 8)"><Rect x="3" y="20" width="34" height="28" rx="2" fill="#BCDCCF"/><Path d="M0 21L20 6L40 21Z" fill="#427661"/><Rect x="17" y="31" width="8" height="17" fill="#FAFAEF"/></G>
    </Svg>
    <Animated.View style={[styles.rider,{transform:[{translateX:progress.interpolate({inputRange:[0,.2,.86,1],outputRange:[0,0,147,147]})}]}]}>
      <Svg width="60" height="42" viewBox="0 0 60 42"><Circle cx="13" cy="34" r="6" fill="#343045"/><Circle cx="48" cy="34" r="6" fill="#343045"/><Path d="M8 29H29L38 17H43L49 31H13" fill="#E79634" stroke="#674C7C" strokeWidth="3"/><Rect x="3" y="12" width="18" height="14" rx="3" fill="#F5B84F"/><Path d="M6 19H18" stroke="#74441F" strokeWidth="2"/><Path d="M22 22L27 12L35 18H41" stroke="#6754A7" strokeWidth="6" fill="none"/><Circle cx="29" cy="7" r="5" fill="#DB9969"/><Path d="M23 7Q23 -2 32 2L35 7Z" fill="#383751"/></Svg>
    </Animated.View>
  </View>;
}
const styles=StyleSheet.create({scene:{height:66,width:"100%",maxWidth:300,alignSelf:"center"},rider:{position:"absolute",bottom:9,left:"18%"}});