
const roles = {
  STUDENT: { label: "Student", title: "Campus life,", accent: "made easy.", description: "Your favourite campus shops. Food and everyday essentials, all in one place.", image: require("../assets/onboarding-student.png"), color: "#18323D", tint: "#E9EDE7", caption: "A little less running. A lot more living." },
  VENDOR: { label: "Vendor", title: "Your shop,", accent: "more possibilities.", description: "Reach your campus community. Manage your products and orders in one place.", image: require("../assets/onboarding-vendor.png"), color: "#D94F32", tint: "#FCECE1", caption: "Local shops. A stronger campus community." },
};
type Role = keyof typeof roles;

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

const s = StyleSheet.({
  safe: { flex: 1, backgroundColor: "#F8F7F3" },
  page: { flex: 1, width: "100%", maxWidth: 1160, alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  identity: { flexDirection: "row", alignItems: "center", gap: 8 },
  wordmark: { color: "#182C35", fontSize: 19, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: -.7 },
  orange: { color: "#D94F32" },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EFEFE5", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 8 },
  dot: { height: 5, width: 5, borderRadius: 3, backgroundColor: "#427258" },
  badgeText: { color: "#53604E", fontSize: 10, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" },
  content: { flex: 1, minHeight: 0, paddingVertical: 16, width: "100%", maxWidth: 480, alignSelf: "center" },
  contentWide: { flexDirection: "row", alignItems: "center", gap: 70, maxWidth: 1100, paddingVertical: 28 },
  intro: { flexShrink: 0 },
  introWide: { flex: 1 },
  eyebrow: { color: "#92735E", fontSize: 9, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: 1.8, marginBottom: 10 },
  headline: { fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: "#182C35", letterSpacing: -1.8 },
  description: { color: "#78828A", fontSize: 13, lineHeight: 20, marginTop: 10, maxWidth: 360 },
  desktopNote: { color: "#92735E", fontSize: 12, lineHeight: 20, marginTop: 30 },
  experience: { flex: 1, minHeight: 0, paddingTop: 18 },
  experienceWide: { flex: 1, height: "100%", maxHeight: 600, paddingTop: 0 },
  selector: { flexDirection: "row", backgroundColor: "#ECEDE7", padding: 4, borderRadius: 16, gap: 4 },
  role: { flex: 1, minHeight: 44, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  selectedRole: { backgroundColor: "#FFFFFF", boxShadow: "0px 2px 6px rgba(25,39,62,0.07)" },
  roleText: { fontSize: 13, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", color: "#888078" },
  selectedRoleText: { color: "#182C35", fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  selectionDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#D94F32" },
  art: { flex: 1, minHeight: 0, borderRadius: 32, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", width: 260, height: 260, borderRadius: 130, borderWidth: 36, opacity: .65 },
  artLabel: { position: "absolute", top: 16, left: 18, flexDirection: "row", alignItems: "center", gap: 6, zIndex: 1 },
  artLabelText: { fontSize: 8, letterSpacing: 1.1, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold" },
  illustration: { width: "84%", height: "80%", maxHeight: 320 },
  caption: { position: "absolute", bottom: 16, color: "#59677D", fontSize: 10, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", textAlign: "center" },
  actions: { flexShrink: 0 },
  primary: { minHeight: 52, borderRadius: 18, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  primaryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  arrow: { color: "#FFFFFF", fontSize: 23 },
  signup: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  signupText: { color: "#85817D", fontSize: 12 },
  signupAccent: { color: "#182C35", fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
  pressed: { opacity: .78, transform: [{ scale: .985 }] },
  footer: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 4 },
  footerLine: { flex: 1, height: 1, backgroundColor: "#E7DED4" },
  footerText: { color: "#A1978C", fontSize: 8, letterSpacing: 1.1, textAlign: "center" },
});
