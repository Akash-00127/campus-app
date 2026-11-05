
import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Easing, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Brand } from "../src/brand";
import { colors } from "../src/ui";

const profiles = {
  STUDENT: { name: "Student", detail: "Find your canteen favourites and order to your hostel.", tint: "#F1EAFB", art: require("../assets/onboarding-student.png") },
  VENDOR: { name: "Vendor", detail: "List your dishes and take orders from your campus.", tint: "#E3F3EB", art: require("../assets/onboarding-vendor.png") },
} as const;
type Role = keyof typeof profiles;

export default function Welcome() {
  const { role: value } = useLocalSearchParams<{ role?: string }>();
  const role = value === "STUDENT" || value === "VENDOR" ? value : undefined;
  const choices: Role[] = role ? [role] : ["STUDENT", "VENDOR"];
  const { height, width } = useWindowDimensions();
  const wave = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let mounted = true;
    let changed = false;
    function play(reduced: boolean) {
      wave.stopAnimation(); wave.setValue(0);
      if (!mounted || reduced) return;
      Animated.sequence([1,0,1,0].map(toValue => Animated.timing(wave, {
        toValue, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        isInteraction: false,
      }))).start();
    }
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", value => { changed = true; play(value); });
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted && !changed) play(value); }).catch(() => {});
    return () => { mounted = false; sub.remove(); wave.stopAnimation(); };
  }, [role, wave]);
  const short = height < 520;
  return <SafeAreaView style={s.safe}><View pointerEvents="none" style={StyleSheet.absoluteFill}><Animated.View style={[s.orb,{transform:[{translateX:wave.interpolate({inputRange:[0,1],outputRange:[0,26]})}]}]}/><View style={s.mint}/></View><View style={[s.page,short && {gap:5,paddingVertical:5}]}>
    <View style={s.header}>{role && <Pressable accessibilityRole="button" accessibilityLabel="Back to roles" onPress={() => router.canGoBack() ? router.back() : router.replace("/welcome")} style={[s.back,{position:"absolute",left:0,zIndex:1}]}><Text style={s.backText}>← Back</Text></Pressable>}<Brand size={short ? 64 : height < 680 ? 88 : 112}/></View>
    {!role && !short && <View style={[s.foodHero,{height:height < 680 ? 106 : 146}]}>
      <View style={s.heroCopy}><Text style={s.heroTitle}>Your campus,{"\n"}served fresh.</Text>{height >= 640 && <Text style={s.heroBody}>From canteen lunches to hostel snack breaks.</Text>}</View>
      <View style={s.foodArt}><Image accessibilityLabel="Vegetable momos" source={require("../assets/welcome-momos.jpg")} style={s.mainDish}/><Image accessibilityLabel="Grilled cheese sandwich" source={require("../assets/welcome-sandwich.jpg")} style={s.smallDish}/></View>
    </View>}
    <Text accessibilityRole="header" style={[s.title, {fontSize:short ? 24 : role ? 34 : 27}]}>{role ? profiles[role].name + " account" : "How will you use Campus Drop?"}</Text>
    <View style={[s.cards, role && short && {minHeight:100}, short && width > height && {flexDirection:"row"}]}>
      {role === "STUDENT" ? <View style={s.studentScene}>
        <Animated.Image accessibilityLabel="Illustrated college friends sharing pizza, momos and samosas" source={require("../assets/campus-friends.jpg")} resizeMode="cover" style={{width:"100%",height:"100%",transform:[{scale:wave.interpolate({inputRange:[0,1],outputRange:[1,1.035]})}]}}/>
      </View> : role === "VENDOR" ? <View style={s.vendorScene}>
        <Animated.Image accessibilityLabel="Campus vendor" source={require("../assets/campus-kiosk.jpg")} resizeMode="cover" style={{position:"absolute",width:"100%",height:"106%",transform:[{translateY:wave.interpolate({inputRange:[0,1],outputRange:[0,-4]})}]}}/>
        <Animated.View style={[s.ticket,{transform:[{translateY:wave.interpolate({inputRange:[0,1],outputRange:[4,-3]})}]}]}>
          <Text style={s.ticketLabel}>SAMPLE ORDER</Text><Text style={s.ticketTitle}>Incoming order</Text>
          <Text style={s.body}>2 × Samosa</Text><View style={s.rule}/><Text style={s.ticketLabel}>Order value</Text><Text style={s.amount}>₹60</Text>
        </Animated.View>
      </View> : choices.map(key => {
        const profile = profiles[key];
        const content = <><Animated.Image source={profile.art} accessibilityLabel={profile.name + " mascot"} resizeMode="contain" style={[s.image,{transform:[{translateY:wave.interpolate({inputRange:[0,1],outputRange:[0,key==="STUDENT"?-7:6]})}]}]}/><View style={s.copy}><Text style={s.name}>{profile.name}</Text><Text style={s.body}>{profile.detail}</Text></View>{!role && <Text style={s.arrow}>→</Text>}</>;
        const style = [s.card, {backgroundColor:profile.tint}];
        return <Pressable key={key} accessibilityRole="button" accessibilityLabel={"Continue as " + profile.name} onPress={() => router.push({pathname:"/welcome",params:{role:key}})} style={({pressed})=>[style,pressed && s.pressed]}>{content}</Pressable>;
      })}
    </View>
    {role && <View style={s.actions}>{(["/login","/register"] as const).map(path => <Pressable key={path} accessibilityRole="button" onPress={()=>router.push({pathname:path,params:{role}})} style={({pressed})=>[s.action,path==="/login" && s.primary,pressed && s.pressed]}><Text style={[s.actionText,path==="/login" && {color:"white"}]}>{path==="/login"?"Log in":"Create account"}</Text></Pressable>)}</View>}
  </View></SafeAreaView>;
}
const s=StyleSheet.create({
  foodHero:{flexDirection:"row",backgroundColor:"#35273D",borderRadius:24,overflow:"hidden",alignItems:"center"},
  heroCopy:{flex:1,paddingLeft:18,paddingRight:4,gap:6},heroTitle:{fontFamily:"PlusJakartaSans_800ExtraBold",fontSize:25,lineHeight:29,color:"#FFF8ED",letterSpacing:-1},heroBody:{fontFamily:"Inter_400Regular",fontSize:12,lineHeight:17,color:"#EEDFE4"},
  foodArt:{width:"43%",height:"100%",overflow:"hidden"},mainDish:{position:"absolute",width:"106%",height:"95%",top:-8,right:-10,borderRadius:70,borderWidth:3,borderColor:"#E1B886"},smallDish:{position:"absolute",width:"56%",height:"49%",bottom:-3,left:0,borderRadius:36,borderWidth:3,borderColor:"#FFF4DC"},
  studentScene:{flex:1,alignSelf:"center",aspectRatio:1,maxWidth:"100%",borderRadius:26,overflow:"hidden",backgroundColor:"#F0EAFE"},
  vendorScene:{flex:1,alignItems:"center",justifyContent:"center",backgroundColor:"#D9EFE4",borderRadius:26,overflow:"hidden"},
  ticket:{position:"absolute",bottom:10,right:10,backgroundColor:"#FFFEFA",padding:10,borderRadius:14,gap:2,boxShadow:"0px 6px 15px rgba(33,70,53,.12)"},
  ticketLabel:{fontFamily:"PlusJakartaSans_700Bold",fontSize:10,color:"#3F6657",letterSpacing:.5},ticketTitle:{fontFamily:"PlusJakartaSans_800ExtraBold",fontSize:18,color:"#233F34"},rule:{borderTopWidth:1,borderColor:"#CCDAD2",marginVertical:4},amount:{fontFamily:"PlusJakartaSans_800ExtraBold",fontSize:24,color:"#23553F"},
  orb:{position:"absolute",width:390,height:390,borderRadius:195,top:-155,right:-135,backgroundColor:"#F0DCF1"},mint:{position:"absolute",width:320,height:320,borderRadius:160,bottom:-135,left:-110,backgroundColor:"#FFE8CA"},
  safe:{flex:1,backgroundColor:colors.bg},page:{flex:1,width:"100%",maxWidth:620,alignSelf:"center",padding:20,justifyContent:"center",gap:16},
  header:{flexDirection:"row",justifyContent:"center",alignItems:"center",width:"100%"},wordmark:{fontFamily:"PlusJakartaSans_800ExtraBold",fontSize:19,color:colors.ink},
  title:{fontFamily:"PlusJakartaSans_800ExtraBold",fontSize:38,letterSpacing:-1.4,color:colors.ink},
  cards:{flexShrink:1,flexGrow:1,flexBasis:0,maxHeight:420,gap:12},card:{flex:1,flexDirection:"row",alignItems:"center",borderRadius:28,boxShadow:"0px 6px 18px rgba(55,39,94,0.09)",borderWidth:1,borderColor:"rgba(255,255,255,0.9)",overflow:"hidden",paddingHorizontal:12,gap:10},
  image:{width:"38%",height:"99%"},copy:{flex:1,gap:5},name:{fontFamily:"PlusJakartaSans_700Bold",fontSize:21,color:colors.ink},body:{fontFamily:"Inter_400Regular",fontSize:13,lineHeight:19,color:colors.muted},
  arrow:{fontSize:19,color:"#49335D",width:32,height:32,lineHeight:30,textAlign:"center",borderRadius:16,backgroundColor:"#FFFFFF"},back:{minWidth:76,height:44,alignItems:"center",justifyContent:"center",backgroundColor:"white",borderRadius:14},backText:{fontSize:14,color:colors.ink},
  actions:{gap:8},action:{minHeight:48,borderWidth:1,borderColor:colors.line,borderRadius:14,alignItems:"center",justifyContent:"center",backgroundColor:"white"},primary:{backgroundColor:colors.green,borderColor:colors.green},actionText:{fontFamily:"PlusJakartaSans_700Bold",color:colors.ink},pressed:{opacity:.82},
});
